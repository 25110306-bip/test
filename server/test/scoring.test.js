const assert = require('assert');
const { scoreBreakdown, withRankScore, breakoutScore } = require('../src/utils/scoring');

const artist = {
  stageName: 'Demo Star',
  primaryProfession: 'singer',
  skills: { vocal: 90, rap: 55, dance: 80, acting: 60, diction: 86, stagePresence: 92 },
  works: [
    { kind: 'song', title: 'Hit A', viewCount: 250000000, impactScore: 94, isSignature: true },
    { kind: 'movie', title: 'Film B', boxOfficeRevenue: 200000000000, impactScore: 88 }
  ],
  awards: [{ name: 'Demo Award', weight: 20 }],
  metrics: { fanCount: 5000000, youtubeViews: 900000000, spotifyStreams: 120000000, boxOfficeRevenue: 200000000000, mediaMentions: 40000, socialBuzz: 70, buzzGrowthPercent: 120, webVotes: 10000 },
  manualBoost: 0,
  manualPenalty: 0
};

const breakdown = scoreBreakdown(artist);
assert(breakdown.total > 0 && breakdown.total <= 100, 'total score should be 0-100');
assert(breakdown.fanVote > 0, 'fan vote score should be positive');
assert(breakdown.achievement > 0, 'achievement score should be positive');
assert(breakoutScore(artist) > 0, 'breakout score should be positive');
const ranked = withRankScore(artist);
assert.strictEqual(ranked.rankScore, breakdown.total, 'withRankScore should expose same total');
console.log('[test] scoring.test.js passed', breakdown);
