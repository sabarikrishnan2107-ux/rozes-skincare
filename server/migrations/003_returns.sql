-- Return orders. Returned goods add quantity back to product stock.
-- Kept separate from sales_entries so returns do not distort sales revenue.

CREATE TABLE IF NOT EXISTS return_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID,
  product_name    TEXT NOT NULL,
  sku             TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'website',
  reason          TEXT,
  return_date     DATE NOT NULL,
  created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_date    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_date ON return_entries(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_product ON return_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_created ON return_entries(created_date DESC);
