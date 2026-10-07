'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  Phone,
  Star,
  Plus,
  Mail,
  RefreshCw,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Lead = {
  id: string;
  stage: string;
  temperature: 'hot' | 'warm' | 'cool';
  score: number;
  opt_out: boolean;
  org_id: string;
  org_name: string;
  city: string | null;
  phone: string | null;
  website: string | null;
  org_email: string | null;
  email_source: string | null;
  last_emailed_at: string | null;
  rating: string | null;
  review_count: number | null;
};

type LeadsApiResponse = {
  leads: Lead[];
  total: number;
  message?: string;
};

type TempFilter = 'all' | 'hot' | 'warm' | 'cool';
type EmailFilter = 'all' | 'not_emailed' | 'emailed' | 'needs_followup';

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function LeadsLive() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tempFilter, setTempFilter] = useState<TempFilter>('all');
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('all');
  const [showScrape, setShowScrape] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [scrapeForm, setScrapeForm] = useState({
    city: 'Hyderabad',
    state: 'Telangana',
    max_results: 20,
  });

  async function load() {
    setLoading(true);
    setError('');
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API}/api/leads?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = (await r.json()) as LeadsApiResponse;
      if (!r.ok) throw new Error(d.message || 'Failed to load leads.');
      setLeads(d.leads || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`${API}/api/leads?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        const data = d as LeadsApiResponse;
        if (!ok) {
          setError(data.message || 'Failed to load leads.');
        } else {
          setLeads(data.leads || []);
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleScrape(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setScraping(true);
    try {
      const r = await fetch(`${API}/api/scrape/hospitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(scrapeForm),
      });
      const d = (await r.json()) as {
        discovered?: number;
        created_leads?: number;
        duplicates_skipped?: number;
        message?: string;
      };
      if (!r.ok) throw new Error(d.message || 'Scrape failed.');
      toast.success(
        `Found ${d.discovered ?? 0} · ${d.created_leads ?? 0} new · ${d.duplicates_skipped ?? 0} skipped`
      );
      setShowScrape(false);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setScraping(false);
    }
  }

  async function handleDraftEmail(lead: Lead) {
    const token = getToken();
    if (!token) return;

    if (!lead.org_email) {
      toast.error('No email address found for this hospital. Add one manually or re-scrape.');
      return;
    }

    const isFollowUp = lead.last_emailed_at && daysSince(lead.last_emailed_at) >= 2;
    const template = isFollowUp ? 'follow_up' : 'cold_intro';

    setDraftingId(lead.id);
    try {
      const r = await fetch(`${API}/api/leads/${lead.id}/draft-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          template_id: template,
          submit_for_approval: true,
        }),
      });
      const d = (await r.json()) as { message?: string };
      if (!r.ok) throw new Error(d.message || 'Could not create draft.');
      toast.success(
        isFollowUp
          ? 'Follow-up draft created and submitted for approval'
          : 'Draft created and submitted for approval'
      );
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDraftingId(null);
    }
  }

  // Apply both filters together
  const filtered = leads.filter((l) => {
    // Temperature filter
    if (tempFilter !== 'all') {
      if (tempFilter === 'hot' && l.temperature !== 'hot') return false;
      if (tempFilter === 'warm' && l.temperature !== 'warm') return false;
      if (tempFilter === 'cool' && l.temperature !== 'cool') return false;
    }
    // Email filter
    const emailed = Boolean(l.last_emailed_at);
    if (emailFilter === 'not_emailed' && emailed) return false;
    if (emailFilter === 'emailed' && !emailed) return false;
    if (emailFilter === 'needs_followup') {
      if (!emailed || !l.last_emailed_at) return false;
      if (daysSince(l.last_emailed_at) < 2) return false;
    }
    return true;
  });

  // Temperature counts (all leads, unfiltered by temp)
  const tempCounts = {
    all: leads.length,
    hot: leads.filter((l) => l.temperature === 'hot').length,
    warm: leads.filter((l) => l.temperature === 'warm').length,
    cool: leads.filter((l) => l.temperature === 'cool').length,
  };

  // Email counts (already filtered by temp)
  const tempScopedLeads = leads.filter((l) => {
    if (tempFilter === 'all') return true;
    return l.temperature === tempFilter;
  });
  const emailCounts = {
    all: tempScopedLeads.length,
    not_emailed: tempScopedLeads.filter((l) => !l.last_emailed_at).length,
    emailed: tempScopedLeads.filter((l) => Boolean(l.last_emailed_at)).length,
    needs_followup: tempScopedLeads.filter(
      (l) => l.last_emailed_at && daysSince(l.last_emailed_at) >= 2
    ).length,
  };

  const tempButtons: { id: TempFilter; label: string }[] = [
    { id: 'all', label: `All (${tempCounts.all})` },
    { id: 'hot', label: `Hot (${tempCounts.hot})` },
    { id: 'warm', label: `Warm (${tempCounts.warm})` },
    { id: 'cool', label: `Cool (${tempCounts.cool})` },
  ];

  const emailButtons: { id: EmailFilter; label: string }[] = [
    { id: 'all', label: `All (${emailCounts.all})` },
    { id: 'not_emailed', label: `Not emailed (${emailCounts.not_emailed})` },
    { id: 'emailed', label: `Emailed (${emailCounts.emailed})` },
    { id: 'needs_followup', label: `Needs follow-up (${emailCounts.needs_followup})` },
  ];

  return (
    <section className="card">
      {/* HEADER ROW: title + temperature filters + Refresh + Scrape */}
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
        <h2>{filtered.length} hospital relationships</h2>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Temperature filters — same UI as the original design */}
          {tempButtons.map((t) => (
            <button
              key={t.id}
              className={tempFilter === t.id ? 'btn' : 'btn secondary'}
              onClick={() => setTempFilter(t.id)}
            >
              {t.label}
            </button>
          ))}

          <button className="btn secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            className="btn"
            onClick={() => setShowScrape(true)}
            disabled={scraping}
          >
            <Plus size={15} /> Scrape hospitals
          </button>
        </div>
      </div>

      {/* EMAIL FILTERS — second row, subtler buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 12,
          marginBottom: 8,
          paddingTop: 12,
          borderTop: '1px solid #EAEFE9',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#8A968E',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            alignSelf: 'center',
            marginRight: 6,
          }}
        >
          Email status:
        </span>
        {emailButtons.map((e) => (
          <button
            key={e.id}
            className={emailFilter === e.id ? 'btn' : 'btn secondary'}
            onClick={() => setEmailFilter(e.id)}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Scrape form */}
      {showScrape && (
        <form
          onSubmit={handleScrape}
          style={{
            background: '#F2F4F1',
            border: '1px solid #D7DED7',
            borderRadius: 8,
            padding: 20,
            marginTop: 16,
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ flex: 1, minWidth: 160 }}>
            <span style={labelStyle}>City</span>
            <input
              value={scrapeForm.city}
              onChange={(e) =>
                setScrapeForm({ ...scrapeForm, city: e.target.value })
              }
              disabled={scraping}
              style={inputStyle}
            />
          </label>
          <label style={{ flex: 1, minWidth: 160 }}>
            <span style={labelStyle}>State</span>
            <input
              value={scrapeForm.state}
              onChange={(e) =>
                setScrapeForm({ ...scrapeForm, state: e.target.value })
              }
              disabled={scraping}
              style={inputStyle}
            />
          </label>
          <label style={{ width: 120 }}>
            <span style={labelStyle}>Max</span>
            <input
              type="number"
              min={1}
              max={50}
              value={scrapeForm.max_results}
              onChange={(e) =>
                setScrapeForm({
                  ...scrapeForm,
                  max_results: Number(e.target.value),
                })
              }
              disabled={scraping}
              style={inputStyle}
            />
          </label>
          <button type="submit" className="btn" disabled={scraping}>
            {scraping ? 'Scraping… (30-60s)' : 'Scrape'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowScrape(false)}
            disabled={scraping}
          >
            <X size={15} />
          </button>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
          {error}
          <button onClick={load}>Retry</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="soft" style={{ padding: 24 }}>
          Loading hospitals…
        </p>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ padding: 40, textAlign: 'center' }}>
          <Building2 size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
          <h3>No hospitals match this filter</h3>
          <p style={{ color: '#8A968E' }}>
            {leads.length === 0
              ? 'Click "Scrape hospitals" to find real hospitals.'
              : 'Try a different filter above.'}
          </p>
        </div>
      ) : (
        <div className="table-scroll" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>HOSPITAL</th>
                <th>CITY</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>RATING</th>
                <th>SCORE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const hasEmail = Boolean(lead.org_email);
                const emailed = Boolean(lead.last_emailed_at);
                const days = lead.last_emailed_at ? daysSince(lead.last_emailed_at) : null;
                const needsFollowUp = emailed && days !== null && days >= 2;
                const isDrafting = draftingId === lead.id;

                return (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={avatarStyle}>
                          <Building2 size={15} />
                        </span>
                        <div>
                          <strong style={{ display: 'block', color: '#16241F' }}>
                            {lead.org_name}
                          </strong>
                          {lead.website && (
                            <small style={{ color: '#8A968E', fontSize: 11 }}>
                              {lead.website.replace(/^https?:\/\//, '').slice(0, 35)}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{lead.city || '—'}</td>
                    <td>
                      {hasEmail ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: '#0E6E5A',
                          }}
                        >
                          <Mail size={12} /> {lead.org_email}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: '#B8562B',
                          }}
                        >
                          <AlertCircle size={12} /> No email found
                        </span>
                      )}
                    </td>
                    <td>
                      {lead.phone ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                          }}
                        >
                          <Phone size={12} /> {lead.phone}
                        </span>
                      ) : (
                        <span style={{ color: '#8A968E' }}>—</span>
                      )}
                    </td>
                    <td>
                      {lead.rating ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Star size={12} style={{ color: '#A67A17' }} /> {lead.rating}
                          {lead.review_count != null && (
                            <small style={{ color: '#8A968E' }}>
                              ({lead.review_count})
                            </small>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <strong>{lead.score}</strong>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 4,
                        }}
                      >
                        {emailed && days !== null && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              color: needsFollowUp ? '#A67A17' : '#0E6E5A',
                              background: needsFollowUp ? '#FCF1EA' : '#E8F2EE',
                              padding: '2px 8px',
                              borderRadius: 10,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <CheckCircle2 size={10} />
                            {days === 0
                              ? 'Emailed today'
                              : days === 1
                                ? 'Emailed 1d ago'
                                : `Emailed ${days}d ago`}
                          </span>
                        )}

                        <button
                          className="btn secondary"
                          onClick={() => handleDraftEmail(lead)}
                          disabled={!hasEmail || isDrafting}
                          title={
                            !hasEmail
                              ? 'No email address found for this hospital'
                              : needsFollowUp
                                ? `Send a follow-up (last emailed ${days} days ago)`
                                : emailed
                                  ? 'Send another email'
                                  : 'Create the initial outreach draft'
                          }
                          style={{
                            whiteSpace: 'nowrap',
                            opacity: !hasEmail ? 0.5 : 1,
                            cursor: !hasEmail ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {needsFollowUp ? <Send size={13} /> : <Mail size={13} />}
                          {isDrafting
                            ? 'Working…'
                            : needsFollowUp
                              ? 'Follow up'
                              : 'Draft email'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid #D7DED7',
  borderRadius: 6,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#445048',
  marginBottom: 4,
};

const avatarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 6,
  background: '#EAEFE9',
  color: '#0A4F42',
};