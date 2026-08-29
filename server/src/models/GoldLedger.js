const mongoose = require('mongoose');

const GoldLedgerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['earn_task', 'spend_vote', 'admin_adjust'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true, min: 0 },
  refModel: String,
  refId: mongoose.Schema.Types.ObjectId,
  note: { type: String, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model('GoldLedger', GoldLedgerSchema);
