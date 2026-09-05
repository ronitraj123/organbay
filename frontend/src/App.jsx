import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import EmergencyBanner from './components/EmergencyBanner.jsx';
import NotificationManager from './components/NotificationManager.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import LiveMapPage from './pages/LiveMapPage.jsx';
import EmergencyPage from './pages/EmergencyPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <main className="app-content">{children}</main>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      {user && <Navbar />}
      {user && <NotificationManager />}
      <EmergencyBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/matches"
          element={
            <RequireAuth>
              <MatchesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/live-map"
          element={
            <RequireAuth>
              <LiveMapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/emergency"
          element={
            <RequireAuth>
              <EmergencyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/audit-log"
          element={
            <RequireAuth>
              <AuditLogPage />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}