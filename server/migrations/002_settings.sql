-- App-wide key/value settings (e.g. the email that receives stock alerts).

CREATE TABLE IF NOT EXISTS app_settings (
  key           TEXT PRIMARY KEY,
  value         TEXT,
  updated_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default alert recipient (empty = fall back to the logged-in user's email).
INSERT INTO app_settings (key, value)
VALUES ('alert_email', '')
ON CONFLICT (key) DO NOTHING;
