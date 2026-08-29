const mongoose = require('mongoose');

const FanMessageSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, minlength: 2, maxlength: 500 },
  status: { type: String, enum: ['visible', 'hidden', 'deleted'], default: 'visible', index: true },
  sentiment: { type: String, enum: ['positive', 'neutral', 'review'], default: 'neutral' }
}, { timestamps: true });

FanMessageSchema.index({ artistId: 1, createdAt: -1 });

module.exports = mongoose.model('FanMessage', FanMessageSchema);
