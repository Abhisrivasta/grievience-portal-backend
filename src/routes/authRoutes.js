const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware")
const upload = require("../middlewares/uploadMiddleware")


const {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile

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


module.exports = router;
