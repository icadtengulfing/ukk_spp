// spp-app/database.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.MYSQLHOST || "127.0.0.1",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "ukk_spp",
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306,
});

db.connect((err) => {
  if (err) {
    console.error("DB Connection error:", err);
  } else {
    console.log("DB Connected!");
  }
});

module.exports = db;
