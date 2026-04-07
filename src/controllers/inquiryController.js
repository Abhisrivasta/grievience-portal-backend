const Inquiry = require('../models/Inquiry');

// 1. Citizen message bheje (Public Route)
exports.createInquiry = async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    res.status(201).json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 2. Admin saare messages dekhe (Protected Route)
exports.getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};