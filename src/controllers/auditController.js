const AuditLog = require("../models/AuditLog");

//   Get system audit logs

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("performedBy", "name email role")
      .populate(
        "complaint",
        "title status"
      );

    const total =
      await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(
        total / limit
      ),
      totalRecords: total,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
