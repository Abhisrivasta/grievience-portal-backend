const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware")
const upload = require("../middlewares/upload");

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  googleLogin,
  verifyEmail,
  resetPassword,
  forgotPassword,
  resendVerificationEmail,
} = require("../controllers/authController");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

//get profile
router.get("/profile", authMiddleware, getUserProfile);


//update profile
router.put(
  "/update-profile", 
  authMiddleware,           
  upload.single("profilePhoto"), 
  updateProfile             
);

router.post("/google", googleLogin);

router.get("/verify/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


module.exports = router;
