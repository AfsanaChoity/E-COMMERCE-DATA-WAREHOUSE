import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { warehouseStore } from './src/database/warehouseStore';
import { getETLStatus, runETLPipeline, runETLValidation } from './src/etl/pipeline';
import { resetWarehouse } from './src/etl/reset';
import {
  testMySQLConnection,
  getConnectionStatus,
  initializeMySQLSchema,
  getDBConfig
} from './src/database/connection';
import { FilterState, GeneratedReport } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// In-memory reports store
const reportsStore: GeneratedReport[] = [
  {
    id: 'rep_001',
    name: 'Executive Sales Performance Q1-Q3',
    type: 'Sales Report',
    generatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    parameters: { dateRange: 'all' },
    summaryMetrics: {
      'Total Net Revenue': 'R$ 1,482,900.50',
      'Total Delivered Orders': 12450,
      'Average Order Value': 'R$ 119.10',
      'Average Review Score': '4.3 / 5.0'
    },
    recordCount: 12450,
    breakdown: [
      { 'Period': '2018-01', 'Revenue (BRL)': 111500.20, 'Orders': 940, 'AOV (BRL)': 118.62 },
      { 'Period': '2018-02', 'Revenue (BRL)': 115200.40, 'Orders': 975, 'AOV (BRL)': 118.15 },
      { 'Period': '2018-03', 'Revenue (BRL)': 138400.90, 'Orders': 1140, 'AOV (BRL)': 121.40 },
      { 'Period': '2018-04', 'Revenue (BRL)': 142100.80, 'Orders': 1190, 'AOV (BRL)': 119.41 },
      { 'Period': '2018-05', 'Revenue (BRL)': 156300.50, 'Orders': 1280, 'AOV (BRL)': 122.11 },
      { 'Period': '2018-06', 'Revenue (BRL)': 148900.10, 'Orders': 1210, 'AOV (BRL)': 123.06 },
      { 'Period': '2018-07', 'Revenue (BRL)': 153200.70, 'Orders': 1255, 'AOV (BRL)': 122.07 },
      { 'Period': '2018-08', 'Revenue (BRL)': 149800.60, 'Orders': 1225, 'AOV (BRL)': 122.29 }
    ]
  },
  {
    id: 'rep_002',
    name: 'Product Catalog & Margin Analysis',
    type: 'Product Report',
    generatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    parameters: { dateRange: '2018', category: 'all' },
    summaryMetrics: {
      'Active SKUs': 450,
      'Top Category': 'Health & Beauty',
      'Avg Item Price': 'R$ 95.40'
    },
    recordCount: 450,
    breakdown: [
      { 'Category': 'health_beauty', 'Units Sold': 1850, 'Revenue (BRL)': 225400.50, 'Avg Price': 121.84, 'Rating': 4.35 },
      { 'Category': 'watches_gifts', 'Units Sold': 1420, 'Revenue (BRL)': 198200.00, 'Avg Price': 139.58, 'Rating': 4.28 },
      { 'Category': 'bed_bath_table', 'Units Sold': 2100, 'Revenue (BRL)': 184500.20, 'Avg Price': 87.86, 'Rating': 4.15 },
      { 'Category': 'sports_leisure', 'Units Sold': 1680, 'Revenue (BRL)': 162300.80, 'Avg Price': 96.61, 'Rating': 4.22 },
      { 'Category': 'computers_accessories', 'Units Sold': 1180, 'Revenue (BRL)': 148900.40, 'Avg Price': 126.19, 'Rating': 4.18 }
    ]
  },
  {
    id: 'rep_003',
    name: 'Customer RFM Segmentation & Retention',
    type: 'Customer Report',
    generatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    parameters: { dateRange: 'all' },
    summaryMetrics: {
      'Total Unique Buyers': 8920,
      'Champions Segment': '14.2%',
      'Repeat Buyer Ratio': '6.8%'
    },
    recordCount: 8920,
    breakdown: [
      { 'Segment': 'Champions', 'Customer Count': 1266, 'Share (%)': 14.2, 'Total Spend (BRL)': 524000.00, 'Avg LTV (BRL)': 413.90 },
      { 'Segment': 'Loyal', 'Customer Count': 2140, 'Share (%)': 24.0, 'Total Spend (BRL)': 458000.00, 'Avg LTV (BRL)': 214.02 },
      { 'Segment': 'Potential', 'Customer Count': 2854, 'Share (%)': 32.0, 'Total Spend (BRL)': 312000.00, 'Avg LTV (BRL)': 109.32 },
      { 'Segment': 'At Risk', 'Customer Count': 1605, 'Share (%)': 18.0, 'Total Spend (BRL)': 120400.00, 'Avg LTV (BRL)': 75.02 },
      { 'Segment': 'Hibernating', 'Customer Count': 1055, 'Share (%)': 11.8, 'Total Spend (BRL)': 48500.00, 'Avg LTV (BRL)': 45.97 }
    ]
  },
  {
    id: 'rep_004',
    name: 'Regional Logistics & Freight Penetration',
    type: 'Location Report',
    generatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    parameters: { dateRange: 'all', region: 'Southeast' },
    summaryMetrics: {
      'Top Region': 'Southeast (64.5%)',
      'Avg Freight Fee': 'R$ 18.20',
      'Fastest Delivery Hub': 'São Paulo'
    },
    recordCount: 15,
    breakdown: [
      { 'Region': 'Southeast', 'Gross Revenue (BRL)': 955990.80, 'Orders': 8030, 'Avg Freight (BRL)': 15.40, 'Transit Days': 8.4, 'Rating': 4.28 },
      { 'Region': 'South', 'Gross Revenue (BRL)': 237264.08, 'Orders': 1992, 'Avg Freight (BRL)': 19.80, 'Transit Days': 11.6, 'Rating': 4.21 },
      { 'Region': 'Central-West', 'Gross Revenue (BRL)': 103803.04, 'Orders': 871, 'Avg Freight (BRL)': 23.50, 'Transit Days': 13.5, 'Rating': 4.08 },
      { 'Region': 'Northeast', 'Gross Revenue (BRL)': 148290.05, 'Orders': 1245, 'Avg Freight (BRL)': 28.60, 'Transit Days': 17.2, 'Rating': 3.96 },
      { 'Region': 'North', 'Gross Revenue (BRL)': 37072.51, 'Orders': 312, 'Avg Freight (BRL)': 35.80, 'Transit Days': 22.8, 'Rating': 3.84 }
    ]
  }
];

function parseFilters(req: Request): Partial<FilterState> {
  return {
    dateRange: (req.query.dateRange as any) || 'all',
    category: (req.query.category as string) || 'all',
    region: (req.query.region as string) || 'all',
    orderStatus: (req.query.orderStatus as string) || 'all'
  };
}

// -------------------------------------------------------------
// 1. DASHBOARD API
// -------------------------------------------------------------
app.get('/api/dashboard', (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req);
    const dbStatus = getConnectionStatus();
    const data = warehouseStore.getDashboard(filters, dbStatus.connected);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// 2. SALES ANALYSIS API
// -------------------------------------------------------------
app.get('/api/sales', (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req);
    const data = warehouseStore.getSalesAnalysis(filters);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// 3. PRODUCT ANALYSIS API
// -------------------------------------------------------------
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req);
    const data = warehouseStore.getProductAnalysis(filters);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// 4. CUSTOMER ANALYSIS API
// -------------------------------------------------------------
app.get('/api/customers', (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req);
    const data = warehouseStore.getCustomerAnalysis(filters);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// 5. LOCATION ANALYSIS API
// -------------------------------------------------------------
app.get('/api/locations', (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req);
    const data = warehouseStore.getLocationAnalysis(filters);
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// 6. REPORTS API
// -------------------------------------------------------------
app.get('/api/reports', (_req: Request, res: Response) => {
  res.json({ reports: reportsStore });
});

app.post('/api/reports/generate', (req: Request, res: Response) => {
  try {
    const { name, type, dateRange, category, region } = req.body;
    const filters: Partial<FilterState> = { dateRange, category, region };

    let summaryMetrics: Record<string, string | number> = {};
    let recordCount = 0;
    let breakdown: Array<Record<string, string | number>> = [];

    if (type === 'Sales Report') {
      const sales = warehouseStore.getSalesAnalysis(filters);
      const totalRev = sales.summary.totalSales;
      const totalOrders = sales.summary.totalOrders;
      summaryMetrics = {
        'Total Revenue': `R$ ${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        'Total Orders': totalOrders,
        'Average Order Value': `R$ ${sales.summary.aov.toFixed(2)}`,
        'Reporting Periods': sales.monthlySales.length,
        'Top Category': sales.salesByCategory[0]?.category || 'health_beauty'
      };
      recordCount = totalOrders;
      breakdown = sales.monthlySales.slice(-8).map(m => ({
        'Period': m.period,
        'Revenue (BRL)': m.revenue,
        'Orders': m.orders,
        'AOV (BRL)': m.aov
      }));
    } else if (type === 'Product Report') {
      const prod = warehouseStore.getProductAnalysis(filters);
      summaryMetrics = {
        'Catalog SKUs': prod.kpis.totalProducts,
        'Categories Count': prod.kpis.totalCategories,
        'Top Seller Product': prod.kpis.bestSellingProduct,
        'Avg Unit Price': `R$ ${prod.kpis.averageProductPrice.toFixed(2)}`,
        'Top Category': prod.categoryDistribution[0]?.category || 'Health & Beauty'
      };
      recordCount = prod.products.length;
      breakdown = prod.products.slice(0, 15).map(p => ({
        'Product': p.productId.slice(0, 8),
        'Category': p.categoryEn,
        'Units Sold': p.unitsSold,
        'Revenue (BRL)': p.totalRevenue,
        'Rating': p.avgRating
      }));
    } else if (type === 'Customer Report') {
      const cust = warehouseStore.getCustomerAnalysis(filters);
      summaryMetrics = {
        'Total Customers': cust.kpis.totalCustomers,
        'New Customer Ratio': `${cust.kpis.newCustomers}`,
        'Repeat Purchase Rate': `${cust.kpis.repeatPurchaseRate}%`,
        'Average Customer LTV': `R$ ${cust.kpis.avgCustomerLtv.toFixed(2)}`,
        'Dominant Segment': cust.kpis.topSegment
      };
      recordCount = cust.kpis.totalCustomers;
      breakdown = cust.customerSegmentation.map(s => ({
        'Segment': s.segment,
        'Customer Count': s.count,
        'Share (%)': s.percentage,
        'Total Spend (BRL)': s.revenue,
        'Avg LTV (BRL)': s.avgLtv
      }));
    } else {
      const loc = warehouseStore.getLocationAnalysis(filters);
      summaryMetrics = {
        'Total Regions': loc.salesByRegion.length,
        'Top State Hub': loc.salesByState[0]?.state || 'SP',
        'Top Region': loc.kpis.topRegion,
        'Avg Shipping Fee': `R$ ${loc.kpis.avgFreight.toFixed(2)}`,
        'Average Delivery Days': `${loc.kpis.avgDeliveryDays} Days`,
        'Total Regional Revenue': `R$ ${loc.totalSales.toLocaleString()}`
      };
      recordCount = loc.topCities.length;
      breakdown = loc.salesByRegion.map(r => ({
        'Region': r.region,
        'Gross Revenue (BRL)': r.revenue,
        'Orders': r.orders,
        'Avg Freight (BRL)': r.avgFreight,
        'Transit Days': r.avgDeliveryDays,
        'Rating': r.avgRating
      }));
    }

    const newReport: GeneratedReport = {
      id: `rep_${Date.now()}`,
      name: name || `${type} - ${new Date().toLocaleDateString()}`,
      type: type || 'Sales Report',
      generatedAt: new Date().toISOString(),
      parameters: {
        dateRange: dateRange || 'all',
        category: category || 'all',
        region: region || 'all'
      },
      summaryMetrics,
      recordCount,
      breakdown
    };

    reportsStore.unshift(newReport);
    res.json({ success: true, report: newReport });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/reports/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = reportsStore.findIndex(r => r.id === id);
  if (index !== -1) {
    reportsStore.splice(index, 1);
    res.json({ success: true, message: `Report ${id} removed` });
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

// -------------------------------------------------------------
// 7. ETL & DATA WAREHOUSE API
// -------------------------------------------------------------
app.get('/api/etl/status', (_req: Request, res: Response) => {
  const status = getETLStatus();
  res.json(status);
});

app.post('/api/etl/run', async (req: Request, res: Response) => {
  try {
    const customDir = req.body?.dataDir as string | undefined;
    const result = await runETLPipeline(customDir);
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/etl/validate', async (req: Request, res: Response) => {
  try {
    const customDir = req.body?.dataDir as string | undefined;
    const result = await runETLValidation(customDir);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/etl/reset', async (_req: Request, res: Response) => {
  try {
    const result = await resetWarehouse();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/warehouse/schema', (_req: Request, res: Response) => {
  const schemaMeta = warehouseStore.getStarSchemaMetadata();
  res.json({ tables: schemaMeta });
});

app.get('/api/warehouse/table/:name', (req: Request, res: Response) => {
  try {
    const tableName = req.params.name;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const result = warehouseStore.getTableData(tableName, { page, limit, search });
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/warehouse/query', (req: Request, res: Response) => {
  try {
    const queryId = (req.body?.queryId as string) || 'top_categories';
    const result = warehouseStore.executeOlapQuery(queryId);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/warehouse/sql/:file', (req: Request, res: Response) => {
  try {
    const file = req.params.file;
    const allowed = [
      'database.sql',
      'schema.sql',
      'seed.sql',
      'analytical_queries.sql',
      'power_bi_views.sql',
      'power_bi_dax_measures.dax'
    ];
    if (!allowed.includes(file)) {
      return res.status(400).json({ error: 'Invalid SQL or script file requested' });
    }
    const sqlPath = path.resolve(process.cwd(), 'sql', file);
    if (!fs.existsSync(sqlPath)) {
      const fallbackPath = path.resolve(process.cwd(), 'src', 'database', file);
      if (fs.existsSync(fallbackPath)) {
        return res.type('text/plain').send(fs.readFileSync(fallbackPath, 'utf-8'));
      }
      return res.status(404).json({ error: 'File not found' });
    }
    res.type('text/plain').send(fs.readFileSync(sqlPath, 'utf-8'));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/powerbi/guide', (_req: Request, res: Response) => {
  try {
    const guidePath = path.resolve(process.cwd(), 'docs', 'POWER_BI_INTEGRATION_GUIDE.md');
    if (fs.existsSync(guidePath)) {
      return res.type('text/markdown').send(fs.readFileSync(guidePath, 'utf-8'));
    }
    return res.status(404).json({ error: 'Guide file not found' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/warehouse/mapping', (_req: Request, res: Response) => {
  const mappings = [
    {
      tableName: 'fact_sales',
      tableType: 'Fact Table (Transactional Line Item)',
      grain: 'One row per order item (order_id + order_item_id)',
      primaryKey: 'sales_id (BIGINT AUTO_INCREMENT)',
      columns: [
        { targetCol: 'sales_id', sourceFile: 'System Generated', sourceCol: 'AUTO_INCREMENT', dataType: 'BIGINT', rule: 'Surrogate Primary Key for fact grain' },
        { targetCol: 'order_id', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_id', dataType: 'VARCHAR(64)', rule: 'Degenerate dimension identifying order' },
        { targetCol: 'order_item_id', sourceFile: 'olist_order_items_dataset.csv', sourceCol: 'order_item_id', dataType: 'TINYINT UNSIGNED', rule: 'Sequential item index in order' },
        { targetCol: 'order_status', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_status', dataType: 'VARCHAR(20)', rule: 'Order status lifecycle stage' },
        { targetCol: 'customer_key', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_id', dataType: 'INT (FK)', rule: 'FK to dim_customer(customer_key)' },
        { targetCol: 'product_key', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_id', dataType: 'INT (FK)', rule: 'FK to dim_product(product_key)' },
        { targetCol: 'date_key', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_purchase_timestamp', dataType: 'INT (FK)', rule: 'FK to dim_date(date_key) [YYYYMMDD]' },
        { targetCol: 'location_key', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'geolocation_zip_code_prefix', dataType: 'INT (FK)', rule: 'FK to dim_location(location_key)' },
        { targetCol: 'seller_key', sourceFile: 'olist_sellers_dataset.csv', sourceCol: 'seller_id', dataType: 'INT (FK)', rule: 'FK to dim_seller(seller_key)' },
        { targetCol: 'price', sourceFile: 'olist_order_items_dataset.csv', sourceCol: 'price', dataType: 'DECIMAL(10,2)', rule: 'Item sale price' },
        { targetCol: 'freight_value', sourceFile: 'olist_order_items_dataset.csv', sourceCol: 'freight_value', dataType: 'DECIMAL(10,2)', rule: 'Freight logistics surcharge' },
        { targetCol: 'total_item_value', sourceFile: 'Derived Measure', sourceCol: 'price + freight_value', dataType: 'DECIMAL(10,2)', rule: 'Generated always as (price + freight_value)' },
        { targetCol: 'payment_value', sourceFile: 'olist_order_payments_dataset.csv', sourceCol: 'payment_value', dataType: 'DECIMAL(10,2)', rule: 'Allocated payment transacted' },
        { targetCol: 'payment_installments', sourceFile: 'olist_order_payments_dataset.csv', sourceCol: 'payment_installments', dataType: 'TINYINT UNSIGNED', rule: 'Chosen credit installments' },
        { targetCol: 'payment_type', sourceFile: 'olist_order_payments_dataset.csv', sourceCol: 'payment_type', dataType: 'VARCHAR(20)', rule: 'Method: credit_card, boleto, voucher, etc.' },
        { targetCol: 'review_score', sourceFile: 'olist_order_reviews_dataset.csv', sourceCol: 'review_score', dataType: 'TINYINT UNSIGNED', rule: 'Customer satisfaction rating: 1 to 5' },
        { targetCol: 'order_purchase_timestamp', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_purchase_timestamp', dataType: 'DATETIME', rule: 'Purchase placement timestamp' },
        { targetCol: 'order_delivered_customer_date', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_delivered_customer_date', dataType: 'DATETIME', rule: 'Actual delivery timestamp' },
        { targetCol: 'order_estimated_delivery_date', sourceFile: 'olist_orders_dataset.csv', sourceCol: 'order_estimated_delivery_date', dataType: 'DATETIME', rule: 'Carrier estimated delivery deadline' },
        { targetCol: 'shipping_limit_date', sourceFile: 'olist_order_items_dataset.csv', sourceCol: 'shipping_limit_date', dataType: 'DATETIME', rule: 'Merchant dispatch limit' }
      ]
    },
    {
      tableName: 'dim_customer',
      tableType: 'Dimension (Customer Profile)',
      grain: 'One row per customer order token',
      primaryKey: 'customer_key (INT AUTO_INCREMENT)',
      columns: [
        { targetCol: 'customer_key', sourceFile: 'System Generated', sourceCol: 'AUTO_INCREMENT', dataType: 'INT', rule: 'Surrogate Primary Key' },
        { targetCol: 'customer_id', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_id', dataType: 'VARCHAR(64)', rule: 'Natural key: transaction token' },
        { targetCol: 'customer_unique_id', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_unique_id', dataType: 'VARCHAR(64)', rule: 'Natural key: persistent human buyer identity' },
        { targetCol: 'customer_zip_code_prefix', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_zip_code_prefix', dataType: 'VARCHAR(10)', rule: '5-digit postal zip prefix' },
        { targetCol: 'customer_city', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_city', dataType: 'VARCHAR(100)', rule: 'Customer residential city' },
        { targetCol: 'customer_state', sourceFile: 'olist_customers_dataset.csv', sourceCol: 'customer_state', dataType: 'CHAR(2)', rule: '2-letter state abbreviation' }
      ]
    },
    {
      tableName: 'dim_product',
      tableType: 'Dimension (Product Catalog)',
      grain: 'One row per product SKU',
      primaryKey: 'product_key (INT AUTO_INCREMENT)',
      columns: [
        { targetCol: 'product_key', sourceFile: 'System Generated', sourceCol: 'AUTO_INCREMENT', dataType: 'INT', rule: 'Surrogate Primary Key' },
        { targetCol: 'product_id', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_id', dataType: 'VARCHAR(64)', rule: 'Natural key: 32-char SKU hash' },
        { targetCol: 'product_category_name', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_category_name', dataType: 'VARCHAR(100)', rule: 'Original Portuguese category' },
        { targetCol: 'product_category_name_english', sourceFile: 'product_category_name_translation.csv', sourceCol: 'product_category_name_english', dataType: 'VARCHAR(100)', rule: 'English translated category' },
        { targetCol: 'product_name_length', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_name_lenght', dataType: 'INT UNSIGNED', rule: 'Title character length' },
        { targetCol: 'product_description_length', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_description_lenght', dataType: 'INT UNSIGNED', rule: 'Description length' },
        { targetCol: 'product_photos_qty', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_photos_qty', dataType: 'TINYINT UNSIGNED', rule: 'Number of published images' },
        { targetCol: 'product_weight_g', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_weight_g', dataType: 'INT UNSIGNED', rule: 'Product package weight (grams)' },
        { targetCol: 'product_length_cm', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_length_cm', dataType: 'INT UNSIGNED', rule: 'Package length (cm)' },
        { targetCol: 'product_height_cm', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_height_cm', dataType: 'INT UNSIGNED', rule: 'Package height (cm)' },
        { targetCol: 'product_width_cm', sourceFile: 'olist_products_dataset.csv', sourceCol: 'product_width_cm', dataType: 'INT UNSIGNED', rule: 'Package width (cm)' }
      ]
    },
    {
      tableName: 'dim_date',
      tableType: 'Dimension (Conformed Calendar)',
      grain: 'One row per calendar day',
      primaryKey: 'date_key (INT YYYYMMDD)',
      columns: [
        { targetCol: 'date_key', sourceFile: 'Derived from order timestamp', sourceCol: 'YYYYMMDD', dataType: 'INT', rule: 'Surrogate Primary Key (e.g. 20171002)' },
        { targetCol: 'full_date', sourceFile: 'Derived from order timestamp', sourceCol: 'DATE(ts)', dataType: 'DATE', rule: 'Full calendar date' },
        { targetCol: 'year', sourceFile: 'Derived from order timestamp', sourceCol: 'YEAR(ts)', dataType: 'SMALLINT UNSIGNED', rule: 'Four-digit year (e.g. 2017)' },
        { targetCol: 'quarter', sourceFile: 'Derived from order timestamp', sourceCol: 'QUARTER(ts)', dataType: 'TINYINT UNSIGNED', rule: 'Calendar quarter: 1, 2, 3, 4' },
        { targetCol: 'month_num', sourceFile: 'Derived from order timestamp', sourceCol: 'MONTH(ts)', dataType: 'TINYINT UNSIGNED', rule: 'Month index: 1 - 12' },
        { targetCol: 'month_name', sourceFile: 'Derived from order timestamp', sourceCol: 'MONTHNAME(ts)', dataType: 'VARCHAR(15)', rule: 'Full month name: January - December' },
        { targetCol: 'day_of_month', sourceFile: 'Derived from order timestamp', sourceCol: 'DAY(ts)', dataType: 'TINYINT UNSIGNED', rule: 'Day of month: 1 - 31' },
        { targetCol: 'day_of_week', sourceFile: 'Derived from order timestamp', sourceCol: 'WEEKDAY(ts) + 1', dataType: 'TINYINT UNSIGNED', rule: 'Day index: 1 (Mon) - 7 (Sun)' },
        { targetCol: 'day_name', sourceFile: 'Derived from order timestamp', sourceCol: 'DAYNAME(ts)', dataType: 'VARCHAR(15)', rule: 'Day name: Monday - Sunday' },
        { targetCol: 'week_of_year', sourceFile: 'Derived from order timestamp', sourceCol: 'WEEKOFYEAR(ts)', dataType: 'TINYINT UNSIGNED', rule: 'ISO week number: 1 - 53' },
        { targetCol: 'is_weekend', sourceFile: 'Derived from order timestamp', sourceCol: 'DOW IN (6, 7)', dataType: 'BOOLEAN', rule: 'Flag for Saturday or Sunday' }
      ]
    },
    {
      tableName: 'dim_location',
      tableType: 'Dimension (Geographic Postal Hub)',
      grain: 'One row per postal code zip prefix',
      primaryKey: 'location_key (INT AUTO_INCREMENT)',
      columns: [
        { targetCol: 'location_key', sourceFile: 'System Generated', sourceCol: 'AUTO_INCREMENT', dataType: 'INT', rule: 'Surrogate Primary Key' },
        { targetCol: 'geolocation_zip_code_prefix', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'geolocation_zip_code_prefix', dataType: 'VARCHAR(10)', rule: '5-digit postal zip prefix' },
        { targetCol: 'geolocation_city', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'geolocation_city', dataType: 'VARCHAR(100)', rule: 'Postal municipality' },
        { targetCol: 'geolocation_state', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'geolocation_state', dataType: 'CHAR(2)', rule: '2-letter state abbreviation' },
        { targetCol: 'geolocation_lat', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'AVG(geolocation_lat)', dataType: 'DECIMAL(10,7)', rule: 'Mean latitude GPS coordinate' },
        { targetCol: 'geolocation_lng', sourceFile: 'olist_geolocation_dataset.csv', sourceCol: 'AVG(geolocation_lng)', dataType: 'DECIMAL(10,7)', rule: 'Mean longitude GPS coordinate' }
      ]
    },
    {
      tableName: 'dim_seller',
      tableType: 'Dimension (Marketplace Merchant)',
      grain: 'One row per registered seller',
      primaryKey: 'seller_key (INT AUTO_INCREMENT)',
      columns: [
        { targetCol: 'seller_key', sourceFile: 'System Generated', sourceCol: 'AUTO_INCREMENT', dataType: 'INT', rule: 'Surrogate Primary Key' },
        { targetCol: 'seller_id', sourceFile: 'olist_sellers_dataset.csv', sourceCol: 'seller_id', dataType: 'VARCHAR(64)', rule: 'Natural key: 32-char merchant hash' },
        { targetCol: 'seller_zip_code_prefix', sourceFile: 'olist_sellers_dataset.csv', sourceCol: 'seller_zip_code_prefix', dataType: 'VARCHAR(10)', rule: 'Merchant postal zip prefix' },
        { targetCol: 'seller_city', sourceFile: 'olist_sellers_dataset.csv', sourceCol: 'seller_city', dataType: 'VARCHAR(100)', rule: 'Merchant registered city' },
        { targetCol: 'seller_state', sourceFile: 'olist_sellers_dataset.csv', sourceCol: 'seller_state', dataType: 'CHAR(2)', rule: '2-letter state abbreviation' }
      ]
    }
  ];
  res.json({ mappings });
});

// -------------------------------------------------------------
// 8. DATABASE SETTINGS & TEST API
// -------------------------------------------------------------
app.get('/api/settings/db', (_req: Request, res: Response) => {
  const config = getDBConfig();
  const status = getConnectionStatus();
  res.json({
    config: {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database
    },
    status
  });
});

app.post('/api/settings/db/test', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    const result = await testMySQLConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database
    });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ connected: false, message: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/settings/db/init', async (_req: Request, res: Response) => {
  try {
    const result = await initializeMySQLSchema();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : String(err) });
  }
});

// -------------------------------------------------------------
// VITE SETUP (Development middleware & Production static serving)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ➜  Local:   http://localhost:${PORT}`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}\n`);
  });

  // Auto-run initial ETL on server startup to prime the warehouse
  // (moved here from pipeline.ts so that the CLI does not run the ETL twice)
  runETLPipeline().catch(err => {
    console.error('Initial ETL priming error:', err);
  });
}

startServer();
