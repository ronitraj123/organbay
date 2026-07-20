/**
 * Displays the "demonstration compatibility index" for a match, with the
 * disclaimer visible directly in the UI (not just buried in the README) --
 * so the artifact defends itself even if someone skips the docs.
 */
export default function CompatibilityBadge({ compatibilityIndex, hlaOverlapPercent }) {
  let tier = 'low';
  if (compatibilityIndex >= 75) tier = 'high';
  else if (compatibilityIndex >= 50) tier = 'medium';

  return (
    <div className={`compat-badge compat-${tier}`} title="Simplified rule-based compatibility engine using blood group and representative HLA marker matching for demonstration purposes. Not intended for clinical decision-making.">
      <div className="compat-score">{compatibilityIndex}/100</div>
      <div className="compat-label">Demonstration Compatibility Index</div>
      <div className="compat-sub">HLA marker overlap: {hlaOverlapPercent}%</div>
    </div>
  );
}
