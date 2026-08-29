const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const Artist = require('../models/Artist');
const Vote = require('../models/Vote');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/http');
const { withRankScore } = require('../utils/scoring');
const { periodStart, periodLabel } = require('../utils/period');

const router = express.Router();

const listSchema = z.object({
  query: z.object({
    board: z.enum(['overall', 'profession', 'gender', 'hall_of_fame', 'breakout']).optional().default('overall'),
    profession: z.enum(['singer', 'actor', 'rapper', 'dancer', 'group', 'multi', 'all']).optional().default('all'),
    gender: z.enum(['male', 'female', 'group', 'other', 'unknown', 'all']).optional().default('all'),
    period: z.enum(['day', 'week', 'month', 'year', 'all']).optional().default('all'),
    grade: z.enum(['S', 'A', 'B', 'C', 'all']).optional().default('all'),
    hashtag: z.string().trim().max(60).optional().default(''),
    q: z.string().trim().max(120).optional().default(''),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50)
  })
});

async function voteMapForPeriod(period) {
  const start = periodStart(period);
  if (!start) return new Map();
  const rows = await Vote.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: '$artistId', amount: { $sum: { $multiply: ['$amount', '$scoreMultiplier'] } } } }
  ]);
  return new Map(rows.map(row => [String(row._id), Number(row.amount || 0)]));
}

function buildFilter(query) {
  const filter = { isActive: true };
  if (query.profession !== 'all') {
    if (query.profession === 'dancer') filter.professions = 'dancer';
    else filter.$or = [{ primaryProfession: query.profession }, { professions: query.profession }];
  }
  if (query.gender !== 'all') filter.gender = query.gender;
  if (query.grade !== 'all') filter.grade = query.grade;
  if (query.hashtag) filter.hashtags = query.hashtag.replace(/^#/, '').toLowerCase();
  if (query.q) filter.$text = { $search: query.q };
  return filter;
}

router.get('/', validate(listSchema), asyncHandler(async (req, res) => {
  const query = req.validated.query;
  const filter = buildFilter(query);
  if (query.board === 'hall_of_fame') filter.hallOfFameTags = { $exists: true, $ne: [] };
  const artists = await Artist.find(filter).lean();
  const periodVotes = await voteMapForPeriod(query.period);
  const ranked = artists
    .map(artist => withRankScore(artist, { periodVoteAmount: periodVotes.size ? (periodVotes.get(String(artist._id)) || 0) : null }))
    .sort((a, b) => {
      if (query.board === 'breakout') return b.breakoutScore - a.breakoutScore;
      return b.rankScore - a.rankScore;
    })
    .slice(0, query.limit)
    .map((artist, index) => ({ ...artist, rank: index + 1 }));

  res.json({
    board: query.board,
    period: query.period,
    periodLabel: periodLabel(query.period),
    filters: query,
    artists: ranked
  });
}));

router.get('/hall-of-fame', asyncHandler(async (req, res) => {
  const artists = await Artist.find({ isActive: true, hallOfFameTags: { $exists: true, $ne: [] } }).lean();
  const ranked = artists.map(withRankScore).sort((a, b) => b.rankScore - a.rankScore).map((artist, index) => ({ ...artist, rank: index + 1 }));
  res.json({ artists: ranked });
}));

router.get('/breakout', asyncHandler(async (req, res) => {
  const artists = await Artist.find({ isActive: true }).lean();
  const ranked = artists.map(withRankScore).sort((a, b) => b.breakoutScore - a.breakoutScore).slice(0, 20).map((artist, index) => ({ ...artist, rank: index + 1 }));
  res.json({ artists: ranked });
}));

module.exports = router;
