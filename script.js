// ------------------ BASE API ------------------
const API = "http://localhost:5000";
const token = localStorage.getItem("token");

// ------------------ AUTH ------------------
// REGISTER
async function register() {
    const name = document.getElementById("reg_name").value;
    const email = document.getElementById("reg_email").value;
    const password = document.getElementById("reg_password").value;

    const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.message;
}

// LOGIN
async function login() {
    const email = document.getElementById("log_email").value;
    const password = document.getElementById("log_password").value;

    const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userName", data.user.name);
        window.location.href = "dashboard.html"; // redirect after login
    } else {
        document.getElementById("message").innerText = data.message;
    }
}

// ------------------ DASHBOARD & EMPLOYEE ------------------
if (token) {
    // Fetch logged-in user
    async function getMe() {
        const res = await fetch(`${API}/api/auth/me`, {
            headers: { "Authorization": "Bearer " + token }
        });
        return await res.json();
    }

    // Dashboard stats
    async function getDashboardStats() {
        const user = await getMe();
        document.getElementById("userName").textContent = user.name;
        document.getElementById("todayStatus").textContent = `Today's Status: ${user.todayStatus || 'Not Checked In'}`;
        document.getElementById("monthlySummary").textContent = `This month: Present: ${user.present || 0}, Absent: ${user.absent || 0}, Late: ${user.late || 0}`;
    }

    // Attendance
    async function checkIn() {
        const res = await fetch(`${API}/api/attendance/checkin`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        alert(data.message || "Checked in!");
        loadAttendance();
    }

    async function checkOut() {
        const res = await fetch(`${API}/api/attendance/checkout`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        alert(data.message || "Checked out!");
        loadAttendance();
    }

    async function loadAttendance() {
        const res = await fetch(`${API}/api/attendance/my-history`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        const tbody = document.querySelector("#attendanceTable tbody");
        tbody.innerHTML = "";
        data.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${a.date}</td><td>${a.checkInTime || '-'}</td><td>${a.checkOutTime || '-'}</td><td>${a.status}</td><td>${a.totalHours || '-'}</td>`;
            tbody.appendChild(tr);
        });
    }

    // Profile
    async function loadProfile() {
        const user = await getMe();
        document.getElementById("name").value = user.name;
        document.getElementById("email").value = user.email;
        document.getElementById("role").value = user.role;
        document.getElementById("employeeId").value = user.employeeId;
        document.getElementById("department").value = user.department;
        document.getElementById("createdAt").value = new Date(user.createdAt).toLocaleDateString();
    }

    document.getElementById("profileForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const res = await fetch(`${API}/api/auth/update-profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({
                name: document.getElementById("name").value,
                department: document.getElementById("department").value
            })
        });
        const data = await res.json();
        alert(data.message || "Profile updated!");
        loadProfile();
    });

    // Password Change
    document.getElementById("passwordForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const current = document.getElementById("currentPassword").value;
        const newPass = document.getElementById("newPassword").value;
        const confirm = document.getElementById("confirmPassword").value;

        if (newPass !== confirm) {
            alert("Passwords do not match!");
            return;
        }

        const res = await fetch(`${API}/api/auth/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        const data = await res.json();
        alert(data.message || "Password updated!");
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
    });

    // Logout
    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        window.location.href = "login.html";
    }

    document.getElementById("checkInBtn")?.addEventListener("click", checkIn);
    document.getElementById("checkOutBtn")?.addEventListener("click", checkOut);

    // Initial load
    loadProfile();
    getDashboardStats();
    loadAttendance();

    // Expose logout globally
    window.logout = logout;
}
