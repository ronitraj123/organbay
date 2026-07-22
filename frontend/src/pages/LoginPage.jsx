import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// NOTE: the full-page background photo is set via CSS on .login-page
// itself (not on either panel), so it shows through behind both the
// floating sign-in card and the pitch text -- see global.css.


const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel login-panel-form">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="muted">Access your hospital's coordination dashboard.</p>

          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <div className="input-with-icon">
              <MailIcon />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator1@organbay.demo"
                required
              />
            </div>

            <label>Password</label>
            <div className="input-with-icon">
              <LockIcon />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Demo@1234"
                required
              />
            </div>

            {error && <div className="error-text">{error}</div>}
            <button type="submit">Log in</button>
          </form>

          <div className="login-hint">
            <strong>Demo accounts:</strong> <code>coordinator1@organbay.demo</code> through{' '}
            <code>coordinator20@organbay.demo</code>, password <code>Demo@1234</code>{' '}
            (see README after running the seed script). Coordinator 1 is the
            admin account that can toggle Emergency Mode.
          </div>
        </div>
      </div>

      <div className="login-panel login-panel-visual">
        <div className="login-panel-content">
          <div className="login-brand">
            <span className="navbar-brand-dot" />
            <span className="login-brand-name">OrganBay</span>
          </div>
          <div className="login-pitch">
            <h2>Real-time hospital coordination, network-wide.</h2>
            <p>Hospitals across India publish organ availability and recipient need. A compatibility engine proposes ranked matches, predicts transport ETA, and tracks the network live.</p>
          </div>
          <div className="login-stat-chips">
            <div className="login-stat-chip"><strong>20</strong> hospital nodes</div>
            <div className="login-stat-chip"><strong>13</strong> metro areas</div>
            <div className="login-stat-chip"><span className="chip-dot" /> Live sync</div>
          </div>
        </div>
      </div>
    </div>
  );
}