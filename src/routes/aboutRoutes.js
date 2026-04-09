const express = require("express");
const router = express.Router();
const { getAboutContent, updateAboutContent } = require('../controllers/aboutController');

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// Public route
router.get('/', getAboutContent);

// Admin only route
router.put('/', authMiddleware, roleMiddleware("admin"), updateAboutContent);

module.exports = router;