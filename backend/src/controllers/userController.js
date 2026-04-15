const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/user/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        token: generateToken(user._id),
      });
    } else {
      // Frontend expects 'msg' in some places, so we can send both or just consistent error format
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
     res.status(401).json({ msg: error.message }); // Changed to 'msg' for frontend compatibility
  }
};

// @desc    Register a new user
// @route   POST /api/user/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        msg: 'User registered successfully', // Frontend logs 'data.msg'
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
     res.status(400).json({ msg: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Calculate total storage used
    const files = await require('../models/File').find({ user: user._id });
    const storageUsed = files.reduce((acc, file) => acc + (file.size || 0), 0);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      storageUsed,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      
      // If a new password is provided
      if (req.body.password) {
        // Ensure oldPassword is provided
        if (!req.body.oldPassword) {
            res.status(400);
            throw new Error('Please enter your current password to change your password');
        }

        // Verify oldPassword
        const isMatch = await user.matchPassword(req.body.oldPassword);
        if (!isMatch) {
            res.status(400);
            throw new Error('Current password is incorrect');
        }

        // If matched, apply new password (pre-save middleware handles hashing)
        user.password = req.body.password;
      }

      if (req.file) {
        // Store the relative path to the uploaded avatar
        user.avatarUrl = `/uploads/${req.file.filename}`;
      }

    const updatedUser = await user.save();
    
    // Calculate total storage used
    const files = await require('../models/File').find({ user: updatedUser._id });
    const storageUsed = files.reduce((acc, file) => acc + (file.size || 0), 0);

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        storageUsed,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
     res.status(400).json({ msg: error.message });
  }
};

module.exports = {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
};
