const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createPage,
  getHomePage,
  updatePage,
} = require("../controllers/page.controller");



router.get("/home", getHomePage);

router.post("/", authMiddleware, roleMiddleware("admin"), createPage);

router.put("/:id", authMiddleware, roleMiddleware("admin"), updatePage);


module.exports = router;