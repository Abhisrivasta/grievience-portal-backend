const Complaint = require("../models/Complaint");
const Feedback = require("../models/Feedback");
const {parser} = require("json2csv")

// Get grievance system overview metrics

const getOverviewMetrics = async (req, res, next) => {
  try {
    const totalComplaints =
      await Complaint.countDocuments();

    const pendingComplaints =
      await Complaint.countDocuments({
        status: "Pending",
      });

    const inProgressComplaints =
      await Complaint.countDocuments({
        status: "In Progress",
      });

    const resolvedComplaints =
      await Complaint.countDocuments({
        status: "Resolved",
      });

    const avgRatingData =
      await Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: {
              $avg: "$rating",
            },
          },
        },
      ]);

    const averageRating =
      avgRatingData.length > 0
        ? avgRatingData[0].averageRating
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        averageRating: Number(
          averageRating.toFixed(1)
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get complaint analytics with filters
 
const getComplaintAnalytics = async (req, res, next) => {
  try {
    const { status, fromDate, toDate, department } =
      req.query;

    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (department) {
      matchStage.department =
        new require("mongoose").Types.ObjectId(
          department
        );
    }

    if (fromDate || toDate) {
      matchStage.createdAt = {};
      if (fromDate) {
        matchStage.createdAt.$gte =
          new Date(fromDate);
      }
      if (toDate) {
        matchStage.createdAt.$lte =
          new Date(toDate);
      }
    }

    const analytics = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      filtersApplied: {
        status,
        department,
        fromDate,
        toDate,
      },
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};


//export to csv

const exportComplaintsCSV = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate("citizen", "name email")
      .populate("assignedOfficer", "name email")
      .populate("department", "name")
      .lean();

    const data = complaints.map((c) => ({
      ComplaintID: c._id.toString(),
      Title: c.title,
      Category: c.category,
      Status: c.status,
      Priority: c.priority,
      Department: c.department?.name || "N/A",
      CitizenName: c.citizen?.name || "N/A",
      CitizenEmail: c.citizen?.email || "N/A",
      OfficerName:
        c.assignedOfficer?.name || "N/A",
      CreatedAt: c.createdAt,
      UpdatedAt: c.updatedAt,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header(
      "Content-Type",
      "text/csv"
    );
    res.attachment(
      "complaints-report.csv"
    );

    return res.send(csv);
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get officer performance report
 * @route   GET /api/reports/officers/performance
 * @access  Private (Admin)
 */
const getOfficerPerformanceReport = async (
  req,
  res,
  next
) => {
  try {
    const report = await Complaint.aggregate([
      {
        $match: {
          assignedOfficer: { $ne: null },
          status: "Resolved",
        },
      },
      {
        $group: {
          _id: "$assignedOfficer",
          resolvedCount: { $sum: 1 },
          avgResolutionTime: {
            $avg: {
              $subtract: [
                "$updatedAt",
                "$createdAt",
              ],
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
          foreignField: "complaint",
          as: "feedback",
        },
      },
      {
        $addFields: {
          averageRating: {
            $avg: "$feedback.rating",
          },
        },
      },
      {
        $project: {
          officerId: "$officer._id",
          officerName: "$officer.name",
          officerEmail: "$officer.email",
          resolvedCount: 1,
          avgResolutionTime: {
            $divide: [
              "$avgResolutionTime",
              1000 * 60 * 60 * 24,
            ],
          },
          averageRating: {
            $ifNull: [
              "$averageRating",
              0,
            ],
          },
        },
      },
      { $sort: { resolvedCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  getOverviewMetrics,
  getComplaintAnalytics,
  exportComplaintsCSV,
  getOfficerPerformanceReport,
  
};
