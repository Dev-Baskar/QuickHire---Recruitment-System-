const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");  // your MySQL connection file
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/dashboard", require("./routes/dashboard"));


const PORT = 5000;

// ✅ Check DB connection before starting server
db.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1); // Stop server if DB is not working
  } else {
    console.log("✅ Database connected successfully!");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  }
});
