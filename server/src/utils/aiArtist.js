const crypto = require('crypto');
const validator = require('validator');

const PROFESSION_LABELS = {
  singer: 'ca sĩ',
  actor: 'diễn viên',
  rapper: 'rapper',
  group: 'nhóm nhạc',
  multi: 'nghệ sĩ đa năng'
};

function cleanJsonText(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeParseJson(text) {
  const cleaned = cleanJsonText(text);
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch (__) { return null; }
  }
}

function clampNumber(value, min = 0, max = 100, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function stringToStableNumber(input, min, max) {
  const hash = crypto.createHash('sha256').update(String(input || '')).digest();
  const raw = hash.readUInt32BE(0) / 0xffffffff;
  return Math.round(min + raw * (max - min));
}

function stableSkill(name, key, base = 55) {
  return stringToStableNumber(`${name}:${key}`, Math.max(30, base - 15), Math.min(92, base + 25));
}

function fallbackArtistDraft(name, profession = 'singer') {
  const stageName = normalizeName(name);
  const professionLabel = PROFESSION_LABELS[profession] || PROFESSION_LABELS.singer;
  const seed = stageName || 'Idol mới';
  const vocalBase = profession === 'rapper' ? 58 : profession === 'actor' ? 38 : 66;
  const actingBase = profession === 'actor' ? 68 : 35;
  const rapBase = profession === 'rapper' ? 70 : 42;
  const danceBase = profession === 'actor' ? 40 : 58;
  return {
    stageName: seed,
    realName: '',
    primaryProfession: profession,
    professions: profession === 'multi' ? ['singer', 'actor'] : [profession].filter(v => v !== 'multi'),
    gender: 'unknown',
    grade: 'C',
    company: '',
    bio: `Hồ sơ AI tạm cho ${seed}. Dữ liệu này do người dùng đề xuất và cần admin kiểm chứng trước khi dùng như nguồn chính thức.`,
    trendingReason: `AI đã tạo hồ sơ nháp cho ${professionLabel} ${seed}. Cần bổ sung nguồn xác minh về tác phẩm, giải thưởng và thành tích.`,
    hashtags: ['ai-de-xuat', 'can-xac-minh', profession],
    works: [],
    awards: [],
    timeline: [{
      title: 'Người dùng đề xuất thêm vào BXH',
      description: 'Hồ sơ được tạo ở trạng thái dữ liệu nháp để fandom tiếp tục bổ sung và admin kiểm duyệt.'
    }],
    skills: {
      vocal: stableSkill(seed, 'vocal', vocalBase),
      rap: stableSkill(seed, 'rap', rapBase),
      dance: stableSkill(seed, 'dance', danceBase),
      acting: stableSkill(seed, 'acting', actingBase),
      diction: stableSkill(seed, 'diction', profession === 'actor' ? 67 : 52),
      stagePresence: stableSkill(seed, 'stagePresence', 62)
    },
    metrics: {
      fanCount: 0,
      youtubeViews: 0,
      spotifyStreams: 0,
      boxOfficeRevenue: 0,
      tvRating: 0,
      mediaMentions: 0,
      socialBuzz: 5,
      buzzGrowthPercent: 15,
      webVotes: 0
    },
    hallOfFameTags: [],
    manualBoost: 0,
    manualPenalty: 0,
    aiAnalysis: {
      summary: `Chưa có dữ liệu xác minh cho ${seed}. Đây là hồ sơ nháp để fandom bắt đầu bình chọn và gửi thông tin bổ sung.`,
      strengths: ['Có đề xuất từ người dùng', 'Có thể theo dõi buzz và fan vote từ web'],
      risks: ['Chưa xác minh tác phẩm', 'Chưa có nguồn thành tích chính thức'],
      recommendation: 'Admin nên kiểm tra nguồn công khai, bổ sung tác phẩm nổi bật và điều chỉnh điểm kỹ năng trước khi quảng bá trên trang chủ.',
      confidence: 35,
      generatedAt: new Date()
    }
  };
}

function sanitizeDraft(raw, requestedName, requestedProfession = 'singer') {
  const fallback = fallbackArtistDraft(requestedName, requestedProfession);
  const data = raw && typeof raw === 'object' ? raw : {};
  const skills = data.skills || {};
  const metrics = data.metrics || {};
  const professions = Array.isArray(data.professions) && data.professions.length ? data.professions : fallback.professions;
  const works = Array.isArray(data.works) ? data.works.slice(0, 8).map(work => ({
    kind: ['song', 'movie', 'series', 'show', 'album', 'other'].includes(work.kind) ? work.kind : 'other',
    title: String(work.title || '').trim().slice(0, 200) || 'Tác phẩm cần bổ sung tên',
    url: validator.isURL(String(work.url || '')) ? work.url : '',
    releaseYear: Number.isInteger(Number(work.releaseYear)) ? Number(work.releaseYear) : undefined,
    viewCount: Math.max(0, Number(work.viewCount || 0)),
    spotifyStreams: Math.max(0, Number(work.spotifyStreams || 0)),
    boxOfficeRevenue: Math.max(0, Number(work.boxOfficeRevenue || 0)),
    tvRating: clampNumber(work.tvRating, 0, 100, 0),
    impactScore: clampNumber(work.impactScore, 0, 100, 0),
    isSignature: Boolean(work.isSignature)
  })).filter(work => work.title) : fallback.works;

  const awards = Array.isArray(data.awards) ? data.awards.slice(0, 8).map(award => ({
    name: String(award.name || '').trim().slice(0, 200),
    category: String(award.category || '').trim().slice(0, 200),
    year: Number.isInteger(Number(award.year)) ? Number(award.year) : undefined,
    weight: clampNumber(award.weight, 1, 100, 5)
  })).filter(award => award.name) : fallback.awards;

  return {
    stageName: normalizeName(data.stageName || requestedName || fallback.stageName).slice(0, 120),
    realName: String(data.realName || '').trim().slice(0, 120),
    primaryProfession: ['singer', 'actor', 'rapper', 'group', 'multi'].includes(data.primaryProfession) ? data.primaryProfession : requestedProfession,
    professions: professions.filter(v => ['singer', 'actor', 'rapper', 'dancer', 'model', 'mc', 'group'].includes(v)).slice(0, 5),
    gender: ['male', 'female', 'group', 'other', 'unknown'].includes(data.gender) ? data.gender : fallback.gender,
    grade: ['S', 'A', 'B', 'C'].includes(data.grade) ? data.grade : fallback.grade,
    company: String(data.company || '').trim().slice(0, 160),
    avatarUrl: validator.isURL(String(data.avatarUrl || '')) ? data.avatarUrl : '',
    coverUrl: validator.isURL(String(data.coverUrl || '')) ? data.coverUrl : '',
    bio: String(data.bio || fallback.bio).trim().slice(0, 3000),
    trendingReason: String(data.trendingReason || fallback.trendingReason).trim().slice(0, 500),
    hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(tag => String(tag).replace(/^#/, '').toLowerCase().trim()).filter(Boolean).slice(0, 12) : fallback.hashtags,
    works,
    awards,
    timeline: Array.isArray(data.timeline) ? data.timeline.slice(0, 8).map(item => ({
      title: String(item.title || '').trim().slice(0, 200) || 'Cần bổ sung sự kiện',
      description: String(item.description || '').trim().slice(0, 500),
      url: validator.isURL(String(item.url || '')) ? item.url : ''
    })).filter(item => item.title) : fallback.timeline,
    skills: {
      vocal: clampNumber(skills.vocal, 0, 100, fallback.skills.vocal),
      rap: clampNumber(skills.rap, 0, 100, fallback.skills.rap),
      dance: clampNumber(skills.dance, 0, 100, fallback.skills.dance),
      acting: clampNumber(skills.acting, 0, 100, fallback.skills.acting),
      diction: clampNumber(skills.diction, 0, 100, fallback.skills.diction),
      stagePresence: clampNumber(skills.stagePresence, 0, 100, fallback.skills.stagePresence)
    },
    metrics: {
      fanCount: Math.max(0, Number(metrics.fanCount || fallback.metrics.fanCount)),
      youtubeViews: Math.max(0, Number(metrics.youtubeViews || fallback.metrics.youtubeViews)),
      spotifyStreams: Math.max(0, Number(metrics.spotifyStreams || fallback.metrics.spotifyStreams)),
      boxOfficeRevenue: Math.max(0, Number(metrics.boxOfficeRevenue || fallback.metrics.boxOfficeRevenue)),
      tvRating: clampNumber(metrics.tvRating, 0, 100, fallback.metrics.tvRating),
      mediaMentions: Math.max(0, Number(metrics.mediaMentions || fallback.metrics.mediaMentions)),
      socialBuzz: clampNumber(metrics.socialBuzz, -100, 100, fallback.metrics.socialBuzz),
      buzzGrowthPercent: clampNumber(metrics.buzzGrowthPercent, -100, 10000, fallback.metrics.buzzGrowthPercent),
      webVotes: 0
    },
    hallOfFameTags: [],
    manualBoost: 0,
    manualPenalty: 0,
    aiAnalysis: sanitizeAnalysis(data.aiAnalysis, fallback.aiAnalysis)
  };
}

function sanitizeAnalysis(raw, fallback) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    summary: String(data.summary || fallback.summary || '').trim().slice(0, 1200),
    strengths: Array.isArray(data.strengths) ? data.strengths.map(x => String(x).slice(0, 200)).filter(Boolean).slice(0, 8) : (fallback.strengths || []),
    risks: Array.isArray(data.risks) ? data.risks.map(x => String(x).slice(0, 200)).filter(Boolean).slice(0, 8) : (fallback.risks || []),
    recommendation: String(data.recommendation || fallback.recommendation || '').trim().slice(0, 800),
    confidence: clampNumber(data.confidence, 0, 100, fallback.confidence || 35),
    generatedAt: new Date()
  };
}

function artistPrompt(name, profession) {
  return `Bạn là AI phụ trách hồ sơ nghệ sĩ cho website BXH nghệ sĩ Việt Nam.\n` +
    `Nhiệm vụ: tạo hồ sơ NHÁP cho nghệ sĩ tên "${name}". Nếu không chắc dữ kiện, không được bịa thành tích; hãy để số liệu 0 và ghi cần xác minh.\n` +
    `Nghề ưu tiên: ${profession}. Trả về DUY NHẤT JSON hợp lệ, không markdown.\n` +
    `Schema: {"stageName":"","realName":"","primaryProfession":"singer|actor|rapper|group|multi","professions":["singer"],"gender":"male|female|group|other|unknown","grade":"S|A|B|C","company":"","bio":"","trendingReason":"","hashtags":[""],"works":[{"kind":"song|movie|series|show|album|other","title":"","releaseYear":2024,"viewCount":0,"spotifyStreams":0,"boxOfficeRevenue":0,"tvRating":0,"impactScore":0,"isSignature":true}],"awards":[{"name":"","category":"","year":2024,"weight":5}],"timeline":[{"title":"","description":""}],"skills":{"vocal":0,"rap":0,"dance":0,"acting":0,"diction":0,"stagePresence":0},"metrics":{"fanCount":0,"youtubeViews":0,"spotifyStreams":0,"boxOfficeRevenue":0,"tvRating":0,"mediaMentions":0,"socialBuzz":0,"buzzGrowthPercent":0},"aiAnalysis":{"summary":"","strengths":[""],"risks":[""],"recommendation":"","confidence":0}}`;
}

function analysisPrompt(artist) {
  return `Bạn là AI phân tích BXH nghệ sĩ. Phân tích ngắn gọn nghệ sĩ sau dựa trên dữ liệu đã có, không bịa dữ kiện ngoài dữ liệu.\n` +
    `Dữ liệu: ${JSON.stringify({
      stageName: artist.stageName,
      primaryProfession: artist.primaryProfession,
      professions: artist.professions,
      bio: artist.bio,
      trendingReason: artist.trendingReason,
      works: artist.works,
      awards: artist.awards,
      skills: artist.skills,
      metrics: artist.metrics,
      scoreBreakdown: artist.scoreBreakdown,
      rankScore: artist.rankScore
    }).slice(0, 10000)}\n` +
    `Trả về DUY NHẤT JSON: {"summary":"","strengths":[""],"risks":[""],"recommendation":"","confidence":0}`;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Bạn trả lời bằng JSON hợp lệ, không markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI API lỗi ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || (process.env.AI_PROVIDER === 'gemini' ? process.env.AI_API_KEY : '');
  if (!apiKey) return null;
  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (!res.ok) throw new Error(`Gemini API lỗi ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(part => part.text).join('\n') || null;
}

async function callAiJson(prompt) {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (provider === 'openai') return safeParseJson(await callOpenAI(prompt));
  if (provider === 'gemini') return safeParseJson(await callGemini(prompt));
  if (process.env.OPENAI_API_KEY) return safeParseJson(await callOpenAI(prompt));
  if (process.env.GEMINI_API_KEY) return safeParseJson(await callGemini(prompt));
  return null;
}

async function generateArtistDraft(name, profession = 'singer') {
  const safeName = normalizeName(name);
  if (!safeName || safeName.length < 2) throw new Error('Tên idol cần ít nhất 2 ký tự.');
  const raw = await callAiJson(artistPrompt(safeName, profession)).catch(err => {
    console.warn('[ai] generateArtistDraft fallback:', err.message);
    return null;
  });
  const draft = sanitizeDraft(raw, safeName, profession);
  draft.aiSource = raw ? (process.env.AI_PROVIDER || 'auto') : 'mock';
  return draft;
}

async function analyzeArtist(artistWithScore) {
  const fallback = fallbackArtistDraft(artistWithScore.stageName, artistWithScore.primaryProfession).aiAnalysis;
  fallback.summary = `${artistWithScore.stageName} hiện có điểm tổng ${artistWithScore.rankScore || 0}. Fan Vote, thành tích, buzz và chuyên môn cần được đọc cùng nhau để tránh lệch do một chỉ số tăng đột biến.`;
  fallback.strengths = [
    `Fan Vote: ${artistWithScore.scoreBreakdown?.fanVote || 0}`,
    `Thành tích: ${artistWithScore.scoreBreakdown?.achievement || 0}`,
    `Buzz: ${artistWithScore.scoreBreakdown?.buzz || 0}`,
    `Chuyên môn: ${artistWithScore.scoreBreakdown?.expert || 0}`
  ];
  fallback.recommendation = 'Theo dõi thêm vote 7 ngày, cập nhật nguồn YouTube/phòng vé và kiểm duyệt Fan Wall trước khi dùng phân tích này để truyền thông.';
  const raw = await callAiJson(analysisPrompt(artistWithScore)).catch(err => {
    console.warn('[ai] analyzeArtist fallback:', err.message);
    return null;
  });
  return sanitizeAnalysis(raw, fallback);
}


async function callOpenAIText(prompt) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý sáng tạo nội dung fandom V-Biz. Viết tiếng Việt tự nhiên, không bịa dữ kiện nhạy cảm.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI API lỗi ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

function fallbackPrPost(artist) {
  const tags = (artist.hashtags || []).slice(0, 4).map(t => `#${String(t).replace(/^#/, '')}`).join(' ');
  return `🔥 ${artist.stageName} đang tăng nhiệt trên VietRank! ${artist.trendingReason || 'Fandom đang kéo vote cực mạnh.'}\nĐiểm tổng hiện tại: ${artist.rankScore || 0}, fan vote: ${artist.scoreBreakdown?.fanVote || artist.metrics?.webVotes || 0}. Cùng vào vote để đưa idol lên top nào! ✨ ${tags || '#VietRank #VBiz'}`;
}

async function generateFanPrPost(artist) {
  const prompt = `Viết một bài đăng Facebook/TikTok 3-4 câu thật cháy để kêu gọi vote cho nghệ sĩ V-Biz "${artist.stageName}".\n` +
    `Dữ liệu: ${JSON.stringify({ stageName: artist.stageName, grade: artist.grade, profession: artist.primaryProfession, trendingReason: artist.trendingReason, hashtags: artist.hashtags, rankScore: artist.rankScore, scoreBreakdown: artist.scoreBreakdown }).slice(0, 5000)}\n` +
    `Yêu cầu: có emoji, hashtag, không nhắc dữ kiện chưa có trong dữ liệu, không ghi tiêu đề.`;
  const text = await callOpenAIText(prompt).catch(err => {
    console.warn('[ai] generateFanPrPost fallback:', err.message);
    return null;
  });
  return String(text || fallbackPrPost(artist)).trim().slice(0, 1200);
}

function makePosterSvgDataUrl(artist) {
  const name = String(artist.stageName || 'VietRank Idol').replace(/[<>&]/g, '');
  const profession = String(artist.primaryProfession || 'artist').replace(/[<>&]/g, '');
  const score = String(artist.rankScore || 0).replace(/[<>&]/g, '');
  const grade = String(artist.grade || 'B').replace(/[<>&]/g, '');
  const reason = String(artist.trendingReason || 'Đang được fandom quan tâm').replace(/[<>&]/g, '').slice(0, 95);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17121f"/><stop offset="0.5" stop-color="#5528d9"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
    <radialGradient id="r" cx="50%" cy="35%" r="60%"><stop stop-color="#ffffff" stop-opacity="0.28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#g)"/>
  <circle cx="810" cy="230" r="260" fill="url(#r)"/>
  <circle cx="210" cy="1120" r="320" fill="#ffffff" opacity="0.08"/>
  <text x="80" y="130" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#fde68a" letter-spacing="6">VIETRANK</text>
  <text x="80" y="250" font-family="Arial, sans-serif" font-size="120" font-weight="900" fill="#ffffff">${name}</text>
  <text x="80" y="340" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="#e9d5ff">${profession.toUpperCase()} • HẠNG ${grade}</text>
  <rect x="80" y="430" width="920" height="360" rx="46" fill="#0f172a" opacity="0.62" stroke="#ffffff" stroke-opacity="0.24"/>
  <text x="130" y="545" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="#fbbf24">ĐIỂM TỔNG</text>
  <text x="130" y="690" font-family="Arial, sans-serif" font-size="150" font-weight="900" fill="#ffffff">${score}</text>
  <text x="80" y="900" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#ffffff">🔥 Lý do đang hot</text>
  <foreignObject x="80" y="930" width="920" height="220"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:40px;font-weight:700;line-height:1.25;color:#fff">${reason}</div></foreignObject>
  <text x="80" y="1260" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#fde68a">Vote ngay để đưa idol lên TOP!</text>
  <text x="80" y="1325" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff" opacity="0.75">Generated by VietRank Fandom AI</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

module.exports = { generateArtistDraft, analyzeArtist, normalizeName, generateFanPrPost, makePosterSvgDataUrl };

