const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken")


const sendResponse = (res, status, message, data = {}) => {
  res.status(status).json({
    success: true,
    message,
    data,
  });
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};



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

//login user
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


//get profile
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
      profilePhoto: user.profilePhoto,
      createdAt: user.createdAt,
    });

  } catch (err) {
    next(err);
  }
};
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Ensure location exists
    if (!user.location) user.location = {};

    // Update fields
    if (req.body.name) user.name = req.body.name;

    if (req.body.state) user.location.state = req.body.state;
    if (req.body.city) user.location.city = req.body.city;
    if (req.body.ward) user.location.ward = req.body.ward;

    // Image upload
    if (req.file) {
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedUser = await user.save();

    sendResponse(res, 200, "Profile updated", {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      location: updatedUser.location,
      profilePhoto: updatedUser.profilePhoto,
    });

  } catch (err) {
    next(err);
  }
};
module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile
};
