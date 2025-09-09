const API_BASE = "http://localhost:5000/api/auth";

let emailOtpRequested = false;
let emailVerified = false;
let sending = false;

const $ = (id) => document.getElementById(id);

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

// ✅ Live Username Check
$("username").addEventListener("input", async (e) => {
  const username = e.target.value.trim();
  const msgEl = $("usernameMsg");

  if (!username) {
    msgEl.textContent = "";
    return;
  }

  const res = await fetch(`${API_BASE}/check-username/${username}`);
  const data = await res.json();

  if (data.available) {
    msgEl.textContent = "✔ Username is available";
    msgEl.style.color = "green";
  } else {
    msgEl.textContent = "❌ Username is already taken";
    msgEl.style.color = "red";
  }
});

// ✅ Live Email Check
$("email").addEventListener("input", async (e) => {
  const email = e.target.value.trim();
  const msgEl = $("emailMsg");

  if (!email) {
    msgEl.textContent = "";
    return;
  }

  const res = await fetch(`${API_BASE}/check-email/${email}`);
  const data = await res.json();

  if (data.available) {
    msgEl.textContent = "";
  } else {
    msgEl.textContent = "❌ You already have an account";
    msgEl.style.color = "red";
  }
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
    if (passwordMatches()) setRegisterEnabled(true);
  } else {
    emailVerified = false;
    setOtpMessage("❌ Wrong OTP", "bad");
    setRegisterEnabled(false);
  }
}

async function sendEmailOTP() {
  if (sending) return;
  const btn = $("sendOtpBtn");
  const email = $("email").value.trim();

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
      body: JSON.stringify({ email })
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
      btn.disabled = false;
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
    alert("Please verify your email first.");
    return;
  }
  if (!passwordMatches()) {
    alert("Passwords do not match.");
    return;
  }

  const payload = {
    companyName: $("companyName").value.trim(),
    adminName: $("adminName").value.trim(),
    username: $("username").value.trim(),
    phone: $("phone").value.trim(),
    email: $("email").value.trim(),
    password: $("password").value,
    role: "recruiter"
  };

  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.success) {
    alert("🎉 Registration successful! Please log in.");
    window.location.href = "login.html";
  } else {
    alert("❌ Registration failed: " + (data.error || "Unknown error"));
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
    const password = $("password").value;
    const confirmPassword = $("confirmPassword").value;
    const msgEl = $("passwordMatchMsg");
    const registerBtn = $("registerBtn");

    if (password === "" || confirmPassword === "") {
        msgEl.textContent = "";
        registerBtn.disabled = true;
        return;
    }

    if (password === confirmPassword) {
        msgEl.textContent = "✅ Password is matched";
        msgEl.classList.remove("bad");
        msgEl.classList.add("ok");
        if (emailVerified) {
            registerBtn.disabled = false;
        }
    } else {
        msgEl.textContent = "❌ Password is not match";
        msgEl.classList.remove("ok");
        msgEl.classList.add("bad");
        registerBtn.disabled = true;
    }
}
$("password").addEventListener("input", checkPasswordMatch);
$("confirmPassword").addEventListener("input", checkPasswordMatch);

window.sendEmailOTP = sendEmailOTP;
window.register = register;
window.togglePasswordVisibility = togglePasswordVisibility;