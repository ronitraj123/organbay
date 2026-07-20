import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) => (isActive ? 'active' : undefined);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-brand-dot" />
        OrganBay
      </div>
      <div className="navbar-links">
        <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/matches" className={linkClass}>Matches</NavLink>
        <NavLink to="/live-map" className={linkClass}>Live Map</NavLink>
        {user?.role === 'admin' && <NavLink to="/emergency" className={linkClass}>Emergency Mode</NavLink>}
        <NavLink to="/audit-log" className={linkClass}>Audit Log</NavLink>
      </div>
      <div className="navbar-user">
        <span><strong>{user?.name}</strong> · {user?.hospital?.name}</span>
        <button onClick={handleLogout}>Log out</button>
      </div>
    </nav>
  );
}
