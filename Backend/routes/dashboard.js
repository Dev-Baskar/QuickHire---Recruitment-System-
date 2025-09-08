// routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// KPI cards (scoped by recruiter_id)
router.get("/stats", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  if (!recruiter_id) return res.json({ success: false, error: "recruiter_id required" });

  const sql = `
    SELECT
      (SELECT COUNT(*) FROM job_posts WHERE recruiter_id=?) AS jobPosts,
      (SELECT COUNT(*) FROM applications a JOIN job_posts j ON a.job_id=j.id WHERE j.recruiter_id=?) AS applications,
      (SELECT COUNT(DISTINCT company) FROM job_posts j WHERE j.recruiter_id=?) AS companies
  `;
  db.query(sql, [recruiter_id, recruiter_id, recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    const stats = { ...rows[0], logins: 0, editRequests: 0 }; // Added placeholder values
    res.json({ success: true, stats });
  });
});

// Applications per Job (bar)
router.get("/applications-per-job", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  const sql = `
    SELECT j.title AS jobTitle, COUNT(a.id) AS applications
    FROM job_posts j
    LEFT JOIN applications a ON a.job_id=j.id
    WHERE j.recruiter_id=?
    GROUP BY j.id
    ORDER BY applications DESC
  `;
  db.query(sql, [recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

// Job posts over time (line)
router.get("/job-posts-over-time", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  const sql = `
    SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS count
    FROM job_posts
    WHERE recruiter_id=?
    GROUP BY month
    ORDER BY month
  `;
  db.query(sql, [recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

// Application status (pie)
router.get("/application-status", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  const sql = `
    SELECT a.status, COUNT(*) AS count
    FROM applications a
    JOIN job_posts j ON a.job_id=j.id
    WHERE j.recruiter_id=?
    GROUP BY a.status
  `;
  db.query(sql, [recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

module.exports = router;