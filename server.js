const express = require("express")
const dotenv = require("dotenv")
const path = require("path"); 
const cors = require("cors")
const morgan = require("morgan")
const connectDB = require("./src/config/db")
require("./src/models");
const errorHandler = require("./src/middlewares/errorHandler")
const logger = require("./src/middlewares/logger")
const authRoutes = require("./src/routes/authRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes")
const feedbackRoutes = require("./src/routes/feedbackRoutes")
const reportRoutes = require("./src/routes/reportRoutes")
const auditRoutes = require("./src/routes/auditRoutes");
const departmentRoutes = require("./src/routes/departmentRoutes");
const officerRoutes = require("./src/routes/officerRoutes");






//load environment variables 
dotenv.config()

//create express app
const app = express()

//Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://grievience-portal-vqu8.vercel.app"
    ],
    credentials: true
  })
);
app.use(express.json())
app.use(morgan("dev"))
app.use(logger);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


//routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/officers", officerRoutes);



//testing
app.get("/",(req,res) => {
    res.send("App is running")
})

// Connect Database
connectDB();

console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI);

// Error Handler Middleware
app.use(errorHandler);


//port
const PORT = process.env.PORT || 5000

//start server 
app.listen(PORT , () => {
    console.log(`server is running on ${PORT}`)
})