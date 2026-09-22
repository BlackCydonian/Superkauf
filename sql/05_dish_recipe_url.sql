-- Superkauf: Rezept-Link für Speisen
-- Im Supabase SQL-Editor ausführen (nach 01-04)

ALTER TABLE dishes ADD COLUMN IF NOT EXISTS recipe_url TEXT;
