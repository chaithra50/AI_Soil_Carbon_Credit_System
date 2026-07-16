import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/axiosClient.js';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState(location.state?.devOtp || '');
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(
    location.state?.email && !location.state?.devOtp
      ? 'Check your email for your 6-digit code.'
      : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/verify-otp', { email, code });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    setDevOtp(null);
    try {
      const { data } = await api.post('/auth/resend-otp', { email });
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setCode(data.devOtp);
        setInfo(null);
      } else {
        setInfo('New code sent to your email.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend code');
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, padding: '3rem 1.5rem' }}>
      <h2>Verify your email</h2>

      {devOtp && (
        <div
          style={{
            background: 'rgba(201,162,39,0.14)',
            border: '1px solid rgba(201,162,39,0.4)',
            borderRadius: 'var(--radius)',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <strong>Email isn't configured on this server</strong> — here's your code directly,
          no inbox needed. It's also pre-filled below.
          <div
            className="mono"
            style={{
              fontSize: '1.4rem',
              letterSpacing: '0.3em',
              textAlign: 'center',
              margin: '0.6rem 0 0.2rem',
              color: 'var(--moss-dark)',
              fontWeight: 600,
            }}
          >
            {devOtp}
          </div>
        </div>
      )}

      {info && <p style={{ color: 'var(--sage)', fontSize: '0.9rem' }}>{info}</p>}
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>6-digit code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            style={{ letterSpacing: '0.3em', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', textAlign: 'center' }}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={submitting} style={{ width: '100%', marginBottom: '0.75rem' }}>
          {submitting ? 'Verifying…' : 'Verify'}
        </button>
        <button className="ghost" type="button" onClick={resend} style={{ width: '100%' }}>
          Resend code
        </button>
      </form>
    </div>
  );
}
