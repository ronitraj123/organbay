import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
      <div className="login-card">
        <div className="login-brand">
          <span className="navbar-brand-dot" style={{ background: 'var(--signal-teal)' }} />
          <h1>OrganBay</h1>
        </div>
        <p className="muted">Real-time hospital coordination platform (demo)</p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coordinator1@organbay.demo"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Demo@1234"
            required
          />
          {error && <div className="error-text">{error}</div>}
          <button type="submit">Log in</button>
        </form>

        <div className="login-hint">
          Demo accounts: <code>coordinator1@organbay.demo</code> through{' '}
          <code>coordinator20@organbay.demo</code>, password <code>Demo@1234</code>{' '}
          (see README after running the seed script). Coordinator 1 is the
          admin account that can toggle Emergency Mode.
        </div>
      </div>
    </div>
  );
}
