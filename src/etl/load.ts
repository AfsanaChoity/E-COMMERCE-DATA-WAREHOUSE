import type { PoolConnection } from 'mysql2/promise';
import { TransformedStarSchema } from './transform';
import { warehouseStore } from '../database/warehouseStore';
import { getMySQLPool } from '../database/connection';

export interface LoadResult {
  recordsLoaded: number;
  tablesLoaded: Record<string, number>;
  mysqlLoaded: boolean;
  logs: string[];
  durationMs: number;
}

// Rows per INSERT statement. 1000 rows per statement
const BATCH_SIZE = 1000;

/** Inserts rows in chunks so that 100k+ row tables do not exceed packet limits. */
async function batchInsert(conn: PoolConnection, sql: string, rows: unknown[][]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await conn.query(sql, [rows.slice(i, i + BATCH_SIZE)]);
  }
}

/** ISO-8601 week number (1-53) for a 'YYYY-MM-DD' string -> dim_date.week_of_year */
function isoWeekOfYear(fullDate: string): number {
  const d = new Date(`${fullDate}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Parses the cleaned 'LxWxH' dimension string into [length, width, height] (null when unknown). */
function parseDimensions(dim: string): [number | null, number | null, number | null] {
  const parts = (dim || '').split('x').map(v => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  });
  return [parts[0] ?? null, parts[1] ?? null, parts[2] ?? null];
}

/**
 * Stage 5: LOAD
 * Loads dimensional star schema into the analytical warehouse storage engine.
 */
export async function loadIntoWarehouse(transformed: TransformedStarSchema): Promise<LoadResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  logs.push('ETL [Load]: Committing Star Schema data into Analytical Warehouse storage...');

  // 1. In-memory / OLAP Warehouse Store
  warehouseStore.loadData(transformed);

  const tablesLoaded: Record<string, number> = {
    dim_date: transformed.dimDate.length,
    dim_location: transformed.dimLocation.length,
    dim_seller: transformed.dimSeller.length,
    dim_customer: transformed.dimCustomer.length,
    dim_product: transformed.dimProduct.length,
    fact_sales: transformed.factSales.length
  };

  const totalLoaded = transformed.factSales.length +
    transformed.dimDate.length +
    transformed.dimLocation.length +
    transformed.dimSeller.length +
    transformed.dimCustomer.length +
    transformed.dimProduct.length;

  logs.push(`[Load] Warehouse Memory Store: ${transformed.factSales.length.toLocaleString()} facts and ${(totalLoaded - transformed.factSales.length).toLocaleString()} dimension records loaded.`);

  // 2. MySQL Persistence (if database is reachable)
  // Strategy: FULL REFRESH inside one transaction.
  //   - Truncate fact + dimensions, then reload everything.
  //   - Re-running the ETL is idempotent (no duplicates, no stale rows).
  //   - Plain INSERT (not INSERT IGNORE) so constraint violations raise errors instead of silently dropping rows.
  // Column lists below must match sql/schema.sql exactly (the data contract).
  let mysqlLoaded = false;
  let conn: PoolConnection | null = null;
  try {
    const pool = getMySQLPool();
    conn = await pool.getConnection();
    logs.push('[Load] MySQL endpoint active. Synchronizing Star Schema into relational tables...');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['fact_sales', 'dim_date', 'dim_location', 'dim_seller', 'dim_customer', 'dim_product']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    await conn.beginTransaction();

    // dim_date  (schema: day_of_week 1=Monday..7=Sunday; JS getUTCDay gives 0=Sunday)
    await batchInsert(conn,
      `INSERT INTO dim_date (date_key, full_date, year, quarter, month_num, month_name, day_of_month, day_of_week, day_name, week_of_year, is_weekend) VALUES ?`,
      transformed.dimDate.map(d => [
        d.date_key, d.full_date, d.year, d.quarter, d.month_num, d.month_name, d.day_of_month,
        d.day_of_week === 0 ? 7 : d.day_of_week, d.day_name, isoWeekOfYear(d.full_date), d.is_weekend
      ])
    );

    // dim_location
    await batchInsert(conn,
      `INSERT INTO dim_location (location_key, geolocation_zip_code_prefix, geolocation_city, geolocation_state, geolocation_lat, geolocation_lng) VALUES ?`,
      transformed.dimLocation.map(l => [l.location_key, l.zip_code_prefix, l.city, l.state, l.latitude, l.longitude])
    );

    // dim_seller
    await batchInsert(conn,
      `INSERT INTO dim_seller (seller_key, seller_id, seller_zip_code_prefix, seller_city, seller_state) VALUES ?`,
      transformed.dimSeller.map(s => [s.seller_key, s.seller_id, s.zip_code_prefix, s.city, s.state])
    );

    // dim_customer
    await batchInsert(conn,
      `INSERT INTO dim_customer (customer_key, customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state) VALUES ?`,
      transformed.dimCustomer.map(c => [c.customer_key, c.customer_id, c.customer_unique_id, c.zip_code_prefix, c.city, c.state])
    );

    // dim_product (name/description length are not carried by the clean stage -> NULL)
    await batchInsert(conn,
      `INSERT INTO dim_product (product_key, product_id, product_category_name, product_category_name_english, product_name_length, product_description_length, product_photos_qty, product_weight_g, product_length_cm, product_height_cm, product_width_cm) VALUES ?`,
      transformed.dimProduct.map(p => {
        const [len, wid, hei] = parseDimensions(p.dimensions_cm);
        return [
          p.product_key, p.product_id, p.category_name_pt || null, p.category_name_en || null,
          null, null, p.photos_qty, p.weight_g, len, hei, wid
        ];
      })
    );

    // fact_sales (total_item_value is a GENERATED column in MySQL, so it is not inserted)
    await batchInsert(conn,
      `INSERT INTO fact_sales (sales_id, order_id, order_item_id, order_status, customer_key, product_key, date_key, location_key, seller_key, price, freight_value, payment_value, payment_installments, payment_type, review_score, order_purchase_timestamp, order_delivered_customer_date, order_estimated_delivery_date, shipping_limit_date) VALUES ?`,
      transformed.factSales.map(f => [
        f.sales_id, f.order_id, f.order_item_id, f.order_status,
        f.customer_key, f.product_key, f.date_key, f.location_key, f.seller_key,
        f.unit_price, f.freight_value, f.payment_value, f.payment_installments ?? 1, f.payment_type ?? null,
        f.review_score ?? null,
        f.order_purchase_timestamp || `${String(f.date_key).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')} 00:00:00`,
        f.order_delivered_customer_date ?? null, f.order_estimated_delivery_date ?? null, f.shipping_limit_date ?? null
      ])
    );

    await conn.commit();
    mysqlLoaded = true;
    const okMsg = '[Load] MySQL database synchronization successfully completed.';
    logs.push(okMsg);
    console.log(`\n\x1b[32m${okMsg}\x1b[0m`);
    Object.entries(tablesLoaded).forEach(([t, n]) => console.log(`  - ${t.padEnd(14)} ${n.toLocaleString()} rows`));
    console.log('');
  } catch (mysqlErr: unknown) {
    if (conn) {
      try { await conn.rollback(); } catch { /* no active transaction */ }
    }
    const msg = `[Load Note] MySQL sync deferred (using high-performance warehouse store): ${(mysqlErr as any)?.code ?? ''} ${mysqlErr instanceof Error ? mysqlErr.message : String(mysqlErr)} ${((mysqlErr as any)?.errors ?? []).map((e: any) => `${e.code} ${e.address ?? ''}:${e.port ?? ''}`).join(', ')}`;
    logs.push(msg);
    console.warn(`\n\x1b[33m${msg}\x1b[0m\n`); // MySQL error terminal-e dekhano, jate silent fail na hoy
  } finally {
    conn?.release();
  }

  const durationMs = Date.now() - startTime;
  logs.push(`ETL [Load]: Finished loading ${totalLoaded.toLocaleString()} total Star Schema records in ${durationMs}ms.`);

  return {
    recordsLoaded: totalLoaded,
    tablesLoaded,
    mysqlLoaded,
    logs,
    durationMs
  };
}
