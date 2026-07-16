import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/axiosClient.js';

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(params.get('role') === 'company' ? 'company' : 'farmer');
  const [form, setForm] = useState({ email: '', password: '', phone: '', fullName: '', companyName: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/register', { ...form, role });
      navigate('/verify-otp', { state: { email: form.email, devOtp: data.devOtp } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480, padding: '3rem 1.5rem' }}>
      <h2>Create your account</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className={role === 'farmer' ? 'primary' : 'ghost'} onClick={() => setRole('farmer')} type="button" style={{ flex: 1 }}>
          👨‍🌾 Farmer
        </button>
        <button className={role === 'company' ? 'primary' : 'ghost'} onClick={() => setRole('company')} type="button" style={{ flex: 1 }}>
          🏢 Company
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={submit}>
        {role === 'farmer' ? (
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
          </div>
        ) : (
          <div className="field">
            <label>Company name</label>
            <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} required />
        </div>
        <button className="primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Creating…' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
