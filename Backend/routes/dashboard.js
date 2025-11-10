// Backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// KPI cards (now role-aware)
router.get("/stats", (req, res) => {
  const { id, role } = req.user; // Get user from middleware

  let sql, params;
  if (role === 'admin') {
    // Admin sees ALL stats
    sql = `
      SELECT
        (SELECT COUNT(*) FROM job_posts) AS jobPosts,
        (SELECT COUNT(*) FROM applications) AS applications,
        (SELECT COUNT(*) FROM recruiters WHERE status='approved') AS companies
    `;
    params = [];
  } else {
    // Recruiter sees ONLY their stats
    const recruiter_id = id;
    sql = `
      SELECT
        (SELECT COUNT(*) FROM job_posts WHERE recruiter_id=?) AS jobPosts,
        (SELECT COUNT(*) FROM applications a JOIN job_posts j ON a.job_id=j.id WHERE j.recruiter_id=?) AS applications,
        (SELECT 1) AS companies 
    `;
    params = [recruiter_id, recruiter_id];
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    const stats = { ...rows[0], logins: 0, editRequests: 0 }; 
    res.json({ success: true, stats });
  });
});

// Applications per Job (role-aware)
router.get("/applications-per-job", (req, res) => {
  const { id, role } = req.user;
  let sql, params;

  if (role === 'admin') {
    sql = `
      SELECT j.title AS jobTitle, COUNT(a.id) AS applications
      FROM job_posts j
      LEFT JOIN applications a ON a.job_id=j.id
      GROUP BY j.id
      ORDER BY applications DESC
      LIMIT 10`; // Admin might have too many, so limit
    params = [];
  } else {
    const recruiter_id = id;
    sql = `
      SELECT j.title AS jobTitle, COUNT(a.id) AS applications
      FROM job_posts j
      LEFT JOIN applications a ON a.job_id=j.id
      WHERE j.recruiter_id=?
      GROUP BY j.id
      ORDER BY applications DESC`;
    params = [recruiter_id];
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

// Job posts over time (role-aware)
router.get("/job-posts-over-time", (req, res) => {
  const { id, role } = req.user;
  let sql, params;

  if (role === 'admin') {
    sql = `
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS count
      FROM job_posts
      GROUP BY month
      ORDER BY month`;
    params = [];
  } else {
    const recruiter_id = id;
    sql = `
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS count
      FROM job_posts
      WHERE recruiter_id=?
      GROUP BY month
      ORDER BY month`;
    params = [recruiter_id];
  }
  
  db.query(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

// Application status (role-aware)
router.get("/application-status", (req, res) => {
  const { id, role } = req.user;
  let sql, params;

  if (role === 'admin') {
    sql = `
      SELECT a.status, COUNT(*) AS count
      FROM applications a
      GROUP BY a.status`;
    params = [];
  } else {
    const recruiter_id = id;
    sql = `
      SELECT a.status, COUNT(*) AS count
      FROM applications a
      JOIN job_posts j ON a.job_id=j.id
      WHERE j.recruiter_id=?
      GROUP BY a.status`;
    params = [recruiter_id];
  }
  
  db.query(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, data: rows });
  });
});

module.exports = router;