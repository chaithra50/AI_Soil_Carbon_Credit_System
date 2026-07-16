import React, { useEffect, useState } from 'react';
import { api } from '../../api/axiosClient.js';

const DOC_TYPES = [
  ['aadhaar', 'Aadhaar Card'],
  ['land_ownership', 'Land Ownership Document'],
  ['farm_image', 'Farm Image'],
  ['crop_image', 'Crop Image'],
];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [message, setMessage] = useState(null);

  async function load() {
    const { data } = await api.get('/documents/mine');
    setDocuments(data.documents);
  }

  useEffect(() => { load(); }, []);

  async function upload(docType, file) {
    if (!file) return;
    setUploading(docType);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      const { data } = await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage({
        type: 'ok',
        text: data.ipfsConfigured
          ? `Uploaded to IPFS (${data.document.backend}).`
          : `IPFS not configured — stored locally with hash ${data.document.sha256.slice(0, 12)}…`,
      });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 720 }}>
      <h2>Documents</h2>
      <p style={{ color: 'var(--sage)' }}>Only the file hash is stored in our database — files go to IPFS when configured, or local encrypted storage otherwise.</p>
      {message && <div className={message.type === 'ok' ? 'badge ok' : 'error-banner'} style={{ display: 'block', padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>{message.text}</div>}

      <div className="grid cols-2">
        {DOC_TYPES.map(([type, label]) => {
          const existing = documents.filter((d) => d.docType === type);
          return (
            <div className="plot-card" key={type}>
              <h3>{label}</h3>
              <input type="file" accept="image/*,.pdf" onChange={(e) => upload(type, e.target.files[0])} disabled={uploading === type} />
              {uploading === type && <p style={{ fontSize: '0.85rem' }}>Uploading…</p>}
              {existing.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  {existing.map((d) => (
                    <div key={d._id} className="badge ok" style={{ marginRight: '0.4rem', marginBottom: '0.3rem' }}>
                      {d.originalFilename} · {d.storage.backend}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
