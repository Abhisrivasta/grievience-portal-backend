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

router.use(authMiddleware, roleMiddleware("admin"));


router.get("/overview", getOverviewMetrics);


router.get("/complaints", getComplaintAnalytics);


router.get("/export/csv", exportComplaintsCSV);


router.get("/officers/performance", getOfficerPerformanceReport);

module.exports = router;