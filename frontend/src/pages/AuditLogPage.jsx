import { useEffect, useState } from 'react';
import api from '../api/api.js';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/api/audit-logs').then(({ data }) => setLogs(data));
  }, []);

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h1>Audit Log</h1>
      </div>

      {logs.length === 0 && <p className="muted">No actions recorded yet.</p>}

      <ul className="audit-timeline">
        {logs.map((log) => (
          <li key={log._id} className="audit-item">
            <div className="audit-time">{new Date(log.timestamp).toLocaleString()}</div>
            <div className="audit-action">{log.action.replaceAll('_', ' ')}</div>
            <div className="audit-actor">
              {log.actorName}{log.actorHospital?.name ? ` · ${log.actorHospital.name}` : ''}
              {log.targetType ? ` · ${log.targetType}` : ''}
            </div>
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="audit-meta">{JSON.stringify(log.metadata)}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
