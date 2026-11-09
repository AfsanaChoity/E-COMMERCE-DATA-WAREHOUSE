# Microsoft Power BI Desktop & MySQL Data Warehouse Integration Guide

## Executive Architecture Summary

This guide details the end-to-end integration between **Microsoft Power BI Desktop** and the **MySQL E-Commerce Data Warehouse (`olist_datawarehouse`)**. 

```
┌────────────────────────────────────────────────────────┐
│             MySQL Primary Data Warehouse               │
│                (olist_datawarehouse)                   │
├────────────────────────────────────────────────────────┤
│  Star Schema Fact & Conformed Dimensions               │
│  - fact_sales (Transactional line items)               │
│  - dim_customer, dim_product, dim_date, dim_location   │
│                                                        │
│  Pre-Aggregated High-Performance OLAP Views            │
│  - vw_sales_summary, vw_monthly_sales, vw_category...   │
└──────────────────────────┬─────────────────────────────┘
                           │ Native MySQL Connector
                           │ (DirectQuery / Import)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Microsoft Power BI Desktop                 │
├────────────────────────────────────────────────────────┤
│  1. Star Schema Relationship Semantic Model            │
│  2. DAX Central Calculated Measures Library            │
│  3. 6-Page Interactive Executive BI Report Suite       │
└────────────────────────────────────────────────────────┘
```

> **Fundamental Architecture Principle**: Power BI does **NOT** replace MySQL. MySQL serves as the primary Data Warehouse (the Single Source of Truth). Power BI connects to MySQL, consumes the star schema tables and views, and serves the business intelligence reporting layer.

---

## 1. How to Connect Power BI Desktop to MySQL

### Prerequisites
1. **MySQL Star Schema & Views Initialized**:
   * Ensure `sql/schema.sql` has been executed and the ETL pipeline (`npm run etl`) has populated `olist_datawarehouse`.
   * Execute [`sql/power_bi_views.sql`](../sql/power_bi_views.sql) against `olist_datawarehouse` in MySQL Workbench or phpMyAdmin to create the 7 pre-aggregated analytical views (`vw_sales_summary`, `vw_monthly_sales`, etc.).
2. **Power BI Desktop** (Latest Version).
3. **Oracle MySQL Connector/NET** (Version 8.0.28 or later) installed on the Windows machine.
   * Download from: `https://dev.mysql.com/downloads/connector/net/`
   * *Alternative*: MySQL ODBC 8.0 Driver if using standard DSN connection.

### Step-by-Step Connection Procedure
1. Open **Power BI Desktop**.
2. On the **Home** ribbon, click **Get Data** &rarr; **More...** &rarr; **Database** &rarr; **MySQL database** &rarr; Click **Connect**.
3. In the connection dialog:
   * **Server**: `127.0.0.1:3306` or `localhost:3306`
   * **Database**: `olist_datawarehouse`
   * **Data Connectivity mode**:
     * **Import Mode** (*Recommended for agile dashboards & advanced DAX time-intelligence functions*).
     * **DirectQuery Mode** (*Recommended if real-time transactional sync is mandated*).
4. In the **Credentials** window:
   * Select **Database** on the left navigation.
   * **For Local Setup (XAMPP / Local MySQL)**:
     * **User name**: `root`
     * **Password**: *(leave empty, or enter your local MySQL root password from `.env`)*
   * **For Provisioned Role Accounts** (if `sql/database.sql` was executed):
     * **User name**: `olist_analyst` (or `olist_admin`)
     * **Password**: `Analyst@2024Secure!`
   * Level to apply settings: `Database level`.
5. Click **Connect**. If prompted regarding encryption support, click **OK** to proceed with local unencrypted connection.

---

## 2. Database Objects, Tables & Views for Power BI

Power BI Desktop connects to the `olist_datawarehouse` database. In the **Navigator** window, check the following tables and views:

### Core Star Schema Tables (Semantic Relationship Model)
| Object Name | Type | Grain | Purpose |
| :--- | :--- | :--- | :--- |
| `fact_sales` | Fact Table | 1 row per order item | Central transactional table with measures (price, freight, rating) |
| `dim_date` | Dimension | 1 row per calendar day | Master date dimension for time-intelligence filtering |
| `dim_customer`| Dimension | 1 row per customer token | Customer attributes, cities, states, unique buyer ID |
| `dim_product` | Dimension | 1 row per SKU hash | Product category (English/Portuguese), dimensions, weight |
| `dim_location`| Dimension | 1 row per postal hub | Geographic coordinates, federative units, macro-regions |
| `dim_seller`  | Dimension | 1 row per merchant | Merchant identity, seller hub city, seller state |

### Dedicated Power BI Views (Pre-Built for Fast Reporting)
| View Name | Primary Metrics | Target Visuals & Pages |
| :--- | :--- | :--- |
| `vw_sales_summary` | Daily revenue, order volume, customer counts, AOV | Page 1 Executive KPI Cards |
| `vw_monthly_sales` | Monthly revenue, monthly orders, AOV, ratings | Page 1 & 2 Time Series Charts |
| `vw_product_performance` | SKU units sold, revenue, average price, ratings | Page 1 & 3 Top Product Tables & Bar Charts |
| `vw_category_sales` | Category revenue, unit volume, GMV, market share | Page 1, 2 & 3 Category Treemaps & Clustered Bars |
| `vw_customer_behavior` | New vs Returning, purchase frequency, LTV cohorts | Page 4 Customer Donut & Scatter Charts |
| `vw_regional_sales` | Revenue by state & city, freight ratio, SLA | Page 1 & 5 Filled Maps & Regional Matrix |
| `vw_order_performance` | Status breakdown, actual vs estimated delivery days | Page 1 & 6 Delivery Gauges & Delay Histograms |

---

## 3. Semantic Model Relationships in Power BI

Navigate to the **Model View** in Power BI Desktop to configure the Star Schema relationships.

```
       ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
       │   dim_date   │          │ dim_customer │          │  dim_seller  │
       └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
              │ 1                       │ 1                       │ 1
              │                         │                         │
              │ *                       │ *                       │ *
       ┌──────┴─────────────────────────┴─────────────────────────┴──────┐
       │                            fact_sales                           │
       └──────────────┬───────────────────────────────────┬──────────────┘
                      │ *                                 │ *
                      │                                   │
                      │ 1                                 │ 1
               ┌──────┴───────┐                    ┌──────┴───────┐
               │ dim_product  │                    │ dim_location │
               └──────────────┘                    └──────────────┘
```

### Relationship Matrix Configuration:
1. **Date to Fact**:
   * **From**: `dim_date[date_key]` &rarr; **To**: `fact_sales[date_key]`
   * **Cardinality**: `1 to Many (1:*)`
   * **Cross filter direction**: `Single` (dim_date filters fact_sales)
   * **State**: Active
2. **Customer to Fact**:
   * **From**: `dim_customer[customer_key]` &rarr; **To**: `fact_sales[customer_key]`
   * **Cardinality**: `1 to Many (1:*)`
   * **Cross filter direction**: `Single`
   * **State**: Active
3. **Product to Fact**:
   * **From**: `dim_product[product_key]` &rarr; **To**: `fact_sales[product_key]`
   * **Cardinality**: `1 to Many (1:*)`
   * **Cross filter direction**: `Single`
   * **State**: Active
4. **Location to Fact**:
   * **From**: `dim_location[location_key]` &rarr; **To**: `fact_sales[location_key]`
   * **Cardinality**: `1 to Many (1:*)`
   * **Cross filter direction**: `Single`
   * **State**: Active
5. **Seller to Fact**:
   * **From**: `dim_seller[seller_key]` &rarr; **To**: `fact_sales[seller_key]`
   * **Cardinality**: `1 to Many (1:*)`
   * **Cross filter direction**: `Single`
   * **State**: Active

---

## 4. Calculated Measures (DAX Library)

Create a dedicated empty table named `_Measures` in Power BI Desktop to store all business logic.

### 1. Executive Sales & Financials
```dax
Total Sales = 
SUM(fact_sales[price])

Total Freight = 
SUM(fact_sales[freight_value])

Gross Merchandise Value = 
[Total Sales] + [Total Freight]

Total Orders = 
DISTINCTCOUNT(fact_sales[order_id])

Total Items Sold = 
COUNTROWS(fact_sales)

Average Order Value = 
DIVIDE([Total Sales], [Total Orders], 0)

Average Customer Rating = 
AVERAGE(fact_sales[review_score])
```

### 2. Time-Intelligence & Growth
```dax
Sales Previous Month = 
CALCULATE(
    [Total Sales],
    DATEADD(dim_date[full_date], -1, MONTH)
)

MoM Sales Growth % = 
VAR CurrentSales = [Total Sales]
VAR PrevSales = [Sales Previous Month]
RETURN
DIVIDE(CurrentSales - PrevSales, PrevSales, 0)

Sales Previous Year = 
CALCULATE(
    [Total Sales],
    SAMEPERIODLASTYEAR(dim_date[full_date])
)

YoY Sales Growth % = 
VAR CurrentSales = [Total Sales]
VAR PrevYear = [Sales Previous Year]
RETURN
DIVIDE(CurrentSales - PrevYear, PrevYear, 0)
```

### 3. Customer Retention & RFM
```dax
Total Customers = 
DISTINCTCOUNT(dim_customer[customer_unique_id])

Returning Customers = 
CALCULATE(
    [Total Customers],
    FILTER(
        vw_customer_behavior,
        vw_customer_behavior[customer_retention_type] = "Returning Customer"
    )
)

Returning Customer Rate = 
DIVIDE([Returning Customers], [Total Customers], 0)

Average Orders per Customer = 
DIVIDE([Total Orders], [Total Customers], 0)
```

### 4. Logistics & Delivery Performance
```dax
Average Delivery Days = 
AVERAGE(vw_order_performance[actual_delivery_days])

Estimated Delivery Days = 
AVERAGE(vw_order_performance[estimated_delivery_days])

Delayed Orders Count = 
CALCULATE(
    [Total Orders],
    vw_order_performance[delivery_sla_status] = "Delayed Delivery"
)

On-Time Delivery Rate % = 
VAR ValidDeliveries = 
    CALCULATE(
        [Total Orders],
        NOT(ISBLANK(vw_order_performance[actual_delivery_days]))
    )
RETURN
DIVIDE(
    CALCULATE([Total Orders], vw_order_performance[delivery_sla_status] = "On-Time Delivery"),
    ValidDeliveries,
    0
)
```

---

## 5. Report Filters & Global Slicers

Place a standardized top filter panel on all report pages:

1. **Date Hierarchy Slicer** (Dropdown / Between):
   * Field: `dim_date[year]`, `dim_date[quarter]`, `dim_date[month_name]`
2. **Product Category Slicer** (Searchable Dropdown):
   * Field: `dim_product[product_category_name_english]`
3. **Macro-Region Slicer** (Tile / Horizontal buttons):
   * Field: `vw_regional_sales[macro_region]` (Southeast, South, Northeast, Central-West, North)
4. **Order Status Slicer** (Dropdown):
   * Field: `fact_sales[order_status]` ('delivered', 'shipped', 'canceled')

---

## 6. Power BI 6-Page Report Specifications

### Page 1: Executive Sales Overview
* **Purpose**: High-level C-Suite KPI dashboard summarizing revenue health, customer adoption, and delivery fulfillment.
* **Header KPI Cards**:
  1. `Total Sales`: Card visual (`[Total Sales]`, format R$ Currency)
  2. `Total Orders`: Card visual (`[Total Orders]`, integer with thousand separator)
  3. `Total Customers`: Card visual (`[Total Customers]`, integer)
  4. `Average Order Value`: Card visual (`[Average Order Value]`, format R$)
* **Visuals Layout**:
  * **Visual 1: Monthly Sales Trend**:
    * Type: *Area Chart* or *Line Chart*
    * X-Axis: `vw_monthly_sales[year_month]`
    * Y-Axis: `[Total Sales]`, Secondary Y-Axis: `[Total Orders]`
  * **Visual 2: Sales by Category**:
    * Type: *Donut Chart* or *Treemap*
    * Category: `vw_category_sales[category_name]`
    * Values: `[Total Sales]`
  * **Visual 3: Top 10 Products**:
    * Type: *Clustered Bar Chart* (Top 10 filter by `[Total Sales]`)
    * Y-Axis: `dim_product[product_id]`
    * X-Axis: `[Total Sales]`
  * **Visual 4: Sales by State**:
    * Type: *Filled Map (Choropleth)* or *Horizontal Bar Chart*
    * Location: `dim_customer[customer_state]`
    * Tooltip / Color Saturation: `[Total Sales]`
  * **Visual 5: Order Status**:
    * Type: *Pie Chart*
    * Legend: `fact_sales[order_status]`
    * Values: `[Total Orders]`

---

### Page 2: Sales Analysis
* **Purpose**: Deep dimensional breakdown of commercial velocity across temporal and category hierarchies.
* **Visuals Layout**:
  * **Visual 1: Monthly Sales Velocity**:
    * Type: *Clustered Column Chart*
    * X-Axis: `dim_date[month_name]` (Sorted by `month_num`)
    * Legend: `dim_date[year]`
    * Y-Axis: `[Total Sales]`
  * **Visual 2: Quarterly Sales Progression**:
    * Type: *Waterfall Chart* or *Grouped Column Chart*
    * Category: `dim_date[quarter]`
    * Values: `[Total Sales]`
  * **Visual 3: Yearly Sales**:
    * Type: *Clustered Column Chart* with data labels
    * X-Axis: `dim_date[year]`
    * Y-Axis: `[Total Sales]`
  * **Visual 4: Category Sales Breakdown**:
    * Type: *Matrix Table*
    * Rows: `dim_product[product_category_name_english]`
    * Values: `[Total Sales]`, `[Total Items Sold]`, `[Average Item Price]`, `[Category Sales Share %]`
  * **Visual 5: Regional Sales Comparison**:
    * Type: *Clustered Bar Chart*
    * Category: `vw_regional_sales[macro_region]`
    * Values: `[Total Sales]`
  * **Visual 6: Average Order Value (AOV) Longitudinal Evolution**:
    * Type: *Line Chart*
    * X-Axis: `vw_monthly_sales[year_month]`
    * Y-Axis: `[Average Order Value]`

---

### Page 3: Product Analysis
* **Purpose**: Catalog merchandise insights, SKU velocity, and volume performance.
* **Visuals Layout**:
  * **Visual 1: Top Products**:
    * Type: *Matrix / Table*
    * Columns: `product_id`, `category_name`, `total_quantity_sold`, `total_product_revenue`, `avg_selling_price`, `avg_review_score`
    * Sort: `total_product_revenue` DESC
  * **Visual 2: Product Revenue Pareto Distribution**:
    * Type: *Line and Clustered Column Chart*
    * X-Axis: `category_name`
    * Column Y-Axis: `[Total Sales]`
    * Line Y-Axis: Cumulative Share %
  * **Visual 3: Quantity Sold by Category**:
    * Type: *Treemap*
    * Group: `category_name`
    * Values: `[Total Items Sold]`
  * **Visual 4: Category Performance Quadrant**:
    * Type: *Scatter Chart*
    * X-Axis: `[Total Items Sold]` (Unit Volume)
    * Y-Axis: `[Average Order Value]` (Ticket Size)
    * Bubble Size: `[Total Sales]`
    * Color: `[Average Customer Rating]`

---

### Page 4: Customer Analysis
* **Purpose**: Customer segmentation, retention ratios, frequency indices, and LTV distribution.
* **Visuals Layout**:
  * **Visual 1: New vs. Returning Customers**:
    * Type: *Donut Chart*
    * Legend: `vw_customer_behavior[customer_retention_type]`
    * Values: `[Total Customers]`
  * **Visual 2: Returning Customers Trend**:
    * Type: *100% Stacked Bar Chart*
    * Category: `dim_date[year]`
    * Series: `customer_retention_type`
    * Values: `[Total Orders]`
  * **Visual 3: Purchase Frequency Distribution**:
    * Type: *Histogram / Column Chart*
    * X-Axis: `vw_customer_behavior[total_orders]` (1 order, 2 orders, 3+ orders)
    * Y-Axis: `[Total Customers]`
  * **Visual 4: Top Customers Ranking**:
    * Type: *Table Visual*
    * Columns: `customer_unique_id`, `customer_city`, `customer_state`, `total_orders`, `total_customer_spend`, `customer_aov`
    * Sort: `total_customer_spend` DESC
  * **Visual 5: Customer Revenue by Spend Tier**:
    * Type: *Funnel Chart* or *Clustered Bar*
    * Category: `vw_customer_behavior[customer_spend_tier]`
    * Values: `[Total Sales]`

---

### Page 5: Regional Analysis
* **Purpose**: Geographic logistics map, territorial revenue concentrations, and state-level freight impact.
* **Visuals Layout**:
  * **Visual 1: Sales by State**:
    * Type: *Filled Map (Brazil Shapefile)*
    * Location: `dim_customer[customer_state]`
    * Color: `[Total Sales]` (Gradient from light blue to navy)
  * **Visual 2: Sales by Top 15 Cities**:
    * Type: *Horizontal Clustered Bar Chart*
    * Y-Axis: `vw_regional_sales[city]`
    * X-Axis: `[Total Sales]`
  * **Visual 3: Regional Sales Trend**:
    * Type: *Stacked Area Chart*
    * X-Axis: `vw_monthly_sales[year_month]`
    * Legend: `vw_regional_sales[macro_region]`
    * Values: `[Total Sales]`
  * **Visual 4: Customer Distribution**:
    * Type: *Bubble Map*
    * Latitude: `dim_location[geolocation_lat]`
    * Longitude: `dim_location[geolocation_lng]`
    * Size: `[Total Customers]`

---

### Page 6: Delivery & Order Analysis
* **Purpose**: Carrier logistics SLA monitoring, order completion lifecycle, and delivery delay tracking.
* **Visuals Layout**:
  * **Visual 1: Order Status Breakdown**:
    * Type: *Donut Chart*
    * Legend: `vw_order_performance[order_status]`
    * Values: `[Total Orders]`
  * **Visual 2: Average Delivery Time by Macro-Region**:
    * Type: *Clustered Bar Chart*
    * Category: `vw_regional_sales[macro_region]`
    * Values: `[Average Delivery Days]`
  * **Visual 3: Estimated vs. Actual Delivery Time**:
    * Type: *Line & Clustered Column Chart*
    * X-Axis: `vw_order_performance[purchase_month]`
    * Column Values: `[Average Delivery Days]`
    * Line Values: `[Estimated Delivery Days]`
  * **Visual 4: Delayed Orders Analysis & SLA Adherence**:
    * Type: *Gauge Visual* & *Stacked Column*
    * Gauge Value: `[On-Time Delivery Rate %]` (Target: 95%)
    * Breakdown Bar: `vw_order_performance[delivery_sla_status]` ('On-Time Delivery', 'Delayed Delivery')
