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