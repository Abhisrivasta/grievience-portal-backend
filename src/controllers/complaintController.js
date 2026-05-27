const Complaint = require("../models/Complaint");
const AuditLog = require("../models/AuditLog");
const Department = require("../models/Department");
const User = require("../models/User");
const uploadToCloudinary = require("../utils/cloudinaryUpload.js");

const {
  createNotification,
} = require("../services/notificationService");


const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, area, latitude, longitude } = req.body;
 
    if (!title?.trim() || !description?.trim() || !category?.trim() || !area?.trim()) {
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
 

// getMyComplaints 
const getMyComplaints = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 5, 
      search, 
      status, 
      priority, 
      category, 
      startDate, 
      endDate, 
      sortBy = "createdAt", 
      order = "desc" 
    } = req.query;

    const pageNumber = Math.max(parseInt(page), 1);
    const limitNumber = Math.max(parseInt(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { citizen: req.user.id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ [sortBy]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("title category status priority createdAt"),
      Complaint.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        count: complaints.length,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      },
      data: complaints,
    });

  } catch (error) {
    next(error);
  }
};


//getComplaintsbyId
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(
      req.params.id
    )
      .populate("department", "name category")
      .populate("assignedOfficer", "name email role");

    if (!complaint) {
      res.status(404);
      throw new Error("Complaint not found");
    }

    // Ownership check
    if (
      complaint.citizen.toString() !==
      req.user.id
    ) {
      res.status(403);
      throw new Error(
        "You are not authorized to view this complaint"
      );
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};


//get complaints to assingned officer

const getAssignedComplaints = async (req, res, next) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

 
    let filter = {
      assignedOfficer: req.user.id,
    };


    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

   
    if (req.query.search) {
      const search = req.query.search;

      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }


    let sort = { createdAt: -1 };

    if (req.query.sortBy) {
      const order = req.query.order === "asc" ? 1 : -1;
      sort = { [req.query.sortBy]: order };
    }

   
    const total = await Complaint.countDocuments(filter);

    const complaints = await Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("citizen", "name email")
      .populate("department", "name category");

    res.status(200).json({
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

//  Update complaint status (Officer)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remark, priority } = req.body;

    if (!status?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
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

    const allowedStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
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

    await AuditLog.create({
      action: "UPDATE_COMPLAINT_STATUS",
      performedBy: req.user.id,
      complaint: complaint._id,
      details: `Status changed to ${status}`,
      ipAddress: req.ip,
    });

    await createNotification({
      userId: complaint.citizen,
      message: `Your complaint status is now "${status}"`,
      type: "info",
      complaintId: complaint._id,
    });

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
    });

  } catch (error) {
    next(error);
  }
};

// GET /complaints  (ADMIN)
const getAllComplaints = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    let filter = {};

    // Status filter
    if (req.query.status) {
  filter.status = { $regex: `^${req.query.status}$`, $options: "i" };
}

    // Department filter
    if (req.query.department) {
      filter.department = req.query.department;
    }

    // Assigned officer filter
    if (req.query.assignedOfficer) {
      filter.assignedOfficer = req.query.assignedOfficer;
    }

    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sort
    let sort = {};
    if (req.query.sortBy) {
      const order = req.query.order === "asc" ? 1 : -1;
      sort[req.query.sortBy] = order;
    } else {
      sort.createdAt = -1;
    }

    const totalComplaints = await Complaint.countDocuments(filter);

    const complaints = await Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("citizen", "name email")
      .populate("assignedOfficer", "name email")
      .populate("department", "name");

    res.status(200).json({
      success: true,
      count: complaints.length,
      total: totalComplaints,
      currentPage: page,
      totalPages: Math.ceil(totalComplaints / limit),
      data: complaints,
    });

  } catch (error) {
    next(error);
  }
};



// assign complaint to officer
const assignComplaintToOfficer = async (req, res, next) => {
  try {
    const { officerId, departmentId } = req.body;

    if (!officerId || !departmentId) {
      res.status(400);
      throw new Error(
        "Officer ID and Department ID are required"
      );
    }

    const complaint = await Complaint.findById(
      req.params.id
    );

    if (!complaint) {
      res.status(404);
      throw new Error("Complaint not found");
    }

    // Validate officer
    const officer = await User.findById(officerId);
    if (!officer || officer.role !== "officer") {
      res.status(400);
      throw new Error("Invalid officer selected");
    }

    // Validate department
    const department = await Department.findById(
      departmentId
    );
    if (!department) {
      res.status(400);
      throw new Error("Invalid department selected");
    }

    // Assign complaint
    complaint.assignedOfficer = officerId;
    complaint.department = departmentId;
    complaint.status = "In Progress";

    // Timeline entry
    complaint.timeline.push({
      status: "In Progress",
      remark: `Assigned to officer ${officer.name}`,
      updatedBy: "Admin",
    });

    await complaint.save();

    // Audit log
    await AuditLog.create({
      action: "ASSIGN_COMPLAINT",
      performedBy: req.user.id,
      complaint: complaint._id,
      details: `Assigned to ${officer.name}`,
      ipAddress: req.ip,
    });

    // Notify officer
    await createNotification({
      userId: officerId,
      message: `A complaint has been assigned to you: "${complaint.title}"`,
      type: "info",
      complaintId: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
    });
  } catch (error) {
    next(error);
  }
};


// GET complaint details for OFFICER
const getComplaintForOfficer = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("citizen", "name email")
      .populate("department", "name");

    if (!complaint) {
      res.status(404);
      throw new Error("Complaint not found");
    }

    // officer ownership check
    if (
      complaint.assignedOfficer?.toString() !== req.user.id
    ) {
      res.status(403);
      throw new Error("You are not authorized to view this complaint");
    }

    res.status(200).json({
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
    const complaintId = req.params.id;
 
    const complaint = await Complaint.findById(complaintId);
 
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
 
    // ✅ Only upload new image if a file was sent, otherwise keep existing
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      complaint.image = result.secure_url;
    }
 
    if (title?.trim()) complaint.title = title.trim();
    if (description?.trim()) complaint.description = description.trim();
    if (category?.trim()) complaint.category = category.trim();
 
    complaint.location = {
      area: area?.trim() || complaint.location.area,
      latitude: latitude ? Number(latitude) : complaint.location.latitude,
      longitude: longitude ? Number(longitude) : complaint.location.longitude,
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
  updateComplaint 
};

