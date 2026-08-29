const mongoose = require('mongoose');

const ConsentSchema = new mongoose.Schema({
  termsAcceptedAt: Date,
  privacyAcceptedAt: Date,
  dataProcessingAcceptedAt: Date,
  marketingConsent: { type: Boolean, default: false }
}, { _id: false });

const GuardianSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  consentAt: Date
}, { _id: false });

const SocialProviderSchema = new mongoose.Schema({
  provider: { type: String, enum: ['google', 'facebook', 'telegram'] },
  providerUserId: String,
  linkedAt: Date
}, { _id: false });

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true, unique: true, sparse: true },
  phoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: Date,
  botVerified: { type: Boolean, default: false },
  botVerifiedAt: Date,
  dateOfBirth: { type: Date, required: true },
  guardian: GuardianSchema,
  goldBalance: { type: Number, default: 0, min: 0 },
  freeVotesBalance: { type: Number, default: 0, min: 0, max: 1000 },
  lastDailyFreeVotesAt: Date,
  lastCheckInAt: Date,
  usedGiftCodes: [{ type: String, trim: true, uppercase: true }],
  fanXp: { type: Number, default: 0, min: 0 },
  favoriteArtistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
  socialProviders: [SocialProviderSchema],
  roles: [{ type: String, enum: ['user', 'admin', 'moderator'], default: 'user' }],
  status: { type: String, enum: ['active', 'locked', 'deleted'], default: 'active' },
  consent: { type: ConsentSchema, required: true },
  lastLoginAt: Date
}, { timestamps: true });


function fanLevelFromXp(xp) {
  if (xp >= 20000) return 'Fan kim cương';
  if (xp >= 8000) return 'Fan bạch kim';
  if (xp >= 3000) return 'Fan vàng';
  if (xp >= 1000) return 'Fan cứng';
  return 'Fan mới';
}

UserSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    phoneVerified: this.phoneVerified,
    botVerified: this.botVerified,
    goldBalance: this.goldBalance,
    freeVotesBalance: this.freeVotesBalance,
    fanXp: this.fanXp,
    fanLevel: fanLevelFromXp(this.fanXp || 0),
    roles: this.roles,
    dateOfBirth: this.dateOfBirth,
    guardian: this.guardian,
    favoriteArtistIds: this.favoriteArtistIds,
    socialProviders: this.socialProviders,
    consent: this.consent,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);
