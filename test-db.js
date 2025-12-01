const db = require("./spp-app/database");

db.query("SELECT Username, password FROM petugas", (err, rows) => {
  if (err) {
    console.error("DB ERROR:", err);
    process.exit(1);
  }

  console.log("DATA PETUGAS YANG DIPAKAI APP:");
  console.log(rows);
  process.exit(0);
});
