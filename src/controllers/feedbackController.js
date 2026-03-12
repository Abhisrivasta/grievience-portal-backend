const Feedback = require("../models/Feedback");
const Complaint = require("../models/Complaint");

//  Submit feedback for a complaint

const submitFeedback = async (req, res, next) => {
  try {
    const { complaintId, rating, comment } = req.body;

    if (!complaintId || !rating) {
      res.status(400);
      throw new Error(
        "Complaint ID and rating are required"
      );
    }

    // Validate complaint
    const complaint = await Complaint.findById(
      complaintId
    );

    if (!complaint) {
      res.status(404);
      throw new Error("Complaint not found");
    }

    // Ownership check
    if (
      complaint.citizen.toString() !==
      req.user.id
    ) {
      res.status(403);
      throw new Error(
        "You are not authorized to give feedback for this complaint"
      );
    }

    // Ensure complaint is resolved
    if (complaint.status !== "Resolved") {
      res.status(400);
      throw new Error(
        "Feedback can be submitted only after complaint is resolved"
      );
    }

    // Prevent duplicate feedback
    const existingFeedback =
      await Feedback.findOne({
        complaint: complaintId,
      });

    if (existingFeedback) {
      res.status(400);
      throw new Error(
        "Feedback already submitted for this complaint"
      );
    }

    const feedback = await Feedback.create({
      complaint: complaintId,
      citizen: req.user.id,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        id: feedback._id,
        rating: feedback.rating,
      },
    });
  } catch (error) {
    next(error);
  }
};


const getAllFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("complaint", "title")
      .populate("citizen", "name email");

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getAllFeedbacks,
};
