import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/api.js';
import { useSocket } from '../context/SocketContext.jsx';

const INDIA_CENTER = [22.5, 79.0];

// Self-contained SVG-based markers -- deliberately NOT loading icon images
// from an external CDN. Leaflet's default marker relies on a bundler-relative
// image path that breaks easily outside its expected build setup; inline SVG
// has zero external dependency and lets us color-code by hospital type.
function hospitalDivIcon(type) {
  const isTransplant = type?.startsWith('Transplant');
  const cls = isTransplant ? 'transplant' : 'general';
  const glyph = isTransplant
    ? '<path d="M7 2v3M5 3.5h4" stroke="white" stroke-width="1.4" stroke-linecap="round"/><path d="M3.2 7.2c0-1.6 1.3-2.4 2.5-2.4.7 0 1.3.3 1.8.9.5-.6 1.1-.9 1.8-.9 1.2 0 2.5.8 2.5 2.4 0 2.2-3.1 4-4.3 4.6-1.2-.6-4.3-2.4-4.3-4.6z" fill="white"/>'
    : '<rect x="3" y="4.5" width="8" height="6" rx="0.6" fill="white"/><path d="M7 6v2.6M5.7 7.3h2.6" stroke="#2f6fed" stroke-width="1" stroke-linecap="round"/>';

  return L.divIcon({
    className: 'hospital-marker-icon',
    html: `<div class="hospital-pin ${cls}"><div class="hospital-pin-inner"><svg width="14" height="14" viewBox="0 0 14 14">${glyph}</svg></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
}

const transportIcon = L.divIcon({
  className: 'transport-icon',
  html: '<div class="transport-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function LiveMapPage() {
  const [hospitals, setHospitals] = useState([]);
  const [transports, setTransports] = useState([]);
  const [organs, setOrgans] = useState([]);
  const { socket, connected } = useSocket();

  useEffect(() => {
    api.get('/api/hospitals').then(({ data }) => setHospitals(data));
    api.get('/api/transports/active').then(({ data }) => setTransports(data));
    api.get('/api/organs', { params: { status: 'available' } }).then(({ data }) => setOrgans(data));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onStarted = (transport) => setTransports((prev) => [...prev, transport]);
    const onUpdate = (update) => {
      setTransports((prev) =>
        prev.map((t) =>
          t._id === update.transportId
            ? { ...t, currentLocation: update.currentLocation, status: update.status, progress: update.progress }
            : t
        )
      );
    };
    const onDelivered = ({ transportId }) => {
      setTransports((prev) => prev.filter((t) => t._id !== transportId));
    };

    socket.on('transport:started', onStarted);
    socket.on('transport:update', onUpdate);
    socket.on('transport:delivered', onDelivered);

    return () => {
      socket.off('transport:started', onStarted);
      socket.off('transport:update', onUpdate);
      socket.off('transport:delivered', onDelivered);
    };
  }, [socket]);

  const counts = useMemo(() => {
    const transplantCenters = hospitals.filter((h) => h.type?.startsWith('Transplant')).length;
    return {
      total: hospitals.length,
      transplantCenters,
      general: hospitals.length - transplantCenters,
      availableOrgans: organs.length,
      activeTransports: transports.length
    };
  }, [hospitals, organs, transports]);

  return (
    <div className="live-map-page">
      <div className="page-header">
        <h1>Live Network Map</h1>
        <p className="muted">
          Hospital nodes and simulated organ transports across the network.
          Transport movement is simulated (linear interpolation over the
          predicted ETA) for demonstration — it is not connected to a real
          GPS/vehicle tracking provider.
        </p>
      </div>

      <div className="live-map-layout">
        <aside className="map-sidebar">
          <div className="stat-card">
            <div className="stat-row">
              <span className="stat-label">
                <span className="legend-swatch transplant" /> Transplant centers
              </span>
              <span className="stat-value">{counts.transplantCenters}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">
                <span className="legend-swatch general" /> General hospitals
              </span>
              <span className="stat-value">{counts.general}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">
                <span className="legend-swatch transport" /> Active transports
              </span>
              <span className="stat-value">{counts.activeTransports}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Available organs</span>
              <span className="stat-value">{counts.availableOrgans}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Socket connection</span>
              <span className="stat-value" style={{ color: connected ? 'var(--signal-teal)' : 'var(--signal-red)' }}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <h2 style={{ marginBottom: 10 }}>In transit</h2>
            {transports.length === 0 && <p className="muted">No active transports right now.</p>}
            {transports.map((t) => (
              <div key={t._id} className="transport-list-item">
                <strong>{t.match?.organ?.organType || 'Organ'}</strong> transport
                <div className="muted">
                  {t.match?.organ?.sourceHospital?.city} → {t.match?.recipient?.hospital?.city}
                </div>
                <div className="transport-progress-track">
                  <div className="transport-progress-fill" style={{ width: `${t.progress || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="map-wrapper">
          <MapContainer center={INDIA_CENTER} zoom={5} style={{ height: '640px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {hospitals.map((h) => (
              <Marker key={h._id} position={[h.location.lat, h.location.lng]} icon={hospitalDivIcon(h.type)}>
                <Popup>
                  <div className="popup-title">{h.name}</div>
                  <div>{h.city}, {h.state}</div>
                  <span className={`popup-tag ${h.type?.startsWith('Transplant') ? 'transplant' : 'general'}`}>
                    {h.type?.startsWith('Transplant') ? 'Transplant Center' : 'General Hospital'}
                  </span>
                </Popup>
              </Marker>
            ))}

            {transports.map((t) => {
              const loc = t.currentLocation;
              if (!loc) return null;
              return (
                <div key={t._id}>
                  <Marker position={[loc.lat, loc.lng]} icon={transportIcon}>
                    <Popup>
                      <div className="popup-title">{t.match?.organ?.organType || 'Organ'} in transit</div>
                      <div>{t.progress || 0}% of the way there</div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[[t.origin.lat, t.origin.lng], [t.destination.lat, t.destination.lng]]}
                    pathOptions={{ color: '#d6394a', weight: 2, dashArray: '6 6', opacity: 0.6 }}
                  />
                </div>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
