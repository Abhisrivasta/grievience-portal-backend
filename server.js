require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./src/config/db");
require("./src/models");

const errorHandler = require("./src/middlewares/errorHandler");
const logger = require("./src/middlewares/logger");

const authRoutes = require("./src/routes/authRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const feedbackRoutes = require("./src/routes/feedbackRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const officerRoutes = require("./src/routes/officerRoutes");

const app = express();



const allowedOrigins = [
  "http://localhost:5173",
  "https://grievience-portal-vqu8.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked"));
      }
    },
    credentials: true,
  })
);



app.use(express.json());
app.use(morgan("dev"));
app.use(logger);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));



app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/officers", officerRoutes);



app.get("/", (req, res) => {
  res.send("🚀 API is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});



app.use(errorHandler);



const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  });