-- Superkauf: Kategorien als eigene, editierbare Tabelle statt fest codierter Liste
-- Im Supabase SQL-Editor ausführen (nach 01_create_tables.sql und 02_rls_policies.sql)

CREATE TABLE IF NOT EXISTS categories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  position   INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, position) VALUES
  ('Obst & Gemüse', 1),
  ('Milchprodukte', 2),
  ('Fleisch & Fisch', 3),
  ('Brot & Backwaren', 4),
  ('Tiefkühl', 5),
  ('Getränke', 6),
  ('Drogerie', 7),
  ('Sonstiges', 8)
ON CONFLICT (name) DO NOTHING;

-- catalog_items: category_id statt freiem Text
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;
UPDATE catalog_items ci SET category_id = c.id FROM categories c WHERE c.name = ci.category AND ci.category_id IS NULL;
ALTER TABLE catalog_items DROP COLUMN IF EXISTS category;

-- list_items: category_id statt freiem Text
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;
UPDATE list_items li SET category_id = c.id FROM categories c WHERE c.name = li.category AND li.category_id IS NULL;
ALTER TABLE list_items DROP COLUMN IF EXISTS category;

-- RLS wie bei den übrigen Tabellen: jeder authentifizierte User hat vollen Zugriff
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON categories
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO authenticated;
