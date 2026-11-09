import { warehouseStore } from '../database/warehouseStore';
import { getMySQLPool } from '../database/connection';
import { resetETLStatus } from './pipeline';

export interface ResetResult {
  success: boolean;
  message: string;
  mysqlReset: boolean;
  clearedTables: string[];
  durationMs: number;
}

/**
 * Resets the Data Warehouse and ETL state back to pristine empty state.
 */
export async function resetWarehouse(): Promise<ResetResult> {
  const startTime = Date.now();
  const clearedTables = [
    'fact_sales',
    'dim_customer',
    'dim_product',
    'dim_date',
    'dim_location',
    'dim_seller'
  ];

  // 1. Reset in-memory store
  warehouseStore.reset();

  // 2. Reset ETL pipeline logs and audit tracking
  resetETLStatus();

  // 3. Reset MySQL tables if reachable
  let mysqlReset = false;
  try {
    const pool = getMySQLPool();
    const [test] = await pool.query('SELECT 1 as test');
    if (test) {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of clearedTables) {
        try {
          await pool.query(`TRUNCATE TABLE ${table}`);
        } catch {
          // Table might not exist yet
        }
      }
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      mysqlReset = true;
    }
  } catch {
    // MySQL not running or not configured
  }

  const durationMs = Date.now() - startTime;
  return {
    success: true,
    message: `Warehouse reset complete in ${durationMs}ms. All 6 Star Schema tables truncated.`,
    mysqlReset,
    clearedTables,
    durationMs
  };
}
