require('dotenv').config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const path = require("path");
const fs = require("fs");

const app = express();

// ... existing code ...
app.use(express.static(path.join(__dirname, "public")));

// New route for admin verification page
app.get("/admin-verification.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin-verification.html"));
});

// ... existing code ...

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Serve uploaded logos
app.use("/uploads", express.static(uploadDir));

// ✅ Serve frontend (public folder with HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/job_posts", require("./routes/job_posts"));
app.use("/api/dashboard", require("./routes/dashboard"));

const PORT = 5000;

// ✅ Check DB connection before starting server
db.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Database connected successfully!");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  }
});
