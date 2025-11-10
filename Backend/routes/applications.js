// Backend/routes/applications.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// List applications (role-aware)
router.get("/", (req, res) => {
  const { id, role } = req.user;

  let sql, params;

  if (role === 'admin') {
    // Admin gets all applications
    // Assuming 'users' table is for jobseekers
    sql = `
      SELECT a.id, a.job_id, a.user_id, a.cover_letter, a.status, a.applied_at,
             j.title AS job_title,
             u.fullname AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone
      FROM applications a
      JOIN job_posts j ON a.job_id = j.id
      JOIN jobseekers u ON a.user_id = u.id
      ORDER BY a.applied_at DESC
    `;
    params = [];
  } else {
    // Recruiter gets applications for their jobs only
    const recruiter_id = id;
    sql = `
      SELECT a.id, a.job_id, a.user_id, a.cover_letter, a.status, a.applied_at,
             j.title AS job_title,
             u.fullname AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone
      FROM applications a
      JOIN job_posts j ON a.job_id = j.id
      JOIN jobseekers u ON a.user_id = u.id
      WHERE j.recruiter_id=?
      ORDER BY a.applied_at DESC
    `;
    params = [recruiter_id];
  }
  
  db.query(sql, params, (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, applications: rows });
  });
});

// Update application status (checks ownership)
router.put("/:id/status", (req, res) => {
  const { id: application_id } = req.params;
  const { status } = req.body;
  const { id: recruiter_id, role } = req.user;

  const allowed = ["Pending", "Shortlisted", "Rejected", "Hired"];
  if (!allowed.includes(status)) {
    return res.json({ success: false, error: "Invalid status" });
  }

  // Check if user has permission to update this application
  const checkSql = `
    SELECT j.recruiter_id 
    FROM applications a
    JOIN job_posts j ON a.job_id = j.id
    WHERE a.id = ?
  `;
  
  db.query(checkSql, [application_id], (err, results) => {
    if (err) return res.json({ success: false, error: "Database error" });
    if (results.length === 0) return res.json({ success: false, error: "Application not found" });

    // --- SECURITY CHECK ---
    if (role !== 'admin' && results[0].recruiter_id !== recruiter_id) {
        return res.status(403).json({ success: false, error: "Access Denied." });
    }
    // --- END SECURITY CHECK ---

    // If check passes, update the status
    db.query(`UPDATE applications SET status=? WHERE id=?`, [status, application_id], (err, result) => {
      if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
      if (result.affectedRows === 0) return res.json({ success: false, error: "Not found" });
      res.json({ success: true, message: "Status updated." });
    });
  });
});

module.exports = router;