-- Tables de Glean. Ce fichier peut être relancé sans risque (IF NOT EXISTS).

-- Tous les comptes : bénéficiaires, restaurants et administrateurs
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('beneficiaire', 'restaurant', 'admin')),
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  latitude      NUMERIC(9, 6),
  longitude     NUMERIC(9, 6),
  -- en_attente : inscrit, pas encore vérifié par l'admin
  status        TEXT NOT NULL DEFAULT 'en_attente'
                CHECK (status IN ('en_attente', 'actif', 'refuse', 'suspendu')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Informations propres aux bénéficiaires (1 ligne par compte bénéficiaire)
CREATE TABLE IF NOT EXISTS beneficiaries (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  birth_date  DATE NOT NULL,
  cin         CHAR(8) NOT NULL UNIQUE,
  proof_type  TEXT NOT NULL,
  proof_path  TEXT NOT NULL,   -- chemin du fichier dans uploads/justificatifs
  proof_name  TEXT NOT NULL,   -- nom d'origine du fichier envoyé
  proof_mime  TEXT NOT NULL    -- image/png, image/jpeg ou application/pdf
);

-- Informations propres aux restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  manager_name   TEXT NOT NULL,
  tax_id         TEXT NOT NULL,
  opening_hours  TEXT
);
