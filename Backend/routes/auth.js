const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// OTP store for registration and forgot password
let otpStore = {}; // { email: { otp: string, expires: Date } }

// ✅ Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "baskar13008@gmail.com", // Replace with your Gmail
    pass: "pfsgkpxepzptggho", // Replace with your App Password (no spaces)
  },
});

// ✅ Send OTP for registration
router.post("/send-otp-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: "Email required" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit
  const expires = new Date(Date.now() + 10 * 60000); // 10 minutes expiry
  otpStore[email] = { otp, expires };

  transporter.sendMail({
    from: "QuickHire <baskar13008@gmail.com>",
    to: email,
    subject: "Your QuickHire Registration OTP",
    text: `Your OTP for registration is: ${otp}`
  }, (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// ✅ Verify OTP for registration
router.post("/verify-otp-email", (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore[email];

  if (storedOtp && storedOtp.otp === otp && new Date() < storedOtp.expires) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  res.json({ success: false, error: "Invalid or expired OTP" });
});

// ✅ Username availability check (for registration)
router.get("/check-username/:username", (req, res) => {
  const { username } = req.params;
  const sql = "SELECT COUNT(*) AS count FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true, available: results[0].count === 0 });
  });
});

// ✅ New: Check if username exists (for password reset)
router.get("/check-username-for-reset/:username", (req, res) => {
    const { username } = req.params;
    const sql = "SELECT COUNT(*) AS count FROM users WHERE username = ?";
    db.query(sql, [username], (err, results) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, exists: results[0].count > 0 });
    });
});

// ✅ New: Send OTP for password reset
router.post("/forgot-password-otp", (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: "Username is required." });

  const sql = "SELECT email FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) return res.json({ success: false, error: "Database error." });
    if (results.length === 0) return res.json({ success: false, error: "Username not found." });

    const userEmail = results[0].email;
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    const expires = new Date(Date.now() + 10 * 60000); // 10 minutes expiry
    otpStore[userEmail] = { otp, expires };
    
    const mailOptions = {
      from: "QuickHire <baskar13008@gmail.com>",
      to: userEmail,
      subject: "QuickHire Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email send failed:", error);
        return res.json({ success: false, error: "Failed to send OTP email." });
      } else {
        return res.json({ success: true, message: "OTP sent successfully." });
      }
    });
  });
});

// ✅ New: Verify OTP for password reset
router.post("/verify-otp-for-reset", (req, res) => {
    const { username, otp } = req.body;
    const sql = "SELECT email FROM users WHERE username = ?";
    db.query(sql, [username], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, error: "Username not found." });
        const userEmail = results[0].email;
        const storedOtp = otpStore[userEmail];
        
        if (storedOtp && storedOtp.otp === otp && new Date() < storedOtp.expires) {
            return res.json({ success: true, message: "OTP verified successfully." });
        }
        res.json({ success: false, error: "Invalid or expired OTP." });
    });
});

// ✅ New: Reset password with OTP
router.post("/reset-password", async (req, res) => {
    const { username, newPassword } = req.body;

    const sql = "SELECT email FROM users WHERE username = ?";
    db.query(sql, [username], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, error: "Username not found." });

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = "UPDATE users SET password = ? WHERE username = ?";
        db.query(updateSql, [hashedPassword, username], (updateErr) => {
            if (updateErr) return res.json({ success: false, error: "Password update failed." });
            res.json({ success: true, message: "Password reset successfully." });
        });
    });
});


// ✅ Register (Jobseeker / Recruiter)
router.post("/register", async (req, res) => {
  try {
    const { fullname, username, email, phone, password, role } = req.body;

    if (!fullname || !username || !email || !password) {
      return res.json({ success: false, error: "All required fields must be filled" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO users (fullname, username, email, phone, password, role)
                   VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [fullname, username, email, phone, hashedPassword, role], (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, error: err.sqlMessage || "DB Error" });
      }
      res.json({ success: true, id: result.insertId });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Server error" });
  }
});

// ✅ Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, rows) => {
    if (err) return res.json({ success: false, error: "DB Error" });
    if (rows.length === 0) {
      return res.json({ success: false, error: "Invalid credentials" });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ success: false, error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, "your_secret_key", {
      expiresIn: "1h",
    });
    res.json({
      success: true,
      token,
      role: user.role,
      id: user.id,
    });
  });
});

module.exports = router;