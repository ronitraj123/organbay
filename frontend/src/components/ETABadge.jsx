export default function ETABadge({ minutes, source, distanceKm }) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  const display = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="eta-badge" title={source === 'fallback-haversine' ? 'ML service was unreachable; showing a distance-based fallback estimate.' : 'Predicted by the OrganBay ML transport-ETA model (logistics prediction only, not a clinical tool).'}>
      <div className="eta-value">{display}</div>
      <div className="eta-sub">{distanceKm} km · {source === 'ml-service' ? 'ML predicted' : 'fallback estimate'}</div>
    </div>
  );
}
