const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  getOverviewMetrics,
  getComplaintAnalytics,
  exportComplaintsCSV,
  getOfficerPerformanceReport,
} = require("../controllers/reportController");

// Overview metrics
router.get(
  "/overview",
  authMiddleware,
  roleMiddleware("admin"),
  getOverviewMetrics
);

// Complaint analytics
router.get(
  "/complaints",
  authMiddleware,
  roleMiddleware("admin"),
  getComplaintAnalytics
);

// Export complaints as CSV
router.get(
  "/export/csv",
  authMiddleware,
  roleMiddleware("admin"),
  exportComplaintsCSV
);

// Officer performance report
router.get(
  "/officers/performance",
  authMiddleware,
  roleMiddleware("admin"),
  getOfficerPerformanceReport
);

module.exports = router;
