function normalizeLog(value, max = 1000000000) {
  const n = Math.max(0, Number(value || 0));
  return Math.min(100, (Math.log10(n + 1) / Math.log10(max + 1)) * 100);
}

function clamp100(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function avgWorkScore(works = []) {
  if (!works.length) return 0;
  const total = works.reduce((sum, work) => {
    const viewScore = normalizeLog(work.viewCount || 0, 500000000);
    const spotifyScore = normalizeLog(work.spotifyStreams || 0, 800000000);
    const boxOfficeScore = normalizeLog(work.boxOfficeRevenue || 0, 500000000000);
    const ratingScore = clamp100(work.tvRating || 0);
    const impactScore = clamp100(work.impactScore || 0);
    const kindBoost = work.isSignature ? 4 : 0;
    const workScore = Math.max(viewScore, spotifyScore, boxOfficeScore, ratingScore) * 0.55 + impactScore * 0.45 + kindBoost;
    return sum + clamp100(workScore);
  }, 0);
  return total / works.length;
}

function expertScore(artist) {
  const awards = artist.awards || [];
  const awardScore = clamp100(awards.reduce((sum, award) => sum + Number(award.weight || 0), 0));
  const skills = artist.skills || {};
  const skillScore = (
    clamp100(skills.vocal) * 0.20 +
    clamp100(skills.rap) * 0.15 +
    clamp100(skills.dance) * 0.15 +
    clamp100(skills.acting) * 0.22 +
    clamp100(skills.diction) * 0.13 +
    clamp100(skills.stagePresence) * 0.15
  );
  return skillScore * 0.65 + awardScore * 0.35;
}

function achievementScore(artist) {
  const metrics = artist.metrics || artist;
  const work = avgWorkScore(artist.works || artist.hitSongs || []);
  const viewScore = normalizeLog(metrics.youtubeViews || artist.youtubeViews || 0, 3000000000);
  const spotifyScore = normalizeLog(metrics.spotifyStreams || 0, 2000000000);
  const boxScore = normalizeLog(metrics.boxOfficeRevenue || 0, 1000000000000);
  const tvScore = clamp100(metrics.tvRating || 0);
  return work * 0.38 + Math.max(viewScore, spotifyScore) * 0.26 + boxScore * 0.24 + tvScore * 0.12;
}

function buzzScore(artist) {
  const metrics = artist.metrics || artist;
  const mentionScore = normalizeLog(metrics.mediaMentions || 0, 250000);
  const socialBuzz = (clamp100((Number(metrics.socialBuzz || 0) + 100) / 2));
  const growthScore = clamp100(Number(metrics.buzzGrowthPercent || 0) / 5);
  return mentionScore * 0.35 + socialBuzz * 0.45 + growthScore * 0.20;
}

function fanVoteScore(artist, periodVoteAmount = null) {
  const metrics = artist.metrics || artist;
  const votes = periodVoteAmount == null ? (metrics.webVotes || artist.webVotes || 0) : periodVoteAmount;
  const fanScore = normalizeLog(metrics.fanCount || artist.fanCount || 0, 25000000);
  const voteScore = normalizeLog(votes || 0, 1000000);
  return voteScore * 0.68 + fanScore * 0.32;
}

function scoreBreakdown(artist, options = {}) {
  const weights = options.weights || { fanVote: 0.26, achievement: 0.32, buzz: 0.17, expert: 0.25 };
  const periodVoteAmount = options.periodVoteAmount ?? null;
  const parts = {
    fanVote: fanVoteScore(artist, periodVoteAmount),
    achievement: achievementScore(artist),
    buzz: buzzScore(artist),
    expert: expertScore(artist)
  };
  const raw = parts.fanVote * weights.fanVote + parts.achievement * weights.achievement + parts.buzz * weights.buzz + parts.expert * weights.expert;
  const finalScore = Math.max(0, raw + Number(artist.manualBoost || 0) - Number(artist.manualPenalty || 0));
  return {
    ...Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, Number(value.toFixed(2))])),
    total: Number(finalScore.toFixed(2)),
    weights
  };
}

function rankScore(artist, options = {}) {
  return scoreBreakdown(artist, options).total;
}

function breakoutScore(artist) {
  const metrics = artist.metrics || artist;
  const buzz = buzzScore(artist);
  const growth = clamp100(Number(metrics.buzzGrowthPercent || 0) / 3);
  const recentVotes = normalizeLog(metrics.webVotes || artist.webVotes || 0, 200000);
  return Number((buzz * 0.45 + growth * 0.35 + recentVotes * 0.20).toFixed(2));
}

function withRankScore(artist, options = {}) {
  const json = typeof artist.toObject === 'function' ? artist.toObject({ virtuals: true }) : artist;
  const normalized = {
    ...json,
    type: json.primaryProfession || json.type,
    fanCount: json.metrics?.fanCount ?? json.fanCount ?? 0,
    youtubeViews: json.metrics?.youtubeViews ?? json.youtubeViews ?? 0,
    webVotes: json.metrics?.webVotes ?? json.webVotes ?? 0,
    hitSongs: json.works?.filter(work => work.kind === 'song') || json.hitSongs || []
  };
  const breakdown = scoreBreakdown(normalized, options);
  return { ...normalized, rankScore: breakdown.total, scoreBreakdown: breakdown, breakoutScore: breakoutScore(normalized) };
}

module.exports = { normalizeLog, scoreBreakdown, rankScore, breakoutScore, withRankScore };
