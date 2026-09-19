# Setup

Diese Schritte lassen sich nicht automatisieren, da sie Zugriff auf externe Dashboards brauchen (Supabase, Google Cloud, GitHub, Cloudflare). Gleiches Muster wie beim Schwesterprojekt "brick-n" (Lego-Set-Verwaltung).

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen (z.B. "superkauf").
2. Unter **Project Settings → API** die **Project URL** und den **anon public key** kopieren.
3. In [js/api.js](js/api.js) die beiden Konstanten `SUPABASE_URL` und `SUPABASE_KEY` durch die echten Werte ersetzen.

## 2. Datenbank-Tabellen anlegen

Im Supabase SQL-Editor nacheinander ausführen:

1. [sql/01_create_tables.sql](sql/01_create_tables.sql)
2. [sql/02_rls_policies.sql](sql/02_rls_policies.sql) — legt gleichzeitig die erste aktive Einkaufsliste an

## 3. Google-Login aktivieren

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein OAuth-Client (Typ "Webanwendung") anlegen — kann dasselbe Google-Cloud-Projekt wie bei brick-n sein, oder ein neues.
2. Als **Redirect URI** die von Supabase vorgegebene Callback-URL eintragen (steht in Supabase unter **Authentication → Providers → Google**).
3. Client-ID und Client-Secret in Supabase unter **Authentication → Providers → Google** eintragen und aktivieren.
4. Da die App nur für den eigenen Haushalt gedacht ist: im OAuth-Consent-Screen die Google-Accounts der Familie als Testnutzer eintragen, damit sich nur diese einloggen können (solange die App im Status "Testing" bleibt).

## 4. Lokal testen

Da die App ohne Build-Step läuft, reicht ein einfacher lokaler Webserver, z.B.:

```bash
npx serve .
```

Dann im Handy-Browser (oder über die Desktop-Ansicht mit aktivierter Mobil-Simulation) die angezeigte lokale Adresse öffnen und den Google-Login testen.

## 5. GitHub-Repo

```bash
git remote add origin <REPO-URL>
git push -u origin main
```

## 6. Cloudflare Pages

1. In Cloudflare Pages ein neues Projekt erstellen und mit dem GitHub-Repo verbinden.
2. Build-Command: leer lassen (statische Dateien).
3. Root-Verzeichnis: `/` (Projekt-Root).
4. Nach dem Deploy: Domain im Browser öffnen, "Zum Home-Bildschirm hinzufügen" testen (iOS Safari: Teilen → Zum Home-Bildschirm; Android Chrome: Menü → App installieren).
