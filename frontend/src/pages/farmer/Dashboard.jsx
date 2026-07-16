import React, { useEffect, useState } from 'react';
import { api } from '../../api/axiosClient.js';
import { connectSocket, disconnectSocket } from '../../socket/socketClient.js';
import CycleTracker from '../../components/CycleTracker.jsx';
import ReadingForm from '../../components/ReadingForm.jsx';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('baseline');

  async function loadStatus() {
    const { data } = await api.get('/readings/cycle-status');
    setStatus(data);
  }

  useEffect(() => {
    loadStatus();
    api.get('/readings?limit=15').then(({ data }) => setFeed(data.readings)).catch(() => {});

    const socket = connectSocket();
    socket.on('reading:new', (reading) => setFeed((f) => [reading, ...f].slice(0, 15)));
    socket.on('cycle:scored', () => loadStatus());
    socket.on('verification:decision', (payload) => {
      setFeed((f) => [{ _id: 'notif-' + Date.now(), readingType: 'notice', metrics: {}, recordedAt: new Date(), note: `Verification ${payload.decision}` }, ...f]);
    });

    return () => disconnectSocket();
  }, []);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Dashboard</h2>

      <div className="plot-card" style={{ marginBottom: '1.5rem' }}>
        {status && <CycleTracker hasBaseline={status.hasActiveBaseline} hasCompletion={status.hasActiveCompletion} />}
        <p style={{ fontSize: '0.85rem', color: 'var(--sage)', marginBottom: 0 }}>
          {status?.readyToScore
            ? 'Both readings are logged — head to the Passport page to score this cycle.'
            : status?.hasActiveBaseline
            ? 'Baseline logged. Log a completion reading when the cycle finishes.'
            : 'Log a baseline reading to start a new cycle.'}
        </p>
      </div>

      <div className="grid cols-2">
        <div className="plot-card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className={tab === 'baseline' ? 'primary' : 'ghost'} onClick={() => setTab('baseline')} disabled={status?.hasActiveBaseline}>Baseline</button>
            <button className={tab === 'completion' ? 'primary' : 'ghost'} onClick={() => setTab('completion')} disabled={!status?.hasActiveBaseline || status?.hasActiveCompletion}>Completion</button>
            <button className={tab === 'routine' ? 'primary' : 'ghost'} onClick={() => setTab('routine')}>Routine</button>
          </div>
          <ReadingForm readingType={tab} onLogged={loadStatus} />
        </div>

        <div className="plot-card">
          <h3>Live feed</h3>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {feed.length === 0 && <p style={{ color: 'var(--sage)' }}>No readings yet.</p>}
            {feed.map((r) => (
              <div key={r._id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0', fontSize: '0.85rem' }}>
                <span className="badge" style={{ marginRight: '0.5rem', textTransform: 'capitalize' }}>{r.readingType}</span>
                <span className="mono" style={{ color: 'var(--sage)' }}>{new Date(r.recordedAt).toLocaleString()}</span>
                {r.metrics?.soilOrganicCarbon != null && <div>SOC: {r.metrics.soilOrganicCarbon}%</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
