// Backend/routes/job_posts.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer config (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper (unchanged)
const toInt = (v) => (v ? parseInt(v, 10) : null);

// ------------------ CREATE JOB ------------------
// Now uses req.user.id
router.post("/", upload.single("logo"), (req, res) => {
  // --- MODIFIED: Get ID from token ---
  const { id: recruiter_id } = req.user; 
  
  const {
    company,
    title,
    location,
    job_type,
    package_ctc,
    status,
    description,
    skills,
    relocate,
    crit10,
    crit12,
    critUg,
    expMin,
    expMax,
  } = req.body;

  const logo = req.file ? `uploads/${req.file.filename}` : null;

  const sql = `INSERT INTO job_posts 
    (recruiter_id, company, title, location, job_type, package_ctc, status, description,
     skills, relocate, crit10, crit12, critUg, expMin, expMax, logo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  const values = [
    recruiter_id, // Use ID from token
    company,
    title,
    location,
    job_type,
    package_ctc,
    status,
    description,
    skills,
    relocate,
    crit10,
    crit12,
    critUg,
    expMin,
    expMax,
    logo,
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, id: result.insertId, message: "Job posted successfully" });
  });
});

// ------------------ GET JOBS ------------------
// Now role-aware
router.get("/", (req, res) => {
  const { id, role } = req.user;

  let sql, params;
  if (role === 'admin') {
    // Admin gets all jobs
    sql = `SELECT * FROM job_posts ORDER BY created_at DESC`;
    params = [];
  } else {
    // Recruiter gets only their jobs
    const recruiter_id = id;
    sql = `SELECT * FROM job_posts WHERE recruiter_id=? ORDER BY created_at DESC`;
    params = [recruiter_id];
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, jobs: rows });
  });
});

// ------------------ UPDATE JOB ------------------
// Now checks ownership
router.put("/:id", upload.single("logo"), (req, res) => {
  const { id: job_id } = req.params;
  const { id: recruiter_id, role } = req.user;

  // First, find the job and check ownership
  let findSql = "SELECT logo, recruiter_id FROM job_posts WHERE id = ?";
  let findParams = [job_id];

  db.query(findSql, findParams, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error." });
    if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Job not found" });
    }

    const job = results[0];
    
    // --- SECURITY CHECK ---
    // Allow if user is admin OR they own this job post
    if (role !== 'admin' && job.recruiter_id !== recruiter_id) {
        return res.status(403).json({ success: false, message: "Access denied: You do not own this job post." });
    }
    // --- END SECURITY CHECK ---

    const oldLogo = job.logo;
    let logoPath = oldLogo;

    if (req.file) {
      logoPath = `uploads/${req.file.filename}`;
      const oldPath = oldLogo ? path.join(__dirname, "../", oldLogo) : null;
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const sql = `UPDATE job_posts SET 
      company=?, title=?, location=?, job_type=?, package_ctc=?, status=?, description=?, 
      skills=?, relocate=?, crit10=?, crit12=?, critUg=?, expMin=?, expMax=?, logo=? 
      WHERE id=?`;

    const values = [
      req.body.company,
      req.body.title,
      req.body.location,
      req.body.job_type,
      req.body.package_ctc,
      req.body.status,
      req.body.description,
      req.body.skills,
      req.body.relocate,
      toInt(req.body.crit10),
      toInt(req.body.crit12),
      toInt(req.body.critUg),
      toInt(req.body.expMin),
      toInt(req.body.expMax),
      logoPath,
      job_id, // Update based on job_id
    ];

    db.query(sql, values, (err2, result) => {
      if (err2) {
        return res.status(500).json({ success: false, message: err2.message });
      }
      res.json({ success: true, message: "Job updated successfully" });
    });
  });
});

// ------------------ DELETE JOB ------------------
// Now checks ownership
router.delete("/:id", (req, res) => {
  const { id: job_id } = req.params;
  const { id: recruiter_id, role } = req.user;

  db.query(
    "SELECT logo, recruiter_id FROM job_posts WHERE id = ?",
    [job_id],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Database error." });
      if (results.length === 0)
        return res.status(404).json({ success: false, message: "Job not found" });

      const job = results[0];

      // --- SECURITY CHECK ---
      if (role !== 'admin' && job.recruiter_id !== recruiter_id) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
      // --- END SECURITY CHECK ---

      const logoPath = job.logo;
      const fullLogoPath = logoPath ? path.join(__dirname, "../", logoPath) : null;


      db.query("DELETE FROM job_posts WHERE id = ?", [job_id], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });

        // Delete logo file if exists
        if (fullLogoPath && fs.existsSync(fullLogoPath)) {
          fs.unlinkSync(fullLogoPath);
        }

        res.json({ success: true, message: "Job deleted successfully" });
      });
    }
  );
});

module.exports = router;