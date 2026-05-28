const Complaint = require("../models/Complaint");
const AuditLog = require("../models/AuditLog");
const Department = require("../models/Department");
const User = require("../models/User");
const uploadToCloudinary = require("../utils/cloudinaryUpload.js");
const { createNotification } = require("../services/notificationService");

const getPagination = (query, defaultLimit = 5) => {
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

const getSort = (query, fallback = { createdAt: -1 }) => {
  if (!query.sortBy) return fallback;

  return {
    [query.sortBy]: query.order === "asc" ? 1 : -1,
  };
};

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, area, latitude, longitude } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category?.trim() ||
      !area?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category and area are required",
      });
    }

    let imageUrl = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      location: {
        area: area.trim(),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      image: imageUrl,
      citizen: req.user.id,
      timeline: [
        {
          status: "Pending",
          remark: "Complaint registered by citizen",
          updatedBy: "System",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: {
        id: complaint._id,
        status: complaint.status,
        image: complaint.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      startDate,
      endDate,
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);
    const sort = getSort(req.query);

    const filter = { citizen: req.user.id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (search?.trim()) {
      const safeSearch = escapeRegex(search.trim());

      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("title category status priority createdAt")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        count: complaints.length,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
      },
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("department", "name category")
      .populate("assignedOfficer", "name email role")
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.citizen.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this complaint",
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignedComplaints = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const sort = getSort(req.query);

    const filter = {
      assignedOfficer: req.user.id,
    };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    if (req.query.search?.trim()) {
      const safeSearch = escapeRegex(req.query.search.trim());

      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("citizen", "name email")
        .populate("department", "name category")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remark, priority } = req.body;

    if (!status?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.assignedOfficer?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    complaint.status = status;

    if (priority) {
      complaint.priority = priority;
    }

    complaint.timeline.push({
      status,
      remark: remark?.trim() || "Updated by officer",
      updatedBy: "Officer",
    });

    await complaint.save();

    await Promise.all([
      AuditLog.create({
        action: "UPDATE_COMPLAINT_STATUS",
        performedBy: req.user.id,
        complaint: complaint._id,
        details: `Status changed to ${status}`,
        ipAddress: req.ip,
      }),
      createNotification({
        userId: complaint.citizen,
        message: `Your complaint status is now "${status}"`,
        type: "info",
        complaintId: complaint._id,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getAllComplaints = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const sort = getSort(req.query);

    const filter = {};

    if (req.query.status) {
      filter.status = {
        $regex: `^${escapeRegex(req.query.status)}$`,
        $options: "i",
      };
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.assignedOfficer) {
      filter.assignedOfficer = req.query.assignedOfficer;
    }

    if (req.query.search?.trim()) {
      const safeSearch = escapeRegex(req.query.search.trim());

      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("citizen", "name email")
        .populate("assignedOfficer", "name email")
        .populate("department", "name")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

const assignComplaintToOfficer = async (req, res, next) => {
  try {
    const { officerId, departmentId } = req.body;

    if (!officerId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Officer ID and Department ID are required",
      });
    }

    const [complaint, officer, department] = await Promise.all([
      Complaint.findById(req.params.id),
      User.findById(officerId).select("name role").lean(),
      Department.findById(departmentId).select("_id").lean(),
    ]);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (!officer || officer.role !== "officer") {
      return res.status(400).json({
        success: false,
        message: "Invalid officer selected",
      });
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Invalid department selected",
      });
    }

    complaint.assignedOfficer = officerId;
    complaint.department = departmentId;
    complaint.status = "In Progress";

    complaint.timeline.push({
      status: "In Progress",
      remark: `Assigned to officer ${officer.name}`,
      updatedBy: "Admin",
    });

    await complaint.save();

    await Promise.all([
      AuditLog.create({
        action: "ASSIGN_COMPLAINT",
        performedBy: req.user.id,
        complaint: complaint._id,
        details: `Assigned to ${officer.name}`,
        ipAddress: req.ip,
      }),
      createNotification({
        userId: officerId,
        message: `A complaint has been assigned to you: "${complaint.title}"`,
        type: "info",
        complaintId: complaint._id,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getComplaintForOfficer = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("citizen", "name email")
      .populate("department", "name")
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.assignedOfficer?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this complaint",
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

const updateComplaint = async (req, res, next) => {
  try {
    const { title, description, category, area, latitude, longitude } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.citizen.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (complaint.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot update. Status is ${complaint.status}`,
      });
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      complaint.image = result.secure_url;
    }

    if (title?.trim()) complaint.title = title.trim();
    if (description?.trim()) complaint.description = description.trim();
    if (category?.trim()) complaint.category = category.trim();

    complaint.location = {
      area: area?.trim() || complaint.location?.area,
      latitude: latitude ? Number(latitude) : complaint.location?.latitude,
      longitude: longitude ? Number(longitude) : complaint.location?.longitude,
    };

    complaint.timeline.push({
      status: "Pending",
      remark: "Complaint updated by citizen",
      updatedBy: "Citizen",
    });

    const updatedComplaint = await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  updateComplaintStatus,
  assignComplaintToOfficer,
  getAllComplaints,
  getComplaintForOfficer,
  updateComplaint,
};