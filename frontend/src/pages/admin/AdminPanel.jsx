import React, { useEffect, useState } from 'react';
import { api } from '../../api/axiosClient.js';

export default function AdminPanel() {
  const [queue, setQueue] = useState([]);
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState(null);

  async function load() {
    const { data } = await api.get('/admin/farmers/pending');
    setQueue(data.queue);
  }

  useEffect(() => { load(); }, []);

  async function decide(userId, decision) {
    const reason = reasons[userId] || '';
    if (decision === 'rejected' && !reason.trim()) {
      setMessage({ type: 'error', text: 'A reason is required to reject.' });
      return;
    }
    try {
      await api.post(`/admin/farmers/${userId}/decision`, { decision, reason });
      setMessage({ type: 'ok', text: `Farmer ${decision}.` });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Admin Panel — Pending Verification</h2>
      {message && <div className={message.type === 'ok' ? 'badge ok' : 'error-banner'} style={{ display: 'block', padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>{message.text}</div>}

      {queue.length === 0 && <p style={{ color: 'var(--sage)' }}>No farmers pending verification.</p>}

      <div className="grid cols-2">
        {queue.map(({ user, profile }) => (
          <div className="plot-card" key={user.id}>
            <div className="eyebrow">{user.email}</div>
            <h3>{profile?.fullName || 'Unnamed farmer'}</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Farm: {profile?.farm?.village || '—'}, {profile?.farm?.district || '—'} · {profile?.farm?.areaHectares || 0} ha<br />
              Crop: {profile?.agriculture?.cropType || '—'} · Method: {profile?.agriculture?.farmingMethod || '—'}<br />
              Documents: {profile?.documents?.length || 0}
            </p>
            <div className="field">
              <label>Reason (required if rejecting)</label>
              <input value={reasons[user.id] || ''} onChange={(e) => setReasons((r) => ({ ...r, [user.id]: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="primary" onClick={() => decide(user.id, 'approved')}>Approve</button>
              <button className="ghost" onClick={() => decide(user.id, 'rejected')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
