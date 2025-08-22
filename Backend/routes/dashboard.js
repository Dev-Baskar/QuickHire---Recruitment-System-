const express = require("express");
const router = express.Router();
const db = require("../db");

// 📊 Total counts (KPI cards)
router.get("/stats", (req, res) => {
  const stats = {};
  db.query("SELECT COUNT(*) AS total FROM jobs", (err, result) => {
    if (err) return res.json({ success: false, error: err });
    stats.jobPosts = result[0].total;

    db.query("SELECT COUNT(*) AS total FROM applications", (err, result) => {
      if (err) return res.json({ success: false, error: err });
      stats.applications = result[0].total;

      db.query("SELECT COUNT(*) AS total FROM companies", (err, result) => {
        if (err) return res.json({ success: false, error: err });
        stats.companies = result[0].total;

        db.query("SELECT COUNT(*) AS total FROM users", (err, result) => {
          if (err) return res.json({ success: false, error: err });
          stats.logins = result[0].total;
          res.json({ success: true, stats });
        });
      });
    });
  });
});

// 📊 Applications per job (Bar chart)
router.get("/applications-per-job", (req, res) => {
  const sql = `
    SELECT j.title AS jobTitle, COUNT(a.id) AS applications
    FROM jobs j
    LEFT JOIN applications a ON j.id = a.job_id
    GROUP BY j.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, data: results });
  });
});

// 📊 Job posts over time (Line chart)
router.get("/job-posts-over-time", (req, res) => {
  const sql = `
    SELECT DATE_FORMAT(created_at, '%b') AS month, COUNT(*) AS count
    FROM jobs
    GROUP BY month
    ORDER BY MIN(created_at)
  `;
  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, data: results });
  });
});

// 📊 Application status (Pie chart)
router.get("/application-status", (req, res) => {
  const sql = `
    SELECT status, COUNT(*) AS count
    FROM applications
    GROUP BY status
  `;
  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, data: results });
  });
});

module.exports = router;
