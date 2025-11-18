const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",     // change if different
  password: "root",     // your MySQL password
  database: "quickhire"
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ MySQL connected");
});

module.exports = db;