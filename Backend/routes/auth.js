const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

let otpStore = {};

// Send OTP for registration
router.post("/send-otp-email", (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) {
        return res.status(400).json({ success: false, error: "Email and role required." });
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 10 * 60000);
    otpStore[email] = { otp, expires, role };
    transporter.sendMail({
        from: `QuickHire <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Your QuickHire ${role.charAt(0).toUpperCase() + role.slice(1)} Registration OTP`,
        text: `Your OTP for registration is: ${otp}`
    }, (err) => {
        if (err) {
            console.error("Email send failed:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: "OTP sent successfully." });
    });
});

// Verify OTP for registration
router.post("/verify-otp-email", (req, res) => {
    const { email, otp } = req.body;
    const storedOtp = otpStore[email];
    if (storedOtp && storedOtp.otp === otp && new Date() < storedOtp.expires) {
        delete otpStore[email];
        return res.json({ success: true, message: "OTP verified." });
    }
    res.status(400).json({ success: false, error: "Invalid or expired OTP." });
});

// Check username availability
router.get("/check-username/:username", (req, res) => {
    const { username } = req.params;
    const { role } = req.query;
    if (!role) return res.status(400).json({ success: false, error: "Role is required." });
    const tableName = role === 'jobseeker' ? 'jobseekers' : 'recruiters';
    const sql = `SELECT COUNT(*) AS count FROM ${tableName} WHERE username = ?`;
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Database error." });
        res.json({ success: true, available: results[0].count === 0 });
    });
});

// Check company name availability
router.get("/check-company-name/:companyName", (req, res) => {
    const { companyName } = req.params;
    const sql = `SELECT COUNT(*) AS count FROM recruiters WHERE company_name = ?`;
    db.query(sql, [companyName], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Database error." });
        res.json({ success: true, available: results[0].count === 0 });
    });
});

// Check email availability
router.get("/check-email/:email", (req, res) => {
    const { email } = req.params;
    const { role } = req.query;
    if (!role) return res.status(400).json({ success: false, error: "Role is required." });
    const tableName = role === 'jobseeker' ? 'jobseekers' : 'recruiters';
    const sql = `SELECT COUNT(*) AS count FROM ${tableName} WHERE email = ?`;
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Database error." });
        res.json({ success: true, available: results[0].count === 0 });
    });
});

// Jobseeker Registration
router.post("/register/jobseeker", async (req, res) => {
    try {
        const { fullname, username, email, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO jobseekers (fullname, username, email, phone, password) VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [fullname, username, email, phone, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: "Username or email already in use." });
                return res.status(500).json({ success: false, error: "Database error." });
            }
            res.status(201).json({ success: true, id: result.insertId, role: 'jobseeker' });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error." });
    }
});

// Recruiter Registration
router.post("/register/recruiter", upload.single('company_logo'), async (req, res) => {
    try {
        const { administrator_name, username, email, phone, password, company_name } = req.body;
        const companyLogoPath = req.file ? req.file.path : null;
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO recruiters (administrator_name, username, email, phone, password, company_name, company_logo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [administrator_name, username, email, phone, hashedPassword, company_name, companyLogoPath], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: "Username or email already in use." });
                return res.status(500).json({ success: false, error: "Database error." });
            }
            res.status(201).json({ success: true, id: result.insertId, role: 'recruiter' });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error." });
    }
});

// ✅ MODIFIED: Universal Login now includes status in the JWT token
router.post("/login", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ success: false, error: "Username, password, and role are required." });
    }

    const finalizeLogin = async (user, userRole) => {
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }
        
        const tokenPayload = { 
            id: user.id, 
            role: userRole,
            status: user.status || 'approved' // Admins/Jobseekers are always 'approved'
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ success: true, token, role: userRole, id: user.id });
    };

    if (role === 'jobseeker') {
        const sql = `SELECT *, 'approved' as status FROM jobseekers WHERE username = ?`;
        db.query(sql, [username], (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: "Database error." });
            finalizeLogin(rows[0], 'jobseeker');
        });
    } else if (role === 'recruiter') {
        const adminSql = `SELECT *, 'approved' as status FROM admins WHERE username = ?`;
        db.query(adminSql, [username], (err, adminRows) => {
            if (err) return res.status(500).json({ success: false, error: "Database error." });
            if (adminRows.length > 0) {
                finalizeLogin(adminRows[0], 'admin');
            } else {
                const recruiterSql = `SELECT * FROM recruiters WHERE username = ?`;
                db.query(recruiterSql, [username], (err, recruiterRows) => {
                    if (err) return res.status(500).json({ success: false, error: "Database error." });
                    finalizeLogin(recruiterRows[0], 'recruiter');
                });
            }
        });
    }
});

module.exports = router;