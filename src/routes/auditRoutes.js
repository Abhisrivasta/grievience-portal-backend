const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  getAuditLogs,
} = require("../controllers/auditController");

 //  Get system audit logs

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  getAuditLogs
);

module.exports = router;
