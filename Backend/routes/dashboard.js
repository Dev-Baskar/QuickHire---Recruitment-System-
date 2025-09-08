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
      (SELECT COUNT(*) FROM jobs WHERE recruiter_id=?) AS jobPosts,
      (SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id=j.id WHERE j.recruiter_id=?) AS applications,
      (SELECT COUNT(DISTINCT j.recruiter_id) FROM jobs j WHERE j.recruiter_id=?) AS companies,
      (SELECT COUNT(*) FROM logins l WHERE l.user_id=?) AS logins
  `;
  db.query(sql, [recruiter_id, recruiter_id, recruiter_id, recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, stats: rows[0] });
  });
});

// Applications per Job (bar)
router.get("/applications-per-job", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  const sql = `
    SELECT j.title AS jobTitle, COUNT(a.id) AS applications
    FROM jobs j
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
    FROM jobs
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
    JOIN jobs j ON a.job_id=j.id
    WHERE j.recruiter_id=?
    GROUP BY a.status
  `;
  db.query(sql, [recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

module.exports = router;
