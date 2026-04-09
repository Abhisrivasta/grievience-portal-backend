const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry
} = require("../controllers/inquiryController");

// PUBLIC
router.post("/", createInquiry);

// ADMIN
router.get("/", authMiddleware, roleMiddleware("admin"), getAllInquiries);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateInquiryStatus);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteInquiry);

module.exports = router;