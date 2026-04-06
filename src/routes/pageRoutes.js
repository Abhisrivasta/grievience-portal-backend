// routes/home.routes.js

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  upsertHomePage,
  getHomePage,
} = require("../controllers/page");

// 🌐 Public route
router.get("/", getHomePage);

// 🔐 Admin only (Create or Update)
router.post("/", authMiddleware, roleMiddleware("admin"), upsertHomePage);

module.exports = router;