-- =====================================================================
-- MICROSOFT POWER BI INTEGRATION: STAR SCHEMA ANALYTICAL VIEWS
-- Target Database: MySQL 8.0+ / olist_datawarehouse
-- Architecture: Kimball Dimensional Star Schema
-- File: power_bi_views.sql
-- =====================================================================
-- Note: Power BI connects to MySQL as the primary E-Commerce Data Warehouse.
-- These 7 optimized views avoid duplicate rows, pre-calculate key aggregations,
-- and provide high-performance consumption for DirectQuery or Import modes.
-- =====================================================================

USE olist_datawarehouse;

-- ---------------------------------------------------------------------
-- 1. VIEW: vw_sales_summary
-- Grain: One row per calendar date with aggregated sales metrics
-- Supports: Total Sales, Total Orders, Total Customers, AOV, Gross Merchandise Value
-- Consumed by: Page 1 (Executive Sales Overview), Page 2 (Sales Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_sales_summary AS
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
    d.date_key,
    d.full_date,
    d.year,
    d.quarter,
    d.month_num,
    d.month_name,
    d.day_name,
    d.is_weekend;


-- ---------------------------------------------------------------------
-- 2. VIEW: vw_monthly_sales
-- Grain: One row per calendar year-month
-- Supports: Monthly Revenue, Yearly Revenue, MoM Trends, Seasonal Velocity
-- Consumed by: Page 1 (Monthly Sales Trend), Page 2 (Sales Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_monthly_sales AS
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
GROUP BY
    d.year,
    d.quarter,
    d.month_num,
    d.month_name,
    DATE_FORMAT(d.full_date, '%Y-%m')
ORDER BY
    d.year,
    d.month_num;


-- ---------------------------------------------------------------------
-- 3. VIEW: vw_product_performance
-- Grain: One row per product SKU with lifetime catalog metrics
-- Supports: Top Products, Product Revenue, Quantity Sold, SKU Ranking
-- Consumed by: Page 1 (Top 10 Products), Page 3 (Product Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_performance AS
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
GROUP BY
    p.product_key,
    p.product_id,
    p.product_category_name_english,
    p.product_category_name,
    p.product_photos_qty,
    p.product_weight_g;


-- ---------------------------------------------------------------------
-- 4. VIEW: vw_category_sales
-- Grain: One row per product category
-- Supports: Sales by Category, Category Performance, Pareto Share
-- Consumed by: Page 1 (Sales by Category), Page 2 & Page 3 (Category Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_category_sales AS
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
GROUP BY
    COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized');


-- ---------------------------------------------------------------------
-- 5. VIEW: vw_customer_behavior
-- Grain: One row per distinct human buyer (customer_unique_id)
-- Supports: New vs Returning Customers, Purchase Frequency, Customer LTV, Spend Cohorts
-- Consumed by: Page 4 (Customer Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_customer_behavior AS
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
GROUP BY
    c.customer_unique_id,
    c.customer_city,
    c.customer_state;


-- ---------------------------------------------------------------------
-- 6. VIEW: vw_regional_sales
-- Grain: One row per State and City geographic origin
-- Supports: Sales by State, Sales by City, Macro-Region Distribution, Freight Tariff
-- Consumed by: Page 1 (Sales by State), Page 2, Page 5 (Regional Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_regional_sales AS
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
GROUP BY
    COALESCE(l.geolocation_state, c.customer_state),
    COALESCE(l.geolocation_city, c.customer_city);


-- ---------------------------------------------------------------------
-- 7. VIEW: vw_order_performance
-- Grain: One row per order header with lifecycle delivery metrics
-- Supports: Order Status, Actual vs Estimated Delivery Time, Delayed Orders
-- Consumed by: Page 1 (Order Status), Page 6 (Delivery & Order Analysis)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_order_performance AS
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
    -- Actual Delivery Days (Purchase to Customer Doorstep)
    TIMESTAMPDIFF(DAY, f.order_purchase_timestamp, f.order_delivered_customer_date) AS actual_delivery_days,
    -- Carrier Estimated Delivery Days
    TIMESTAMPDIFF(DAY, f.order_purchase_timestamp, f.order_estimated_delivery_date) AS estimated_delivery_days,
    -- SLA Variance Days (> 0 means delayed past carrier estimate)
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
    f.order_id,
    f.order_status,
    d.full_date,
    d.year,
    d.quarter,
    d.month_num,
    d.month_name,
    f.order_purchase_timestamp,
    f.order_delivered_customer_date,
    f.order_estimated_delivery_date;
