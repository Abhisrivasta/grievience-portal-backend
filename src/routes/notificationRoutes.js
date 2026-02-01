const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  getMyNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
} = require("../controllers/notificationController");

const {
  sendBulkNotification,
} = require("../controllers/bulkNotificationController");

// Get unread notification count
router.get(
  "/unread-count",
  authMiddleware,
  getUnreadNotificationCount
);

// Get notifications
router.get("/", authMiddleware, getMyNotifications);

// Mark notification as read
router.put(
  "/:id/read",
  authMiddleware,
  markNotificationAsRead
);

// Send bulk notifications (Admin)
router.post(
  "/bulk",
  authMiddleware,
  roleMiddleware("admin"),
  sendBulkNotification
);

module.exports = router;
