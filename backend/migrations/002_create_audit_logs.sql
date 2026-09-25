-- 002_create_audit_logs.sql
-- Immutable audit trail for GoSakha AI CMO

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who
  actor_id      UUID,                  -- users.id if a user acted; NULL for system
  actor_email   TEXT,                  -- denormalized for readability after user deletion
  actor_role    TEXT,                  -- denormalized for the same reason

  -- What
  action        TEXT NOT NULL,         -- e.g. 'user.created', 'user.role_changed', 'auth.login', 'auth.login_failed'
  entity_type   TEXT,                  -- e.g. 'user', 'lead', 'email'
  entity_id     UUID,                  -- the target row's id

  -- Context
  metadata      JSONB,                 -- small JSON blob; MUST NOT contain passwords or tokens
  ip_address    TEXT,                  -- request IP (nullable — server-to-server has none)
  user_agent    TEXT,                  -- request User-Agent header

  -- Outcome
  result        TEXT NOT NULL CHECK (result IN ('success', 'failure', 'blocked'))
);

CREATE INDEX IF NOT EXISTS audit_logs_occurred_at_idx ON audit_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx       ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx      ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx      ON audit_logs (entity_type, entity_id);

-- Prevent updates and deletes at the database level.
-- Only inserts are allowed. This makes the log tamper-evident.
CREATE OR REPLACE FUNCTION audit_logs_no_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable — UPDATE is not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_logs_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable — DELETE is not permitted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;
CREATE TRIGGER audit_logs_prevent_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_no_update();

DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;
CREATE TRIGGER audit_logs_prevent_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_no_delete();