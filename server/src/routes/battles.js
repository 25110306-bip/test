const express = require('express');
const { z } = require('zod');
const BattleEvent = require('../models/BattleEvent');
const Vote = require('../models/Vote');
const Artist = require('../models/Artist');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');

const router = express.Router();

const battleSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(1000).optional().default(''),
    slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
    artistIds: z.array(z.string().min(1)).optional().default([]),
    startAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Ngày bắt đầu không hợp lệ.'),
    endAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Ngày kết thúc không hợp lệ.'),
    status: z.enum(['draft', 'active', 'ended', 'cancelled']).optional().default('draft'),
    voteMultiplier: z.number().min(0.1).max(20).optional().default(1),
    scoreWeights: z.object({
      fanVote: z.number().min(0).max(10).default(1),
      achievement: z.number().min(0).max(10).default(0),
      buzz: z.number().min(0).max(10).default(0),
      expert: z.number().min(0).max(10).default(0)
    }).optional()
  })
});

router.get('/', asyncHandler(async (req, res) => {
  const now = new Date();
  const events = await BattleEvent.find({ status: { $in: ['active', 'ended'] } }).populate('artistIds', 'stageName avatarUrl primaryProfession metrics').sort({ startAt: -1 }).limit(20).lean();
  res.json({ events: events.map(event => ({ ...event, isLive: event.status === 'active' && event.startAt <= now && event.endAt >= now })) });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const event = await BattleEvent.findOne({ slug: req.params.slug }).populate('artistIds', 'stageName avatarUrl primaryProfession metrics skills').lean();
  if (!event) throw createError(404, 'Không tìm thấy sự kiện.');
  const rows = await Vote.aggregate([
    { $match: { battleEventId: event._id } },
    { $group: { _id: '$artistId', votes: { $sum: '$amount' }, weightedVotes: { $sum: { $multiply: ['$amount', '$scoreMultiplier'] } } } },
    { $sort: { weightedVotes: -1 } }
  ]);
  const voteMap = new Map(rows.map(row => [String(row._id), row]));
  const artists = (event.artistIds || []).map((artist, index) => ({
    ...artist,
    rank: index + 1,
    eventVotes: voteMap.get(String(artist._id))?.votes || 0,
    weightedVotes: voteMap.get(String(artist._id))?.weightedVotes || 0
  })).sort((a, b) => b.weightedVotes - a.weightedVotes).map((artist, index) => ({ ...artist, rank: index + 1 }));
  res.json({ event, artists });
}));

router.post('/', requireAuth, requireRole('admin'), validate(battleSchema), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const artistCount = await Artist.countDocuments({ _id: { $in: body.artistIds } });
  if (body.artistIds.length && artistCount !== body.artistIds.length) throw createError(400, 'Một số nghệ sĩ trong sự kiện không hợp lệ.');
  const event = await BattleEvent.create({ ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt), createdBy: req.user._id });
  res.status(201).json({ event });
}));

module.exports = router;
