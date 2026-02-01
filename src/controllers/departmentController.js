const Department = require("../models/Department");

//create department
const createDepartment = async (req, res, next) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      res.status(400);
      throw new Error(
        "Department name and category are required"
      );
    }

    const existingDepartment =
      await Department.findOne({ name });

    if (existingDepartment) {
      res.status(400);
      throw new Error(
        "Department already exists"
      );
    }

    const department =
      await Department.create({
        name,
        category,
        description,
      });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: {
        id: department._id,
        name: department.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

//get department
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

//update department
const updateDepartment = async (req, res, next) => {
  try {
    const { name, category, description, isActive } =
      req.body;

    const department = await Department.findById(
      req.params.id
    );

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }

    // Update allowed fields only
    if (name) department.name = name;
    if (category) department.category = category;
    if (description)
      department.description = description;
    if (typeof isActive === "boolean")
      department.isActive = isActive;

    await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: {
        id: department._id,
        name: department.name,
        isActive: department.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  createDepartment,
  getDepartments,
  updateDepartment,
};
