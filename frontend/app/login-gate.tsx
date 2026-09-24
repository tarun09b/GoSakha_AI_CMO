'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { login } from '../lib/api';
import { saveSession, getToken, clearSession, getUser, type SessionUser } from '../lib/auth';

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setToken(getToken());
    setUser(getUser());
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A968E' }}>
        Loading...
      </div>
    );
  }

  if (!token) {
    return <LoginForm onSuccess={(t, u) => { setToken(t); setUser(u); }} />;
  }

  return (
    <div>
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', background: '#FFFFFF', border: '1px solid #D7DED7',
        borderRadius: 6, fontSize: 12, color: '#445048',
        boxShadow: '0 1px 2px rgba(16,36,31,0.06)',
      }}>
        <span>{user?.email} <span style={{ color: '#8A968E' }}>({user?.role})</span></span>
        <button
          onClick={() => { clearSession(); setToken(null); setUser(null); }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#0E6E5A', fontSize: 12, fontWeight: 500, padding: 0,
          }}
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (token: string, user: SessionUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      saveSession(result.token, result.user);
      onSuccess(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F2F4F1', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0A4F42', letterSpacing: '-0.02em', margin: 0 }}>
            GoSakha AI CMO
          </h1>
          <p style={{ fontSize: 14, color: '#445048', marginTop: 6, marginBottom: 0 }}>
            Sign in to your workspace
          </p>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #D7DED7', borderRadius: 8,
          boxShadow: '0 1px 2px rgba(16,36,31,0.04)', padding: 32,
        }}>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#16241F', marginBottom: 6 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@company.com"
              style={{
                width: '100%', padding: '8px 12px', fontSize: 14,
                border: '1px solid #D7DED7', borderRadius: 6, background: '#FFFFFF',
                color: '#16241F', outline: 'none', boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />

            <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#16241F', marginTop: 20, marginBottom: 6 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 14,
                border: '1px solid #D7DED7', borderRadius: 6, background: '#FFFFFF',
                color: '#16241F', outline: 'none', boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />

            {error && (
              <div role="alert" style={{
                marginTop: 16, padding: '10px 12px', fontSize: 13,
                color: '#B8562B', background: '#FCF1EA',
                border: '1px solid #F0C9B5', borderRadius: 6,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                marginTop: 24, width: '100%', padding: '10px 16px',
                fontSize: 14, fontWeight: 500, color: '#FFFFFF',
                background: loading || !email || !password ? '#7A9A91' : '#0E6E5A',
                border: 'none', borderRadius: 6,
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8A968E', marginTop: 24 }}>
          GoSakha Innovations LLP
        </p>
      </div>
    </div>
  );
}
