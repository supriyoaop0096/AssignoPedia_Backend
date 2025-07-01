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
    leaveType: { type: String, enum: ["CL", "SL", "NPL", "DNPL", "Pending"], default: "Pending" },
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
app.post("/api/pay-slip", authenticateToken, requireHRorAdmin, async (req, res) => {
  try {
    const { employeeId, month, year, basicSalary, hra, specialAllowance, deductions, netSalary } =
      req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, month, and year are required for pay slip generation.",
      });
    }

    // Check if employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Here you would typically save the pay slip to database
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Pay slip generated successfully",
      data: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        month,
        year,
        basicSalary,
        hra,
        specialAllowance,
        deductions,
        netSalary,
      },
    });
  } catch (err) {
    console.error("Error generating pay slip:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// API: Mark attendance (check-in/check-out, late entry, late count)
app.post("/api/attendance", authenticateToken, restrictAttendanceByIP, async (req, res) => {
  try {
    const { employeeId, employeeName, date, checkIn, checkOut } = req.body;
    if (!employeeId || !date || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "employeeId, date, checkIn, and checkOut are required." });
    }
    // Always use IST for attendance date
    const istNow = getISTDate(new Date());
    const attendanceDate = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
    const [hIn, mIn] = checkIn.split(":").map(Number);
    let lateEntry = hIn > 11 || (hIn === 11 && mIn > 30);
    const [hOut, mOut] = checkOut.split(":").map(Number);
    let earlyCheckout = hOut < 18;
    // Save attendance
    let att = await Attendance.findOne({ employeeId, date: attendanceDate });
    if (att) {
      // Attendance already submitted for today, do not overwrite
      return res.json({
        success: false,
        message: "You have already checked in and checked out today. You can't check in or check out again until 12 AM (midnight).",
        alreadySubmitted: true
      });
    } else {
      att = new Attendance({
        employeeId,
        employeeName,
        date: attendanceDate,
        checkIn,
        checkOut,
        lateEntry,
        earlyCheckout,
        status: "Present"
      });
      await att.save();
    }
    // Calculate late count and early checkout count for the month
    const month = attendanceDate.getMonth();
    const year = attendanceDate.getFullYear();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const lateCount = await Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lte: monthEnd }, lateEntry: true });
    const earlyCheckoutCount = await Attendance.countDocuments({ employeeId, date: { $gte: monthStart, $lte: monthEnd }, earlyCheckout: true });
    return res.json({ success: true, lateEntry, earlyCheckout, lateCount, earlyCheckoutCount });
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
      //console.log("presentRecord",presentRecord);
      days.push({
        date: key,
        attendanceStatus: presentRecord ? 'Present' : 'Absent',
        leaveType: leaveDays[key] || null,
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
    // When storing word count, if date is today, use IST day
    const wordDate = date ? new Date(date) : getISTDate();
    const wordDateIST = new Date(wordDate.getFullYear(), wordDate.getMonth(), wordDate.getDate());
    // Find existing word count for this employee and date
    let existing = await WordCount.findOne({ employeeId, date: wordDateIST });
    let newWordCount = wordCount;
    if (existing) {
      newWordCount = existing.wordCount + wordCount;
    }
    const doc = await WordCount.findOneAndUpdate(
      { employeeId, date: wordDateIST },
      { $set: { employeeId, date: wordDateIST, wordCount: newWordCount, createdBy: req.user.employeeId } },
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
        editable: lr.leaveType === "Pending",
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
      if (!leaveType || !["CL", "SL", "NPL", "DNPL"].includes(leaveType)) {
        return res.status(400).json({ success: false, message: "Invalid leave type." });
      }
      const leave = await LeaveRequest.findById(id);
      if (!leave) {
        return res.status(404).json({ success: false, message: "Leave request not found." });
      }
      // Only allow editing if leaveType is still 'Pending'
      if (leave.leaveType !== "Pending") {
        return res.status(400).json({
          success: false,
          message: "Leave type can only be edited if leave type is Pending.",
        });
      }
      leave.leaveType = leaveType;
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

