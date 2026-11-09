-- =====================================================================
-- E-COMMERCE DATA WAREHOUSE: SEED & TEST DATA
-- Dataset: Brazilian E-Commerce Public Dataset by Olist (Kaggle)
-- Target RDBMS: MySQL 8.0+
-- File: seed.sql
-- =====================================================================

USE olist_datawarehouse;

-- Disable checks for clean data refresh
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE fact_sales;
TRUNCATE TABLE dim_customer;
TRUNCATE TABLE dim_product;
TRUNCATE TABLE dim_date;
TRUNCATE TABLE dim_location;
TRUNCATE TABLE dim_seller;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. SEED DIMENSION: dim_date
-- Date range representative of Olist active transaction timeline
-- ---------------------------------------------------------------------
INSERT INTO dim_date (
    date_key, full_date, year, quarter, month_num, month_name, 
    day_of_month, day_of_week, day_name, week_of_year, is_weekend
) VALUES
(20170413, '2017-04-13', 2017, 2, 4, 'April', 13, 4, 'Thursday', 15, FALSE),
(20170516, '2017-05-16', 2017, 2, 5, 'May', 16, 2, 'Tuesday', 20, FALSE),
(20170709, '2017-07-09', 2017, 3, 7, 'July', 9, 7, 'Sunday', 27, TRUE),
(20171002, '2017-10-02', 2017, 4, 10, 'October', 2, 1, 'Monday', 40, FALSE),
(20171118, '2017-11-18', 2017, 4, 11, 'November', 18, 6, 'Saturday', 46, TRUE),
(20180213, '2018-01-13', 2018, 1, 2, 'February', 13, 2, 'Tuesday', 7, FALSE),
(20180323, '2018-03-23', 2018, 1, 3, 'March', 23, 5, 'Friday', 12, FALSE),
(20180510, '2018-05-10', 2018, 2, 5, 'May', 10, 4, 'Thursday', 19, FALSE),
(20180615, '2018-06-15', 2018, 2, 6, 'June', 15, 5, 'Friday', 24, FALSE),
(20180622, '2018-06-22', 2018, 2, 6, 'June', 22, 5, 'Friday', 25, FALSE),
(20180705, '2018-07-05', 2018, 3, 7, 'July', 5, 4, 'Thursday', 27, FALSE),
(20180724, '2018-07-24', 2018, 3, 7, 'July', 24, 2, 'Tuesday', 30, FALSE),
(20180801, '2018-08-01', 2018, 3, 8, 'August', 1, 3, 'Wednesday', 31, FALSE),
(20180808, '2018-08-08', 2018, 3, 8, 'August', 8, 3, 'Wednesday', 32, FALSE),
(20180815, '2018-08-15', 2018, 3, 8, 'August', 15, 3, 'Wednesday', 33, FALSE);

-- ---------------------------------------------------------------------
-- 2. SEED DIMENSION: dim_location
-- Representative Brazilian postal hubs and state centroids from olist_geolocation
-- ---------------------------------------------------------------------
INSERT INTO dim_location (
    location_key, geolocation_zip_code_prefix, geolocation_city, 
    geolocation_state, geolocation_lat, geolocation_lng
) VALUES
(1, '01001', 'sao paulo', 'SP', -23.5498000, -46.6340000),
(2, '04538', 'sao paulo', 'SP', -23.5832000, -46.6789000),
(3, '14409', 'franca', 'SP', -20.5356000, -47.4009000),
(4, '09790', 'sao bernardo do campo', 'SP', -23.7028000, -46.5489000),
(5, '13400', 'piracicaba', 'SP', -22.7253000, -47.6492000),
(6, '13056', 'campinas', 'SP', -22.9056000, -47.0608000),
(7, '20010', 'rio de janeiro', 'RJ', -22.9068000, -43.1729000),
(8, '28930', 'arraial do cabo', 'RJ', -22.9661000, -42.0278000),
(9, '30110', 'belo horizonte', 'MG', -19.9245000, -43.9352000),
(10, '31070', 'belo horizonte', 'MG', -19.8920000, -43.9180000),
(11, '80010', 'curitiba', 'PR', -25.4284000, -49.2733000),
(12, '90010', 'porto alegre', 'RS', -30.0346000, -51.2177000),
(13, '40010', 'salvador', 'BA', -12.9714000, -38.5014000),
(14, '50010', 'recife', 'PE', -8.0476000, -34.8770000),
(15, '70040', 'brasilia', 'DF', -15.7975000, -47.8919000),
(16, '88010', 'florianopolis', 'SC', -27.5954000, -48.5480000),
(17, '89254', 'jaragua do sul', 'SC', -26.4851000, -49.0734000);

-- ---------------------------------------------------------------------
-- 3. SEED DIMENSION: dim_customer
-- Direct mapping from olist_customers_dataset.csv
-- ---------------------------------------------------------------------
INSERT INTO dim_customer (
    customer_key, customer_id, customer_unique_id, 
    customer_zip_code_prefix, customer_city, customer_state
) VALUES
(1, '9ef432eb6251297304e76186b10a928d', '7c142cf63193a1473d0e664843867180', '01001', 'sao paulo', 'SP'),
(2, 'b0830fb4747a6c6d20dea0b8c802d7ef', 'af07308b275d755c9edb36a90c618231', '04538', 'sao paulo', 'SP'),
(3, '41ce2a54c0b03bf3443c3d931a367089', '3a653a41f6f9fc3d2a113cf8398680e8', '20010', 'rio de janeiro', 'RJ'),
(4, 'f88197465ea7920adcdbec7375364d82', '7c142cf63193a1473d0e664843867180', '01001', 'sao paulo', 'SP'),
(5, '8ab97904e6daea8866dbdbc4fb7aad2c', '724497136e24ab3e0f8fce230d087788', '30110', 'belo horizonte', 'MG'),
(6, '503740e9ca751ccdda7ba28e9ab8f608', 'dd8c01f80f64761081ef6b429a557f7d', '80010', 'curitiba', 'PR'),
(7, 'ed0271e0b7da060a393796590e7b737a', 'b85662303daad3108c163a35067b39b7', '90010', 'porto alegre', 'RS'),
(8, '9bcdf6fb0b625875614234444018785b', 'e446549a174950cf2a4a34b281f621a6', '40010', 'salvador', 'BA'),
(9, '06b8999e2fba1a1fbc88172c000cfafc', '861eff4711a542e4b93843c6dd7febb0', '14409', 'franca', 'SP'),
(10, '18955e83d337fd6b2def6b18a428ac77', '290c77bc529b7ac935b93aa66c333d04', '09790', 'sao bernardo do campo', 'SP'),
(11, '4e7b3e00288586ebd08712fdd0374a03', '060e732b5b29e8181a18229c7b0b2b5e', '01001', 'sao paulo', 'SP'),
(12, 'b2b0c3495d5c142831e04cb77f2cc5a6', '259f7b5e6e4825740e50270c360932b8', '13400', 'piracicaba', 'SP'),
(13, '4f2d8ab171c80dd8318450c0bd738325', '34513ce0c42474b535070eaa0b0f7672', '13056', 'campinas', 'SP'),
(14, '879864bdb9d961dd594c53725be1023a', '4c93744516667ad3b8f1fb645a3114a4', '89254', 'jaragua do sul', 'SC');

-- ---------------------------------------------------------------------
-- 4. SEED DIMENSION: dim_product
-- Direct mapping from olist_products_dataset + translation
-- ---------------------------------------------------------------------
INSERT INTO dim_product (
    product_key, product_id, product_category_name, product_category_name_english,
    product_name_length, product_description_length, product_photos_qty,
    product_weight_g, product_length_cm, product_height_cm, product_width_cm
) VALUES
(1, '87285b34884572807f717429e8b11401', 'telefonia', 'telephony', 48, 620, 1, 280, 17, 8, 12),
(2, '53b36df67ebb7c41585e8d54d6772e08', 'relogios_presentes', 'watches_gifts', 52, 550, 2, 320, 18, 12, 14),
(3, '428efac0adeb054b71526f84a0d9f538', 'cama_mesa_banho', 'bed_bath_table', 59, 492, 3, 675, 22, 12, 18),
(4, 'b43f03037968f11795eb46b749352814', 'beleza_saude', 'health_beauty', 58, 1002, 4, 450, 19, 14, 14),
(5, '38d3195dd0073d1c3143abb747bd6590', 'informatica_acessorios', 'computers_accessories', 55, 750, 2, 800, 25, 15, 20),
(6, '06c6e0118629f991c6f3c5000f400076', 'brinquedos', 'toys', 57, 430, 2, 550, 22, 15, 18),
(7, 'e0d6425236b920840399d553915076ac', 'automotivo', 'auto', 51, 890, 3, 1500, 35, 20, 25),
(8, '09ff539a621711667c43257429864be7', 'utilidades_domesticas', 'housewares', 60, 402, 2, 625, 20, 17, 13),
(9, '1e9e8ef04dbcff4541ed26657ea517e5', 'perfumaria', 'perfumery', 40, 287, 1, 225, 16, 10, 14),
(10, '11250b0d9b704ec477d8e1d3eec7165d', 'moveis_decoracao', 'furniture_decor', 54, 720, 2, 3200, 45, 30, 30),
(11, '7c1bd920ce5ecd036532dd8badc5c545', 'ferramentas_jardim', 'garden_tools', 53, 610, 1, 1200, 28, 18, 22),
(12, 'a62e25e03e05e7909135f29bd2176394', 'cool_stuff', 'cool_stuff', 49, 380, 1, 410, 16, 10, 15);

-- ---------------------------------------------------------------------
-- 5. SEED DIMENSION: dim_seller
-- Direct mapping from olist_sellers_dataset.csv
-- ---------------------------------------------------------------------
INSERT INTO dim_seller (
    seller_key, seller_id, seller_zip_code_prefix, seller_city, seller_state
) VALUES
(1, '3442f8959a64dea5ee7249c5b04dd623', '27277', 'volta redonda', 'RJ'),
(2, 'd1b65fc7debc3361ea86b5f14cba8697', '06110', 'osasco', 'SP'),
(3, 'ce3ad9caf5b4745b2f306c4249024d06', '30260', 'belo horizonte', 'MG'),
(4, '1025f0e2d44d7041d6cf3018040d8342', '13023', 'campinas', 'SP'),
(5, '1f50f920176fa81dd9980b0474526dca', '80010', 'curitiba', 'PR'),
(6, '4a3ca9315b744ce9f8e9374361493884', '14940', 'ibitinga', 'SP'),
(7, 'da8622b14eb17ae2831f4ac5b9dab84a', '01001', 'sao paulo', 'SP'),
(8, '2a348ef3a0f1d5f7b49468f28e001021', '20010', 'rio de janeiro', 'RJ'),
(9, 'fa1c3138a4c7e0c56e2656c12e00e2e5', '90010', 'porto alegre', 'RS'),
(10, '7040e82f899a04d1b434b72445b2523f', '40010', 'salvador', 'BA');

-- ---------------------------------------------------------------------
-- 6. SEED FACT TABLE: fact_sales
-- Linking conformed surrogate keys with original Olist items, payments, reviews
-- ---------------------------------------------------------------------
INSERT INTO fact_sales (
    sales_id, order_id, order_item_id, order_status,
    customer_key, product_key, date_key, location_key, seller_key,
    price, freight_value, payment_value, payment_installments, payment_type, review_score,
    order_purchase_timestamp, order_delivered_customer_date, order_estimated_delivery_date, shipping_limit_date
) VALUES
(1, 'e481f51cbdc54678b7cc49136f2d6af7', 1, 'delivered', 1, 1, 20171002, 1, 1, 29.99, 8.72, 38.71, 1, 'credit_card', 4, '2017-10-02 10:56:33', '2017-10-10 21:25:13', '2017-10-18 00:00:00', '2017-10-06 11:07:15'),
(2, '53cdb2fc8bc7dce0b6741e2150273451', 1, 'delivered', 2, 2, 20180724, 2, 2, 118.70, 22.76, 141.46, 1, 'boleto', 5, '2018-07-24 20:41:37', '2018-08-07 15:27:45', '2018-08-13 00:00:00', '2018-07-30 03:24:27'),
(3, '47770eb9100c2d0c44946d9cf07ec65d', 1, 'delivered', 3, 3, 20180808, 7, 3, 159.90, 19.22, 179.12, 3, 'credit_card', 5, '2018-08-08 08:38:49', '2018-08-17 18:06:29', '2018-09-04 00:00:00', '2018-08-13 08:55:23'),
(4, '949d5b44dbf5de918fe9c16f97b45f8a', 1, 'delivered', 4, 4, 20171118, 1, 4, 45.00, 27.20, 72.20, 1, 'credit_card', 5, '2017-11-18 19:28:06', '2017-12-02 00:28:42', '2017-12-15 00:00:00', '2017-11-23 19:45:59'),
(5, 'ad0353ab4b007d043297f222657947b8', 1, 'delivered', 5, 5, 20180213, 9, 5, 19.90, 8.72, 28.62, 1, 'credit_card', 4, '2018-02-13 21:18:39', '2018-02-16 18:17:02', '2018-02-26 00:00:00', '2018-02-19 20:31:37'),
(6, 'a4591c265e18cb1dcee528d65ca31ab3', 1, 'delivered', 6, 6, 20170709, 11, 6, 147.90, 27.36, 175.26, 6, 'credit_card', 5, '2017-07-09 21:57:05', '2017-07-26 10:57:55', '2017-08-01 00:00:00', '2017-07-13 22:10:13'),
(7, '136cce7faa429382030f9d8d661660e6', 1, 'delivered', 7, 7, 20170413, 12, 7, 69.00, 17.22, 86.22, 1, 'credit_card', 3, '2017-04-13 16:35:17', '2017-05-09 18:04:26', '2017-05-09 00:00:00', '2017-04-19 17:05:19'),
(8, '6514b8ad8028c9f2cc2374ded245783f', 1, 'delivered', 8, 8, 20170516, 13, 8, 59.99, 15.17, 75.16, 1, 'credit_card', 5, '2017-05-16 13:10:30', '2017-05-26 12:55:51', '2017-06-07 00:00:00', '2017-05-22 13:22:11'),
(9, '763751e47994ab44102911d2d4329914', 1, 'delivered', 1, 4, 20180323, 1, 9, 89.90, 16.05, 105.95, 2, 'credit_card', 4, '2018-03-23 12:12:12', '2018-03-30 19:10:00', '2018-04-15 00:00:00', '2018-03-29 12:30:15'),
(10, '872b1239109471203948120394810239', 1, 'delivered', 9, 9, 20180510, 3, 10, 109.90, 14.50, 124.40, 4, 'credit_card', 5, '2018-05-10 14:20:00', '2018-05-18 16:40:00', '2018-05-30 00:00:00', '2018-05-16 14:35:00'),
(11, '23094812039481029384019283401928', 1, 'shipped', 10, 10, 20180615, 4, 6, 249.00, 35.20, 284.20, 8, 'credit_card', 4, '2018-06-15 09:12:00', NULL, '2018-07-02 00:00:00', '2018-06-21 09:30:00'),
(12, '98120394810293840192834019283401', 1, 'delivered', 11, 5, 20180622, 1, 5, 399.00, 28.40, 427.40, 10, 'credit_card', 5, '2018-06-22 17:40:00', '2018-07-01 14:20:00', '2018-07-15 00:00:00', '2018-06-28 18:00:00'),
(13, '19283401928340192834019283401928', 1, 'delivered', 12, 2, 20180705, 5, 2, 189.90, 21.50, 211.40, 1, 'boleto', 5, '2018-07-05 11:05:00', '2018-07-12 16:30:00', '2018-07-28 00:00:00', '2018-07-11 11:25:00'),
(14, '50192834019283401928340192834019', 1, 'delivered', 13, 11, 20180801, 6, 7, 85.50, 18.00, 103.50, 3, 'credit_card', 4, '2018-08-01 16:20:00', '2018-08-09 13:40:00', '2018-08-25 00:00:00', '2018-08-07 16:45:00'),
(15, '6019283401928340192834020', 1, 'invoiced', 14, 12, 20180815, 17, 3, 129.00, 16.80, 145.80, 1, 'debit_card', 5, '2018-08-15 13:10:00', NULL, '2018-09-01 00:00:00', '2018-08-21 13:35:00');

-- ---------------------------------------------------------------------
-- 7. POST-LOAD VERIFICATION & INTEGRITY CHECKS
-- ---------------------------------------------------------------------
SELECT 'dim_date' AS table_name, COUNT(*) AS row_count FROM dim_date
UNION ALL
SELECT 'dim_location', COUNT(*) FROM dim_location
UNION ALL
SELECT 'dim_customer', COUNT(*) FROM dim_customer
UNION ALL
SELECT 'dim_product', COUNT(*) FROM dim_product
UNION ALL
SELECT 'dim_seller', COUNT(*) FROM dim_seller
UNION ALL
SELECT 'fact_sales', COUNT(*) FROM fact_sales;

-- Check for any orphaned foreign keys in fact_sales
SELECT 
    COUNT(*) AS orphaned_records
FROM fact_sales f
LEFT JOIN dim_customer c ON f.customer_key = c.customer_key
LEFT JOIN dim_product p ON f.product_key = p.product_key
LEFT JOIN dim_date d ON f.date_key = d.date_key
LEFT JOIN dim_location l ON f.location_key = l.location_key
LEFT JOIN dim_seller s ON f.seller_key = s.seller_key
WHERE c.customer_key IS NULL 
   OR p.product_key IS NULL 
   OR d.date_key IS NULL 
   OR l.location_key IS NULL 
   OR s.seller_key IS NULL;
