const mongoose = require('mongoose');

const AboutSchema = new mongoose.Schema({
  heroTitle: { type: String, required: true },
  heroSubtitle: { type: String, required: true },
  heroDescription: { type: String, required: true },
  features: [
    {
      title: { type: String, required: true },
      desc: { type: String, required: true },
      iconName: { type: String, required: true } 
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('About', AboutSchema);