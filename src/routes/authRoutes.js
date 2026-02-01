const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware")


const {
  registerUser,
  loginUser,
  getUserProfile,

} = require("../controllers/authController");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

//get profile
router.get("/profile", authMiddleware, getUserProfile);


module.exports = router;
