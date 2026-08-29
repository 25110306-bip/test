const mongoose = require('mongoose');

const UserTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  taskDate: { type: String, required: true, index: true },
  type: { type: String, enum: ['youtube_listen', 'actor_watch', 'artist_info', 'read_news', 'share_rank', 'quiz'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetUrl: { type: String },
  minimumSeconds: { type: Number, default: 30 },
  rewardGold: { type: Number, default: 25, min: 1, max: 500 },
  status: { type: String, enum: ['assigned', 'completed'], default: 'assigned' },
  proofText: { type: String, maxlength: 1000 },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

UserTaskSchema.index({ userId: 1, taskDate: 1 }, { unique: true });

module.exports = mongoose.model('UserTask', UserTaskSchema);
