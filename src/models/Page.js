// models/HomePage.js

const mongoose = require("mongoose");

const homePageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    contents: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomePage", homePageSchema);