'use client';

import { useEffect, useState } from 'react';
import { Users, Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { GoSakhaUsers } from './gosakha-users';

export function AccountTeam() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/team');
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message);
      setData(d);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    document.body.classList.add('account-team-view');
    return () => { document.body.classList.remove('account-team-view'); };
  }, []);

  useEffect(() => { load(); }, []);

  async function switchWorkspace(owner: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', owner }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message);
      location.reload();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="account-layout">
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </div>
      )}

      {!data && !error ? (
        <p>Loading your account…</p>
      ) : data ? (
        <>
          <section className="card account-card">
            <span className="eyebrow">YOUR ACCOUNT</span>
            <h2>{data.me.displayName}</h2>
            <p>{data.me.email}</p>
            <span className="chip">{data.current?.role || 'No workspace access'}</span>
            <label className="field">
              <span>Your account ID</span>
              <input value={data.me.userId} readOnly onFocus={(e) => e.target.select()} />
            </label>
            <button className="btn secondary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.me.userId);
                toast.success('Account ID copied');
              } catch {
                toast.info('Select the account ID and copy it.');
              }
            }}>
              <Copy size={15} /> Copy account ID
            </button>
            <p className="soft">
              To join a team, share this ID with its founder. They can grant access below.
              Your role comes from your signed-in account.
            </p>
          </section>

          <section className="card account-card">
            <span className="eyebrow">WORKSPACE ACCESS</span>
            <h2><Users size={21} /> Your workspaces</h2>
            {data.managed ? (
              <p>Your deployment uses a managed team workspace.</p>
            ) : (
              data.workspaces.map((w: any) => (
                <div className="team-row" key={w.owner}>
                  <div>
                    <strong>
                      {w.owner === data.me.userId
                        ? 'Your GoSakha workspace'
                        : 'Shared GoSakha workspace'}
                    </strong>
                    <small>
                      {w.role} · {w.owner === data.current?.owner ? 'Current workspace' : 'Available to open'}
                    </small>
                    <code>{w.owner}</code>
                  </div>
                  <button
                    className="btn secondary"
                    disabled={busy || w.owner === data.current?.owner}
                    onClick={() => switchWorkspace(w.owner)}
                  >
                    {w.owner === data.current?.owner ? 'Current' : 'Open'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              ))
            )}
            <p className="soft">
              Sample and live data stay separate within each workspace. Opening a shared
              workspace uses the role granted by its founder.
            </p>
          </section>
        </>
      ) : null}

      <GoSakhaUsers />
    </div>
  );
}