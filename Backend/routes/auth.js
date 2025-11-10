const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
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

// otpStore will now use USERNAME as the key for password resets
let otpStore = {};

// Send OTP for registration
router.post("/send-otp-email", (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) {
        return res.status(400).json({ success: false, error: "Email and role required." });
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 10 * 60000);
    
    // Store by email for registration
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
        delete otpStore[email]; // Clear OTP after use
        return res.json({ success: true, message: "OTP verified." });
    }
    res.status(400).json({ success: false, error: "Invalid or expired OTP." });
});

// Check username availability (Your login.html needs this)
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

// Universal Login with status check
router.post("/login", (req, res) => {
    // ... (Your existing login code is fine, no changes needed here) ...
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
            status: user.status || 'approved'
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ success: true, token, role: userRole, id: user.id, status: user.status });
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

// Admin routes (Your existing code is fine)
router.get('/admin/recruiters/pending', (req, res) => {
    // ... (no changes) ...
    const sql = `SELECT id, company_name, administrator_name, email, phone, company_logo FROM recruiters WHERE status = 'pending'`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: "Database error." });
        }
        res.json({ success: true, pendingRecruiters: results });
    });
});
router.post('/admin/recruiters/update-status', (req, res) => {
    // ... (no changes) ...
    const { id, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status provided." });
    }
    const sql = `UPDATE recruiters SET status = ? WHERE id = ?`;
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: "Database error." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Recruiter not found." });
        }
        res.json({ success: true, message: `Recruiter status updated to ${status}.` });
    });
});


// --- NEW PASSWORD RESET ROUTES ---
// These routes match your login.html's 3-step flow

// STEP 1: Send OTP for password reset (called by your `sendOtp()` function)
router.post("/forgot-password-otp", (req, res) => {
    const { username, role } = req.body;
    if (!username || !role) {
        return res.status(400).json({ success: false, error: "Username and role are required." });
    }

    const tableName = role === 'jobseeker' ? 'jobseekers' : 'recruiters';
    const sql = `SELECT email FROM ${tableName} WHERE username = ?`;

    db.query(sql, [username], (err, users) => {
        if (err) return res.status(500).json({ success: false, error: "Database error." });
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const email = users[0].email;
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 10 * 60000); // 10 minute expiry
        
        // Store OTP by USERNAME
        otpStore[username] = { otp, expires, role, verified: false };

        transporter.sendMail({
            from: `QuickHire <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `Your QuickHire Password Reset OTP`,
            text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
        }, (mailErr) => {
            if (mailErr) {
                console.error("Reset email send failed:", mailErr);
                return res.status(500).json({ success: false, error: "Failed to send email." });
            }
            res.json({ success: true, message: "OTP sent to your registered email." });
        });
    });
});

// STEP 2: Verify OTP (called by your `verifyOtp()` function)
router.post("/verify-otp-for-reset", (req, res) => {
    const { username, otp } = req.body;
    const storedOtpData = otpStore[username];

    if (!storedOtpData) {
        return res.status(400).json({ success: false, error: "Invalid OTP. Please request a new one." });
    }

    if (storedOtpData.otp === otp && new Date() < storedOtpData.expires) {
        otpStore[username].verified = true; // Mark as verified
        return res.json({ success: true, message: "OTP verified." });
    }
    
    res.status(400).json({ success: false, error: "Invalid or expired OTP." });
});

// STEP 3: Reset the password (called by your `resetPassword()` function)
router.post("/reset-password", async (req, res) => {
    const { username, newPassword, role } = req.body;
    const storedOtpData = otpStore[username];

    // Check if user is verified from Step 2
    if (!storedOtpData || !storedOtpData.verified) {
        return res.status(400).json({ success: false, error: "OTP not verified. Please complete the previous step." });
    }
    
    // Check if role matches
    if (storedOtpData.role !== role) {
         return res.status(400).json({ success: false, error: "Role mismatch." });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const tableName = role === 'jobseeker' ? 'jobseekers' : 'recruiters';
        const sql = `UPDATE ${tableName} SET password = ? WHERE username = ?`;

        db.query(sql, [hashedPassword, username], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: "Database error." });
            
            delete otpStore[username]; // Clean up the used OTP
            res.json({ success: true, message: "Password has been reset successfully." });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error." });
    }
});
// --- END OF NEW ROUTES ---


module.exports = router;