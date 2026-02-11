const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken")

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, location } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error("User already exists with this email");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (role defaults to citizen)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Citizen registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

//login user

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    // Find user and include password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};


//get profile
const getUserProfile = async (req, res, next) => {
  try {
    // req.user is attached by authMiddleware
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};


const updateProfile = async (req, res, next) => {
  try {
    // 1. User ko dhoondein (req.user.userId authMiddleware se aayega)
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // 2. Text Fields Update karein
    // Agar body mein data hai to update karo, nahi to purana rehne do
    user.name = req.body.name || user.name;
    
    // Nested Location fields update
    if (req.body.state) user.location.state = req.body.state;
    if (req.body.city) user.location.city = req.body.city;
    if (req.body.ward) user.location.ward = req.body.ward;

    // 3. Photo Update karein (Agar file upload hui hai)
    if (req.file) {
      // Database mein hum sirf file ka path save karte hain
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    // 4. Save karein
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        location: updatedUser.location,
        profilePhoto: updatedUser.profilePhoto, 
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile
};
