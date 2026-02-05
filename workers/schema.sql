CREATE TABLE IF NOT EXISTS players (
  tg_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL,
  last_login TEXT NOT NULL,
  last_tick TEXT NOT NULL,
  state_json TEXT NOT NULL,
  daily_claim_date TEXT,
  daily_streak INTEGER NOT NULL DEFAULT 0
);
