const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');

const LOCAL_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'documents');
fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Stores a document buffer. Tries Web3.Storage, then Pinata, then falls back
 * to local disk. The SHA-256 hash is always computed regardless of backend,
 * and it is that hash - not the file bytes - that goes into the database.
 *
 * @returns {{ backend: string, cid: string|null, localPath: string|null, sha256: string }}
 */
async function storeDocument(buffer, originalFilename) {
  const hash = sha256(buffer);

  if (env.WEB3_STORAGE_TOKEN) {
    try {
      const { Web3Storage, File } = require('web3.storage');
      const client = new Web3Storage({ token: env.WEB3_STORAGE_TOKEN });
      const file = new File([buffer], originalFilename);
      const cid = await client.put([file], { wrapWithDirectory: false });
      return { backend: 'ipfs_web3storage', cid, localPath: null, sha256: hash };
    } catch (err) {
      console.error(`[ipfs:web3storage] upload failed, trying next fallback: ${err.message}`);
    }
  }

  if (env.PINATA_JWT) {
    try {
      const form = new (require('form-data'))();
      form.append('file', buffer, originalFilename);
      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
        headers: { Authorization: `Bearer ${env.PINATA_JWT}`, ...form.getHeaders() },
        maxBodyLength: Infinity,
      });
      return { backend: 'ipfs_pinata', cid: res.data.IpfsHash, localPath: null, sha256: hash };
    } catch (err) {
      console.error(`[ipfs:pinata] upload failed, falling back to local disk: ${err.message}`);
    }
  }

  // Local fallback: always works, zero external dependency.
  const safeName = `${hash}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const localPath = path.join(LOCAL_STORAGE_DIR, safeName);
  fs.writeFileSync(localPath, buffer);
  return { backend: 'local_fallback', cid: null, localPath, sha256: hash };
}

module.exports = {
  storeDocument,
  sha256,
  isConfigured: () => env.flags.ipfsConfigured,
};
