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
        width: 95%;
        margin: 20px auto;
        padding: 20px;
      }
      .form-row {
        flex-direction: column;
        gap: 10px;
      }
      .button-group {
        flex-direction: column;
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

// Make loadManageEmployee globally available
window.loadManageEmployee = loadManageEmployee;

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
// ... existing code ...

// ... existing code ...
// --- Team Management Section ---
let localTeams = [];
let availableMembers = [];
let allEmployees = [];
let leaders = [];
let editingTeamId = null;

async function loadTeamManagement() {
  try {
    // First, create the HTML structure
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
      <div class="admin-content-section team-management-section">
        <h2 style="margin-bottom:20px;"><i class="fas fa-users-cog"></i> Team Management</h2>
        
        <!-- Create Team Form -->
        <div class="team-creation-section" style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.1); border-radius: 12px;">
          <h3 style="margin-bottom: 1rem; color: #764ba2;">Create New Team</h3>
          <form id="createTeamForm" class="section-form" style="width:60vw;">
            <div class="form-group">
              <label for="teamName">Team Name</label>
              <input type="text" id="teamName" name="teamName" required placeholder="Enter team name">
            </div>
            
            <div class="form-group">
              <label for="teamLeader">Team Leader</label>
              <select id="teamLeader" name="teamLeader" required>
                <option value="">Select a team leader</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="teamMembers">Team Members</label>
              <select id="teamMembers" name="teamMembers" multiple style="height: 120px;">
                <option value="">Loading members...</option>
              </select>
              <small style="color: #fff; font-size: 0.9rem;">Hold Ctrl/Cmd to select multiple members</small>
            </div>
            
            <div class="form-row" style="justify-content: flex-start; gap: 1rem;">
              <button type="submit" class="modern-btn" style="background: linear-gradient(90deg, #43cea2, #764ba2); color: white; padding: 0.75rem 2rem; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">
                <i class="fas fa-plus"></i> Create Team
              </button>
            </div>
          </form>
        </div>
        
        <!-- Teams List -->
        <div class="teams-list-section">
          <h3 style="margin-bottom: 1rem; color: #764ba2;">Existing Teams</h3>
          <div id="teamListContainer">
            <div style="color:#888;text-align:center;margin-top:2rem;">Loading teams...</div>
          </div>
        </div>
      </div>
    `;

    const token = localStorage.getItem("jwtToken");
    console.log("Loading team management with token:", token ? "Token exists" : "No token");
    
    // Fetch all employees
    const empRes = await fetch("/api/employees", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Employees response status:", empRes.status);
    const empData = await empRes.json();
    console.log("Employees data:", empData);
    if (empData.success) {
      allEmployees = empData.employees;
      // Filter leaders (eligible for team leadership)
      leaders = allEmployees.filter(emp => emp.role === "team_leader");
      console.log("Found leaders:", leaders.length);
      
      // Debug: Check what roles are in the data
      const roles = [...new Set(allEmployees.map(emp => emp.role))];
      console.log("All roles in data:", roles);
      console.log("Roles that will be excluded:", TEAM_MEMBER_EXCLUDE_ROLES);
      
      const eligibleForTeams = allEmployees.filter(emp => !TEAM_MEMBER_EXCLUDE_ROLES.includes(emp.role));
      console.log("Employees eligible for teams:", eligibleForTeams.length);
      console.log("Eligible employees:", eligibleForTeams.map(emp => `${emp.firstName || emp.name || emp.employeeId} (${emp.role})`));
    } else {
      console.error("Failed to fetch employees:", empData.message);
    }

    // Fetch teams
    const teamsRes = await fetch("/api/teams", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Teams response status:", teamsRes.status);
    const teamsData = await teamsRes.json();
    console.log("Teams data:", teamsData);
    if (teamsData.success) {
      localTeams = teamsData.teams;
      console.log("Loaded teams:", localTeams.length);
    } else {
      console.error("Failed to fetch teams:", teamsData.message);
    }

    // Fetch available members
    const availRes = await fetch("/api/teams/available-members", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Available members response status:", availRes.status);
    const availData = await availRes.json();
    console.log("Available members data:", availData);
    if (availData.success) {
      availableMembers = availData.available;
      console.log("Available members:", availableMembers.length);
    } else {
      console.error("Failed to fetch available members:", availData.message);
    }

    // Update UI
    console.log("Updating team management UI...");
    updateTeamManagementUI();
    renderTeamList();
    setupTeamCreationForm();
    console.log("Team management UI updated successfully");
  } catch (error) {
    console.error("Error loading team management:", error);
    // Show error message in the main content
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
      <div class="admin-content-section team-management-section">
        <h2><i class="fas fa-users-cog"></i> Team Management</h2>
        <div style="color: #dc3545; text-align: center; padding: 2rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Error loading team management. Please try again.</p>
          <button onclick="loadTeamManagement()" style="background: linear-gradient(90deg, #43cea2, #764ba2); color: white; padding: 0.75rem 2rem; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 1rem;">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      </div>
    `;
  }
}
// --- Organization Structure Section ---
async function loadOrganizationStructure() {
  setActive("btn-organization-structure");
  const mainContent = document.getElementById("mainContent");
  mainContent.innerHTML = `<div class="admin-content-section team-management-section" id="org-structure-section">
    <h2 style="margin-bottom:24px;"><i class="fas fa-sitemap"></i> Organization Structure</h2>
    <div id="orgStructureContent" style="display:flex;flex-direction:column;gap:2.5rem;"></div>
  </div>`;

  // Use public endpoints for non-admin/HR users
  if (!isAdminRole && !isHRRole) {
    if (!allEmployees.length) {
      try {
        const empRes = await fetch("/api/employees/public");
        console.log("/api/employees/public status:", empRes.status);
        const empData = await empRes.json();
        console.log("/api/employees/public data:", empData);
        if (empData.success) allEmployees = empData.employees;
        else console.error("Failed to fetch employees (public):", empData.message);
      } catch (err) {
        console.error("Error fetching /api/employees/public:", err);
      }
    }
    if (!localTeams.length) {
      try {
        const teamsRes = await fetch("/api/teams/public");
        console.log("/api/teams/public status:", teamsRes.status);
        const teamsData = await teamsRes.json();
        console.log("/api/teams/public data:", teamsData);
        if (teamsData.success) localTeams = teamsData.teams;
        else console.error("Failed to fetch teams (public):", teamsData.message);
      } catch (err) {
        console.error("Error fetching /api/teams/public:", err);
      }
    }
  } else {
    // Admin/HR: use full endpoints with token
    if (!allEmployees.length) {
      try {
        const token = localStorage.getItem("jwtToken");
        const empRes = await fetch("/api/employees", { headers: { Authorization: `Bearer ${token}` } });
        console.log("/api/employees status:", empRes.status);
        const empData = await empRes.json();
        console.log("/api/employees data:", empData);
        if (empData.success) allEmployees = empData.employees;
        else console.error("Failed to fetch employees:", empData.message);
      } catch (err) {
        console.error("Error fetching /api/employees:", err);
      }
    }
    if (!localTeams.length) {
      try {
        const token = localStorage.getItem("jwtToken");
        const teamsRes = await fetch("/api/teams", { headers: { Authorization: `Bearer ${token}` } });
        console.log("/api/teams status:", teamsRes.status);
        const teamsData = await teamsRes.json();
        console.log("/api/teams data:", teamsData);
        if (teamsData.success) localTeams = teamsData.teams;
        else console.error("Failed to fetch teams:", teamsData.message);
      } catch (err) {
        console.error("Error fetching /api/teams:", err);
      }
    }
  }

  // Group employees by role
  const roleGroups = {
    admin: [],
    hr_recruiter: [],
    bdm: [],
    senior_writer: [],
  };
  allEmployees.forEach(emp => {
    if (emp.role === "admin" || emp.role === "hr_admin") roleGroups.admin.push(emp);
    else if (emp.role === "hr_recruiter" || emp.role === "hr_manager" || emp.role === "hr_executive") roleGroups.hr_recruiter.push(emp);
    else if (emp.role === "bdm") roleGroups.bdm.push(emp);
    else if (emp.role === "senior_writer") roleGroups.senior_writer.push(emp);
  });

  // Card configs for each role
  const roleCards = [
    { key: "admin", label: "Admin", icon: "fa-crown", color: "#ffb347" },
    { key: "hr_recruiter", label: "HR / Recruiter", icon: "fa-user-tie", color: "#43cea2" },
    { key: "bdm", label: "BDM", icon: "fa-chart-line", color: "#764ba2" },
    { key: "senior_writer", label: "Senior Writer", icon: "fa-pen-nib", color: "#ff758c" },
  ];

  // Render role cards
  let html = '<div class="org-roles-row" style="display:flex;flex-wrap:wrap;gap:2rem;justify-content:center;">';
  for (const role of roleCards) {
    if (!roleGroups[role.key].length) continue;
    html += `<div class="org-role-card" style="background:linear-gradient(120deg,${role.color}22,#fff 80%);border-radius:16px;box-shadow:0 2px 12px rgba(67,206,162,0.10);padding:1.5rem 2rem;min-width:220px;max-width:300px;flex:1 1 220px;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:2.2rem;margin-bottom:0.5rem;color:${role.color};"><i class="fas ${role.icon}"></i></div>
      <div style="font-size:1.3rem;font-weight:700;margin-bottom:0.7rem;color:${role.color};">${role.label}</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;width:100%;align-items:center;">
        ${roleGroups[role.key].map(emp => {
          let displayName = "";
          if (emp.firstName || emp.lastName) {
            displayName = `${emp.firstName || ""}${emp.firstName && emp.lastName ? " " : ""}${emp.lastName || ""}`.trim();
          } else {
            displayName = emp.employeeId || "Unknown";
          }
          return `<div style=\"background:linear-gradient(135deg, #667eea, #764ba2);border-radius:8px;padding:0.5rem 1rem;box-shadow:0 1px 4px #764ba211;font-size:1.08rem;font-weight:500;width:100%;text-align:center;\">${displayName}</div>`;
        }).join("")}
      </div>
    </div>`;
  }
  html += '</div>';

  // Teams Section
  html += '<div class="org-teams-section" style="margin-top:2.5rem;">';
  html += '<h3 style="margin-bottom:1.2rem;margin-left:45%;color:#764ba2;"><i class="fas fa-users"></i> Teams</h3>';
  html += '<div class="org-teams-list" style="display:flex;flex-wrap:wrap;gap:1.5rem;justify-content:center;">';
  for (const team of localTeams) {
    // Team leader display name
    let leaderName = "-";
    if (team.team_leader_details) {
      if (team.team_leader_details.firstName || team.team_leader_details.lastName) {
        leaderName = `${team.team_leader_details.firstName || ""}${team.team_leader_details.firstName && team.team_leader_details.lastName ? " " : ""}${team.team_leader_details.lastName || ""}`.trim();
      } else {
        leaderName = team.team_leader_details.employeeId || "Unknown";
      }
    } else if (team.team_leader) {
      leaderName = team.team_leader;
    }
    // Team members display names
    const memberNames = (team.team_members_details || []).map(m => {
      if (m.firstName || m.lastName) {
        return `${m.firstName || ""}${m.firstName && m.lastName ? " " : ""}${m.lastName || ""}`.trim();
      } else {
        return m.employeeId || "Unknown";
      }
    });
    html += `<div class="org-team-card" style="background:linear-gradient(120deg,#e0c3fc22,#fff 80%);border-radius:14px;box-shadow:0 2px 8px rgba(67,206,162,0.10);padding:1.2rem 1rem;min-width:220px;max-width:270px;flex:1 1 220px;display:flex;flex-direction:column;align-items:center;">
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;color:#764ba2;"><i class="fas fa-users"></i> ${team.team_name}</div>
      <div style="font-size:1rem;margin-bottom:0.3rem;color:#800000"><b>Leader:</b> ${leaderName}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;">
        ${memberNames.map(n => `<div style=\"background:linear-gradient(135deg, #667eea, #764ba2);border-radius:6px;padding:0.3rem 0.8rem;box-shadow:0 1px 3px #764ba211;font-size:0.97rem;\">${n}</div>`).join("")}
      </div>
    </div>`;
  }
  html += '</div></div>';

  document.getElementById("orgStructureContent").innerHTML = html;
}
window.loadOrganizationStructure = loadOrganizationStructure;

// Helper to update member select options
function updateMemberSelect(selectEl, selectedIds = []) {
  if (!selectEl) return;
  
  console.log("updateMemberSelect called with selectedIds:", selectedIds);
  console.log("availableMembers count:", availableMembers.length);
  console.log("allEmployees count:", allEmployees.length);
  
  // Only eligible employees (not in excluded roles)
  const eligibleAvailable = availableMembers.filter(m => !TEAM_MEMBER_EXCLUDE_ROLES.includes(m.role));
  const eligibleAll = allEmployees.filter(m => !TEAM_MEMBER_EXCLUDE_ROLES.includes(m.role));
  
  console.log("eligibleAvailable count:", eligibleAvailable.length);
  console.log("eligibleAll count:", eligibleAll.length);
  console.log("TEAM_MEMBER_EXCLUDE_ROLES:", TEAM_MEMBER_EXCLUDE_ROLES);
  
  // Use eligible availableMembers for creation, or eligible all for edit
  const allOptions = [
    ...eligibleAvailable,
    ...eligibleAll.filter(m => selectedIds.includes(m.employeeId) && !eligibleAvailable.some(a => a.employeeId === m.employeeId))
  ];
  
  // Remove duplicates
  const uniqueOptions = Array.from(new Map(allOptions.map(m => [m.employeeId, m])).values());
  
  console.log("final uniqueOptions count:", uniqueOptions.length);
  console.log("uniqueOptions:", uniqueOptions.map(m => `${m.firstName || m.name || m.employeeId} (${m.role})`));
  
  selectEl.innerHTML = uniqueOptions.map(m =>
    `<option value="${m.employeeId}" ${selectedIds.includes(m.employeeId) ? 'selected' : ''}>${m.firstName || m.name || m.employeeId}</option>`
  ).join("");
}

// Update team management UI elements
function updateTeamManagementUI() {
  // Populate leader dropdown
  const leaderSelect = document.getElementById("teamLeader");
  if (leaderSelect) {
    leaderSelect.innerHTML = leaders.map(l => 
      `<option value="${l.employeeId}">${l.firstName || l.name || l.employeeId}</option>`
    ).join("");
  }
  
  // Populate members multi-select
  const memberSelect = document.getElementById("teamMembers");
  if (memberSelect) {
    updateMemberSelect(memberSelect);
  }
}

// Render team list from localTeams
function renderTeamList() {
  
  const container = document.getElementById("teamListContainer");
  if (!container) return;

  if (!localTeams.length) {
    container.innerHTML = '<div style="color:#888;text-align:center;margin-top:2rem;">No teams created yet.</div>';
    return;
  }

  container.innerHTML = `<div class="teams-list-scroll" style="display:flex;flex-wrap:wrap;gap:1.5rem;max-height:400px;overflow-y:auto;">${localTeams.map(team => {
    if (editingTeamId === team._id) {
      // --- EDIT MODE ---
      if (!window._editMembers) window._editMembers = {};
      if (!window._editMembers[team._id]) window._editMembers[team._id] = [...team.team_members];
      const currentMemberIds = window._editMembers[team._id];
      const currentMembers = (team.team_members_details || []).filter(m => currentMemberIds.includes(m.employeeId));
      const eligibleAvailable = availableMembers.filter(m => !TEAM_MEMBER_EXCLUDE_ROLES.includes(m.role));
      const eligibleAll = allEmployees.filter(m => !TEAM_MEMBER_EXCLUDE_ROLES.includes(m.role));
      const addableMembers = [...eligibleAvailable, ...eligibleAll].filter(m => m && m.employeeId && !currentMemberIds.includes(m.employeeId));
      const uniqueAddable = Array.from(new Map(addableMembers.map(m => [m.employeeId, m])).values());
      return `<div class="team-card" style="background:#f8fafc;border-radius:14px;box-shadow:0 2px 8px rgba(67,206,162,0.10);padding:1.5rem 1.2rem;min-width:260px;max-width:320px;flex:1 1 260px;transition:box-shadow 0.2s;">
        <input type="text" id="editTeamName_${team._id}" value="${team.team_name}" style="width:100%;margin-bottom:0.5rem;padding:8px 10px;border-radius:6px;border:1px solid #ccc;font-size:1.1rem;" />
        <div style="margin-bottom:0.7rem;"><strong>Leader:</strong> <select id="editTeamLeader_${team._id}" style="width:100%;padding:6px;border-radius:6px;">${leaders.map(l => `<option value="${l.employeeId}" ${team.team_leader && l.employeeId === team.team_leader ? 'selected' : ''}>${l.firstName || l.name || l.employeeId}</option>`).join('')}</select></div>
        <div style="margin-bottom:0.7rem;"><strong>Members:</strong>
          <div style="margin-bottom:0.5rem;">
            <label style="font-size:0.9rem;color:#666;">Select members to remove:</label>
            <div class="team-selection-buttons">
              <button type="button" class="team-selection-btn" onclick="window.selectAllMembers('${team._id}')">Select All</button>
              <button type="button" class="team-selection-btn" onclick="window.deselectAllMembers('${team._id}')">Deselect All</button>
            </div>
            <div class="team-member-selection">
              ${currentMembers.map(m => `
                <div class="team-member-item">
                  <input type="checkbox" id="remove_${team._id}_${m.employeeId}" value="${m.employeeId}" onchange="window.updateRemoveButtonText('${team._id}')">
                  <label for="remove_${team._id}_${m.employeeId}">${m.firstName || m.name || m.employeeId}</label>
                </div>
              `).join('')}
            </div>
            <button type="button" class="team-remove-btn" onclick="window.removeSelectedMembersFromTeam('${team._id}')">Remove Selected</button>
          </div>
        </div>
        <div style="margin-bottom:0.7rem;">
          <strong>Add Member:</strong>
          <select id="addMemberSelect_${team._id}" style="width:100%;padding:6px;border-radius:6px;">
            <option value="">-- Select to Add --</option>
            ${uniqueAddable.map(m => `<option value="${m.employeeId}">${m.firstName || m.name || m.employeeId}</option>`).join('')}
          </select>
          <button type="button" style="margin-top:0.5rem;background:linear-gradient(90deg,#43cea2,#764ba2);color:#fff;padding:4px 14px;border-radius:7px;font-weight:600;font-size:0.95rem;box-shadow:0 2px 8px rgba(67,206,162,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.addMemberToTeam('${team._id}')">Add</button>
        </div>
        <div class="team-edit-btn-group" style="display:flex;gap:0.2rem;margin-top:1rem;">
          <button class="modern-btn" style="background:linear-gradient(90deg,#43cea2,#764ba2);color:#fff;padding:7px 20px;border-radius:7px;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(67,206,162,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.saveEditTeam('${team._id}')">Save</button>
          <button class="modern-btn" style="background:#6c757d;color:#fff;padding:7px 20px;border-radius:7px;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(108,117,125,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.cancelEditTeam('${team._id}')">Cancel</button>
          <button class="modern-btn" style="background:linear-gradient(90deg,#dc3545,#ff7675);color:#fff;padding:7px 20px;border-radius:7px;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(220,53,69,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.deleteTeam('${team._id}')">Delete Team</button>
        </div>
      </div>`;
    } else {
      // ... existing code for view mode ...
      const teamLeader = leaders.find(l => l.employeeId === team.team_leader);
      return `<div class="team-card" style="background:#f8fafc;border-radius:14px;box-shadow:0 2px 8px rgba(67,206,162,0.10);padding:1.5rem 1.2rem;min-width:260px;max-width:320px;flex:1 1 260px;transition:box-shadow 0.2s;">
        <div style="font-size:1.2rem;font-weight:700;color:#764ba2;margin-bottom:0.5rem;">${team.team_name}</div>
        <div style="margin-bottom:0.7rem;"><strong>Leader:</strong> ${teamLeader ? (teamLeader.firstName || teamLeader.name || teamLeader.employeeId) : team.team_leader}</div>
        <div style="margin-bottom:0.7rem;"><strong>Members:</strong><ul style="margin:0 0 0 1.2rem;padding:0;">${(team.team_members_details || []).map(m => `<li style="margin-bottom:2px;">${m.firstName || m.name || m.employeeId}</li>`).join('')}</ul></div>
        <div style="display:flex;gap:0.7rem;margin-top:1rem;">
          <button class="modern-btn" style="background:linear-gradient(90deg,#ffc107,#ff7675);color:#333;padding:7px 20px;border-radius:7px;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(255,193,7,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.editTeam('${team._id}')">Edit</button>
          <button class="modern-btn" style="background:linear-gradient(90deg,#dc3545,#ff7675);color:#fff;padding:7px 20px;border-radius:7px;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(220,53,69,0.10);border:none;cursor:pointer;transition:background 0.2s;" onclick="window.deleteTeam('${team._id}')">Delete</button>
        </div>
      </div>`;
    }
  }).join('')}</div>`;

  // Attach global handlers for edit/save/cancel/delete

}

// Handle team creation (API)
function setupTeamCreationForm() {
  const createTeamForm = document.getElementById("createTeamForm");
  if (createTeamForm) {
    createTeamForm.onsubmit = async function(e) {
      e.preventDefault();
      const teamName = document.getElementById("teamName").value.trim();
      const teamLeaderId = document.getElementById("teamLeader").value;
      const memberIds = Array.from(document.getElementById("teamMembers").selectedOptions).map(opt => opt.value);
      const token = localStorage.getItem("jwtToken");
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ team_name: teamName, team_leader: teamLeaderId, team_members: memberIds })
      });
      const data = await res.json();
      if (data.success) {
        await loadTeamManagement();
        this.reset();
      } else {
        alert(data.message || "Failed to create team");
      }
    };
  }

}
// ... existing code ...
