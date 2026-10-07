-- 007_add_org_email.sql
-- Adds contact email fields to organizations so we can scrape and store
-- hospital email addresses during discovery.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_source TEXT
    CHECK (email_source IN ('scraped','manual','guessed') OR email_source IS NULL);

CREATE INDEX IF NOT EXISTS organizations_email_idx
  ON organizations (LOWER(email))
  WHERE email IS NOT NULL;

-- Track the most recent outbound email to this org
-- (denormalized for fast list queries; derived from email_drafts)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS organizations_last_emailed_idx
  ON organizations (last_emailed_at DESC)
  WHERE last_emailed_at IS NOT NULL;