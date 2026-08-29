const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  targetType: { type: String, enum: ['artist', 'song', 'profile', 'other'], required: true },
  targetId: { type: String },
  reason: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['new', 'reviewing', 'resolved', 'rejected'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
