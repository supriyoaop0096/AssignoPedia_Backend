import socialMediaService from "./social-media-service.js";

// Global function to handle Manage Account button click
// function handleManageAccountClick() {
//   console.log("handleManageAccountClick called"); // Debug log
//   const sidebarEl = document.getElementById('myProfileSidebar');
//   const overlayEl = document.getElementById('myProfileSidebarOverlay');
//   console.log("Sidebar element:", sidebarEl); // Debug log
//   console.log("Overlay element:", overlayEl); // Debug log
//   if (sidebarEl) sidebarEl.classList.remove('open');
//   if (overlayEl) overlayEl.classList.remove('open');
//   console.log("About to call showProfileInMainContent"); // Debug log
//   showProfileInMainContent();
//   console.log("showProfileInMainContent called successfully"); // Debug log
// }
// window.handleManageAccountClick = handleManageAccountClick;


// window.handleManageAccountClick = handleManageAccountClick;
//Make these functions globally available
//const token = localStorage.getItem('jwtToken');
//console.log("Token at dashbaoard",token);
   const ATTENDANCE_CHECKIN_KEY = 'attendanceCheckInTime';
   const ATTENDANCE_CHECKOUT_KEY = 'attendanceCheckOutTime';
   const ATTENDANCE_DATE_KEY = 'attendanceDate';
window.approveLeaveRequest = async function (id) {
  try {
    const approveBtn = document.querySelector(`button.approve-btn[onclick*="${id}"]`);
    const rejectBtn = document.querySelector(`button.reject-btn[onclick*="${id}"]`);
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(`/api/leave-requests/${id}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let data = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch (jsonErr) {
      data = {};
    }
    if (res.ok && data.success) {
      await loadLeaveApproval();
    } else if (data && data.message) {
      alert(data.message || "Failed to approve leave request");
      if (approveBtn) approveBtn.disabled = false;
      if (rejectBtn) rejectBtn.disabled = false;
    } else {
      alert("Error approving leave request");
      if (approveBtn) approveBtn.disabled = false;
      if (rejectBtn) rejectBtn.disabled = false;
    }
  } catch (err) {
    alert("Error approving leave request");
    const approveBtn = document.querySelector(`button.approve-btn[onclick*="${id}"]`);
    const rejectBtn = document.querySelector(`button.reject-btn[onclick*="${id}"]`);
    if (approveBtn) approveBtn.disabled = false;
    if (rejectBtn) rejectBtn.disabled = false;
  }
};

window.rejectLeaveRequest = async function (id) {
  try {
    const approveBtn = document.querySelector(`button.approve-btn[onclick*="${id}"]`);
    const rejectBtn = document.querySelector(`button.reject-btn[onclick*="${id}"]`);
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(`/api/leave-requests/${id}/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let data = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch (jsonErr) {
      data = {};
    }
    if (res.ok && data.success) {
      await loadLeaveApproval();
    } else if (data && data.message) {
      alert(data.message || "Failed to reject leave request");
      if (approveBtn) approveBtn.disabled = false;
      if (rejectBtn) rejectBtn.disabled = false;
    } else {
      alert("Error rejecting leave request");
      if (approveBtn) approveBtn.disabled = false;
      if (rejectBtn) rejectBtn.disabled = false;
    }
  } catch (err) {
    alert("Error rejecting leave request");
    const approveBtn = document.querySelector(`button.approve-btn[onclick*="${id}"]`);
    const rejectBtn = document.querySelector(`button.reject-btn[onclick*="${id}"]`);
    if (approveBtn) approveBtn.disabled = false;
    if (rejectBtn) rejectBtn.disabled = false;
  }
};

// Move these declarations to the top-level scope so all functions can access them
let isAdminRole = false;
let isHRRole = false;
let isBDMorTL = false;
let isRegularEmployee = false;
let mainContent = null;
function setActive(buttonId) {
  document.querySelectorAll(".sidebar-btn").forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.getElementById(buttonId);
  if (activeBtn) activeBtn.classList.add("active");
}

// --- Logout logic (top-level, not inside any function) ---
function setLogoutListener() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("employee");
      localStorage.removeItem("jwtToken");
      window.location.href = "login.html";
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mainContent = document.getElementById("mainContent");

  const employee = JSON.parse(localStorage.getItem("employee"));
  const token = localStorage.getItem("jwtToken");
  console.log("login->", token);
  if (!employee || !token) {
    window.location.href = "login.html";
    return;
  }
  console.log(employee);
  // Enhanced Role-based access control
  isAdminRole = employee.role === "admin" || employee.role === "hr_admin";
  isHRRole =
    employee.role === "hr_admin" ||
    employee.role === "hr_manager" ||
    employee.role === "hr_executive" ||
    employee.role === "hr_recruiter";
  isBDMorTL = employee.role === "bdm" || employee.role === "team_leader" || employee.role === "tl";
  isRegularEmployee = !isAdminRole && !isHRRole && !isBDMorTL;
  mainContent = document.getElementById("mainContent");

  // Enhanced Access Control Summary:
  // - Admin: My Dashboard (no word count), Notice Board, Leave Approval, Leave Tracker, Attendance Tracker, Pay Slip, WFH Approval, Social Media, Employee Stats
  // - HR Recruiter: My Dashboard (no word count), Notice Board, Leave Approval, Notifications, Leave Tracker, Attendance Tracker, Pay Slip, WFH Approval, Social Media, My Attendance, Leave Request, WFH Request, WFH Approval, Employee Stats
  // - BDM/TL: Everything except Attendance Tracker, Leave Tracker, WFH Approval, Notice Board, Pay Slip, Add Employee, Employee Stats
  // - Regular Employee: Notifications, Leave Request, WFH Request, My Attendance, My Dashboard (with word count)

  // Ensure attendance button is visible for all roles by default
  const attendanceBtn = document.getElementById("btn-attendance");
  if (attendanceBtn) {
    attendanceBtn.style.display = "";
  }

  // Show/hide buttons based on role
  if (isAdminRole) {
    // Admin: Show all admin features
    document.getElementById("btn-social").style.display = "";
    document.getElementById("btn-add-employee").style.display = "";
    document.getElementById("btn-manage-employee").style.display = "";
    document.getElementById("btn-stats").style.display = "";
    document.getElementById("btn-attendance").style.display = "";
    document.getElementById("btn-leave").style.display = "";
    document.getElementById("btn-pay-slip").style.display = "";

    // Add admin-specific buttons to sidebar
    const sidebarNav = document.querySelector(".sidebar-nav");
    
    // Add Notice Board button
    if (!document.getElementById("btn-notice-board")) {
      const noticeBoardBtn = document.createElement("button");
      noticeBoardBtn.id = "btn-notice-board";
      noticeBoardBtn.className = "sidebar-btn";
      noticeBoardBtn.innerHTML = '<i class="fas fa-bullhorn"></i> Notice Board';
      sidebarNav.insertBefore(noticeBoardBtn, document.getElementById("btn-stats"));
      noticeBoardBtn.addEventListener("click", () => {
        loadNoticeBoard();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add WFH Request button
    if (!document.getElementById("btn-wfh")) {
      const wfhBtn = document.createElement("button");
      wfhBtn.id = "btn-wfh";
      wfhBtn.className = "sidebar-btn";
      wfhBtn.innerHTML = '<i class="fas fa-laptop-house"></i> WFH Request';
      sidebarNav.insertBefore(wfhBtn, document.getElementById("btn-stats"));
      wfhBtn.addEventListener("click", () => {
        loadWFHRequest();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add WFH Approval button
    if (!document.getElementById("btn-wfh-approval")) {
      const wfhApprovalBtn = document.createElement("button");
      wfhApprovalBtn.id = "btn-wfh-approval";
      wfhApprovalBtn.className = "sidebar-btn";
      wfhApprovalBtn.innerHTML = '<i class="fas fa-check-circle"></i> WFH Approval';
      sidebarNav.insertBefore(wfhApprovalBtn, document.getElementById("btn-stats"));
      wfhApprovalBtn.addEventListener("click", () => {
        loadWFHApproval();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add Notifications button
    if (!document.getElementById("btn-notifications")) {
      const notificationsBtn = document.createElement("button");
      notificationsBtn.id = "btn-notifications";
      notificationsBtn.className = "sidebar-btn";
      notificationsBtn.innerHTML = '<i class="fas fa-bell"></i> Notifications';
      sidebarNav.insertBefore(notificationsBtn, document.getElementById("btn-stats"));
      notificationsBtn.addEventListener("click", () => {
        loadNotifications();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add leave approval button to sidebar for admin roles
    const leaveApprovalBtn = document.createElement("button");
    leaveApprovalBtn.id = "btn-leave-approval";
    leaveApprovalBtn.className = "sidebar-btn";
    leaveApprovalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Leave Approval';
    sidebarNav.insertBefore(leaveApprovalBtn, document.getElementById("btn-stats"));

    // Add event listener for leave approval button
    leaveApprovalBtn.onclick = loadLeaveApproval;

  } else if (isHRRole) {
    // HR Recruiter: Show HR features
    document.getElementById("btn-add-employee").style.display = "";
    document.getElementById("btn-manage-employee").style.display = "";
    document.getElementById("btn-attendance").style.display = "";
    document.getElementById("btn-leave").style.display = "";
    document.getElementById("btn-pay-slip").style.display = "";
    document.getElementById("btn-social").style.display = "";

    // Add HR-specific buttons to sidebar
    const sidebarNav = document.querySelector(".sidebar-nav");
    
    // Add Notice Board button
    if (!document.getElementById("btn-notice-board")) {
      const noticeBoardBtn = document.createElement("button");
      noticeBoardBtn.id = "btn-notice-board";
      noticeBoardBtn.className = "sidebar-btn";
      noticeBoardBtn.innerHTML = '<i class="fas fa-bullhorn"></i> Notice Board';
      sidebarNav.insertBefore(noticeBoardBtn, document.getElementById("btn-stats"));
      noticeBoardBtn.addEventListener("click", () => {
        loadNoticeBoard();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add WFH Request button
    if (!document.getElementById("btn-wfh")) {
      const wfhBtn = document.createElement("button");
      wfhBtn.id = "btn-wfh";
      wfhBtn.className = "sidebar-btn";
      wfhBtn.innerHTML = '<i class="fas fa-laptop-house"></i> WFH Request';
      sidebarNav.insertBefore(wfhBtn, document.getElementById("btn-stats"));
      wfhBtn.addEventListener("click", () => {
        loadWFHRequest();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add WFH Approval button
    if (!document.getElementById("btn-wfh-approval")) {
      const wfhApprovalBtn = document.createElement("button");
      wfhApprovalBtn.id = "btn-wfh-approval";
      wfhApprovalBtn.className = "sidebar-btn";
      wfhApprovalBtn.innerHTML = '<i class="fas fa-check-circle"></i> WFH Approval';
      sidebarNav.insertBefore(wfhApprovalBtn, document.getElementById("btn-stats"));
      wfhApprovalBtn.addEventListener("click", () => {
        loadWFHApproval();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add Notifications button
    if (!document.getElementById("btn-notifications")) {
      const notificationsBtn = document.createElement("button");
      notificationsBtn.id = "btn-notifications";
      notificationsBtn.className = "sidebar-btn";
      notificationsBtn.innerHTML = '<i class="fas fa-bell"></i> Notifications';
      sidebarNav.insertBefore(notificationsBtn, document.getElementById("btn-stats"));
      notificationsBtn.addEventListener("click", () => {
        loadNotifications();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add leave approval button to sidebar for HR roles
    const leaveApprovalBtn = document.createElement("button");
    leaveApprovalBtn.id = "btn-leave-approval";
    leaveApprovalBtn.className = "sidebar-btn";
    leaveApprovalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Leave Approval';
    sidebarNav.insertBefore(leaveApprovalBtn, document.getElementById("btn-stats"));

    // Add event listener for leave approval button
    leaveApprovalBtn.onclick = loadLeaveApproval;

  } else if (isBDMorTL) {
    // BDM/TL: Show limited features
    document.getElementById("btn-attendance").style.display = "";
    document.getElementById("btn-leave").style.display = "";
    
    // Hide buttons that BDM/TL shouldn't see
    document.getElementById("btn-social").style.display = "none";
    document.getElementById("btn-add-employee").style.display = "none";
    document.getElementById("btn-manage-employee").style.display = "none";
    document.getElementById("btn-stats").style.display = "none";
    document.getElementById("btn-pay-slip").style.display = "none";

    // Add BDM/TL-specific buttons to sidebar
    const sidebarNav = document.querySelector(".sidebar-nav");
    
    // Add WFH Request button
    if (!document.getElementById("btn-wfh")) {
      const wfhBtn = document.createElement("button");
      wfhBtn.id = "btn-wfh";
      wfhBtn.className = "sidebar-btn";
      wfhBtn.innerHTML = '<i class="fas fa-laptop-house"></i> WFH Request';
      sidebarNav.insertBefore(wfhBtn, document.getElementById("btn-stats"));
      wfhBtn.addEventListener("click", () => {
        loadWFHRequest();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add Notifications button
    if (!document.getElementById("btn-notifications")) {
      const notificationsBtn = document.createElement("button");
      notificationsBtn.id = "btn-notifications";
      notificationsBtn.className = "sidebar-btn";
      notificationsBtn.innerHTML = '<i class="fas fa-bell"></i> Notifications';
      sidebarNav.insertBefore(notificationsBtn, document.getElementById("btn-stats"));
      notificationsBtn.addEventListener("click", () => {
        loadNotifications();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

  } else {
    // Regular Employee: Show basic features
    document.getElementById("btn-attendance").style.display = "";
    document.getElementById("btn-leave").style.display = "";
    
    // Hide buttons that regular employees shouldn't see
    document.getElementById("btn-social").style.display = "none";
    document.getElementById("btn-add-employee").style.display = "none";
    document.getElementById("btn-manage-employee").style.display = "none";
    document.getElementById("btn-stats").style.display = "none";
    document.getElementById("btn-pay-slip").style.display = "none";

    // Add employee-specific buttons to sidebar
    const sidebarNav = document.querySelector(".sidebar-nav");
    
    // Add WFH Request button
    if (!document.getElementById("btn-wfh")) {
      const wfhBtn = document.createElement("button");
      wfhBtn.id = "btn-wfh";
      wfhBtn.className = "sidebar-btn";
      wfhBtn.innerHTML = '<i class="fas fa-laptop-house"></i> WFH Request';
      sidebarNav.insertBefore(wfhBtn, document.getElementById("btn-stats"));
      wfhBtn.addEventListener("click", () => {
        loadWFHRequest();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }

    // Add Notifications button
    if (!document.getElementById("btn-notifications")) {
      const notificationsBtn = document.createElement("button");
      notificationsBtn.id = "btn-notifications";
      notificationsBtn.className = "sidebar-btn";
      notificationsBtn.innerHTML = '<i class="fas fa-bell"></i> Notifications';
      sidebarNav.insertBefore(notificationsBtn, document.getElementById("btn-stats"));
      notificationsBtn.addEventListener("click", () => {
        loadNotifications();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }
  }

  // Add Leave Tracker button for admin/HR
  if (isAdminRole || isHRRole) {
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!document.getElementById("btn-leave-tracker")) {
      const leaveTrackerBtn = document.createElement("button");
      leaveTrackerBtn.id = "btn-leave-tracker";
      leaveTrackerBtn.className = "sidebar-btn";
      leaveTrackerBtn.innerHTML = '<i class="fas fa-search"></i> Leave Tracker';
      sidebarNav.insertBefore(leaveTrackerBtn, document.getElementById("btn-stats"));
      leaveTrackerBtn.addEventListener("click", () => {
        loadLeaveTracker();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }
  }

  // Add Word Count Entry button to sidebar for BDM/TL only (not admin/HR)
  if (isBDMorTL) {
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!document.getElementById("btn-word-count-entry")) {
      const wordCountBtn = document.createElement("button");
      wordCountBtn.id = "btn-word-count-entry";
      wordCountBtn.className = "sidebar-btn";
      wordCountBtn.innerHTML = '<i class="fas fa-keyboard"></i> Word Count Entry';
      sidebarNav.insertBefore(wordCountBtn, document.getElementById("btn-stats"));
      wordCountBtn.addEventListener("click", () => {
        loadWordCountEntry();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }
  }

  // Add Attendance Tracker button for admin/HR
  if (isAdminRole || isHRRole) {
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!document.getElementById("btn-attendance-tracker")) {
      const attTrackerBtn = document.createElement("button");
      attTrackerBtn.id = "btn-attendance-tracker";
      attTrackerBtn.className = "sidebar-btn";
      attTrackerBtn.innerHTML = '<i class="fas fa-user-clock"></i> Attendance Tracker';
      sidebarNav.insertBefore(attTrackerBtn, document.getElementById("btn-stats"));
      attTrackerBtn.addEventListener("click", () => {
        loadAttendanceTracker();
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("sidebarOverlay").classList.remove("active");
        }
      });
    }
  }

  // Load Leave Request Form and History
  async function loadLeaveRequest() {
    setActive("btn-leave");
    mainContent.innerHTML = `
      <div class="admin-content-section leave-request-section" id="leaveRequestSection">
        <h2>Leave Requests</h2>
        <form id="leaveForm" class="section-form add-employee-flex-row">
          <div class="form-row" style="flex-wrap: wrap; gap: 15px;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Reason</label>
              <select name="Reason" required id="ReasonSelect" class="reason-select">
                <option value="">Select a reason</option>
                <option value="Medical Reason">Medical Reason</option>
                <option value="Personal Reason">Personal Reason</option>
                <option value="Emergency Reason">Emergency Reason</option>
                <option value="Other Reason">Other Reason</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Leave Count</label>
              <div class="leave-count-container">
                <input type="number" name="leaveCount" min="1" max="20" value="" required class="leave-count-input" placeholder="Enter number of days (1-20)" id="leaveCountInput">
              </div>
            </div>
          </div>
          <div id="reasonCommentBox" class="form-row" style="display: none; margin-top: 10px;">
            <div class="form-group" style="flex: 1;">
              <label>Additional Details</label>
              <textarea name="reasonComment" rows="3" placeholder="Please provide additional details about your reason..." class="others-textarea" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s ease; resize: vertical; min-height: 100px; background: #f8f9fa;"></textarea>
              <div class="attachment-section">
                <button type="button" class="attachment-btn" id="attachmentBtn">
                  <i class="fas fa-paperclip"></i>
                  Attach Image
                </button>
                <input type="file" id="imageUpload" accept="image/*" style="display: none;">
                <div class="attachment-preview" id="attachmentPreview">
                  <img src="" alt="Preview" class="preview-image" id="previewImage">
                  <button type="button" class="remove-attachment" id="removeAttachment">
                    <i class="fas fa-times"></i>
                    Remove Image
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="singleDateSection" class="form-row" style="flex-wrap: wrap; gap: 15px; margin-top: 15px; display: none;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Select Date</label>
              <input type="date" name="singleDate" class="date-input" placeholder="Select date">
            </div>
          </div>
          <div id="dateRangeSection" class="form-row" style="flex-wrap: wrap; gap: 15px; margin-top: 15px; display: none;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>From</label>
              <input type="date" name="fromDate" class="date-input" placeholder="Select start date">
            </div>
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>To</label>
              <input type="date" name="toDate" class="date-input" placeholder="Select end date">
            </div>
          </div>
          <div class="button-container">
            <button type="button" class="cancel-btn" id="cancelLeaveBtn">Cancel</button>
            <button type="submit" class="add-employee-btn">Submit Request</button>
          </div>
        </form>
      </div>
    `;

    // Sample holiday list (to be replaced with actual holidays later)
    const holidays = [
      "2024-01-01", // New Year's Day
      "2024-01-26", // Republic Day
      "2024-03-25", // Holi
      "2024-04-09", // Ram Navami
      "2024-05-01", // Labor Day
      "2024-08-15", // Independence Day
      "2024-10-02", // Gandhi Jayanti
      "2024-12-25", // Christmas
    ];

    // Function to check if a date is a holiday
    const isHoliday = (date) => {
      const dateStr = date.toISOString().split("T")[0];
      return holidays.includes(dateStr);
    };

    // Function to create date without timezone issues
    const createDate = (dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    // Function to calculate working days between two dates (inclusive)
    const calculateWorkingDays = (startDate, endDate) => {
      let count = 0;
      const currentDate = new Date(startDate);
      const lastDate = new Date(endDate);
      while (currentDate <= lastDate) {
        // Skip Sundays (0) and holidays
        if (currentDate.getDay() !== 0 && !isHoliday(currentDate)) {
          count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return count;
    };

    // Date change handlers
    const handleDateChange = () => {
      const leaveCountInput = document.getElementById("leaveCountInput");
      const leaveCount = parseInt(leaveCountInput.value);
      const singleDateInput = document.querySelector('input[name="singleDate"]');
      const fromDateInput = document.querySelector('input[name="fromDate"]');
      const toDateInput = document.querySelector('input[name="toDate"]');

      if (leaveCount === 1 && singleDateInput.value) {
        const selectedDate = createDate(singleDateInput.value);
        console.log("Selected Date:", selectedDate);
        console.log("Day of week:", selectedDate.getDay());

        // Check if it's Sunday (0) or holiday
        if (selectedDate.getDay() === 0 || isHoliday(selectedDate)) {
          alert("Cannot apply leave on Sunday or holiday");
          singleDateInput.value = "";
          leaveCountInput.value = "0";
          return;
        } else {
          // If it's a valid working day, set leave count to 1
          leaveCountInput.value = "1";
        }
      } else if (leaveCount > 1 && fromDateInput.value && toDateInput.value) {
        const fromDate = createDate(fromDateInput.value);
        const toDate = createDate(toDateInput.value);

        if (fromDate > toDate) {
          alert("From date cannot be after To date");
          fromDateInput.value = "";
          toDateInput.value = "";
          return;
        }

        // Calculate and update leave count based on selected dates (inclusive, working days only)
        const workingDays = calculateWorkingDays(fromDate, toDate);
        leaveCountInput.value = workingDays;
      }
    };

    // Leave count change handler
    document.getElementById("leaveCountInput").onchange = function () {
      const leaveCount = parseInt(this.value);
      const singleDateSection = document.getElementById("singleDateSection");
      const dateRangeSection = document.getElementById("dateRangeSection");
      const singleDateInput = document.querySelector('input[name="singleDate"]');
      const fromDateInput = document.querySelector('input[name="fromDate"]');
      const toDateInput = document.querySelector('input[name="toDate"]');

      // Reset all date inputs
      singleDateInput.value = "";
      fromDateInput.value = "";
      toDateInput.value = "";

      if (leaveCount === 1) {
        singleDateSection.style.display = "flex";
        dateRangeSection.style.display = "none";
        singleDateInput.required = true;
        fromDateInput.required = false;
        toDateInput.required = false;
      } else if (leaveCount > 1) {
        singleDateSection.style.display = "none";
        dateRangeSection.style.display = "flex";
        singleDateInput.required = false;
        fromDateInput.required = true;
        toDateInput.required = true;
      } else {
        singleDateSection.style.display = "none";
        dateRangeSection.style.display = "none";
        singleDateInput.required = false;
        fromDateInput.required = false;
        toDateInput.required = false;
      }
    };

    // Add event listeners for date changes
    document.querySelector('input[name="singleDate"]').addEventListener("change", handleDateChange);
    document.querySelector('input[name="fromDate"]').addEventListener("change", handleDateChange);
    document.querySelector('input[name="toDate"]').addEventListener("change", handleDateChange);

    // Also add event listener for leave count input to handle initial value
    document.getElementById("leaveCountInput").addEventListener("change", function () {
      const singleDateInput = document.querySelector('input[name="singleDate"]');
      if (this.value === "1" && singleDateInput.value) {
        // Re-trigger date validation when leave count is set to 1
        handleDateChange();
      }
    });

    // Add reason select change handler
    document.getElementById("ReasonSelect").onchange = function () {
      const reasonCommentBox = document.getElementById("reasonCommentBox");
      if (this.value !== "") {
        reasonCommentBox.style.display = "flex";
        reasonCommentBox.querySelector("textarea").required = true;
      } else {
        reasonCommentBox.style.display = "none";
        reasonCommentBox.querySelector("textarea").required = false;
      }
    };

    // Add cancel button functionality
    document.getElementById("cancelLeaveBtn").onclick = function () {
      document.getElementById("leaveForm").reset();
      document.getElementById("reasonCommentBox").style.display = "none";
      document.getElementById("singleDateSection").style.display = "none";
      document.getElementById("dateRangeSection").style.display = "none";
    };

    // Add attachment button functionality
    const attachmentBtn = document.getElementById("attachmentBtn");
    const imageUpload = document.getElementById("imageUpload");
    const attachmentPreview = document.getElementById("attachmentPreview");
    const previewImage = document.getElementById("previewImage");
    const removeAttachment = document.getElementById("removeAttachment");

    attachmentBtn.addEventListener("click", () => {
      imageUpload.click();
    });

    imageUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImage.src = e.target.result;
          attachmentPreview.classList.add("active");
        };
        reader.readAsDataURL(file);
      }
    });

    removeAttachment.addEventListener("click", () => {
      imageUpload.value = "";
      previewImage.src = "";
      attachmentPreview.classList.remove("active");
    });

    document.getElementById("leaveForm").onsubmit = async function (e) {
      e.preventDefault();
      const form = e.target;
      const leaveCount = parseInt(form.leaveCount.value);
      // Use FormData for file upload
      const formData = new FormData();
      formData.append("reason", form.Reason.value);
      formData.append("leaveCount", leaveCount);
      formData.append("fromDate", leaveCount === 1 ? form.singleDate.value : form.fromDate.value);
      formData.append("toDate", leaveCount === 1 ? form.singleDate.value : form.toDate.value);
      formData.append("comments", form.reasonComment.value);
      // Attach image if selected
      const imageFile = document.getElementById("imageUpload").files[0];
      if (imageFile) {
        if (imageFile.size > 512 * 1024) {
          alert("Attachment too large (max 512KB)");
          return;
        }
        formData.append("attachment", imageFile);
      }
      try {
        const res = await fetch("/api/leave-requests", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Do NOT set Content-Type, browser will set it for FormData
          },
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          alert("Leave request submitted successfully!");
          loadLeaveRequest();
        } else {
          alert(data.message || "Failed to submit leave request.");
        }
      } catch (err) {
        alert("Error submitting request.");
      }
    };

    setLogoutListener();
    injectProfileSidebar();
  }

  // Social Media Links
  function loadSocialMedia() {
    // Security check - only admin and HR roles can access social media
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can access social media features.");
      return;
    }

    setActive("btn-social");
    mainContent.innerHTML = `
      <div class="admin-content-section social-media-section" id="social-media-section">
        <h2>Social Media Post</h2>
        <div class="social-media-flex-container">
          <div class="social-media-form-col">
            <form id="socialMediaForm" class="section-form">
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label>Post Caption</label>
                  <textarea name="caption" rows="4" placeholder="Write your post caption here..." required></textarea>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label>Attach File</label>
                  <div class="file-upload-container">
                    <input type="file" name="file" id="fileInput" class="file-input" />
                    <label for="fileInput" class="file-label">
                      <i class="fas fa-cloud-upload-alt"></i>
                      <span>Choose a file or drag it here</span>
                    </label>
                    <div id="fileInfo" class="file-info"></div>
                  </div>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label>Select Platforms</label>
                  <div class="platform-selection">
                    <label class="platform-checkbox">
                      <input type="checkbox" name="platforms" value="facebook" checked>
                      <span class="platform-icon"><i class="fab fa-facebook"></i></span>
                      <span>Facebook</span>
                    </label>
                    <label class="platform-checkbox">
                      <input type="checkbox" name="platforms" value="instagram" checked>
                      <span class="platform-icon"><i class="fab fa-instagram"></i></span>
                      <span>Instagram</span>
                    </label>
                    <label class="platform-checkbox">
                      <input type="checkbox" name="platforms" value="linkedin" checked>
                      <span class="platform-icon"><i class="fab fa-linkedin"></i></span>
                      <span>LinkedIn</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="form-row" style="justify-content: flex-start;">
                <button type="submit" class="post-btn">
                  <i class="fas fa-paper-plane"></i>
                  Post to Social Media
                </button>
              </div>
            </form>
            <div id="postStatus" class="post-status"></div>
          </div>
          <div class="social-media-image-col">
            <img src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80" alt="Social Media Inspiration" class="social-media-side-image" />
          </div>
        </div>
      </div>
    `;

    // File upload handling
    const fileInput = document.getElementById("fileInput");
    const fileInfo = document.getElementById("fileInfo");
    const fileLabel = document.querySelector(".file-label");

    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        fileInfo.innerHTML = `
          <div class="file-preview">
            <i class="fas ${getFileIcon(file.type)}"></i>
            <span>${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button type="button" class="remove-social-image" style="margin-left:10px; background:#ff758c; color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times"></i></button>
          </div>
        `;
        fileLabel.classList.add("has-file");
        // Add remove button logic
        const removeBtn = fileInfo.querySelector(".remove-social-image");
        if (removeBtn) {
          removeBtn.addEventListener("click", function () {
            fileInput.value = "";
            fileInfo.innerHTML = "";
            fileLabel.classList.remove("has-file");
          });
        }
      } else {
        fileInfo.innerHTML = "";
        fileLabel.classList.remove("has-file");
      }
    });

    // Drag and drop handling
    const dropZone = document.querySelector(".file-upload-container");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
      dropZone.classList.add("highlight");
    }

    function unhighlight(e) {
      dropZone.classList.remove("highlight");
    }

    dropZone.addEventListener("drop", handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      fileInput.files = dt.files;
      const event = new Event("change");
      fileInput.dispatchEvent(event);
    }

    // Form submission
    document.getElementById("socialMediaForm").onsubmit = async function (e) {
      e.preventDefault();
      const form = e.target;
      const caption = form.caption.value;
      const file = form.file.files[0];
      const platforms = Array.from(form.platforms)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

      if (!caption) {
        showStatus("Please enter a caption", "error");
        return;
      }

      if (platforms.length === 0) {
        showStatus("Please select at least one platform", "error");
        return;
      }

      const postStatus = document.getElementById("postStatus");
      postStatus.innerHTML =
        '<div class="posting-status"><i class="fas fa-spinner fa-spin"></i> Posting to social media...</div>';

      try {
        const results = await socialMediaService.postToSocialMedia(caption, file, platforms);

        if (results.success.length > 0) {
          const successMessage = results.success
            .map((r) => `Successfully posted to ${r.platform}`)
            .join("<br>");
          showStatus(successMessage, "success");
        }

        if (results.failed.length > 0) {
          const errorMessage = results.failed
            .map((r) => `Failed to post to ${r.platform}: ${r.error}`)
            .join("<br>");
          showStatus(errorMessage, "error");
        }

        if (results.success.length > 0) {
          form.reset();
          fileInfo.innerHTML = "";
          fileLabel.classList.remove("has-file");
        }
      } catch (error) {
        showStatus("Error posting to social media. Please try again.", "error");
      }
    };

    setLogoutListener();
    injectProfileSidebar();
  }

  // Helper functions for file handling
  function getFileIcon(fileType) {
    if (fileType.startsWith("image/")) return "fa-image";
    if (fileType.startsWith("video/")) return "fa-video";
    if (fileType.startsWith("audio/")) return "fa-music";
    if (fileType.includes("pdf")) return "fa-file-pdf";
    if (fileType.includes("word")) return "fa-file-word";
    if (fileType.includes("excel") || fileType.includes("sheet")) return "fa-file-excel";
    return "fa-file";
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function showStatus(message, type) {
    const postStatus = document.getElementById("postStatus");
    postStatus.innerHTML = `
      <div class="status-message ${type}">
        <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}"></i>
        ${message}
      </div>
    `;
  }

  async function simulateSocialMediaPost(caption, file, platforms) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Here you would typically make API calls to social media platforms
    console.log("Posting to:", platforms);
    console.log("Caption:", caption);
    console.log("File:", file ? file.name : "No file");

    // Simulate success
    return true;
  }

  // Add Employee Form
  function loadAddEmployee() {
    // Security check - only admin and HR roles can add employees
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can add employees.");
      return;
    }
    setActive("btn-add-employee");
    mainContent.innerHTML = `
      <div class="admin-content-section" id="add-employee-section">
        <h2>Add New Employee</h2>
        <div class="scrollable-form-container">
          <form id="addEmployeeForm" class="section-form add-employee-flex-row">
            <div class="form-row">
              <div class="form-group">
                <label>Employee ID</label>
                <input type="text" name="employeeId" required />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" name="firstName" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Address</label>
                <textarea name="address" rows="3" class="address-textarea"></textarea>
              </div>
              <div class="form-group">
                <label>Mobile No</label>
                <input type="text" name="mobile" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ID Card Type</label>
                <select name="idCardType" id="idCardType">
                  <option value="">Select ID Card Type</option>
                  <option value="aadhar">Aaddhar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="passport">Passport</option>
                  <option value="driving">Driving License</option>
                  <option value="voter">Voter ID</option>
                </select>
              </div>
              <div class="form-group">
                <label>ID Card Number</label>
                <input type="text" name="idCardNumber" id="idCardNumber" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Employee Designation</label>
                <select name="role">
                  <option value="junior_developer">Junior Developer</option>
                  <option value="senior_developer">Senior Developer</option>
                  <option value="junior_writer">Junior Writer</option>
                  <option value="senior_writer">Senior Writer</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="bdm">B D M</option>
                  <option value="hr_recruiter">HR Recruiter</option>
                  <option value="hr_executive">HR Executive</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="hr_admin">HR Admin</option>  
                  <option value="hr_admin">Admin</option>
                </select>
              </div>
              <div class="form-group">
                <label>Email Id</label>
                <input type="email" name="email" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date of Joining</label>
                <input type="date" name="doj" />
              </div>
              <div class="form-group">
                <label>Profile Image</label>
                <div class="image-upload-container">
                  <input type="file" name="profileImage" id="profileImage" accept="image/*" style="display: none;" />
                  <button type="button" class="image-upload-btn" onclick="document.getElementById('profileImage').click()">
                    <i class="fas fa-upload"></i> Choose Image
                  </button>
                  <div class="image-preview" id="imagePreview" style="display: none;">
                    <img src="" alt="Preview" id="previewImg" />
                    <button type="button" class="remove-image-btn" onclick="removeImage()">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-row button-container">
              <button type="button" class="cancel-btn">Cancel</button>
              <button type="submit" class="login-btn add-employee-btn">Add Employee</button>
            </div>
            <div id="addEmployeeMsg"></div>
          </form>
        </div>
      </div>
    `;

    // Add ID Card validation
    const idCardType = document.getElementById("idCardType");
    const idCardNumber = document.getElementById("idCardNumber");

    idCardType.addEventListener("change", function () {
      const type = this.value;
      idCardNumber.value = ""; // Clear previous value

      // Set pattern based on ID card type
      switch (type) {
        case "aadhar":
          idCardNumber.pattern = "[0-9]{12}";
          idCardNumber.placeholder = "Enter 12-digit Aadhar number";
          break;
        case "pan":
          idCardNumber.pattern = "[A-Z]{5}[0-9]{4}[A-Z]{1}";
          idCardNumber.placeholder = "Enter PAN number (e.g., ABCDE1234F)";
          break;
        case "passport":
          idCardNumber.pattern = "[A-Z]{1}[0-9]{7}";
          idCardNumber.placeholder = "Enter Passport number (e.g., A1234567)";
          break;
        case "driving":
          idCardNumber.pattern = "[A-Z]{2}[0-9]{2}[0-9]{11}";
          idCardNumber.placeholder = "Enter Driving License number";
          break;
        case "voter":
          idCardNumber.pattern = "[A-Z]{3}[0-9]{7}";
          idCardNumber.placeholder = "Enter Voter ID number";
          break;
        default:
          idCardNumber.pattern = "";
          idCardNumber.placeholder = "Select ID Card Type first";
      }
    });

    document.getElementById("addEmployeeForm").onsubmit = async function (e) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData();

      // Add all form fields to FormData
      formData.append("employeeId", form.employeeId.value);
      formData.append("firstName", form.firstName.value);
      formData.append("lastName", form.lastName.value);
      formData.append("password", form.password.value);
      formData.append("role", form.role.value);
      formData.append("address", form.address.value);
      formData.append("mobile", form.mobile.value);
      formData.append("email", form.email.value);
      formData.append("idCardType", form.idCardType.value);
      formData.append("idCardNumber", form.idCardNumber.value);
      formData.append("doj", form.doj.value);

      // Add profile image if selected

      const profileImage = document.getElementById("profileImage").files[0];
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      try {
        const token = localStorage.getItem("jwtToken");
        console.log("Token at employee form", token);
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const data = await res.json();
        console.log(data);
        const msgDiv = document.getElementById("addEmployeeMsg");
        if (data.success) {
          msgDiv.style.color = "green";
          msgDiv.textContent = "Employee added successfully!";
          form.reset();
          document.getElementById("imagePreview").style.display = "none";
        } else {
          msgDiv.style.color = "red";
          msgDiv.textContent = data.message || "Failed to add employee.";
        }
      } catch (err) {
        const msgDiv = document.getElementById("addEmployeeMsg");
        msgDiv.style.color = "red";
        msgDiv.textContent = "Error submitting form. Please try again.";
      }
    };

    // Add Cancel button logic
    document.querySelector(".cancel-btn").onclick = function () {
      document.getElementById("addEmployeeForm").reset();
    };

    // Add this function after the loadAddEmployee function
    function removeImage() {
      const preview = document.getElementById("imagePreview");
      const fileInput = document.getElementById("profileImage");
      preview.style.display = "none";
      fileInput.value = "";
    }

    // Add this event listener in the loadAddEmployee function after the form submission handler
    document.getElementById("profileImage").addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const preview = document.getElementById("imagePreview");
          const previewImg = document.getElementById("previewImg");
          previewImg.src = e.target.result;
          preview.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });

    setLogoutListener();
    injectProfileSidebar();
  }

  // Load Stats (Employee Stats Section)
  async function loadStats() {
    // Security check - only admin and HR roles can access stats
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can view statistics.");
      return;
    }
    setActive("btn-stats");
    mainContent.innerHTML = `
      <div class="admin-content-section" id="employee-stats-section" style="max-width:900px",width:100vw;">
        <h2>Employee Stats</h2>
        <div class="scrollable-form-container">
          <form id="employeeSearchForm" class="section-form" style="max-width: 900px; margin: 0 auto;">
            <div class="form-row">
              <div class="form-group">
                <label for="searchEmployeeName">Search by Name</label>
                <input type="text" id="searchEmployeeName" placeholder="Type employee name..." autocomplete="off" />
                <div id="nameSearchDropdown" class="search-dropdown" style="position:relative;"></div>
              </div>
              <div class="form-group">
                <label for="searchEmployeeId">Search by Employee ID</label>
                <input type="text" id="searchEmployeeId" placeholder="Enter Employee ID" required />
              </div>
            </div>
          </form>
          <div id="employeeStatsResult" style="margin-top: 2rem;width:800px;"></div>
        </div>
      </div>
    `;
    attachStatsNameSearch();

    const searchInput = document.getElementById("searchEmployeeId");
    const resultDiv = document.getElementById("employeeStatsResult");

    async function fetchEmployeeDetails(employeeId) {
      if (!employeeId) {
        resultDiv.innerHTML = "";
        return;
      }
      resultDiv.innerHTML = '<div class="loading">Searching...</div>';
      try {
        const token = localStorage.getItem("jwtToken");
        // Only use /api/employees, filter on frontend
        const res = await fetch(`/api/employees`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.employees)) {
          const found = data.employees.find(
            (emp) => emp.employeeId && emp.employeeId.toLowerCase() === employeeId.toLowerCase()
          );
          if (found) {
            const imgSrc =
              found.profileImage && found._id
                ? `/api/employees/${found._id}/profile-image`
                : "images/default-avatar.png";
            resultDiv.innerHTML = `
              <div class="employee-card" style="background:rgba(255,255,255,0.13);border-radius:16px;padding:2rem;box-shadow:0 2px 8px rgba(67,206,162,0.10);max-width:900px;margin:0 auto;display:flex;gap:2rem;align-items:center;">
                <img id="empProfileImg" src="${imgSrc}" alt="${
              found.firstName || found.name || ""
            }" style="width:90px;height:90px;border-radius:12px;object-fit:cover;border:2px solid #764ba2;box-shadow:0 2px 8px rgba(118,75,162,0.10);background:#fff;">
                <div style="flex:1;">
                  <h3 style="margin-bottom:0.5rem;color:#764ba2;">${
                    found.firstName || found.name || ""
                  } ${found.lastName || ""}</h3>
                  <p><strong>Employee ID:</strong> ${found.employeeId}</p>
                  <p><strong>Role:</strong> ${found.role}</p>
                  <p><strong>Email:</strong> ${found.email || "-"}</p>
                  <p><strong>Mobile:</strong> ${found.mobile || "-"}</p>
                  <p><strong>Date of Joining:</strong> ${
                    found.doj ? new Date(found.doj).toLocaleDateString() : "-"
                  }</p>
                  <p><strong>Address:</strong> ${found.address || "-"}</p>
                  <p><strong>ID Card:</strong> ${
                    found.idCardType ? found.idCardType.toUpperCase() : "-"
                  } ${found.idCardNumber || ""}</p>
                </div>
              </div>
            `;
            const img = document.getElementById("empProfileImg");
            if (img) {
              img.onerror = function () {
                this.onerror = null;
                this.src = "/images/logo.png";
              };
            }
          } else {
            resultDiv.innerHTML =
              '<div class="error" style="color:#dc3545;font-weight:bold;">No employee found with this ID.</div>';
          }
        } else {
          resultDiv.innerHTML =
            '<div class="error" style="color:#dc3545;font-weight:bold;">Failed to fetch employee data.</div>';
        }
      } catch (err) {
        resultDiv.innerHTML =
          '<div class="error" style="color:#dc3545;font-weight:bold;">Error searching employee.</div>';
      }
    }

    // Search on input (debounced)
    let debounceTimeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimeout);
      const value = this.value.trim();
      if (!value) {
        resultDiv.innerHTML = "";
        return;
      }
      debounceTimeout = setTimeout(() => {
        fetchEmployeeDetails(value);
      }, 400);
    });

    setLogoutListener();
    injectProfileSidebar();
  }

  // Logout logic
  function setLogoutListener() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem("employee");
        localStorage.removeItem("jwtToken");
        window.location.href = "login.html";
      };
    }
  }

  // Add event listeners for all buttons
  document.getElementById("btn-leave").addEventListener("click", () => {
    setActive("btn-leave");
    loadLeaveRequest();
  });

  document.getElementById("btn-attendance").addEventListener("click", () => {
    setActive("btn-attendance");
    loadAttendance();
  });

  // My Dashboard button event
  document.getElementById("btn-dashboard").addEventListener("click", () => {
    setActive("btn-dashboard");
    loadDashboard();
  });

  // Social media - only for admin and HR roles
  if (isAdminRole || isHRRole) {
    document.getElementById("btn-social").addEventListener("click", loadSocialMedia);
  }

  // Add employee - for admin and HR roles
  if (isAdminRole || isHRRole) {
    document.getElementById("btn-add-employee").addEventListener("click", loadAddEmployee);
  }

  // Manage employee account - for admin and HR roles
  if (isAdminRole || isHRRole) {
    document.getElementById("btn-manage-employee").addEventListener("click", loadManageEmployee);
  }

  // Stats - only for admin and HR roles
  if (isAdminRole || isHRRole) {
    document.getElementById("btn-stats").addEventListener("click", loadStats);
  }

  // Pay slip - for admin and HR roles
  if (isAdminRole || isHRRole) {
    document.getElementById("btn-pay-slip").addEventListener("click", loadPaySlipAdmin);
  }

  // Leave approval - for admin and HR roles
  if (isAdminRole || isHRRole) {
    const leaveApprovalBtn = document.getElementById("btn-leave-approval");
    if (leaveApprovalBtn) {
      leaveApprovalBtn.addEventListener("click", loadLeaveApproval);
    }
  }

  // Load default section
  loadDashboard();

  // Responsive styles
  const formRow = document.querySelector(".form-row");
  if (formRow) {
    const formGroups = formRow.querySelectorAll(".form-group");
    if (formGroups.length > 2) {
      formRow.style.flexWrap = "wrap";
      formRow.style.gap = "15px";
    }
  }

  const formGroups = document.querySelectorAll(".form-group");
  formGroups.forEach((group) => {
    if (group.style.flex === "1") {
      group.style.minWidth = "250px";
    }
  });

  const formRowEnd = document.querySelector('.form-row[style*="justify-content: flex-end"]');
  if (formRowEnd) {
    formRowEnd.style.justifyContent = "center";
    formRowEnd.style.gap = "1rem";
  }

  const cancelBtn = document.getElementById("cancelLeaveBtn");
  if (cancelBtn) {
    cancelBtn.style.minWidth = "120px";
  }

  const loginBtn = document.querySelector(".login-btn");
  if (loginBtn) {
    loginBtn.style.minWidth = "120px";
  }

  const adminContentSection = document.querySelector(".admin-content-section");
  if (adminContentSection) {
    const styles = window.getComputedStyle(adminContentSection);
    if (styles.padding.split(" ").some((p) => p.includes("px"))) {
      adminContentSection.style.padding = "15px";
    }
  }

  formGroups.forEach((group) => {
    if (group.style.marginBottom) {
      group.style.marginBottom = "10px";
    }
  });

  const labels = document.querySelectorAll(".form-group label");
  labels.forEach((label) => {
    if (label.style.fontSize) {
      label.style.fontSize = "14px";
    }
  });

  const selects = document.querySelectorAll(".form-group select");
  const inputs = document.querySelectorAll(".form-group input");
  const textareas = document.querySelectorAll(".form-group textarea");
  selects.forEach((select) => {
    if (select.style.padding) {
      select.style.padding = "10px";
    }
  });
  inputs.forEach((input) => {
    if (input.style.padding) {
      input.style.padding = "10px";
    }
  });
  textareas.forEach((textarea) => {
    if (textarea.style.padding) {
      textarea.style.padding = "10px";
    }
  });

  // Load Leave Approval Page (Admin Only)
  async function loadLeaveApproval() {
    // Security check - only admin and HR roles can approve leaves
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can approve leave requests.");
      return;
    }
    setActive("btn-leave-approval");
    mainContent.innerHTML = `
      <div class="admin-content-section leave-approval-section" id="leave-approval-section">
        <h2 style="align-self: flex-start; margin-bottom: 1.5rem;">Leave Approval Requests</h2>
        <div class="leave-requests-container">
          <div class="filters">
            <select id="statusFilter" class="filter-select">
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input type="text" id="employeeFilter" class="filter-input" placeholder="Search by Employee ID or Name">
          </div>
          <div class="leave-requests-table">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Reason</th>
                  <th>Leave Count</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="leaveRequestsBody">
                <tr>
                  <td colspan="8" class="loading">Loading leave requests...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Add styles for the leave approval page
    const style = document.createElement("style");
    style.setAttribute("data-leave-approval-style", "");
    style.textContent = `
      .leave-approval-section {
        background: transparent !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        border: none !important;
        width: 100%;
        max-width: 1200px;
        padding: 0;
      }
      .leave-requests-container {
        background: #ede8f7;
        border-radius: 12px;
        padding: 24px;
        width: 100%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }
      .filters {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .filter-select, .filter-input {
        padding: 0.75rem 1rem;
        border: 1px solid #d1c5e8;
        border-radius: 8px;
        background: #fff;
        font-size: 1rem;
        color: #333;
      }
      .filter-input {
        flex-grow: 1;
        max-width: 350px;
      }
      .leave-requests-table {
        width: 100%;
        overflow-x: auto;
        max-height: 60vh;
        overflow-y: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 1rem 1.25rem;
        text-align: left;
        border-bottom: 1px solid #d1c5e8;
        color: #3a2c5c;
      }
      th {
        background: #dcd3f0;
        font-weight: 600;
      }
      tbody tr {
        background-color: #f7f3ff;
      }
      tbody tr:hover {
        background: #f0ebf9;
      }
      .status-badge {
        padding: 0.35rem 0.85rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        border: 1px solid transparent;
      }
      .status-pending {
        background: #fff3cd;
        color: #664d03;
        border-color: #ffecb5;
      }
      .status-approved {
        background: #d1e7dd;
        color: #0f5132;
        border-color: #badbcc;
      }
      .status-rejected {
        background: #f8d7da;
        color: #58151c;
        border-color: #f1c2c7;
      }
      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }
      .approve-btn, .reject-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .approve-btn {
        background: #198754;
        color: white;
      }
      .reject-btn {
        background: #dc3545;
        color: white;
      }
      .approve-btn:hover {
        background: #157347;
      }
      .reject-btn:hover {
        background: #bb2d3b;
      }
      .loading {
        text-align: center;
        padding: 2rem;
        color: #666;
      }
      h2 {
        color: #fff;
      }
    `;
    document.head.appendChild(style);

    // Load leave requests
    try {
      const res = await fetch("/api/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        console.log("Leave requests data:", data);
        displayLeaveRequests(data.leaveRequests);
      } else {
        document.getElementById("leaveRequestsBody").innerHTML = `
          <tr>
            <td colspan="8" class="error">Failed to load leave requests</td>
          </tr>
        `;
      }
    } catch (err) {
      document.getElementById("leaveRequestsBody").innerHTML = `
        <tr>
          <td colspan="8" class="error">Error loading leave requests</td>
        </tr>
      `;
    }

    // Add event listeners for filters
    document.getElementById("statusFilter").addEventListener("change", filterLeaveRequests);
    document.getElementById("employeeFilter").addEventListener("input", filterLeaveRequests);

    setLogoutListener();
    injectProfileSidebar();
    loadRecentNotices();
  }

  // Function to display leave requests
  function displayLeaveRequests(requests) {
    const tbody = document.getElementById("leaveRequestsBody");
    if (requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="no-data">No leave requests found</td>
        </tr>
      `;
      return;
    }
    const groups = groupLeaveRequestsByOriginal(requests);
    tbody.innerHTML = groups
      .map((group) => {
        const isMulti = group._group.length > 1;
        const main = group._group[0];
        return `
        <tr data-id="${main._id}" data-status="${main.status}">
          <td>${main.employeeId}</td>
          <td>${main.name}</td>
          <td>${main.reason}</td>
          <td>${main.leaveCount}</td>
          <td>${new Date(main.fromDate).toLocaleDateString()}</td>
          <td>${new Date(main.toDate).toLocaleDateString()}</td>
          <td>
            <span class="status-badge status-${main.status.toLowerCase()}">
              ${main.status}
            </span>
          </td>
          <td class="action-buttons">
            ${
              main.status === "Pending"
                ? `
              <button class="approve-btn" onclick="approveLeaveRequest('${main._id}')">
                Approve
              </button>
              <button class="reject-btn" onclick="rejectLeaveRequest('${main._id}')">
                Reject
              </button>
            `
                : ""
            }
            ${
              isMulti
                ? `<button class="expand-breakdown-btn" onclick="toggleBreakdown(this)">Breakdown</button>`
                : ""
            }
          </td>
        </tr>
        ${
          isMulti
            ? `
          <tr class="breakdown-row" style="display:none;"><td colspan="8">
            <div class="breakdown-section">
              <strong>Month-wise Breakdown:</strong>
              <ul style="margin:0.5em 0 0 1.5em;">
                ${group._group
                  .map(
                    (seg) => `
                  <li>
                    <b>${new Date(seg.fromDate).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}:</b>
                    ${seg.leaveCount} day(s) — Paid: ${seg.paidLeaves}, Unpaid: ${seg.unpaidLeaves}
                    <span style="color:#888;font-size:0.95em;">(${new Date(
                      seg.fromDate
                    ).toLocaleDateString()} to ${new Date(seg.toDate).toLocaleDateString()})</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          </td></tr>
        `
            : ""
        }
      `;
      })
      .join("");
  }

  // Function to filter leave requests
  function filterLeaveRequests() {
    const statusFilter = document.getElementById("statusFilter").value;
    const employeeFilter = document.getElementById("employeeFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#leaveRequestsBody tr");

    rows.forEach((row) => {
      if (row.classList.contains("no-data") || row.classList.contains("error")) return;

      const status = row.dataset.status;
      const employeeId = row.cells[0].textContent.toLowerCase();
      const employeeName = row.cells[1].textContent.toLowerCase();

      const statusMatch = statusFilter === "all" || status === statusFilter;
      const employeeMatch =
        !employeeFilter ||
        employeeId.includes(employeeFilter) ||
        employeeName.includes(employeeFilter);

      row.style.display = statusMatch && employeeMatch ? "" : "none";
    });
  }

  function createEmployeeRow(employee) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="employee-info">
          <img src="${
            employee.profileImage
              ? `/api/employees/${employee._id}/profile-image`
              : "images/default-avatar.png"
          }" 
               alt="${employee.firstName}" 
               class="employee-avatar">
          <div>
            <div class="employee-name">${employee.firstName} ${employee.lastName}</div>
            <div class="employee-id">${employee.employeeId}</div>
          </div>
        </div>
      </td>
      <td>${employee.role}</td>
      <td>${employee.mobile}</td>
      <td>${employee.email}</td>
      <td>${new Date(employee.doj).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          <button onclick="editEmployee('${employee._id}')" class="edit-btn">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteEmployee('${employee._id}')" class="delete-btn">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    return row;
  }

  function loadPaySlipAdmin() {
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can generate pay slips.");
      return;
    }

    setActive("btn-pay-slip");
    mainContent.innerHTML = `
      <div class="pay-slip-outer" id="paySlipOuter">
        <div class="admin-content-section pay-slip-section" id="pay-slip-admin-section">
          <div class="scrollable-form-container">
            <div class="pay-slip-container">
              <h2>Pay Slip Generation</h2>
              <form id="paySlipForm">
                <div class="form-group">
                  <label for="empId">Employee ID</label>
                  <input type="text" id="empId" placeholder="Enter Employee ID" required />
                </div>
                <div class="form-group">
                  <label for="month">Month</label>
                  <select id="month" required>
                    <option value="">Select Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="year">Year</label>
                  <input type="number" id="year" placeholder="Enter Year" min="2000" max="2100" required />
                </div>
                <hr />
                <div class="form-group">
                  <label for="basic">Basic Salary</label>
                  <input type="number" id="basic" placeholder="Enter Basic Salary" />
                </div>
                <div class="form-group">
                  <label for="hra">HRA</label>
                  <input type="number" id="hra" placeholder="Enter HRA" />
                </div>
                <div class="form-group">
                  <label for="allowance">Special Allowance</label>
                  <input type="number" id="allowance" placeholder="Enter Special Allowance" />
                </div>
                <div class="form-group">
                  <label for="deductions">Deductions</label>
                  <input type="number" id="deductions" placeholder="Enter Deductions" />
                </div>
                <div class="form-group">
                  <label for="netSalary">Net Salary</label>
                  <input type="text" id="netSalary" placeholder="Net Salary" readonly />
                </div>
                <div class="button-group">
                  <button type="button" class="cancel-btn" onclick="clearForm()">Cancel</button>
                  <button type="submit" class="generate-btn">Generate Pay Slip</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .pay-slip-container {
        background: linear-gradient(135deg, #c0b8f0, #dfc8f7);
        padding: 30px;
        border-radius: 15px;
        width: 500px;
        margin: 40px auto;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        color: #333;
      }

      .pay-slip-container h2 {
        font-size: 22px;
        margin-bottom: 20px;
        color: #000;
      }

      .form-group {
        margin-bottom: 15px;
      }

      .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 5px;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: none;
        border-radius: 10px;
        background: #f4f4fc;
        outline: none;
        font-size: 15px;
      }

      hr {
        margin: 25px 0;
        border: 0;
        border-top: 1px solid #b3a9e4;
      }

      .button-group {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }

      .cancel-btn,
      .generate-btn {
        padding: 10px 20px;
        font-weight: bold;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
      }

      .cancel-btn {
        background-color: #f3eaff;
        color: #7a42f4;
      }

      .generate-btn {
        background: linear-gradient(90deg, #6f42c1, #4dd0a9);
        color: white;
      }

      .form-group input[readonly] {
        background-color: #e4e4fa;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    // const inputs = ["basic", "hra", "allowance", "deductions"];
    // inputs.forEach((id) => {
    //   document.getElementById(id).addEventListener("input", calculateNet);
    // });

    // Add functions
    window.calculateNet = function () {
      const basic = parseFloat(document.getElementById("basic").value) || 0;
      const hra = parseFloat(document.getElementById("hra").value) || 0;
      const allowance = parseFloat(document.getElementById("allowance").value) || 0;
      const deductions = parseFloat(document.getElementById("deductions").value) || 0;
      const net = basic + hra + allowance - deductions;
      document.getElementById("netSalary").value = net.toFixed(2);
    };
    const inputs = ["basic", "hra", "allowance", "deductions"];
    inputs.forEach((id) => {
      document.getElementById(id).addEventListener("input", calculateNet);
    });
    window.clearForm = function () {
      document.querySelectorAll("input, select").forEach((el) => (el.value = ""));
    };

    // Add form submission handler
    document.getElementById("paySlipForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = {
        employeeId: document.getElementById("empId").value,
        month: document.getElementById("month").value,
        year: document.getElementById("year").value,
        basicSalary: parseFloat(document.getElementById("basic").value) || 0,
        hra: parseFloat(document.getElementById("hra").value) || 0,
        specialAllowance: parseFloat(document.getElementById("allowance").value) || 0,
        deductions: parseFloat(document.getElementById("deductions").value) || 0,
        netSalary: parseFloat(document.getElementById("netSalary").value) || 0,
      };

      try {
        const response = await fetch("/api/pay-slip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (response.ok) {
          alert("Pay Slip Generated Successfully!");
          clearForm();
        } else {
          alert(data.message || "Failed to generate pay slip");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
      }
    });

    setLogoutListener();
    injectProfileSidebar();
  }

  async function loadAttendance() {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      window.location.href = "/login.html";
      return;
    }

    try {
      // Get user role from token
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userRole = payload.role;
      const employee = JSON.parse(localStorage.getItem("employee"));
      // Allow all roles to access attendance section
      // No role restriction needed as all employees should be able to mark attendance

      mainContent.innerHTML = `
            <div class="attendance-container scrollable-form-container">
                <h2>My Attendance</h2>
                <div class="timestamp-box" id="timestamp"></div>
                <div class="attendance-form">
                    <!-- Check-In -->
                    <div class="form-section">
                        <h3>Log-In</h3>
                        <input type="text" id="checkinTime" placeholder="Click to record" readonly />
                        <button id="checkinBtn">Submit Log-In</button>
                    </div>
                    <!-- Check-Out -->
                    <div class="form-section">
                        <h3>Log-Out</h3>
                        <input type="text" id="checkoutTime" placeholder="Click to record" readonly />
                        <button id="checkoutBtn">Submit Log-Out</button>
                    </div>
                </div>
                <div style="margin: 1rem 0; text-align: right;">
                  <span id="lateCountDisplay" style="font-weight:bold;color:#ffeb3b;"></span>
                </div>
                <div style="text-align:center;">
                  <button id="finalSubmitBtn" style="display:none;min-width:160px;padding:10px 24px;font-size:1rem;border-radius:10px;background:linear-gradient(90deg,#764ba2,#43cea2);color:#fff;font-weight:bold;border:none;cursor:pointer;">Submit</button>
                </div>
                <!-- Attendance Table -->
                <table class="attendance-table" id="attendanceTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Log-In</th>
                            <th>Log-Out</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceBody">
                        <!-- Rows will be added dynamically -->
                    </tbody>
                </table>
            </div>
        `;

      // Add styles for the attendance section
      const style = document.createElement("style");
      style.textContent = `
            .attendance-container {
                background: linear-gradient(135deg, #b79df5, #d3b4f9);
                padding: 30px;
                border-radius: 15px;
                width: 90%;
                max-width: 950px;
                margin: 40px auto;
                box-shadow: 0 0 20px rgba(0,0,0,0.2);
            }

            .attendance-form {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                justify-content: center;
                margin-bottom: 40px;
            }

            .form-section {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 15px;
                flex: 1 1 300px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .form-section h3 {
                margin-bottom: 15px;
                font-size: 18px;
                color: #fff;
            }

            .form-section input[type="text"] {
                padding: 10px 15px;
                border: none;
                border-radius: 10px;
                width: 100%;
                font-size: 15px;
                background: #e8dbff;
                color: #333;
                margin-bottom: 15px;
                text-align: center;
            }

            .form-section button {
                background: linear-gradient(to right, #8c6ce7, #4fd1c5);
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                cursor: pointer;
                transition: 0.3s ease;
                width: 100%;
            }

            .form-section button:hover {
                opacity: 0.9;
            }

            .timestamp-box {
                text-align: center;
                margin-bottom: 25px;
                font-size: 16px;
                font-weight: bold;
                color: #fff;
            }

            .attendance-table {
                width: 100%;
                border-collapse: collapse;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
            }

            .attendance-table th,
            .attendance-table td {
                padding: 14px 16px;
                text-align: center;
                font-size: 15px;
                color: #fff;
            }

            .attendance-table thead {
                background-color: rgba(100, 65, 165, 0.8);
            }

            .attendance-table tbody tr:nth-child(even) {
                background-color: rgba(255, 255, 255, 0.1);
            }

            .attendance-table tbody tr:hover {
                background-color: rgba(255, 255, 255, 0.2);
                transition: 0.3s;
            }

            @media screen and (max-width: 768px) {
                .attendance-form {
                    flex-direction: column;
                }
            }

            @media screen and (max-width: 600px) {
                .attendance-table thead {
                    display: none;
                }

                .attendance-table,
                .attendance-table tbody,
                .attendance-table tr,
                .attendance-table td {
                    display: block;
                    width: 100%;
                }

                .attendance-table tr {
                    margin-bottom: 15px;
                    border-radius: 10px;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .attendance-table td {
                    text-align: right;
                    position: relative;
                    padding-left: 50%;
                }

                .attendance-table td::before {
                    content: attr(data-label);
                    position: absolute;
                    left: 15px;
                    width: 45%;
                    text-align: left;
                    font-weight: bold;
                }
            }
        `;
      document.head.appendChild(style);

      // Initialize attendance functionality
      let checkInRecorded = false;
      let checkOutRecorded = false;
      let checkInTime = "";
      let checkOutTime = "";
      let lateEntry = false;
      let lateCount = 0;
      const checkinInput = document.getElementById("checkinTime");
      const checkoutInput = document.getElementById("checkoutTime");
      const checkinBtn = document.getElementById("checkinBtn");
      const checkoutBtn = document.getElementById("checkoutBtn");
      const finalSubmitBtn = document.getElementById("finalSubmitBtn");
      const lateCountDisplay = document.getElementById("lateCountDisplay");

      // Helper to get current time in HH:mm format
      function getCurrentTime24() {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
      }
      function getCurrentTime12() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      function getCurrentDateISO() {
        const now = new Date();
        return now.toISOString().slice(0, 10);
      }

      // --- Button logic ---
      checkinBtn.onclick = function () {
        if (checkinInput.value) return;
        const time24 = getCurrentTime24();
        const time12 = getCurrentTime12();
        checkinInput.value = time12;
        // Store in localStorage
        localStorage.setItem(ATTENDANCE_CHECKIN_KEY, time24);
        localStorage.setItem(ATTENDANCE_DATE_KEY, getCurrentDateISO());
        // Enable checkout
          checkoutBtn.disabled = false;
          checkoutInput.disabled = false;
        // Update table
          addOrUpdateTodayRow({
            date: getCurrentDateISO(),
          checkIn: time12,
          checkOut: checkoutInput.value || '-',
          status: 'Pending',
        });
      };

      checkoutBtn.onclick = function () {
        if (!checkinInput.value || checkoutInput.value) return;
        const time24 = getCurrentTime24();
        const time12 = getCurrentTime12();
        checkoutInput.value = time12;
        // Store in localStorage
        localStorage.setItem(ATTENDANCE_CHECKOUT_KEY, time24);
        // Enable submit
        finalSubmitBtn.style.display = '';
        // Update table
        addOrUpdateTodayRow({
          date: getCurrentDateISO(),
          checkIn: checkinInput.value,
          checkOut: time12,
          status: 'Pending',
        });
      };

      finalSubmitBtn.onclick = async function () {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          window.location.href = "/login.html";
          return;
        }
        const checkIn = localStorage.getItem(ATTENDANCE_CHECKIN_KEY);
        const checkOut = localStorage.getItem(ATTENDANCE_CHECKOUT_KEY);
        const date = localStorage.getItem(ATTENDANCE_DATE_KEY);
        if (!checkIn || !checkOut || !date) return;
        // Call backend with both times
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId: employee.employeeId,
            employeeName: employee.firstName + ' ' + (employee.lastName || ''),
            date,
            checkIn,
            checkOut,
          }),
        });
        const data = await res.json();
        if (data.alreadySubmitted) {
          alert(data.message || 'You have already logged in and logged out today. You can\'t log in or log out again until 12 AM (midnight).');
          // Clear the check-in and check-out input fields and hide the submit button
          checkinInput.value = '';
          checkoutInput.value = '';
          finalSubmitBtn.style.display = 'none';
          localStorage.removeItem(ATTENDANCE_CHECKIN_KEY);
          localStorage.removeItem(ATTENDANCE_CHECKOUT_KEY);
          localStorage.removeItem(ATTENDANCE_DATE_KEY);
          return;
        }
        if (data.success) {
          // Clear localStorage
          localStorage.removeItem(ATTENDANCE_CHECKIN_KEY);
          localStorage.removeItem(ATTENDANCE_CHECKOUT_KEY);
          localStorage.removeItem(ATTENDANCE_DATE_KEY);
          checkinInput.value = '';
          checkoutInput.value = '';
          finalSubmitBtn.style.display = 'none';
          // Reload table
              loadAttendanceTable();
          // Show late count and early checkout count
          lateCountDisplay.textContent = `Late Count (This Month): ${data.lateCount || 0}`;
            let elCountSpan = document.getElementById("earlyCheckoutCountDisplay");
            if (!elCountSpan) {
              elCountSpan = document.createElement("span");
              elCountSpan.id = "earlyCheckoutCountDisplay";
              elCountSpan.style = "font-weight:bold;color:#ff9800;margin-left:1.5rem;";
              lateCountDisplay.parentNode.appendChild(elCountSpan);
            }
            elCountSpan.textContent = `Early Logout (This Month): ${data.earlyCheckoutCount || 0}`;
          } else {
          alert(data.message || 'Attendance submit failed');
        }
      };

      // On section load, restore state
      const savedDate = localStorage.getItem(ATTENDANCE_DATE_KEY);
      const todayISO = getCurrentDateISO();
      if (savedDate === todayISO) {
        const savedCheckIn = localStorage.getItem(ATTENDANCE_CHECKIN_KEY);
        const savedCheckOut = localStorage.getItem(ATTENDANCE_CHECKOUT_KEY);
        if (savedCheckIn) {
          checkinInput.value = new Date(todayISO + 'T' + savedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          checkoutBtn.disabled = false;
          checkoutInput.disabled = false;
        }
        if (savedCheckOut) {
          checkoutInput.value = new Date(todayISO + 'T' + savedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          finalSubmitBtn.style.display = '';
        }
        // Show in table
          addOrUpdateTodayRow({
          date: todayISO,
          checkIn: checkinInput.value || '-',
          checkOut: checkoutInput.value || '-',
          status: 'Pending',
        });
      }

      // --- Table logic ---
      function addOrUpdateTodayRow({ date, checkIn, checkOut, status }) {
        let row = document.getElementById("todayRow");
        if (!row) {
          row = document.createElement("tr");
          row.id = "todayRow";
          document.getElementById("attendanceBody").prepend(row);
        }
        row.innerHTML = `
            <td data-label="Date">${date}</td>
            <td data-label="Check-In">${checkIn}</td>
            <td data-label="Check-Out">${checkOut}</td>
            <td data-label="Status">${status}</td>
          `;
      }

      async function loadAttendanceTable() {
        // Fetch this month's attendance
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const res = await fetch(
          `/api/attendance-summary?employeeId=${employee.employeeId}&month=${month}&year=${year}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        const tbody = document.getElementById("attendanceBody");
        tbody.innerHTML = "";
        if (data.success && data.days) {
          data.days.forEach((day) => {
            // Parse check-in/check-out as IST
            let checkInDisplay = "-";
            let checkOutDisplay = "-";
            if (day.checkIn) {
              // Compose ISO string for the day in IST
              const checkInDate = new Date(day.date + 'T' + day.checkIn);
              checkInDisplay = checkInDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
              if (day.lateEntry) checkInDisplay += " (L)";
            }
            if (day.checkOut) {
              const checkOutDate = new Date(day.date + 'T' + day.checkOut);
              checkOutDisplay = checkOutDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
              if (day.earlyCheckout) checkOutDisplay += " (EC)";
            }
            tbody.innerHTML += `
                <tr>
                  <td data-label="Date">${day.date}</td>
                  <td data-label="Log-In">${checkInDisplay}</td>
                  <td data-label="Log-Out">${checkOutDisplay}</td>
                  <td data-label="Status">${day.attendanceStatus}</td>
                </tr>
              `;
          });
        }
      }

      // Initial table load
      loadAttendanceTable();

      // Timestamp
      function updateTimestamp() {
        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
        const dateStr = now.toLocaleDateString(undefined, options);
        const timeStr = now.toLocaleTimeString();
        const ts = document.getElementById("timestamp");
        if (ts) ts.innerText = `Today: ${dateStr}, ${timeStr}`;
      }
      updateTimestamp();
      setInterval(updateTimestamp, 1000);

      injectProfileSidebar();
    } catch (error) {
      console.error("Error loading attendance:", error);
      mainContent.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>Failed to load attendance section. Please try again later.</p>
            </div>
        `;
    }
  }
});
// Add this to your existing code where you handle the initial page load
// document.addEventListener("DOMContentLoaded", () => {
//   // ... existing code ...
//   const token = localStorage.getItem("jwtToken");
//   if (token) {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     const userRole = payload.role;

//     // Show/hide buttons based on role
//     document.getElementById("btn-attendance").style.display =
//       userRole === "hr" || userRole === "junior_writer" || userRole === "bdm" || userRole === "team_lead" ? "block" : "none";
//   }
//   // ... existing code ...
// });

const hamburger = document.getElementById("hamburgerToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

if (hamburger && sidebar && sidebarOverlay) {
  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("show");
    sidebarOverlay.classList.toggle("active");
  });
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("active");
  });
  // Close sidebar on any sidebar button click (mobile only)
  sidebar.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("show");
        sidebarOverlay.classList.remove("active");
      }
    });
  });
}

async function fetchWordCounts(employeeId, month, year) {
  const token = localStorage.getItem("jwtToken");
  const res = await fetch(`/api/word-count?employeeId=${employeeId}&month=${month}&year=${year}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.success ? data.wordCounts : [];
}
async function fetchTodayWordCount(employeeId) {
  const token = localStorage.getItem("jwtToken");
  const res = await fetch(`/api/word-count/today?employeeId=${employeeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.success && data.wordCount ? data.wordCount.wordCount : 0;
}
async function fetchMonthTotalWordCount(employeeId, month, year) {
  const wordCounts = await fetchWordCounts(employeeId, month, year);
  return wordCounts.reduce((sum, wc) => sum + (wc.wordCount || 0), 0);
}
async function loadDashboard() {
  setActive("btn-dashboard");
  const employee = JSON.parse(localStorage.getItem("employee"));
  // --- Month/Year selector logic ---
  const today = new Date();
  let selectedMonth = today.getMonth() + 1;
  let selectedYear = today.getFullYear();
  // Helper to pad month
  const pad = (n) => (n < 10 ? "0" + n : n);
  // Month options
  const monthOptions = Array.from(
    { length: 12 },
    (_, i) =>
      `<option value="${pad(i + 1)}" ${i + 1 === selectedMonth ? "selected" : ""}>${new Date(
        0,
        i
      ).toLocaleString("en-IN", { month: "long" })}</option>`
  ).join("");
  // Year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = today.getFullYear() - i;
    return `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`;
  }).join("");

  // Check if user should see word count sections
  const showWordCount = isRegularEmployee; // Only regular employees see word count

  mainContent.innerHTML = `
      <div class="my-dashboard-modern dashboard-main-section" id="dashboardMainSection">
        <div class="my-dashboard-header">
          <h2>Welcome, <span class="my-dashboard-empname">${employee.firstName} 👋</span></h2>
          <div class="my-dashboard-role">${employee.role}</div>
        </div>
        <div class="my-dashboard-month-selector">
          <label for="myDashboardMonth">Month:</label>
          <select id="myDashboardMonth">${monthOptions}</select>
          <label for="myDashboardYear">Year:</label>
          <select id="myDashboardYear">${yearOptions}</select>
        </div>
        <div class="my-dashboard-summary-cards">
          <div class="my-dashboard-summary-card" id="attendanceCountCard"><div class="count">-</div><div>Attendance</div></div>
          <div class="my-dashboard-summary-card" id="paidLeavesCard"><div class="count">-</div><div>Paid Leaves</div></div>
          <div class="my-dashboard-summary-card" id="unpaidLeavesCard"><div class="count">-</div><div>Unpaid Leaves</div></div>
        </div>
        ${showWordCount ? `
        <div class="my-dashboard-cards" style="display:flex;gap:2rem;align-items:stretch;">
          <div class="my-dashboard-card" style="flex:1;min-width:240px;max-width:370px;">
            <canvas id="performanceChart"></canvas>
            <div class="my-dashboard-card-title">Performance Tracker (Word Count)</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:1.2rem;justify-content:center;min-width:180px;max-width:220px;">
            <div class="my-dashboard-summary-card" id="todayWordCountCard"><div class="count">-</div><div>Today's Word Count</div></div>
            <div class="my-dashboard-summary-card" id="monthWordCountCard"><div class="count">-</div><div>Overall Word Count (Month)</div></div>
          </div>
        </div>
        ` : ''}
        <div class="my-dashboard-calendar-section">
          <div class="my-dashboard-calendar-title">Attendance & Leaves Calendar</div>
          <div class="my-dashboard-two-calendars">
            <div class="my-dashboard-calendar-block">
              <div class="my-dashboard-calendar-label">Attendance</div>
              <div id="myDashboardAttendanceCalendar"></div>
            </div>
            <div class="my-dashboard-calendar-block">
              <div class="my-dashboard-calendar-label">Leaves</div>
              <div id="myDashboardLeavesCalendar"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  // --- Scoped CSS ---
  if (!document.getElementById("myDashboardModernStyle")) {
    const style = document.createElement("style");
    style.id = "myDashboardModernStyle";
    style.textContent = `
        .my-dashboard-modern {
          background: linear-gradient(135deg, #f8fafc 0%, #e0c3fc 100%);
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(67, 206, 162, 0.10), 0 3px 16px rgba(118, 75, 162, 0.10);
          padding: 18px 24px 18px 24px;
          width: 100%;
          max-width: none;
          margin: 0;
          color: #3a2c5c;
          font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
          max-height: 92vh;
          overflow-y: auto;
        }
        .my-dashboard-header { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 18px; }
        .my-dashboard-empname { font-weight: 700; color: #764ba2; }
        .my-dashboard-role { font-size: 1.1rem; color: #43cea2; margin-top: 4px; font-weight: 500; }
        .my-dashboard-month-selector { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 18px; }
        .my-dashboard-month-selector label { font-weight: 500; color: #764ba2; }
        .my-dashboard-month-selector select { padding: 4px 10px; border-radius: 8px; border: 1px solid #d1c5e8; background: #fff; color: #3a2c5c; font-size: 1rem; }
        .my-dashboard-summary-cards { display: flex; gap: 1.5rem; margin-bottom: 18px; }
        .my-dashboard-summary-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(67, 206, 162, 0.08); padding: 18px 18px 10px 18px; min-width: 120px; text-align: center; flex: 1 1 120px; }
        .my-dashboard-summary-card .count { font-size: 2.1rem; font-weight: bold; color: #764ba2; margin-bottom: 4px; }
        .my-dashboard-cards { display: flex; flex-wrap: wrap; gap: 2rem; margin-bottom: 18px; }
        .my-dashboard-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(67, 206, 162, 0.08); padding: 18px 10px 10px 10px; flex: 1 1 320px; min-width: 240px; max-width: 370px; display: flex; flex-direction: column; align-items: center; max-height: 320px; overflow: hidden; }
        .my-dashboard-card canvas { width: 100% !important; height: 220px !important; max-height: 220px !important; min-height: 180px; display: block; }
        .my-dashboard-card-title { margin-top: 10px; font-size: 1.08rem; color: #764ba2; font-weight: 600; text-align: center; }
        .my-dashboard-calendar-section { margin-top: 18px; background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(67, 206, 162, 0.08); padding: 18px 10px 10px 10px; }
        .my-dashboard-calendar-title { font-size: 1.15rem; color: #764ba2; font-weight: 600; margin-bottom: 12px; }
        .my-dashboard-two-calendars { display: flex; gap: 2rem; flex-wrap: wrap; }
        .my-dashboard-calendar-block { flex: 1 1 320px; min-width: 220px; }
        .my-dashboard-calendar-label { font-weight: 600; color: #43cea2; margin-bottom: 6px; text-align: center; }
        #myDashboardAttendanceCalendar, #myDashboardLeavesCalendar { min-height: 220px; }
        @media (max-width: 900px) { .my-dashboard-cards, .my-dashboard-two-calendars { flex-direction: column; gap: 1.2rem; } }
        @media (max-width: 600px) { .my-dashboard-modern { padding: 10px 2vw; } .my-dashboard-card { min-width: 0; padding: 8px 2px 6px 2px; max-height: 260px; } .my-dashboard-card canvas { height: 150px !important; max-height: 150px !important; min-height: 120px; } }
        .my-dashboard-calendar-flex { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
        .my-dashboard-calendar-day { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.98rem; background: #e0c3fc; color: #3a2c5c; cursor: pointer; transition: 0.2s; }
        .my-dashboard-calendar-day.present { background: #43cea2; color: #fff; font-weight: bold; }
        .my-dashboard-calendar-day.absent { background: #ff758c; color: #fff; font-weight: bold; }
        .my-dashboard-calendar-day.leave-paid { background: #764ba2; color: #fff; font-weight: bold; }
        .my-dashboard-calendar-day.leave-unpaid { background: #ffb347; color: #fff; font-weight: bold; }
        .my-dashboard-calendar-day:hover { box-shadow: 0 2px 8px rgba(67,206,162,0.13); transform: scale(1.08); }
      `;
    document.head.appendChild(style);
  }
  // --- Fetch attendance/leave summary from API ---
  async function fetchSummary(month, year) {
    const res = await fetch(
      `/api/attendance-summary?employeeId=${employee.employeeId}&month=${pad(month)}&year=${year}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  }
  async function updateDashboard(month, year) {
    // Show loading
    const attendanceCountCard = document.getElementById("attendanceCountCard");
    const paidLeavesCard = document.getElementById("paidLeavesCard");
    const unpaidLeavesCard = document.getElementById("unpaidLeavesCard");
    const attendanceCalendar = document.getElementById("myDashboardAttendanceCalendar");
    const leavesCalendar = document.getElementById("myDashboardLeavesCalendar");
    if (attendanceCountCard && attendanceCountCard.querySelector(".count")) attendanceCountCard.querySelector(".count").textContent = "...";
    if (paidLeavesCard && paidLeavesCard.querySelector(".count")) paidLeavesCard.querySelector(".count").textContent = "...";
    if (unpaidLeavesCard && unpaidLeavesCard.querySelector(".count")) unpaidLeavesCard.querySelector(".count").textContent = "...";
    if (attendanceCalendar) attendanceCalendar.innerHTML = "<div>Loading...</div>";
    if (leavesCalendar) leavesCalendar.innerHTML = "<div>Loading...</div>";
    
    if (showWordCount) {
      const todayWordCountCard = document.getElementById("todayWordCountCard");
      const monthWordCountCard = document.getElementById("monthWordCountCard");
      if (todayWordCountCard && todayWordCountCard.querySelector(".count")) todayWordCountCard.querySelector(".count").textContent = "...";
      if (monthWordCountCard && monthWordCountCard.querySelector(".count")) monthWordCountCard.querySelector(".count").textContent = "...";
    }
    
    // Attendance/leave summary
    const data = await fetchSummary(month, year);
    if (!data || !data.success) {
      if (attendanceCountCard && attendanceCountCard.querySelector(".count")) attendanceCountCard.querySelector(".count").textContent = "-";
      if (paidLeavesCard && paidLeavesCard.querySelector(".count")) paidLeavesCard.querySelector(".count").textContent = "-";
      if (unpaidLeavesCard && unpaidLeavesCard.querySelector(".count")) unpaidLeavesCard.querySelector(".count").textContent = "-";
      if (attendanceCalendar) attendanceCalendar.innerHTML = "<div>No data</div>";
      if (leavesCalendar) leavesCalendar.innerHTML = "<div>No data</div>";
    } else {
      if (attendanceCountCard && attendanceCountCard.querySelector(".count")) attendanceCountCard.querySelector(".count").textContent = data.attendanceCount;
      if (paidLeavesCard && paidLeavesCard.querySelector(".count")) paidLeavesCard.querySelector(".count").textContent = data.paidLeaves;
      if (unpaidLeavesCard && unpaidLeavesCard.querySelector(".count")) unpaidLeavesCard.querySelector(".count").textContent = data.unpaidLeaves;
      if (attendanceCalendar) renderAttendanceCalendar("myDashboardAttendanceCalendar", data.days);
      if (leavesCalendar) renderLeavesCalendar("myDashboardLeavesCalendar", data.days);
    }
    
    // --- Word Count Data (only for regular employees) ---
    if (showWordCount) {
    // 1. Fetch word counts for chart
    const wordCounts = await fetchWordCounts(employee.employeeId, pad(month), year);
    // Build chart data for all days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const chartLabels = [];
    const chartData = [];
    const wordCountMap = {};
    wordCounts.forEach((wc) => {
      const d = new Date(wc.date);
      const key = d.toISOString().slice(0, 10);
      wordCountMap[key] = wc.wordCount;
    });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const key = dateObj.toISOString().slice(0, 10);
      chartLabels.push(dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
      chartData.push(wordCountMap[key] || 0);
    }
    // 2. Render chart
      const perfChartElem = document.getElementById("performanceChart");
      if (perfChartElem && perfChartElem.getContext) {
        const perfCtx = perfChartElem.getContext("2d");
    if (window.performanceChartInstance) window.performanceChartInstance.destroy();
    window.performanceChartInstance = new Chart(perfCtx, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: "Words Written",
            data: chartData,
            borderColor: "#43cea2",
            backgroundColor: "rgba(67,206,162,0.15)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Word Count: ${context.parsed.y}`;
              },
            },
          },
        },
        scales: { y: { beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2.2,
        layout: { padding: 0 },
      },
    });
      }
    // 3. Today's word count
    const todayWordCount = await fetchTodayWordCount(employee.employeeId);
      const todayWordCountCard = document.getElementById("todayWordCountCard");
      if (todayWordCountCard && todayWordCountCard.querySelector(".count"))
        todayWordCountCard.querySelector(".count").textContent = todayWordCount;
    // 4. Month total word count
    const monthTotal = chartData.reduce((sum, v) => sum + v, 0);
      const monthWordCountCard = document.getElementById("monthWordCountCard");
      if (monthWordCountCard && monthWordCountCard.querySelector(".count"))
        monthWordCountCard.querySelector(".count").textContent = monthTotal;
    }
  }
  // --- Calendar rendering ---
  function renderAttendanceCalendar(containerId, days) {
    const container = document.getElementById(containerId);
    if (!container) return; // Prevent error if element is missing
    if (!days || !days.length) {
      container.innerHTML = "<div>No data</div>";
      return;
    }
    let html = '<div class="my-dashboard-calendar-flex">';
    days.forEach((day) => {
      let status = day.attendanceStatus === "Present" ? "present" : "absent";
      html += `<div class="my-dashboard-calendar-day ${status}" title="${day.date}">${parseInt(
        day.date.split("-")[2]
      )}</div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }
  function renderLeavesCalendar(containerId, days) {
    const container = document.getElementById(containerId);
    if (!container) return; // Prevent error if element is missing
    if (!days || !days.length) {
      container.innerHTML = "<div>No data</div>";
      return;
    }
    let html = '<div class="my-dashboard-calendar-flex">';
    days.forEach((day) => {
      let status =
        day.leaveType === "Paid" ? "leave-paid" : day.leaveType === "Unpaid" ? "leave-unpaid" : "";
      html += `<div class="my-dashboard-calendar-day ${status}" title="${day.date}">${parseInt(
        day.date.split("-")[2]
      )}</div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }
  // --- Month/year selector events ---
  document.getElementById("myDashboardMonth").addEventListener("change", (e) => {
    selectedMonth = parseInt(e.target.value);
    updateDashboard(selectedMonth, selectedYear);
  });
  document.getElementById("myDashboardYear").addEventListener("change", (e) => {
    selectedYear = parseInt(e.target.value);
    updateDashboard(selectedMonth, selectedYear);
  });
  // --- Initial load ---
  updateDashboard(selectedMonth, selectedYear);
  setLogoutListener();
  injectProfileSidebar();
  loadRecentNotices();
}

// Add WFH Request Section
function loadWFHRequest() {
  setActive("btn-wfh");
  const employee = JSON.parse(localStorage.getItem("employee"));
  mainContent.innerHTML = `
      <div class="wfh-scroll-wrapper">
        <div class="wfh-card">
          <h2><i class="fas fa-laptop-house"></i> Work From Home Request</h2>
          <div class="form-group">
            <label><i class="fas fa-id-badge"></i> Employee ID:</label>
            <span class="readonly">${employee?.employeeId || ""}</span>
          </div>
          <div class="form-group">
            <label><i class="fas fa-user"></i> Name:</label>
            <span class="readonly">${employee?.name || ""}</span>
          </div>
          <div class="form-group">
            <label><i class="fas fa-briefcase"></i> Designation:</label>
            <span class="readonly">${employee?.role || ""}</span>
          </div>
          <div class="form-group">
            <label for="reason"><i class="fas fa-comment-dots"></i> WFH Reason:</label>
            <textarea id="reason" placeholder="Enter reason for WFH request..."></textarea>
          </div>
          <div class="form-group">
            <label for="additionalReason"><i class="fas fa-info-circle"></i> Additional Details:</label>
            <textarea id="additionalReason" placeholder="Enter any additional details or comments..."></textarea>
          </div>
          <div class="form-group">
            <label for="count"><i class="fas fa-list-ol"></i> Count (Days):</label>
            <input type="number" id="count" placeholder="Enter number of days">
          </div>
          <div class="form-group" id="calendar-container"></div>
          
          <!-- Image Attachment Section -->
          <div class="form-group">
            <label for="attachment"><i class="fas fa-paperclip"></i> Attach Image (Optional):</label>
            <div class="attachment-section">
              <input type="file" id="attachment" accept="image/*" style="display: none;">
              <button type="button" class="attachment-btn" id="attachmentBtn">
                <i class="fas fa-upload"></i> Choose Image
              </button>
              <div class="attachment-preview" id="attachmentPreview" style="display: none;">
                <img id="previewImage" class="preview-image" alt="Preview">
                <button type="button" class="remove-attachment" id="removeAttachment">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Button Group -->
          <div class="button-group" style="display: flex; gap: 15px; margin-top: 20px;">
            <button class="submit-btn" id="wfhSubmitBtn" style="flex: 1;">
              <i class="fas fa-paper-plane"></i> Submit
            </button>
            <button class="cancel-btn" id="wfhCancelBtn" style="flex: 1;">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    `;

  // Calendar logic
  const countInput = document.getElementById("count");
  const calendarContainer = document.getElementById("calendar-container");

  function createDateInput(id, labelText, iconClass) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("form-group");
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.innerHTML = `<i class="${iconClass}"></i> ${labelText}`;
    wrapper.appendChild(label);
    const input = document.createElement("input");
    input.type = "date";
    input.id = id;
    input.name = id;
    wrapper.appendChild(input);
    return wrapper;
  }

  function updateCalendarInputs() {
    const count = parseInt(countInput.value, 10);
    calendarContainer.innerHTML = "";
    if (!isNaN(count)) {
      if (count <= 1) {
        const singleDate = createDateInput("calendar", "Select Date:", "fas fa-calendar-alt");
        calendarContainer.appendChild(singleDate);
      } else {
        const fromDate = createDateInput("fromDate", "From Date:", "fas fa-calendar-day");
        const toDate = createDateInput("toDate", "To Date:", "fas fa-calendar-check");
        calendarContainer.appendChild(fromDate);
        calendarContainer.appendChild(toDate);
      }
    }
  }
  countInput.addEventListener("input", updateCalendarInputs);

  // Attachment functionality
  const attachmentBtn = document.getElementById("attachmentBtn");
  const attachmentInput = document.getElementById("attachment");
  const attachmentPreview = document.getElementById("attachmentPreview");
  const previewImage = document.getElementById("previewImage");
  const removeAttachment = document.getElementById("removeAttachment");

  attachmentBtn.addEventListener("click", () => {
    attachmentInput.click();
  });

  attachmentInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        alert("File size must be less than 1MB");
        attachmentInput.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        attachmentPreview.style.display = "block";
        attachmentBtn.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });

  removeAttachment.addEventListener("click", () => {
    attachmentInput.value = "";
    attachmentPreview.style.display = "none";
    attachmentBtn.style.display = "block";
  });

  // Cancel button functionality
  const cancelBtn = document.getElementById("wfhCancelBtn");
  cancelBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to cancel? All entered data will be lost.")) {
      loadDashboard(); // Return to dashboard
    }
  });

  // Submit functionality
  const submitBtn = document.getElementById("wfhSubmitBtn");
  submitBtn.addEventListener("click", async () => {
    try {
      // Get form data
      const reason = document.getElementById("reason").value.trim();
      const additionalReason = document.getElementById("additionalReason").value.trim();
      const count = document.getElementById("count").value;
      const attachment = attachmentInput.files[0];
      
      // Validation
      if (!reason) {
        alert("Please enter a reason for WFH request");
        return;
      }
      
      if (!count || count <= 0) {
        alert("Please enter a valid number of days");
        return;
      }

      // Get date values
      let fromDate, toDate;
      const countNum = parseInt(count);
      
      if (countNum === 1) {
        const calendarInput = document.getElementById("calendar");
        if (!calendarInput || !calendarInput.value) {
          alert("Please select a date");
          return;
        }
        fromDate = calendarInput.value;
        toDate = calendarInput.value;
      } else {
        const fromDateInput = document.getElementById("fromDate");
        const toDateInput = document.getElementById("toDate");
        
        if (!fromDateInput || !fromDateInput.value) {
          alert("Please select from date");
          return;
        }
        
        if (!toDateInput || !toDateInput.value) {
          alert("Please select to date");
          return;
        }
        
        fromDate = fromDateInput.value;
        toDate = toDateInput.value;
        
        // Validate date range
        if (new Date(fromDate) > new Date(toDate)) {
          alert("From date cannot be after to date");
          return;
        }
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("reason", reason);
      formData.append("wfhCount", count);
      formData.append("fromDate", fromDate);
      formData.append("toDate", toDate);
      
      if (additionalReason) {
        formData.append("comments", additionalReason);
      }
      
      if (attachment) {
        formData.append("attachment", attachment);
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      // Submit to backend
      const token = localStorage.getItem("jwtToken");
      const response = await fetch("/api/wfh-request", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert("WFH request submitted successfully!");
        loadDashboard(); // Return to dashboard
      } else {
        alert(`Error: ${result.message || "Failed to submit WFH request"}`);
      }

    } catch (error) {
      console.error("Error submitting WFH request:", error);
      alert("An error occurred while submitting the request. Please try again.");
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    }
  });

  injectProfileSidebar();
  setLogoutListener();
  loadRecentNotices();
}

// Add event listener for WFH button
if (document.getElementById("btn-wfh")) {
  document.getElementById("btn-wfh").addEventListener("click", loadWFHRequest);
}

// Add event listener for WFH Approval button
if (document.getElementById("btn-wfh-approval")) {
  document.getElementById("btn-wfh-approval").addEventListener("click", loadWFHApproval);
}

// Add WFH Approval Section
function loadWFHApproval() {
  console.log("loadWFHApproval function called"); // Debug log
  try {
    // Security check - only admin and HR roles can approve WFH
    const employee = JSON.parse(localStorage.getItem("employee"));
    console.log("Employee data:", employee); // Debug log
    if (!employee) {
      alert("Please login to access WFH approval.");
      return;
    }
    
    const isAdminRole = employee.role === "admin" || employee.role === "hr_admin";
    const isHRRole =
      employee.role === "hr_admin" ||
      employee.role === "hr_manager" ||
      employee.role === "hr_executive" ||
      employee.role === "hr_recruiter";
    console.log("Role check - isAdminRole:", isAdminRole, "isHRRole:", isHRRole, "userRole:", employee.role); // Debug log
    if (!isAdminRole && !isHRRole) {
      alert("Access denied. Only administrators and HR personnel can approve WFH requests.");
      return;
    }
    setActive("btn-wfh-approval");
    mainContent.innerHTML = `
        <div class="admin-content-section wfh-approval-section" id="wfh-approval-section">
          <h2><i class="fas fa-laptop-house"></i> WFH Approval Requests</h2>
          <div class="wfh-requests-container">
            <div class="filters">
              <select id="wfhStatusFilter" class="filter-select">
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <input type="text" id="wfhEmployeeFilter" class="filter-input" placeholder="Search by Employee ID or Name">
            </div>
            <div class="wfh-requests-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>WFH Reason</th>
                    <th>Additional Details</th>
                    <th>WFH Count</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Attachment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="wfhRequestsBody">
                  <tr>
                    <td colspan="10" class="loading">Loading WFH requests...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

    // Add styles for the WFH approval page
    const style = document.createElement("style");
    style.textContent = `
        .wfh-approval-section {
          max-width: 1100px;
          margin: 40px auto;
          background: rgba(255,255,255,0.13);
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(67, 206, 162, 0.18), 0 3px 16px rgba(118, 75, 162, 0.13);
          padding: 32px 32px 24px 32px;
          color: #fff;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1.5px solid rgba(255,255,255,0.18);
        }
        .wfh-requests-container {
          width: 100%;
          overflow-x: auto;
        }
        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .filter-select, .filter-input {
          padding: 0.5rem;
          border: 1px solid #e0d7f3;
          border-radius: 8px;
          background: rgba(255,255,255,0.85);
        }
        .wfh-requests-table {
          width: 100%;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(255,255,255,0.22);
          border-radius: 12px;
          overflow: hidden;
        }
        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          max-width: 150px;
          word-wrap: break-word;
        }
        th {
          background: rgba(118, 75, 162, 0.1);
          font-weight: 600;
          color: #3a2c5c;
        }
        tr:hover {
          background: rgba(255,255,255,0.1);
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .status-pending {
          background: #fff3cd;
          color: #856404;
        }
        .status-approved {
          background: #d4edda;
          color: #155724;
        }
        .status-rejected {
          background: #f8d7da;
          color: #721c24;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .approve-btn, .reject-btn {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }
        .approve-btn {
          background: #28a745;
          color: white;
        }
        .reject-btn {
          background: #dc3545;
          color: white;
        }
        .approve-btn:hover, .reject-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        .attachment-link {
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
        }
        .attachment-link:hover {
          color: #0056b3;
        }
        .no-data {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        @media (max-width: 900px) {
          .wfh-approval-section {
            padding: 16px 4vw;
          }
          th, td {
            padding: 0.7rem;
            max-width: 120px;
          }
        }
      `;
    document.head.appendChild(style);

    // Load WFH requests from backend
    setTimeout(() => {
      loadWFHRequests();
    }, 100);

    // Add event listeners for filters
    setTimeout(() => {
      const statusFilter = document.getElementById("wfhStatusFilter");
      const employeeFilter = document.getElementById("wfhEmployeeFilter");

      if (statusFilter) {
        statusFilter.addEventListener("change", loadWFHRequests);
      }
      if (employeeFilter) {
        employeeFilter.addEventListener("input", debounce(loadWFHRequests, 500));
      }
    }, 200);

    injectProfileSidebar();
  } catch (error) {
    console.error("Error loading WFH approval section:", error);
    alert("Error loading WFH approval section. Please try again.");
  }
}

// Function to load WFH requests
async function loadWFHRequests() {
  try {
    console.log("Loading WFH requests...");
    const statusFilter = document.getElementById("wfhStatusFilter");
    const employeeFilter = document.getElementById("wfhEmployeeFilter");
    const tbody = document.getElementById("wfhRequestsBody");

    // Check if elements exist
    if (!statusFilter || !employeeFilter || !tbody) {
      console.error("Required elements not found");
      return;
    }

    // Show loading
    tbody.innerHTML = '<tr><td colspan="10" class="loading">Loading WFH requests...</td></tr>';

    // Build query parameters
    const params = new URLSearchParams();
    if (statusFilter.value !== "all") {
      params.append("status", statusFilter.value);
    }
    if (employeeFilter.value.trim()) {
      params.append("employeeName", employeeFilter.value.trim());
    }

    // Fetch from backend - Use consistent token key
    const token = localStorage.getItem("jwtToken");
    console.log("Fetching WFH requests with params:", params.toString());
    console.log("Using token:", token ? "Token exists" : "No token found");
    
    if (!token) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">Authentication required. Please login again.</td></tr>';
      return;
    }

    const response = await fetch(`/api/wfh-requests?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("WFH Requests result:", result);

    if (result.success) {
      displayWFHRequests(result.wfhRequests);
    } else {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">Error loading WFH requests: ' + (result.message || 'Unknown error') + '</td></tr>';
    }

  } catch (error) {
    console.error("Error loading WFH requests:", error);
    const tbody = document.getElementById("wfhRequestsBody");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data">Error loading WFH requests: ' + error.message + '</td></tr>';
    }
  }
}

// Function to display WFH requests
function displayWFHRequests(requests) {
  const tbody = document.getElementById("wfhRequestsBody");

  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="no-data">No WFH requests found</td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(request => `
    <tr>
      <td>${request.employeeId}</td>
      <td>${request.employeeName}</td>
      <td>${request.reason || "-"}</td>
      <td>${request.comments || "-"}</td>
      <td>${request.wfhCount}</td>
      <td>${new Date(request.fromDate).toLocaleDateString()}</td>
      <td>${new Date(request.toDate).toLocaleDateString()}</td>
      <td>
        ${request.attachment ? 
          `<a href="#" class="attachment-link" data-id="${request._id}">
            <i class="fas fa-paperclip"></i> View
           </a>` : 
          "-"
        }
      </td>
      <td>
        <span class="status-badge status-${request.status.toLowerCase()}">
          ${request.status}
        </span>
      </td>
      <td>
        ${request.status === "Pending" ? `
          <div class="action-buttons">
            <button class="approve-btn" onclick="approveWFHRequest('${request._id}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="reject-btn" onclick="rejectWFHRequest('${request._id}')">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        ` : `
          ${request.approvedBy ? `By: ${request.approvedBy}` : ""}
        `}
      </td>
    </tr>
  `).join("");

  // Attach click handler for attachment links
  document.querySelectorAll('.attachment-link').forEach(link => {
    link.addEventListener('click', async function(e) {
      e.preventDefault();
      const id = this.getAttribute('data-id');
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }
      try {
        const response = await fetch(`/api/wfh-requests/${id}/attachment`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch attachment');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      } catch (err) {
        alert('Failed to open attachment.');
      }
    });
  });
}

// Function to approve WFH request
async function approveWFHRequest(requestId) {
  if (!confirm("Are you sure you want to approve this WFH request?")) {
    return;
  }

  try {
    const comments = prompt("Enter any comments (optional):");
    
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      alert("Authentication required. Please login again.");
      return;
    }

    const response = await fetch(`/api/wfh-requests/${requestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        status: "Approved",
        comments: comments || ""
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      alert("WFH request approved successfully!");
      loadWFHRequests(); // Reload the list
    } else {
      alert(`Error: ${result.message || "Failed to approve request"}`);
    }

  } catch (error) {
    console.error("Error approving WFH request:", error);
    alert("An error occurred while approving the request: " + error.message);
  }
}

// Function to reject WFH request
async function rejectWFHRequest(requestId) {
  if (!confirm("Are you sure you want to reject this WFH request?")) {
    return;
  }

  try {
    const comments = prompt("Enter rejection reason (optional):");
    
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      alert("Authentication required. Please login again.");
      return;
    }

    const response = await fetch(`/api/wfh-requests/${requestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        status: "Rejected",
        comments: comments || ""
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      alert("WFH request rejected successfully!");
      loadWFHRequests(); // Reload the list
    } else {
      alert(`Error: ${result.message || "Failed to reject request"}`);
    }

  } catch (error) {
    console.error("Error rejecting WFH request:", error);
    alert("An error occurred while rejecting the request: " + error.message);
  }
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add event listeners for Notice Board and Notifications
if (document.getElementById("btn-notice-board")) {
  document.getElementById("btn-notice-board").addEventListener("click", loadNoticeBoard);
}

if (document.getElementById("btn-notifications")) {
  document.getElementById("btn-notifications").addEventListener("click", loadNotifications);
}

// Notice Board Section (Admin/HR only)
function loadNoticeBoard() {
  // Security check - only admin, hr_admin, and hr_recruiter roles can send notices
  const employee = JSON.parse(localStorage.getItem("employee"));
  if (!employee || !employee.role) {
    alert("Access denied. Only administrators and HR personnel can send notices.");
    return;
  }
  // Normalize role to lower case for robust comparison
  const role = employee.role.toLowerCase();
  const allowedRoles = ["admin", "hr_admin", "hr_recruiter"];
  if (!allowedRoles.includes(role)) {
    alert("Access denied. Only administrators and HR personnel can send notices.");
    return;
  }

  setActive("btn-notice-board");
  mainContent.innerHTML = `
      <div class="admin-content-section notice-board-section" id="notice-board-section">
        <h2><i class="fas fa-bullhorn"></i> Notice Board</h2>
        <div id="recent-form-container">
          <form id="noticeBoardForm" class="section-form">
            <div class="form-group">
              <label for="noticeMessage">Notice Message</label>
              <textarea 
                id="noticeMessage" 
                name="noticeMessage" 
                placeholder="Enter your notice message here..." 
                required
                rows="6"
              ></textarea>
            </div>
            <div class="form-group" id="employeeIdGroup" style="display: none;">
              <label for="employeeId">Employee ID</label>
              <input 
                type="text" 
                id="employeeId" 
                name="employeeId" 
                placeholder="Enter Employee ID"
              />
            </div>
            <div class="notice-actions">
              <button type="button" id="sendBtn" class="notice-btn send-btn">
                <i class="fas fa-paper-plane"></i> Send
              </button>
              <button type="button" id="sendAllBtn" class="notice-btn send-all-btn">
                <i class="fas fa-broadcast-tower"></i> Send All
              </button>
              <button type="button" id="cancelNoticeBtn" class="notice-btn cancel-btn">
                <i class="fas fa-times"></i> Cancel
              </button>
            </div>
          </form>
          <div id="recentNoticesContainer">
            <h3><i class="fas fa-history"></i> Recent Notices</h3>
            <div id="recentNoticesList">
              <div class="no-notices">No recent notices</div>
            </div>
          </div>
        </div>
      </div>
    `;

  // Add event listeners for notice board buttons
  document.getElementById("sendBtn").addEventListener("click", function () {
    setMode("individual");
    handleSendNotice();
  });

  document.getElementById("sendAllBtn").addEventListener("click", function () {
    setMode("all");
    handleSendAllNotices();
  });

  document.getElementById("cancelNoticeBtn").addEventListener("click", handleCancelNotice);

  // Show/hide employee ID field based on button clicks
  let currentMode = null;

  function setMode(mode) {
    currentMode = mode;
    const employeeIdGroup = document.getElementById("employeeIdGroup");
    const employeeIdInput = document.getElementById("employeeId");

    if (mode === "individual") {
      employeeIdGroup.style.display = "block";
      employeeIdInput.required = true;
      employeeIdInput.focus();
    } else {
      employeeIdGroup.style.display = "none";
      employeeIdInput.required = false;
      employeeIdInput.value = "";
    }
  }

  async function handleSendNotice() {
    const message = document.getElementById("noticeMessage").value.trim();
    const employeeId = document.getElementById("employeeId").value.trim();

    if (!message) {
      alert("Please enter a notice message.");
      return;
    }

    if (currentMode === "individual" && !employeeId) {
      alert("Please enter an Employee ID.");
      return;
    }

    try {
      const token = localStorage.getItem("jwtToken");
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          recipientId: employeeId,
          isForAll: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNoticeStatus("Notice sent successfully!", "success");
        await loadRecentNotices(); // <-- reload recent notices
      } else {
        showNoticeStatus(data.message || "Failed to send notice.", "error");
      }
    } catch (err) {
      showNoticeStatus("Error sending notice.", "error");
    }

    // Clear form
    document.getElementById("noticeMessage").value = "";
    const empIdInput = document.getElementById("employeeId");
    if (empIdInput) empIdInput.value = "";
    const empIdGroup = document.getElementById("employeeIdGroup");
    if (empIdGroup) empIdGroup.style.display = "none";
  }

  async function handleSendAllNotices() {
    const message = document.getElementById("noticeMessage").value.trim();

    if (!message) {
      alert("Please enter a notice message.");
      return;
    }

    try {
      const token = localStorage.getItem("jwtToken");
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          isForAll: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNoticeStatus("Notice sent to all employees!", "success");
        await loadRecentNotices(); // <-- reload recent notices
      } else {
        showNoticeStatus(data.message || "Failed to send notice.", "error");
      }
    } catch (err) {
      showNoticeStatus("Error sending notice.", "error");
    }

    // Clear form
    document.getElementById("noticeMessage").value = "";
    const empIdInput = document.getElementById("employeeId");
    if (empIdInput) empIdInput.value = "";
    const empIdGroup = document.getElementById("employeeIdGroup");
    if (empIdGroup) empIdGroup.style.display = "none";
  }

  function handleCancelNotice() {
    document.getElementById("noticeMessage").value = "";
    const empIdInput = document.getElementById("employeeId");
    if (empIdInput) empIdInput.value = "";
    const empIdGroup = document.getElementById("employeeIdGroup");
    if (empIdGroup) empIdGroup.style.display = "none";
    showNoticeStatus("Notice cancelled.", "info");
  }

  function showNoticeStatus(message, type) {
    const statusDiv = document.createElement("div");
    statusDiv.className = `notice-status notice-status-${type}`;
    statusDiv.textContent = message;

    // Try to find the correct container
    let formContainer = document.getElementById("noticeBoardFormContainer");
    if (!formContainer) {
      // Fallback: try recent-form-container (the parent in the HTML)
      formContainer = document.getElementById("recent-form-container");
    }
    if (!formContainer) {
      // Fallback: try the main notice board section
      formContainer = document.querySelector(".notice-board-section");
    }
    if (!formContainer) {
      // Fallback: main content
      formContainer = document.getElementById("mainContent");
    }
    if (formContainer) {
      formContainer.appendChild(statusDiv);
    } else {
      // As a last resort, alert
      alert(message);
    }
    setTimeout(() => {
      statusDiv.remove();
    }, 3000);
  }
  injectProfileSidebar();
  setLogoutListener();
  loadRecentNotices();
}

// Notifications Section
function loadNotifications() {
  setActive("btn-notifications");
  mainContent.innerHTML = `
      <div class="admin-content-section notice-board-section" id="notification-section">
        <h2><i class="fas fa-bell"></i> Notifications</h2>
        <div id="notificationsList">
          <div class="loading-notifications">Loading notifications...</div>
        </div>
      </div>
    `;

  // Load notifications
  loadNotificationsList();
  injectProfileSidebar();
}

// async function loadNotificationsList() {
//   const notices = JSON.parse(localStorage.getItem("notices") || "[]");
//   const currentEmployee = JSON.parse(localStorage.getItem("employee"));
//   const notificationsList = document.getElementById("notificationsList");

//    Filter notifications for current user
//   const userNotifications = notices.filter(
//     (notice) => notice.isForAll || notice.recipientId === currentEmployee.employeeId
//   );

//   if (userNotifications.length === 0) {
//     notificationsList.innerHTML = '<div class="no-notifications">No notifications found</div>';
//     return;
//   }

//   const notificationsHtml = userNotifications
//     .map((notice) => {
//       const isUnread = !notice.readBy.includes(currentEmployee.employeeId);
//       return `
//         <div class="notice-item ${isUnread ? "unread" : ""}" data-notice-id="${notice.id}">
//           <div class="notice-header">
//             <span class="notice-sender">
//               <i class="fas fa-user"></i>
//               ${notice.senderName}
//             </span>
//             <span class="notice-date">${new Date(notice.createdAt).toLocaleString()}</span>
//           </div>
//           <div class="notice-message">${notice.message}</div>
//           <div class="notice-badge">
//             ${notice.isForAll ? "All Employees" : "Personal"}
//           </div>
//         </div>
//       `;
//     })
//     .join("");

//   notificationsList.innerHTML = notificationsHtml;

//    Add click handlers to mark as read
//   document.querySelectorAll(".notice-item").forEach((item) => {
//     item.addEventListener("click", function () {
//       const noticeId = this.dataset.noticeId;
//       markNotificationAsRead(noticeId);
//       this.classList.remove("unread");
//     });
//   });

//    Clear notification badge when notifications are viewed
//   clearNotificationBadge();
// }

// function markNotificationAsRead(noticeId) {
//   const notices = JSON.parse(localStorage.getItem("notices") || "[]");
//   const currentEmployee = JSON.parse(localStorage.getItem("employee"));

//   const notice = notices.find((n) => n.id == noticeId);
//   if (notice && !notice.readBy.includes(currentEmployee.employeeId)) {
//     notice.readBy.push(currentEmployee.employeeId);
//     localStorage.setItem("notices", JSON.stringify(notices));
//   }
// }

// function updateNotificationBadge() {
//   const notices = JSON.parse(localStorage.getItem("notices") || "[]");
//   const currentEmployee = JSON.parse(localStorage.getItem("employee"));

//   const unreadCount = notices.filter(
//     (notice) =>
//       (notice.isForAll || notice.recipientId === currentEmployee.employeeId) &&
//      !notice.readBy.includes(currentEmployee.employeeId)
//   ).length;

//   const badge = document.getElementById("notificationBadge");
//   if (badge) {
//     if (unreadCount > 0) {
//       badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
//       badge.style.display = "inline-block";
//     } else {
//       badge.style.display = "none";
//     }
//   }
// }

// function clearNotificationBadge() {
//   const badge = document.getElementById("notificationBadge");
//   if (badge) {
//     badge.style.display = "none";
//   }
// }

// Initialize notification badge on page load
// updateNotificationBadge();

// Add My Profile floating avatar button and sidebar
function injectProfileSidebar() {
  // Remove any existing avatar/sidebar to prevent duplicates
  const oldAvatar = document.getElementById("myProfileAvatarBtn");
  if (oldAvatar) oldAvatar.remove();
  const oldSidebar = document.getElementById("myProfileSidebar");
  if (oldSidebar) oldSidebar.remove();
  const oldStyle = document.getElementById("myProfileSidebarStyle");
  if (oldStyle) oldStyle.remove();

  // Add avatar button
  const avatarBtn = document.createElement("div");
  avatarBtn.id = "myProfileAvatarBtn";
  avatarBtn.className = "my-profile-avatar-btn";
  const employee = JSON.parse(localStorage.getItem("employee"));
  const imgSrc =
    employee && employee._id ? `/api/employees/${employee._id}/profile-image` : "/images/logo.png";
  avatarBtn.innerHTML = `<img id="myProfileAvatarImg" src="${imgSrc}" alt="Profile" onerror="this.src='/images/logo.png'" />`;
  document.body.appendChild(avatarBtn);
  avatarBtn.style.position = "fixed";
  avatarBtn.style.top = "24px";
  avatarBtn.style.right = "36px";
  avatarBtn.style.zIndex = "3002";

  // Add sidebar
  const sidebar = document.createElement("div");
  sidebar.id = "myProfileSidebar";
  sidebar.className = "my-profile-sidebar";
  sidebar.innerHTML = `
      <div class="my-profile-sidebar-content">
        <button class="my-profile-close-btn" id="myProfileCloseBtn">&times;</button>
        <h3 style="color: #764ba2; margin-bottom: 1.5rem; text-align: center;">My Profile</h3>
        <div id="profileContent"></div>
      </div>
      <div class="my-profile-sidebar-overlay" id="myProfileSidebarOverlay"></div>
    `;
  document.body.appendChild(sidebar);

  // Add CSS
  if (!document.getElementById("myProfileSidebarStyle")) {
    const style = document.createElement("style");
    style.id = "myProfileSidebarStyle";
    style.textContent = `
        .my-profile-avatar-btn {
          position: fixed !important;
          top: 24px !important;
          right: 36px !important;
          z-index: 3002 !important;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(67,206,162,0.13);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .my-profile-avatar-btn:hover { box-shadow: 0 4px 16px rgba(67,206,162,0.18); }
        .my-profile-avatar-btn img {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #764ba2;
        }
        .my-profile-sidebar {
          position: fixed;
          top: 0; right: 0;
          width: 370px;
          max-width: 98vw;
          height: 100vh;
          background: #fff;
          box-shadow: -4px 0 24px rgba(67,206,162,0.13);
          z-index: 3003;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(.77,0,.18,1);
          display: flex;
          flex-direction: column;
        }
        .my-profile-sidebar.open { transform: translateX(0); }
        .my-profile-sidebar-content {
          padding: 28px 24px 18px 24px;
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        .my-profile-close-btn {
          position: absolute;
          top: 18px; right: 18px;
          background: none;
          border: none;
          font-size: 2rem;
          color: #764ba2;
          cursor: pointer;
          z-index: 1;
        }
        .my-profile-sidebar-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.18);
          z-index: 3001;
          display: none;
        }
        .my-profile-sidebar.open ~ .my-profile-sidebar-overlay,
        .my-profile-sidebar-overlay.open { display: block; }
        @media (max-width: 600px) {
          .my-profile-avatar-btn {
            top: 12px !important;
            right: 12px !important;
            width: 40px;
            height: 40px;
          }
          .my-profile-sidebar { width: 99vw; padding: 0; }
          .my-profile-sidebar-content { padding: 16px 4vw 10px 4vw; }
        }
      `;
    document.head.appendChild(style);
  }

  // Open/close logic
  avatarBtn.onclick = () => {
    sidebar.classList.add("open");
    document.getElementById("myProfileSidebarOverlay").classList.add("open");
    renderProfileContent();
  };
  document.getElementById("myProfileCloseBtn").onclick = () => {
    sidebar.classList.remove("open");
    document.getElementById("myProfileSidebarOverlay").classList.remove("open");
  };
  document.getElementById("myProfileSidebarOverlay").onclick = () => {
    sidebar.classList.remove("open");
    document.getElementById("myProfileSidebarOverlay").classList.remove("open");
  };

  // Render profile content
  function renderProfileContent() {
    const emp = JSON.parse(localStorage.getItem("employee"));
    const profileContent = document.getElementById("profileContent");
    profileContent.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
          <img src="${
            emp && emp._id ? `/api/employees/${emp._id}/profile-image` : "/images/logo.png"
          }" alt="Profile" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #764ba2;box-shadow:0 2px 8px rgba(118,75,162,0.10);background:#fff;" onerror="this.src='/images/logo.png'" />
          <div id='manageAccountBtnContainer' style='display:flex;justify-content:center;margin-top:16px;margin-bottom:18px;'><button id='manageAccountBtn' class='add-employee-btn' style='width:80%;max-width:260px;text-align:center;' >Manage your account</button></div>
        </div>
        <div style="margin-bottom: 12px;"><strong>Name:</strong> ${emp.firstName || ""} ${
      emp.lastName || ""
    }</div>
        <div style="margin-bottom: 12px;"><strong>Employee ID:</strong> ${emp.employeeId}</div>
        <div style="margin-bottom: 12px;"><strong>Email:</strong> ${emp.email || "-"}</div>
        <div style="margin-bottom: 12px;"><strong>Role:</strong> ${emp.role}</div>
        <div style="margin-bottom: 12px;"><strong>Mobile:</strong> ${emp.mobile || "-"}</div>
        <div style="margin-bottom: 12px;"><strong>Date of Joining:</strong> ${
          emp.doj ? new Date(emp.doj).toLocaleDateString() : "-"
        }</div>
        <div style="margin-bottom: 12px;"><strong>Address:</strong> ${emp.address || "-"}</div>
        <div style="margin-bottom: 12px;"><strong>ID Card:</strong> ${
          emp.idCardType ? emp.idCardType.toUpperCase() : "-"
        } ${emp.idCardNumber || ""}</div>
      `;
      //console.log("Profile content rendered successfully"); // Debug log
      
       //console.log("manageAccountBtnContainer:", document.getElementById("manageAccountBtn")); // Debug log
    //  document.getElementById("manageAccountBtn").onclick = handleManageAccountClick;
    //document.getElementById("manageAccountBtn").addEventListener("click", handleManageAccountClick);
    handleManageAccountClick(); // Debug log
     

    // Event listener removed - now using onclick attribute in HTML
  }
 //document.getElementById("manageAccountBtn")?.addEventListener("click", handleManageAccountClick);

}
function handleManageAccountClick() {
  console.log("handleManageAccountClick called"); // Debug log
  const sidebarEl = document.getElementById('myProfileSidebar');
  const overlayEl = document.getElementById('myProfileSidebarOverlay');
  console.log("Sidebar element:", sidebarEl); // Debug log
  console.log("Overlay element:", overlayEl); // Debug log
  if (sidebarEl) sidebarEl.classList.remove('open');
  if (overlayEl) overlayEl.classList.remove('open');
  console.log("About to call showProfileInMainContent"); // Debug log
  showProfileInMainContent();
  console.log("showProfileInMainContent called successfully"); // Debug log
}


// Add Leave Tracker button for admin/HR
if (isAdminRole || isHRRole) {
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (!document.getElementById("btn-leave-tracker")) {
    const leaveTrackerBtn = document.createElement("button");
    leaveTrackerBtn.id = "btn-leave-tracker";
    leaveTrackerBtn.className = "sidebar-btn";
    leaveTrackerBtn.innerHTML = '<i class="fas fa-search"></i> Leave Tracker';
    sidebarNav.insertBefore(leaveTrackerBtn, document.getElementById("btn-stats"));
    leaveTrackerBtn.addEventListener("click", () => {
      loadLeaveTracker();
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("show");
        document.getElementById("sidebarOverlay").classList.remove("active");
      }
    });
  }
}

// --- Leave Request Tracker Section ---
async function loadLeaveTracker() {
  setActive("btn-leave-tracker");
  mainContent.classList.add("center-flex");
  mainContent.innerHTML = `
      <div class="admin-content-section centered-section scrollable-form-container" id="leave-tracker-section">
        <h2>Leave Request Tracker</h2>
        <form id="leaveTrackerForm" class="section-form" style="max-width:500px;margin-bottom:2rem;">
          <div class="form-row">
            <div class="form-group">
              <label>Employee ID</label>
              <input type="text" id="trackerEmployeeId" required placeholder="Enter Employee ID" />
            </div>
            <div class="form-group">
              <label>Month</label>
              <select id="trackerMonth" required>
                ${Array.from(
                  { length: 12 },
                  (_, i) =>
                    `<option value="${String(i + 1).padStart(2, "0")}">${new Date(
                      0,
                      i
                    ).toLocaleString("en-IN", { month: "long" })}</option>`
                ).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Year</label>
              <select id="trackerYear" required>
                ${Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return `<option value="${y}">${y}</option>`;
                }).join("")}
              </select>
            </div>
          </div>
          <div class="form-row">
            <button type="submit" class="add-employee-btn">Search</button>
          </div>
        </form>
        <div id="leaveTrackerResult"></div>
      </div>
      <style>
      .leave-tracker-table { width: 100%; border-collapse: collapse; margin-top: 1rem; background: #fff;color:#764ba2; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(67,206,162,0.08); }
      .leave-tracker-table th, .leave-tracker-table td { padding: 10px 8px; text-align: center; border-bottom: 1px solid #e0e0e0; font-size: 1rem; }
      .leave-tracker-table th { background: #f3eaff; color: #764ba2; font-weight: 600; }
      .leave-tracker-table td { background: #faf8ff; }
      .leave-tracker-table tr:last-child td { border-bottom: none; }
      .leave-tracker-table .leave-dates-cell { white-space: normal; word-break: break-all; font-size: 0.98rem; line-height: 1.3; }
      .leave-tracker-table .leave-count-cell { font-size: 1.1rem; font-weight: bold; color: #764ba2; }
      .leave-tracker-table .leave-type-cell select { padding: 4px 8px; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; }
      @media (max-width: 900px) {
        .leave-tracker-table th, .leave-tracker-table td { padding: 7px 4px; font-size: 0.97rem; }
      }
      @media (max-width: 600px) {
        .leave-tracker-table, .leave-tracker-table thead, .leave-tracker-table tbody, .leave-tracker-table tr, .leave-tracker-table th, .leave-tracker-table td { display: block; width: 100%; }
        .leave-tracker-table thead { display: none; }
        .leave-tracker-table tr { margin-bottom: 1.2em; border-radius: 10px; background: #764ba2;; box-shadow: 0 2px 8px rgba(67,206,162,0.08); }
        .leave-tracker-table td { text-align: left; padding: 10px 8px; border-bottom: none; position: relative; }
        .leave-tracker-table td:before { content: attr(data-label); font-weight: bold; color: #764ba2; display: block; margin-bottom: 2px;
        #leavveTrackerResult { width: 86vw;} 
      }
      </style>
    `;
  document.getElementById("leaveTrackerForm").onsubmit = async function (e) {
    e.preventDefault();
    const empId = document.getElementById("trackerEmployeeId").value.trim();
    const month = document.getElementById("trackerMonth").value;
    const year = document.getElementById("trackerYear").value;
    const resultDiv = document.getElementById("leaveTrackerResult");
    resultDiv.innerHTML = "<div>Loading...</div>";
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await fetch(
        `/api/leave-history?employeeId=${encodeURIComponent(empId)}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!data.success) {
        resultDiv.innerHTML = `<div class="error">${
          data.message || "Failed to fetch leave history."
        }</div>`;
        return;
      }
      if (!data.leaveHistory.length) {
        resultDiv.innerHTML = "<div>No leave history found for this month.</div>";
        return;
      }
      // Table header
      let hasPending = false;
      let html = `<table class="leave-tracker-table">
          <thead><tr>
            <th>Leave Dates</th>
            <th>Leave Count</th>
            <th>Leave Type</th>
            <th>Paid</th>
            <th>Unpaid</th>
            <th>Status</th>
            <th>Action</th>
          </tr></thead><tbody>`;
      data.leaveHistory.forEach((lr) => {
        const leaveDates =
          lr.leaveDates.length > 1
            ? `<div class='leave-dates-cell'>${new Date(
                lr.leaveDates[0]
              ).toLocaleDateString()}<br>to<br>${new Date(
                lr.leaveDates[lr.leaveDates.length - 1]
              ).toLocaleDateString()}</div>`
            : lr.leaveDates[0]
            ? `<div class='leave-dates-cell'>${new Date(
                lr.leaveDates[0]
              ).toLocaleDateString()}</div>`
            : "";
        html += `<tr data-id="${lr._id}">
            <td class='leave-dates-cell' data-label='Leave Dates'>${leaveDates}</td>
            <td class='leave-count-cell' data-label='Leave Count'>${lr.leaveCount}</td>
            <td class="leave-type-cell" data-label='Leave Type'>`;
        if (lr.editable) {
          hasPending = true;
          html += `<select class="leave-type-select">
              <option value="Pending"${
                lr.leaveType === "Pending" ? " selected" : ""
              }>Pending</option>
              <option value="CL"${lr.leaveType === "CL" ? " selected" : ""}>CL</option>
              <option value="SL"${lr.leaveType === "SL" ? " selected" : ""}>SL</option>
              <option value="NPL"${lr.leaveType === "NPL" ? " selected" : ""}>NPL</option>
              <option value="DNPL"${lr.leaveType === "DNPL" ? " selected" : ""}>DNPL</option>
            </select>`;
        } else {
          html += lr.leaveType;
        }
        html += `</td>
            <td data-label='Paid'>${lr.paidLeaves}</td>
            <td data-label='Unpaid'>${lr.unpaidLeaves}</td>
            <td data-label='Status'>${lr.status}</td>
            <td data-label='Action'>`;
        if (lr.editable) {
          html += `<span style='color:#764ba2;font-size:1.1em;'>Editable</span>`;
        } else {
          html += "-";
        }
        html += `</td></tr>`;
      });
      html += "</tbody></table>";
      if (hasPending) {
        html += `<div style="text-align:right;margin-top:1.2em;"><button id="leaveTypeSubmitBtn" class="add-employee-btn" style="padding:8px 28px;font-size:1.08rem;">Submit</button></div>`;
      }
      html += `<div id="leaveTypeMsg" style="margin-top:1em;"></div>`;
      resultDiv.innerHTML = html;

      // --- Submit all changed leave types ---
      if (hasPending) {
        document.getElementById("leaveTypeSubmitBtn").onclick = async function () {
          const btn = this;
          btn.disabled = true;
          btn.textContent = "Saving...";
          const msgDiv = document.getElementById("leaveTypeMsg");
          msgDiv.textContent = "";
          let updates = [];
          document.querySelectorAll(".leave-tracker-table tr[data-id]").forEach((tr) => {
            const id = tr.getAttribute("data-id");
            const select = tr.querySelector(".leave-type-select");
            if (select) {
              const newType = select.value;
              if (newType !== "Pending") {
                updates.push({ id, leaveType: newType });
              }
            }
          });
          if (!updates.length) {
            btn.disabled = false;
            btn.textContent = "Submit";
            msgDiv.textContent = "No changes to save.";
            return;
          }
          let success = 0,
            fail = 0;
          for (const upd of updates) {
            try {
              const res = await fetch(`/api/leave-history/${upd.id}/leave-type`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ leaveType: upd.leaveType }),
              });
              const data = await res.json();
              if (data.success) success++;
              else fail++;
            } catch {
              fail++;
            }
          }
          btn.disabled = false;
          btn.textContent = "Submit";
          if (fail === 0) {
            msgDiv.style.color = "green";
            msgDiv.textContent = "All leave types updated successfully!";
            // Optionally reload the table
            document.getElementById("leaveTrackerForm").dispatchEvent(new Event("submit"));
          } else {
            msgDiv.style.color = "red";
            msgDiv.textContent = `Some updates failed. Success: ${success}, Failed: ${fail}`;
          }
        };
      }
    } catch (err) {
      resultDiv.innerHTML = '<div class="error">Error fetching leave history.</div>';
    }
  };
  setLogoutListener();
  injectProfileSidebar();
}

// Add Word Count Entry Section for Admin/HR
function loadWordCountEntry() {
  setActive("btn-word-count-entry");
  mainContent.classList.add("center-flex");
  mainContent.innerHTML = `
      <div class="admin-content-section centered-section scrollable-form-container" id="word-count-entry-section">
        <h2>Word Count Entry</h2>
        <form id="wordCountEntryForm" class="section-form add-employee-flex-row">
          <div class="form-row" style="flex-wrap: wrap; gap: 15px;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Employee ID</label>
              <input type="text" name="employeeId" required placeholder="Enter Employee ID" />
            </div>
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Today's Word Count</label>
              <input type="number" name="wordCount" min="0" required placeholder="Enter word count" />
            </div>
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label>Date</label>
              <input type="date" name="date" required value="${new Date()
                .toISOString()
                .slice(0, 10)}" />
            </div>
          </div>
          <div class="button-container">
            <button type="submit" class="add-employee-btn">Submit</button>
          </div>
          <div id="wordCountEntryMsg" style="margin-top:1rem;"></div>
        </form>
      </div>
    `;
  document.getElementById("wordCountEntryForm").onsubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const employeeId = form.employeeId.value.trim();
    const wordCount = parseInt(form.wordCount.value);
    const date = form.date.value;
    const msgDiv = document.getElementById("wordCountEntryMsg");
    msgDiv.textContent = "";
    try {
      const token = localStorage.getItem("jwtToken");
      // Get current admin/HR's employeeId for createdBy
      const currentUser = JSON.parse(localStorage.getItem("employee"));
      const createdBy = currentUser && currentUser.employeeId ? currentUser.employeeId : "";
      const res = await fetch("/api/word-count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId, wordCount, date, createdBy }),
      });
      const data = await res.json();
      if (data.success) {
        msgDiv.style.color = "green";
        msgDiv.textContent = "Word count submitted successfully!";
        form.reset();
        form.date.value = new Date().toISOString().slice(0, 10);
      } else {
        msgDiv.style.color = "red";
        msgDiv.textContent = data.message || "Failed to submit word count.";
      }
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = "Error submitting word count.";
    }
  };
  setLogoutListener();
  injectProfileSidebar();
}

// --- Attendance Tracker Section ---
async function loadAttendanceTracker() {
  setActive("btn-attendance-tracker");
  mainContent.classList.add("center-flex");
  mainContent.innerHTML = `
      <div class="admin-content-section centered-section scrollable-form-container" id="attendance-tracker-section">
        <h2>Attendance Tracker</h2>
        <form id="attendanceTrackerForm" class="section-form" style="max-width:500px;margin-bottom:2rem;">
          <div class="form-row">
            <div class="form-group">
              <label>Employee ID</label>
              <input type="text" id="attTrackerEmployeeId" required placeholder="Enter Employee ID" />
            </div>
            <div class="form-group">
              <label>Month</label>
              <select id="attTrackerMonth" required>
                ${Array.from(
                  { length: 12 },
                  (_, i) =>
                    `<option value="${String(i + 1).padStart(2, "0")}">${new Date(
                      0,
                      i
                    ).toLocaleString("en-IN", { month: "long" })}</option>`
                ).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Year</label>
              <select id="attTrackerYear" required>
                ${Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return `<option value="${y}">${y}</option>`;
                }).join("")}
              </select>
            </div>
          </div>
          <div class="form-row">
            <button type="submit" class="add-employee-btn">Search</button>
          </div>
        </form>
        <div id="attendanceTrackerResult" class="attendance-tracker-result-scrollable"></div>
      </div>
      <style>/* ...existing inline styles... */</style>
    `;
  document.getElementById("attendanceTrackerForm").onsubmit = async function (e) {
    e.preventDefault();
    const empId = document.getElementById("attTrackerEmployeeId").value.trim();
    const month = document.getElementById("attTrackerMonth").value;
    const year = document.getElementById("attTrackerYear").value;
    const resultDiv = document.getElementById("attendanceTrackerResult");
    resultDiv.innerHTML = "<div>Loading...</div>";
    try {
      const token = localStorage.getItem("jwtToken");
      // Fetch employee details
      const empRes = await fetch(`/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const empData = await empRes.json();
      let employee = null;
      if (empData.success && Array.isArray(empData.employees)) {
        employee = empData.employees.find(
          (emp) => emp.employeeId && emp.employeeId.toLowerCase() === empId.toLowerCase()
        );
      }
      if (!employee) {
        resultDiv.innerHTML = '<div class="error">No employee found with this ID.</div>';
        return;
      }
      // Fetch attendance summary
      const attRes = await fetch(
        `/api/attendance-summary?employeeId=${encodeURIComponent(
          empId
        )}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const attData = await attRes.json();
      console.log(attData);
      if (!attData || !attData.success || !Array.isArray(attData.days)) {
        resultDiv.innerHTML = '<div class="error">No attendance data found for this month.</div>';
        return;
      }
      // Fetch all attendance records for the month
      const attAllRes = await fetch(
        `/api/attendance?employeeId=${encodeURIComponent(empId)}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const attAllData = await attAllRes.json();
      console.log("AttALLDATA->",attAllData);
      if (!attAllData || !attAllData.success || !Array.isArray(attAllData.attendance)) {
        resultDiv.innerHTML =
          '<div class="error">No detailed attendance records found for this month.</div>';
        return;
      }
      // Calculate late entry count
      let lateCount = attAllData.attendance.filter((a) => a.lateEntry).length;
      // ... (rest of the rendering logic remains unchanged)
      // Build summary cards with labels
      let summaryHtml = `
          <div class="attendance-tracker-summary-cards">
            <div class="attendance-tracker-summary-card present-card">
              <div class="summary-label">Present</div>
              <div class="summary-value">${attData.attendanceCount}</div>
            </div>
            <div class="attendance-tracker-summary-card absent-card">
              <div class="summary-label">Absent</div>
              <div class="summary-value">${
                attData.days.filter((d) => d.attendanceStatus === "Absent").length
              }</div>
            </div>
            <div class="attendance-tracker-summary-card late-card">
              <div class="summary-label">Late Entry</div>
              <div class="summary-value">${lateCount}</div>
            </div>
            <div class="attendance-tracker-summary-card early-card">
              <div class="summary-label">Early Checkout</div>
              <div class="summary-value">${attData.earlyCheckoutCount || 0}</div>
            </div>
          </div>
        `;
      // Calendar grid with title, icons, and tooltips
      // Add dynamic month/year heading
      const monthNames = [
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
      ];
      const monthNum = parseInt(month, 10) - 1;
      const calendarHeading = `<div class="attendance-tracker-calendar-heading" style="font-size:1.18rem;font-weight:700;color:#764ba2;text-align:center;margin-bottom:0.5rem;">${monthNames[monthNum]}, ${year}</div>`;
      let calendarHtml = `
          <div class="attendance-tracker-calendar-container">
            ${calendarHeading}
            <div class="attendance-tracker-calendar-title">Attendance Calendar</div>
            <div class="attendance-tracker-calendar-flex">
        `;
      // Ensure all days of the month are shown, even if no attendance record exists
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayData = attData.days.find(day => day.date === dateStr);
        let statusClass = "absent";
        let icon = "<span title=\"Absent\" style=\"color:#fff;font-size:1.1em;\">&#10060;</span>";
        let statusText = "Absent";
        if (dayData) {
          // Always use attendanceStatus for present/absent
          if (dayData.attendanceStatus === "Present") {
            statusClass = "present";
            // Now check for late/early for icon only
            const lateDay = attAllData.attendance && attAllData.attendance.find(a => a.date && a.date.slice(0, 10) === dayData.date && a.lateEntry);
            const earlyDay = attAllData.attendance && attAllData.attendance.find(a => a.date && a.date.slice(0, 10) === dayData.date && a.earlyCheckout);
            if (lateDay) {
              icon = '<span title="Late Entry" style="color:#fff;font-size:1.1em;">&#128336;</span>';
              statusText = "Late Entry";
            } else if (earlyDay) {
              icon = '<span title="Early Checkout" style="color:#fff;font-size:1.1em;">&#9200;</span>';
              statusText = "Early Checkout";
            } else {
              icon = '<span title="Present" style="color:#fff;font-size:1.1em;">&#10003;</span>';
              statusText = "Present";
            }
          } else {
            // Only show late/early icon if not present
            const lateDay = attAllData.attendance && attAllData.attendance.find(a => a.date && a.date.slice(0, 10) === dayData.date && a.lateEntry);
            const earlyDay = attAllData.attendance && attAllData.attendance.find(a => a.date && a.date.slice(0, 10) === dayData.date && a.earlyCheckout);
            if (lateDay) {
              statusClass = "late";
              icon = '<span title="Late Entry" style="color:#fff;font-size:1.1em;">&#128336;</span>';
              statusText = "Late Entry";
            } else if (earlyDay) {
              statusClass = "early";
              icon = '<span title="Early Checkout" style="color:#fff;font-size:1.1em;">&#9200;</span>';
              statusText = "Early Checkout";
            }
          }
        }
        calendarHtml += `<div class="attendance-tracker-calendar-day ${statusClass}" tabindex="0" title="${dateStr}: ${statusText}">${icon}<div style='font-size:0.95em;'>${d}</div></div>`;
      }
      calendarHtml += "</div></div>";
      // Restore calendarStyle definition before use (do not delete empInfoHtml)
      let calendarStyle = `
          <style>
          .attendance-tracker-summary-cards {
            display: flex;
            gap: 1.2rem;
            margin: 1.5rem 0 1.2rem 0;
            justify-content: center;
            align-items: stretch;
          }
          .attendance-tracker-summary-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 2px 8px rgba(67,206,162,0.10);
            padding: 1.2rem 1.5rem 1.1rem 1.5rem;
            min-width: 110px;
            text-align: center;
            flex: 1 1 110px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .attendance-tracker-summary-card .summary-label {
            font-size: 1.05rem;
            color: #764ba2;
            font-weight: 600;
            margin-bottom: 0.4em;
          }
          .attendance-tracker-summary-card .summary-value {
            font-size: 2.1rem;
            font-weight: bold;
            color: #43cea2;
            margin-bottom: 0.1em;
          }
          .attendance-tracker-summary-card.present-card .summary-value {
            color: #43cea2;
          }
          .attendance-tracker-summary-card.absent-card .summary-value {
            color: #ff758c;
          }
          .attendance-tracker-summary-card.late-card .summary-value {
            color: #ffb347;
          }
          .attendance-tracker-summary-card.early-card .summary-value {
            color: #ff9800;
          }
          @media (max-width: 600px) {
            .attendance-tracker-summary-cards {
              flex-direction: column;
              gap: 0.8rem;
            }
            .attendance-tracker-summary-card {
              min-width: 0;
              padding: 1.1rem 0.7rem 1rem 0.7rem;
            }
          }
          .attendance-tracker-calendar-container {
            margin-top: 2.2rem;
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 2px 12px rgba(67, 206, 162, 0.10);
            padding: 18px 10px 10px 10px;
            max-width: 420px;
            margin-left: auto;
            margin-right: auto;
          }
          .attendance-tracker-calendar-heading {
            font-size: 1.18rem;
            font-weight: 700;
            color: #764ba2;
            text-align: center;
            margin-bottom: 0.5rem;
          }
          .attendance-tracker-calendar-title {
            font-size: 1.12rem;
            color: #764ba2;
            font-weight: 600;
            margin-bottom: 10px;
            text-align: center;
          }
          .attendance-tracker-calendar-flex {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            justify-items: center;
          }
          .attendance-tracker-calendar-day {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 1.08rem;
            background: #e0c3fc;
            color: #3a2c5c;
            cursor: pointer;
            transition: 0.2s;
            box-shadow: 0 1px 4px rgba(67,206,162,0.07);
            margin-bottom: 2px;
            position: relative;
          }
          .attendance-tracker-calendar-day.present {
            background: #43cea2;
            color: #fff;
            font-weight: bold;
          }
          .attendance-tracker-calendar-day.absent {
            background: #ff758c;
            color: #fff;
            font-weight: bold;
          }
          .attendance-tracker-calendar-day.late {
            background: #ffb347;
            color: #fff;
            font-weight: bold;
          }
          .attendance-tracker-calendar-day.early {
            background: #ff9800;
            color: #fff;
            font-weight: bold;
          }
          .attendance-tracker-calendar-day:hover, .attendance-tracker-calendar-day:focus {
            box-shadow: 0 2px 8px rgba(67,206,162,0.13);
            transform: scale(1.08);
            outline: none;
          }
          .attendance-tracker-calendar-day span {
            display: block;
            line-height: 1;
          }
          @media (max-width: 600px) {
            .attendance-tracker-calendar-container {
              max-width: 99vw;
              padding: 8px 2vw 8px 2vw;
            }
            .attendance-tracker-calendar-flex {
              grid-template-columns: repeat(7, 1fr);
              gap: 4px;
            }
            .attendance-tracker-calendar-day {
              width: 28px;
              height: 28px;
              font-size: 0.98rem;
              border-radius: 7px;
            }
          }
          </style>
        `;
      // Build employee info HTML safely (define before use)
      let empInfoHtml = "";
      if (employee && (employee.firstName || employee.name)) {
        empInfoHtml = `
          <div style="margin-bottom:1.2rem;text-align:center;">
            <strong>Employee Name:</strong> ${employee.firstName || employee.name || ""} ${employee.lastName || ""} &nbsp; | &nbsp;
            <strong>Designation:</strong> ${employee.role || ""}
          </div>
        `;
      }
      resultDiv.innerHTML = empInfoHtml + summaryHtml + calendarHtml + calendarStyle;
    } catch (err) {
      console.error("Attendance Tracker error:", err);
      resultDiv.innerHTML = '<div class="error">Error fetching attendance data.</div>';
    }
  };
  setLogoutListener();
  injectProfileSidebar();
}

// --- Enhanced: Group and show breakdown for multi-month leave requests ---
function groupLeaveRequestsByOriginal(requests) {
  // Group by reason, comments, and consecutive dates (simple heuristic)
  const groups = [];
  let last = null;
  for (const req of requests.sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate))) {
    if (
      last &&
      req.reason === last.reason &&
      req.comments === last.comments &&
      req.employeeId === last.employeeId &&
      new Date(req.fromDate) - new Date(last.toDate) <= 86400000 // consecutive days
    ) {
      last._group.push(req);
      last.toDate = req.toDate; // extend group end
    } else {
      req._group = [req];
      groups.push(req);
      last = req;
    }
  }
  return groups;
}

// Add toggle for breakdown
window.toggleBreakdown = function (btn) {
  const tr = btn.closest("tr");
  const next = tr.nextElementSibling;
  if (next && next.classList.contains("breakdown-row")) {
    next.style.display = next.style.display === "none" ? "" : "none";
    btn.textContent = next.style.display === "none" ? "Breakdown" : "Hide Breakdown";
  }
};

// --- Fetch and display recent notices from backend ---
async function loadRecentNotices() {
  const recentNoticesList = document.getElementById("recentNoticesList");
  if (!recentNoticesList) return;
  recentNoticesList.innerHTML = '<div class="loading-notifications">Loading...</div>';
  try {
    const token = localStorage.getItem("jwtToken");
    const res = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.notifications) || data.notifications.length === 0) {
      recentNoticesList.innerHTML = '<div class="no-notices">No recent notices</div>';
      return;
    }
    const currentEmployee = JSON.parse(localStorage.getItem("employee"));
    const noticesHtml = data.notifications
      .slice(0, 10)
      .map(
        (notice) => `
        <div class="notice-item ${
          !notice.readBy.includes(currentEmployee.employeeId) ? "unread" : ""
        }" data-notice-id="${notice._id}">
          <div class="notice-header">
            <span class="notice-sender">
              <i class="fas fa-user"></i>
              ${notice.senderName}
            </span>
            <span class="notice-date">${new Date(notice.createdAt).toLocaleString()}</span>
          </div>
          <div class="notice-message">${notice.message}</div>
          <div class="notice-badge">
            ${notice.isForAll ? "All Employees" : `To: ${notice.recipientId}`}
          </div>
        </div>
      `
      )
      .join("");
    recentNoticesList.innerHTML = noticesHtml;
  } catch (err) {
    recentNoticesList.innerHTML = '<div class="no-notices">Error loading notices</div>';
  }
}

// --- Fetch and display notifications from backend ---
async function loadNotificationsList() {
  const notificationsList = document.getElementById("notificationsList");
  notificationsList.innerHTML = '<div class="loading-notifications">Loading notifications...</div>';
  try {
    const token = localStorage.getItem("jwtToken");
    const res = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const currentEmployee = JSON.parse(localStorage.getItem("employee"));
    if (!data.success || !Array.isArray(data.notifications) || data.notifications.length === 0) {
      notificationsList.innerHTML = '<div class="no-notifications">No notifications found</div>';
      return;
    }
    const notificationsHtml = data.notifications
      .map((notice) => {
        const isUnread = !notice.readBy.includes(currentEmployee.employeeId);
        return `
          <div class="notice-item ${isUnread ? "unread" : ""}" data-notice-id="${notice._id}">
            <div class="notice-header">
              <span class="notice-sender">
                <i class="fas fa-user"></i>
                ${notice.senderName}
              </span>
              <span class="notice-date">${new Date(notice.createdAt).toLocaleString()}</span>
            </div>
            <div class="notice-message">${notice.message}</div>
            <div class="notice-badge">
              ${notice.isForAll ? "All Employees" : "Personal"}
            </div>
          </div>
        `;
      })
      .join("");
    notificationsList.innerHTML = notificationsHtml;
    // Add click handlers to mark as read
    document.querySelectorAll(".notice-item").forEach((item) => {
      item.addEventListener("click", async function () {
        const noticeId = this.dataset.noticeId;
        await markNotificationAsRead(noticeId);
        this.classList.remove("unread");
      });
    });
    // Update notification badge
    updateNotificationBadge(data.notifications);
  } catch (err) {
    notificationsList.innerHTML = '<div class="no-notifications">Error loading notifications</div>';
  }
}

// --- Mark notification as read in backend ---
async function markNotificationAsRead(noticeId) {
  try {
    const token = localStorage.getItem("jwtToken");
    await fetch(`/api/notifications/${noticeId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    // Ignore errors for now
  }
}

// --- Update notification badge using backend data ---
async function updateNotificationBadge(notificationsData) {
  let notifications = notificationsData;
  if (!notifications) {
    // If not provided, fetch from backend
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.notifications)) return;
      notifications = data.notifications;
    } catch {
      return;
    }
  }
  const currentEmployee = JSON.parse(localStorage.getItem("employee"));
  const unreadCount = notifications.filter(
    (notice) =>
      (notice.isForAll || notice.recipientId === currentEmployee.employeeId) &&
      !notice.readBy.includes(currentEmployee.employeeId)
  ).length;
  const badge = document.getElementById("notificationBadge");
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
}

// --- On page load, fetch recent notices and notifications from backend ---
loadRecentNotices();
updateNotificationBadge();

// --- Digital ID Card and Edit Profile in Main Content ---
function showProfileInMainContent() {
//   // console.log("showProfileInMainContent called"); // Debug log
//   // try {
//   //   const emp = JSON.parse(localStorage.getItem("employee"));
//   //   console.log("Employee data:", emp); // Debug log
//   //   const mainContent = document.getElementById("mainContent");
//   //   console.log("Main content element:", mainContent); // Debug log
//   //   // Save previous content to restore on clear
//   //   const previousContent = mainContent.innerHTML;
//   //   console.log("About to set innerHTML"); // Debug log
//   //   mainContent.innerHTML = `
//   //   <div class="digital-id-card-outer">
//   //     <div class="digital-id-card-modern">
//   //       <div class="digital-id-card-header">
//   //         <img src="images/logo.png" alt="Company Logo" class="digital-id-card-logo" />
//   //         <span class="digital-id-card-company">AssignoPedia</span>
//   //       </div>
//   //       <div class="digital-id-card-photo-section">
//   //         <img src="${emp && emp._id ? `/api/employees/${emp._id}/profile-image` : "/images/logo.png"}" alt="Profile" class="digital-id-card-photo" onerror="this.src='/images/logo.png'" />
//   //       </div>
//   //       <div class="digital-id-card-info">
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Name:</span> <span>${emp.firstName || ""} ${emp.lastName || ""}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Employee ID:</span> <span>${emp.employeeId}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Role:</span> <span>${emp.role}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Email:</span> <span>${emp.email || "-"}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Mobile:</span> <span>${emp.mobile || "-"}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Date of Joining:</span> <span>${emp.doj ? new Date(emp.doj).toLocaleDateString() : "-"}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">Address:</span> <span>${emp.address || "-"}</span></div>
//   //         <div class="digital-id-card-row"><span class="digital-id-label">ID Card:</span> <span>${emp.idCardType ? emp.idCardType.toUpperCase() : "-"} ${emp.idCardNumber || ""}</span></div>
//   //       </div>
//   //       <button id="clearDigitalCardBtn" class="digital-id-clear-btn">Clear</button>
//   //     </div>
//   //   </div>
//   //   <style>
//   //     .digital-id-card-outer {
//   //       display: flex;
//   //       justify-content: center;
//   //       align-items: center;
//   //       min-height: 70vh;
//   //       background: linear-gradient(135deg, #f8fafc 0%, #e0c3fc 100%);
//   //       padding: 2rem 0;
//   //     }
//   //     .digital-id-card-modern {
//   //       background: linear-gradient(135deg, #fff 60%, #e0c3fc 100%);
//   //       border-radius: 22px;
//   //       box-shadow: 0 8px 32px rgba(67,206,162,0.13), 0 3px 16px rgba(118,75,162,0.13);
//   //       padding: 2.5rem 2.2rem 2.2rem 2.2rem;
//   //       max-width: 390px;
//   //       width: 100%;
//   //       color: #2d2350;
//   //       position: relative;
//   //       display: flex;
//   //       flex-direction: column;
//   //       align-items: center;
//   //       border: 2.5px solid #764ba2;
//   //       font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
//   //       animation: fadeInCard 0.7s cubic-bezier(.77,0,.18,1);
//   //     }
//   //     @keyframes fadeInCard {
//   //       from { opacity: 0; transform: translateY(30px); }
//   //       to { opacity: 1; transform: none; }
//   //     }
//   //     .digital-id-card-header {
//   //       display: flex;
//   //       align-items: center;
//   //       gap: 0.7rem;
//   //       margin-bottom: 1.2rem;
//   //     }
//   //     .digital-id-card-logo {
//   //       width: 54px;
//   //       height: 54px;
//   //       object-fit: contain;
//   //       border-radius: 10px;
//   //       background: #fff;
//   //       border: 1.5px solid #764ba2;
//   //       box-shadow: 0 2px 8px rgba(67,206,162,0.10);
//   //     }
//   //     .digital-id-card-company {
//   //       font-size: 1.7rem;
//   //       font-weight: bold;
//   //       color: #764ba2;
//   //       letter-spacing: 1px;
//   //       font-family: 'Pacifico', 'Poppins', cursive, sans-serif;
//   //       text-shadow: 0 2px 8px rgba(67,206,162,0.10);
//   //     }
//   //     .digital-id-card-photo-section {
//   //       display: flex;
//   //       justify-content: center;
//   //       align-items: center;
//   //       margin-bottom: 1.2rem;
//   //     }
//   //     .digital-id-card-photo {
//   //       width: 100px;
//   //       height: 100px;
//   //       border-radius: 50%;
//   //       object-fit: cover;
//   //       border: 3px solid #764ba2;
//   //       box-shadow: 0 2px 12px rgba(118,75,162,0.13);
//   //       background: #fff;
//   //     }
//   //     .digital-id-card-info {
//   //       width: 100%;
//   //       margin-top: 0.5rem;
//   //       margin-bottom: 1.5rem;
//   //     }
//   //     .digital-id-card-row {
//   //       display: flex;
//   //       justify-content: space-between;
//   //       margin-bottom: 0.7rem;
//   //       font-size: 1.13rem;
//   //       font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
//   //       letter-spacing: 0.01em;
//   //     }
//   //     .digital-id-label {
//   //       font-weight: 600;
//   //       color: #764ba2;
//   //       margin-right: 0.5rem;
//   //       font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
//   //     }
//   //     .digital-id-clear-btn {
//   //       margin-top: 1.7rem;
//   //       padding: 12px 38px;
//   //       font-size: 1.13rem;
//   //       background: linear-gradient(90deg, #764ba2, #43cea2);
//   //       color: #fff;
//   //       border: none;
//   //       border-radius: 12px;
//   //       box-shadow: 0 2px 8px rgba(67,206,162,0.13);
//   //       font-weight: 600;
//   //       cursor: pointer;
//   //       transition: background 0.2s, box-shadow 0.2s;
//   //       font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
//   //     }
//   //     .digital-id-clear-btn:hover {
//   //       background: linear-gradient(90deg, #43cea2, #764ba2);
//   //       box-shadow: 0 4px 16px rgba(67,206,162,0.18);
//   //     }
//   //     @media (max-width: 600px) {
//   //       .digital-id-card-modern {
//   //         padding: 1.2rem 0.5rem;
//   //         max-width: 99vw;
//   //       }
//   //       .digital-id-card-header { gap: 0.4rem; }
//   //       .digital-id-card-logo { width: 38px; height: 38px; }
//   //       .digital-id-card-company { font-size: 1.1rem; }
//   //       .digital-id-card-photo { width: 60px; height: 60px; }
//   //       .digital-id-card-row { font-size: 0.98rem; }
//   //     }
//   //   </style>
//   // `;
//   // // Add clear button logic
//   // const clearBtn = document.getElementById("clearDigitalCardBtn");
//   // if (clearBtn) {
//   //   clearBtn.onclick = function () {
//   //     mainContent.innerHTML = previousContent;
//   //   };
//   // }
//   // console.log("showProfileInMainContent completed successfully"); // Debug log
//   // } catch (error) {
//   //   console.error("Error in showProfileInMainContent:", error); // Debug log
//   // }
//   console.log("🔍 showProfileInMainContent() was triggered");
 mainContent = document.getElementById("mainContent");
  const employee = JSON.parse(localStorage.getItem("employee"));
  if (!employee) return;

  const cardHTML = `
        <div class="digital-id-card">
      <div class="card-header">
        <img src="/images/logo.png" alt="Company Logo" class="company-logo">
        <h2>Employee ID Card</h2>
          </div>
      <div class="card-body">
        <div class="profile-pic">
          <img src="${employee && employee._id ? `/api/employees/${employee._id}/profile-image` : "/images/logo.png"}" alt="Profile" onerror="this.src='/images/logo.png'">
          </div>
        <div class="info">
          <h3>${employee.name}</h3>
          <p><strong>ID:</strong> ${employee.employeeId}</p>
          <p><strong>Email:</strong> ${employee.email}</p>
          <p><strong>Role:</strong> ${employee.role}</p>
          <p><strong>Mobile:</strong> ${employee.mobile}</p>
          <p><strong>DOJ:</strong> ${new Date(employee.doj).toLocaleDateString()}</p>
          <p><strong>ID Proof:</strong> ${employee.idCardType || "-"} (${employee.idCardNumber || "N/A"})</p>
          </div>
        </div>
      <div class="card-footer">
        <button class="clear-btn" onclick="window.location.reload()">Clear</button>
      </div>
    </div>
  `;

  mainContent.innerHTML = cardHTML; 
  console.log("🔍 showProfileInMainContent completed successfully");
 }

 window.showProfileInMainContent = showProfileInMainContent;
// --- Show digital card in main-content and allow restoring previous section ---

// Load Manage Employee Account
function loadManageEmployee() {
  if (!isAdminRole && !isHRRole) {
    alert("Access denied. Only administrators and HR personnel can manage employee accounts.");
    return;
  }
  setActive("btn-manage-employee");
  mainContent.innerHTML = `
    <div class="manage-employee-container">
      <h2>Manage Employee Account</h2>
      <form id="manageEmployeeForm">
        <div class="form-group">
          <label for="searchEmployeeName">Search by Name</label>
          <input type="text" id="searchEmployeeName" placeholder="Type employee name..." autocomplete="off" />
          <div id="nameSearchDropdown" class="search-dropdown" style="position:relative;"></div>
        </div>
        <div class="form-group">
          <label for="searchEmployeeId">Search Employee ID</label>
          <input type="text" id="searchEmployeeId" placeholder="Enter Employee ID to search" required />
        </div>
        <div class="button-group">
          <button type="button" class="search-btn" onclick="searchEmployee()">Search Employee</button>
          <button type="button" class="clear-btn" onclick="clearManageForm()">Clear</button>
        </div>
        <hr />
        <div id="employeeDetailsSection" style="display: none;">
          <div class="form-row">
            <div class="form-group">
              <label>Employee ID</label>
              <input type="text" name="employeeId" id="editEmployeeId" readonly />
            </div>
            <div class="form-group">
              <label>First Name</label>
              <input type="text" name="firstName" id="editFirstName" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" name="lastName" id="editLastName" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" id="editEmail" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Mobile</label>
              <input type="text" name="mobile" id="editMobile" />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select name="role" id="editRole">
                <option value="junior_developer">Junior Developer</option>
                <option value="senior_developer">Senior Developer</option>
                <option value="junior_writer">Junior Writer</option>
                <option value="senior_writer">Senior Writer</option>
                <option value="team_leader">Team Leader</option>
                <option value="bdm">B D M</option>
                <option value="hr_recruiter">HR Recruiter</option>
                <option value="hr_executive">HR Executive</option>
                <option value="hr_manager">HR Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Address</label>
              <textarea name="address" id="editAddress" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Date of Joining</label>
              <input type="date" name="doj" id="editDoj" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ID Card Type</label>
              <select name="idCardType" id="editIdCardType">
                <option value="">Select ID Card Type</option>
                <option value="aadhar">Aadhar Card</option>
                <option value="pan">PAN Card</option>
                <option value="passport">Passport</option>
                <option value="driving">Driving License</option>
                <option value="voter">Voter ID</option>
              </select>
            </div>
            <div class="form-group">
              <label>ID Card Number</label>
              <input type="text" name="idCardNumber" id="editIdCardNumber" />
            </div>
          </div>
          <div class="button-group">
            <button type="button" class="cancel-btn" onclick="clearManageForm()">Cancel</button>
            <button type="submit" class="update-btn">Update Employee</button>
          </div>
        </div>
        <div id="manageEmployeeMsg"></div>
      </form>
    </div>
  `;
  attachManageEmployeeNameSearch();

  const style = document.createElement("style");
  style.textContent = `
    .manage-employee-container {
      background: linear-gradient(135deg, #c0b8f0, #dfc8f7);
      padding: 30px;
      border-radius: 15px;
      width: 600px;
      margin: 40px auto;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
      color: #333;
    }
    .manage-employee-container h2 {
      font-size: 22px;
      margin-bottom: 20px;
      color: #000;
      text-align: center;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 5px;
      color: #333;
    }
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 10px;
      background: #f4f4fc;
      outline: none;
      font-size: 15px;
      box-sizing: border-box;
    }
    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }
    .form-group input[readonly] {
      background-color: #e4e4fa;
      font-weight: bold;
      color: #666;
    }
    .form-row {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }
    .form-row .form-group {
      flex: 1;
      margin-bottom: 0;
    }
    hr {
      margin: 25px 0;
      border: 0;
      border-top: 1px solid #b3a9e4;
    }
    .button-group {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      gap: 15px;
    }
    .search-btn,
    .cancel-btn,
    .update-btn {
      padding: 12px 24px;
      font-weight: bold;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    .search-btn {
      background: linear-gradient(90deg, #6f42c1, #4dd0a9);
      color: white;
      flex: 1;
    }
    .search-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
    }
    .cancel-btn {
      background-color: #f3eaff;
      color: #7a42f4;
      flex: 1;
    }
    .cancel-btn:hover {
      background-color: #e8d5ff;
    }
    .update-btn {
      background: linear-gradient(90deg, #28a745, #20c997);
      color: white;
      flex: 1;
    }
    .update-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    #manageEmployeeMsg {
      margin-top: 15px;
      padding: 10px;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
    }
    @media (max-width: 768px) {
      .manage-employee-container {
        width: 85%;
        margin: 20px auto;
        padding: 20px;
      }
      .form-row {
        flex-direction: column;
        gap: 10px;
      }
      .button-group {
        flex-direction: row;
      }
      .search-btn,
      .cancel-btn,
      .update-btn {
        width: 100%;
      }
    }
    @media (max-width: 480px) {
      .manage-employee-container {
        padding: 15px;
        height:70vh
      }
      .manage-employee-container h2 {
        font-size: 20px;
      }
      .form-group input,
      .form-group select,
      .form-group textarea {
        padding: 8px 10px;
        font-size: 14px;
      }
    }
  `;
  document.head.appendChild(style);

  document.getElementById("manageEmployeeForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    await updateEmployee();
  });

  setLogoutListener();
  injectProfileSidebar();
}

window.searchEmployee = async function() {
  const employeeId = document.getElementById("searchEmployeeId").value.trim();
  if (!employeeId) {
    showManageEmployeeMsg("Please enter an Employee ID", "error");
    return;
  }

  try {
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(`/api/employees`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    
    if (data.success && Array.isArray(data.employees)) {
      const employee = data.employees.find(
        (emp) => emp.employeeId && emp.employeeId.toLowerCase() === employeeId.toLowerCase()
      );
      
      if (employee) {
        populateEmployeeForm(employee);
        showManageEmployeeMsg("Employee found successfully!", "success");
      } else {
        showManageEmployeeMsg("No employee found with this ID", "error");
        document.getElementById("employeeDetailsSection").style.display = "none";
      }
    } else {
      showManageEmployeeMsg("Failed to fetch employee data", "error");
    }
  } catch (err) {
    showManageEmployeeMsg("Error searching employee", "error");
  }
};

window.populateEmployeeForm = function(employee) {
  document.getElementById("editEmployeeId").value = employee.employeeId || "";
  document.getElementById("editFirstName").value = employee.firstName || "";
  document.getElementById("editLastName").value = employee.lastName || "";
  document.getElementById("editEmail").value = employee.email || "";
  document.getElementById("editMobile").value = employee.mobile || "";
  document.getElementById("editRole").value = employee.role || "";
  document.getElementById("editAddress").value = employee.address || "";
  document.getElementById("editDoj").value = employee.doj ? employee.doj.split('T')[0] : "";
  document.getElementById("editIdCardType").value = employee.idCardType || "";
  document.getElementById("editIdCardNumber").value = employee.idCardNumber || "";
  
  document.getElementById("employeeDetailsSection").style.display = "block";
};

window.updateEmployee = async function() {
  const employeeId = document.getElementById("editEmployeeId").value;
  if (!employeeId) {
    showManageEmployeeMsg("No employee selected", "error");
    return;
  }

  const formData = new FormData();
  formData.append("firstName", document.getElementById("editFirstName").value);
  formData.append("lastName", document.getElementById("editLastName").value);
  formData.append("email", document.getElementById("editEmail").value);
  formData.append("mobile", document.getElementById("editMobile").value);
  formData.append("role", document.getElementById("editRole").value);
  formData.append("address", document.getElementById("editAddress").value);
  formData.append("doj", document.getElementById("editDoj").value);
  formData.append("idCardType", document.getElementById("editIdCardType").value);
  formData.append("idCardNumber", document.getElementById("editIdCardNumber").value);

  try {
    const token = localStorage.getItem("jwtToken");
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await res.json();
    if (data.success) {
      showManageEmployeeMsg("Employee updated successfully!", "success");
      clearManageForm();
    } else {
      showManageEmployeeMsg(data.message || "Failed to update employee", "error");
    }
  } catch (err) {
    showManageEmployeeMsg("Error updating employee", "error");
  }
};

window.clearManageForm = function() {
  document.getElementById("manageEmployeeForm").reset();
  document.getElementById("employeeDetailsSection").style.display = "none";
  showManageEmployeeMsg("", "");
};

window.showManageEmployeeMsg = function(message, type) {
  const msgDiv = document.getElementById("manageEmployeeMsg");
  if (!message) {
    msgDiv.style.display = "none";
    return;
  }
  
  msgDiv.style.display = "block";
  msgDiv.textContent = message;
  msgDiv.style.color = type === "success" ? "#28a745" : "#dc3545";
  msgDiv.style.backgroundColor = type === "success" ? "#d4edda" : "#f8d7da";
  msgDiv.style.border = `1px solid ${type === "success" ? "#c3e6cb" : "#f5c6cb"}`;
};

function showEditProfileInMainContent() {
  const emp = JSON.parse(localStorage.getItem("employee"));
  const mainContent = document.getElementById("mainContent");
  mainContent.innerHTML = `
      <div class="edit-profile-container">
        <div class="admin-content-section centered-section scrollable-form-container" style="max-width: 420px; margin: 2rem auto;">
          <h2>Edit Profile</h2>
          <form id="editProfileFormMain" class="section-form" autocomplete="off">
            <div style="text-align:center;margin-bottom:18px;">
              <img src="${
                emp && emp._id ? `/api/employees/${emp._id}/profile-image` : "/images/logo.png"
              }" alt="Profile" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #764ba2;box-shadow:0 2px 8px rgba(118,75,162,0.10);background:#fff;" onerror="this.src='/images/logo.png'" />
            </div>
            <div class="form-group"><label>First Name</label><input type="text" name="firstName" value="${
              emp.firstName || ""
            }" /></div>
            <div class="form-group"><label>Last Name</label><input type="text" name="lastName" value="${
              emp.lastName || ""
            }" /></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" value="${
              emp.email || ""
            }" /></div>
            <div class="form-group"><label>Mobile</label><input type="text" name="mobile" value="${
              emp.mobile || ""
            }" /></div>
            <div class="form-group"><label>Address</label><textarea name="address">${
              emp.address || ""
            }</textarea></div>
            <div class="form-group"><label>ID Card Type</label><input type="text" name="idCardType" value="${
              emp.idCardType || ""
            }" /></div>
            <div class="form-group"><label>ID Card Number</label><input type="text" name="idCardNumber" value="${
              emp.idCardNumber || ""
            }" /></div>
            <div class="form-group"><label>Date of Joining</label><input type="date" name="doj" value="${
              emp.doj ? new Date(emp.doj).toISOString().slice(0, 10) : ""
            }" /></div>
            <div style="text-align:center;margin-top:12px;"><button type="submit" class="add-employee-btn">Save Changes</button></div>
          </form>
          <div id="editProfileStatusMsg" style="margin-top:1rem;"></div>
        </div>
      </div>
    `;
  document.getElementById("editProfileFormMain").onsubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const updated = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      mobile: form.mobile.value.trim(),
      address: form.address.value.trim(),
      idCardType: form.idCardType.value.trim(),
      idCardNumber: form.idCardNumber.value.trim(),
      doj: form.doj.value,
    };
    const statusMsg = document.getElementById("editProfileStatusMsg");
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await fetch(`/api/employees`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...updated, employeeId: emp.employeeId }),
      });
      const data = await res.json();
      if (data.success) {
        statusMsg.style.color = "green";
        statusMsg.textContent = "Profile updated successfully!";
        // Update localStorage
        const updatedEmp = { ...emp, ...updated };
        localStorage.setItem("employee", JSON.stringify(updatedEmp));
        setTimeout(() => showProfileInMainContent(), 1200);
      } else {
        statusMsg.style.color = "red";
        statusMsg.textContent = data.message || "Failed to update profile.";
      }
    } catch (err) {
      statusMsg.style.color = "red";
      statusMsg.textContent = "Error updating profile.";
    }
  };
}



// --- Show digital card in main-content and allow restoring previous sec

window.approveWFHRequest = approveWFHRequest;
window.rejectWFHRequest = rejectWFHRequest;

// After rendering the table, add this:
setTimeout(() => {
  document.querySelectorAll('.attachment-link').forEach(link => {
    link.addEventListener('click', async function(e) {
      e.preventDefault();
      const id = this.getAttribute('data-id');
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }
      try {
        const response = await fetch(`/api/wfh-requests/${id}/attachment`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch attachment');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      } catch (err) {
        alert('Failed to open attachment.');
      }
    });
  });
}, 0);

// Add badge to Leave Approval button
function updateLeaveApprovalBadge(count) {
  let badge = document.getElementById('leaveApprovalBadge');
  if (!badge) {
    const btn = document.getElementById('btn-leave-approval');
    if (btn) {
      badge = document.createElement('span');
      badge.id = 'leaveApprovalBadge';
      badge.className = 'notification-badge';
      btn.appendChild(badge);
    }
  }
  if (badge) {
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

async function fetchAndUpdateLeaveApprovalBadge() {
  try {
    const token = localStorage.getItem('jwtToken');
    const res = await fetch('/api/leave-unread-count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    updateLeaveApprovalBadge(data.count || 0);
  } catch (err) {
    // Silent fail
  }
}

// Call on page load
fetchAndUpdateLeaveApprovalBadge();

// After approve/reject, call fetchAndUpdateLeaveApprovalBadge()
const origApproveLeaveRequest = window.approveLeaveRequest;
window.approveLeaveRequest = async function(id) {
  await origApproveLeaveRequest(id);
  await fetchAndUpdateLeaveApprovalBadge();
};
const origRejectLeaveRequest = window.rejectLeaveRequest;
window.rejectLeaveRequest = async function(id) {
  await origRejectLeaveRequest(id);
  await fetchAndUpdateLeaveApprovalBadge();
};
// On page load (after login or sidebar render):
const token = localStorage.getItem('jwtToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.role === 'admin' || payload.role === 'hr') {
    fetchAndUpdateLeaveApprovalBadge();
  }
}
// In updateLeaveApprovalBadge:

// ... existing code ...

// --- Add this inside loadManageEmployee after rendering the form ---
function attachManageEmployeeNameSearch() {
  const nameInput = document.getElementById("searchEmployeeName");
  const idInput = document.getElementById("searchEmployeeId");
  const dropdown = document.getElementById("nameSearchDropdown");
  let nameTimeout;
  if (nameInput && idInput && dropdown) {
    nameInput.addEventListener("input", function() {
      clearTimeout(nameTimeout);
      const value = this.value.trim();
      dropdown.innerHTML = "";
      if (value.length < 2) return;
      nameTimeout = setTimeout(async () => {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`/api/employees/search?name=${encodeURIComponent(value)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.employees.length) {
          dropdown.innerHTML = `<div style='position:absolute;z-index:1000;background:#fff;border:1px solid #ccc;width:100%;max-height:180px;overflow:auto;'>${data.employees.map(emp => `<div class='dropdown-item' style='padding:8px;cursor:pointer;' data-id='${emp.employeeId}'>${emp.firstName || emp.name || ''} ${emp.lastName || ''} <span style='color:#764ba2;font-weight:bold;'>(${emp.employeeId})</span></div>`).join('')}</div>`;
          dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.onclick = function(e) {
              idInput.value = this.getAttribute('data-id');
              dropdown.innerHTML = "";
              e.stopPropagation();
            };
          });
        }
      }, 300);
    });
    // Hide dropdown on outside click
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && e.target !== nameInput) {
        dropdown.innerHTML = "";
      }
    });
  }
}
// ... existing code ...
// --- Add this inside loadStats after rendering the form ---
function attachStatsNameSearch(resultDiv) {
  const nameInputStats = document.getElementById("searchEmployeeName");
  const idInputStats = document.getElementById("searchEmployeeId");
  const dropdownStats = document.getElementById("nameSearchDropdown");
  let nameTimeoutStats;
  if (nameInputStats && idInputStats && dropdownStats) {
    nameInputStats.addEventListener("input", function() {
      clearTimeout(nameTimeoutStats);
      const value = this.value.trim();
      dropdownStats.innerHTML = "";
      if (value.length < 2) return;
      nameTimeoutStats = setTimeout(async () => {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`/api/employees/search?name=${encodeURIComponent(value)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.employees.length) {
          dropdownStats.innerHTML = `<div style='position:absolute;z-index:1000;background:#fff;border:1px solid #ccc;width:100%;max-height:180px;overflow:auto;'>${data.employees.map(emp => `<div class='dropdown-item' style='padding:8px;cursor:pointer;' data-id='${emp.employeeId}'>${emp.firstName || emp.name || ''} ${emp.lastName || ''} <span style='color:#764ba2;font-weight:bold;'>(${emp.employeeId})</span></div>`).join('')}</div>`;
          dropdownStats.querySelectorAll('.dropdown-item').forEach(item => {
            item.onclick = function(e) {
              idInputStats.value = this.getAttribute('data-id');
              dropdownStats.innerHTML = "";
              e.stopPropagation();
              fetchEmployeeDetails(this.getAttribute('data-id'), resultDiv);
            };
          });
        }
      }, 300);
    });
    document.addEventListener('click', function(e) {
      if (!dropdownStats.contains(e.target) && e.target !== nameInputStats) {
        dropdownStats.innerHTML = "";
      }
    });
  }
}
// ... existing code ...

// Move this function to top-level and attach to window
window.fetchEmployeeDetails = function(employeeId, resultDiv) {
  // fallback for resultDiv
  if (!resultDiv) {
    resultDiv = document.getElementById("employeeStatsResult");
  }
  if (!employeeId || !resultDiv) {
    if (resultDiv) resultDiv.innerHTML = "";
    return;
  }
  resultDiv.innerHTML = '<div class="loading">Searching...</div>';
  fetch(`/api/employees`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
    },
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.employees)) {
        const found = data.employees.find(
          (emp) => emp.employeeId && emp.employeeId.toLowerCase() === employeeId.toLowerCase()
        );
        if (found) {
          const imgSrc =
            found.profileImage && found._id
              ? `/api/employees/${found._id}/profile-image`
              : "/images/logo.png";
          resultDiv.innerHTML = `
            <div class="employee-card" style="background:rgba(255,255,255,0.13);border-radius:16px;padding:2rem;box-shadow:0 2px 8px rgba(67,206,162,0.10);max-width:900px;margin:0 auto;display:flex;gap:2rem;align-items:center;">
              <img id="empProfileImg" src="${imgSrc}" alt="${
            found.firstName || found.name || ""
          }" style="width:90px;height:90px;border-radius:12px;object-fit:cover;border:2px solid #764ba2;box-shadow:0 2px 8px rgba(118,75,162,0.10);background:#fff;">
              <div style="flex:1;">
                <h3 style="margin-bottom:0.5rem;color:#764ba2;">${
                  found.firstName || found.name || ""
                } ${found.lastName || ""}</h3>
                <p><strong>Employee ID:</strong> ${found.employeeId}</p>
                <p><strong>Role:</strong> ${found.role}</p>
                <p><strong>Email:</strong> ${found.email || "-"}</p>
                <p><strong>Mobile:</strong> ${found.mobile || "-"}</p>
                <p><strong>Date of Joining:</strong> ${
                  found.doj ? new Date(found.doj).toLocaleDateString() : "-"
                }</p>
                <p><strong>Address:</strong> ${found.address || "-"}</p>
                <p><strong>ID Card:</strong> ${
                  found.idCardType ? found.idCardType.toUpperCase() : "-"
                } ${found.idCardNumber || ""}</p>
              </div>
            </div>
          `;
          const img = document.getElementById("empProfileImg");
          if (img) {
            img.onerror = function () {
              this.onerror = null;
              this.src = "/images/logo.png";
            };
          }
        } else {
          resultDiv.innerHTML =
            '<div class="error" style="color:#dc3545;font-weight:bold;">No employee found with this ID.</div>';
        }
      } else {
        resultDiv.innerHTML =
          '<div class="error" style="color:#dc3545;font-weight:bold;">Failed to fetch employee data.</div>';
      }
    })
    .catch(() => {
      resultDiv.innerHTML =
        '<div class="error" style="color:#dc3545;font-weight:bold;">Error searching employee.</div>';
    });
}
