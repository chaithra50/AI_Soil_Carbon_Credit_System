import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../api/axiosClient.js';

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/history').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="container" style={{ padding: '2rem 1.5rem' }}>Loading…</div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Analytics</h2>

      <div className="grid cols-3" style={{ marginBottom: '1.5rem' }}>
        <div className="plot-card">
          <div className="eyebrow">Completed cycles</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>{data.totalCycles}</div>
        </div>
        <div className="plot-card">
          <div className="eyebrow">Credits available</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: 'var(--wheat)' }}>{data.totalCredits}</div>
        </div>
        <div className="plot-card">
          <div className="eyebrow">Avg. score</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>
            {data.chartData.length ? Math.round(data.chartData.reduce((s, c) => s + c.score, 0) / data.chartData.length) : 0}
          </div>
        </div>
      </div>

      <div className="plot-card" style={{ marginBottom: '1.5rem', height: 320 }}>
        <h3>Score &amp; credits per cycle</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data.chartData}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="cycleNumber" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#4B6043" name="Score" strokeWidth={2} />
            <Line type="monotone" dataKey="creditsEarned" stroke="#C9A227" name="Credits" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="plot-card">
        <h3>Cycle log</h3>
        {data.chartData.length === 0 && <p style={{ color: 'var(--sage)' }}>No completed cycles yet.</p>}
        {data.chartData.map((c) => (
          <div key={c.cycleNumber} style={{ borderBottom: '1px solid var(--border)', padding: '0.6rem 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>Cycle {c.cycleNumber} · <span className="mono">{new Date(c.completedAt).toLocaleDateString()}</span></span>
            <span>
              <span className="badge" style={{ marginRight: '0.5rem', textTransform: 'capitalize' }}>{c.direction}</span>
              {c.creditsEarned} credits
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
