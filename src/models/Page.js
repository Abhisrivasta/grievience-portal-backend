const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  icon: String,
  title: String,
  desc: String,
});

const statSchema = new mongoose.Schema({
  label: String,
  value: String,
});

const homePageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: String,

    contents: String,

    features: [featureSchema],

    stats: [statSchema],

    ctaText: String,
    ctaSubText: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomePage", homePageSchema);