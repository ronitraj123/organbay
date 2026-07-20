import { useEffect, useState } from 'react';
import api from '../api/api.js';

export default function EmergencyPage() {
  const [status, setStatus] = useState(null);
  const [reason, setReason] = useState('');

  const load = () => api.get('/api/emergency').then(({ data }) => setStatus(data));
  useEffect(() => { load(); }, []);

  const activate = async () => {
    await api.post('/api/emergency/activate', { reason });
    load();
  };
  const deactivate = async () => {
    await api.post('/api/emergency/deactivate');
    load();
  };

  if (!status) return <div className="panel">Loading...</div>;

  return (
    <div className="emergency-page">
      <div className="page-header">
        <h1>Emergency Mode</h1>
        <p className="muted">
          When active, the matching engine broadcasts proposed matches to a
          wider pool of hospitals and ranks candidate recipients by urgency
          score first (instead of compatibility index first). Admin-only
          action.
        </p>
      </div>

      <div className="panel">
        <div>Status: <strong>{status.active ? 'ACTIVE' : 'Inactive'}</strong></div>
        {status.active && (
          <>
            <div>Activated by: {status.activatedBy}</div>
            <div>Reason: {status.reason}</div>
          </>
        )}

        {!status.active ? (
          <>
            <label>Reason for activation</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. mass casualty event, regional surge" />
            <button className="btn-accept" onClick={activate}>Activate Emergency Mode</button>
          </>
        ) : (
          <button className="btn-reject" onClick={deactivate}>Deactivate Emergency Mode</button>
        )}
      </div>
    </div>
  );
}
