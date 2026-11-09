import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  Database,
  Table,
  FileCode,
  Download,
  Copy,
  Check,
  Search,
  ChevronRight,
  ExternalLink,
  BookOpen,
  PieChart,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  FolderDown,
  Info
} from 'lucide-react';
import { api } from '../services/api';

interface ViewMeta {
  name: string;
  title: string;
  grain: string;
  targetPages: string[];
  supportedMetrics: string[];
  description: string;
  ddl: string;
}

const POWER_BI_VIEWS: ViewMeta[] = [
  {
    name: 'vw_sales_summary',
    title: 'Executive Sales Summary View',
    grain: 'One row per calendar day',
    targetPages: ['Page 1: Executive Sales Overview', 'Page 2: Sales Analysis'],
    supportedMetrics: [
      'Total Sales',
      'Total Orders',
      'Total Customers',
      'Average Order Value',
      'Gross Merchandise Value (GMV)',
      'Total Freight'
    ],
    description:
      'Daily transactional rollup combining date dimension and sales facts. Used to drive high-level executive KPI cards and time-series line visuals.',
    ddl: `CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT
    d.date_key,
    d.full_date,
    d.year,
    d.quarter,
    d.month_num,
    d.month_name,
    d.day_name,
    d.is_weekend,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS total_items_sold,
    COUNT(DISTINCT f.customer_key) AS unique_customers,
    ROUND(SUM(f.price), 2) AS total_sales_amount,
    ROUND(SUM(f.freight_value), 2) AS total_freight_value,
    ROUND(SUM(f.total_item_value), 2) AS gross_merchandise_value,
    ROUND(SUM(f.payment_value), 2) AS total_payment_value,
    ROUND(AVG(f.price), 2) AS avg_item_price,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS average_order_value,
    ROUND(AVG(f.review_score), 2) AS avg_review_score
FROM dim_date d
LEFT JOIN fact_sales f ON d.date_key = f.date_key
GROUP BY 
    d.date_key, d.full_date, d.year, d.quarter, d.month_num, d.month_name, d.day_name, d.is_weekend;`
  },
  {
    name: 'vw_monthly_sales',
    title: 'Monthly & Yearly Longitudinal Sales View',
    grain: 'One row per calendar Year-Month (YYYY-MM)',
    targetPages: ['Page 1: Executive Sales Overview', 'Page 2: Sales Analysis'],
    supportedMetrics: [
      'Monthly Revenue',
      'Yearly Revenue',
      'MoM Growth %',
      'Seasonal Velocity',
      'Monthly AOV'
    ],
    description:
      'Optimized time-series view designed specifically for Power BI area, line, and clustered column charts tracking monthly cadence.',
    ddl: `CREATE OR REPLACE VIEW vw_monthly_sales AS
SELECT
    d.year,
    d.quarter,
    d.month_num,
    d.month_name,
    DATE_FORMAT(d.full_date, '%Y-%m') AS year_month,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS total_items_sold,
    COUNT(DISTINCT f.customer_key) AS unique_customers,
    ROUND(SUM(f.price), 2) AS monthly_revenue,
    ROUND(SUM(f.freight_value), 2) AS monthly_freight,
    ROUND(SUM(f.total_item_value), 2) AS monthly_gmv,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS average_order_value,
    ROUND(AVG(f.review_score), 2) AS avg_customer_rating
FROM dim_date d
JOIN fact_sales f ON d.date_key = f.date_key
GROUP BY d.year, d.quarter, d.month_num, d.month_name, DATE_FORMAT(d.full_date, '%Y-%m')
ORDER BY d.year, d.month_num;`
  },
  {
    name: 'vw_product_performance',
    title: 'Product Catalog Performance View',
    grain: 'One row per product SKU hash',
    targetPages: ['Page 1: Top 10 Products', 'Page 3: Product Analysis'],
    supportedMetrics: [
      'Top Products',
      'Product Revenue',
      'Quantity Sold',
      'SKU Dense Ranking',
      'Average Unit Price'
    ],
    description:
      'Product SKU performance matrix ranking items by revenue and quantity sold with category attribution and satisfaction ratings.',
    ddl: `CREATE OR REPLACE VIEW vw_product_performance AS
SELECT
    p.product_key,
    p.product_id,
    COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized') AS category_name,
    p.product_photos_qty,
    p.product_weight_g,
    COUNT(f.sales_id) AS total_quantity_sold,
    COUNT(DISTINCT f.order_id) AS total_orders,
    ROUND(SUM(f.price), 2) AS total_product_revenue,
    ROUND(SUM(f.freight_value), 2) AS total_freight_generated,
    ROUND(AVG(f.price), 2) AS avg_selling_price,
    ROUND(AVG(f.review_score), 2) AS avg_review_score,
    DENSE_RANK() OVER (ORDER BY SUM(f.price) DESC) AS revenue_rank
FROM dim_product p
JOIN fact_sales f ON p.product_key = f.product_key
GROUP BY p.product_key, p.product_id, p.product_category_name_english, p.product_category_name, p.product_photos_qty, p.product_weight_g;`
  },
  {
    name: 'vw_category_sales',
    title: 'Category Market Share & Revenue View',
    grain: 'One row per product category',
    targetPages: [
      'Page 1: Sales by Category',
      'Page 2: Sales Analysis',
      'Page 3: Product Analysis'
    ],
    supportedMetrics: [
      'Sales by Category',
      'Units Sold',
      'Category AOV',
      'Unique SKUs Count',
      'Satisfaction Index'
    ],
    description:
      'Aggregated category performance powering treemaps, donut charts, and Pareto analysis in Power BI.',
    ddl: `CREATE OR REPLACE VIEW vw_category_sales AS
SELECT
    COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized') AS category_name,
    COUNT(DISTINCT p.product_key) AS unique_products_count,
    COUNT(f.sales_id) AS units_sold,
    COUNT(DISTINCT f.order_id) AS order_count,
    ROUND(SUM(f.price), 2) AS total_sales,
    ROUND(SUM(f.freight_value), 2) AS total_freight,
    ROUND(SUM(f.total_item_value), 2) AS total_gross_value,
    ROUND(AVG(f.price), 2) AS avg_unit_price,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS avg_order_value,
    ROUND(AVG(f.review_score), 2) AS avg_satisfaction_score
FROM dim_product p
JOIN fact_sales f ON p.product_key = f.product_key
GROUP BY COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized');`
  },
  {
    name: 'vw_customer_behavior',
    title: 'Customer Segmentation & Behavior View',
    grain: 'One row per unique human buyer (customer_unique_id)',
    targetPages: ['Page 4: Customer Analysis'],
    supportedMetrics: [
      'Customer Purchase Frequency',
      'Returning Customers',
      'New vs Returning',
      'Customer Spend Tiers',
      'Customer Lifetime Value'
    ],
    description:
      'Consolidates order history per individual customer to distinguish repeat buyers from single-order buyers and calculate customer lifetime value.',
    ddl: `CREATE OR REPLACE VIEW vw_customer_behavior AS
SELECT
    c.customer_unique_id,
    c.customer_city,
    c.customer_state,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS total_items_purchased,
    ROUND(SUM(f.price), 2) AS total_customer_spend,
    ROUND(AVG(f.price), 2) AS avg_item_spend,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS customer_aov,
    MIN(f.order_purchase_timestamp) AS first_purchase_date,
    MAX(f.order_purchase_timestamp) AS latest_purchase_date,
    DATEDIFF(MAX(f.order_purchase_timestamp), MIN(f.order_purchase_timestamp)) AS customer_lifespan_days,
    CASE 
        WHEN COUNT(DISTINCT f.order_id) > 1 THEN 'Returning Customer'
        ELSE 'One-Time Customer'
    END AS customer_retention_type,
    CASE
        WHEN SUM(f.price) >= 1000 THEN 'VIP Tier (R$ 1,000+)'
        WHEN SUM(f.price) >= 300 THEN 'Mid-Tier (R$ 300 - 999)'
        ELSE 'Standard Tier (< R$ 300)'
    END AS customer_spend_tier,
    ROUND(AVG(f.review_score), 2) AS avg_customer_review
FROM dim_customer c
JOIN fact_sales f ON c.customer_key = f.customer_key
GROUP BY c.customer_unique_id, c.customer_city, c.customer_state;`
  },
  {
    name: 'vw_regional_sales',
    title: 'Regional & Geographic Logistics View',
    grain: 'One row per State (UF) and City postal hub',
    targetPages: [
      'Page 1: Sales by State',
      'Page 2: Sales Analysis',
      'Page 5: Regional Analysis'
    ],
    supportedMetrics: [
      'Sales by State',
      'Sales by City',
      'Macro-Region GMV',
      'Freight Tariff %',
      'Customer Distribution'
    ],
    description:
      'Geographical distribution view mapping sales, order density, and shipping freight across Brazilian states and macro-regions for Power BI maps.',
    ddl: `CREATE OR REPLACE VIEW vw_regional_sales AS
SELECT
    COALESCE(l.geolocation_state, c.customer_state) AS state,
    COALESCE(l.geolocation_city, c.customer_city) AS city,
    CASE 
        WHEN COALESCE(l.geolocation_state, c.customer_state) IN ('SP', 'RJ', 'MG', 'ES') THEN 'Southeast'
        WHEN COALESCE(l.geolocation_state, c.customer_state) IN ('PR', 'SC', 'RS') THEN 'South'
        WHEN COALESCE(l.geolocation_state, c.customer_state) IN ('BA', 'PE', 'CE', 'MA', 'PB', 'RN', 'AL', 'SE', 'PI') THEN 'Northeast'
        WHEN COALESCE(l.geolocation_state, c.customer_state) IN ('DF', 'GO', 'MT', 'MS') THEN 'Central-West'
        WHEN COALESCE(l.geolocation_state, c.customer_state) IN ('AM', 'PA', 'RO', 'TO', 'AC', 'AP', 'RR') THEN 'North'
        ELSE 'Other'
    END AS macro_region,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(DISTINCT c.customer_unique_id) AS unique_customers,
    COUNT(f.sales_id) AS total_items_sold,
    ROUND(SUM(f.price), 2) AS total_sales,
    ROUND(SUM(f.freight_value), 2) AS total_freight,
    ROUND(SUM(f.freight_value) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS avg_freight_per_order,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS avg_order_value,
    ROUND(AVG(f.review_score), 2) AS avg_review_score
FROM fact_sales f
JOIN dim_customer c ON f.customer_key = c.customer_key
LEFT JOIN dim_location l ON f.location_key = l.location_key
GROUP BY COALESCE(l.geolocation_state, c.customer_state), COALESCE(l.geolocation_city, c.customer_city);`
  },
  {
    name: 'vw_order_performance',
    title: 'Order Fulfillment & Delivery SLA View',
    grain: 'One row per order header',
    targetPages: [
      'Page 1: Order Status',
      'Page 6: Delivery & Order Analysis'
    ],
    supportedMetrics: [
      'Order Status',
      'Delivery Performance',
      'Average Delivery Time',
      'Estimated vs Actual Delivery',
      'Delayed Orders'
    ],
    description:
      'Monitors carrier SLA, actual transit times, estimated delivery dates, and delayed order categorizations for logistics gauges and breakdown charts.',
    ddl: `CREATE OR REPLACE VIEW vw_order_performance AS
SELECT
    f.order_id,
    f.order_status,
    d.full_date AS purchase_date,
    d.year AS purchase_year,
    d.quarter AS purchase_quarter,
    d.month_num AS purchase_month_num,
    d.month_name AS purchase_month,
    f.order_purchase_timestamp,
    f.order_delivered_customer_date,
    f.order_estimated_delivery_date,
    COUNT(f.sales_id) AS total_order_items,
    ROUND(SUM(f.price), 2) AS order_merchandise_amount,
    ROUND(SUM(f.freight_value), 2) AS order_freight_amount,
    ROUND(SUM(f.total_item_value), 2) AS total_order_value,
    MAX(f.payment_type) AS primary_payment_type,
    MAX(f.payment_installments) AS payment_installments,
    AVG(f.review_score) AS order_review_score,
    TIMESTAMPDIFF(DAY, f.order_purchase_timestamp, f.order_delivered_customer_date) AS actual_delivery_days,
    TIMESTAMPDIFF(DAY, f.order_purchase_timestamp, f.order_estimated_delivery_date) AS estimated_delivery_days,
    DATEDIFF(f.order_delivered_customer_date, f.order_estimated_delivery_date) AS delivery_delay_days,
    CASE 
        WHEN f.order_status != 'delivered' THEN 'In Transit / Processing'
        WHEN f.order_delivered_customer_date IS NULL THEN 'Delivery Date Missing'
        WHEN f.order_delivered_customer_date <= f.order_estimated_delivery_date THEN 'On-Time Delivery'
        ELSE 'Delayed Delivery'
    END AS delivery_sla_status
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY
    f.order_id, f.order_status, d.full_date, d.year, d.quarter, d.month_num, d.month_name,
    f.order_purchase_timestamp, f.order_delivered_customer_date, f.order_estimated_delivery_date;`
  }
];

interface DaxMeasure {
  name: string;
  category: 'Sales' | 'Time' | 'Customers' | 'Products' | 'Logistics';
  formula: string;
  description: string;
  targetVisual: string;
}

const DAX_MEASURES: DaxMeasure[] = [
  {
    name: 'Total Sales',
    category: 'Sales',
    formula: `Total Sales = \nSUM(fact_sales[price])`,
    description: 'Total item sales amount excluding shipping tariff.',
    targetVisual: 'Card Visual on Page 1, Y-Axis in Page 2'
  },
  {
    name: 'Total Orders',
    category: 'Sales',
    formula: `Total Orders = \nDISTINCTCOUNT(fact_sales[order_id])`,
    description: 'Unique count of completed customer purchase orders.',
    targetVisual: 'KPI Card on Page 1, Slices in Page 6'
  },
  {
    name: 'Total Customers',
    category: 'Customers',
    formula: `Total Customers = \nDISTINCTCOUNT(dim_customer[customer_unique_id])`,
    description: 'Total registered unique individual human buyers.',
    targetVisual: 'KPI Card on Page 1, Page 4 Visuals'
  },
  {
    name: 'Average Order Value (AOV)',
    category: 'Sales',
    formula: `Average Order Value = \nDIVIDE([Total Sales], [Total Orders], 0)`,
    description: 'Mean revenue collected per order transacted.',
    targetVisual: 'KPI Card on Page 1, Line Chart on Page 2'
  },
  {
    name: 'MoM Sales Growth %',
    category: 'Time',
    formula: `MoM Sales Growth % = \nVAR CurrentSales = [Total Sales]\nVAR PrevSales = CALCULATE([Total Sales], DATEADD(dim_date[full_date], -1, MONTH))\nRETURN DIVIDE(CurrentSales - PrevSales, PrevSales, 0)`,
    description: 'Month-over-month revenue percentage change.',
    targetVisual: 'Monthly Sales Velocity on Page 2'
  },
  {
    name: 'Returning Customers',
    category: 'Customers',
    formula: `Returning Customers = \nCALCULATE(\n    [Total Customers],\n    FILTER(vw_customer_behavior, vw_customer_behavior[customer_retention_type] = "Returning Customer")\n)`,
    description: 'Count of buyers with 2 or more distinct historical orders.',
    targetVisual: 'Donut Chart on Page 4'
  },
  {
    name: 'Returning Customer Rate',
    category: 'Customers',
    formula: `Returning Customer Rate = \nDIVIDE([Returning Customers], [Total Customers], 0)`,
    description: 'Percentage of buyer base demonstrating repeat loyalty.',
    targetVisual: 'Retention Gauge on Page 4'
  },
  {
    name: 'Average Delivery Time (Days)',
    category: 'Logistics',
    formula: `Average Delivery Time (Days) = \nAVERAGE(vw_order_performance[actual_delivery_days])`,
    description: 'Mean actual transit duration from order placement to doorstep.',
    targetVisual: 'Clustered Column on Page 6'
  },
  {
    name: 'Delayed Orders Count',
    category: 'Logistics',
    formula: `Delayed Orders Count = \nCALCULATE([Total Orders], vw_order_performance[delivery_sla_status] = "Delayed Delivery")`,
    description: 'Orders delivered past the carrier estimated deadline.',
    targetVisual: 'Warning KPI Card on Page 6'
  },
  {
    name: 'On-Time Delivery Rate %',
    category: 'Logistics',
    formula: `On-Time Delivery Rate % = \nVAR Valid = CALCULATE([Total Orders], NOT(ISBLANK(vw_order_performance[actual_delivery_days])))\nRETURN DIVIDE(CALCULATE([Total Orders], vw_order_performance[delivery_sla_status] = "On-Time Delivery"), Valid, 0)`,
    description: 'Fulfillment SLA compliance percentage.',
    targetVisual: 'SLA Adherence Gauge on Page 6'
  }
];

interface ReportPageSpec {
  pageNumber: number;
  title: string;
  theme: string;
  purpose: string;
  kpis?: string[];
  visuals: Array<{
    title: string;
    chartType: string;
    fields: string;
    source: string;
  }>;
  slicers: string[];
}

const REPORT_PAGES: ReportPageSpec[] = [
  {
    pageNumber: 1,
    title: 'Executive Sales Overview',
    theme: 'C-Suite Command Center',
    purpose: 'High-level executive dashboard tracking core revenue health, order throughput, buyer adoption, and state-level geographic revenue.',
    kpis: [
      'Total Sales: R$ 16.0M',
      'Total Orders: 99.4K',
      'Total Customers: 96.1K',
      'Average Order Value: R$ 160.85'
    ],
    visuals: [
      {
        title: 'Monthly Sales Trend',
        chartType: 'Area & Line Dual-Axis Chart',
        fields: 'X: year_month | Y1: [Total Sales] | Y2: [Total Orders]',
        source: 'vw_monthly_sales'
      },
      {
        title: 'Sales by Category',
        chartType: 'Donut Chart / Treemap',
        fields: 'Category: category_name | Values: [Total Sales]',
        source: 'vw_category_sales'
      },
      {
        title: 'Top 10 Products',
        chartType: 'Horizontal Clustered Bar Chart',
        fields: 'Y: product_id | X: [Total Sales] (Top 10 filter)',
        source: 'vw_product_performance'
      },
      {
        title: 'Sales by State',
        chartType: 'Filled Map (Choropleth Brazil)',
        fields: 'Location: customer_state | Color Saturation: [Total Sales]',
        source: 'dim_customer & fact_sales'
      },
      {
        title: 'Order Status',
        chartType: 'Pie Chart',
        fields: 'Legend: order_status | Values: [Total Orders]',
        source: 'fact_sales'
      }
    ],
    slicers: ['Year / Quarter Slicer', 'Product Category Slicer', 'Macro-Region Slicer']
  },
  {
    pageNumber: 2,
    title: 'Sales Analysis',
    theme: 'Commercial & Temporal Drilldown',
    purpose: 'Examines longitudinal revenue trajectory across monthly, quarterly, and annual granularities alongside category and regional benchmarks.',
    visuals: [
      {
        title: 'Monthly Sales',
        chartType: 'Clustered Column Chart',
        fields: 'X: month_name | Legend: year | Y: [Total Sales]',
        source: 'vw_monthly_sales & dim_date'
      },
      {
        title: 'Quarterly Sales',
        chartType: 'Grouped Column / Waterfall Chart',
        fields: 'X: quarter (Q1-Q4) | Y: [Total Sales]',
        source: 'vw_sales_summary'
      },
      {
        title: 'Yearly Sales',
        chartType: 'Column Chart with Data Labels',
        fields: 'X: year | Y: [Total Sales]',
        source: 'dim_date & fact_sales'
      },
      {
        title: 'Category Sales',
        chartType: 'Matrix Table with Heatmap Bars',
        fields: 'Rows: category_name | Values: [Total Sales], Units, [Category Sales Share %]',
        source: 'vw_category_sales'
      },
      {
        title: 'Regional Sales',
        chartType: 'Clustered Bar Chart',
        fields: 'Y: macro_region | X: [Total Sales]',
        source: 'vw_regional_sales'
      },
      {
        title: 'Average Order Value',
        chartType: 'Line Chart with Trendline',
        fields: 'X: year_month | Y: [Average Order Value]',
        source: 'vw_monthly_sales'
      }
    ],
    slicers: ['Date Hierarchy (Year > Quarter > Month)', 'Order Status Slicer', 'State Slicer']
  },
  {
    pageNumber: 3,
    title: 'Product Analysis',
    theme: 'Merchandise & Catalog Performance',
    purpose: 'Evaluates SKU sales velocity, product revenue concentration, unit volume, and category quadrant distribution.',
    visuals: [
      {
        title: 'Top Products',
        chartType: 'Ranked Table Visual',
        fields: 'product_id, category_name, total_quantity_sold, total_product_revenue, avg_selling_price',
        source: 'vw_product_performance'
      },
      {
        title: 'Product Revenue',
        chartType: 'Line & Clustered Column Chart (Pareto)',
        fields: 'X: category_name | Column: [Total Sales] | Line: Cumulative Share %',
        source: 'vw_category_sales'
      },
      {
        title: 'Quantity Sold',
        chartType: 'Treemap Visual',
        fields: 'Group: category_name | Values: [Total Items Sold]',
        source: 'vw_category_sales'
      },
      {
        title: 'Category Performance',
        chartType: 'Quadrant Scatter Chart',
        fields: 'X: Units Sold | Y: AOV | Size: Revenue | Color: Rating',
        source: 'vw_category_sales'
      }
    ],
    slicers: ['Category Dropdown', 'Price Bracket Slicer', 'Minimum Review Score']
  },
  {
    pageNumber: 4,
    title: 'Customer Analysis',
    theme: 'Buyer Loyalty & RFM Cohorts',
    purpose: 'Quantifies new vs repeat customer acquisition, purchase frequency histograms, top spending buyers, and cohort monetization.',
    visuals: [
      {
        title: 'New Customers',
        chartType: 'Donut Chart (Acquisition Mix)',
        fields: 'Legend: customer_retention_type ("One-Time" vs "Returning") | Values: [Total Customers]',
        source: 'vw_customer_behavior'
      },
      {
        title: 'Returning Customers',
        chartType: '100% Stacked Bar Chart by Year',
        fields: 'X: year | Series: customer_retention_type | Y: [Total Orders]',
        source: 'vw_customer_behavior & dim_date'
      },
      {
        title: 'Purchase Frequency',
        chartType: 'Histogram / Column Chart',
        fields: 'X: total_orders bucket (1, 2, 3+) | Y: [Total Customers]',
        source: 'vw_customer_behavior'
      },
      {
        title: 'Top Customers',
        chartType: 'Table with Data Bars',
        fields: 'customer_unique_id, city, state, total_orders, total_customer_spend, customer_aov',
        source: 'vw_customer_behavior'
      },
      {
        title: 'Customer Revenue',
        chartType: 'Funnel / Bar by Spend Tier',
        fields: 'Category: customer_spend_tier (VIP, Mid, Standard) | Values: [Total Sales]',
        source: 'vw_customer_behavior'
      }
    ],
    slicers: ['Customer State Slicer', 'Spend Tier Slicer', 'Purchase Date Range']
  },
  {
    pageNumber: 5,
    title: 'Regional Analysis',
    theme: 'Territorial Market Penetration',
    purpose: 'Visualizes geographic sales distribution, freight cost burdens, macro-region trends, and postal customer densities.',
    visuals: [
      {
        title: 'Sales by State',
        chartType: 'Filled Map Visual (Brazil Shape)',
        fields: 'Location: state | Color: [Total Sales] | Tooltips: Orders, Freight',
        source: 'vw_regional_sales'
      },
      {
        title: 'Sales by City',
        chartType: 'Top 15 Horizontal Bar Chart',
        fields: 'Y: city | X: [Total Sales]',
        source: 'vw_regional_sales'
      },
      {
        title: 'Regional Sales Trend',
        chartType: 'Stacked Area Chart',
        fields: 'X: year_month | Legend: macro_region | Values: [Total Sales]',
        source: 'vw_regional_sales & vw_monthly_sales'
      },
      {
        title: 'Customer Distribution',
        chartType: 'GPS Bubble Scatter Map',
        fields: 'Latitude: geolocation_lat | Longitude: geolocation_lng | Size: [Total Customers]',
        source: 'dim_location'
      }
    ],
    slicers: ['Macro-Region Slicer (Southeast, South, Northeast...)', 'State Dropdown', 'Year Slicer']
  },
  {
    pageNumber: 6,
    title: 'Delivery & Order Analysis',
    theme: 'Logistics SLA & Operational Health',
    purpose: 'Monitors order fulfillment statuses, carrier delivery transit durations, estimated vs actual delivery benchmarks, and delay rates.',
    visuals: [
      {
        title: 'Order Status',
        chartType: 'Donut Chart',
        fields: 'Legend: order_status (delivered, shipped, canceled...) | Values: [Total Orders]',
        source: 'vw_order_performance'
      },
      {
        title: 'Average Delivery Time',
        chartType: 'Clustered Column Chart by Region',
        fields: 'X: macro_region | Y: [Average Delivery Time (Days)]',
        source: 'vw_order_performance & vw_regional_sales'
      },
      {
        title: 'Estimated vs Actual Delivery',
        chartType: 'Line & Clustered Column Chart',
        fields: 'X: purchase_month | Column: Actual Days | Line: Estimated Days',
        source: 'vw_order_performance'
      },
      {
        title: 'Delayed Orders',
        chartType: 'SLA Gauge & Delay Severity Bar',
        fields: 'Gauge: [On-Time Delivery Rate %] (Target: 95%) | Bar: [Delayed Orders Count]',
        source: 'vw_order_performance'
      }
    ],
    slicers: ['Order Status Filter', 'Carrier SLA Status Slicer', 'Purchase Year / Quarter']
  }
];

export const PowerBiIntegration: React.FC = () => {
  const [subTab, setSubTab] = useState<'views' | 'dax' | 'report' | 'connect'>('views');
  const [selectedView, setSelectedView] = useState<ViewMeta>(POWER_BI_VIEWS[0]);
  const [selectedPage, setSelectedPage] = useState<ReportPageSpec>(REPORT_PAGES[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Live View Data Preview state
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewTotal, setPreviewTotal] = useState<number>(0);

  // Load preview data when selectedView changes
  useEffect(() => {
    let isMounted = true;
    setPreviewLoading(true);
    api.getWarehouseTableData(selectedView.name, 1, 10, '')
      .then(res => {
        if (!isMounted) return;
        setPreviewData(res.rows || []);
        setPreviewColumns(res.columns || []);
        setPreviewTotal(res.totalRows || 0);
      })
      .catch(() => {
        if (!isMounted) return;
        setPreviewData([]);
        setPreviewColumns([]);
        setPreviewTotal(0);
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedView.name]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/warehouse/sql/${filename}`, '_blank');
  };

  const handleDownloadGuide = () => {
    window.open('/api/powerbi/guide', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Architecture Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/30 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/30">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Microsoft Power BI Integration Suite
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    MySQL Connected
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Power BI connects to MySQL as the primary E-Commerce Data Warehouse to power executive analytics.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Host: <strong className="text-white">localhost:3306</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Database: <strong className="text-white">olist_datawarehouse</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Mode: <strong className="text-emerald-300">DirectQuery / Import</strong>
              </span>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleDownload('power_bi_views.sql')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
              title="Download MySQL views file"
            >
              <Download className="w-4 h-4" />
              Download Views (.sql)
            </button>
            <button
              onClick={() => handleDownload('power_bi_dax_measures.dax')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-all"
              title="Download complete DAX formulas"
            >
              <Download className="w-4 h-4" />
              Download DAX (.dax)
            </button>
            <button
              onClick={handleDownloadGuide}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium text-xs transition-all"
              title="View full integration guide markdown"
            >
              <BookOpen className="w-4 h-4" />
              Full Guide (.md)
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button
          onClick={() => setSubTab('views')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'views'
              ? 'border-amber-500 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Table className="w-4 h-4" />
          Power BI-Ready Views (7 Views)
        </button>
        <button
          onClick={() => setSubTab('report')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'report'
              ? 'border-amber-500 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4" />
          6-Page Report Blueprint Specification
        </button>
        <button
          onClick={() => setSubTab('dax')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'dax'
              ? 'border-amber-500 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCode className="w-4 h-4" />
          DAX Measures Studio
        </button>
        <button
          onClick={() => setSubTab('connect')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'connect'
              ? 'border-amber-500 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Desktop Connection & Semantic Model
        </button>
      </div>

      {/* SUB-TAB 1: POWER BI-READY VIEWS */}
      {subTab === 'views' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: View Selector List */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Select SQL View to Inspect
            </div>
            {POWER_BI_VIEWS.map(v => {
              const isSelected = selectedView.name === v.name;
              return (
                <div
                  key={v.name}
                  onClick={() => setSelectedView(v)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isSelected ? 'text-amber-800' : 'text-slate-800'
                      }`}
                    >
                      {v.name}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                      MySQL View
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700">{v.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {v.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: View Deep Dive & Data Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      {selectedView.name}
                    </h3>
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-800">
                      Active In DW
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedView.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(selectedView.ddl, selectedView.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all"
                  >
                    {copiedText === selectedView.name ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied SQL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy View DDL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* View Attributes Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 font-medium block text-[10px] uppercase">
                    Data Grain
                  </span>
                  <span className="font-medium text-slate-800">{selectedView.grain}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 font-medium block text-[10px] uppercase">
                    Consumed In Power BI Pages
                  </span>
                  <span className="font-medium text-slate-800">
                    {selectedView.targetPages.join(' • ')}
                  </span>
                </div>
              </div>

              {/* Supported Metrics Tags */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Supported Business Metrics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedView.supportedMetrics.map(m => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Warehouse Data Preview */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    Live Data Preview (Computed directly from Data Warehouse)
                  </span>
                  <span className="text-slate-500">
                    Total Records in View: <strong>{previewTotal.toLocaleString()}</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72 bg-slate-50/50">
                  {previewLoading ? (
                    <div className="py-12 flex items-center justify-center text-xs text-slate-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      Loading live rows from {selectedView.name}...
                    </div>
                  ) : previewData.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No records currently populated in this view.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                        <tr>
                          {previewColumns.map(col => (
                            <th
                              key={col}
                              className="px-3 py-2 font-mono font-semibold whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {previewData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {previewColumns.map(col => (
                              <td
                                key={col}
                                className="px-3 py-2 font-mono text-[11px] whitespace-nowrap text-slate-700"
                              >
                                {typeof row[col] === 'number'
                                  ? row[col].toLocaleString()
                                  : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* View SQL DDL Definition */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  MySQL View DDL Definition
                </span>
                <pre className="p-3.5 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                  {selectedView.ddl}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 6-PAGE REPORT BLUEPRINT */}
      {subTab === 'report' && (
        <div className="space-y-6">
          {/* Page Selector Tabs */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
            {REPORT_PAGES.map(p => {
              const isSelected = selectedPage.pageNumber === p.pageNumber;
              return (
                <button
                  key={p.pageNumber}
                  onClick={() => setSelectedPage(p)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-900/10 flex items-center justify-center text-[10px] font-bold">
                    {p.pageNumber}
                  </span>
                  {p.title}
                </button>
              );
            })}
          </div>

          {/* Active Page Detailed Blueprint */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs">
                    Page {selectedPage.pageNumber} of 6
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">{selectedPage.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedPage.purpose}</p>
              </div>

              <div className="text-xs text-slate-400 italic">
                Theme: <strong className="text-slate-700">{selectedPage.theme}</strong>
              </div>
            </div>

            {/* KPI Cards (if present on this page) */}
            {selectedPage.kpis && selectedPage.kpis.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Header KPI Cards (Power BI Card Visuals)
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedPage.kpis.map((kpi, idx) => {
                    const [kpiTitle, kpiVal] = kpi.split(': ');
                    return (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-xl border border-slate-700 shadow-sm"
                      >
                        <span className="text-[11px] text-amber-400 font-medium block">
                          {kpiTitle}
                        </span>
                        <span className="text-lg font-bold text-white tracking-tight mt-0.5 block">
                          {kpiVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visuals Grid */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Visualizations & Chart Specifications
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPage.visuals.map((vis, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {vis.title}
                      </h4>
                      <span className="text-[11px] font-semibold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        {vis.chartType}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400 font-medium shrink-0">Fields / Axes:</span>
                        <code className="text-slate-800 font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200 break-all">
                          {vis.fields}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Source Table/View:</span>
                        <span className="text-amber-800 font-mono font-medium text-[11px]">
                          {vis.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Filters / Slicers on this Page */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Required Power BI Filters & Global Slicers on Page {selectedPage.pageNumber}
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedPage.slicers.map(s => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded bg-white text-xs font-medium text-slate-700 border border-amber-300/80 shadow-2xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DAX MEASURES STUDIO */}
      {subTab === 'dax' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                DAX Calculated Measures Library
              </h3>
              <p className="text-xs text-slate-500">
                Standardized DAX calculations designed to be hosted in a disconnected{' '}
                <code className="font-mono text-amber-700">_Measures</code> table in Power BI Desktop.
              </p>
            </div>
            <button
              onClick={() => handleDownload('power_bi_dax_measures.dax')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download All DAX (.dax)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DAX_MEASURES.map(measure => (
              <div
                key={measure.name}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 hover:border-amber-300 transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{measure.name}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {measure.category}
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(measure.formula, measure.name)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-amber-600 px-2 py-1 rounded bg-slate-50 hover:bg-amber-50 border border-slate-200 transition-all"
                  >
                    {copiedText === measure.name ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copy DAX</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">{measure.description}</p>

                <div className="text-[11px] text-slate-400">
                  Target: <strong className="text-slate-600">{measure.targetVisual}</strong>
                </div>

                <pre className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                  {measure.formula}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DESKTOP CONNECTION & SEMANTIC MODEL */}
      {subTab === 'connect' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Power BI Desktop to MySQL Data Warehouse Connection Tutorial
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Follow these exact steps to link Power BI Desktop directly to your MySQL E-Commerce Data Warehouse.
            </p>
          </div>

          {/* Connection Parameters Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Server & Port
              </span>
              <div className="font-mono text-sm font-bold text-slate-800">localhost:3306</div>
              <span className="text-[11px] text-slate-500">Standard MySQL network port</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Database Schema
              </span>
              <div className="font-mono text-sm font-bold text-slate-800">olist_datawarehouse</div>
              <span className="text-[11px] text-slate-500">Kimball Star Schema repository</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recommended Mode
              </span>
              <div className="font-mono text-sm font-bold text-emerald-700">Import Mode</div>
              <span className="text-[11px] text-slate-500">Enables high-performance DAX & Time Intelligence</span>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Step-by-Step Procedure
            </h4>

            <div className="space-y-3">
              <div className="flex gap-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-800 text-sm">Install Oracle MySQL Connector/NET</strong>
                  <p className="text-slate-600">
                    Download and install the official MySQL Connector/NET 8.0.28+ from Oracle on your Windows machine before opening Power BI Desktop.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-800 text-sm">Get Data &rarr; MySQL Database</strong>
                  <p className="text-slate-600">
                    In Power BI Desktop, click <strong>Get Data</strong> &rarr; <strong>Database</strong> &rarr; <strong>MySQL database</strong>. Enter Server: <code className="font-mono">localhost:3306</code> and Database: <code className="font-mono">olist_datawarehouse</code>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-800 text-sm">Configure Star Schema Relationships</strong>
                  <p className="text-slate-600">
                    In Model View, verify the 1:N relationships between conformed dimensions and <code className="font-mono">fact_sales</code>. Ensure cross-filter direction is set to <strong>Single</strong>.
                  </p>
                  <ul className="list-disc pl-5 text-slate-500 space-y-0.5 mt-1 font-mono text-[11px]">
                    <li>dim_date[date_key] (1) &rarr; fact_sales[date_key] (*)</li>
                    <li>dim_customer[customer_key] (1) &rarr; fact_sales[customer_key] (*)</li>
                    <li>dim_product[product_key] (1) &rarr; fact_sales[product_key] (*)</li>
                    <li>dim_location[location_key] (1) &rarr; fact_sales[location_key] (*)</li>
                    <li>dim_seller[seller_key] (1) &rarr; fact_sales[seller_key] (*)</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </span>
                <div className="space-y-1 text-xs">
                  <strong className="text-slate-800 text-sm">Create Disconnected _Measures Table</strong>
                  <p className="text-slate-600">
                    Use <strong>Enter Data</strong> to create a table named <code className="font-mono">_Measures</code>. Paste the DAX formulas from the DAX Measures Studio tab.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
