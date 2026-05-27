const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const admin = require("../config/firebase");

// ================= COMMON RESPONSE =================
const sendResponse = (res, status, message, data = {}) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    message,
    data,
  });
};

// ================= JWT TOKEN =================
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ================= GOOGLE LOGIN =================
const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendResponse(res, 400, "Firebase ID Token is required");
    }


    // Verify Firebase Token
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded || !decoded.email) {
      return sendResponse(res, 401, "Invalid Firebase token");
    }

    const { email, name, picture } = decoded;
    const cleanEmail = email.toLowerCase().trim();

    // Check user in DB
    let user = await User.findOne({ email: cleanEmail });

    // Create new user if not exists
    if (!user) {
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10
      );

      user = await User.create({
        name: name || "Google User",
        email: cleanEmail,
        password: randomPassword,
        profilePhoto: picture || null,
        location: {},
      });

    } else {
      console.log("✅ Existing user login");
    }

    const token = generateToken(user);

    return sendResponse(res, 200, "Google login successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
      },
    });

  } catch (err) {
    console.error("❌ Google Login Error:", err.message);
    return sendResponse(res, 401, "Google login failed");
  }
};

// ================= REGISTER =================
const registerUser = async (req, res, next) => {
  try {
    let { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, "All fields are required");
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return sendResponse(res, 400, "User already exists");
    }

    if (password.length < 6) {
      return sendResponse(res, 400, "Password must be at least 6 characters");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      location: location || {},
    });

    return sendResponse(res, 201, "Registered successfully", {
      id: user._id,
      name,
      email,
      role: user.role,
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGIN =================
const loginUser = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, "Email and password required");
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendResponse(res, 401, "Invalid credentials");
    }

    const token = generateToken(user);

    return sendResponse(res, 200, "Login successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ================= PROFILE =================
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return sendResponse(res, 404, "User not found");
    }

    return sendResponse(res, 200, "Profile fetched", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location || {},
      profilePhoto: user.profilePhoto || null,
      createdAt: user.createdAt,
    });

  } catch (err) {
    next(err);
  }
};

// ================= UPDATE PROFILE =================
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return sendResponse(res, 404, "User not found");
    }

    const { name, state, city, ward } = req.body;

    if (name) user.name = name.trim();
    if (state) user.location.state = state.trim();
    if (city) user.location.city = city.trim();
    if (ward) user.location.ward = ward.trim();

    if (req.file) {
      if (user.profilePhoto && !user.profilePhoto.startsWith("http")) {
        const oldPath = path.join(__dirname, "../", user.profilePhoto);
        fs.unlink(oldPath, () => {});
      }

      user.profilePhoto = `uploads/profiles/${req.file.filename}`;
    }

    user.markModified("location");
    const updated = await user.save();

    return sendResponse(res, 200, "Profile updated", {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      location: updated.location,
      profilePhoto: updated.profilePhoto || null,
    });

  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  googleLogin,
};