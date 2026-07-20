import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { useSocket } from '../context/SocketContext.jsx';

const ORGAN_TYPES = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'];
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const HLA_MARKER_POOL = ['A1', 'A2', 'A3', 'A11', 'A24', 'B7', 'B8', 'B27', 'B44', 'B62', 'DR3', 'DR4', 'DR7', 'DR15', 'DR51'];

export default function DashboardPage() {
  const [organs, setOrgans] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const { socket } = useSocket();

  const [organForm, setOrganForm] = useState({ organType: 'Kidney', bloodType: 'O+', hlaMarkers: [] });
  const [recipientForm, setRecipientForm] = useState({ displayId: '', organNeeded: 'Kidney', bloodType: 'O+', hlaMarkers: [], urgencyScore: 50 });
  const [lastMatches, setLastMatches] = useState(null);

  const loadData = () => {
    api.get('/api/organs', { params: { status: 'available' } }).then(({ data }) => setOrgans(data));
    api.get('/api/recipients', { params: { status: 'waiting' } }).then(({ data }) => setRecipients(data));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadData();
    socket.on('organ:new', refresh);
    socket.on('recipient:new', refresh);
    return () => {
      socket.off('organ:new', refresh);
      socket.off('recipient:new', refresh);
    };
  }, [socket]);

  const toggleMarker = (formSetter, form, marker) => {
    const has = form.hlaMarkers.includes(marker);
    formSetter({
      ...form,
      hlaMarkers: has ? form.hlaMarkers.filter((m) => m !== marker) : [...form.hlaMarkers, marker]
    });
  };

  const submitOrgan = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/api/organs', organForm);
    setLastMatches(data.matches);
    loadData();
  };

  const submitRecipient = async (e) => {
    e.preventDefault();
    await api.post('/api/recipients', {
      ...recipientForm,
      displayId: recipientForm.displayId || `R-${Date.now()}`
    });
    loadData();
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">List an organ to trigger the matching engine, or register a recipient onto the waiting list for your hospital.</p>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>List a New Organ</h2>
          <form onSubmit={submitOrgan}>
            <label>Organ Type</label>
            <select value={organForm.organType} onChange={(e) => setOrganForm({ ...organForm, organType: e.target.value })}>
              {ORGAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>Blood Type</label>
            <select value={organForm.bloodType} onChange={(e) => setOrganForm({ ...organForm, bloodType: e.target.value })}>
              {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>HLA Markers (representative, demo only)</label>
            <div className="marker-chips">
              {HLA_MARKER_POOL.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={organForm.hlaMarkers.includes(m) ? 'chip chip-selected' : 'chip'}
                  onClick={() => toggleMarker(setOrganForm, organForm, m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <button type="submit">List Organ &amp; Run Matching</button>
          </form>

          {lastMatches && (
            <div className="match-preview">
              <strong>{lastMatches.length}</strong> candidate match(es) proposed. See the Matches page to accept/reject.
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Register a Recipient</h2>
          <form onSubmit={submitRecipient}>
            <label>Display ID (optional, auto-generated if blank)</label>
            <input
              value={recipientForm.displayId}
              onChange={(e) => setRecipientForm({ ...recipientForm, displayId: e.target.value })}
              placeholder="R-021"
            />

            <label>Organ Needed</label>
            <select value={recipientForm.organNeeded} onChange={(e) => setRecipientForm({ ...recipientForm, organNeeded: e.target.value })}>
              {ORGAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>Blood Type</label>
            <select value={recipientForm.bloodType} onChange={(e) => setRecipientForm({ ...recipientForm, bloodType: e.target.value })}>
              {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label>HLA Markers (representative, demo only)</label>
            <div className="marker-chips">
              {HLA_MARKER_POOL.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={recipientForm.hlaMarkers.includes(m) ? 'chip chip-selected' : 'chip'}
                  onClick={() => toggleMarker(setRecipientForm, recipientForm, m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <label>Urgency Score: {recipientForm.urgencyScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={recipientForm.urgencyScore}
              onChange={(e) => setRecipientForm({ ...recipientForm, urgencyScore: Number(e.target.value) })}
            />

            <button type="submit">Register Recipient</button>
          </form>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Available Organs ({organs.length})</h2>
          <table>
            <thead><tr><th>Type</th><th>Blood</th><th>Hospital</th><th>Status</th></tr></thead>
            <tbody>
              {organs.map((o) => (
                <tr key={o._id}>
                  <td>{o.organType}</td>
                  <td>{o.bloodType}</td>
                  <td>{o.sourceHospital?.name}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Waiting Recipients ({recipients.length})</h2>
          <table>
            <thead><tr><th>ID</th><th>Organ</th><th>Blood</th><th>Urgency</th></tr></thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r._id}>
                  <td>{r.displayId}</td>
                  <td>{r.organNeeded}</td>
                  <td>{r.bloodType}</td>
                  <td>{r.urgencyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
