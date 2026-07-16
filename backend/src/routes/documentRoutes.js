const express = require('express');
const multer = require('multer');
const Farmer = require('../models/Farmer');
const Document = require('../models/Document');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const ipfsService = require('../services/ipfsService');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const VALID_TYPES = ['aadhaar', 'land_ownership', 'farm_image', 'crop_image'];

router.post('/upload', upload.single('file'), async (req, res) => {
  const { docType } = req.body;
  if (!VALID_TYPES.includes(docType)) throw ApiError.badRequest(`docType must be one of: ${VALID_TYPES.join(', ')}`);
  if (!req.file) throw ApiError.badRequest('file is required (multipart field "file")');

  const farmer = await Farmer.findOne({ user: req.user.id });
  if (!farmer) throw ApiError.notFound('Farmer profile not found');

  const stored = await ipfsService.storeDocument(req.file.buffer, req.file.originalname);

  const doc = await Document.create({
    farmer: farmer._id,
    docType,
    originalFilename: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    sha256: stored.sha256,
    storage: { backend: stored.backend, cid: stored.cid, localPath: stored.localPath },
  });

  farmer.documents.push(doc._id);
  await farmer.save();

  res.status(201).json({
    success: true,
    document: {
      id: doc._id,
      docType: doc.docType,
      backend: doc.storage.backend,
      cid: doc.storage.cid,
      sha256: doc.sha256,
    },
    ipfsConfigured: ipfsService.isConfigured(),
  });
});

router.get('/mine', async (req, res) => {
  const farmer = await Farmer.findOne({ user: req.user.id }).populate('documents');
  if (!farmer) throw ApiError.notFound('Farmer profile not found');
  res.json({ success: true, documents: farmer.documents });
});

module.exports = router;
