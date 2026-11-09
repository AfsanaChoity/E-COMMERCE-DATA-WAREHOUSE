-- =====================================================================
-- E-COMMERCE DATA WAREHOUSE: STAR SCHEMA DDL
-- Dataset: Brazilian E-Commerce Public Dataset by Olist (Kaggle)
-- Target RDBMS: MySQL 8.0+
-- File: schema.sql
-- =====================================================================

USE olist_datawarehouse;

-- Disable foreign key constraints during table recreation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_date;
DROP TABLE IF EXISTS dim_location;
DROP TABLE IF EXISTS dim_seller;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. DIMENSION TABLE: dim_date
-- Grain: One row per calendar day
-- Surrogate Key: date_key (Integer in format YYYYMMDD, e.g., 20171002)
-- Source: Decomposed from Olist order_purchase_timestamp
-- =====================================================================
CREATE TABLE dim_date (
    date_key INT NOT NULL,                          -- Surrogate Key: YYYYMMDD
    full_date DATE NOT NULL,                        -- Calendar date (e.g., '2017-10-02')
    year SMALLINT UNSIGNED NOT NULL,               -- Calendar Year (e.g., 2017)
    quarter TINYINT UNSIGNED NOT NULL,              -- Quarter (1 to 4)
    month_num TINYINT UNSIGNED NOT NULL,            -- Month of year (1 to 12)
    month_name VARCHAR(15) NOT NULL,                -- Full month name ('January' - 'December')
    day_of_month TINYINT UNSIGNED NOT NULL,         -- Day of month (1 to 31)
    day_of_week TINYINT UNSIGNED NOT NULL,          -- Day of week (1 = Monday, 7 = Sunday)
    day_name VARCHAR(15) NOT NULL,                  -- Full day name ('Monday' - 'Sunday')
    week_of_year TINYINT UNSIGNED NOT NULL,         -- Week of year (1 to 53)
    is_weekend BOOLEAN NOT NULL DEFAULT FALSE,      -- True if Saturday or Sunday
    
    PRIMARY KEY (date_key),
    UNIQUE INDEX idx_dim_date_full_date (full_date),
    INDEX idx_dim_date_year_month (year, month_num),
    INDEX idx_dim_date_quarter (year, quarter),
    INDEX idx_dim_date_dow (day_of_week),
    
    CONSTRAINT chk_dim_date_quarter CHECK (quarter BETWEEN 1 AND 4),
    CONSTRAINT chk_dim_date_month CHECK (month_num BETWEEN 1 AND 12),
    CONSTRAINT chk_dim_date_dom CHECK (day_of_month BETWEEN 1 AND 31),
    CONSTRAINT chk_dim_date_dow CHECK (day_of_week BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 2. DIMENSION TABLE: dim_customer
-- Grain: One row per customer order-token (with unique buyer grouping)
-- Surrogate Key: customer_key (Auto-Increment Integer)
-- Source File: olist_customers_dataset.csv
-- =====================================================================
CREATE TABLE dim_customer (
    customer_key INT AUTO_INCREMENT NOT NULL,       -- Surrogate Key
    customer_id VARCHAR(64) NOT NULL,               -- Natural Key (order-level customer token)
    customer_unique_id VARCHAR(64) NOT NULL,        -- Natural Key (unique human buyer identity)
    customer_zip_code_prefix VARCHAR(10) NOT NULL,  -- Customer 5-digit zip code prefix
    customer_city VARCHAR(100) NOT NULL,            -- City name (e.g., 'sao paulo')
    customer_state CHAR(2) NOT NULL,                -- 2-letter Brazilian state code (e.g., 'SP')
    
    PRIMARY KEY (customer_key),
    UNIQUE INDEX idx_dim_cust_id (customer_id),
    INDEX idx_dim_cust_unique_id (customer_unique_id),
    INDEX idx_dim_cust_zip (customer_zip_code_prefix),
    INDEX idx_dim_cust_state_city (customer_state, customer_city),
    
    CONSTRAINT chk_dim_cust_state CHECK (CHAR_LENGTH(customer_state) = 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 3. DIMENSION TABLE: dim_product
-- Grain: One row per product SKU
-- Surrogate Key: product_key (Auto-Increment Integer)
-- Source Files: olist_products_dataset.csv, product_category_name_translation.csv
-- =====================================================================
CREATE TABLE dim_product (
    product_key INT AUTO_INCREMENT NOT NULL,        -- Surrogate Key
    product_id VARCHAR(64) NOT NULL,                -- Natural Key (32-char MD5 SKU hash)
    product_category_name VARCHAR(100) NULL,        -- Original Portuguese category name
    product_category_name_english VARCHAR(100) NULL,-- English translated category name
    product_name_length INT UNSIGNED NULL,          -- Character count of product title
    product_description_length INT UNSIGNED NULL,   -- Character count of description
    product_photos_qty TINYINT UNSIGNED NULL,       -- Number of published photos
    product_weight_g INT UNSIGNED NULL,             -- Product weight in grams
    product_length_cm INT UNSIGNED NULL,            -- Package length in centimeters
    product_height_cm INT UNSIGNED NULL,            -- Package height in centimeters
    product_width_cm INT UNSIGNED NULL,             -- Package width in centimeters
    
    PRIMARY KEY (product_key),
    UNIQUE INDEX idx_dim_prod_id (product_id),
    INDEX idx_dim_prod_cat_en (product_category_name_english),
    INDEX idx_dim_prod_cat_pt (product_category_name),
    INDEX idx_dim_prod_weight (product_weight_g),
    
    CONSTRAINT chk_dim_prod_weight CHECK (product_weight_g IS NULL OR product_weight_g >= 0),
    CONSTRAINT chk_dim_prod_photos CHECK (product_photos_qty IS NULL OR product_photos_qty >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 4. DIMENSION TABLE: dim_location
-- Grain: One row per postal geographic hub
-- Surrogate Key: location_key (Auto-Increment Integer)
-- Source File: olist_geolocation_dataset.csv
-- =====================================================================
CREATE TABLE dim_location (
    location_key INT AUTO_INCREMENT NOT NULL,       -- Surrogate Key
    geolocation_zip_code_prefix VARCHAR(10) NOT NULL, -- 5-digit zip code prefix
    geolocation_city VARCHAR(100) NOT NULL,         -- City name
    geolocation_state CHAR(2) NOT NULL,             -- 2-letter state code (e.g., 'SP', 'RJ')
    geolocation_lat DECIMAL(10, 7) NULL,            -- Mean GPS Latitude coordinate
    geolocation_lng DECIMAL(10, 7) NULL,            -- Mean GPS Longitude coordinate
    
    PRIMARY KEY (location_key),
    INDEX idx_dim_loc_zip (geolocation_zip_code_prefix),
    INDEX idx_dim_loc_state (geolocation_state),
    INDEX idx_dim_loc_state_city (geolocation_state, geolocation_city),
    INDEX idx_dim_loc_coords (geolocation_lat, geolocation_lng),
    
    CONSTRAINT chk_dim_loc_state CHECK (CHAR_LENGTH(geolocation_state) = 2),
    CONSTRAINT chk_dim_loc_lat CHECK (geolocation_lat IS NULL OR geolocation_lat BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_dim_loc_lng CHECK (geolocation_lng IS NULL OR geolocation_lng BETWEEN -180.0 AND 180.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 5. DIMENSION TABLE: dim_seller
-- Grain: One row per registered marketplace merchant
-- Surrogate Key: seller_key (Auto-Increment Integer)
-- Source File: olist_sellers_dataset.csv
-- =====================================================================
CREATE TABLE dim_seller (
    seller_key INT AUTO_INCREMENT NOT NULL,         -- Surrogate Key
    seller_id VARCHAR(64) NOT NULL,                 -- Natural Key (32-char MD5 merchant hash)
    seller_zip_code_prefix VARCHAR(10) NOT NULL,    -- Merchant zip code prefix
    seller_city VARCHAR(100) NOT NULL,              -- Merchant registration city
    seller_state CHAR(2) NOT NULL,                  -- Merchant registration state
    
    PRIMARY KEY (seller_key),
    UNIQUE INDEX idx_dim_seller_id (seller_id),
    INDEX idx_dim_seller_zip (seller_zip_code_prefix),
    INDEX idx_dim_seller_state (seller_state),
    INDEX idx_dim_seller_city (seller_city),
    
    CONSTRAINT chk_dim_seller_state CHECK (CHAR_LENGTH(seller_state) = 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 6. FACT TABLE: fact_sales
-- Grain: One row per order line item (order_id + order_item_id)
-- Surrogate Key: sales_id (BigInt Auto-Increment)
-- Source Files:
--   - olist_orders_dataset.csv (order headers, status, timestamps)
--   - olist_order_items_dataset.csv (order items, unit price, freight value)
--   - olist_order_payments_dataset.csv (payment installments, payment value, payment type)
--   - olist_order_reviews_dataset.csv (customer review score)
-- =====================================================================
CREATE TABLE fact_sales (
    sales_id BIGINT AUTO_INCREMENT NOT NULL,        -- Primary / Surrogate Key
    
    -- Degenerate Dimensions (Business transaction identifiers)
    order_id VARCHAR(64) NOT NULL,                  -- Natural Key from olist_orders_dataset
    order_item_id TINYINT UNSIGNED NOT NULL DEFAULT 1, -- Sequence number of item in order
    order_status VARCHAR(20) NOT NULL DEFAULT 'delivered', -- 'delivered', 'shipped', 'canceled', etc.
    
    -- Dimension Foreign Keys (linking to conformed dimensions)
    customer_key INT NOT NULL,                      -- FK to dim_customer(customer_key)
    product_key INT NOT NULL,                       -- FK to dim_product(product_key)
    date_key INT NOT NULL,                          -- FK to dim_date(date_key) [purchase date]
    location_key INT NOT NULL,                      -- FK to dim_location(location_key) [customer location]
    seller_key INT NOT NULL,                        -- FK to dim_seller(seller_key)
    
    -- Additive & Semi-Additive Quantitative Measures (from Olist dataset)
    price DECIMAL(10, 2) NOT NULL,                  -- Item sale price (from olist_order_items_dataset)
    freight_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Freight shipping fee (from olist_order_items_dataset)
    total_item_value DECIMAL(10, 2) GENERATED ALWAYS AS (price + freight_value) STORED, -- Computed total
    payment_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Allocated payment amount (from olist_order_payments_dataset)
    payment_installments TINYINT UNSIGNED NOT NULL DEFAULT 1, -- Number of installments chosen
    payment_type VARCHAR(20) NULL,                  -- 'credit_card', 'boleto', 'voucher', 'debit_card'
    review_score TINYINT UNSIGNED NULL,             -- Satisfaction rating: 1 to 5 (from olist_order_reviews_dataset)
    
    -- Timestamps from Olist orders dataset
    order_purchase_timestamp DATETIME NOT NULL,     -- Timestamp order was placed
    order_delivered_customer_date DATETIME NULL,    -- Actual delivery timestamp
    order_estimated_delivery_date DATETIME NULL,    -- Carrier estimated delivery timestamp
    shipping_limit_date DATETIME NULL,              -- Seller shipping fulfillment deadline
    
    PRIMARY KEY (sales_id),
    
    -- Business Uniqueness Constraint (Grain enforcement: one record per item in an order)
    CONSTRAINT uq_fact_sales_order_item UNIQUE (order_id, order_item_id),
    
    -- Foreign Key Constraints with Referential Action
    CONSTRAINT fk_fact_sales_customer FOREIGN KEY (customer_key) 
        REFERENCES dim_customer (customer_key) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_fact_sales_product FOREIGN KEY (product_key) 
        REFERENCES dim_product (product_key) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_fact_sales_date FOREIGN KEY (date_key) 
        REFERENCES dim_date (date_key) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_fact_sales_location FOREIGN KEY (location_key) 
        REFERENCES dim_location (location_key) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_fact_sales_seller FOREIGN KEY (seller_key) 
        REFERENCES dim_seller (seller_key) ON DELETE RESTRICT ON UPDATE CASCADE,
        
    -- Business Domain & Numeric Sanity Constraints
    CONSTRAINT chk_fact_price CHECK (price >= 0),
    CONSTRAINT chk_fact_freight CHECK (freight_value >= 0),
    CONSTRAINT chk_fact_review CHECK (review_score IS NULL OR (review_score BETWEEN 1 AND 5)),
    CONSTRAINT chk_fact_installments CHECK (payment_installments >= 1),
    
    -- High-Performance OLAP B-Tree Indexes
    INDEX idx_fact_sales_date (date_key),
    INDEX idx_fact_sales_customer (customer_key),
    INDEX idx_fact_sales_product (product_key),
    INDEX idx_fact_sales_location (location_key),
    INDEX idx_fact_sales_seller (seller_key),
    INDEX idx_fact_sales_order_id (order_id),
    INDEX idx_fact_sales_status (order_status),
    
    -- Composite Covering Indexes for Frequent Aggregation Queries
    INDEX idx_fact_sales_date_price (date_key, price),
    INDEX idx_fact_sales_cust_date (customer_key, date_key),
    INDEX idx_fact_sales_prod_price (product_key, price),
    INDEX idx_fact_sales_seller_date (seller_key, date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- 7. CONVENIENCE ANALYTICAL OLAP VIEWS
-- Pre-aggregated views for dashboard consumption
-- =====================================================================
CREATE OR REPLACE VIEW vw_monthly_revenue_summary AS
SELECT 
    d.year,
    d.month_num,
    d.month_name,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS total_items_sold,
    ROUND(SUM(f.price), 2) AS total_item_revenue,
    ROUND(SUM(f.freight_value), 2) AS total_freight_revenue,
    ROUND(SUM(f.total_item_value), 2) AS total_gross_revenue,
    ROUND(AVG(f.price), 2) AS avg_item_price,
    ROUND(SUM(f.price) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS avg_order_value,
    ROUND(AVG(f.review_score), 2) AS avg_review_score
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.year, d.month_num, d.month_name
ORDER BY d.year, d.month_num;

CREATE OR REPLACE VIEW vw_product_category_performance AS
SELECT 
    COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized') AS category_name,
    COUNT(DISTINCT f.order_id) AS total_orders,
    COUNT(f.sales_id) AS total_units_sold,
    ROUND(SUM(f.price), 2) AS total_revenue,
    ROUND(AVG(f.price), 2) AS avg_price,
    ROUND(AVG(f.review_score), 2) AS avg_review_score
FROM fact_sales f
JOIN dim_product p ON f.product_key = p.product_key
GROUP BY COALESCE(p.product_category_name_english, p.product_category_name, 'Uncategorized')
ORDER BY total_revenue DESC;

CREATE OR REPLACE VIEW vw_state_logistics_performance AS
SELECT 
    l.geolocation_state AS state,
    COUNT(DISTINCT f.order_id) AS total_orders,
    ROUND(SUM(f.price), 2) AS total_sales,
    ROUND(AVG(f.freight_value), 2) AS avg_freight,
    ROUND(AVG(DATEDIFF(f.order_delivered_customer_date, f.order_purchase_timestamp)), 1) AS avg_delivery_days,
    ROUND(AVG(f.review_score), 2) AS avg_rating
FROM fact_sales f
JOIN dim_location l ON f.location_key = l.location_key
WHERE f.order_delivered_customer_date IS NOT NULL
GROUP BY l.geolocation_state
ORDER BY total_sales DESC;
