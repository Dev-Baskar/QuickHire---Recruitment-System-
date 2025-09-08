// routes/job_posts.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // upload folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ✅ Helper
const toInt = (v) => (v ? parseInt(v, 10) : null);

// ------------------ CREATE JOB ------------------
router.post("/", upload.single("logo"), (req, res) => {
  const {
    recruiter_id,
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
    toInt(recruiter_id),
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
router.get("/", (req, res) => {
  const recruiter_id = toInt(req.query.recruiter_id);
  const sql = recruiter_id
    ? `SELECT * FROM job_posts WHERE recruiter_id=? ORDER BY created_at DESC`
    : `SELECT * FROM job_posts ORDER BY created_at DESC`;

  db.query(sql, recruiter_id ? [recruiter_id] : [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, jobs: rows });
  });
});

// ------------------ UPDATE JOB ------------------
router.put("/:id", upload.single("logo"), (req, res) => {
  const { id } = req.params;
  const recruiter_id = toInt(req.query.recruiter_id);

  if (!recruiter_id) {
    return res.status(400).json({ success: false, message: "Recruiter ID required" });
  }

  // First fetch old job for old logo path
  db.query(
    "SELECT logo FROM job_posts WHERE id = ? AND recruiter_id = ?",
    [id, recruiter_id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }

      const oldLogo = results[0].logo;
      let logoPath = oldLogo;

      // If new logo uploaded → replace and delete old one
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
        WHERE id=? AND recruiter_id=?`;

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
        id,
        recruiter_id,
      ];

      db.query(sql, values, (err2, result) => {
        if (err2) {
          return res.status(500).json({ success: false, message: err2.message });
        }
        if (result.affectedRows === 0) {
          return res.status(400).json({ success: false, message: "Update failed" });
        }
        res.json({ success: true, message: "Job updated successfully" });
      });
    }
  );
});

// ------------------ DELETE JOB ------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const recruiter_id = toInt(req.query.recruiter_id);

  db.query(
    "SELECT logo FROM job_posts WHERE id = ? AND recruiter_id = ?",
    [id, recruiter_id],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(400).json({ success: false, message: "Job not found" });

      const logoPath = results[0].logo;

      db.query(
        "DELETE FROM job_posts WHERE id = ? AND recruiter_id = ?",
        [id, recruiter_id],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // Delete logo file if exists
          if (logoPath && fs.existsSync(logoPath)) {
            fs.unlinkSync(logoPath);
          }

          res.json({ success: true, message: "Job deleted successfully" });
        }
      );
    }
  );
});

module.exports = router;