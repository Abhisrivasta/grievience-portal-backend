const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  updateComplaintStatus,
  assignComplaintToOfficer,
  getAllComplaints,
  getComplaintForOfficer,
} = require("../controllers/complaintController");

// 🟢 COMMON (All authenticated)

// Create complaint (Citizen)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("citizen"),
  createComplaint
);

// 👤 CITIZEN ROUTES

// Get my complaints
router.get(
  "/my",
  authMiddleware,
  roleMiddleware("citizen"),
  getMyComplaints
);

// Get single complaint (citizen)
router.get(
  "/citizen/:id",
  authMiddleware,
  roleMiddleware("citizen"),
  getComplaintById
);

// 👨‍💼 OFFICER ROUTES

// Get assigned complaints
router.get(
  "/assigned",
  authMiddleware,
  roleMiddleware("officer"),
  getAssignedComplaints
);

// Get single complaint (officer view)
router.get(
  "/officer/:id",
  authMiddleware,
  roleMiddleware("officer"),
  getComplaintForOfficer
);

// Update complaint status
router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware("officer"),
  updateComplaintStatus
);

// 👑 ADMIN ROUTES

// Get all complaints (with filters, search, etc.)
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getAllComplaints
);

// Assign complaint to officer
router.put(
  "/:id/assign",
  authMiddleware,
  roleMiddleware("admin"),
  assignComplaintToOfficer
);

module.exports = router;