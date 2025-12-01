const mysql = require("mysql2");

const isRailway = !!process.env.MYSQLHOST;

const db = mysql.createPool({
  host: isRailway ? process.env.MYSQLHOST : "127.0.0.1",
  user: isRailway ? process.env.MYSQLUSER : "root",
  password: isRailway ? process.env.MYSQLPASSWORD : "",
  database: isRailway ? process.env.MYSQLDATABASE : "ukk_spp",
  port: isRailway ? Number(process.env.MYSQLPORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: isRailway ? { rejectUnauthorized: false } : undefined
});

db.getConnection((err, conn) => {
  if (err) {
    console.error("DB Connection error:", err);
  } else {
    console.log("DB Connected!");
    conn.release();
  }
});

module.exports = db;
