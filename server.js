require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const { GridFSBucket, ObjectId, Admin } = require("mongodb");
const nodemailer = require("nodemailer");
const puppeteer = require('puppeteer');

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(
  cors({
    origin: "*", // for development only
    //exposedHeaders: ['Authorization']
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.set('trust proxy', true); // Trust the x-forwarded-for header for real client IP

// ✅ MongoDB Connection
const conn = mongoose.createConnection(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
});
console.log(process.env.MONGODB_URI);

conn.on("connected", () => {
  console.log("MongoDB connected successfully");
});
conn.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});
conn.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// ✅ GridFS Setup (replace gridfs-stream with native GridFSBucket)
let gfsBucket;
conn.once("open", () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: "profileImages" });
  console.log("GridFSBucket initialized successfully");
});

// ✅ GridFS Storage Engine
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => ({
    bucketName: "profileImages",
    filename: `${Date.now()}-${file.originalname}`,
  }),
});
const upload = multer({ storage });

// ✅ Test connection
(async () => {
  try {
    await conn.asPromise();
    console.log("Database connection test successful");
  } catch (err) {
    console.error("Database connection test failed:", err.message);
  }
})();

// ✅ Models (using `conn` instead of `mongoose`)
const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    address: String,
    mobile: String,
    email: String,
    idCardType: String,
    idCardNumber: String,
    role: {
      type: String,
      enum: [
        "junior_developer",
        "senior_developer",
        "junior_writer",
        "senior_writer",
        "team_leader",
        "bdm",
        "hr_recruiter",
        "hr_executive",
        "hr_manager",
        "hr_admin",
        "admin",
      ],
      default: "junior_developer",
    },
    doj: Date,
    isAdmin: { type: Boolean, default: false },
    profileImage: {
      fileId: mongoose.Schema.Types.ObjectId,
      filename: String,
    },
    allowMobileAttendance: { type: Boolean, default: false },
  },
  { collection: "Employee Details", timestamps: true }
);

employeeSchema.index({ employeeId: 1 }, { unique: true });

const Employee = conn.model("Employee", employeeSchema);

// One-time script to set allowMobileAttendance: true for all employees
// Uncomment and run once, then remove or comment again

/*Employee.updateMany({}, { $set: { allowMobileAttendance: true } })
  .then(result => {
    console.log('Updated allowMobileAttendance for all employees:', result.modifiedCount);
  })
  .catch(err => {
    console.error('Error updating allowMobileAttendance:', err);
  });
*/


// --- Update LeaveRequest schema to support attachment ---
const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: String,
    name: String,
    reason: String,
    leaveCount: Number,
    fromDate: Date,
    toDate: Date,
    comments: String,
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    paidLeaves: { type: Number, default: 0 },
    unpaidLeaves: { type: Number, default: 0 },
    leaveType: { type: [String], enum: ["CL", "SL", "NPL", "DNPL", "Pending"], default: ["Pending"] },
    dnplCount: { type: Number, default: 0 }, // <-- Added field
    createdAt: { type: Date, default: Date.now },
    attachment: {
      data: Buffer,
      contentType: String,
      originalName: String,
    },
  },
  { collection: "Leave Requests" }
);

const LeaveRequest = conn.model("LeaveRequest", leaveRequestSchema);

// --- Multer setup for leave request attachment (max 512KB) ---
const leaveAttachmentUpload = multer({
  limits: { fileSize: 512 * 1024 }, // 512KB
  storage: multer.memoryStorage(),
});

// Attendance Model
const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String },
    date: { type: Date, required: true },
    status: { type: String, enum: ["Present", "Absent", "WFH"], default: "Present" },
    checkIn: { type: String }, // e.g. '09:15 AM'
    checkOut: { type: String }, // e.g. '06:30 PM'
    lateEntry: { type: Boolean, default: false },
    lateCount: { type: Number, default: 0 },
    earlyCheckout: { type: Boolean, default: false },
    earlyCheckoutCount: { type: Number, default: 0 },
  },
  { collection: "Attendance", timestamps: true }
);
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
const Attendance = conn.model("Attendance", attendanceSchema);
// const attendanceData = {
//   employeeId: "AOP0099",
//   employeeName: "Sovraj Dey",
//   date: "2025-07-02T00:00:00.000+00:00",
//   status: "Present",
//   checkIn: "11:22",
//   checkOut: "18:50",
//   lateEntry: false,
//   lateCount: 1,
//   earlyCheckout: false,
//   earlyCheckoutCount: 0,
//   createdAt: new Date(),
//   updatedAt: new Date()
// };

// Attendance.create(attendanceData)
//   .then(doc => {
//     console.log("Attendance added:", doc);
//   })
//   .catch(err => {
//     console.error("Error adding attendance:", err);
//   });

// Word Count Model
const wordCountSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    date: { type: Date, required: true },
    wordCount: { type: Number, required: true },
    createdBy: { type: String, required: true }, // admin/hr who entered
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "WordCounts", timestamps: true }
);
wordCountSchema.index({ employeeId: 1, date: 1 }, { unique: true });
const WordCount = conn.model("WordCount", wordCountSchema);

// --- Notification/Notice Schema ---
const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String },
    recipientId: { type: String }, // If set, for individual; if not, for all
    isForAll: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    readBy: { type: [String], default: [] }, // Array of employeeIds who have read
    comments: { type: String }, // <-- add this
    reason: { type: String },   // <-- add this
    downloadUrl: { type: String }, // <-- Add this field!
  },
  { collection: "Notifications", timestamps: true }
);
const Notification = conn.model("Notification", notificationSchema);

// --- WFH Request Schema ---
const wfhRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    employeeRole: { type: String, required: true },
    reason: { type: String, required: true },
    wfhCount: { type: Number, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    comments: { type: String },
    attachment: {
      data: Buffer,
      contentType: String,
      originalName: String,
    },
    isReadByHR: { type: Boolean, default: false },
    isReadByAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "WFH Requests", timestamps: true }
);

const WFHRequest = conn.model("WFHRequest", wfhRequestSchema);

// --- Multer setup for WFH request attachment (max 1MB) ---
const wfhAttachmentUpload = multer({
  limits: { fileSize: 1024 * 1024 }, // 1MB
  storage: multer.memoryStorage(),
});

// ✅ Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  // console.log(authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  console.log("jwtToken->", token);
  if (!token) {
    console.warn("Token missing from request headers");
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, user) => {
    if (err) {
      console.warn("Token verification failed", err.message);
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    console.log("Authenticated user:", user);
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user.isAdmin)
    return res.status(403).json({ success: false, message: "Admin access required" });
  next();
}

// New middleware for HR and Admin access
function requireHRorAdmin(req, res, next) {
  const adminRoles = ["admin", "hr_admin"];
  const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];
  const userRole = req.user.role;
  if (!adminRoles.includes(userRole) && !hrRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only administrators and HR personnel can perform this action.",
    });
  }
  next();
}

// Middleware for HR, Admin, and Team Leader access (for word count entry only)
function requireHRorAdminOrTeamLeader(req, res, next) {
  const adminRoles = ["admin", "hr_admin"];
  const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];
  const teamLeaderRoles = ["team_leader"];
  const userRole = req.user.role;
  if (!adminRoles.includes(userRole) && !hrRoles.includes(userRole) && !teamLeaderRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only administrators, HR personnel, and team leaders can perform this action.",
    });
  }
  next();
}

// Company allowed IPs for attendance section (sample, update as needed)
const allowedIPs = [
 
"223.223.154.133",
"223.185.35.96",

"49.37.8.149",
"49.37.11.79",
"223.185.29.129"
  // Add more as needed
];

// Middleware to restrict by allowMobileAttendance only (IP check commented out)
async function restrictAttendanceByIP(req, res, next) {
  // req.user is set by authenticateToken
  if (req.user && req.user.employeeId) {
    // Fetch employee from DB to get allowMobileAttendance
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (employee && employee.allowMobileAttendance) {
      return next(); // Allow from any IP
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied: Mobile attendance not allowed for this user.",
      });
    }
  }
  // --- IP check code commented out ---
  // let ip = req.headers["x-forwarded-for"];
  // if (ip) {
  //   ip = ip.split(",")[0].trim();
  // } else {
  //   ip = req.ip;
  // }
  // if (ip && ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  // if (!allowedIPs.includes(ip)) {
  //   return res.status(403).json({
  //     success: false,
  //     message: "Access denied: Not a company device (IP not allowed)",
  //     ip,
  //   });
  // }
  // next();
}

// Nodemailer transporter setup (use your SMTP config or Gmail for demo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // no-reply email
    pass: process.env.SMTP_PASS,
  },
});
console.log("SMTP Config:", process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER);

// Utility: Send email
async function sendNoticeEmail({ to, subject, text }) {
  if (!to) {
    console.log("No recipient email provided:", to);
    return;
  }
  try {
    let info = await transporter.sendMail({
      from: `No Reply <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    console.log("Email sent:", info.messageId, "to:", to);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

// Helper to get IST date
function getISTDate(date = new Date()) {
  // IST is UTC+5:30
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
}

// ✅ Routes

// Login
app.post("/api/login", async (req, res) => {
  try {

    
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Employee ID and password are required." });
    }

    const employee = await Employee.findOne({ employeeId }).maxTimeMS(5000);
    if (!employee) {
      return res.status(401).json({ success: false, message: "Invalid Employee ID or password." });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid Employee ID or password." });
    }

    const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

    // Generate JWT token with more user data
    const token = jwt.sign(
      {
        employeeId: employee.employeeId,
        isAdmin: employee.isAdmin,
        name: fullName || employee.employeeId,
        role: employee.role,
      },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn: "24h", // Increased token expiry time
      }
    );

    // Send response with token in header
    res.setHeader("Authorization", `Bearer ${token}`);
    res.json({
      success: true,
      message: "Login successful",
      token,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: fullName || employee.employeeId,
        isAdmin: employee.isAdmin,
        role: employee.role,
        profileImage: employee.profileImage || null,
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        address: employee.address || "",
        mobile: employee.mobile || "",
        email: employee.email || "",
        idCardType: employee.idCardType || "",
        idCardNumber: employee.idCardNumber || "",
        doj: employee.doj || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "An error occurred during login. Please try again." });
  }
});

// Add Employee
app.post(
  "/api/employees",
  authenticateToken,
  requireHRorAdmin,
  upload.single("profileImage"),
  async (req, res) => {
    console.log("body-form", req.body);
    console.log("ufile upload", req.file);
    console.log("HIT /api/employees");

    const {
      employeeId,
      password,
      firstName,
      lastName,
      address,
      mobile,
      email,
      idCardType,
      idCardNumber,
      role,
      doj,
    } = req.body;
    if (!employeeId || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Employee ID, password, and role are required." });
    }

    // Validate role
    const validRoles = [
      "junior_developer",
      "senior_developer",
      "junior_writer",
      "senior_writer",
      "team_leader",
      "bdm",
      "hr_recruiter",
      "hr_executive",
      "hr_manager",
      "hr_admin",
      "admin",
      
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Please select a valid role from the dropdown.",
      });
    }

    // Check if user has permission to assign admin roles
    const adminRoles = ["admin", "hr_admin"];
    if (adminRoles.includes(role) && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only administrators can create admin accounts.",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Set isAdmin based on role
      const isAdmin = adminRoles.includes(role);

      const employeeData = {
        employeeId,
        password: hashedPassword,
        firstName,
        lastName,
        address,
        mobile,
        email,
        idCardType,
        idCardNumber,
        role,
        doj,
        isAdmin: isAdmin,
      };

      if (req.file) {
        employeeData.profileImage = {
          fileId: req.file.id,
          filename: req.file.filename,
        };
      }

      const newEmployee = new Employee(employeeData);
      await newEmployee.save();
      res.json({ success: true, message: "Employee added successfully." });
    } catch (err) {
      if (err.code === 11000) {
        res.status(400).json({ success: false, message: "Employee ID already exists." });
      } else {
        console.error("Error adding employee:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  }
);

// Get all employees (admin/HR)
app.get("/api/employees", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const employees = await Employee.find({}, "-password");
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get profile image (use native GridFSBucket)
app.get("/api/employees/:id/profile-image", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      console.error("Employee not found:", req.params.id);
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (!employee.profileImage) {
      console.error("Profile image not set for employee:", req.params.id);
      return res.status(404).json({ success: false, message: "Profile image not found" });
    }
    // Find the file in files collection (for contentType)
    const fileDoc = await conn.db
      .collection("profileImages.files")
      .findOne({ _id: employee.profileImage.fileId });
    if (!fileDoc) {
      console.error("File not found in GridFS:", employee.profileImage.fileId);
      return res.status(404).json({ success: false, message: "File not found" });
    }
    res.set("Content-Type", fileDoc.contentType || "image/jpeg");
    // Stream the file using GridFSBucket
    const downloadStream = gfsBucket.openDownloadStream(employee.profileImage.fileId);
    downloadStream.on("error", (err) => {
      console.error("Error streaming file:", err);
      res.status(404).json({ success: false, message: "Error streaming file" });
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error("Error in profile-image route:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Update profile image
app.patch("/api/employees/:id/profile-image", authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    if (employee.profileImage?.fileId) {
      await gfsBucket.delete(employee.profileImage.fileId);
    }

    if (req.file) {
      employee.profileImage = {
        fileId: req.file.id,
        filename: req.file.filename,
      };
      await employee.save();
      res.json({ success: true, message: "Profile image updated successfully" });
    } else {
      res.status(400).json({ success: false, message: "No image file provided" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update employee details (admin/HR only)
app.put("/api/employees/:employeeId", authenticateToken, requireHRorAdmin, upload.single("profileImage"), async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log("Updating employee:", employeeId);
    console.log("Request body:", req.body);
    const employee = await Employee.findOne({ employeeId });
    console.log("Found employee:", employee);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Update fields
    if (req.body.firstName) employee.firstName = req.body.firstName;
    if (req.body.lastName) employee.lastName = req.body.lastName;
    if (req.body.email) employee.email = req.body.email;
    if (req.body.mobile) employee.mobile = req.body.mobile;
    if (req.body.role) employee.role = req.body.role;
    if (req.body.address) employee.address = req.body.address;
    if (req.body.doj) employee.doj = new Date(req.body.doj);
    if (req.body.idCardType) employee.idCardType = req.body.idCardType;
    if (req.body.idCardNumber) employee.idCardNumber = req.body.idCardNumber;

    // Handle profile image update
    if (req.file) {
      // Delete old image if exists
      if (employee.profileImage?.fileId) {
        try {
          await gfsBucket.delete(employee.profileImage.fileId);
        } catch (err) {
          console.log("Old image not found or already deleted");
        }
      }
      
      // Set new image
      employee.profileImage = {
        fileId: req.file.id,
        filename: req.file.filename,
      };
    }
console.log("Employee data to save:", employee);
    await employee.save();
    res.json({ success: true, message: "Employee updated successfully" });
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- Enhanced POST /api/leave-requests: Split multi-month requests ---
app.post(
  "/api/leave-requests",
  authenticateToken,
  leaveAttachmentUpload.single("attachment"),
  async (req, res) => {
    const { reason, leaveCount, fromDate, toDate, comments } = req.body;
    const { employeeId, name } = req.user;

    if (!reason || !leaveCount || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "All required fields are missing." });
    }

    try {
      // Parse dates
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (end < start) {
        return res
          .status(400)
          .json({ success: false, message: "To date cannot be before from date." });
      }
      // Company holiday list (recurring every year)
      const holidays = [
        "01-26", // Republic Day
        "03-14", // Doljatra
        "08-15", // Independence Day
        "09-29", // Saptami
        "10-01", // Astami
        "10-02", // Nabami
        "10-03", // Doshomi
        "10-20", // Kalipujo
        "10-21", // Diwali
        "12-25", // Christmas
      ];
      // Check if any requested date is a holiday
      let d = new Date(start);
      while (d <= end) {
        const mmdd = d.toISOString().slice(5, 10);
        if (holidays.includes(mmdd)) {
          return res.status(400).json({ success: false, message: `Cannot apply leave on a company holiday (${mmdd}).` });
        }
        d.setDate(d.getDate() + 1);
      }
      // Prepare attachment (if any)
      let attachment = undefined;
      if (req.file) {
        if (req.file.size > 512 * 1024) {
          return res
            .status(400)
            .json({ success: false, message: "Attachment too large (max 512KB)" });
        }
        attachment = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
          originalName: req.file.originalname,
        };
      }
      // --- New logic: Group all working days in each month into a single leave request ---
      // 1. Collect all working days (non-Sundays) between start and end, grouped by month
      let workingDaysByMonth = {}; // { '2025-06': [dates...], '2025-07': [dates...] }
      let d1 = new Date(start);
      while (d1 <= end) {
        if (d1.getDay() !== 0) {
          // skip Sundays
          const monthKey = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}`;
          if (!workingDaysByMonth[monthKey]) workingDaysByMonth[monthKey] = [];
          workingDaysByMonth[monthKey].push(new Date(d1));
        }
        d1.setDate(d1.getDate() + 1);
      }
      // 2. For each month, create a single leave request for all working days in that month
      let responses = [];
      const paidLeavesAssigned = {}; // Track paid leaves assigned in this request per month
      let isFirstSegment = true;
      console.log("workingDaysByMonth->", workingDaysByMonth);
      for (const monthKey of Object.keys(workingDaysByMonth)) {
        const daysArr = workingDaysByMonth[monthKey];
        console.log("daysArr->", daysArr);
        if (!daysArr.length) continue;
        const from = daysArr[0];
        console.log("from->", from);
        const to = daysArr[daysArr.length - 1];
        console.log("to->", to);
        const leaveCount = daysArr.length;
        // Calculate paid/unpaid for this month
        const [year, monthStr] = monthKey.split("-");
        const yearNum = parseInt(year);
        const monthNum = parseInt(monthStr);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEndFull = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        // Get paid leaves already in DB for this month
        const existingLeaves = await LeaveRequest.find({
          employeeId,
          fromDate: { $gte: monthStart, $lte: monthEndFull },
          status: { $in: ["Pending", "Approved"] },
        });
        let alreadyPaid = 0;
        existingLeaves.forEach((lr) => {
          alreadyPaid += lr.paidLeaves || 0;
        });
        // Add paid leaves assigned in this request so far for this month
        alreadyPaid += paidLeavesAssigned[monthKey] || 0;
        // Assign paid/unpaid
        let paidLeaves = 0,
          unpaidLeaves = 0;
        if (alreadyPaid >= 2) {
          paidLeaves = 0;
          unpaidLeaves = leaveCount;
        } else if (alreadyPaid + leaveCount <= 2) {
          paidLeaves = leaveCount;
          unpaidLeaves = 0;
        } else {
          paidLeaves = 2 - alreadyPaid;
          unpaidLeaves = leaveCount - paidLeaves;
        }
        // Update the in-memory map
        paidLeavesAssigned[monthKey] = (paidLeavesAssigned[monthKey] || 0) + paidLeaves;
        // Save this month's segment as a LeaveRequest
        const leave = new LeaveRequest({
          employeeId,
          name,
          reason,
          leaveCount,
          fromDate: from,
          toDate: to,
          comments,
          paidLeaves,
          unpaidLeaves,
          leaveType: "Pending",
          attachment: attachment && isFirstSegment ? attachment : undefined, // Only attach file to first segment
        });
        await leave.save();
        // --- Notification for HR/Admin ---
        const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];
        const hrEmployees = await Employee.find({ role: { $in: hrRoles } }, "employeeId email");
        const adminEmployees = await Employee.find({ role: "Admin" }, "employeeId email");
        const allRecipients = [...hrEmployees, ...adminEmployees];
        for (const recipient of allRecipients) {
          const notification = new Notification({
            message: `New leave request from ${name} (${employeeId}) for ${leaveCount} days from ${from.toDateString()} to ${to.toDateString()}`,
            senderId: employeeId,
            senderName: name,
            recipientId: recipient.employeeId,
            isForAll: false,
            comments, // <-- add this
            reason,   // <-- add this
          });
          await notification.save();
          if (recipient.email) {
            await sendNoticeEmail({
              to: recipient.email,
              subject: `New Leave Request - ${name}`,
              text: `A new leave request has been submitted:\n\nEmployee: ${name} (${employeeId})\nReason: ${reason}\nDuration: ${leaveCount} days\nFrom: ${from.toDateString()}\nTo: ${to.toDateString()}\n\nPlease review and approve/reject this request.`
            });
          }
        }
        // --- Notify Team Leader if not already notified ---
        const team = await Team.findOne({ team_members: employeeId });
        const teamLeaderId = team?.team_leader;
        if (teamLeaderId && !allRecipients.some(r => r.employeeId === teamLeaderId)) {
          const notification = new Notification({
            message: `New leave request from ${name} (${employeeId}) for ${leaveCount} days from ${from.toDateString()} to ${to.toDateString()}`,
            senderId: employeeId,
            senderName: name,
            recipientId: teamLeaderId,
            isForAll: false,
            comments,
            reason,
          });
          await notification.save();
          const teamLeader = await Employee.findOne({ employeeId: teamLeaderId });
          if (teamLeader?.email) {
            await sendNoticeEmail({
              to: teamLeader.email,
              subject: `New Leave Request - ${name}`,
              text: `A new leave request has been submitted:\n\nEmployee: ${name} (${employeeId})\nReason: ${reason}\nDuration: ${leaveCount} days\nFrom: ${from.toDateString()}\nTo: ${to.toDateString()}\n\nPlease review and approve/reject this request.`
            });
          }
        }
        responses.push({
          month: monthNum,
          year: yearNum,
          paidLeaves,
          unpaidLeaves,
          days: leaveCount,
          fromDate: from,
          toDate: to,
        });
        isFirstSegment = false;
        if (Array.isArray(leave.leaveType)) {
          leave.dnplCount = leave.leaveType.filter(type => type === "DNPL").length;
          await leave.save();
        } else {
          leave.dnplCount = 0;
          await leave.save();
        }
      }
      res.json({
        success: true,
        message: "Leave request submitted and split by month.",
        breakdown: responses,
      });
    } catch (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ success: false, message: "Attachment too large (max 512KB)" });
      }
      console.error("Error submitting leave request:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Leave Request (view)
app.get("/api/leave-requests", authenticateToken, async (req, res) => {
  try {
    const adminRoles = ["admin", "hr_admin"];
    const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];

    // Admin and HR roles can see all leave requests, others see only their own
    const canViewAll = adminRoles.includes(req.user.role) || hrRoles.includes(req.user.role);

    const leaveRequests = canViewAll
      ? await LeaveRequest.find().sort({ createdAt: -1 })
      : await LeaveRequest.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
    res.json({ success: true, leaveRequests });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Leave Request (approve/reject)
app.patch(
  "/api/leave-requests/:id/approve",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const leave = await LeaveRequest.findById(req.params.id);
      if (!leave)
        return res.status(404).json({ success: false, message: "Leave request not found" });

      leave.status = "Approved";
      leave.approvedAt = getISTDate();
      await leave.save();
      // --- Notification for employee ---
      const notification = new Notification({
        message: `Your leave request for ${leave.leaveCount} days (${leave.fromDate.toDateString()} - ${leave.toDate.toDateString()}) has been approved.`,
        senderId: req.user.employeeId,
        senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
        recipientId: leave.employeeId,
        isForAll: false,
        comments: leave.comments, // <-- add this
        reason: leave.reason,      // <-- add this
      });
      await notification.save();
      const employee = await Employee.findOne({ employeeId: leave.employeeId });
      if (employee && employee.email) {
        await sendNoticeEmail({
          to: employee.email,
          subject: `Leave Request Approved - ${leave.name}`,
          text: `Your leave request has been approved by ${req.user.name || `${req.user.firstName} ${req.user.lastName}`}.\n\nDetails:\nDuration: ${leave.leaveCount} days\nFrom: ${leave.fromDate.toDateString()}\nTo: ${leave.toDate.toDateString()}\nReason: ${leave.reason}\n\nThis is an automated no-reply email.`
        });
      }
      res.json({ success: true, message: "Leave request approved" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
app.patch(
  "/api/leave-requests/:id/reject",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const leave = await LeaveRequest.findById(req.params.id);
      if (!leave)
        return res.status(404).json({ success: false, message: "Leave request not found" });

      leave.status = "Rejected";
      leave.approvedAt = getISTDate();
      await leave.save();
      res.json({ success: true, message: "Leave request rejected" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Get employee statistics (admin only)
app.get("/api/employees/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const totalAdmins = await Employee.countDocuments({ isAdmin: true });

    res.json({
      success: true,
      totalEmployees,
      totalAdmins,
    });
  } catch (err) {
    console.error("Error getting employee stats:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Pay slip generation (admin/HR)
// app.post("/api/pay-slip", authenticateToken, requireHRorAdmin, async (req, res) => {
//   try {
//     const { employeeId, month, year, basicSalary, hra, specialAllowance, deductions, netSalary } =
//       req.body;

//     if (!employeeId || !month || !year) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee ID, month, and year are required for pay slip generation.",
//       });
//     }

//     // Check if employee exists
//     const employee = await Employee.findOne({ employeeId });
//     if (!employee) {
//       return res.status(404).json({
//         success: false,
//         message: "Employee not found.",
//       });
//     }

//     // Here you would typically save the pay slip to database
//     // For now, we'll just return success
//     res.json({
//       success: true,
//       message: "Pay slip generated successfully",
//       data: {
//         employeeId,
//         employeeName: `${employee.firstName} ${employee.lastName}`,
//         month,
//         year,
//         basicSalary,
//         hra,
//         specialAllowance,
//         deductions,
//         netSalary,
//       },
//     });
//   } catch (err) {
//     console.error("Error generating pay slip:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// API: Mark attendance (check-in/check-out, late entry, late count)
app.post("/api/attendance", authenticateToken, restrictAttendanceByIP, async (req, res) => {
  try {
    const { employeeId, employeeName, checkIn, checkOut } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required." });
    }
    // Always use IST string for attendance date
    const attendanceDate = getISTDateString();
    let att = await Attendance.findOne({ employeeId, date: attendanceDate });

    // Helper to calculate late/early
    function getLateEntry(checkIn) {
      if (!checkIn) return false;
      const [hIn, mIn] = checkIn.split(":").map(Number);
      return hIn > 11 || (hIn === 11 && mIn > 30);
    }
    function getEarlyCheckout(checkOut) {
      if (!checkOut) return false;
      const [hOut, mOut] = checkOut.split(":").map(Number);
      return hOut < 18;
    }

    // Calculate late/early flags
    let lateEntry = false, earlyCheckout = false;
    let lateCount = 0, earlyCheckoutCount = 0;
    let newCheckIn = checkIn, newCheckOut = checkOut;
    if (att) {
      // Prevent duplicate log-in for today
      if (checkIn && att.checkIn) {
        return res.status(400).json({ error: "ALREADY_LOGGED_IN" });
      }
      // Update existing record
      if (checkIn && !att.checkIn) att.checkIn = checkIn;
      if (checkOut) att.checkOut = checkOut;
      // Recalculate flags
      lateEntry = getLateEntry(att.checkIn);
      earlyCheckout = getEarlyCheckout(att.checkOut);
      att.lateEntry = lateEntry;
      att.earlyCheckout = earlyCheckout;
      att.status = "Present";
      // Calculate counts for the month
      const month = new Date(attendanceDate).getMonth();
      const year = new Date(attendanceDate).getFullYear();
      const monthStart = new Date(year, month, 1);
      const prevLateCount = await Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lt: new Date(attendanceDate) }, lateEntry: true });
      const prevEarlyCheckoutCount = await Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lt: new Date(attendanceDate) }, earlyCheckout: true });
      lateCount = lateEntry ? prevLateCount + 1 : prevLateCount;
      earlyCheckoutCount = earlyCheckout ? prevEarlyCheckoutCount + 1 : prevEarlyCheckoutCount;
      att.lateCount = lateCount;
      att.earlyCheckoutCount = earlyCheckoutCount;
      await att.save();
      return res.json({ success: true, lateEntry, earlyCheckout, lateCount, earlyCheckoutCount });
    } else {
      // New record (must have at least checkIn)
      if (!checkIn) {
        return res.status(400).json({ success: false, message: "Check-in required for new attendance record." });
      }
      lateEntry = getLateEntry(checkIn);
      // Calculate counts for the month
      const month = new Date(attendanceDate).getMonth();
      const year = new Date(attendanceDate).getFullYear();
      const monthStart = new Date(year, month, 1);
      const prevLateCount = await Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lt: new Date(attendanceDate) }, lateEntry: true });
      lateCount = lateEntry ? prevLateCount + 1 : prevLateCount;
      att = new Attendance({
        employeeId,
        employeeName,
        date: new Date(attendanceDate),
        checkIn,
        lateEntry,
        lateCount,
        status: "Present"
      });
      await att.save();
      return res.json({ success: true, lateEntry, lateCount });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// API: Attendance & Leave summary for dashboard
app.get("/api/attendance-summary", authenticateToken, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId, month, and year are required." });
    }
    const m = parseInt(month) - 1; // JS months are 0-based
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m, new Date(y, m + 1, 0).getDate(), 23, 59, 59, 999); // Last day of month, 23:59:59
    console.log("start,end",start,end);

    // Attendance count
    const attendanceDocs = await Attendance.find({
      employeeId,
      date: { $gte: start, $lte: end },
      status: "Present",
    });
    const attendanceCount = attendanceDocs.length;

    // All attendance for calendar
    const allAttendance = await Attendance.find({
      employeeId,
      date: { $gte: start, $lte: end },
    });
    const attendanceMap = {};
    allAttendance.forEach((a) => {
      attendanceMap[a.date.toISOString().slice(0, 10)] = a.status;
    });

    // Leave requests (approved only)
    const leaveDocs = await LeaveRequest.find({
      employeeId,
      status: "Approved",
      $or: [
        { fromDate: { $lte: end }, toDate: { $gte: start } },
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
      ],
    });
    // --- Fix: Count each day only once as paid or unpaid, sum up for the month ---
    let paidLeaves = 0,
      unpaidLeaves = 0;
    const leaveDays = {}; // { 'YYYY-MM-DD': 'Paid' | 'Unpaid' }
    leaveDocs.forEach((lr) => {
      const from = new Date(Math.max(start, lr.fromDate));
      const to = new Date(Math.min(end, lr.toDate));
      let paidLeft = lr.paidLeaves || 0;
      let unpaidLeft = lr.unpaidLeaves || 0;
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (!leaveDays[key]) {
          // Only count a day once
          if (paidLeft > 0) {
            leaveDays[key] = "Paid";
            paidLeaves++;
            paidLeft--;
          } else if (unpaidLeft > 0) {
            leaveDays[key] = "Unpaid";
            unpaidLeaves++;
            unpaidLeft--;
          }
        } else {
          // If already marked, skip (do not double count)
          if (paidLeft > 0) paidLeft--;
          else if (unpaidLeft > 0) unpaidLeft--;
        }
      }
    });

    // Build per-day array for calendar
    const days = [];
    let iterDate = new Date(y, m, 1); // Always start at the 1st of the month
    const lastDay = new Date(y, m + 1, 0).getDate(); // Last day of the month
    console.log(lastDay);
    for (let d = 1; d <= lastDay; d++) {
      const key = new Date(y, m, d).toISOString().slice(0, 10);
      // Check if there is a present attendance record for this date
      const presentRecord = allAttendance.find(a => a.date.toISOString().slice(0, 10) === key && a.status === 'Present');
      days.push({
        date: key,
        attendanceStatus: presentRecord ? 'Present' : 'Absent',
        leaveType: leaveDays[key] || null,
        checkIn: presentRecord ? presentRecord.checkIn : null,
        checkOut: presentRecord ? presentRecord.checkOut : null,
        lateEntry: presentRecord ? presentRecord.lateEntry : false,
        earlyCheckout: presentRecord ? presentRecord.earlyCheckout : false
      });
    }
 
    // Calculate early checkout count for the month
    const earlyCheckoutCount = await Attendance.countDocuments({
      employeeId,
      date: { $gte: start, $lte: end },
      earlyCheckout: true,
    });

    res.json({
      success: true,
      attendanceCount,
      paidLeaves,
      unpaidLeaves,
      days,
      earlyCheckoutCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// POST /api/word-count (Admin/HR/Team Leader only)
app.post("/api/word-count", authenticateToken, requireHRorAdminOrTeamLeader, async (req, res) => {
  try {
    const { employeeId, date, wordCount } = req.body;
    if (!employeeId || !date || typeof wordCount !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "employeeId, date, and wordCount are required." });
    }
    // --- Employee existence check ---
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee ID not found. Word count not recorded." });
    }
    // Normalize to IST midnight
    const inputDate = new Date(date);
    // Convert to IST midnight
    const istMidnight = new Date(inputDate.getTime());
    istMidnight.setHours(0, 0, 0, 0); // Set to local midnight
    // Adjust for IST offset
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const utcMidnight = new Date(istMidnight.getTime() - IST_OFFSET);
    // Find existing word count for this employee and date
    let existing = await WordCount.findOne({ employeeId, date: utcMidnight });
    let newWordCount = wordCount;
    if (existing) {
      newWordCount = existing.wordCount + wordCount;
    }
    const doc = await WordCount.findOneAndUpdate(
      { employeeId, date: utcMidnight },
      { $set: { employeeId, date: utcMidnight, wordCount: newWordCount, createdBy: req.user.employeeId } },
      { upsert: true, new: true }
    );
    res.json({ success: true, wordCount: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET /api/word-count?employeeId=...&month=...&year=...
app.get("/api/word-count", authenticateToken, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId, month, and year are required." });
    }
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const wordCounts = await WordCount.find({
      employeeId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
    res.json({ success: true, wordCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET /api/word-count/today?employeeId=...
app.get("/api/word-count/today", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required." });
    }
    const today = getISTDate();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const wordCount = await WordCount.findOne({
      employeeId,
      date: { $gte: start, $lte: end },
    });
    res.json({ success: true, wordCount });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- Leave History Tracker for Admin/HR ---
app.get("/api/leave-history", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId, month, and year are required." });
    }
    const m = parseInt(month) - 1; // JS months are 0-based
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    // Find all leave requests for this employee in this month (overlapping)
    const leaveRequests = await LeaveRequest.find({
      employeeId,
      $or: [
        { fromDate: { $lte: end }, toDate: { $gte: start } },
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
      ],
    }).sort({ fromDate: 1 });

    // For each leave request, determine the working days in this month, and expose all fields
    const results = leaveRequests.map((lr) => {
      // Calculate which days in this month are covered by this leave request (non-Sundays)
      const from = new Date(Math.max(start, lr.fromDate));
      const to = new Date(Math.min(end, lr.toDate));
      let daysArr = [];
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) daysArr.push(new Date(d)); // skip Sundays
      }
      return {
        _id: lr._id,
        fromDate: lr.fromDate,
        toDate: lr.toDate,
        leaveDates: daysArr.map((d) => d.toISOString().slice(0, 10)),
        leaveCount: daysArr.length,
        leaveType: lr.leaveType,
        paidLeaves: lr.paidLeaves,
        unpaidLeaves: lr.unpaidLeaves,
        status: lr.status,
        comments: lr.comments,
        editable: (Array.isArray(lr.leaveType) ? lr.leaveType.every(t => t === "Pending") : lr.leaveType === "Pending"),
      };
    });
    res.json({ success: true, leaveHistory: results });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- PATCH: Update leave type for a leave request (admin/HR) ---
app.patch(
  "/api/leave-history/:id/leave-type",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { leaveType } = req.body;
      // Accept both string and array for leaveType
      if (
        !leaveType ||
        !(
          (typeof leaveType === "string" && ["CL", "SL", "NPL", "DNPL"].includes(leaveType)) ||
          (Array.isArray(leaveType) && leaveType.every(t => ["CL", "SL", "NPL", "DNPL"].includes(t)))
        )
      ) {
        return res.status(400).json({ success: false, message: "Invalid leave type." });
      }
      const leave = await LeaveRequest.findById(id);
      if (!leave) {
        return res.status(404).json({ success: false, message: "Leave request not found." });
      }
      // Only allow editing if all leave types are still 'Pending'
      if (
        !(
          (typeof leave.leaveType === "string" && leave.leaveType === "Pending") ||
          (Array.isArray(leave.leaveType) && leave.leaveType.every(t => t === "Pending"))
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Leave type can only be edited if all leave types are Pending.",
        });
      }
      leave.leaveType = leaveType;
      leave.dnplCount = Array.isArray(leaveType) ? leaveType.filter(t => t === "DNPL").length : (leaveType === "DNPL" ? 1 : 0);
      await leave.save();
      return res.json({ success: true, message: "Leave type updated successfully." });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error updating leave type." });
    }
  }
);

// GET /api/attendance?employeeId=...&month=...&year=...
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId, month, and year are required." });
    }
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m, new Date(y, m + 1, 0).getDate(), 23, 59, 59, 999); // Last day of month, 23:59:59
    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- API: Send Notification (HR/Admin only) ---
app.post("/api/notifications", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { message, recipientId, isForAll } = req.body;
    console.log("recp", message, recipientId, isForAll);
    if (!message || (isForAll !== true && !recipientId)) {
      return res.status(400).json({ success: false, message: "Message and recipient required." });
    }
    const senderId = req.user.employeeId;
    const senderName = req.user.name || req.user.employeeId;
    let notif;
    if (isForAll) {
      // Broadcast: one doc, isForAll true
      notif = new Notification({ message, senderId, senderName, isForAll: true });
      await notif.save();
      // Send email to all employees
      const employees = await Employee.find({}, "email");
      const emails = employees.map((e) => e.email).filter(Boolean);
      console.log("Broadcasting notice to emails:", emails);
      if (emails.length) {
        await sendNoticeEmail({
          to: emails,
          subject: `Notice from ${senderName}`,
          text: `${message}\n\nThis is an automated no-reply email. Please do not reply.`,
        });
      }
    } else {
      // Individual: one doc per recipient
      notif = new Notification({ message, senderId, senderName, recipientId, isForAll: false });
      await notif.save();
      // Send email to the recipient
      const employee = await Employee.findOne({ employeeId: recipientId });
      if (employee && employee.email) {
        console.log("Sending notice to employeeId:", recipientId, "email:", employee.email);
        await sendNoticeEmail({
          to: employee.email,
          subject: `Notice from ${senderName}`,
          text: `${message}\n\nThis is an automated no-reply email. Please do not reply.`,
        });
      } else {
        console.warn("No email found for employeeId:", recipientId);
      }
    }
    return res.json({ success: true, notification: notif });
  } catch (err) {
    console.error("Error in /api/notifications:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- API: Get Notifications for current user ---
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const isAdmin = req.user.isAdmin;
    const role = req.user.role;
    let query = {
      $or: [{ recipientId: employeeId }, { isForAll: true }],
    };
    // Admin/HR can see all
    const adminRoles = ["Admin", "hr_admin"];
    const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];
    if (adminRoles.includes(role) || hrRoles.includes(role)) {
      // Optionally: show all notifications
      // query = {};
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- API: Mark notification as read for current user ---
app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: "Notification not found" });
    if (!notif.readBy.includes(employeeId)) {
      notif.readBy.push(employeeId);
      await notif.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ==================== WFH REQUEST API ENDPOINTS ====================

// --- POST: Submit WFH Request ---
app.post("/api/wfh-request", authenticateToken, wfhAttachmentUpload.single("attachment"), async (req, res) => {
  try {
    const { reason, wfhCount, fromDate, toDate, comments } = req.body;
    const employeeId = req.user.employeeId;
    const employeeName = req.user.name || `${req.user.firstName} ${req.user.lastName}`;
    const employeeRole = req.user.role;

    // Validation
    if (!reason || !wfhCount || !fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: reason, wfhCount, fromDate, toDate" 
      });
    }

    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = getISTDate();

    if (from < today) {
      return res.status(400).json({ 
        success: false, 
        message: "From date cannot be in the past" 
      });
    }

    if (to < from) {
      return res.status(400).json({ 
        success: false, 
        message: "To date cannot be before from date" 
      });
    }

    // Create WFH request
    const wfhRequest = new WFHRequest({
      employeeId,
      employeeName,
      employeeRole,
      reason,
      wfhCount: parseInt(wfhCount),
      fromDate: from,
      toDate: to,
      comments: comments || "",
      attachment: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        originalName: req.file.originalname
      } : undefined
    });

    await wfhRequest.save();

    // Send notification to HR and Admin
    const hrRoles = ["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"];
    const hrEmployees = await Employee.find({ 
      role: { $in: hrRoles } 
    }, "employeeId email");
    
    const adminEmployees = await Employee.find({ 
      role: "Admin" 
    }, "employeeId email");

    const allRecipients = [...hrEmployees, ...adminEmployees];

    // Create notifications for each recipient
    for (const recipient of allRecipients) {
      const notification = new Notification({
        message: `New WFH request from ${employeeName} (${employeeId}) for ${wfhCount} days from ${fromDate} to ${toDate}`,
        senderId: employeeId,
        senderName: employeeName,
        recipientId: recipient.employeeId,
        isForAll: false
      });
      await notification.save();

      // Send email notification
      if (recipient.email) {
        await sendNoticeEmail({
          to: recipient.email,
          subject: `New WFH Request - ${employeeName}`,
          text: `A new WFH request has been submitted:\n\nEmployee: ${employeeName} (${employeeId})\nRole: ${employeeRole}\nReason: ${reason}\nDuration: ${wfhCount} days\nFrom: ${fromDate}\nTo: ${toDate}\n\nPlease review and approve/reject this request.`
        });
      }
    }
    // --- Notify Team Leader if not already notified ---
    const team = await Team.findOne({ team_members: employeeId });
    const teamLeaderId = team?.team_leader;
    if (teamLeaderId && !allRecipients.some(r => r.employeeId === teamLeaderId)) {
      const notification = new Notification({
        message: `New WFH request from ${employeeName} (${employeeId}) for ${wfhCount} days from ${fromDate} to ${toDate}`,
        senderId: employeeId,
        senderName: employeeName,
        recipientId: teamLeaderId,
        isForAll: false
      });
      await notification.save();
      const teamLeader = await Employee.findOne({ employeeId: teamLeaderId });
      if (teamLeader?.email) {
        await sendNoticeEmail({
          to: teamLeader.email,
          subject: `New WFH Request - ${employeeName}`,
          text: `A new WFH request has been submitted:\n\nEmployee: ${employeeName} (${employeeId})\nRole: ${employeeRole}\nReason: ${reason}\nDuration: ${wfhCount} days\nFrom: ${fromDate}\nTo: ${toDate}\n\nPlease review and approve/reject this request.`
        });
      }
    }

    res.json({ 
      success: true, 
      message: "WFH request submitted successfully",
      wfhRequest 
    });

  } catch (err) {
    console.error("Error submitting WFH request:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// --- GET: Get WFH Requests (for HR/Admin approval) ---
app.get("/api/wfh-requests", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { status, employeeId, employeeName } = req.query;
    const userRole = req.user.role;
    const userId = req.user.employeeId;

    let query = {};

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by employee
    if (employeeId) {
      query.employeeId = { $regex: employeeId, $options: "i" };
    }

    if (employeeName) {
      query.employeeName = { $regex: employeeName, $options: "i" };
    }

    const wfhRequests = await WFHRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    // Mark as read by current user
    if (userRole === "Admin" || userRole === "hr_admin") {
      await WFHRequest.updateMany(
        { _id: { $in: wfhRequests.map(req => req._id) } },
        { 
          $set: userRole === "Admin" ? { isReadByAdmin: true } : { isReadByHR: true }
        }
      );
    }

    res.json({ 
      success: true, 
      wfhRequests,
      unreadCount: await getUnreadWFHCount(userRole, userId)
    });

  } catch (err) {
    console.error("Error fetching WFH requests:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// --- GET: Get WFH Requests for current employee ---
app.get("/api/my-wfh-requests", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const wfhRequests = await WFHRequest.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ 
      success: true, 
      wfhRequests 
    });

  } catch (err) {
    console.error("Error fetching my WFH requests:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// --- PATCH: Approve/Reject WFH Request ---
app.patch("/api/wfh-requests/:id/status", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    const approverId = req.user.employeeId;
    const approverName = req.user.name || `${req.user.firstName} ${req.user.lastName}`;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Status must be 'Approved' or 'Rejected'" 
      });
    }

    const wfhRequest = await WFHRequest.findById(id);
    if (!wfhRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "WFH request not found" 
      });
    }

    // Update status
    wfhRequest.status = status;
    wfhRequest.approvedBy = approverId;
    wfhRequest.approvedAt = getISTDate();
    wfhRequest.comments = comments || wfhRequest.comments;

    await wfhRequest.save();

    // Send notification to employee
    const notification = new Notification({
      message: `Your WFH request for ${wfhRequest.wfhCount} days (${wfhRequest.fromDate.toDateString()} - ${wfhRequest.toDate.toDateString()}) has been ${status.toLowerCase()}. ${comments ? `Comments: ${comments}` : ""}`,
      senderId: approverId,
      senderName: approverName,
      recipientId: wfhRequest.employeeId,
      isForAll: false
    });
    await notification.save();

    // Send email to employee
    const employee = await Employee.findOne({ employeeId: wfhRequest.employeeId });
    if (employee && employee.email) {
      await sendNoticeEmail({
        to: employee.email,
        subject: `WFH Request ${status} - ${wfhRequest.employeeName}`,
        text: `Your WFH request has been ${status.toLowerCase()} by ${approverName}.\n\nDetails:\nDuration: ${wfhRequest.wfhCount} days\nFrom: ${wfhRequest.fromDate.toDateString()}\nTo: ${wfhRequest.toDate.toDateString()}\nReason: ${wfhRequest.reason}\n${comments ? `Comments: ${comments}\n` : ""}\n\nThis is an automated no-reply email.`
      });
    }

    res.json({ 
      success: true, 
      message: `WFH request ${status.toLowerCase()} successfully`,
      wfhRequest 
    });

  } catch (err) {
    console.error("Error updating WFH request status:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// --- GET: Get unread WFH count for badge ---
app.get("/api/wfh-unread-count", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.employeeId;
    
    const unreadCount = await getUnreadWFHCount(userRole, userId);
    
    res.json({ 
      success: true, 
      unreadCount 
    });

  } catch (err) {
    console.error("Error fetching unread WFH count:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// Helper function to get unread WFH count
async function getUnreadWFHCount(userRole, userId) {
  try {
    let query = { status: "Pending" };
    
    if (userRole === "Admin") {
      query.isReadByAdmin = false;
    } else if (["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(userRole)) {
      query.isReadByHR = false;
    }
    
    const count = await WFHRequest.countDocuments(query);
    return count;
  } catch (err) {
    console.error("Error getting unread WFH count:", err);
    return 0;
  }
}

// --- GET: Download WFH attachment ---
app.get("/api/wfh-requests/:id/attachment", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const wfhRequest = await WFHRequest.findById(id);
    
    if (!wfhRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "WFH request not found" 
      });
    }

    if (!wfhRequest.attachment) {
      return res.status(404).json({ 
        success: false, 
        message: "No attachment found for this WFH request" 
      });
    }

    // Check if user has permission to view this attachment
    const employee = req.headers.authorization ? 
      jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET || "secretkey") : 
      {};
    
    if (employee.employeeId !== wfhRequest.employeeId && 
        !["Admin", "hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(employee.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    res.set({
      'Content-Type': wfhRequest.attachment.contentType,
      'Content-Disposition': `attachment; filename="${wfhRequest.attachment.originalName}"`
    });

    res.send(wfhRequest.attachment.data);

  } catch (err) {
    console.error("Error downloading WFH attachment:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// --- GET: Get unread Leave count for badge ---
app.get("/api/leave-unread-count", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = { status: "Pending" };
    if (userRole === "admin") {
      query.isReadByAdmin = { $ne: true };
    } else if (["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(userRole)) {
      query.isReadByHR = { $ne: true };
    }
    const unreadCount = await LeaveRequest.countDocuments(query);
    res.json({ success: true, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// --- PATCH: Mark leave as read when approved/rejected ---
app.patch("/api/leave-requests/:id/approve", authenticateToken, requireHRorAdmin, async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });
    leave.status = "Approved";
    if (req.user.role === "admin") leave.isReadByAdmin = true;
    if (["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(req.user.role)) leave.isReadByHR = true;
    await leave.save();
    // --- Notification for employee ---
    const notification = new Notification({
      message: `Your leave request for ${leave.leaveCount} days (${leave.fromDate.toDateString()} - ${leave.toDate.toDateString()}) has been approved.`,
      senderId: req.user.employeeId,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      recipientId: leave.employeeId,
      isForAll: false,
      comments: leave.comments, // <-- add this
      reason: leave.reason,      // <-- add this
    });
    await notification.save();
    const employee = await Employee.findOne({ employeeId: leave.employeeId });
    if (employee && employee.email) {
      await sendNoticeEmail({
        to: employee.email,
        subject: `Leave Request Approved - ${leave.name}`,
        text: `Your leave request has been approved by ${req.user.name || `${req.user.firstName} ${req.user.lastName}`}.\n\nDetails:\nDuration: ${leave.leaveCount} days\nFrom: ${leave.fromDate.toDateString()}\nTo: ${leave.toDate.toDateString()}\nReason: ${leave.reason}\n\nThis is an automated no-reply email.`
      });
    }
    res.json({ success: true, message: "Leave request approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.patch("/api/leave-requests/:id/reject", authenticateToken, requireHRorAdmin, async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });
    leave.status = "Rejected";
    if (req.user.role === "admin") leave.isReadByAdmin = true;
    if (["hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(req.user.role)) leave.isReadByHR = true;
    await leave.save();
    res.json({ success: true, message: "Leave request rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- POST: Send email to all admins and HR recruiters on new leave request ---
// (Assume this is in your leave request creation endpoint)
// After saving the new leave request:
// const admins = await Employee.find({ role: "admin" });
// const hrRecruiters = await Employee.find({ role: "hr_recruiter" });
// const emails = [...admins, ...hrRecruiters].map(e => e.email).filter(Boolean);
// for (const email of emails) {
//   await sendNoticeEmail({
//     to: email,
//     subject: `New Leave Request - ${leave.name}`,
//     text: `A new leave request has been submitted by ${leave.name} (${leave.employeeId}).\nReason: ${leave.reason}\nFrom: ${leave.fromDate}\nTo: ${leave.toDate}\nCount: ${leave.leaveCount}`
//   });
// }

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err.message);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Search employees by name (admin/HR only)
app.get("/api/employees/search", authenticateToken, requireHRorAdminOrTeamLeader, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name query required (min 2 chars)" });
    }
    const regex = new RegExp(name.trim(), "i");
    const employees = await Employee.find(
      {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { name: regex }
        ]
      },
      "employeeId firstName lastName name"
    ).limit(15);
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- Team Management Schema ---
const teamSchema = new mongoose.Schema({
  team_name: { type: String, required: true, unique: true },
  team_leader: { type: String, required: true }, // employeeId
  team_members: [{ type: String, required: true }], // array of employeeIds
}, { timestamps: true });
const Team = conn.model("Team", teamSchema);

// --- Team Management API ---
const TEAM_MEMBER_EXCLUDE_ROLES = ["admin","hr_admin","hr_recruiter","team_leader","senior_writer","bdm"];

// Middleware: Only admin/HR can manage teams
function requireAdminOrHR(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    if (["admin","hr_admin","hr_recruiter","hr_manager","hr_executive"].includes(decoded.role)) {
      req.user = decoded;
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// Create Team
app.post('/api/teams', requireAdminOrHR, async (req, res) => {
  try {
    const { team_name, team_leader, team_members } = req.body;
    if (!team_name || !team_leader || !Array.isArray(team_members) || !team_members.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Ensure unique team name
    if (await Team.findOne({ team_name })) {
      return res.status(409).json({ success: false, message: 'Team name already exists' });
    }
    // Ensure no member is in another team
    const allTeams = await Team.find();
    const assignedIds = new Set(allTeams.flatMap(t => t.team_members));
    for (const memberId of team_members) {
      if (assignedIds.has(memberId)) {
        return res.status(409).json({ success: false, message: `Member ${memberId} already in another team` });
      }
    }
    // Create team
    const team = await Team.create({ team_name, team_leader, team_members });
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all teams (with member details)
app.get('/api/teams', requireAdminOrHR, async (req, res) => {
  try {
    const teams = await Team.find();
    // Populate member details
    const allEmployees = await Employee.find();
    const teamsWithMembers = teams.map(team => ({
      ...team.toObject(),
      team_leader_details: allEmployees.find(e => e.employeeId === team.team_leader),
      team_members_details: team.team_members.map(id => allEmployees.find(e => e.employeeId === id)).filter(Boolean)
    }));
    res.json({ success: true, teams: teamsWithMembers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update team
app.put('/api/teams/:teamId', requireAdminOrHR, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { team_name, team_leader, team_members } = req.body;
    if (!team_name || !team_leader || !Array.isArray(team_members) || !team_members.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Ensure unique team name (except self)
    if (await Team.findOne({ team_name, _id: { $ne: teamId } })) {
      return res.status(409).json({ success: false, message: 'Team name already exists' });
    }
    // Ensure no member is in another team (except this one)
    const allTeams = await Team.find({ _id: { $ne: teamId } });
    const assignedIds = new Set(allTeams.flatMap(t => t.team_members));
    for (const memberId of team_members) {
      if (assignedIds.has(memberId)) {
        return res.status(409).json({ success: false, message: `Member ${memberId} already in another team` });
      }
    }
    const updated = await Team.findByIdAndUpdate(teamId, { team_name, team_leader, team_members }, { new: true });
    res.json({ success: true, team: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete team
app.delete('/api/teams/:teamId', requireAdminOrHR, async (req, res) => {
  try {
    const { teamId } = req.params;
    await Team.findByIdAndDelete(teamId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get available members (eligible and not assigned)
app.get('/api/teams/available-members', requireAdminOrHR, async (req, res) => {
  try {
    const allEmployees = await Employee.find();
    const eligible = allEmployees.filter(e => !TEAM_MEMBER_EXCLUDE_ROLES.includes(e.role));
    const allTeams = await Team.find();
    const assignedIds = new Set(allTeams.flatMap(t => t.team_members));
    const available = eligible.filter(e => !assignedIds.has(e.employeeId));
    res.json({ success: true, available });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- PUBLIC ENDPOINTS FOR ORG STRUCTURE (NO AUTH, NO SENSITIVE DATA) ---
// GET: All employees (public, non-sensitive fields only)
app.get('/api/employees/public', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'employeeId firstName lastName role profileImage doj');
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: All teams (public, with member/leader details, non-sensitive only)
app.get('/api/teams/public', async (req, res) => {
  try {
    const teams = await Team.find();
    const allEmployees = await Employee.find({}, 'employeeId firstName lastName role profileImage doj');
    const teamsWithMembers = teams.map(team => ({
      ...team.toObject(),
      team_leader_details: allEmployees.find(e => e.employeeId === team.team_leader),
      team_members_details: team.team_members.map(id => allEmployees.find(e => e.employeeId === id)).filter(Boolean)
    }));
    res.json({ success: true, teams: teamsWithMembers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Migration: Populate comments and reason in old leave request notifications ---
// async function migrateLeaveRequestNotifications() {
//   const Notification = conn.model("Notification");
//   const LeaveRequest = conn.model("LeaveRequest");

//   // Find notifications that look like leave requests and are missing comments/reason
//   const leaveNotifs = await Notification.find({
//     $and: [
//       { $or: [
//         { message: /leave request/i },
//         { message: /has been approved/i }
//       ]},
//       { $or: [ { comments: { $exists: false } }, { comments: null } ] }
//     ]
//   });

//   let updated = 0;
//   for (const notif of leaveNotifs) {
//     // Try to find the related leave request by employeeId and date range in the message
//     let leaveReq = null;
//     // Try to extract employeeId and date from the message
//     const empIdMatch = notif.message.match(/\(([A-Z0-9]+)\)/);
//     const fromDateMatch = notif.message.match(/from ([A-Za-z0-9 ,/-]+) to/i);
//     if (empIdMatch) {
//       const employeeId = empIdMatch[1];
//       // Try to find the most recent leave request for this employee
//       leaveReq = await LeaveRequest.findOne({ employeeId }).sort({ createdAt: -1 });
//       // Optionally, you can further filter by date if you want to be more precise
//     }
//     if (leaveReq) {
//       notif.comments = leaveReq.comments || "";
//       notif.reason = leaveReq.reason || "";
//       await notif.save();
//       updated++;
//     }
//   }
//   console.log(`Migration complete: Updated ${updated} leave request notifications with comments and reason.`);
// }

// --- To run the migration, uncomment the following line and restart your server ---
// migrateLeaveRequestNotifications();

function getISTDateString(date = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  return ist.toISOString().slice(0, 10);
}

// --- One-time migration for attendance date fields ---
// To run: Uncomment migrateAttendanceDates() and restart your server. Comment it again after migration is complete.

//onst mongoose = require('mongoose');
//const Attendance = require('./models/Attendance'); // Adjust path if needed

// function getISTDateString(date) {
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const ist = new Date(date.getTime() + istOffset);
//   return ist.toISOString().slice(0, 10);
// }

// async function migrateAttendanceDates() {
//   const all = await Attendance.find({});
//   for (const doc of all) {
//     if (doc.date instanceof Date) {
//       doc.date = getISTDateString(doc.date);
//       await doc.save();
//       console.log(`Migrated record for employee ${doc.employeeId} on ${doc.date}`);
//     }
//   }
//   console.log('Migration complete!');
//   // Optionally, process.exit(0);
// }
//  migrateAttendanceDates(); // <-- Uncomment this line and restart your server to run the migration ONCE

// --- One-time migration for LeaveRequest schema update ---
// To run: Uncomment the block below and restart your server. Comment it again after migration is complete.

// (async () => {
//   //const LeaveRequest = conn.model("LeaveRequest");
//   const all = await LeaveRequest.find({});
//   let updated = 0;
//   for (const doc of all) {
//     let changed = false;
//     // Convert leaveType to array if needed
//     if (typeof doc.leaveType === 'string') {
//       doc.leaveType = [doc.leaveType];
//       changed = true;
//     }
//     // Add dnplCount if missing or incorrect
//     const dnplCount = Array.isArray(doc.leaveType) ? doc.leaveType.filter(t => t === 'DNPL').length : 0;
//     if (typeof doc.dnplCount !== 'number' || doc.dnplCount !== dnplCount) {
//       doc.dnplCount = dnplCount;
//       changed = true;
//     }
//     if (changed) {
//       await doc.save();
//       updated++;
//     }
//   }
//   console.log(`LeaveRequest migration complete: ${updated} documents updated.`);
// })();

// --- End migration script ---

const paySlipSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: String,
  month: Number, // 1-12
  year: Number,
  designation: String,
  location: String,
  panNo: String,
  address: String,
  doj: Date,
  ctc: Number,
  attendance: {
    workingDays: Number,
    weekendDays: Number,
    cl: Number,
    sl: Number,
    pl: Number,
    npl: Number,
    dnpl: Number,
    unpaidLeave: Number,
    totalDays: Number
  },
  earnings: {
    basic: Number,
    hra: Number,
    specialAllowance: Number,
    totalEarnings: Number
  },
  deductions: {
    epf: Number,
    ptax: Number,
    advance: Number,
    nplDeduction: Number,
    dnplDeduction: Number,
    totalDeductions: Number
  },
  netPay: Number,
  netPayWords: String,
  slipData: {}, // full slip as JSON for easy rendering
  createdAt: { type: Date, default: Date.now }
});
// Add virtual slipId field
paySlipSchema.virtual('slipId').get(function() {
  return this._id.toString();
});
paySlipSchema.set('toObject', { virtuals: true });
paySlipSchema.set('toJSON', { virtuals: true });

const PaySlip = conn.model('PaySlip', paySlipSchema);

// Utility: Convert number to words (Indian system)
function numberToWords(num) {
  if (num === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }
  return inWords(num);
}

// POST: Generate and store pay slip
app.post('/api/payslip/generate', async (req, res) => {
  try {
    const data = req.body;
    console.log(data);  
    const { employeeId, month, year, totalEarnings } = data;
    // Fetch latest employee details and merge into slip
const employee = await Employee.findOne({ employeeId });
if (employee) {
  data.name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  data.employeeId = employee.employeeId;
  data.designation = employee.role || '';
  data.address = employee.address || '';
  data.doj = employee.doj || '';
  data.panNo = employee.idCardNumber || '';
}
    if (!employeeId || !month || !year || !totalEarnings) {
      return res.status(400).json({ success: false, message: 'employeeId, month, year, and totalEarnings are required.' });
    }
    // Calculate month range
    const m = parseInt(month) - 1; // JS months are 0-based
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Fetch leave requests for this employee in this month (approved only)
    const leaveDocs = await LeaveRequest.find({
      employeeId,
      status: 'Approved',
      $or: [
        { fromDate: { $lte: end }, toDate: { $gte: start } },
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
      ],
    });
    // Count leave types for the month
    let pl = 0, npl = 0, dnpl = 0, cl = 0, sl = 0, unpaidLeave = 0;
    leaveDocs.forEach(lr => {
      // For each leave, count days in this month and type
      const from = new Date(Math.max(start, lr.fromDate));
      const to = new Date(Math.min(end, lr.toDate));
      let leaveDays = [];
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) leaveDays.push(new Date(d)); // skip Sundays
      }
      if (Array.isArray(lr.leaveType)) {
        lr.leaveType.forEach((type, idx) => {
          if (!leaveDays[idx]) return;
          if (type === 'PL') pl++;
          else if (type === 'NPL') npl++;
          else if (type === 'DNPL') dnpl++;
          else if (type === 'CL') cl++;
          else if (type === 'SL') sl++;
          else if (type === 'Unpaid') unpaidLeave++;
        });
      } else {
        // Fallback: use unpaidLeaves and dnplCount fields
        unpaidLeave += lr.unpaidLeaves || 0;
        dnpl += lr.dnplCount || 0;
      }
    });
    // Calculate salary components from total earnings
    const totalEarningsNum = parseFloat(totalEarnings) || 0;
    const basic = +(totalEarningsNum * 0.7).toFixed(2);
    const hra = +(totalEarningsNum * 0.15).toFixed(2);
    const specialAllowance = +(totalEarningsNum * 0.15).toFixed(2);
    // Calculate deductions
    const nplDeduction = npl * (totalEarningsNum / daysInMonth);
    const dnplDeduction = dnpl * 2 * (totalEarningsNum / daysInMonth);
    const epf = 0.00, ptax = 0.00, advance = 0.00;
    const totalDeductions = nplDeduction + dnplDeduction + epf + ptax + advance;
    // Net pay = total earnings - total deductions
    const calculatedNetPay = totalEarningsNum - totalDeductions;
    const netPayWords =  numberToWords(Math.round(calculatedNetPay)) + ' Only';
// If edited values are present, use them
let editedTotalDeductions = data.deductions && typeof data.deductions.totalDeductions === 'number' ? data.deductions.totalDeductions : null;
let editedNetPay = typeof data.netPay === 'number' ? data.netPay : null;

const finalTotalDeductions = editedTotalDeductions !== null ? editedTotalDeductions : +totalDeductions.toFixed(2);
const finalNetPay = editedNetPay !== null ? editedNetPay : +calculatedNetPay.toFixed(2);
    // Compose slip
    const slip = {
      ...data,
      attendance: {
        pl,
        npl,
        dnpl,
        cl,
        sl,
        unpaidLeave,
        totalDays: daysInMonth
      },
      earnings: { basic, hra, specialAllowance, totalEarnings: totalEarningsNum },
      deductions: {
        epf,
        ptax,
        advance,
        nplDeduction: +nplDeduction.toFixed(2),
        dnplDeduction: +dnplDeduction.toFixed(2),
        totalDeductions: finalTotalDeductions
      },
      netPay: finalNetPay,
      netPayWords:  numberToWords(Math.round(finalNetPay)) + ' Only'
    };
    // Store in DB
    const paySlipDoc = new PaySlip({
      ...data,
      attendance: slip.attendance,
      earnings: slip.earnings,
      deductions: slip.deductions,
      netPay: slip.netPay,
      netPayWords: slip.netPayWords,
      slipData: slip
    });
    await paySlipDoc.save();
    res.json({ success: true, payslip: slip });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error generating pay slip', error: err.message });
  }
});

// GET: Search pay slips by employeeId, name, month, year
// app.get('/api/payslip', async (req, res) => {
//   const { employeeId, month, year } = req.query;
//   console.log(employeeId, month, year);
//   if (!employeeId || !month || !year) return res.status(400).json({ error: 'Missing params' });
//   try {
//     // Fetch payslip from MongoDB
//     const payslip = await PaySlip.findOne({
//       employeeId,
//       month: parseInt(month),
//       year: parseInt(year)
//     });
//     console.log(payslip);
//     if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
//     // Use top-level fields, fallback to slipData if missing
//     const slipData = payslip.slipData || {};
//     function getField(field) {
//       return payslip[field] !== undefined && payslip[field] !== null && payslip[field] !== ''
//         ? payslip[field]
//         : slipData[field] !== undefined ? slipData[field] : '';
//     }
//     function getNestedField(obj, field) {
//       return obj && obj[field] !== undefined && obj[field] !== null ? obj[field] : '';
//     }
//     res.json({
//       slipId: payslip._id, // Always include slipId for notification
//       employeeId: getField('employeeId'),
//       month: getField('month'),
//       year: getField('year'),
//       monthName: new Date(Number(getField('year')), Number(getField('month')) - 1).toLocaleString('default', { month: 'long' }),
//       designation: getField('designation'),
//       location: getField('address'),
//       panNo: getField('panNo'),
//       employeeName: getField('name'),
//       address: getField('address'),
//       doj: getField('doj') ? new Date(getField('doj')).toLocaleDateString() : '',
//       ctc: getNestedField(getField('earnings'), 'ctc'),
//       workingDays: getNestedField(getField('attendance'), 'workingDays') || getNestedField(getField('attendance'), 'totalDays'),
//       weekendDays: getNestedField(getField('attendance'), 'weekendDays'),
//       clCount: getNestedField(getField('attendance'), 'cl'),
//       slCount: getNestedField(getField('attendance'), 'sl'),
//       plCount: getNestedField(getField('attendance'), 'pl'),
//       nplCount: getNestedField(getField('attendance'), 'npl'),
//       dnplCount: getNestedField(getField('attendance'), 'dnpl'),
//       unpaidLeave: getNestedField(getField('attendance'), 'unpaidLeave'),
//       totalDays: getNestedField(getField('attendance'), 'totalDays'),
//       basic: getNestedField(getField('earnings'), 'basic'),
//       hra: getNestedField(getField('earnings'), 'hra'),
//       specialAllowance: getNestedField(getField('earnings'), 'specialAllowance'),
//       totalEarnings: getNestedField(getField('earnings'), 'totalEarnings'),
//       epf: getNestedField(getField('deductions'), 'epf'),
//       ptax: getNestedField(getField('deductions'), 'ptax'),
//       advance: getNestedField(getField('deductions'), 'advance'),
//       totalDeductions: getNestedField(getField('deductions'), 'totalDeductions'),
//       netPay: getField('netPay'),
//       netPayWords: getField('netPayWords')
//     });
//   } catch (err) {
//     res.status(500).json({ error: 'Payslip not found' });
//   }
// });

// POST: Preview pay slip (calculate but do NOT store in DB)
app.post('/api/payslip/preview', authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const data = req.body;
    const { employeeId, month, year, totalEarnings } = data;
    // Fetch latest employee details and merge into slip
const employee = await Employee.findOne({ employeeId });
if (employee) {
  data.name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  data.employeeId = employee.employeeId;
  data.designation = employee.role || '';
  data.address = employee.address || '';
  data.doj = employee.doj || '';
  data.panNo = employee.idCardNumber || '';
}
    if (!employeeId || !month || !year || !totalEarnings) {
      return res.status(400).json({ success: false, message: 'employeeId, month, year, and totalEarnings are required.' });
    }
    // Calculate month range
    const m = parseInt(month) - 1; // JS months are 0-based
    const y = parseInt(year);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Fetch leave requests for this employee in this month (approved only)
    const leaveDocs = await LeaveRequest.find({
      employeeId,
      status: 'Approved',
      $or: [
        { fromDate: { $lte: end }, toDate: { $gte: start } },
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
      ],
    });
    // Count leave types for the month
    let pl = 0, npl = 0, dnpl = 0, cl = 0, sl = 0, unpaidLeave = 0;
    leaveDocs.forEach(lr => {
      const from = new Date(Math.max(start, lr.fromDate));
      const to = new Date(Math.min(end, lr.toDate));
      let leaveDays = [];
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) leaveDays.push(new Date(d));
      }
      if (Array.isArray(lr.leaveType)) {
        lr.leaveType.forEach((type, idx) => {
          if (!leaveDays[idx]) return;
          if (type === 'PL') pl++;
          else if (type === 'NPL') npl++;
          else if (type === 'DNPL') dnpl++;
          else if (type === 'CL') cl++;
          else if (type === 'SL') sl++;
          else if (type === 'Unpaid') unpaidLeave++;
        });
      } else {
        unpaidLeave += lr.unpaidLeaves || 0;
        dnpl += lr.dnplCount || 0;
      }
    });
    // Calculate salary components from total earnings
    const totalEarningsNum = parseFloat(totalEarnings) || 0;
    const basic = +(totalEarningsNum * 0.7).toFixed(2);
    const hra = +(totalEarningsNum * 0.15).toFixed(2);
    const specialAllowance = +(totalEarningsNum * 0.15).toFixed(2);
    // Calculate deductions
    const nplDeduction = npl * (totalEarningsNum / daysInMonth);
    const dnplDeduction = dnpl * 2 * (totalEarningsNum / daysInMonth);
    const epf = 0.00, ptax = 0.00, advance = 0.00;
    const totalDeductions = nplDeduction + dnplDeduction + epf + ptax + advance;
    const calculatedNetPay = totalEarningsNum - totalDeductions;
    const netPayWords = numberToWords(Math.round(calculatedNetPay)) + ' Only';
    let editedTotalDeductions = data.deductions && typeof data.deductions.totalDeductions === 'number' ? data.deductions.totalDeductions : null;
    let editedNetPay = typeof data.netPay === 'number' ? data.netPay : null;
    const finalTotalDeductions = editedTotalDeductions !== null ? editedTotalDeductions : +totalDeductions.toFixed(2);
    const finalNetPay = editedNetPay !== null ? editedNetPay : +calculatedNetPay.toFixed(2);
    const slip = {
      ...data,
      attendance: {
        pl,
        npl,
        dnpl,
        cl,
        sl,
        unpaidLeave,
        totalDays: daysInMonth
      },
      earnings: { basic, hra, specialAllowance, totalEarnings: totalEarningsNum },
      deductions: {
        epf,
        ptax,
        advance,
        nplDeduction: +nplDeduction.toFixed(2),
        dnplDeduction: +dnplDeduction.toFixed(2),
        totalDeductions: finalTotalDeductions
      },
      netPay: finalNetPay,
      netPayWords: numberToWords(Math.round(finalNetPay)) + ' Only'
    };
    res.json({ success: true, payslip: slip });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error generating pay slip preview', error: err.message });
  }
});

// --- API: Send Pay Slip Notification to Employee ---
app.post('/api/payslip/send-notification', authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'employeeId, month, and year are required.' });
    }
    // Check if employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    // Check if payslip exists
    const payslip = await PaySlip.findOne({ employeeId, month: parseInt(month), year: parseInt(year) });
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Pay slip not found.' });
    }
    // Compose download link (frontend should use this endpoint)
    const downloadUrl = `/api/download-payslip?employeeId=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;
    // Create notification (NO EMAIL)
    const notification = new Notification({
      message: 'Your pay slip has been generated. Now click the download to generate the pay slip. Thank You.',
      senderId: req.user.employeeId,
      senderName: req.user.name || req.user.employeeId,
      recipientId: employeeId,
      isForAll: false,
      comments: '',
      reason: '',
      downloadUrl,
      payslipInfo: {
        employeeId: payslip.employeeId,
        month: payslip.month,
        year: payslip.year
      }
    });
    await notification.save();
    res.json({ success: true, message: 'Notification sent to employee.', notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- API: Download Pay Slip (PDF) ---
app.get('/api/payslip/download/:slipId',  async (req, res) => {
  try {
    const { slipId } = req.params;
    const slip = await PaySlip.findById(slipId);
    if (!slip) {
      return res.status(404).send('Pay slip not found');
    }
    // Only allow the employee, or admin/HR
    const isAdminOrHR = ["admin", "hr_admin", "hr_manager", "hr_executive", "hr_recruiter"].includes(req.user.role);
    if (req.user.employeeId !== slip.employeeId && !isAdminOrHR) {
      return res.status(403).send('Forbidden');
    }
    const slipData = slip.slipData || slip;

    // Compose filename as <EmployeeName>_<EmployeeID>.pdf
    const safeName = (slipData.name || "Employee").replace(/[^a-zA-Z0-9_]/g, "_");
    const safeId = (slipData.employeeId || "ID").replace(/[^a-zA-Z0-9_]/g, "_");
    const filename = `${safeName}_${safeId}.pdf`;

    // Use the same HTML/CSS as your frontend modal view (from renderPaySlipHTML)
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Pay Slip - ${slipData.name} (${slipData.employeeId})</title>
        <style>
          body { background: #faf9fd; margin: 0; padding: 0; }
          .payslip-container { background: #fff; margin:24px auto; border-radius: 12px; box-shadow: 0 4px 32px rgba(0,0,0,0.10); max-width: 900px; padding: 32px; }
          .payslip-header { display: flex; align-items: center; border-bottom: 2px solid #764ba2; padding-bottom: 16px; margin-bottom: 24px; }
          .payslip-logo { width: 80px; height: 80px; margin-right: 24px; }
          .payslip-title-block { flex: 1; }
          .payslip-title { font-size: 2.2em; color: #764ba2; font-weight: bold; }
          .payslip-period { font-size: 1.1em; color: #333; margin-top: 4px; }
          .payslip-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          .payslip-table th, .payslip-table td { border: 1px solid #ddd; padding: 10px 14px; font-size: 1em; }
          .payslip-table th { background: #f3eaff; color: #764ba2; font-weight: bold; }
          .payslip-section-title { background: #faf9fd; color: #764ba2; font-weight: bold; font-size: 1.1em; padding: 8px 0; }
          .payslip-footer { margin-top: 32px; text-align: left; color: #888; font-size: 0.98em; }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="payslip-header">
            <img src="https://assignopedia.com/images/logo.png" alt="AssignOpedia Logo" class="payslip-logo">
            <div class="payslip-title-block">
              <div class="payslip-title">AssignOpedia</div>
              <div class="payslip-period">Pay slip for the Month of <span>${slipData.month}/${slipData.year}</span></div>
            </div>
          </div>
          <h2 style="text-align:center;margin:18px 0 10px 0;font-size:1.3em;color:#4b2e83;">Pay Slip</h2>
          <table class="payslip-table" style="margin-bottom:0;table-layout:fixed;width:100%;word-break:break-word;">
            <tr>
              <th>Employee No.</th><td>${slipData.employeeId || ''}</td>
              <th>Designation</th><td>${slipData.designation || ''}</td>
              <th>Posting/Location</th><td>${slipData.address || ''}</td>
              <th>Employee PAN No</th><td style="white-space:normal;">${slipData.panNo || ''}</td>
            </tr>
            <tr>
              <th>Employee Name</th><td>${slipData.name || ''}</td>
              <th>Date of Joining</th><td>${slipData.doj ? (new Date(slipData.doj)).toLocaleDateString() : ''}</td>
              <td colspan="4"></td>
            </tr>
          </table>
          <table class="payslip-table" style="margin-top:0;"><tr><th>CTC/month</th><td colspan="7">₹${slipData.ctc||'0.00'}</td></tr></table>
          <div class="payslip-section-title">Attendance</div>
          <table class="payslip-table">
            <tr><th>Working Days</th><td>${slipData.attendance?.workingDays||slipData.attendance?.totalDays||''}</td><th>Weekend Days</th><td>${slipData.attendance?.weekendDays||''}</td><th>CL</th><td>${slipData.attendance?.cl||''}</td><th>SL</th><td>${slipData.attendance?.sl||''}</td></tr>
            <tr><th>PL</th><td>${slipData.attendance?.pl||''}</td><th>NPL</th><td>${slipData.attendance?.npl||''}</td><th>DNPL</th><td>${slipData.attendance?.dnpl||''}</td><th>Unpaid Leave</th><td>${slipData.attendance?.unpaidLeave||''}</td></tr>
            <tr><th>Total Days</th><td>${slipData.attendance?.totalDays||''}</td><th colspan="6"></th></tr>
          </table>
          <div class="payslip-section-title">Monthly Earnings</div>
          <table class="payslip-table">
            <tr><th>Basic</th><td>${slipData.earnings?.basic?.toFixed(2)||'0.00'}</td><th>HRA</th><td>${slipData.earnings?.hra?.toFixed(2)||'0.00'}</td><th>Special Allowance</th><td>${slipData.earnings?.specialAllowance?.toFixed(2)||'0.00'}</td><th>Total Earnings</th><td>${slipData.earnings?.totalEarnings?.toFixed(2)||'0.00'}</td></tr>
          </table>
          <div class="payslip-section-title">Deductions</div>
          <table class="payslip-table">
            <tr><th>EPF</th><td>0.00</td><th>P. Tax</th><td>0.00</td><th>Advance</th><td>0.00</td><th>Total Deductions</th><td>${slipData.deductions?.totalDeductions?.toFixed(2)||'0.00'}</td></tr>
          </table>
          <table class="payslip-table" style="margin-top:0;">
            <tr><th>Net Pay: Rs.</th><td colspan="7">${slipData.netPay?.toFixed(2)||'0.00'}</td></tr>
            <tr><td colspan="8" style="font-size:0.98em;color:#555;">Net Salary Credited to Your, Bank Account Number</td></tr>
          </table>
          <div class="payslip-footer">Rupees <span>${slipData.netPayWords||''}</span><br><span style="font-size:0.97em;">This is computer generated print, does not require any signature.</span><div class="payslip-signature">AssignOpedia HR/Admin</div></div>
        </div>
      </body>
      </html>
    `;

    // Puppeteer PDF generation
    const browser = await require('puppeteer').launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// --- Payslip Preview Data API ---
app.get('/api/payslip', async (req, res) => {
  const { employeeId, month, year } = req.query;
  console.log(employeeId,month,year);
  if (!employeeId || !month || !year) return res.status(400).json({ error: 'Missing params' });
  try {
    // Fetch payslip from MongoDB
    
    const payslip = await PaySlip.findOne({
      employeeId,
      month: parseInt(month),
      year: parseInt(year)
    });
  
    console.log(payslip);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    // Merge slipData if present
    let slip = payslip.toObject ? payslip.toObject() : payslip._doc || payslip;
    console.log("SLIP->", slip);
    if (slip.slipData && typeof slip.slipData === 'object') {
      slip = { ...slip, ...slip.slipData };
    }
    // Format for preview template
    res.json({
      slipId: slip.slipId || slip._id,
      employeeId: slip.employeeId,
      month: slip.month,
      year: slip.year,
      monthName: new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' }),
      designation: slip.designation,
      location: slip.address,
      panNo: slip.panNo,
      employeeName: slip.name,
      address: slip.address,
      doj: slip.doj ? new Date(slip.doj).toLocaleDateString() : '',
      ctc: slip.earnings?.ctc || '',
      workingDays: slip.attendance?.workingDays || slip.attendance?.totalDays || '',
      weekendDays: slip.attendance?.weekendDays || '',
      clCount: slip.attendance?.cl || '',
      slCount: slip.attendance?.sl || '',
      plCount: slip.attendance?.pl || '',
      nplCount: slip.attendance?.npl || '',
      dnplCount: slip.attendance?.dnpl || '',
      unpaidLeave: slip.attendance?.unpaidLeave || '',
      totalDays: slip.attendance?.totalDays || '',
      basic: slip.earnings?.basic || '',
      hra: slip.earnings?.hra || '',
      specialAllowance: slip.earnings?.specialAllowance || '',
      totalEarnings: slip.earnings?.totalEarnings || '',
      epf: slip.deductions?.epf || '',
      ptax: slip.deductions?.ptax || '',
      advance: slip.deductions?.advance || '',
      totalDeductions: slip.deductions?.totalDeductions || '',
      netPay: slip.netPay || '',
      netPayWords: slip.netPayWords || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Payslip not found' });
  }
});

// --- Payslip PDF Download API ---
// const puppeteer = require('puppeteer'); // REMOVE this duplicate line if present here
app.get('/api/download-payslip', async (req, res) => {
  const { employeeId, month, year } = req.query;
  if (!employeeId || !month || !year) return res.status(400).json({ error: 'Missing params' });
  const url = `${req.protocol}://${req.get('host')}/preview-payslip.html?employeeId=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    await browser.close();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Payslip-${employeeId}-${month}-${year}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// --- API routes ---
app.get('/api/payslip', );
app.get('/api/other-api',);

// --- Static file serving ---
app.use(express.static(path.join(__dirname, "public")));

// --- Catch-all (for SPA) ---
// THIS MUST BE LAST!
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});