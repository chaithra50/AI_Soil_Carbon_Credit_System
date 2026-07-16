import React from 'react';

export default function CycleTracker({ hasBaseline, hasCompletion }) {
  return (
    <div className="cycle-rail">
      <div className={`cycle-stamp ${hasBaseline ? 'done' : ''}`}>
        <div className="dot">{hasBaseline ? '✓' : '1'}</div>
        <div className="label">Baseline</div>
      </div>
      <div className={`cycle-line ${hasBaseline ? 'done' : ''}`} />
      <div className={`cycle-stamp ${hasCompletion ? 'done' : ''}`}>
        <div className="dot">{hasCompletion ? '✓' : '2'}</div>
        <div className="label">Completion</div>
      </div>
      <div className={`cycle-line ${hasCompletion ? 'done' : ''}`} />
      <div className={`cycle-stamp ${hasBaseline && hasCompletion ? 'done' : ''}`}>
        <div className="dot">{hasBaseline && hasCompletion ? '✓' : '3'}</div>
        <div className="label">Score</div>
      </div>
    </div>
  );
}
