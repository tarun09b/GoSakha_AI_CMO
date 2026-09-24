'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '../lib/auth';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/frontend/components/ui/alert-dialog';

const ROLES = ['Founder', 'Admin', 'CMO', 'Sales', 'Content Reviewer', 'Viewer'];

const ROLE_GUIDE: [string, string][] = [
  ['Founder', 'Owns the workspace and manages team access.'],
  ['Admin', 'Manages hospital data, settings and workflows.'],
  ['CMO', 'Runs growth workflows and approvals; cannot erase contacts.'],
  ['Sales', 'Manages leads, drafts outreach, meetings and tasks.'],
  ['Content Reviewer', 'Creates and reviews social posts.'],
  ['Viewer', 'Reads the workspace without changing data.'],
];

const API = 'http://localhost:4000';

type GosakhaUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export function GoSakhaUsers() {
  const [users, setUsers] = useState<GosakhaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [myRole, setMyRole] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [editing, setEditing] = useState<GosakhaUser | null>(null);
  const [changingOwn, setChangingOwn] = useState<GosakhaUser | null>(null);
  const [resetting, setResetting] = useState<GosakhaUser | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'Sales' });

  async function load() {
    setLoading(true);
    setError('');
    const token = getToken();
    if (!token) { setError('Not signed in.'); setLoading(false); return; }
    try {
      const r = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to load users.');
      setUsers(d.users || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gosakha.user');
      if (raw) {
        const u = JSON.parse(raw);
        setMyRole(u.role || '');
        setMyEmail(u.email || '');
      }
    } catch {}
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchUser(id: string, body: Record<string, unknown>, successMsg: string) {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${API}/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d: any = await r.json();
    if (!r.ok) { toast.error(d.message); throw new Error(d.message); }
    toast.success(successMsg);
    await load();
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message);
      toast.success('Teammate added');
      setForm({ fullName: '', email: '', password: '', role: 'Sales' });
      setShowAdd(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const canManage = myRole === 'Founder' || myRole === 'Admin';

  return (
    <section className="card account-card account-wide">
      <span className="eyebrow">PEOPLE &amp; PERMISSIONS</span>
      <h2><ShieldCheck size={21} /> Team management</h2>
      <p>Add a teammate with their email and a starting password. Access applies to this GoSakha AI CMO workspace only.</p>

      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <button className="btn" type="button" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add teammate</>}
          </button>
        </div>
      )}

      {showAdd && canManage && (
        <form className="team-form" onSubmit={createUser}>
          <label className="field">
            <span>Teammate name</span>
            <input required maxLength={120} value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" maxLength={200} value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Initial password</span>
            <input required type="password" minLength={8} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, upper+lower+number" />
          </label>
          <label className="field">
            <span>Team role</span>
            <select value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <button className="btn" disabled={creating}>
            {creating ? 'Saving…' : 'Save teammate'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="soft">Loading teammates…</p>
      ) : users.length === 0 ? (
        <p className="soft">No teammates yet.</p>
      ) : (
        <div>
          {users.map(u => {
            const isMe = u.email.toLowerCase() === myEmail.toLowerCase();
            const last = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'never';
            return (
              <div className="team-row" key={u.id} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                <div>
                  <strong>
                    {u.fullName}
                    {isMe && <span style={{ color: '#8A968E', fontWeight: 400 }}> · you</span>}
                  </strong>
                  <small>{u.email} · last login {last}</small>
                  {!u.isActive && <small style={{ color: '#B8562B', fontWeight: 500 }}>Disabled</small>}
                </div>

                <div className="team-actions">
                  <span className="chip">{u.role}</span>

                  {isMe && (
                    <button className="btn secondary" onClick={() => setChangingOwn(u)}>
                      Change password
                    </button>
                  )}

                  {canManage && !isMe && (
                    <>
                      <button className="btn secondary" onClick={() => setEditing(u)}>
                        Edit role
                      </button>

                      <button
                        className="btn secondary"
                        onClick={() =>
                          patchUser(
                            u.id,
                            { isActive: !u.isActive },
                            u.isActive ? 'Access paused' : 'Access resumed'
                          )
                        }
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>

                      <button className="btn secondary" onClick={() => setResetting(u)}>
                        Reset password
                      </button>

                      {u.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-button">Remove</button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {u.fullName}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                They will lose access to this GoSakha AI CMO workspace. The account stays in the database as disabled so audit history is preserved — a Founder can re-enable it later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => patchUser(u.id, { isActive: false }, 'Teammate removed')}>
                                Remove access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}

                  {!canManage && !isMe && (
                    <span className="soft" style={{ fontSize: 12 }}>View only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditRoleDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSave={async (role) => {
            await patchUser(editing.id, { role }, 'Role updated');
            setEditing(null);
          }}
        />
      )}

      {changingOwn && (
        <ChangePasswordDialog
          onClose={() => setChangingOwn(null)}
          onSave={async () => { setChangingOwn(null); }}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async () => { setResetting(null); }}
        />
      )}

      <div className="role-guide">
        {ROLE_GUIDE.map(([r, d]) => (
          <div key={r}>
            <strong>{r}</strong>
            <p>{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditRoleDialog({
  user, onClose, onSave,
}: { user: GosakhaUser; onClose: () => void; onSave: (role: string) => Promise<void>; }) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await onSave(role); } finally { setSaving(false); }
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(22,36,31,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 8, padding: 28,
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 32px rgba(22,36,31,0.15)',
      }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0A4F42' }}>Edit role</h2>
        <p className="soft" style={{ marginTop: 6 }}>{user.fullName} · {user.email}</p>
        <label className="field" style={{ marginTop: 16 }}>
          <span>Team role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" className="btn secondary" onClick={onClose}
            disabled={saving} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn" onClick={save}
            disabled={saving || role === user.role} style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save role'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordDialog({
  onClose, onSave,
}: { onClose: () => void; onSave: () => Promise<void>; }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const r = await fetch(`${API}/api/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to change password.');
      toast.success('Password updated');
      await onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(22,36,31,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 8, padding: 28,
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 32px rgba(22,36,31,0.15)',
      }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0A4F42' }}>Change password</h2>
        <p className="soft" style={{ marginTop: 6 }}>Update the password for your own account.</p>

        <label className="field" style={{ marginTop: 16 }}>
          <span>Current password</span>
          <input type="password" value={currentPassword} autoFocus
            onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>

        <label className="field" style={{ marginTop: 12 }}>
          <span>New password</span>
          <input type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 chars, upper+lower+number" />
        </label>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Confirm new password</span>
          <input type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
        </label>

        {error && (
          <div style={{
            marginTop: 12, padding: '8px 12px', fontSize: 13,
            color: '#B8562B', background: '#FCF1EA',
            border: '1px solid #F0C9B5', borderRadius: 6,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" className="btn secondary" onClick={onClose}
            disabled={saving} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn" onClick={save}
            disabled={saving || !currentPassword || !newPassword || !confirm}
            style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  user, onClose, onSave,
}: { user: GosakhaUser; onClose: () => void; onSave: () => Promise<void>; }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const r = await fetch(`${API}/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to reset password.');
      toast.success('Password reset — share it with the teammate');
      await onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(22,36,31,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 8, padding: 28,
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 32px rgba(22,36,31,0.15)',
      }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#0A4F42' }}>Reset password</h2>
        <p className="soft" style={{ marginTop: 6 }}>{user.fullName} · {user.email}</p>
        <p className="soft">Set a new password for this teammate. Share it securely.</p>

        <label className="field" style={{ marginTop: 12 }}>
          <span>New password</span>
          <input type="password" value={newPassword} autoFocus
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 chars, upper+lower+number" />
        </label>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Confirm new password</span>
          <input type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
        </label>

        {error && (
          <div style={{
            marginTop: 12, padding: '8px 12px', fontSize: 13,
            color: '#B8562B', background: '#FCF1EA',
            border: '1px solid #F0C9B5', borderRadius: 6,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" className="btn secondary" onClick={onClose}
            disabled={saving} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn" onClick={save}
            disabled={saving || !newPassword || !confirm}
            style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Reset password'}
          </button>
        </div>
      </div>
    </div>
  );
}