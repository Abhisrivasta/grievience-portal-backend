const User = require("../models/User");
const Notification = require("../models/Notification");

const getPagination = (query, defaultLimit = 20) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1),
    50
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter = {
      user: req.user.id,
    };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ isRead: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("relatedComplaint", "title status")
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      { $set: { isRead: true } },
      { new: true, select: "_id isRead", lean: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
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

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const filter = {};

    if (target === "officers") {
      filter.role = "officer";
    } else if (target === "department") {
      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: "Department is required",
        });
      }

      filter.role = "officer";
      filter.department = departmentId;
    } else if (target !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid target",
      });
    }

    const users = await User.find(filter).select("_id").lean();

    if (!users.length) {
      return res.status(200).json({
        success: true,
        message: "No users found for this target",
      });
    }

    const notifications = users.map((user) => ({
      user: user._id,
      message: message.trim(),
      isRead: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });

    return res.status(201).json({
      success: true,
      count: notifications.length,
      message: "Bulk notification sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

const sendSingleNotification = async (req, res, next) => {
  try {
    const { userId, message, type = "info", complaintId } = req.body;

    if (!userId || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "userId and message are required",
      });
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const notification = await Notification.create({
      user: userId,
      message: message.trim(),
      type,
      relatedComplaint: complaintId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  sendBulkNotification,
  sendSingleNotification,
  deleteNotification,
};