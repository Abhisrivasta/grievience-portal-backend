const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebase");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const uploadToCloudinary = require("../utils/cloudinaryUpload");


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
        isVerified: true,
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

    // ✅ Validation
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

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 Hour from now

    const verifyUrl = `${process.env.SERVER_URL}/api/auth/verify/${rawToken}`;

    try {
      await sendEmail(
        email,
        "Verify your email",
        `<h3>Click below to verify your email:</h3>
         <a href="${verifyUrl}">${verifyUrl}</a>`
      );
    } catch (emailError) {
      console.error("❌ Email failed to send:", emailError.message);
      return sendResponse(res, 500, "Failed to send verification email. Please try again.");
    }

    // Create user only if the email safely dispatched
    await User.create({
      name,
      email,
      password: hashedPassword,
      location: location || {},
      isVerified: false,
      emailToken: hashedToken, 
      emailTokenExpires: tokenExpiry // Make sure to add this field to your User Schema!
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

//================= VERIFY EMAIL =============
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // 🔐 Hash incoming token (match DB stored hash)
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 🔍 Find valid user (token match + not expired)
    const user = await User.findOne({
      emailToken: hashedToken,
      emailTokenExpires: { $gt: Date.now() },
    });

    // ❌ Invalid or expired token
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/verify-failed`);
    }

    // ✅ Mark user as verified
    user.isVerified = true;

    // 🧹 Remove token + expiry (one-time use)
    user.emailToken = undefined;
    user.emailTokenExpires = undefined;

    await user.save();

    // ✅ Redirect to success page
    return res.redirect(`${process.env.CLIENT_URL}/email-verified`);

  } catch (error) {
    console.error("❌ Verification Error:", error);

    return res.redirect(`${process.env.CLIENT_URL}/verify-failed`);
  }
};


const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendResponse(res, 400, "Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendResponse(res, 404, "User not found");
    }

    if (user.isVerified) {
      return sendResponse(res, 400, "User already verified");
    }

    // 🔥 Generate new token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.emailToken = hashedToken;
    user.emailTokenExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    // 🔥 Send email
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

    // Consistent Response Helper Shape Used Here
    if (!user.isVerified) {
      return sendResponse(res, 403, "Please verify email first");
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
      return sendResponse(res, 404, "User not found");
    }

    const { name, state, city, ward } = req.body;

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
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      location: updated.location,
      profilePhoto: updated.profilePhoto || null,
    });

  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendResponse(res, 400, "Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendResponse(res, 404, "User not found");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min

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

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendResponse(res, 400, "Invalid or expired link");
    }

    // 🔥 Update password
    user.password = await bcrypt.hash(password, 10);

    // 🧹 Clear token
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
  resetPassword
};
