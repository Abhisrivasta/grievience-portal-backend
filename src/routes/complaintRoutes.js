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
} = require("../controllers/complaintController");

//create complaint
router.post(
  "/",
  authMiddleware,
  roleMiddleware("citizen"),
  createComplaint
);

// get my complaint
router.get("/my",
  authMiddleware,
  roleMiddleware("citizen"),
  getMyComplaints   
)

//Get complaint to assinged officer
router.get(
  "/assigned",
  authMiddleware,
  roleMiddleware("officer"),
  getAssignedComplaints
);

// assign complaint by admin
router.put(
  "/:id/assign",
  authMiddleware,
  roleMiddleware("admin"),
  assignComplaintToOfficer
);

//update complaint status
router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware("officer"),
  updateComplaintStatus
);

// Get complaint details of citizen
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("citizen"),
  getComplaintById
)


module.exports = router;