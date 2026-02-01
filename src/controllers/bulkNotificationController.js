const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * @desc    Send bulk notifications
 * @route   POST /api/notifications/bulk
 * @access  Private (Admin)
 */
const sendBulkNotification = async (req, res, next) => {
  try {
    const {
      target, // all | officers | department
      departmentId,
      message,
      type = "info",
    } = req.body;

    if (!target || !message) {
      res.status(400);
      throw new Error(
        "Target and message are required"
      );
    }

    let users = [];

    if (target === "all") {
      users = await User.find().select("_id");
    } else if (target === "officers") {
      users = await User.find({
        role: "officer",
      }).select("_id");
    } else if (
      target === "department" &&
      departmentId
    ) {
      users = await User.find({
        role: "officer",
        department: departmentId,
      }).select("_id");
    } else {
      res.status(400);
      throw new Error("Invalid target");
    }

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users to notify",
      });
    }

    const notifications = users.map(
      (user) => ({
        user: user._id,
        message,
        type,
      })
    );

    await Notification.insertMany(
      notifications
    );

    res.status(201).json({
      success: true,
      message: `Notification sent to ${users.length} users`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendBulkNotification,
};
