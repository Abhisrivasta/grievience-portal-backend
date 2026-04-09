const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  getMyNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  sendBulkNotification,
  sendSingleNotification,
  deleteNotification
} = require("../controllers/notificationController");



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

// Send single notification (Admin or System)
router.post(
  "/single",
  authMiddleware,
  roleMiddleware("admin"), 
  sendSingleNotification
);

router.delete(
  "/:id",
  authMiddleware,
  deleteNotification
);

module.exports = router;
