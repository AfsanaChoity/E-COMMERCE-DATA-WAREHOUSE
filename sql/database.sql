-- =====================================================================
-- E-COMMERCE DATA WAREHOUSE: DATABASE CONFIGURATION & ENVIRONMENT SETUP
-- Dataset: Brazilian E-Commerce Public Dataset by Olist (Kaggle)
-- Target RDBMS: MySQL 8.0+
-- File: database.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DATABASE CREATION
-- Character set utf8mb4 supports international characters and Brazilian Portuguese accents
-- Collation utf8mb4_unicode_ci provides case-insensitive accent-aware matching
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS olist_datawarehouse
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE olist_datawarehouse;

-- ---------------------------------------------------------------------
-- 2. USER CREATION & ROLE-BASED PRIVILEGES (DW ANALYST & ETL SERVICE)
-- ---------------------------------------------------------------------
-- Create dedicated read-write ETL service user for warehouse ingestion
CREATE USER IF NOT EXISTS 'olist_etl_user'@'%' IDENTIFIED BY 'OlistSecureETL2024!';
GRANT ALL PRIVILEGES ON olist_datawarehouse.* TO 'olist_etl_user'@'%';

-- Create read-only analytical user for BI dashboards and reporting
CREATE USER IF NOT EXISTS 'olist_bi_analyst'@'%' IDENTIFIED BY 'OlistBIAnalytics2024!';
GRANT SELECT, SHOW VIEW ON olist_datawarehouse.* TO 'olist_bi_analyst'@'%';

FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------
-- 3. SESSION & ENGINE OPTIMIZATION VARIABLES
-- ---------------------------------------------------------------------
-- Enforce strict SQL mode for data integrity during warehouse loading
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- Allow large analytical GROUP_CONCAT queries
SET SESSION group_concat_max_len = 1048576;

-- Enable query timing profiling if needed
SET profiling = 1;

-- ---------------------------------------------------------------------
-- 4. PIPELINE AUDIT & EXECUTION LOG TABLE
-- Tracks ETL runs, durations, record throughput, and audit status
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_execution_log (
    run_id VARCHAR(64) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    duration_ms INT UNSIGNED NULL,
    status ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    records_extracted INT UNSIGNED NOT NULL DEFAULT 0,
    records_transformed INT UNSIGNED NOT NULL DEFAULT 0,
    records_loaded INT UNSIGNED NOT NULL DEFAULT 0,
    failed_records INT UNSIGNED NOT NULL DEFAULT 0,
    pipeline_stage VARCHAR(50) NULL,
    error_summary TEXT NULL,
    PRIMARY KEY (run_id),
    INDEX idx_etl_log_start (start_time),
    INDEX idx_etl_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. VERIFICATION
-- ---------------------------------------------------------------------
SELECT 
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'olist_datawarehouse';
