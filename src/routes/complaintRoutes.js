const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../utils/uploadHelper"); // Aapka naya helper

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

// 🟢 CITIZEN: Create complaint with Image Upload
router.post(
  "/",
  authMiddleware,
  roleMiddleware("citizen"),
  upload.single("image"), // Multer middleware
  createComplaint
);

// 👤 CITIZEN ROUTES
router.get("/my", authMiddleware, roleMiddleware("citizen"), getMyComplaints);
router.get("/citizen/:id", authMiddleware, roleMiddleware("citizen"), getComplaintById);

// 👨‍💼 OFFICER ROUTES
router.get("/assigned", authMiddleware, roleMiddleware("officer"), getAssignedComplaints);
router.get("/officer/:id", authMiddleware, roleMiddleware("officer"), getComplaintForOfficer);
router.put("/:id/status", authMiddleware, roleMiddleware("officer"), updateComplaintStatus);

// 👑 ADMIN ROUTES
router.get("/", authMiddleware, roleMiddleware("admin"), getAllComplaints);
router.put("/:id/assign", authMiddleware, roleMiddleware("admin"), assignComplaintToOfficer);

module.exports = router;