const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Connection Error Details:");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;