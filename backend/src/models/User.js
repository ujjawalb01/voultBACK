const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// =========================================================
// REPLACEABLE: User Schema Definition
// =========================================================
// If changing DB, replace this Mongoose Schema with your ORM's entity definition.
// Key fields needed: name, email, password (hashed).
// =========================================================

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    // Add more fields as needed (e.g., storageLimit)
  },
  {
    timestamps: true,
  }
);

// Method to check password match
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
