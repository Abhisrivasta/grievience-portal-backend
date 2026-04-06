const HomePage = require("../models/Page");

// controllers/home.controller.js
// ✅ Create or Update Home Page (Singleton)
const upsertHomePage = async (req, res, next) => {
  try {
    const { title, description, contents } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    let home = await HomePage.findOne();

    if (home) {
      // 🔁 Update existing
      home.title = title;
      home.description = description;
      home.contents = contents;

      await home.save();
    } else {
      // 🆕 Create new
      home = await HomePage.create({
        title,
        description,
        contents,
      });
    }

    res.status(200).json({
      success: true,
      data: home,
    });

  } catch (error) {
    next(error);
  }
};

// ✅ Get Home Page
const getHomePage = async (req, res, next) => {
  try {
    const home = await HomePage.findOne();

    if (!home) {
      return res.status(404).json({
        success: false,
        message: "Home page not found",
      });
    }

    res.status(200).json({
      success: true,
      data: home,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertHomePage,
  getHomePage,
};