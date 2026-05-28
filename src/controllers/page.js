const HomePage = require("../models/Page");

const DEFAULT_HOME_PAGE = {
  title: "",
  description: "",
  contents: "",
  features: [],
  stats: [],
  ctaText: "",
  ctaSubText: "",
};

let homeCache = null;
let homeCacheTime = 0;

const HOME_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const normalizeHomePage = (home) => ({
  ...DEFAULT_HOME_PAGE,
  ...(home || {}),
});

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

    const payload = {
      title,
      description,
      contents,
      features: features || [],
      stats: stats || [],
      ctaText,
      ctaSubText,
    };

    const existingHome = await HomePage.findOne().select("_id").lean();

    let home;

    if (existingHome) {
      home = await HomePage.findByIdAndUpdate(existingHome._id, payload, {
        new: true,
        lean: true,
      });
    } else {
      const createdHome = await HomePage.create(payload);
      home = createdHome.toObject();
    }

    homeCache = normalizeHomePage(home);
    homeCacheTime = Date.now();

    return res.status(200).json({
      success: true,
      message: "Home page saved successfully",
      data: homeCache,
    });
  } catch (error) {
    next(error);
  }
};

const getHomePage = async (req, res, next) => {
  try {
    const now = Date.now();

    if (homeCache && now - homeCacheTime < HOME_CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        data: homeCache,
        cached: true,
      });
    }

    const home = await HomePage.findOne().lean();

    homeCache = normalizeHomePage(home);
    homeCacheTime = now;

    return res.status(200).json({
      success: true,
      data: homeCache,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertHomePage,
  getHomePage,
};