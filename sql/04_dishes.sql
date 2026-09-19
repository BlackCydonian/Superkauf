-- Superkauf: Speisen (Rezepte mit Zutaten)
-- Im Supabase SQL-Editor ausführen (nach 01-03)

CREATE TABLE IF NOT EXISTS dishes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  steps      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dish_ingredients (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dish_id     BIGINT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dish_ingredients_dish_id_idx ON dish_ingredients(dish_id);

-- RLS wie bei den übrigen Tabellen: jeder authentifizierte User hat vollen Zugriff
ALTER TABLE dishes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON dishes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_full_access" ON dish_ingredients
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dishes           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dish_ingredients TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE dishes_id_seq           TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dish_ingredients_id_seq TO authenticated;
