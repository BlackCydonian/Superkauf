-- Superkauf: Tabellen anlegen
-- Im Supabase SQL-Editor ausführen

CREATE TABLE IF NOT EXISTS catalog_items (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT,
  default_quantity TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lists (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT DEFAULT 'Einkaufsliste',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  list_id         BIGINT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  catalog_item_id BIGINT REFERENCES catalog_items(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  category        TEXT,
  quantity        TEXT,
  checked         BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by      UUID,
  checked_at      TIMESTAMPTZ,
  position        INT DEFAULT 0,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Nur eine aktive Liste zur gleichen Zeit
CREATE UNIQUE INDEX IF NOT EXISTS one_active_list
  ON lists (is_active) WHERE (is_active = TRUE);

CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON list_items(list_id);
CREATE INDEX IF NOT EXISTS list_items_catalog_item_id_idx ON list_items(catalog_item_id);
