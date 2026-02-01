const mongoose = require("mongoose");

const reportRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["Daily", "Monthly", "Department"],
      required: true,
    },

    parameters: {
      type: Object,
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Failed"],
      default: "Pending",
    },

    generatedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ReportRequest",
  reportRequestSchema
);
