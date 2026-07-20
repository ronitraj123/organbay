import CompatibilityBadge from './CompatibilityBadge.jsx';
import ETABadge from './ETABadge.jsx';

export default function MatchCard({ match, onAccept, onReject, actionable }) {
  const { organ, recipient } = match;

  return (
    <div className="match-card">
      <div className="match-card-header">
        <div>
          <strong>{organ?.organType}</strong> · {organ?.bloodType}
          <div className="muted">from {organ?.sourceHospital?.name}</div>
        </div>
        <div className="arrow">→</div>
        <div>
          <strong>{recipient?.displayId}</strong> · {recipient?.bloodType}
          <div className="muted">at {recipient?.hospital?.name}</div>
          <div className="muted">Urgency: {recipient?.urgencyScore}/100</div>
        </div>
      </div>

      <div className="match-card-badges">
        <CompatibilityBadge
          compatibilityIndex={match.compatibilityIndex}
          hlaOverlapPercent={match.hlaOverlapPercent}
        />
        <ETABadge
          minutes={match.predictedEtaMinutes}
          source={match.etaSource}
          distanceKm={match.distanceKm}
        />
      </div>

      {match.emergencyMatch && <div className="tag tag-emergency">Emergency mode match</div>}

      <div className="match-card-status">Status: {match.status}</div>

      {actionable && match.status === 'proposed' && (
        <div className="match-card-actions">
          <button className="btn-accept" onClick={() => onAccept(match._id)}>Accept</button>
          <button className="btn-reject" onClick={() => onReject(match._id)}>Reject</button>
        </div>
      )}
    </div>
  );
}
