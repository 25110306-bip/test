const express = require('express');
const { z } = require('zod');
const mongoose = require('mongoose');
const Artist = require('../models/Artist');
const Vote = require('../models/Vote');
const GoldLedger = require('../models/GoldLedger');
const BattleEvent = require('../models/BattleEvent');
const { requireAuth, requireVerifiedPhone } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');

const router = express.Router();

const voteSchema = z.object({
  body: z.object({
    artistId: z.string().min(1),
    battleEventId: z.string().optional(),
    category: z.enum(['overall', 'vocal', 'rap', 'dance', 'acting', 'fan']).default('overall'),
    amount: z.number().int().min(1).max(100),
    source: z.enum(['free_daily', 'gold']).optional().default('gold')
  })
});

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const GIFT_CODES = {
  VBIZVIP: { freeVotes: 50, gold: 0, xp: 100 },
  VBIZ2026: { freeVotes: 50, gold: 20, xp: 120 },
  FANPOWER: { freeVotes: 25, gold: 25, xp: 80 }
};

router.post('/check-in', requireAuth, requireVerifiedPhone, asyncHandler(async (req, res) => {
  const now = new Date();
  if (sameDay(req.user.lastCheckInAt, now)) {
    return res.json({ message: 'Hôm nay bạn đã điểm danh rồi.', user: req.user.toSafeJSON() });
  }
  const tickets = Number(process.env.CHECKIN_FREE_VOTES || 10);
  req.user.freeVotesBalance += tickets;
  req.user.lastCheckInAt = now;
  req.user.fanXp += 35;
  await req.user.save();
  res.json({ message: `Điểm danh thành công. Nhận ${tickets} vé vote.`, user: req.user.toSafeJSON() });
}));

router.post('/gift-code', requireAuth, requireVerifiedPhone, asyncHandler(async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const reward = GIFT_CODES[code];
  if (!reward) throw createError(400, 'Mã code không hợp lệ hoặc đã hết hạn.');
  const used = new Set((req.user.usedGiftCodes || []).map(x => String(x).toUpperCase()));
  if (used.has(code)) throw createError(409, 'Mã code này đã được sử dụng.');
  req.user.usedGiftCodes = Array.from(used).concat(code);
  req.user.freeVotesBalance += reward.freeVotes || 0;
  req.user.goldBalance += reward.gold || 0;
  req.user.fanXp += reward.xp || 0;
  await req.user.save();
  res.json({ message: `Nhập mã thành công. Nhận ${reward.freeVotes || 0} vé vote${reward.gold ? ` và ${reward.gold} vàng` : ''}.`, user: req.user.toSafeJSON() });
}));

router.post('/claim-free', requireAuth, requireVerifiedPhone, asyncHandler(async (req, res) => {
  const now = new Date();
  const freeVotes = Number(process.env.DAILY_FREE_VOTES || 3);
  if (sameDay(req.user.lastDailyFreeVotesAt, now)) {
    return res.json({ message: 'Bạn đã nhận vé vote miễn phí hôm nay.', user: req.user.toSafeJSON() });
  }
  req.user.freeVotesBalance += freeVotes;
  req.user.lastDailyFreeVotesAt = now;
  req.user.fanXp += 20;
  await req.user.save();
  res.json({ message: `Đã nhận ${freeVotes} vé vote miễn phí.`, user: req.user.toSafeJSON() });
}));

router.post('/', requireAuth, requireVerifiedPhone, validate(voteSchema), asyncHandler(async (req, res) => {
  const { artistId, battleEventId, category, amount, source } = req.validated.body;
  const goldPerVote = Number(process.env.GOLD_PER_VOTE || 10);
  const cost = source === 'gold' ? amount * goldPerVote : 0;

  if (!mongoose.Types.ObjectId.isValid(artistId)) throw createError(400, 'artistId không hợp lệ.');
  if (battleEventId && !mongoose.Types.ObjectId.isValid(battleEventId)) throw createError(400, 'battleEventId không hợp lệ.');

  const artist = await Artist.findById(artistId);
  if (!artist || !artist.isActive) throw createError(404, 'Không tìm thấy nghệ sĩ.');

  let battle = null;
  let scoreMultiplier = 1;
  if (battleEventId) {
    battle = await BattleEvent.findById(battleEventId);
    const now = new Date();
    if (!battle || battle.status !== 'active' || battle.startAt > now || battle.endAt < now) throw createError(400, 'Sự kiện bình chọn không hoạt động.');
    if (battle.artistIds?.length && !battle.artistIds.map(String).includes(String(artist._id))) throw createError(400, 'Nghệ sĩ không thuộc sự kiện này.');
    scoreMultiplier = battle.voteMultiplier || 1;
  }

  if (source === 'free_daily') {
    if (req.user.freeVotesBalance < amount) throw createError(400, `Bạn cần ${amount} vé vote miễn phí.`);
    req.user.freeVotesBalance -= amount;
  } else if (req.user.goldBalance < cost) {
    throw createError(400, `Bạn cần ${cost} vàng để bình chọn ${amount} lượt.`);
  } else {
    req.user.goldBalance -= cost;
  }

  artist.metrics.webVotes += amount * scoreMultiplier;
  req.user.fanXp += amount * 5;

  const vote = await Vote.create({
    userId: req.user._id,
    artistId: artist._id,
    battleEventId: battle?._id,
    category,
    source,
    amount,
    goldSpent: cost,
    scoreMultiplier
  });

  let ledger = null;
  if (cost > 0) {
    ledger = await GoldLedger.create({
      userId: req.user._id,
      type: 'spend_vote',
      amount: -cost,
      balanceAfter: req.user.goldBalance,
      refModel: 'Vote',
      refId: vote._id,
      note: `Bình chọn ${artist.stageName}`
    });
  }

  await Promise.all([req.user.save(), artist.save()]);
  res.status(201).json({
    message: source === 'free_daily' ? 'Bình chọn bằng vé miễn phí thành công.' : 'Bình chọn bằng vàng thành công.',
    vote,
    goldBalance: req.user.goldBalance,
    freeVotesBalance: req.user.freeVotesBalance,
    artistVotes: artist.metrics.webVotes,
    user: req.user.toSafeJSON(),
    ledger
  });
}));

module.exports = router;
