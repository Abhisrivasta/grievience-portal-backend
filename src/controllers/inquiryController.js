const Inquiry = require('../models/Inquiry');

// CREATE
exports.createInquiry = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const inquiry = await Inquiry.create({ name, email, subject, message });

    res.status(201).json({
      success: true,
      message: "Message sent successfully!",
      data: inquiry
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL (ADMIN)
exports.getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE STATUS
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteInquiry = async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Inquiry deleted"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};