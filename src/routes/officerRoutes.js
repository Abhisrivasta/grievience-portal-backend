const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  upsertOfficerProfile,
  getOfficersWithProfiles,
} = require("../controllers/officerProfileController");

router.post(
  "/profile",
  authMiddleware,
  roleMiddleware("admin"),
  upsertOfficerProfile
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getOfficersWithProfiles
);

module.exports = router;
