const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  submitFeedback,
} = require("../controllers/feedbackController");

// Submit feedback for resolved complaint
router.post(
  "/",
  authMiddleware,
  roleMiddleware("citizen"),
  submitFeedback
);

module.exports = router;
