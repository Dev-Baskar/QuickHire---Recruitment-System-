const API_BASE = "http://localhost:5000/api/auth";

let emailOtpRequested = false;
let emailVerified = false;
let sending = false;

// State variables to track all validation statuses
let isCompanyNameAvailable = false;
let isUsernameAvailable = false;
let isEmailAvailable = false;

const $ = (id) => document.getElementById(id);

// Central function to check if all conditions are met
function checkAllConditions() {
    // 1. Check if all required text fields are filled
    const companyName = $("companyName").value.trim();
    const adminName = $("adminName").value.trim();
    const username = $("username").value.trim();
    const phone = $("phone").value.trim();
    const email = $("email").value.trim();
    const allFieldsFilled = companyName && adminName && username && phone && email;

    // 2. Check all other conditions
    const passwordsMatch = passwordMatches();
    
    if (
        allFieldsFilled &&
        isCompanyNameAvailable &&
        isUsernameAvailable &&
        isEmailAvailable &&
        emailVerified &&
        passwordsMatch
    ) {
        setRegisterEnabled(true);
    } else {
        setRegisterEnabled(false);
    }
}


function showPopup(message, type = "ok") {
    const popup = document.getElementById("popup");
    popup.innerText = message;
    popup.className = `popup show ${type}`;
    setTimeout(() => {
        popup.classList.remove("show");
    }, 3000);
}

// Event listener for Company Logo Preview
$("companyLogo").addEventListener("change", (event) => {
    const preview = $("logoPreview");
    const icon = preview.querySelector("i");
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onloadend = function () {
        preview.style.backgroundImage = `url(${reader.result})`;
        if (icon) {
            icon.style.display = 'none';
        }
    }

    if (file) {
        reader.readAsDataURL(file);
    } else {
        preview.style.backgroundImage = 'none';
        if (icon) {
            icon.style.display = 'block';
        }
    }
});

// Event listener for real-time Company Name validation
$("companyName").addEventListener("input", async (e) => {
    const companyName = e.target.value.trim();
    const msgEl = $("companyNameMsg");

    if (!companyName) {
        msgEl.textContent = "";
        isCompanyNameAvailable = false;
        checkAllConditions();
        return;
    }

    const res = await fetch(`${API_BASE}/check-company-name/${encodeURIComponent(companyName)}`);
    const data = await res.json();

    if (data.available) {
        msgEl.textContent = "✔ Company name is available";
        msgEl.style.color = "green";
        isCompanyNameAvailable = true;
    } else {
        msgEl.textContent = "❌ This company is already registered";
        msgEl.style.color = "red";
        isCompanyNameAvailable = false;
    }
    checkAllConditions();
});

function setOtpMessage(msg, type) {
    const el = $("otpMsg");
    el.textContent = msg || "";
    el.className = "otp-msg " + (type === "ok" ? "ok" : type === "bad" ? "bad" : "");
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function passwordMatches() {
    const password = $("password").value;
    const confirmPassword = $("confirmPassword").value;
    return password.length > 0 && password === confirmPassword;
}

function setRegisterEnabled(enabled) {
    $("registerBtn").disabled = !enabled;
}

// Live Username Check for RECRUITERS only
$("username").addEventListener("input", async (e) => {
    const username = e.target.value.trim();
    const msgEl = $("usernameMsg");

    if (!username) {
        msgEl.textContent = "";
        isUsernameAvailable = false;
        checkAllConditions();
        return;
    }
    
    const res = await fetch(`${API_BASE}/check-username/${username}?role=recruiter`);
    const data = await res.json();

    if (data.available) {
        msgEl.textContent = "✔ Username is available";
        msgEl.style.color = "green";
        isUsernameAvailable = true;
    } else {
        msgEl.textContent = "❌ Username is already taken";
        msgEl.style.color = "red";
        isUsernameAvailable = false;
    }
    checkAllConditions();
});

// Live Email Check for RECRUITERS only
$("email").addEventListener("input", async (e) => {
    const email = e.target.value.trim();
    const msgEl = $("emailMsg");
    const sendOtpBtn = $("sendOtpBtn");

    emailVerified = false;
    $("otpWrap").style.display = 'none';

    if (!email || !validateEmail(email)) {
        msgEl.textContent = "";
        isEmailAvailable = false;
        sendOtpBtn.disabled = true;
        checkAllConditions();
        return;
    }

    const res = await fetch(`${API_BASE}/check-email/${encodeURIComponent(email)}?role=recruiter`);
    const data = await res.json();

    if (data.available) {
        msgEl.textContent = "";
        isEmailAvailable = true;
        sendOtpBtn.disabled = false;
    } else {
        msgEl.textContent = "❌ An account with this email already exists.";
        msgEl.style.color = "red";
        isEmailAvailable = false;
        sendOtpBtn.disabled = true;
    }
    checkAllConditions();
});

function wireOtpInputs() {
    const inputs = Array.from(document.querySelectorAll("#otpInputs input"));
    inputs.forEach((inp, idx) => {
        inp.value = "";
        inp.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            if (e.target.value.length === 1 && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
            maybeVerifyOtp();
        });

        inp.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !inp.value && idx > 0) {
                inputs[idx - 1].focus();
            }
        });

        inp.addEventListener("paste", (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text");
            if (!/^\d{4}$/.test(text)) return;
            for (let i = 0; i < 4; i++) {
                inputs[i].value = text[i];
            }
            maybeVerifyOtp();
        });
    });
    inputs[0].focus();
}

function collectedOtp() {
    return Array.from(document.querySelectorAll("#otpInputs input")).map(i => i.value).join("");
}

async function maybeVerifyOtp() {
    const otp = collectedOtp();
    if (otp.length !== 4) return;

    const email = $("email").value.trim();
    const res = await fetch(`${API_BASE}/verify-otp-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    const data = await res.json();

    if (data.success) {
        emailVerified = true;
        setOtpMessage("✅ OTP Verified", "ok");
    } else {
        emailVerified = false;
        setOtpMessage("❌ Wrong OTP", "bad");
    }
    checkAllConditions();
}

async function sendEmailOTP() {
    if (sending) return;
    const btn = $("sendOtpBtn");
    const email = $("email").value.trim();

    if (!validateEmail(email)) {
        setOtpMessage("⚠️ Enter a valid email address.", "bad");
        $("otpWrap").style.display = "flex"; 
        return;
    }

    sending = true;
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        const res = await fetch(`${API_BASE}/send-otp-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role: "recruiter" })
        });
        const data = await res.json();
        $("otpWrap").style.display = "flex"; 

        if (data.success) {
            setOtpMessage("📩 OTP sent to your email.", "ok");
            emailOtpRequested = true;
            wireOtpInputs();
            startResendCooldown(btn, 60);
        } else {
            setOtpMessage("❌ Failed to send OTP.", "bad");
            btn.disabled = false;
            btn.textContent = "Verify";
        }
    } catch {
        setOtpMessage("❌ Network error while sending OTP.", "bad");
        btn.disabled = false;
        btn.textContent = "Verify";
    } finally {
        sending = false;
    }
}

function startResendCooldown(btn, seconds) {
    let left = seconds;
    const tick = () => {
        btn.textContent = `Resend (${left}s)`;
        if (left <= 0) {
            const email = $("email").value.trim();
            btn.disabled = !(validateEmail(email) && isEmailAvailable);
            btn.textContent = "Resend";
            return;
        }
        left--;
        setTimeout(tick, 1000);
    };
    tick();
}

async function register() {
    if ($("registerBtn").disabled) {
        showPopup("Please complete all fields correctly.", "bad");
        return;
    }

    const formData = new FormData();
    const companyLogoInput = $("companyLogo");

    formData.append('company_name', $("companyName").value.trim());
    formData.append('administrator_name', $("adminName").value.trim());
    formData.append('username', $("username").value.trim());
    formData.append('phone', $("phone").value.trim());
    formData.append('email', $("email").value.trim());
    formData.append('password', $("password").value);
    
    if (companyLogoInput.files[0]) {
        formData.append('company_logo', companyLogoInput.files[0]);
    }
    
    const res = await fetch(`${API_BASE}/register/recruiter`, {
        method: "POST",
        body: formData 
    });

    const data = await res.json();
    if (data.success) {
        showPopup("🎉 Registration successful! Redirecting to login...", "ok");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } else {
        showPopup("❌ Registration failed: " + (data.error || "Unknown error"), "bad");
    }
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    }
}

function checkPasswordMatch() {
    const msgEl = $("passwordMatchMsg");
    const passwordsMatchResult = passwordMatches();

    if ($("confirmPassword").value === "") {
        msgEl.textContent = "";
    } else if (passwordsMatchResult) {
        msgEl.textContent = "✅ Passwords match";
        msgEl.style.color = 'green';
    } else {
        msgEl.textContent = "❌ Passwords is not match";
        msgEl.style.color = 'red';
    }
    checkAllConditions();
}

// Add event listeners to text fields to check if they are filled
// MODIFIED: Removed password fields from this generic check
const fieldsToWatch = ["companyName", "adminName", "username", "phone", "email"];
fieldsToWatch.forEach(id => {
    $(id).addEventListener("input", checkAllConditions);
});

// ✅ FIXED: Re-added the specific event listeners for the password fields
$("password").addEventListener("input", checkPasswordMatch);
$("confirmPassword").addEventListener("input", checkPasswordMatch);

// Initial state check
window.onload = () => {
    $("sendOtpBtn").disabled = true;
    checkAllConditions();
};

window.sendEmailOTP = sendEmailOTP;
window.register = register;
window.togglePasswordVisibility = togglePasswordVisibility;