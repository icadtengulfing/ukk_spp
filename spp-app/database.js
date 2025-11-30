const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "ukk_spp",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL Connection Error:", err.message);
    console.log("Server will start but database queries may fail");
  } else {
    console.log("MySQL Connected!");
  }
});

module.exports = db;
