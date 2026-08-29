const express = require('express');
const { z } = require('zod');
const Artist = require('../models/Artist');
const Vote = require('../models/Vote');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');
const { withRankScore } = require('../utils/scoring');

const router = express.Router();

const compareSchema = z.object({
  query: z.object({
    a: z.string().min(1),
    b: z.string().min(1)
  })
});

router.get('/', validate(compareSchema), asyncHandler(async (req, res) => {
  const { a, b } = req.validated.query;
  const artists = await Artist.find({ _id: { $in: [a, b] }, isActive: true }).lean();
  if (artists.length !== 2) throw createError(404, 'Cần chọn đủ 2 nghệ sĩ hợp lệ để so sánh.');
  const votes = await Vote.aggregate([
    { $match: { artistId: { $in: artists.map(item => item._id) } } },
    { $group: { _id: '$artistId', totalVotes: { $sum: '$amount' }, goldSpent: { $sum: '$goldSpent' } } }
  ]);
  const voteMap = new Map(votes.map(row => [String(row._id), row]));
  const result = artists.map(artist => {
    const ranked = withRankScore(artist);
    const aggregate = voteMap.get(String(artist._id)) || { totalVotes: 0, goldSpent: 0 };
    return {
      ...ranked,
      radar: {
        vocal: ranked.skills?.vocal || 0,
        rap: ranked.skills?.rap || 0,
        dance: ranked.skills?.dance || 0,
        acting: ranked.skills?.acting || 0,
        diction: ranked.skills?.diction || 0,
        stagePresence: ranked.skills?.stagePresence || 0
      },
      bars: {
        achievement: ranked.scoreBreakdown.achievement,
        fanVote: ranked.scoreBreakdown.fanVote,
        buzz: ranked.scoreBreakdown.buzz,
        expert: ranked.scoreBreakdown.expert,
        totalVotes: aggregate.totalVotes,
        goldSpent: aggregate.goldSpent
      }
    };
  });
  res.json({ artists: result });
}));

module.exports = router;
