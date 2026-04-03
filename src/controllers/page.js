const Page = require("../models/Page");

const createPage = async (req, res, next) => {
  try {
    const { title, description, contents, slug } = req.body;

    // Validation
    if (!title || !slug) {
      res.status(400);
      throw new Error("Title and slug are required");
    }

    const existingPage = await Page.findOne({ slug });
    if (existingPage) {
      res.status(400);
      throw new Error("Page already exists with this slug");
    }

    const page = await Page.create({
      title,
      description,
      contents,
      slug,
    });

    res.status(201).json({
      success: true,
      data: page,
    });

  } catch (error) {
    next(error);
  }
};




const getHomePage = async (req, res, next) => {
  try {
    const page = await Page.findOne({ slug: "home" });

    if (!page) {
      res.status(404);
      throw new Error("Home page not found");
    }

    res.status(200).json({
      success: true,
      data: page,
    });

  } catch (error) {
    next(error);
  }
};



const updatePage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedPage = await Page.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPage) {
      res.status(404);
      throw new Error("Page not found");
    }

    res.status(200).json({
      success: true,
      data: updatedPage,
    });

  } catch (error) {
    next(error);
  }
};



const deletePage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedPage = await Page.findByIdAndDelete(id);

    if (!deletedPage) {
      res.status(404);
      throw new Error("Page not found");
    }

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });

  } catch (error) {
    next(error);
  }
};


module.exports = {
  createPage,
  getHomePage,
  updatePage,
  deletePage,
};