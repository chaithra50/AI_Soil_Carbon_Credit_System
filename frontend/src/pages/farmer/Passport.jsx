import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api/axiosClient.js';

export default function Passport() {
  const [cycle, setCycle] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/passport/generate', {});
      setCycle(data.cycle);
      setQrPayload(JSON.stringify({
        cycleId: data.cycle._id,
        creditsEarned: data.cycle.score.creditsEarned,
        chainStatus: data.cycle.chain.status,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate passport');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 640 }}>
      <h2>Digital Carbon Passport</h2>
      <p style={{ color: 'var(--sage)' }}>
        Generates a score from your active baseline/completion pair. Once scored, that cycle is closed and a new one begins with your next baseline.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {!cycle && (
        <button className="primary" onClick={generate} disabled={loading}>
          {loading ? 'Scoring…' : 'Generate Passport'}
        </button>
      )}

      {cycle && (
        <div className="plot-card" style={{ marginTop: '1.5rem' }}>
          <div className="eyebrow">{cycle.score.direction}</div>
          <h3 style={{ fontSize: '2.2rem', margin: '0 0 0.2rem' }}>{cycle.score.score} / 100</h3>
          <p style={{ marginBottom: '0.4rem' }}>{cycle.score.explanation}</p>

          <div className="grid cols-3" style={{ margin: '1rem 0' }}>
            <div>
              <div className="eyebrow">Carbon stored</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{cycle.score.carbonStoredTons} t CO2e</div>
            </div>
            <div>
              <div className="eyebrow">Credits earned</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--wheat)' }}>{cycle.score.creditsEarned}</div>
            </div>
            <div>
              <div className="eyebrow">Confidence</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{Math.round(cycle.score.confidence * 100)}%</div>
            </div>
          </div>

          <div className={`badge ${cycle.chain.status === 'confirmed' ? 'ok' : 'off'}`} style={{ marginBottom: '1rem' }}>
            chain: {cycle.chain.status}
          </div>

          {qrPayload && (
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--paper-dim)', borderRadius: 4 }}>
              <QRCodeSVG value={qrPayload} size={180} />
              <p style={{ fontSize: '0.8rem', color: 'var(--sage)', marginTop: '0.6rem', marginBottom: 0 }}>Scan to verify this passport</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
