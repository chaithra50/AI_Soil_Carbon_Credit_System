import React, { useEffect, useState } from 'react';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Marketplace() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState(null);
  const [buyAmounts, setBuyAmounts] = useState({});
  const [myCycles, setMyCycles] = useState([]);
  const [listForm, setListForm] = useState({});

  async function load() {
    const { data } = await api.get('/marketplace/listings');
    setListings(data.listings);
  }

  async function loadMyCycles() {
    if (user?.role !== 'farmer') return;
    const { data } = await api.get('/analytics/history');
    setMyCycles(data.cycles.filter((c) => !c.listedOnMarketplace && c.score.creditsEarned > 0));
  }

  useEffect(() => { load(); loadMyCycles(); }, [user]);

  async function createListing(cycleId) {
    const price = Number(listForm[cycleId] || 0);
    if (price <= 0) return;
    try {
      await api.post('/marketplace/listings', { cycleId, pricePerCreditINR: price });
      setMessage({ type: 'ok', text: 'Listing created.' });
      load();
      loadMyCycles();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not create listing' });
    }
  }


  async function buy(listingId) {
    const credits = Number(buyAmounts[listingId] || 0);
    if (credits <= 0) return;
    setMessage(null);
    try {
      await api.post(`/marketplace/listings/${listingId}/buy`, { credits });
      setMessage({ type: 'ok', text: `Purchased ${credits} credits.` });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Purchase failed' });
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Marketplace</h2>
      {message && <div className={message.type === 'ok' ? 'badge ok' : 'error-banner'} style={{ display: 'block', padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>{message.text}</div>}

      {user?.role === 'farmer' && myCycles.length > 0 && (
        <div className="plot-card" style={{ marginBottom: '1.5rem' }}>
          <h3>List your credits</h3>
          {myCycles.map((c) => (
            <div key={c._id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
              <span style={{ flex: 1, fontSize: '0.9rem' }}>{c.score.creditsEarned} credits · score {c.score.value}</span>
              <input
                type="number"
                min={1}
                placeholder="₹ per credit"
                style={{ width: 120 }}
                value={listForm[c._id] || ''}
                onChange={(e) => setListForm((f) => ({ ...f, [c._id]: e.target.value }))}
              />
              <button className="primary" onClick={() => createListing(c._id)}>List</button>
            </div>
          ))}
        </div>
      )}

      <h3>Browse listings</h3>
      <div className="grid cols-3">
        {listings.length === 0 && <p style={{ color: 'var(--sage)' }}>No active listings right now.</p>}
        {listings.map((l) => (
          <div className="plot-card" key={l._id}>
            <div className="eyebrow">{l.farmer?.farm?.district || 'Farm'}, {l.farmer?.farm?.state || ''}</div>
            <h3>{l.farmer?.fullName || 'Farmer'}</h3>
            <p style={{ fontSize: '0.9rem' }}>
              <span className="mono">{l.creditsRemaining}</span> / {l.creditsTotal} credits remaining
              <br />₹{l.pricePerCreditINR} / credit
            </p>
            {user?.role === 'company' && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="number"
                  min={1}
                  max={l.creditsRemaining}
                  placeholder="Credits"
                  value={buyAmounts[l._id] || ''}
                  onChange={(e) => setBuyAmounts((b) => ({ ...b, [l._id]: e.target.value }))}
                />
                <button className="gold" onClick={() => buy(l._id)}>Buy</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
