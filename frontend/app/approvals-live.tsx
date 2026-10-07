'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Check, X, RefreshCw, Mail, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Approval = {
  id: string;
  target_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
  decided_at: string | null;
  subject: string | null;
  body: string | null;
  recipient_email: string | null;
  recipient_org: string | null;
  requested_by_name: string | null;
  decided_by_name: string | null;
  sent_at: string | null;
  gmail_message_id: string | null;
};

type ListResponse = {
  approvals: Approval[];
  total: number;
  message?: string;
};

type Filter = 'pending' | 'approved' | 'rejected';

export function ApprovalsLive() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
    let cancelled = false;
    const token = getToken();

    // Defer the whole flow into a microtask so setState isn't
    // called synchronously in the effect body.
    const run = async () => {
      if (!token) {
        if (cancelled) return;
        setError('Not signed in.');
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setLoading(true);
      setError('');

      try {
        const r = await fetch(
          `${API}/api/approvals?status=${filter}&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = (await r.json()) as ListResponse;
        if (cancelled) return;
        if (!r.ok) {
          setError(d.message || 'Failed to load approvals.');
        } else {
          setApprovals(d.approvals || []);
        }
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [filter]);

  function reload() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');

    fetch(`${API}/api/approvals?status=${filter}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        const data = d as ListResponse;
        if (!ok) {
          setError(data.message || 'Failed to load approvals.');
        } else {
          setApprovals(data.approvals || []);
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }

  function decide(approval: Approval, action: 'approve' | 'reject') {
    const token = getToken();
    if (!token) return;

    let reason: string | null = null;

    if (action === 'reject') {
      const ans = window.prompt('Reason for rejecting (optional):', 'Not now');
      if (ans === null) return;
      reason = ans;
    } else {
      const subj = approval.subject || '(no subject)';
      const msg =
        'Approve sending this email to ' +
        (approval.recipient_email || '') +
        '?\n\nSubject: ' +
        subj;
      if (!window.confirm(msg)) return;
    }

    setActing(approval.id);

    fetch(`${API}/api/approvals/${approval.id}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, reason }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        const data = d as { message?: string };
        if (!ok) {
          toast.error(data.message || 'Decision failed.');
          setActing(null);
          return;
        }
        toast.success(action === 'approve' ? 'Approved' : 'Rejected');
        setActing(null);
        reload();
      })
      .catch((e: Error) => {
        toast.error(e.message);
        setActing(null);
      });
  }

  function sendApproved(approval: Approval) {
    const token = getToken();
    if (!token) return;

    const subj = approval.subject || '(no subject)';
    const msg =
      'Send this email NOW to ' +
      (approval.recipient_email || '') +
      '?\n\nSubject: ' +
      subj +
      '\n\nThis sends a real email. No undo.';
    if (!window.confirm(msg)) return;

    setSending(approval.id);

    fetch(`${API}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ draft_id: approval.target_id }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        const data = d as { message?: string; gmail_message_id?: string };
        if (!ok) {
          toast.error(data.message || 'Send failed.');
          setSending(null);
          return;
        }
        toast.success('Email sent');
        setSending(null);
        reload();
      })
      .catch((e: Error) => {
        toast.error(e.message);
        setSending(null);
      });
  }

  const headingText =
    String(approvals.length) +
    ' ' +
    filter +
    ' decision' +
    (approvals.length === 1 ? '' : 's');

  return (
    <section className="card">
      <div
        className="card-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2>{headingText}</h2>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {(['pending', 'approved', 'rejected'] as Filter[]).map((f) => (
            <button
              key={f}
              className={filter === f ? 'btn' : 'btn secondary'}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            className="btn secondary"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
          {error}
          <button onClick={reload}>Retry</button>
        </div>
      ) : null}

      {loading ? (
        <p className="soft" style={{ padding: 24 }}>
          Loading approvals…
        </p>
      ) : approvals.length === 0 ? (
        <div className="empty" style={{ padding: 40, textAlign: 'center' }}>
          <ShieldCheck
            size={32}
            style={{ opacity: 0.4, marginBottom: 12 }}
          />
          <h3>All caught up</h3>
          <p style={{ color: '#8A968E' }}>
            {filter === 'pending'
              ? 'No drafts awaiting your review.'
              : 'No ' + filter + ' decisions yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {approvals.map((a) => {
            const bodyText = a.body || '';
            const preview =
              bodyText.length > 900
                ? bodyText.slice(0, 900) + '\n…'
                : bodyText;
            const alreadySent = Boolean(a.sent_at);

            return (
              <div
                key={a.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D7DED7',
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: '#EAEFE9',
                      color: '#0A4F42',
                    }}
                  >
                    <Mail size={14} />
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#445048',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Email outreach
                  </span>
                  <span className="chip">{a.status}</span>
                  {alreadySent ? (
                    <span
                      className="chip"
                      style={{
                        background: '#E8F2EE',
                        color: '#0E6E5A',
                      }}
                    >
                      sent
                    </span>
                  ) : null}
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#16241F',
                    margin: '4px 0 8px',
                    lineHeight: 1.3,
                  }}
                >
                  {a.subject || '(no subject)'}
                </h3>

                <div
                  style={{
                    fontSize: 12,
                    color: '#445048',
                    marginBottom: 12,
                  }}
                >
                  {a.recipient_org ? (
                    <span style={{ marginRight: 12 }}>
                      {a.recipient_org}
                    </span>
                  ) : null}
                  <span>{a.recipient_email}</span>
                  <span style={{ marginLeft: 12, color: '#8A968E' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>

                {bodyText ? (
                  <pre
                    style={{
                      background: '#F8FAF8',
                      border: '1px solid #EAEFE9',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 12,
                      color: '#16241F',
                      fontFamily: 'inherit',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 180,
                      overflow: 'auto',
                      margin: '0 0 12px',
                      lineHeight: 1.5,
                    }}
                  >
                    {preview}
                  </pre>
                ) : null}

                {alreadySent ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#0E6E5A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <Clock size={12} />
                    Sent {new Date(a.sent_at as string).toLocaleString()}
                    {a.gmail_message_id ? (
                      <span style={{ color: '#8A968E', marginLeft: 8 }}>
                        · {a.gmail_message_id.slice(0, 16)}…
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {a.requested_by_name ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#8A968E',
                      marginBottom: 12,
                    }}
                  >
                    Requested by {a.requested_by_name}
                    {a.decided_by_name && a.decided_at
                      ? ' · Approved by ' +
                        a.decided_by_name +
                        ' on ' +
                        new Date(a.decided_at).toLocaleString()
                      : ''}
                  </div>
                ) : null}

                {a.status === 'pending' ? (
                  <div
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                  >
                    <button
                      className="btn"
                      onClick={() => decide(a, 'approve')}
                      disabled={acting === a.id}
                    >
                      <Check size={15} />{' '}
                      {acting === a.id ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => decide(a, 'reject')}
                      disabled={acting === a.id}
                    >
                      <X size={15} /> Reject
                    </button>
                  </div>
                ) : null}

                {a.status === 'approved' && !alreadySent ? (
                  <div
                    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                  >
                    <button
                      className="btn"
                      onClick={() => sendApproved(a)}
                      disabled={sending === a.id}
                      style={{
                        background: '#0E6E5A',
                        color: '#FFFFFF',
                      }}
                    >
                      <Send size={15} />{' '}
                      {sending === a.id ? 'Sending…' : 'Send now'}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}