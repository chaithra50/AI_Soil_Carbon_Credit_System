import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import * as turf from '@turf/turf';
import { api } from '../../api/axiosClient.js';

const CROP_METHOD_FALLBACK = { crops: [], methods: [] };

export default function FarmMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const drawnLayer = useRef(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [areaHectares, setAreaHectares] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [options, setOptions] = useState(CROP_METHOD_FALLBACK);
  const [agriForm, setAgriForm] = useState({ cropType: '', farmingMethod: '', soilType: '', irrigationMethod: '', previousCrop: '' });

  useEffect(() => {
    api.get('/farmer/scoring-options').then(({ data }) => setOptions(data)).catch(() => {});
    api.get('/farmer/me').then(({ data }) => {
      if (data.farmer.agriculture) {
        setAgriForm((f) => ({ ...f, ...data.farmer.agriculture }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // India center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayer.current = drawnItems;

    const drawControl = new L.Control.Draw({
      draw: { polygon: true, marker: false, circle: false, circlemarker: false, polyline: false, rectangle: false },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      computeArea(e.layer);
    });
    map.on(L.Draw.Event.EDITED, (e) => {
      e.layers.eachLayer((layer) => computeArea(layer));
    });

    mapInstance.current = map;
  }, []);

  function computeArea(layer) {
    const geojson = layer.toGeoJSON();
    const areaM2 = turf.area(geojson);
    setAreaHectares(Math.round((areaM2 / 10000) * 100) / 100);
  }

  async function searchLocation(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`);
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        mapInstance.current.setView([Number(lat), Number(lon)], 15);
      } else {
        setMessage({ type: 'error', text: 'Location not found' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Location search failed' });
    } finally {
      setSearching(false);
    }
  }

  async function saveBoundary() {
    const layers = drawnLayer.current.getLayers();
    if (layers.length === 0) {
      setMessage({ type: 'error', text: 'Draw a farm boundary on the map first' });
      return;
    }
    const geojson = layers[0].toGeoJSON();
    const coords = geojson.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
    const centroid = turf.centroid(geojson).geometry.coordinates;

    setSaving(true);
    setMessage(null);
    try {
      await api.put('/farmer/me/boundary', {
        boundary: coords,
        areaHectares,
        centroid: { lat: centroid[1], lng: centroid[0] },
      });
      setMessage({ type: 'ok', text: `Boundary saved — ${areaHectares} hectares.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save boundary' });
    } finally {
      setSaving(false);
    }
  }

  async function saveAgriculture(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/farmer/me', { agriculture: agriForm });
      setMessage({ type: 'ok', text: 'Agriculture details saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2>Farm Map</h2>
      {message && <div className={message.type === 'ok' ? 'badge ok' : 'error-banner'} style={{ display: 'block', padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>{message.text}</div>}

      <form onSubmit={searchLocation} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input placeholder="Search village or town…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="ghost" type="submit" disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
      </form>

      <div ref={mapRef} style={{ height: 420, borderRadius: 4, border: '1px solid var(--border)', marginBottom: '1rem' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="badge">{areaHectares > 0 ? `${areaHectares} hectares drawn` : 'No boundary drawn yet'}</div>
        <button className="primary" onClick={saveBoundary} disabled={saving}>Save boundary</button>
      </div>

      <div className="plot-card">
        <h3>Agriculture details</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>
          Crop and method must match the scoring engine's recognized values.
        </p>
        <form onSubmit={saveAgriculture}>
          <div className="grid cols-3">
            <div className="field">
              <label>Crop type</label>
              <select value={agriForm.cropType} onChange={(e) => setAgriForm((f) => ({ ...f, cropType: e.target.value }))} required>
                <option value="">Select…</option>
                {options.crops.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Farming method</label>
              <select value={agriForm.farmingMethod} onChange={(e) => setAgriForm((f) => ({ ...f, farmingMethod: e.target.value }))} required>
                <option value="">Select…</option>
                {options.methods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Soil type</label>
              <input value={agriForm.soilType} onChange={(e) => setAgriForm((f) => ({ ...f, soilType: e.target.value }))} />
            </div>
            <div className="field">
              <label>Irrigation method</label>
              <input value={agriForm.irrigationMethod} onChange={(e) => setAgriForm((f) => ({ ...f, irrigationMethod: e.target.value }))} />
            </div>
            <div className="field">
              <label>Previous crop</label>
              <input value={agriForm.previousCrop} onChange={(e) => setAgriForm((f) => ({ ...f, previousCrop: e.target.value }))} />
            </div>
          </div>
          <button className="primary" type="submit" disabled={saving}>Save agriculture details</button>
        </form>
      </div>
    </div>
  );
}
