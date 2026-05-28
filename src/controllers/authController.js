const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebase");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const sendResponse = (res, status, message, data = {}) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    message,
    data,
  });
};

const normalizeEmail = (email) => email?.toLowerCase().trim();

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  location: user.location || {},
  profilePhoto: user.profilePhoto || null,
  createdAt: user.createdAt,
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendResponse(res, 400, "Firebase ID Token is required");
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded?.email) {
      return sendResponse(res, 401, "Invalid Firebase token");
    }

    const cleanEmail = normalizeEmail(decoded.email);

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10
      );

      user = await User.create({
        name: decoded.name || "Google User",
        email: cleanEmail,
        password: randomPassword,
        profilePhoto: decoded.picture || null,
        location: {},
        isVerified: true,
      });
    }

    const token = generateToken(user);

    return sendResponse(res, 200, "Google login successful", {
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error("Google Login Error:", err.message);
    return sendResponse(res, 401, "Google login failed");
  }
};

const registerUser = async (req, res, next) => {
  try {
    let { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, "All fields are required");
    }

    name = name.trim();
    email = normalizeEmail(email);

    if (!name || !email) {
      return sendResponse(res, 400, "Name and email are required");
    }

    if (password.length < 6) {
      return sendResponse(res, 400, "Password must be at least 6 characters");
    }

    const exists = await User.exists({ email });
    if (exists) {
      return sendResponse(res, 400, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify/${rawToken}`;

    try {
      await sendEmail(
        email,
        "Verify your email",
        `<h3>Click below to verify your email:</h3>
         <a href="${verifyUrl}">${verifyUrl}</a>`
      );
    } catch (emailError) {
      console.error("Email failed to send:", emailError.message);
      return sendResponse(
        res,
        500,
        "Failed to send verification email. Please try again."
      );
    }

    await User.create({
      name,
      email,
      password: hashedPassword,
      location: location || {},
      isVerified: false,
      emailToken: hashedToken,
      emailTokenExpires: Date.now() + 60 * 60 * 1000,
    });

    return sendResponse(
      res,
      201,
      "Registered successfully. Please verify your email."
    );
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailToken: hashedToken,
      emailTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/verify-failed`);
    }

    user.isVerified = true;
    user.emailToken = undefined;
    user.emailTokenExpires = undefined;
    await user.save();

    return res.redirect(`${process.env.CLIENT_URL}/email-verified`);
  } catch (error) {
    console.error("Verification Error:", error);
    return res.redirect(`${process.env.CLIENT_URL}/verify-failed`);
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) return sendResponse(res, 400, "Email is required");

    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, 404, "User not found");
    if (user.isVerified) return sendResponse(res, 400, "User already verified");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.emailToken = hashedToken;
    user.emailTokenExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify/${rawToken}`;

    await sendEmail(
      email,
      "Resend Verification",
      `<h3>Click below to verify your email:</h3>
       <a href="${verifyUrl}">${verifyUrl}</a>`
    );

    return sendResponse(res, 200, "Verification email resent");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, "Failed to resend email");
  }
};

const loginUser = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    email = normalizeEmail(email);

    if (!email || !password) {
      return sendResponse(res, 400, "Email and password required");
    }

    const user = await User.findOne({ email }).select(
      "+password name email role location profilePhoto createdAt isVerified"
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendResponse(res, 401, "Invalid credentials");
    }

    if (!user.isVerified) {
      return sendResponse(res, 403, "Please verify email first");
    }

    const token = generateToken(user);

    return sendResponse(res, 200, "Login successful", {
      token,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name email role location profilePhoto createdAt")
      .lean();

    if (!user) return sendResponse(res, 404, "User not found");

    return sendResponse(res, 200, "Profile fetched", {
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return sendResponse(res, 404, "User not found");

    const { name, state, city, ward } = req.body;

    if (!user.location) user.location = {};

    if (name?.trim()) user.name = name.trim();
    if (state?.trim()) user.location.state = state.trim();
    if (city?.trim()) user.location.city = city.trim();
    if (ward?.trim()) user.location.ward = ward.trim();

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      user.profilePhoto = result.secure_url;
    }

    user.markModified("location");
    const updated = await user.save();

    return sendResponse(res, 200, "Profile updated", {
      user: formatUser(updated),
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) return sendResponse(res, 400, "Email is required");

    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, 404, "User not found");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    await sendEmail(
      email,
      "Reset Password",
      `<h3>Click to reset password:</h3>
       <a href="${resetUrl}">${resetUrl}</a>`
    );

    return sendResponse(res, 200, "Reset link sent to email");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, "Error sending reset email");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return sendResponse(res, 400, "Password must be at least 6 characters");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return sendResponse(res, 400, "Invalid or expired link");

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return sendResponse(res, 200, "Password reset successful");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, "Reset failed");
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  googleLogin,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};