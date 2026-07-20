import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import MatchCard from '../components/MatchCard.jsx';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const { socket } = useSocket();

  const load = () => api.get('/api/matches').then(({ data }) => setMatches(data));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('match:proposed', refresh);
    socket.on('match:accepted', refresh);
    socket.on('match:rejected', refresh);
    return () => {
      socket.off('match:proposed', refresh);
      socket.off('match:accepted', refresh);
      socket.off('match:rejected', refresh);
    };
  }, [socket]);

  const accept = async (id) => {
    await api.post(`/api/matches/${id}/accept`);
    load();
  };
  const reject = async (id) => {
    await api.post(`/api/matches/${id}/reject`);
    load();
  };

  const proposed = matches.filter((m) => m.status === 'proposed');
  const others = matches.filter((m) => m.status !== 'proposed');

  return (
    <div className="matches-page">
      <div className="page-header">
        <h1>Matches</h1>
        <p className="muted">Candidate pairings from the deterministic compatibility engine, ranked and scored — not a clinical recommendation.</p>
      </div>

      <h2>Proposed ({proposed.length})</h2>
      <div className="match-list">
        {proposed.length === 0 && <p className="muted">No proposed matches right now. List an organ from the Dashboard to trigger matching.</p>}
        {proposed.map((m) => (
          <MatchCard key={m._id} match={m} onAccept={accept} onReject={reject} actionable />
        ))}
      </div>

      <h2>History</h2>
      <div className="match-list">
        {others.map((m) => (
          <MatchCard key={m._id} match={m} />
        ))}
      </div>
    </div>
  );
}
