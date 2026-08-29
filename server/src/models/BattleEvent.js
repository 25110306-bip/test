const mongoose = require('mongoose');

const BattleEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  bannerArtistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
  artistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['draft', 'active', 'ended', 'cancelled'], default: 'draft', index: true },
  voteMultiplier: { type: Number, default: 1, min: 0.1, max: 20 },
  scoreWeights: {
    fanVote: { type: Number, default: 1 },
    achievement: { type: Number, default: 0 },
    buzz: { type: Number, default: 0 },
    expert: { type: Number, default: 0 }
  },
  winnerArtistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

BattleEventSchema.index({ status: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model('BattleEvent', BattleEventSchema);
