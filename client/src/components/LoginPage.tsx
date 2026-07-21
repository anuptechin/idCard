import { useState } from 'react';
import { useAuth } from '../authStore';
import { APP_LOGO } from '../assets/applogo';

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message || 'Sign in failed');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-bg" aria-hidden>
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="login-monogram">D</span>
        <span className="login-grain" />
      </div>

      <div className={'login-card' + (shake ? ' shake' : '')}>
        <img className="login-logo" src={APP_LOGO} alt="D'DECOR" />
        <div className="login-kicker">ID Card Studio</div>
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in to continue to your workspace.</p>

        <form onSubmit={submit}>
          <label className="field">
            <span className="lab">Email</span>
            <input
              className="control"
              autoFocus
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ddecor.com"
            />
          </label>

          <label className="field">
            <span className="lab">Password</span>
            <div className="pw">
              <input
                className="control"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className={'login-error' + (error ? ' on' : '')}>{error || ' '}</div>

          <button className="btn dark login-submit" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-foot">Protected by role-based access · all activity is audited</div>
      </div>
    </div>
  );
}
