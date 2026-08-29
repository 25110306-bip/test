const express = require('express');
const GoldLedger = require('../models/GoldLedger');
const Vote = require('../models/Vote');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.get('/wallet', requireAuth, asyncHandler(async (req, res) => {
  const ledger = await GoldLedger.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ goldBalance: req.user.goldBalance, ledger });
}));

router.get('/votes', requireAuth, asyncHandler(async (req, res) => {
  const votes = await Vote.find({ userId: req.user._id }).populate('artistId', 'stageName type avatarUrl').sort({ createdAt: -1 }).limit(50);
  res.json({ votes });
}));

module.exports = router;
