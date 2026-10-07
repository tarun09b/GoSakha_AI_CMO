-- 006_add_gmail_thread_id.sql
-- Adds gmail_thread_id to email_drafts. Needed for reply detection.

ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

CREATE INDEX IF NOT EXISTS email_drafts_thread_idx
  ON email_drafts (gmail_thread_id)
  WHERE gmail_thread_id IS NOT NULL;