const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const fs = require("fs"); // ✅ Old photo delete ke liye
const path = require("path");

// ✅ Fix: success flag status se decide hoga
const sendResponse = (res, status, message, data = {}) => {
  res.status(status).json({
    success: status >= 200 && status < 300,
    message,
    data,
  });
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Register — same as before
const registerUser = async (req, res, next) => {
  try {
    let { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error("User already exists");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      location: location || {},
    });

    sendResponse(res, 201, "Registered successfully", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// Login — same as before
const loginUser = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password required");
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = generateToken(user);

    sendResponse(res, 200, "Login successful", {
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

// Get Profile — same as before
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    sendResponse(res, 200, "Profile fetched", {
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

// ✅ updateProfile — Fully rewritten
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      // ✅ Agar file upload ho gayi thi toh use bhi delete karo
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      res.status(404);
      throw new Error("User not found");
    }

    // ✅ Location object ensure karo
    if (!user.location) user.location = {};

    // ✅ Fields update karo (sirf woh jo bheje gaye hain)
    const { name, state, city, ward } = req.body;

    if (name && name.trim()) user.name = name.trim();
    if (state && state.trim()) user.location.state = state.trim();
    if (city && city.trim()) user.location.city = city.trim();
    if (ward && ward.trim()) user.location.ward = ward.trim();

    // ✅ Profile photo update — purani photo delete karo pehle
    if (req.file) {
      // Purani photo delete karo agar default nahi hai
      if (user.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, "../../", user.profilePhoto);
        fs.unlink(oldPhotoPath, (err) => {
          if (err) console.warn("⚠️ Old photo delete nahi hui:", err.message);
        });
      }

      // Naya path save karo
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    // ✅ location markModified — nested object ke liye zaroori hai Mongoose mein
    user.markModified("location");

    const updatedUser = await user.save();

    sendResponse(res, 200, "Profile updated successfully", {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      location: updatedUser.location,
      profilePhoto: updatedUser.profilePhoto || null,
    });
  } catch (err) {
    // ✅ Koi bhi error aaye toh uploaded file cleanup karo
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
};