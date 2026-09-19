-- Superkauf: Row Level Security
-- Gleiches Muster wie bei Lego-Set-Verwaltung: jeder authentifizierte User hat vollen Zugriff.
-- Im Supabase SQL-Editor ausführen (nach 01_create_tables.sql)

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON catalog_items
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_full_access" ON lists
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_full_access" ON list_items
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items    TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE catalog_items_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE lists_id_seq         TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE list_items_id_seq    TO authenticated;

-- Direkt eine erste aktive Liste anlegen, damit die App sofort etwas findet
INSERT INTO lists (name, is_active) VALUES ('Einkaufsliste', TRUE);
