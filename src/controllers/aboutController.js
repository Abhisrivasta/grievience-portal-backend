const About = require('../models/About');

// GET about content
exports.getAboutContent = async (req, res) => {
  try {
    const content = await About.findOne();
    res.status(200).json(content);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err });
  }
};

// UPDATE about content (Admin Only)
exports.updateAboutContent = async (req, res) => {
  try {
    let content = await About.findOne();
    if (content) {
      content = await About.findByIdAndUpdate(content._id, req.body, { new: true });
    } else {
      content = await About.create(req.body);
    }
    res.status(200).json(content);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err });
  }
};