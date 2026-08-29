const Artist = require('../models/Artist');
const BattleEvent = require('../models/BattleEvent');
const { generateArtistDraft, analyzeArtist, normalizeName } = require('./aiArtist');
const { withRankScore } = require('./scoring');

const DEFAULT_CANDIDATES = [
  { name: 'Sơn Tùng M-TP', profession: 'singer' },
  { name: 'Mỹ Tâm', profession: 'singer' },
  { name: 'Đen Vâu', profession: 'rapper' },
  { name: 'Trấn Thành', profession: 'actor' },
  { name: 'Ninh Dương Lan Ngọc', profession: 'actor' },
  { name: 'MONO', profession: 'singer' },
  { name: 'HIEUTHUHAI', profession: 'rapper' },
  { name: 'Hoà Minzy', profession: 'singer' },
  { name: 'ERIK', profession: 'singer' },
  { name: 'Min', profession: 'singer' },
  { name: 'Tóc Tiên', profession: 'singer' },
  { name: 'Noo Phước Thịnh', profession: 'singer' },
  { name: 'Bích Phương', profession: 'singer' },
  { name: 'Soobin', profession: 'singer' },
  { name: 'Isaac', profession: 'singer' },
  { name: 'Jun Phạm', profession: 'singer' },
  { name: 'Ngô Kiến Huy', profession: 'singer' },
  { name: 'Hà An Huy', profession: 'singer' },
  { name: 'Phương Mỹ Chi', profession: 'singer' },
  { name: 'Orange', profession: 'singer' },
  { name: 'Wren Evans', profession: 'singer' },
  { name: 'MCK', profession: 'rapper' },
  { name: 'tlinh', profession: 'rapper' },
  { name: 'Suboi', profession: 'rapper' },
  { name: 'Karik', profession: 'rapper' },
  { name: 'Binz', profession: 'rapper' },
  { name: 'B Ray', profession: 'rapper' },
  { name: 'Rhyder', profession: 'singer' },
  { name: 'Quang Hùng MasterD', profession: 'singer' },
  { name: 'Dương Domic', profession: 'singer' },
  { name: 'Anh Tú Atus', profession: 'actor' },
  { name: 'Song Luân', profession: 'actor' },
  { name: 'Kaity Nguyễn', profession: 'actor' },
  { name: 'Phương Anh Đào', profession: 'actor' },
  { name: 'Thu Trang', profession: 'actor' },
  { name: 'Kiều Minh Tuấn', profession: 'actor' },
  { name: 'Lê Dương Bảo Lâm', profession: 'actor' },
  { name: 'Lê Xuân Tiền', profession: 'actor' },
  { name: 'Miu Lê', profession: 'singer' },
  { name: 'Chi Pu', profession: 'singer' },
  { name: 'AMEE', profession: 'singer' },
  { name: 'Grey D', profession: 'singer' },
  { name: 'Vũ Cát Tường', profession: 'singer' },
  { name: 'Hoàng Thuỳ Linh', profession: 'singer' },
  { name: 'Đức Phúc', profession: 'singer' },
  { name: 'Vũ.', profession: 'singer' },
  { name: 'Phan Mạnh Quỳnh', profession: 'singer' },
  { name: 'Ngọt', profession: 'group' },
  { name: 'Da LAB', profession: 'group' },
  { name: '2NE1 Việt Nam', profession: 'group' }
];

let isRunning = false;
let cursor = 0;

function readCandidates() {
  const raw = process.env.AUTO_IDOL_CANDIDATES || '';
  if (!raw.trim()) return DEFAULT_CANDIDATES;
  return raw.split(',').map(item => {
    const [name, profession] = item.split(':').map(part => String(part || '').trim());
    return { name, profession: profession || 'singer' };
  }).filter(item => item.name && item.name.length >= 2);
}

function intervalMs() {
  const minutes = Number(process.env.AUTO_IDOL_INTERVAL_MINUTES || 5);
  return Math.max(1, minutes) * 60 * 1000;
}

function batchSize() {
  const n = Number(process.env.AUTO_IDOL_BATCH_SIZE || 2);
  return Math.max(1, Math.min(10, n));
}

function maxArtists() {
  const n = Number(process.env.AUTO_IDOL_MAX_ARTISTS || 80);
  return Math.max(6, Math.min(500, n));
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findExisting(name) {
  const normalized = normalizeName(name);
  return Artist.findOne({
    $or: [
      { stageName: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' } },
      { realName: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' } }
    ]
  });
}

function ensureActiveDraft(draft, name, profession) {
  return {
    ...draft,
    stageName: draft.stageName || name,
    primaryProfession: draft.primaryProfession || profession || 'singer',
    professions: draft.professions?.length ? draft.professions : [profession || 'singer'].filter(v => v !== 'multi'),
    aiGenerated: true,
    aiReviewStatus: 'auto_published',
    aiSource: draft.aiSource || process.env.AI_PROVIDER || 'mock',
    aiGeneratedAt: new Date(),
    isActive: true,
    hashtags: Array.from(new Set([...(draft.hashtags || []), 'auto-update', 'ai-idol']))
  };
}

async function upsertOne(candidate) {
  const existing = await findExisting(candidate.name);
  if (existing) {
    const beforeBuzz = existing.metrics?.socialBuzz || 0;
    const beforeGrowth = existing.metrics?.buzzGrowthPercent || 0;
    existing.metrics = {
      ...(existing.metrics || {}),
      socialBuzz: Math.max(-100, Math.min(100, beforeBuzz + Math.round(Math.random() * 4 - 1))),
      buzzGrowthPercent: Math.max(-100, Math.min(10000, beforeGrowth + Math.round(Math.random() * 8)))
    };
    existing.trendingReason = existing.trendingReason || 'Hệ thống tự động đưa nghệ sĩ vào radar để theo dõi thảo luận và vote.';
    existing.isActive = true;
    await existing.save();
    return { status: 'updated', artist: existing.stageName };
  }

  const draft = await generateArtistDraft(candidate.name, candidate.profession || 'singer');
  const artist = await Artist.create(ensureActiveDraft(draft, candidate.name, candidate.profession));
  return { status: 'created', artist: artist.stageName };
}

async function ensureBattle() {
  const count = await BattleEvent.countDocuments({ status: 'active' });
  if (count > 0) return;
  const artists = await Artist.find({ isActive: true }).sort({ createdAt: -1 }).limit(6).select('_id').lean();
  if (artists.length < 2) return;
  await BattleEvent.findOneAndUpdate(
    { slug: 'fandom-battle-auto' },
    {
      title: 'Đại chiến Fandom tự động',
      description: 'Event tự động tạo để fan bắt đầu vote và đẩy idol lên trang chủ.',
      slug: 'fandom-battle-auto',
      artistIds: artists.map(a => a._id),
      startAt: new Date(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
      voteMultiplier: 2,
      scoreWeights: { fanVote: 2, achievement: 1, buzz: 1, expert: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function runAutoIdolImport(reason = 'interval') {
  if (isRunning) return { skipped: true, reason: 'job đang chạy' };
  isRunning = true;
  const created = [];
  const updated = [];
  try {
    const currentCount = await Artist.countDocuments({ isActive: true });
    if (currentCount >= maxArtists()) return { skipped: true, reason: 'đã đạt giới hạn AUTO_IDOL_MAX_ARTISTS' };

    const candidates = readCandidates();
    const attempts = Math.min(candidates.length, Math.max(batchSize() * 4, batchSize()));
    for (let i = 0; i < attempts && created.length + updated.length < batchSize(); i += 1) {
      const candidate = candidates[cursor % candidates.length];
      cursor += 1;
      const result = await upsertOne(candidate);
      if (result.status === 'created') created.push(result.artist);
      if (result.status === 'updated') updated.push(result.artist);
    }
    await ensureBattle();
    console.log(`[auto-idol] ${reason}: created=${created.length} updated=${updated.length}`, { created, updated });
    return { created, updated };
  } catch (err) {
    console.error('[auto-idol] failed:', err);
    return { error: err.message };
  } finally {
    isRunning = false;
  }
}

function startAutoIdolImport() {
  const enabled = String(process.env.AUTO_IDOL_IMPORT_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[auto-idol] disabled by AUTO_IDOL_IMPORT_ENABLED=false');
    return;
  }
  const ms = intervalMs();
  setTimeout(() => runAutoIdolImport('startup'), 5000);
  setInterval(() => runAutoIdolImport('interval'), ms);
  console.log(`[auto-idol] enabled, interval=${Math.round(ms / 60000)} minutes, batch=${batchSize()}, max=${maxArtists()}`);
}

module.exports = { startAutoIdolImport, runAutoIdolImport, DEFAULT_CANDIDATES };
