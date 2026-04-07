const express = require('express');
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
import { createInquiry,getAllInquiries } from '../controllers/inquiryController';

router.post('/', createInquiry); 
router.get('/', authMiddleware, roleMiddleware("admin"), getAllInquiries); // Admin Only

module.exports = router;