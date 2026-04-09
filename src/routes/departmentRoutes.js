const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createDepartment,
  getDepartments,
  updateDepartment,
} = require("../controllers/departmentController");


router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  createDepartment
);


router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "officer"),
  getDepartments
);


router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  updateDepartment
);

module.exports = router;
