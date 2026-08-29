const mongoose = require('mongoose');

const WorkSchema = new mongoose.Schema({
  kind: { type: String, enum: ['song', 'movie', 'series', 'show', 'album', 'other'], default: 'other' },
  title: { type: String, required: true, trim: true },
  url: { type: String, trim: true },
  releaseYear: { type: Number, min: 1900, max: 2100 },
  viewCount: { type: Number, default: 0, min: 0 },
  spotifyStreams: { type: Number, default: 0, min: 0 },
  boxOfficeRevenue: { type: Number, default: 0, min: 0 },
  tvRating: { type: Number, default: 0, min: 0, max: 100 },
  impactScore: { type: Number, default: 0, min: 0, max: 100 },
  isSignature: { type: Boolean, default: false }
}, { _id: true });

const AwardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  year: { type: Number, min: 1900, max: 2100 },
  weight: { type: Number, default: 5, min: 1, max: 100 }
}, { _id: true });

const TimelineSchema = new mongoose.Schema({
  date: { type: Date },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, maxlength: 500 },
  url: { type: String, trim: true }
}, { _id: true });

const AiAnalysisSchema = new mongoose.Schema({
  summary: { type: String, trim: true, maxlength: 1200 },
  strengths: [{ type: String, trim: true, maxlength: 200 }],
  risks: [{ type: String, trim: true, maxlength: 200 }],
  recommendation: { type: String, trim: true, maxlength: 800 },
  confidence: { type: Number, default: 0, min: 0, max: 100 },
  generatedAt: Date
}, { _id: false });

const ArtistSchema = new mongoose.Schema({
  stageName: { type: String, required: true, trim: true, index: true },
  realName: { type: String, trim: true },
  primaryProfession: { type: String, enum: ['singer', 'actor', 'rapper', 'group', 'multi'], required: true, index: true },
  professions: [{ type: String, enum: ['singer', 'actor', 'rapper', 'dancer', 'model', 'mc', 'group'] }],
  gender: { type: String, enum: ['male', 'female', 'group', 'other', 'unknown'], default: 'unknown', index: true },
  grade: { type: String, enum: ['S', 'A', 'B', 'C'], default: 'B', index: true },
  dateOfBirth: Date,
  company: { type: String, trim: true },
  avatarUrl: { type: String, trim: true },
  coverUrl: { type: String, trim: true },
  bio: { type: String, trim: true, maxlength: 3000 },
  trendingReason: { type: String, trim: true, maxlength: 500 },
  hashtags: [{ type: String, trim: true, lowercase: true, index: true }],
  works: [WorkSchema],
  awards: [AwardSchema],
  timeline: [TimelineSchema],
  skills: {
    vocal: { type: Number, default: 0, min: 0, max: 100 },
    rap: { type: Number, default: 0, min: 0, max: 100 },
    dance: { type: Number, default: 0, min: 0, max: 100 },
    acting: { type: Number, default: 0, min: 0, max: 100 },
    diction: { type: Number, default: 0, min: 0, max: 100 },
    stagePresence: { type: Number, default: 0, min: 0, max: 100 }
  },
  metrics: {
    fanCount: { type: Number, default: 0, min: 0 },
    youtubeViews: { type: Number, default: 0, min: 0 },
    spotifyStreams: { type: Number, default: 0, min: 0 },
    boxOfficeRevenue: { type: Number, default: 0, min: 0 },
    tvRating: { type: Number, default: 0, min: 0, max: 100 },
    mediaMentions: { type: Number, default: 0, min: 0 },
    socialBuzz: { type: Number, default: 0, min: -100, max: 100 },
    buzzGrowthPercent: { type: Number, default: 0, min: -100, max: 10000 },
    webVotes: { type: Number, default: 0, min: 0 }
  },
  hallOfFameTags: [{ type: String, enum: ['billion_views', 'trillion_box_office', 'legacy_icon', 'award_sweeper'] }],
  manualBoost: { type: Number, default: 0, min: 0, max: 100 },
  manualPenalty: { type: Number, default: 0, min: 0, max: 100 },
  aiGenerated: { type: Boolean, default: false, index: true },
  aiReviewStatus: { type: String, enum: ['none', 'pending', 'auto_published', 'verified', 'rejected'], default: 'none', index: true },
  userSuggestedName: { type: String, trim: true, maxlength: 120 },
  aiSource: { type: String, trim: true, maxlength: 60 },
  aiGeneratedAt: Date,
  aiAnalysis: AiAnalysisSchema,
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ArtistSchema.index({ stageName: 'text', realName: 'text', hashtags: 'text', bio: 'text', trendingReason: 'text' });

ArtistSchema.virtual('type').get(function typeCompat() {
  return this.primaryProfession;
});

module.exports = mongoose.model('Artist', ArtistSchema);
