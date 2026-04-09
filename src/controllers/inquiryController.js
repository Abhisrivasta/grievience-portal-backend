const Inquiry = require('../models/Inquiry');
const { createNotification } = require("../services/notificationService");

exports.createInquiry = async (req, res) => {
  console.log("Creating notification...");
  try {
    const { name, email, subject, message } = req.body;

    const inquiry = await Inquiry.create({
      name,
      email,
      subject,
      message,
      user: req.user.id, 
    });

    res.status(201).json({
      success: true,
      data: inquiry,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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


exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, replyMessage } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    // Update
    if (status) inquiry.status = status;
    if (replyMessage) inquiry.replyMessage = replyMessage;

    await inquiry.save();

    // 🔥 SEND NOTIFICATION (NOW ALWAYS WORKS)
    if (status === "Replied" && replyMessage) {
      await createNotification({
        userId: inquiry.user,
        message: `Your inquiry "${inquiry.subject}" has been answered`,
        type: "info",
      });
    }

    res.json({
      success: true,
      message: "Inquiry updated + notification sent",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
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