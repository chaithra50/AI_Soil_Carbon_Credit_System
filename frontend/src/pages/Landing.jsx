import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  ['Map your farm', 'Draw your farm boundary on an interactive map — area is calculated automatically.'],
  ['Log a baseline', 'Record soil and crop conditions before you start farming this cycle.'],
  ['Farm the cycle', 'Grow as you normally would. Optional day-to-day readings feed your live dashboard.'],
  ['Log completion', 'Record the same readings once the cycle finishes.'],
  ['Get your passport', 'The scoring engine compares baseline to completion and issues a Digital Carbon Passport with credits you can sell.'],
];

export default function Landing() {
  return (
    <div>
      <section className="container" style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center' }}>
        <div className="eyebrow">Carbon credits, measured in two readings</div>
        <h1>Farmland carbon,<br />ledgered honestly.</h1>
        <p style={{ maxWidth: 560, margin: '0 auto 2rem', fontSize: '1.05rem', color: 'var(--sage)' }}>
          No rolling averages, no black-box AI score. One reading before you farm,
          one after — a transparent formula turns the difference into verified
          carbon credits companies can buy.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/register?role=farmer"><button className="primary">I'm a Farmer</button></Link>
          <Link to="/register?role=company"><button className="gold">I'm a Company</button></Link>
        </div>
      </section>

      <section className="container" style={{ padding: '2rem 1.5rem 5rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>How a cycle works</h2>
        <div className="grid cols-3">
          {STEPS.map(([title, body], i) => (
            <div className="plot-card" key={title}>
              <div className="eyebrow">Step {i + 1}</div>
              <h3>{title}</h3>
              <p style={{ marginBottom: 0, fontSize: '0.9rem' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
