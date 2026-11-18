const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address format'],
    },
    password: {
      type: String,
      required: function () {
        // Only require password if neither Google nor Facebook auth was used
        return !this.googleId && !this.facebookId;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return in default queries
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    facebookId: {
      type: String,
      sparse: true,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [250, 'Bio cannot exceed 250 characters'],
      default: '',
    },
    lastLoginAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetOtp: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Hash password securely with bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (never leaks password or sensitive fields)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  if (typeof obj.avatar !== 'string' || obj.avatar.length > 500) {
    obj.avatar = '';
  } else if (obj.avatar) {
    try {
      const avatarUrl = new URL(obj.avatar);
      const allowedHosts = ['res.cloudinary.com', 'api.dicebear.com', 'lh3.googleusercontent.com', 'platform-lookaside.fbsbx.com', 'graph.facebook.com'];
      if (avatarUrl.protocol !== 'https:' || !allowedHosts.includes(avatarUrl.hostname.toLowerCase()) || avatarUrl.username || avatarUrl.password) obj.avatar = '';
    } catch (_) {
      if (!/^\/uploads\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(obj.avatar)) obj.avatar = '';
    }
  }
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
