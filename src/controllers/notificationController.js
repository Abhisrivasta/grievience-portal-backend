const Notification = require("../models/Notification");

/**
 * @desc    Get logged-in user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    })
      .sort({ isRead: 1, createdAt: -1 })
      .populate("relatedComplaint", "title status");

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(
      req.params.id
    );

    if (!notification) {
      res.status(404);
      throw new Error("Notification not found");
    }

    // Ownership check
    if (
      notification.user.toString() !==
      req.user.id
    ) {
      res.status(403);
      throw new Error(
        "You are not authorized to modify this notification"
      );
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

//get unread notification count

const getUnreadNotificationCount = async (
  req,
  res,
  next
) => {
  try {
    const count =
      await Notification.countDocuments({
        user: req.user.id,
        isRead: false,
      });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};


const sendBulkNotification = async (req, res, next) => {
  try {
    const { target, departmentId, message } = req.body;

    if (!message) {
      res.status(400);
      throw new Error("Message is required");
    }

    let users = [];

    // Decide target users
    if (target === "all") {
      users = await User.find({}, "_id");
    }

    if (target === "officers") {
      users = await User.find(
        { role: "officer" },
        "_id"
      );
    }

    if (target === "department") {
      if (!departmentId) {
        res.status(400);
        throw new Error("Department is required");
      }

      users = await User.find(
        {
          role: "officer",
          department: departmentId,
        },
        "_id"
      );
    }

    if (!users.length) {
      return res.status(200).json({
        success: true,
        message: "No users found for this target",
      });
    }

    // Prepare notifications
    const notifications = users.map((user) => ({
      user: user._id,
      message,
      isRead: false,
    }));

    // Bulk insert
    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      count: notifications.length,
      message: "Bulk notification sent successfully",
    });
  } catch (error) {
    next(error);
  }
};




module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  sendBulkNotification
};
