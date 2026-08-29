const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true, index: true },
  battleEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'BattleEvent', index: true },
  category: { type: String, enum: ['overall', 'vocal', 'rap', 'dance', 'acting', 'fan'], default: 'overall' },
  source: { type: String, enum: ['free_daily', 'gold', 'admin'], default: 'gold' },
  amount: { type: Number, required: true, min: 1, max: 1000 },
  goldSpent: { type: Number, required: true, min: 0 },
  scoreMultiplier: { type: Number, default: 1, min: 0.1, max: 20 }
}, { timestamps: true });

VoteSchema.index({ userId: 1, createdAt: -1 });
VoteSchema.index({ artistId: 1, createdAt: -1 });
VoteSchema.index({ battleEventId: 1, artistId: 1, createdAt: -1 });

module.exports = mongoose.model('Vote', VoteSchema);
