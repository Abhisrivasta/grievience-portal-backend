const OfficerProfile = require("../models/OfficerProfile");
const User = require("../models/User");
const Department = require("../models/Department");

/**
 * @desc    Create or update officer profile
 * @route   POST /api/officers/profile
 * @access  Private (Admin)
 */
const upsertOfficerProfile = async (req, res, next) => {
  try {
    const {
      officerId,
      department,
      designation,
      phone,
      maxActiveComplaints,
      isActive,
    } = req.body;

    if (!officerId || !department) {
      res.status(400);
      throw new Error(
        "Officer ID and Department are required"
      );
    }

    // Validate officer user
    const officer = await User.findById(officerId);
    if (!officer || officer.role !== "officer") {
      res.status(400);
      throw new Error("Invalid officer selected");
    }

    // Validate department
    const dept = await Department.findById(department);
    if (!dept || !dept.isActive) {
      res.status(400);
      throw new Error("Invalid department");
    }

    let profile = await OfficerProfile.findOne({
      officer: officerId,
    });

    if (profile) {
      // Update existing profile
      if (department) profile.department = department;
      if (designation)
        profile.designation = designation;
      if (phone) profile.phone = phone;
      if (maxActiveComplaints !== undefined)
        profile.maxActiveComplaints =
          maxActiveComplaints;
      if (typeof isActive === "boolean")
        profile.isActive = isActive;
    } else {
      // Create new profile
      profile = await OfficerProfile.create({
        officer: officerId,
        department,
        designation,
        phone,
        maxActiveComplaints,
        isActive,
      });
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: "Officer profile saved successfully",
      data: {
        officer: officer.name,
        department: dept.name,
        designation: profile.designation,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get list of officers with profiles
 * @route   GET /api/officers
 * @access  Private (Admin)
 */
const getOfficersWithProfiles = async (req, res, next) => {
  try {
    const officers = await User.find({
      role: "officer",
    })
      .select("name email isActive")
      .lean();

    const officerIds = officers.map(
      (o) => o._id
    );

    const profiles = await OfficerProfile.find({
      officer: { $in: officerIds },
    })
      .populate("department", "name")
      .lean();

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.officer.toString()] = p;
    });

    const result = officers.map((officer) => ({
      ...officer,
      profile:
        profileMap[officer._id.toString()] ||
        null,
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  upsertOfficerProfile,
  getOfficersWithProfiles
};
