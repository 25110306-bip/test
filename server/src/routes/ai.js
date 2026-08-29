const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const Artist = require('../models/Artist');
const AdminAction = require('../models/AdminAction');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');
const { withRankScore } = require('../utils/scoring');
const { generateArtistDraft, analyzeArtist, normalizeName, generateFanPrPost, makePosterSvgDataUrl } = require('../utils/aiArtist');
const { verifyBotChallenge } = require('../utils/botCheck');

const router = express.Router();

const addIdolSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    profession: z.enum(['singer', 'actor', 'rapper', 'group', 'multi']).optional().default('singer'),
    captchaToken: z.string().min(10),
    captchaAnswer: z.string().min(1),
    botTrap: z.string().optional().default('')
  })
});

const analyzeSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findExistingArtist(name) {
  const normalized = normalizeName(name);
  return Artist.findOne({
    isActive: true,
    $or: [
      { stageName: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' } },
      { realName: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' } }
    ]
  });
}

router.post('/add-idol', requireAuth, validate(addIdolSchema), asyncHandler(async (req, res) => {
  verifyBotChallenge(req.validated.body);
  const { name, profession } = req.validated.body;
  const existing = await findExistingArtist(name);
  if (existing) {
    return res.json({
      created: false,
      message: `${existing.stageName} đã có trong BXH. Mình mở hồ sơ hiện có thay vì tạo trùng.`,
      artist: withRankScore(existing.toObject())
    });
  }

  const draft = await generateArtistDraft(name, profession);
  const artist = await Artist.create({
    ...draft,
    createdBy: req.user._id,
    aiGenerated: true,
    aiReviewStatus: 'auto_published',
    userSuggestedName: name,
    aiGeneratedAt: new Date(),
    isActive: true,
    hashtags: Array.from(new Set([...(draft.hashtags || []), 'user-added', 'ai-evaluated']))
  });

  req.user.fanXp += 30;
  await req.user.save();

  await AdminAction.create({
    adminId: req.user._id,
    action: 'ai_add_artist',
    targetType: 'artist',
    targetId: artist._id,
    note: `User đề xuất AI thêm idol: ${name}`,
    snapshot: { stageName: artist.stageName, aiReviewStatus: artist.aiReviewStatus }
  }).catch(() => null);

  res.status(201).json({
    created: true,
    message: 'AI đã tự phân tích, chấm điểm và thêm idol vào BXH ngay. Không cần admin duyệt.',
    artist: withRankScore(artist.toObject()),
    user: req.user.toSafeJSON()
  });
}));

router.post('/artists/:id/analyze', requireAuth, validate(analyzeSchema), asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.validated.params.id)) throw createError(400, 'artistId không hợp lệ.');
  const artist = await Artist.findById(req.validated.params.id);
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const scored = withRankScore(artist.toObject());
  const analysis = await analyzeArtist(scored);
  artist.aiAnalysis = analysis;
  artist.aiGeneratedAt = new Date();
  await artist.save();
  res.json({ message: 'AI đã phân tích nghệ sĩ.', analysis, artist: withRankScore(artist.toObject()) });
}));


router.post('/artists/:id/fan-pr', requireAuth, validate(analyzeSchema), asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.validated.params.id)) throw createError(400, 'artistId không hợp lệ.');
  const artist = await Artist.findById(req.validated.params.id);
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const text = await generateFanPrPost(withRankScore(artist.toObject()));
  res.json({ message: 'AI đã viết bài PR fandom.', text });
}));

router.post('/artists/:id/poster', requireAuth, validate(analyzeSchema), asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.validated.params.id)) throw createError(400, 'artistId không hợp lệ.');
  const artist = await Artist.findById(req.validated.params.id);
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const imageUrl = makePosterSvgDataUrl(withRankScore(artist.toObject()));
  res.json({ message: 'Đã tạo poster fandom tự động.', imageUrl });
}));

module.exports = router;
