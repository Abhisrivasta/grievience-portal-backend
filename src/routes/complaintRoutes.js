const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/upload");

const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAssignedComplaints,
  updateComplaintStatus, 
  assignComplaintToOfficer,
  getAllComplaints,
  getComplaintForOfficer,
  updateComplaint 
} = require("../controllers/complaintController");

// --- CITIZEN ROUTES ---
router.post("/", authMiddleware, roleMiddleware("citizen"), upload.single("image"), createComplaint);
router.get("/my", authMiddleware, roleMiddleware("citizen"), getMyComplaints);
router.get("/citizen/:id", authMiddleware, roleMiddleware("citizen"), getComplaintById);

router.put("/update/:id", authMiddleware, roleMiddleware("citizen"), upload.single("image"), updateComplaint);

// --- OFFICER ROUTES ---
router.get("/assigned", authMiddleware, roleMiddleware("officer"), getAssignedComplaints);
router.get("/officer/:id", authMiddleware, roleMiddleware("officer"), getComplaintForOfficer);
router.put("/:id/status", authMiddleware, roleMiddleware("officer"), updateComplaintStatus);

// --- ADMIN ROUTES ---
router.get("/", authMiddleware, roleMiddleware("admin"), getAllComplaints);
router.put("/:id/assign", authMiddleware, roleMiddleware("admin"), assignComplaintToOfficer);

module.exports = router;