const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

let otpStore = {}; // { email: otp }

// ✅ Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "baskar13008@gmail.com",      // your Gmail
    pass: "pfsgkpxepzptggho"            // your App Password (no spaces)
  }
});

// ✅ Send OTP
router.post("/send-otp-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: "Email required" });

  const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit
  otpStore[email] = otp;

  transporter.sendMail({
    from: "QuickHire <baskar13008@gmail.com>",
    to: email,
    subject: "Your QuickHire OTP",
    text: `Your OTP code is: ${otp}`
  }, (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// ✅ Verify OTP
router.post("/verify-otp-email", (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] && String(otpStore[email]) === String(otp)) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  res.json({ success: false, error: "Invalid OTP" });
});

// ✅ Username availability check
router.get("/check-username/:username", (req, res) => {
  const { username } = req.params;
  db.query("SELECT id FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.json({ available: false });
    res.json({ available: results.length === 0 });
  });
});

// ✅ Email availability check
router.get("/check-email/:email", (req, res) => {
  const { email } = req.params;
  db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.json({ available: false });
    res.json({ available: results.length === 0 });
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
  db.query(sql, [username], async (err, results) => {
    if (err) return res.json({ success: false, error: err });
    if (results.length === 0) return res.json({ success: false, error: "Invalid credentials" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: "Invalid credentials" });

    res.json({ success: true, id: user.id, role: user.role, token: "dummy-token" });
  });
});

module.exports = router;
