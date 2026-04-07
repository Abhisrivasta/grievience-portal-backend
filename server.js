require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const morgan = require("morgan");

// Database Configuration
const connectDB = require("./src/config/db");
require("./src/models"); // Models registration

// Middleware Imports
const errorHandler = require("./src/middlewares/errorHandler");
const logger = require("./src/middlewares/logger");

// Route Imports
const authRoutes = require("./src/routes/authRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const feedbackRoutes = require("./src/routes/feedbackRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const officerRoutes = require("./src/routes/officerRoutes");
const homeRoutes = require("./src/routes/pageRoutes");

const app = express();


const uploadDir = path.join(__dirname, "uploads/complaints");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created uploads/complaints directory");
}

// --- 🌐 CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://grievience-portal-vqu8.vercel.app",
  "https://grievience-portal.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked by server policy"));
      }
    },
    credentials: true,
  })
);

app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // FormData/URL-encoded parser
app.use(morgan("dev")); // Logging for development
app.use(logger); 

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- 🛣️ API ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/officers", officerRoutes);
app.use("/api/home", homeRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Grievance Portal API is running...");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📂 Static files served at: ${path.join(__dirname, "uploads")}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  });