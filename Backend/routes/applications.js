// routes/applications.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// List applications by recruiter (join jobs + users)
router.get("/", (req, res) => {
  const recruiter_id = parseInt(req.query.recruiter_id || "0", 10);
  if (!recruiter_id) return res.json({ success: false, error: "recruiter_id required" });

  const sql = `
    SELECT a.id, a.job_id, a.user_id, a.cover_letter, a.status, a.applied_at,
           j.title AS job_title,
           u.fullname AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN users u ON a.user_id = u.id
    WHERE j.recruiter_id=?
    ORDER BY a.applied_at DESC
  `;
  db.query(sql, [recruiter_id], (err, rows) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    res.json({ success: true, applications: rows });
  });
});

// Update application status
router.put("/:id/status", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body; // 'Pending' | 'Shortlisted' | 'Rejected' | 'Hired'
  const allowed = ["Pending", "Shortlisted", "Rejected", "Hired"];
  if (!allowed.includes(status)) return res.json({ success: false, error: "Invalid status" });

  db.query(`UPDATE applications SET status=? WHERE id=?`, [status, id], (err, result) => {
    if (err) return res.json({ success: false, error: err.sqlMessage || "DB Error" });
    if (result.affectedRows === 0) return res.json({ success: false, error: "Not found" });
    res.json({ success: true });
  });
});

module.exports = router;
