const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  upsertOfficerProfile,
  getOfficersWithProfiles,
} = require("../controllers/officerProfileController");

/**
 * @route   POST /api/officers/profile
 * @desc    Create or update officer profile
 * @access  Private (Admin)
 */
router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("admin"),
  upsertOfficerProfile
);

/**
 * @route   GET /api/officers
 * @desc    Get officers with profiles
 * @access  Private (Admin)
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getOfficersWithProfiles
);

module.exports = router;
