const mongoose = require('mongoose');

const AdminActionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true },
  targetType: { type: String, trim: true },
  targetId: { type: String, trim: true },
  note: { type: String, trim: true, maxlength: 1000 },
  snapshot: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('AdminAction', AdminActionSchema);
