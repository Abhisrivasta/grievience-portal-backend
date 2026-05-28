const OfficerProfile = require("../models/OfficerProfile");
const User = require("../models/User");
const Department = require("../models/Department");


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
      return res.status(400).json({
        success: false,
        message: "Officer ID and Department are required",
      });
    }

    const [officer, dept] = await Promise.all([
      User.findOne({ _id: officerId, role: "officer" })
        .select("name role")
        .lean(),
      Department.findOne({ _id: department, isActive: true })
        .select("name")
        .lean(),
    ]);

    if (!officer) {
      return res.status(400).json({
        success: false,
        message: "Invalid officer selected",
      });
    }

    if (!dept) {
      return res.status(400).json({
        success: false,
        message: "Invalid department",
      });
    }

    const update = {
      department,
    };

    if (designation?.trim()) update.designation = designation.trim();
    if (phone?.trim()) update.phone = phone.trim();

    if (maxActiveComplaints !== undefined) {
      update.maxActiveComplaints = Number(maxActiveComplaints);
    }

    if (typeof isActive === "boolean") {
      update.isActive = isActive;
    }

    const profile = await OfficerProfile.findOneAndUpdate(
      { officer: officerId },
      {
        $set: update,
        $setOnInsert: { officer: officerId },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        lean: true,
      }
    );

    return res.status(200).json({
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


const getOfficersWithProfiles = async (req, res, next) => {
  try {
    const officers = await User.find({ role: "officer" })
      .select("name email isActive")
      .sort({ createdAt: -1 })
      .lean();

    if (!officers.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const officerIds = officers.map((officer) => officer._id);

    const profiles = await OfficerProfile.find({
      officer: { $in: officerIds },
    })
      .select("officer department designation phone maxActiveComplaints isActive")
      .populate("department", "name")
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [profile.officer.toString(), profile])
    );

    const result = officers.map((officer) => ({
      ...officer,
      profile: profileMap.get(officer._id.toString()) || null,
    }));

    return res.status(200).json({
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
  getOfficersWithProfiles,
};