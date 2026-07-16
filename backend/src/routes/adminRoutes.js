const express = require('express');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// Queue of farmers pending verification, with profile joined in.
router.get('/farmers/pending', async (req, res) => {
  const pendingUsers = await User.find({ role: 'farmer', verificationStatus: 'pending' }).sort({ createdAt: 1 });
  const farmerIds = pendingUsers.map((u) => u._id);
  const profiles = await Farmer.find({ user: { $in: farmerIds } });
  const profileByUser = new Map(profiles.map((p) => [p.user.toString(), p]));

  const queue = pendingUsers.map((u) => ({
    user: u.toSafeJSON(),
    profile: profileByUser.get(u._id.toString()) || null,
  }));

  res.json({ success: true, queue });
});

router.get('/farmers', async (req, res) => {
  const { status } = req.query;
  const filter = { role: 'farmer' };
  if (status) filter.verificationStatus = status;
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, farmers: users.map((u) => u.toSafeJSON()) });
});

router.post('/farmers/:userId/decision', async (req, res) => {
  const { decision, reason } = req.body; // decision: 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(decision)) throw ApiError.badRequest('decision must be approved or rejected');
  if (decision === 'rejected' && !reason) throw ApiError.badRequest('reason is required when rejecting');

  const user = await User.findById(req.params.userId);
  if (!user || user.role !== 'farmer') throw ApiError.notFound('Farmer not found');

  user.verificationStatus = decision;
  user.verificationReason = reason || null;
  await user.save();

  const notification = await Notification.create({
    user: user._id,
    type: decision === 'approved' ? 'verification_approved' : 'verification_rejected',
    message: decision === 'approved' ? 'Your farmer profile has been approved.' : `Your farmer profile was rejected: ${reason}`,
  });

  const io = req.app.get('io');
  if (io) io.to(`user:${user._id}`).emit('verification:decision', { decision, reason: reason || null });

  const emailResult = await sendNotificationEmail(user.email, notification.type, notification.message);
  notification.emailSent = emailResult.status === 'sent';
  await notification.save();

  res.json({ success: true, user: user.toSafeJSON() });
});

module.exports = router;
