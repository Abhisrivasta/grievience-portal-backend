const Complaint = require("../models/Complaint");
const Feedback = require("../models/Feedback");
const { Parser } = require("json2csv");



const buildQuery = (queryParams) => {
  const {
    status,
    department,
    fromDate,
    toDate,
    search,
  } = queryParams;

  const query = {};

  if (status) query.status = status;

  if (department) {
    query.department = new require("mongoose").Types.ObjectId(department);
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};



// Get grievance system overview metrics
const getOverviewMetrics = async (req, res, next) => {
  try {
    const [metrics] = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
        },
      },
    ]);

    const rating = await Feedback.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalComplaints: metrics?.total || 0,
        pendingComplaints: metrics?.pending || 0,
        inProgressComplaints: metrics?.inProgress || 0,
        resolvedComplaints: metrics?.resolved || 0,
        averageRating: rating[0]?.avg?.toFixed(1) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get complaint analytics with filters
const getComplaintAnalytics = async (req, res, next) => {
  try {
    const { sortBy = "count", order = "desc" } = req.query;

    const match = buildQuery(req.query);

    const data = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          [sortBy]: order === "asc" ? 1 : -1,
        },
      },
    ]);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};


//export to csv
const exportComplaintsCSV = async (req, res, next) => {
  try {
    const { sortBy = "createdAt", order = "desc" } = req.query;

    const query = buildQuery(req.query);

    const complaints = await Complaint.find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .populate("citizen", "name email")
      .populate("assignedOfficer", "name email")
      .populate("department", "name")
      .lean();

    const formatted = complaints.map((c) => ({
      ID: c._id,
      Title: c.title,
      Status: c.status,
      Priority: c.priority,
      Department: c.department?.name || "N/A",
      Citizen: c.citizen?.name || "N/A",
      Officer: c.assignedOfficer?.name || "N/A",
      CreatedAt: c.createdAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(formatted);

    res.header("Content-Type", "text/csv");
    res.attachment("complaints-report.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

const getOfficerPerformanceReport = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "resolvedCount",
      order = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $match: {
          assignedOfficer: { $ne: null },
        },
      },

      {
        $group: {
          _id: "$assignedOfficer",
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
            },
          },
          avgResolutionTime: {
            $avg: {
              $subtract: ["$updatedAt", "$createdAt"],
            },
          },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "officer",
        },
      },
      { $unwind: "$officer" },

      {
        $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "assignedOfficer",
          as: "feedbacks",
        },
      },

      {
        $addFields: {
          averageRating: { $avg: "$feedbacks.rating" },
        },
      },

      {
        $project: {
          officerName: "$officer.name",
          officerEmail: "$officer.email",
          resolvedCount: 1,
          avgResolutionTime: {
            $divide: ["$avgResolutionTime", 1000 * 60 * 60 * 24],
          },
          averageRating: { $ifNull: ["$averageRating", 0] },
        },
      },

      {
        $sort: {
          [sortBy]: order === "asc" ? 1 : -1,
        },
      },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: Number(limit) },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await Complaint.aggregate(pipeline);

    res.json({
      success: true,
      data: result[0].data,
      total: result[0].total[0]?.count || 0,
      page: Number(page),
      totalPages: Math.ceil(
        (result[0].total[0]?.count || 0) / limit
      ),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewMetrics,
  getComplaintAnalytics,
  exportComplaintsCSV,
  getOfficerPerformanceReport,
  
};
