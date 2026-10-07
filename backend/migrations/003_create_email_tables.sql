-- 003_create_email_tables.sql
-- Email drafts and approvals for the outreach pipeline

-- ============================================================
-- email_drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS email_drafts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  recipient_email     TEXT NOT NULL,
  recipient_name      TEXT,                -- e.g. "Dr. Ananya Rao"
  recipient_org       TEXT,                -- e.g. "Apollo Hospitals"

  -- Content
  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  template_id         TEXT,                -- 'cold_intro', 'follow_up', 'positive_reply'

  -- State machine
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending_approval','approved','rejected','sent','failed')),

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,

  -- Audit
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Send results
  gmail_message_id    TEXT,
  error               TEXT
);

CREATE INDEX IF NOT EXISTS email_drafts_status_idx    ON email_drafts (status);
CREATE INDEX IF NOT EXISTS email_drafts_created_idx   ON email_drafts (created_at DESC);
CREATE INDEX IF NOT EXISTS email_drafts_recipient_idx ON email_drafts (LOWER(recipient_email));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS email_drafts_set_updated_at ON email_drafts;
CREATE TRIGGER email_drafts_set_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What is being approved
  target_type     TEXT NOT NULL,          -- 'email_draft' | 'social_post' | 'campaign'
  target_id       UUID NOT NULL,
  action_type     TEXT NOT NULL,          -- 'email.send' | 'social.publish' | 'campaign.launch'

  -- State
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),

  -- Who
  requested_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  reason          TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approvals_target_idx    ON approvals (target_type, target_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx    ON approvals (status);
CREATE INDEX IF NOT EXISTS approvals_created_idx   ON approvals (created_at DESC);

-- Only one pending approval per target+action at a time
CREATE UNIQUE INDEX IF NOT EXISTS approvals_pending_unique
  ON approvals (target_type, target_id, action_type)
  WHERE status = 'pending';