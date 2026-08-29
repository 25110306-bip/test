const express = require('express');
const { z } = require('zod');
const Artist = require('../models/Artist');
const User = require('../models/User');
const Vote = require('../models/Vote');
const FanMessage = require('../models/FanMessage');
const Report = require('../models/Report');
const BattleEvent = require('../models/BattleEvent');
const AdminAction = require('../models/AdminAction');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const lockUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['active', 'locked', 'deleted']), note: z.string().trim().max(500).optional().default('') })
});

const commentModerationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['visible', 'hidden', 'deleted']), note: z.string().trim().max(500).optional().default('') })
});

const reportSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['new', 'reviewing', 'resolved', 'rejected']), note: z.string().trim().max(500).optional().default('') })
});

async function log(adminId, action, targetType, targetId, note, snapshot) {
  await AdminAction.create({ adminId, action, targetType, targetId, note, snapshot });
}

router.get('/stats', asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, artists, votes, comments, reports, events, dailyVotes] = await Promise.all([
    User.countDocuments(),
    Artist.countDocuments({ isActive: true }),
    Vote.countDocuments(),
    FanMessage.countDocuments({ status: 'visible' }),
    Report.countDocuments({ status: { $in: ['new', 'reviewing'] } }),
    BattleEvent.countDocuments({ status: 'active' }),
    Vote.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, votes: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  res.json({ users, artists, votes, comments, openReports: reports, activeEvents: events, dailyVotes });
}));

router.get('/reports', asyncHandler(async (req, res) => {
  const reports = await Report.find().populate('userId', 'fullName email').sort({ createdAt: -1 }).limit(100).lean();
  res.json({ reports });
}));

router.patch('/reports/:id', validate(reportSchema), asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.validated.params.id, { status: req.validated.body.status }, { new: true });
  if (!report) throw createError(404, 'Không tìm thấy report.');
  await log(req.user._id, 'moderate_report', 'report', report._id, req.validated.body.note, report);
  res.json({ report });
}));

router.get('/comments', asyncHandler(async (req, res) => {
  const comments = await FanMessage.find().populate('userId', 'fullName email').populate('artistId', 'stageName').sort({ createdAt: -1 }).limit(100).lean();
  res.json({ comments });
}));

router.patch('/comments/:id', validate(commentModerationSchema), asyncHandler(async (req, res) => {
  const comment = await FanMessage.findByIdAndUpdate(req.validated.params.id, { status: req.validated.body.status }, { new: true });
  if (!comment) throw createError(404, 'Không tìm thấy bình luận.');
  await log(req.user._id, 'moderate_comment', 'fan_message', comment._id, req.validated.body.note, comment);
  res.json({ comment });
}));

router.patch('/users/:id/status', validate(lockUserSchema), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.validated.params.id, { status: req.validated.body.status }, { new: true });
  if (!user) throw createError(404, 'Không tìm thấy user.');
  await log(req.user._id, 'set_user_status', 'user', user._id, req.validated.body.note, { status: user.status });
  res.json({ user: user.toSafeJSON() });
}));

module.exports = router;
