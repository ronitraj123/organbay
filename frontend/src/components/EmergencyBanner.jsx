import { useEffect, useState } from 'react';
import api from '../api/api.js';
import { useSocket } from '../context/SocketContext.jsx';

export default function EmergencyBanner() {
  const [active, setActive] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    api.get('/api/emergency').then(({ data }) => setActive(data.active)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onActivate = () => setActive(true);
    const onDeactivate = () => setActive(false);
    socket.on('emergency:activated', onActivate);
    socket.on('emergency:deactivated', onDeactivate);
    return () => {
      socket.off('emergency:activated', onActivate);
      socket.off('emergency:deactivated', onDeactivate);
    };
  }, [socket]);

  if (!active) return null;

  return (
    <div className="emergency-banner">
      ⚠ EMERGENCY MODE ACTIVE — matching is broadcasting to a wider hospital radius and prioritizing recipients by urgency score.
    </div>
  );
}
