# 🛒 E-Commerce Sales Data Warehouse & Analytics System (Olist)

A production-grade Kimball Star Schema Data Warehouse, automated ETL pipeline, and interactive executive analytics dashboard built on the Brazilian E-Commerce public dataset (100k+ orders).

---

## 🚀 Quickstart Guide (GitHub Clone & Local Setup)

Follow these steps to clone, configure, and run this project on any machine.

### Prerequisites
Make sure you have the following installed on your machine:
- **Git**: [git-scm.com](https://git-scm.com)
- **Node.js** (v18 LTS or later): [nodejs.org](https://nodejs.org)
- **MySQL 8.0+** (or **XAMPP / WAMP** for local MySQL server)

---

### Step 1: Clone the Repository
Open your terminal (PowerShell, Git Bash, or Terminal) and clone the repository:

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

---

### Step 2: Install Project Dependencies
Install all required Node.js packages and TypeScript dependencies:

```bash
npm install
```

---

### Step 3: Database & Schema Initialization
1. Ensure your local MySQL server is running (e.g., click **Start** for MySQL in XAMPP Control Panel).
2. Open your preferred SQL client (**MySQL Workbench**, **phpMyAdmin**, or MySQL CLI) and create the database:
   ```sql
   CREATE DATABASE olist_datawarehouse;
   ```
3. Open [`sql/schema.sql`](sql/schema.sql), copy its entire content, and run it against `olist_datawarehouse`. This creates the 6 Kimball Star Schema tables along with their foreign key constraints, checks, and performance indexes.

---

### Step 4: Environment Configuration (`.env`)
Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```
*(On Windows Command Prompt, use `copy .env.example .env`)*

Open `.env` and verify your local MySQL database connection settings:

```env
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD=""
DB_NAME="olist_datawarehouse"
PORT="3000"
```
> **Note:** If your local MySQL `root` user does not have a password, keep `DB_PASSWORD=""` empty.

---

### Step 5: Execute the Production ETL Pipeline
Run the automated ETL engine to extract, validate, clean, transform the raw CSV datasets, and load them into your MySQL Star Schema tables:

```bash
npm run etl
```
*(This parses ~1.55M raw records and loads ~264k Star Schema fact and dimension rows in a few seconds.)*

---

### Step 6: Start the Application
Start both the Express backend API and the Vite React frontend dashboard:

```bash
npm run dev
```

Open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ CLI Commands & Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the Express server and Vite development frontend at `localhost:3000` |
| `npm run etl` | Runs the full 5-stage ETL pipeline (`Extract` → `Validate` → `Clean` → `Transform` → `Load`) |
| `npm run etl:validate` | Performs data audit & schema validation on raw CSVs without writing to MySQL |
| `npm run etl:reset` | Truncates and resets warehouse Star Schema tables |
| `npm run build` | Compiles frontend assets for production |

---

## 🏗️ Architecture & Dimensional Modeling (Kimball Star Schema)

```
                            +----------------------+
                            |       dim_date       |
                            | (date_key, YYYYMMDD) |
                            +----------+-----------+
                                       |
                                       | 1:N
+----------------------+     +--------v-----------+     +----------------------+
|     dim_customer     |     |     fact_sales     |     |     dim_product      |
|    (customer_key)    +-----> (Grain: Order Item)+<----+    (product_key)     |
+----------------------+ 1:N |     sales_id (PK)  | 1:N +----------------------+
                             +--------+-----+-----+
                                      ^     ^
                                  1:N |     | 1:N
                           +----------+     +----------+
                           |                           |
                 +---------+----------+      +---------+----------+
                 |    dim_location    |      |     dim_seller     |
                 |   (location_key)   |      |    (seller_key)    |
                 +--------------------+      +--------------------+
```

### Table Breakdown
- **Central Fact Table (`fact_sales`):**
  - **Grain:** One record per individual order item (`order_id` + `order_item_id`).
  - **Measures:** `price`, `freight_value`, `total_item_value` (generated), `payment_value`, `payment_installments`, `review_score`.
  - **Degenerate Dimensions:** `order_id`, `order_status`, `order_purchase_timestamp`.
- **Conformed Dimension Tables:**
  - `dim_date`: Calendar attributes (`date_key`, `full_date`, `quarter`, `month_num`, `day_of_week`, `week_of_year`, `is_weekend`).
  - `dim_customer`: Customer geography and unique buyer identity tokens.
  - `dim_product`: SKU details, dimensions, weight, and translated English categories.
  - `dim_seller`: Registered marketplace sellers and geographical distribution.
  - `dim_location`: Brazilian postal hubs mapped to GPS coordinates (`latitude`, `longitude`).

---

## 📊 Tech Stack

- **Data Source:** Olist Brazilian E-Commerce public dataset (~100k real customer orders, Kaggle).
- **Data Warehouse:** MySQL 8.0 (InnoDB engine, strict constraints, B-Tree indexes).
- **ETL Engine:** TypeScript, Node.js (`tsx`), `mysql2`.
- **Backend API:** Express.js REST API with in-memory caching layer.
- **Frontend / Dashboard:** React 19, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **BI & Reporting:** Ready-to-use MySQL views ([`sql/power_bi_views.sql`](sql/power_bi_views.sql)) and DAX measures ([`sql/power_bi_dax_measures.dax`](sql/power_bi_dax_measures.dax)).
