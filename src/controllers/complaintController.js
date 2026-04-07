const Complaint = require("../models/Complaint");
const AuditLog = require("../models/AuditLog");
const Department = require("../models/Department");
const User = require("../models/User");
const {
  createNotification,
} = require("../services/notificationService");


// create compalaints
const createComplaint = async (req, res, next) => {
  try {
    // FormData se data nikalna (Note: latitude/longitude req.body mein aayenge)
    const { title, description, category, area, latitude, longitude } = req.body;

    // Basic validation
    if (!title || !description || !category || !area) {
      res.status(400);
      throw new Error("Title, description, category and area are required");
    }

    // Image path handle karna
    let imagePath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    // Create complaint
    const complaint = await Complaint.create({
      title,
      description,
      category,
      location: {
        area,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
      image: imagePath,
      citizen: req.user.id,
      timeline: [
        {
          status: "Pending",
          remark: "Complaint registered by citizen with evidence",
          updatedBy: "System",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: {
        id: complaint._id,
        status: complaint.status,
        image: complaint.image
      },
    });
  } catch (error) {
    next(error);
  }
};

// getMyComplaints 
const getMyComplaints = async (req, res, next) => {
  try {
    // 1. Destructure and set defaults
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

    // 2. Prepare Pagination
    const pageNumber = Math.max(parseInt(page), 1);
    const limitNumber = Math.max(parseInt(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    // 3. Build Dynamic Filter Object
    const filter = { citizen: req.user.id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Advanced Search (Title or Category)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Date Range Logic
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // 4. Execute Query and Count in Parallel (Better Performance)
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ [sortBy]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("title category status priority createdAt"),
      Complaint.countDocuments(filter),
    ]);

    // 5. Structured Response
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

    if (!status) {
      res.status(400);
      throw new Error("Status is required");
    }

    const complaint = await Complaint.findById(
      req.params.id
    );

    if (!complaint) {
      res.status(404);
      throw new Error("Complaint not found");
    }

    // Ensure officer owns this complaint
    if (
      complaint.assignedOfficer?.toString() !==
      req.user.id
    ) {
      res.status(403);
      throw new Error(
        "You are not authorized to update this complaint"
      );
    }

    // Update fields
    complaint.status = status;

    if (priority) {
      complaint.priority = priority;
    }

    // Add timeline entry
    complaint.timeline.push({
      status,
      remark: remark || "Status updated by officer",
      updatedBy: "Officer",
    });

    await complaint.save();

    // Create audit log
    await AuditLog.create({
      action: "UPDATE_COMPLAINT_STATUS",
      performedBy: req.user.id,
      complaint: complaint._id,
      details: `Status changed to ${status}`,
      ipAddress: req.ip,
    });

    // Notify citizen
    await createNotification({
      userId: complaint.citizen,
      message: `Your complaint status has been updated to "${status}"`,
      type: "info",
      complaintId: complaint._id,
    });


    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
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

    // ✅ Search ko $and ke saath lagao taaki baaki filters bhi kaam karein
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



module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  updateComplaintStatus,
  assignComplaintToOfficer,
  getAllComplaints,
  getComplaintForOfficer
};

