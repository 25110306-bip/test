const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const validator = require('validator');
const Artist = require('../models/Artist');
const Report = require('../models/Report');
const FanMessage = require('../models/FanMessage');
const { validate } = require('../middleware/validate');
const { requireAuth, requireVerifiedPhone, requireRole } = require('../middleware/auth');
const { asyncHandler, createError } = require('../utils/http');
const { withRankScore } = require('../utils/scoring');

const router = express.Router();

const professionEnum = z.enum(['singer', 'actor', 'rapper', 'dancer', 'group', 'multi', 'all']);
const genderEnum = z.enum(['male', 'female', 'group', 'other', 'unknown', 'all']);

const listSchema = z.object({
  query: z.object({
    type: z.enum(['singer', 'actor', 'rapper', 'group', 'multi', 'both', 'all']).optional().default('all'),
    profession: professionEnum.optional().default('all'),
    gender: genderEnum.optional().default('all'),
    grade: z.enum(['S', 'A', 'B', 'C', 'all']).optional().default('all'),
    hashtag: z.string().trim().max(60).optional().default(''),
    q: z.string().trim().max(120).optional().default(''),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50)
  })
});

const workSchema = z.object({
  kind: z.enum(['song', 'movie', 'series', 'show', 'album', 'other']).default('other'),
  title: z.string().trim().min(1).max(200),
  url: z.string().url().optional().or(z.literal('')),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  viewCount: z.number().int().min(0).default(0),
  spotifyStreams: z.number().int().min(0).default(0),
  boxOfficeRevenue: z.number().int().min(0).default(0),
  tvRating: z.number().min(0).max(100).default(0),
  impactScore: z.number().min(0).max(100).default(0),
  isSignature: z.boolean().optional().default(false)
});

const artistSchema = z.object({
  body: z.object({
    stageName: z.string().trim().min(1).max(120),
    realName: z.string().trim().max(120).optional().default(''),
    primaryProfession: z.enum(['singer', 'actor', 'rapper', 'group', 'multi']).optional(),
    type: z.enum(['singer', 'actor', 'rapper', 'group', 'multi', 'both']).optional(),
    professions: z.array(z.enum(['singer', 'actor', 'rapper', 'dancer', 'model', 'mc', 'group'])).optional().default([]),
    gender: z.enum(['male', 'female', 'group', 'other', 'unknown']).optional().default('unknown'),
    grade: z.enum(['S', 'A', 'B', 'C']).optional().default('B'),
    dateOfBirth: z.string().optional().refine(v => !v || !Number.isNaN(Date.parse(v)), 'Ngày sinh nghệ sĩ không hợp lệ.'),
    company: z.string().trim().max(160).optional().default(''),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    coverUrl: z.string().url().optional().or(z.literal('')),
    bio: z.string().trim().max(3000).optional().default(''),
    trendingReason: z.string().trim().max(500).optional().default(''),
    hashtags: z.array(z.string().trim().max(60)).optional().default([]),
    works: z.array(workSchema).optional().default([]),
    hitSongs: z.array(workSchema).optional(),
    awards: z.array(z.object({
      name: z.string().trim().min(1).max(200),
      category: z.string().trim().max(200).optional().default(''),
      year: z.number().int().min(1900).max(2100).optional(),
      weight: z.number().min(1).max(100).default(5)
    })).optional().default([]),
    timeline: z.array(z.object({
      date: z.string().optional().refine(v => !v || !Number.isNaN(Date.parse(v)), 'Ngày timeline không hợp lệ.'),
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(500).optional().default(''),
      url: z.string().url().optional().or(z.literal(''))
    })).optional().default([]),
    skills: z.object({
      vocal: z.number().min(0).max(100).default(0),
      rap: z.number().min(0).max(100).default(0),
      dance: z.number().min(0).max(100).default(0),
      acting: z.number().min(0).max(100).default(0),
      diction: z.number().min(0).max(100).default(0),
      stagePresence: z.number().min(0).max(100).default(0)
    }).optional(),
    metrics: z.object({
      fanCount: z.number().int().min(0).default(0),
      youtubeViews: z.number().int().min(0).default(0),
      spotifyStreams: z.number().int().min(0).default(0),
      boxOfficeRevenue: z.number().int().min(0).default(0),
      tvRating: z.number().min(0).max(100).default(0),
      mediaMentions: z.number().int().min(0).default(0),
      socialBuzz: z.number().min(-100).max(100).default(0),
      buzzGrowthPercent: z.number().min(-100).max(10000).default(0),
      webVotes: z.number().int().min(0).default(0)
    }).optional(),
    fanCount: z.number().int().min(0).optional(),
    youtubeViews: z.number().int().min(0).optional(),
    hallOfFameTags: z.array(z.enum(['billion_views', 'trillion_box_office', 'legacy_icon', 'award_sweeper'])).optional().default([]),
    manualBoost: z.number().min(0).max(100).optional().default(0),
    manualPenalty: z.number().min(0).max(100).optional().default(0)
  })
});

const reportSchema = z.object({
  body: z.object({
    targetType: z.enum(['artist', 'song', 'profile', 'other']).default('artist'),
    reason: z.string().trim().min(5).max(1000)
  }),
  params: z.object({ id: z.string().min(1) })
});

const wallSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ message: z.string().trim().min(2).max(500) })
});

function normalizeArtistPayload(body) {
  const primaryProfession = body.primaryProfession || (body.type === 'both' ? 'multi' : body.type) || 'singer';
  const works = body.works?.length ? body.works : (body.hitSongs || []).map(work => ({ ...work, kind: work.kind || 'song' }));
  const metrics = {
    ...(body.metrics || {}),
    fanCount: body.metrics?.fanCount ?? body.fanCount ?? 0,
    youtubeViews: body.metrics?.youtubeViews ?? body.youtubeViews ?? 0
  };
  return {
    ...body,
    primaryProfession,
    professions: body.professions?.length ? body.professions : [primaryProfession].filter(v => v !== 'multi'),
    works,
    metrics,
    hashtags: (body.hashtags || []).map(tag => tag.replace(/^#/, '').toLowerCase()),
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    timeline: (body.timeline || []).map(item => ({ ...item, date: item.date ? new Date(item.date) : undefined }))
  };
}

function buildFilter(query) {
  const filter = { isActive: true };
  const profession = query.profession !== 'all' ? query.profession : (query.type !== 'all' ? query.type : 'all');
  if (profession !== 'all') {
    if (profession === 'both') filter.primaryProfession = 'multi';
    else if (profession === 'dancer') filter.professions = 'dancer';
    else filter.$or = [{ primaryProfession: profession }, { professions: profession }];
  }
  if (query.gender !== 'all') filter.gender = query.gender;
  if (query.grade !== 'all') filter.grade = query.grade;
  if (query.hashtag) filter.hashtags = query.hashtag.replace(/^#/, '').toLowerCase();
  if (query.q) filter.$text = { $search: query.q };
  return filter;
}

router.get('/', validate(listSchema), asyncHandler(async (req, res) => {
  const { limit } = req.validated.query;
  const filter = buildFilter(req.validated.query);
  const artists = await Artist.find(filter).limit(limit).lean();
  const ranked = artists.map(withRankScore).sort((a, b) => b.rankScore - a.rankScore);
  res.json({ artists: ranked.map((artist, index) => ({ ...artist, rank: index + 1 })) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw createError(400, 'artistId không hợp lệ.');
  const artist = await Artist.findById(req.params.id).lean();
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const wall = await FanMessage.find({ artistId: artist._id, status: 'visible' }).populate('userId', 'fullName fanXp').sort({ createdAt: -1 }).limit(20).lean();
  res.json({ artist: withRankScore(artist), wall });
}));

router.post('/', requireAuth, requireRole('admin'), validate(artistSchema), asyncHandler(async (req, res) => {
  const payload = normalizeArtistPayload(req.validated.body);
  const artist = await Artist.create({ ...payload, createdBy: req.user._id });
  res.status(201).json({ artist: withRankScore(artist) });
}));

router.put('/:id', requireAuth, requireRole('admin'), validate(artistSchema), asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw createError(400, 'artistId không hợp lệ.');
  const payload = normalizeArtistPayload(req.validated.body);
  const artist = await Artist.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!artist) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  res.json({ artist: withRankScore(artist) });
}));

router.post('/:id/wall', requireAuth, requireVerifiedPhone, validate(wallSchema), asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.validated.params.id);
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const raw = req.validated.body.message;
  const hasToxicWords = /(chết|ngu|đần|đồ\s*khốn|fuck|shit)/i.test(raw);
  const message = await FanMessage.create({
    artistId: artist._id,
    userId: req.user._id,
    message: validator.escape(raw),
    sentiment: hasToxicWords ? 'review' : 'positive',
    status: hasToxicWords ? 'hidden' : 'visible'
  });
  req.user.fanXp += 10;
  await req.user.save();
  res.status(201).json({ message: hasToxicWords ? 'Lời nhắn đã chuyển vào hàng chờ kiểm duyệt.' : 'Đã gửi lời nhắn lên Fan Wall.', fanMessage: message, user: req.user.toSafeJSON() });
}));

router.post('/:id/report', requireAuth, validate(reportSchema), asyncHandler(async (req, res) => {
  const artist = await Artist.findById(req.validated.params.id);
  if (!artist) throw createError(404, 'Không tìm thấy nghệ sĩ.');
  const report = await Report.create({
    userId: req.user._id,
    targetType: req.validated.body.targetType,
    targetId: String(artist._id),
    reason: req.validated.body.reason
  });
  res.status(201).json({ message: 'Đã nhận báo cáo. Ban quản trị sẽ xem xét.', reportId: report._id });
}));

module.exports = router;
