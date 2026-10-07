-- 004_create_organizations_leads.sql
-- Hospitals/clinics and their corresponding leads for the outreach pipeline.

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'hospital'
                    CHECK (type IN ('hospital','clinic','diagnostic_center','multi_specialty','doctor')),

  -- Location
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,

  -- Contact
  phone           TEXT,
  website         TEXT,

  -- Source tracking
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('google_places','overpass','manual')),
  source_id       TEXT,                  -- e.g. Google Places place_id
  source_url      TEXT,

  -- Google metadata (nullable)
  rating          NUMERIC(2,1),
  review_count    INTEGER,

  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Dedup: same source + same source_id = same organization
CREATE UNIQUE INDEX IF NOT EXISTS organizations_source_unique
  ON organizations (source, source_id)
  WHERE source_id IS NOT NULL;

-- Fallback dedup by lowercased name + city (for manually added orgs)
CREATE INDEX IF NOT EXISTS organizations_name_city_idx
  ON organizations (LOWER(name), LOWER(city));

CREATE INDEX IF NOT EXISTS organizations_city_idx     ON organizations (LOWER(city));
CREATE INDEX IF NOT EXISTS organizations_state_idx    ON organizations (LOWER(state));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Pipeline state
  stage              TEXT NOT NULL DEFAULT 'New'
                       CHECK (stage IN ('New','Contacted','Interested','Demo','Proposal','Negotiation','Won','Lost')),
  temperature        TEXT NOT NULL DEFAULT 'cool'
                       CHECK (temperature IN ('hot','warm','cool')),
  score              INTEGER NOT NULL DEFAULT 0
                       CHECK (score >= 0 AND score <= 100),

  -- Ownership & next action
  owner_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  next_action        TEXT,
  next_action_due    TIMESTAMPTZ,

  -- Consent
  opt_out            BOOLEAN NOT NULL DEFAULT FALSE,

  -- Activity tracking
  last_activity_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_org_idx           ON leads (organization_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx         ON leads (stage);
CREATE INDEX IF NOT EXISTS leads_temperature_idx   ON leads (temperature);
CREATE INDEX IF NOT EXISTS leads_owner_idx         ON leads (owner_id);
CREATE INDEX IF NOT EXISTS leads_opt_out_idx       ON leads (opt_out) WHERE opt_out = TRUE;

-- Auto-update updated_at
DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();