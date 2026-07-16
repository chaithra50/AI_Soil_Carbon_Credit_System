import React, { useState } from 'react';
import { api } from '../api/axiosClient.js';

const FIELDS = [
  ['soilMoisture', 'Soil Moisture (%)'],
  ['temperature', 'Temperature (°C)'],
  ['humidity', 'Humidity (%)'],
  ['soilOrganicCarbon', 'Soil Organic Carbon (%)'],
  ['ph', 'pH'],
  ['nitrogen', 'Nitrogen (mg/kg)'],
  ['phosphorus', 'Phosphorus (mg/kg)'],
  ['potassium', 'Potassium (mg/kg)'],
];

export default function ReadingForm({ readingType, onLogged }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const metrics = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)])
      );
      const { data } = await api.post('/readings', { readingType, metrics, fetchWeather: true });
      setValues({});
      onLogged?.(data.reading);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log reading');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h3 style={{ textTransform: 'capitalize' }}>{readingType} reading</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="grid cols-3">
        {FIELDS.map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input
              type="number"
              step="any"
              value={values[key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? 'Logging…' : `Log ${readingType} reading`}
      </button>
    </form>
  );
}
