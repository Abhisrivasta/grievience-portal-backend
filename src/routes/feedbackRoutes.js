const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  submitFeedback,
  getAllFeedbacks,
} = require("../controllers/feedbackController");

// Submit feedback for resolved complaint
router.post(
  "/",
  authMiddleware,
  roleMiddleware("citizen"),
  submitFeedback
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getAllFeedbacks
);

module.exports = router;
