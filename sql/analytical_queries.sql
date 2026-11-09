-- =====================================================================
-- E-COMMERCE DATA WAREHOUSE: ANALYTICAL OLAP SQL QUERIES
-- Dataset: Brazilian E-Commerce Public Dataset by Olist (Kaggle)
-- Target RDBMS: MySQL 8.0+
-- File: analytical_queries.sql
-- =====================================================================

USE olist_datawarehouse;

-- ---------------------------------------------------------------------
-- QUERY 1: EXECUTIVE KPI SUMMARY
-- High-level overview: Total Gross Revenue, Total Items Sold, Total Orders,
-- Unique Customers, Average Order Value (AOV), and Average Satisfaction Rating.
-- ---------------------------------------------------------------------
SELECT 
    ROUND(SUM(f.price), 2) AS total_item_revenue_brl,
    ROUND(SUM(f.freight_value), 2) AS total_freight_revenue_brl,
    ROUND(SUM(f.total_item_value), 2) AS total_gross_merchandise_value,
    COUNT(f.sales_id) AS total_items_sold,
    COUNT(DISTINCT f.order_id) AS total_unique_orders,
    COUNT(DISTINCT c.customer_unique_id) AS total_unique_buyers,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS average_order_value_brl,
    ROUND(AVG(f.price), 2) AS average_item_price_brl,
    ROUND(AVG(f.freight_value), 2) AS average_freight_fee_brl,
    ROUND(AVG(f.review_score), 2) AS average_review_score
FROM fact_sales f
JOIN dim_customer c ON f.customer_key = c.customer_key
WHERE f.order_status = 'delivered';


-- ---------------------------------------------------------------------
-- QUERY 2: MONTHLY REVENUE TREND & MONTH-OVER-MONTH (MoM) GROWTH
-- Uses MySQL 8.0 LAG() window function to calculate monthly revenue trajectory
-- ---------------------------------------------------------------------
WITH monthly_sales AS (
    SELECT 
        d.year,
        d.month_num,
        d.month_name,
        COUNT(DISTINCT f.order_id) AS order_volume,
        ROUND(SUM(f.price), 2) AS monthly_revenue
    FROM fact_sales f
    JOIN dim_date d ON f.date_key = d.date_key
    WHERE f.order_status = 'delivered'
    GROUP BY d.year, d.month_num, d.month_name
)
SELECT 
    year,
    month_num,
    month_name,
    order_volume,
    monthly_revenue,
    LAG(monthly_revenue, 1) OVER (ORDER BY year, month_num) AS previous_month_revenue,
    ROUND(
        (monthly_revenue - LAG(monthly_revenue, 1) OVER (ORDER BY year, month_num)) / 
        NULLIF(LAG(monthly_revenue, 1) OVER (ORDER BY year, month_num), 0) * 100, 
        2
    ) AS mom_growth_percentage
FROM monthly_sales
ORDER BY year, month_num;


-- ---------------------------------------------------------------------
-- QUERY 3: TOP 10 PRODUCT CATEGORIES BY REVENUE & MARGIN CONTRIBUTION
-- Identifies top merchandise categories by sales volume and average unit price
-- ---------------------------------------------------------------------
SELECT 
    COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized') AS category_name,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS units_sold,
    ROUND(SUM(f.price), 2) AS total_category_revenue,
    ROUND(AVG(f.price), 2) AS avg_item_price,
    ROUND(AVG(p.product_weight_g), 0) AS avg_weight_grams,
    ROUND(AVG(f.review_score), 2) AS avg_customer_rating,
    ROUND(SUM(f.price) * 100.0 / (SELECT SUM(price) FROM fact_sales WHERE order_status = 'delivered'), 2) AS revenue_share_pct
FROM fact_sales f
JOIN dim_product p ON f.product_key = p.product_key
WHERE f.order_status = 'delivered'
GROUP BY COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized')
ORDER BY total_category_revenue DESC
LIMIT 10;


-- ---------------------------------------------------------------------
-- QUERY 4: RFM CUSTOMER SEGMENTATION (RECENCY, FREQUENCY, MONETARY)
-- Kimball dimensional analysis grouping customers into behavioral tiers
-- ---------------------------------------------------------------------
WITH customer_rfm AS (
    SELECT 
        c.customer_unique_id,
        c.customer_state,
        c.customer_city,
        DATEDIFF('2018-09-01', MAX(f.order_purchase_timestamp)) AS recency_days,
        COUNT(DISTINCT f.order_id) AS frequency_orders,
        ROUND(SUM(f.price), 2) AS monetary_spend
    FROM fact_sales f
    JOIN dim_customer c ON f.customer_key = c.customer_key
    WHERE f.order_status = 'delivered'
    GROUP BY c.customer_unique_id, c.customer_state, c.customer_city
)
SELECT 
    customer_unique_id,
    customer_city,
    customer_state,
    recency_days,
    frequency_orders,
    monetary_spend,
    CASE 
        WHEN frequency_orders >= 2 AND monetary_spend >= 300 THEN 'Champions'
        WHEN frequency_orders >= 2 AND monetary_spend < 300 THEN 'Loyal Customers'
        WHEN frequency_orders = 1 AND recency_days <= 90 THEN 'Recent Potential Buyers'
        WHEN frequency_orders = 1 AND recency_days BETWEEN 91 AND 240 THEN 'Promising / At Risk'
        ELSE 'Hibernating / Churned'
    END AS rfm_segment
FROM customer_rfm
ORDER BY monetary_spend DESC
LIMIT 20;


-- ---------------------------------------------------------------------
-- QUERY 5: REPEAT BUYER COHORT & REVENUE CONCENTRATION
-- Determines the proportion of revenue generated by repeat vs single-purchase buyers
-- ---------------------------------------------------------------------
WITH buyer_order_counts AS (
    SELECT 
        c.customer_unique_id,
        COUNT(DISTINCT f.order_id) AS order_count,
        SUM(f.price) AS total_spend
    FROM fact_sales f
    JOIN dim_customer c ON f.customer_key = c.customer_key
    WHERE f.order_status = 'delivered'
    GROUP BY c.customer_unique_id
)
SELECT 
    CASE 
        WHEN order_count = 1 THEN '1 Order (One-Time Buyer)'
        WHEN order_count = 2 THEN '2 Orders (Repeat Buyer)'
        ELSE '3+ Orders (Power Buyer)'
    END AS buyer_loyalty_tier,
    COUNT(*) AS total_customers,
    ROUND(SUM(total_spend), 2) AS aggregate_revenue_brl,
    ROUND(AVG(total_spend), 2) AS avg_customer_lifetime_value,
    ROUND(SUM(total_spend) * 100.0 / (SELECT SUM(total_spend) FROM buyer_order_counts), 2) AS revenue_contribution_pct
FROM buyer_order_counts
GROUP BY buyer_loyalty_tier
ORDER BY aggregate_revenue_brl DESC;


-- ---------------------------------------------------------------------
-- QUERY 6: GEOGRAPHIC LOGISTICS & FREIGHT BURDEN BY STATE
-- Analyzes Brazilian states by revenue, average freight surcharge, and average delivery timeline
-- ---------------------------------------------------------------------
SELECT 
    l.geolocation_state AS customer_state,
    COUNT(DISTINCT f.order_id) AS total_orders,
    ROUND(SUM(f.price), 2) AS total_sales_brl,
    ROUND(SUM(f.freight_value), 2) AS total_freight_brl,
    ROUND(AVG(f.freight_value), 2) AS avg_freight_cost_brl,
    ROUND(AVG(f.freight_value) * 100.0 / NULLIF(AVG(f.price), 0), 1) AS freight_to_price_ratio_pct,
    ROUND(AVG(DATEDIFF(f.order_delivered_customer_date, f.order_purchase_timestamp)), 1) AS avg_delivery_days,
    ROUND(AVG(f.review_score), 2) AS avg_customer_review
FROM fact_sales f
JOIN dim_location l ON f.location_key = l.location_key
WHERE f.order_status = 'delivered' AND f.order_delivered_customer_date IS NOT NULL
GROUP BY l.geolocation_state
ORDER BY total_sales_brl DESC;


-- ---------------------------------------------------------------------
-- QUERY 7: TOP MARKETPLACE SELLERS LEADERBOARD
-- Ranks merchant partners by net sales, order fulfillment count, and review quality
-- ---------------------------------------------------------------------
SELECT 
    s.seller_id,
    s.seller_city,
    s.seller_state,
    COUNT(DISTINCT f.order_id) AS fulfilled_orders,
    COUNT(f.sales_id) AS items_sold,
    ROUND(SUM(f.price), 2) AS gross_sales_brl,
    ROUND(AVG(f.price), 2) AS avg_ticket_brl,
    ROUND(AVG(f.review_score), 2) AS avg_seller_review
FROM fact_sales f
JOIN dim_seller s ON f.seller_key = s.seller_key
WHERE f.order_status = 'delivered'
GROUP BY s.seller_id, s.seller_city, s.seller_state
ORDER BY gross_sales_brl DESC
LIMIT 10;


-- ---------------------------------------------------------------------
-- QUERY 8: PAYMENT METHOD PREFERENCE & INSTALLMENTS ADOPTION
-- Breaks down revenue distribution across Credit Card, Boleto, Voucher, Debit Card
-- ---------------------------------------------------------------------
SELECT 
    COALESCE(f.payment_type, 'Not Specified') AS payment_method,
    COUNT(DISTINCT f.order_id) AS total_transactions,
    ROUND(SUM(f.payment_value), 2) AS total_transacted_value,
    ROUND(AVG(f.payment_value), 2) AS avg_transaction_value,
    ROUND(AVG(f.payment_installments), 1) AS avg_installments,
    MAX(f.payment_installments) AS max_installments,
    ROUND(SUM(f.payment_value) * 100.0 / (SELECT SUM(payment_value) FROM fact_sales), 2) AS market_share_pct
FROM fact_sales f
GROUP BY COALESCE(f.payment_type, 'Not Specified')
ORDER BY total_transacted_value DESC;


-- ---------------------------------------------------------------------
-- QUERY 9: DELIVERY ON-TIME PERFORMANCE & CARRIER ACCURACY
-- Compares actual delivery timestamps against carrier estimated delivery dates
-- ---------------------------------------------------------------------
SELECT 
    CASE 
        WHEN f.order_delivered_customer_date <= f.order_estimated_delivery_date THEN 'Delivered Early or On-Time'
        WHEN f.order_delivered_customer_date > f.order_estimated_delivery_date THEN 'Delayed Beyond Estimate'
        ELSE 'In Transit / Not Delivered'
    END AS delivery_performance_status,
    COUNT(DISTINCT f.order_id) AS orders_count,
    ROUND(COUNT(DISTINCT f.order_id) * 100.0 / (SELECT COUNT(DISTINCT order_id) FROM fact_sales WHERE order_status = 'delivered'), 2) AS percentage_of_delivered,
    ROUND(AVG(DATEDIFF(f.order_delivered_customer_date, f.order_purchase_timestamp)), 1) AS avg_actual_transit_days,
    ROUND(AVG(DATEDIFF(f.order_estimated_delivery_date, f.order_purchase_timestamp)), 1) AS avg_estimated_transit_days,
    ROUND(AVG(f.review_score), 2) AS average_review_score
FROM fact_sales f
WHERE f.order_status = 'delivered' AND f.order_delivered_customer_date IS NOT NULL
GROUP BY delivery_performance_status;


-- ---------------------------------------------------------------------
-- QUERY 10: CUSTOMER SATISFACTION (REVIEW SCORE) VS SHIPPING TRANSIT DAYS
-- Demonstrates impact of delivery duration on customer star rating (1 to 5)
-- ---------------------------------------------------------------------
SELECT 
    f.review_score,
    COUNT(f.sales_id) AS review_count,
    ROUND(AVG(DATEDIFF(f.order_delivered_customer_date, f.order_purchase_timestamp)), 1) AS avg_delivery_days,
    ROUND(AVG(f.freight_value), 2) AS avg_freight_paid,
    ROUND(AVG(f.price), 2) AS avg_order_item_price
FROM fact_sales f
WHERE f.review_score IS NOT NULL 
  AND f.order_delivered_customer_date IS NOT NULL
GROUP BY f.review_score
ORDER BY f.review_score DESC;
