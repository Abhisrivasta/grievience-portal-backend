const mongoose = require("mongoose");

const officerProfileSchema = new mongoose.Schema(
  {
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per officer
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    assignedWards: [
      {
        type: String,
        required: true,
      },
    ],

    designation: {
      type: String,
      default: "Field Officer",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "OfficerProfile",
  officerProfileSchema
);
