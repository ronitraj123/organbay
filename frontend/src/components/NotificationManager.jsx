import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';


export default function NotificationManager() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const pushToast = (title, body, tone = 'teal') => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, title, body, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (!socket || !user?.hospital?._id) return;

    const onProposed = (match) => {
      if (match?.recipient?.hospital?._id !== user.hospital._id) return;
      pushToast(
        `New ${match.organ?.organType || 'organ'} match proposed`,
        `Compatibility ${match.compatibilityIndex}/100 · ETA ~${match.predictedEtaMinutes}min`,
        'teal'
      );
    };

    const onAccepted = (match) => {
      const mine =
        match?.organ?.sourceHospital?._id === user.hospital._id ||
        match?.recipient?.hospital?._id === user.hospital._id;
      if (!mine) return;
      pushToast(
        `${match.organ?.organType || 'Organ'} match accepted`,
        'Transport is starting -- track it on the Live Map.',
        'blue'
      );
    };

    socket.on('match:proposed', onProposed);
    socket.on('match:accepted', onAccepted);

    return () => {
      socket.off('match:proposed', onProposed);
      socket.off('match:accepted', onAccepted);
    };
  }, [socket, user]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
          <div className="toast-title">{t.title}</div>
          <div className="toast-body">{t.body}</div>
        </div>
      ))}
    </div>
  );
}