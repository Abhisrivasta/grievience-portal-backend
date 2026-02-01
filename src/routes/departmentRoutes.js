const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createDepartment,
  getDepartments,
  updateDepartment,
} = require("../controllers/departmentController");

/**
 * @route   POST /api/departments
 * @desc    Create department
 * @access  Private (Admin)
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  createDepartment
);

/**
 * @route   GET /api/departments
 * @desc    Get departments
 * @access  Private (Admin, Officer)
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "officer"),
  getDepartments
);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update / disable department
 * @access  Private (Admin)
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  updateDepartment
);

module.exports = router;
