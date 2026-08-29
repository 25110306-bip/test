const express = require('express');
const Artist = require('../models/Artist');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { withRankScore } = require('../utils/scoring');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    youtube: { configured: Boolean(process.env.YOUTUBE_API_KEY), mode: process.env.YOUTUBE_API_KEY ? 'api' : 'manual/mock' },
    boxOffice: { configured: Boolean(process.env.BOX_OFFICE_SOURCE_URL), mode: process.env.BOX_OFFICE_SOURCE_URL ? 'pull' : 'manual/mock' },
    ai: { configured: Boolean(process.env.AI_API_KEY), mode: process.env.AI_API_KEY ? 'api' : 'template/mock' }
  });
});

router.post('/sync-mock', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const artists = await Artist.find({ isActive: true }).limit(50);
  for (const artist of artists) {
    artist.metrics.mediaMentions += Math.floor(Math.random() * 500);
    artist.metrics.socialBuzz = Math.max(-100, Math.min(100, artist.metrics.socialBuzz + Math.floor(Math.random() * 11) - 3));
    artist.metrics.buzzGrowthPercent = Math.max(-100, Math.min(10000, artist.metrics.buzzGrowthPercent + Math.floor(Math.random() * 30) - 5));
    if (!artist.trendingReason) artist.trendingReason = `${artist.stageName} đang được quan tâm nhờ hoạt động mới và lượng thảo luận tăng.`;
    await artist.save();
  }
  res.json({ message: 'Đã mô phỏng đồng bộ YouTube/BoxOffice/Social Listening.', count: artists.length, artists: artists.map(withRankScore) });
}));

module.exports = router;
