-- Rozes Skincare initial schema
-- PostgreSQL 13+ (uses gen_random_uuid() built-in)

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'Admin',
  created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  sku                   TEXT UNIQUE NOT NULL,
  category              TEXT NOT NULL,
  price                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_quantity        INTEGER NOT NULL DEFAULT 0,
  initial_stock         INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold   INTEGER NOT NULL DEFAULT 10,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

CREATE TABLE IF NOT EXISTS sales_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID,
  product_name    TEXT NOT NULL,
  sku             TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price      NUMERIC(12, 2) NOT NULL,
  total_amount    NUMERIC(14, 2) NOT NULL,
  sale_date       DATE NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual',
  created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_entries(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales_entries(created_date DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  severity        TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  product_id      UUID,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read);
