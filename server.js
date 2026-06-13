require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = require("./src/config/db");
require("./src/models");

// Middleware
const errorHandler = require("./src/middlewares/errorHandler");
const logger = require("./src/middlewares/logger");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const feedbackRoutes = require("./src/routes/feedbackRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const officerRoutes = require("./src/routes/officerRoutes");
const homeRoutes = require("./src/routes/pageRoutes");
const inquiryRoutes = require("./src/routes/inquiryRoutes");
const aboutRoutes = require("./src/routes/aboutRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://grievience-portal-vqu8.vercel.app",
  "https://grievience-portal.vercel.app",
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(logger);

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/officers", officerRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/about", aboutRoutes);
app.use("/api/inquiries", inquiryRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Grievance Portal API is running...");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.get('/ping', (req, res) => {
    res.status(200).send("Server is awake!");
});


app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  });
