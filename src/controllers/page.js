const HomePage = require("../models/Page");

// ✅ UPSERT (Create or Update Homepage)
const upsertHomePage = async (req, res, next) => {
  try {
    const {
      title,
      description,
      contents,
      features,
      stats,
      ctaText,
      ctaSubText,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    let home = await HomePage.findOne();

    if (home) {
      home = await HomePage.findByIdAndUpdate(
        home._id,
        {
          title,
          description,
          contents,
          features: features || [],
          stats: stats || [],
          ctaText,
          ctaSubText,
        },
        { new: true }
      );
    } else {
      home = await HomePage.create({
        title,
        description,
        contents,
        features: features || [],
        stats: stats || [],
        ctaText,
        ctaSubText,
      });
    }

    res.status(200).json({
      success: true,
      message: "Home page saved successfully",
      data: home,
    });
  } catch (error) {
    next(error);
  }
};

const getHomePage = async (req, res, next) => {
  try {
    const home = await HomePage.findOne();

    res.status(200).json({
      success: true,
      data: home || {
        title: "",
        description: "",
        contents: "",
        features: [],
        stats: [],
        ctaText: "",
        ctaSubText: "",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertHomePage,
  getHomePage,
};