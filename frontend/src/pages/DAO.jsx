import React, { useEffect, useState } from 'react';
import { api } from '../api/axiosClient.js';
import { connectSocket } from '../socket/socketClient.js';

export default function DAO() {
  const [proposals, setProposals] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', votingDays: 7 });
  const [message, setMessage] = useState(null);

  async function load() {
    const { data } = await api.get('/dao/proposals');
    setProposals(data.proposals);
  }

  useEffect(() => {
    load();
    const socket = connectSocket();
    socket.emit('dao:join');
    socket.on('proposal:created', () => load());
    socket.on('proposal:vote', () => load());
  }, []);

  async function createProposal(e) {
    e.preventDefault();
    try {
      await api.post('/dao/proposals', form);
      setForm({ title: '', description: '', votingDays: 7 });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not create proposal' });
    }
  }

  async function vote(id, choice) {
    try {
      await api.post(`/dao/proposals/${id}/vote`, { choice });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Vote failed' });
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>DAO Governance</h2>
      {message && <div className="error-banner">{message.text}</div>}

      <div className="plot-card" style={{ marginBottom: '1.5rem' }}>
        <h3>New proposal</h3>
        <form onSubmit={createProposal}>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label>Voting days</label>
            <input type="number" min={1} value={form.votingDays} onChange={(e) => setForm((f) => ({ ...f, votingDays: Number(e.target.value) }))} />
          </div>
          <button className="primary" type="submit">Create proposal</button>
        </form>
      </div>

      <div className="grid cols-2">
        {proposals.map((p) => (
          <div className="plot-card" key={p._id}>
            <div className="eyebrow">
              {p.status === 'open' ? `Voting closes ${new Date(p.votingClosesAt).toLocaleDateString()}` : `Closed · ${p.result}`}
            </div>
            <h3>{p.title}</h3>
            <p style={{ fontSize: '0.9rem' }}>{p.description}</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge ok">Yes {p.yesCount}</span>
              <span className="badge off">No {p.noCount}</span>
              {p.status === 'open' && (
                <>
                  <button className="primary" onClick={() => vote(p._id, 'yes')}>Vote Yes</button>
                  <button className="ghost" onClick={() => vote(p._id, 'no')}>Vote No</button>
                </>
              )}
            </div>
            <div className={`badge ${p.chain.status === 'confirmed' ? 'ok' : 'off'}`} style={{ marginTop: '0.6rem' }}>chain: {p.chain.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
