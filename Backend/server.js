// Backend/server.js
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const path = require("path");
const fs = require("fs");

// --- NEW: Import the authentication middleware ---
const authMiddleware = require('./auth-middleware');

const app = express();

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "public")));

// --- MODIFIED: API Routes ---
// Public routes: Login and registration do NOT require a token.
app.use("/api/auth", require("./routes/auth"));

// Protected routes: These routes now REQUIRE a valid token.
// The authMiddleware will run first, checking the token.
app.use("/api/job_posts", authMiddleware, require("./routes/job_posts"));
app.use("/api/dashboard", authMiddleware, require("./routes/dashboard"));
app.use("/api/applications", authMiddleware, require("./routes/applications"));
// --- End of Modification ---

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