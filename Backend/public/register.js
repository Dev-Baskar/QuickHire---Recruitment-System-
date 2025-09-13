const API_BASE = "http://localhost:5000/api/auth";

let emailOtpRequested = false;
let emailVerified = false;
let sending = false;

// ✅ NEW: State variables to track validation
let isUsernameAvailable = false;
let isEmailAvailable = false;

const $ = (id) => document.getElementById(id);

// ✅ NEW: Central function to check all conditions
function checkAllConditions() {
    const passwordsMatch = passwordMatches();
    if (isUsernameAvailable && isEmailAvailable && emailVerified && passwordsMatch) {
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

// ✅ MODIFIED: Live Username Check now updates state and calls the central check
$("username").addEventListener("input", async (e) => {
    const username = e.target.value.trim();
    const msgEl = $("usernameMsg");

    if (!username) {
        msgEl.textContent = "";
        isUsernameAvailable = false;
        checkAllConditions();
        return;
    }

    const res = await fetch(`${API_BASE}/check-username/${username}?role=jobseeker`);
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

// ✅ MODIFIED: Live Email Check now updates state, disables Verify button, and calls the central check
$("email").addEventListener("input", async (e) => {
    const email = e.target.value.trim();
    const msgEl = $("emailMsg");
    const sendOtpBtn = $("sendOtpBtn");

    // Reset verification status when email changes
    emailVerified = false;
    $("otpWrap").style.display = 'none';

    if (!email || !validateEmail(email)) {
        msgEl.textContent = "";
        isEmailAvailable = false;
        sendOtpBtn.disabled = true; // Disable if email is invalid
        checkAllConditions();
        return;
    }

    const res = await fetch(`${API_BASE}/check-email/${encodeURIComponent(email)}?role=jobseeker`);
    const data = await res.json();

    if (data.available) {
        msgEl.textContent = "";
        isEmailAvailable = true;
        sendOtpBtn.disabled = false; // Enable if email is available
    } else {
        msgEl.textContent = "❌ An account with this email already exists.";
        msgEl.style.color = "red";
        isEmailAvailable = false;
        sendOtpBtn.disabled = true; // Disable if email is taken
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
    const role = 'jobseeker';

    if (!validateEmail(email)) {
        setOtpMessage("⚠️ Enter a valid email address.", "bad");
        $("otpWrap").style.display = "block";
        return;
    }

    sending = true;
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        const res = await fetch(`${API_BASE}/send-otp-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role })
        });
        const data = await res.json();
        $("otpWrap").style.display = "block";

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
            // Re-enable button only if the email is still valid and available
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
    if (!emailOtpRequested || !emailVerified) {
        showPopup("Please verify your email first.", "bad");
        return;
    }
    if (!passwordMatches()) {
        showPopup("Passwords do not match.", "bad");
        return;
    }

    const payload = {
        fullname: $("fullname").value.trim(),
        username: $("username").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value.trim(),
        password: $("password").value,
    };

    const res = await fetch(`${API_BASE}/register/jobseeker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
        showPopup("You successfully register, now you login.", "ok");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } else {
        showPopup("❌ Registration failed: " + (data.error || "Unknown error"), "bad");
    }
}

// ✅ MODIFIED: Password check now calls the central check function
function checkPasswordMatch() {
    const password = $("password").value;
    const confirmPassword = $("confirmPassword").value;
    const msgEl = $("passwordMatchMsg");
    
    if (confirmPassword === "") {
        msgEl.textContent = "";
        checkAllConditions();
        return;
    }

    if (password === confirmPassword) {
        msgEl.textContent = "✅ Passwords match";
        msgEl.style.color = 'green';
    } else {
        msgEl.textContent = "❌ Passwords do not match";
        msgEl.style.color = 'red';
    }
    checkAllConditions();
}

$("password").addEventListener("input", checkPasswordMatch);
$("confirmPassword").addEventListener("input", checkPasswordMatch);

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

// Initial state check
window.onload = () => {
    $("sendOtpBtn").disabled = true;
    checkAllConditions();
};


window.sendEmailOTP = sendEmailOTP;
window.register = register;
window.togglePasswordVisibility = togglePasswordVisibility;