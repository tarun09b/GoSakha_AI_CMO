-- 005_create_email_replies.sql
-- Stores every reply we detect to an outreach email, plus its classification.

CREATE TABLE IF NOT EXISTS email_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the email that was replied to
  draft_id        UUID NOT NULL REFERENCES email_drafts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Gmail identifiers
  gmail_message_id  TEXT NOT NULL,            -- idempotency key
  gmail_thread_id   TEXT,

  -- Content
  from_email      TEXT NOT NULL,
  from_name       TEXT,
  subject         TEXT,
  body            TEXT NOT NULL,

  -- Classification
  classification  TEXT NOT NULL DEFAULT 'neutral'
                    CHECK (classification IN ('positive','objection','unsubscribe','out_of_office','neutral')),
  confidence      NUMERIC(3,2),               -- 0.00 - 1.00, for future ML

  -- Processing
  received_at     TIMESTAMPTZ,                 -- Gmail's internalDate
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_taken    TEXT,                        -- 'stage=Interested', 'opt_out=true', 'flagged_for_review', etc.

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: never store the same Gmail message twice
CREATE UNIQUE INDEX IF NOT EXISTS email_replies_gmail_unique
  ON email_replies (gmail_message_id);

CREATE INDEX IF NOT EXISTS email_replies_draft_idx        ON email_replies (draft_id);
CREATE INDEX IF NOT EXISTS email_replies_lead_idx         ON email_replies (lead_id);
CREATE INDEX IF NOT EXISTS email_replies_class_idx        ON email_replies (classification);
CREATE INDEX IF NOT EXISTS email_replies_received_idx     ON email_replies (received_at DESC);