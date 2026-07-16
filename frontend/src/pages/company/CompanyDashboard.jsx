import React, { useEffect, useState } from 'react';
import { api } from '../../api/axiosClient.js';

export default function CompanyDashboard() {
  const [dash, setDash] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/company/dashboard');
    setDash(data);
    setProfileForm({
      companyName: data.profile.companyName || '',
      industry: data.profile.industry || '',
      registrationNumber: data.profile.registrationNumber || '',
      address: data.profile.address || '',
      carbonCreditRequirement: data.profile.carbonCreditRequirement || 0,
    });
  }

  useEffect(() => { load(); }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/company/me', profileForm);
      load();
    } finally {
      setSaving(false);
    }
  }

  if (!dash) return <div className="container" style={{ padding: '2rem 1.5rem' }}>Loading…</div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Company Dashboard</h2>

      <div className="grid cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="plot-card">
          <div className="eyebrow">Credits owned</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: 'var(--wheat)' }}>{dash.totals.creditsOwned}</div>
        </div>
        <div className="plot-card">
          <div className="eyebrow">Total spend</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>₹{dash.totals.totalSpend}</div>
        </div>
      </div>

      <div className="plot-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Profile</h3>
        <form onSubmit={saveProfile}>
          <div className="grid cols-2">
            <div className="field">
              <label>Company name</label>
              <input value={profileForm.companyName} onChange={(e) => setProfileForm((f) => ({ ...f, companyName: e.target.value }))} />
            </div>
            <div className="field">
              <label>Industry</label>
              <input value={profileForm.industry} onChange={(e) => setProfileForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="field">
              <label>Registration number</label>
              <input value={profileForm.registrationNumber} onChange={(e) => setProfileForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
            </div>
            <div className="field">
              <label>Annual credit requirement</label>
              <input type="number" value={profileForm.carbonCreditRequirement} onChange={(e) => setProfileForm((f) => ({ ...f, carbonCreditRequirement: Number(e.target.value) }))} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input value={profileForm.address} onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <button className="primary" type="submit" disabled={saving}>Save profile</button>
        </form>
      </div>

      <div className="plot-card">
        <h3>Purchase history</h3>
        {dash.purchaseHistory.length === 0 && <p style={{ color: 'var(--sage)' }}>No purchases yet.</p>}
        {dash.purchaseHistory.map((p) => (
          <div key={p.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.6rem 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>{p.creditsPurchased} credits from {p.farmer?.fullName || 'farmer'} — ₹{p.totalPaidINR}</span>
            <span>
              <span className={`badge ${p.chainStatus === 'confirmed' ? 'ok' : 'off'}`} style={{ marginRight: '0.5rem' }}>{p.chainStatus}</span>
              {p.verifyOnChainUrl && <a href={p.verifyOnChainUrl} target="_blank" rel="noreferrer">Verify on-chain</a>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
