const Notification = require("../models/Notification");

/**
 * Create notification for a user
 */
const createNotification = async ({
  userId,
  message,
  type = "info",
  complaintId = null,
}) => {
  try {
    await Notification.create({
      user: userId,
      message,
      type,
      relatedComplaint: complaintId,
    });
  } catch (error) {
    console.error(
      "Notification creation failed:",
      error.message
    );
  }
};

module.exports = {
  createNotification,
};
