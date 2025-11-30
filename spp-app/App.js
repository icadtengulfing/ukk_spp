// App.js
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/View");
app.use(express.static(__dirname + "/Public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // optional: accept JSON if needed

app.use(
  session({
    secret: "spp-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Koneksi database (callback style)
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "ukk_spp",
});

db.connect((err) => {
  if (err) {
    console.error("DB Connection error:", err);
  } else {
    console.log("DB Connected!");
  }
});

// Middleware cek login
function cekLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

// --------------------
// AUTH (Login / Logout)
// --------------------
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let { username, password } = req.body;
  db.query(
    "SELECT * FROM petugas WHERE username=?",
    [username],
    (err, rows) => {
      if (err) {
        console.error("DB error during login:", err);
        return res.status(500).send("Terjadi kesalahan pada server (DB).");
      }

      if (!rows || rows.length === 0) {
        return res.send("Username tidak ditemukan");
      }

      const user = rows[0];
      const hashed = user.password || "";

      let ok = false;
      try {
        if (hashed && bcrypt.compareSync(password, hashed)) ok = true;
      } catch (e) {
        console.error("bcrypt compare error:", e);
        ok = false;
      }

      if (ok) {
        req.session.user = user;
        return res.redirect("/dashboard");
      }

      return res.send("Login gagal! Periksa username dan password.");
    }
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.send("Logout gagal!");
    }
    res.redirect("/");
  });
});

// --------------------
// DASHBOARD
// --------------------
app.get("/dashboard", cekLogin, (req, res) => {
  db.query("SELECT COUNT(*) as total FROM siswa", (err, rows) => {
    if (err) {
      console.error("Query COUNT siswa error:", err);
      return res.status(500).send("Terjadi kesalahan pada database (siswa).");
    }

    const totalSiswa = rows && rows[0] ? rows[0].total : 0;

    db.query(
      "SELECT SUM(jumlah_bayar) as total FROM pembayaran",
      (err2, rows2) => {
        if (err2) {
          console.error("Query SUM pembayaran error:", err2);
          return res.status(500).send(
            "Terjadi kesalahan pada database (pembayaran)."
          );
        }

        const totalBayar =
          rows2 && rows2[0] && rows2[0].total ? rows2[0].total : 0;
        const totalTunggakan = 0; // nanti bisa dihitung dari logika SPP

        res.render("dashboard", {
          user: req.session.user,
          totalSiswa,
          totalBayar,
          totalTunggakan,
        });
      }
    );
  });
});

// --------------------
// CRUD SISWA
// --------------------

// List siswa
app.get("/siswa", cekLogin, (req, res) => {
  db.query(
    "SELECT id, NIS AS nis, Nama AS nama, Kelas AS kelas, Alamat AS alamat FROM siswa",
    (err, rows) => {
      if (err) {
        console.error("Query siswa error:", err);
        rows = [];
      }
      res.render("siswa", { data: rows || [] });
    }
  );
});

// Render form edit siswa
app.get("/siswa/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT id, NIS AS nis, Nama AS nama, Kelas AS kelas, Alamat AS alamat FROM siswa WHERE id = ?",
    [id],
    (err, rows) => {
      if (err || !rows || rows.length === 0) {
        console.error("Fetch siswa for edit error:", err);
        return res.redirect("/siswa");
      }
      res.render("siswa_edit", { siswa: rows[0] }); // View/siswa_edit.ejs
    }
  );
});

// Update siswa
app.post("/siswa/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  const { nis, nama, kelas, alamat } = req.body;
  if (!nis || !nama || !kelas || !alamat)
    return res.send("Data tidak lengkap!");

  db.query(
    "UPDATE siswa SET NIS = ?, Nama = ?, Kelas = ?, Alamat = ? WHERE id = ?",
    [nis, nama, kelas, alamat, id],
    (err) => {
      if (err) {
        console.error("Update siswa error:", err);
      }
      res.redirect("/siswa");
    }
  );
});

// Delete siswa
app.post("/siswa/delete/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM siswa WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Delete siswa error:", err);
    }
    res.redirect("/siswa");
  });
});

// --------------------
// CRUD SPP
// --------------------

// List SPP
app.get("/spp", cekLogin, (req, res) => {
  db.query("SELECT * FROM spp", (err, rows) => {
    if (err) {
      console.error("Query spp error:", err);
      rows = [];
    }
    res.render("spp", { data: rows || [] });
  });
});

// Render add SPP form
app.get("/spp/add", cekLogin, (req, res) => {
  res.render("spp_add"); // View/spp_add.ejs
});

// Create SPP
app.post("/spp/add", cekLogin, (req, res) => {
  const { tahun, nominal } = req.body;
  if (!tahun || !nominal) return res.send("Data tidak lengkap!");

  db.query(
    "INSERT INTO spp (tahun, nominal) VALUES (?, ?)",
    [tahun, nominal],
    (err) => {
      if (err) {
        console.error("Insert spp error:", err);
      }
      res.redirect("/spp");
    }
  );
});

// Render edit SPP form
app.get("/spp/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM spp WHERE id = ?", [id], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      console.error("Fetch spp for edit error:", err);
      return res.redirect("/spp");
    }
    res.render("spp_edit", { spp: rows[0] }); // View/spp_edit.ejs
  });
});

// Update SPP
app.post("/spp/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  const { tahun, nominal } = req.body;
  if (!tahun || !nominal) return res.send("Data tidak lengkap!");

  db.query(
    "UPDATE spp SET tahun = ?, nominal = ? WHERE id = ?",
    [tahun, nominal, id],
    (err) => {
      if (err) {
        console.error("Update spp error:", err);
      }
      res.redirect("/spp");
    }
  );
});

// Delete SPP
app.post("/spp/delete/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM spp WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Delete spp error:", err);
    }
    res.redirect("/spp");
  });
});

// --------------------
// CRUD Pembayaran
// --------------------

// List pembayaran (with related siswa & spp names)
app.get("/pembayaran", cekLogin, (req, res) => {
  const sql = `
    SELECT p.id, p.id_siswa, p.id_spp, p.jumlah_bayar, p.tanggal,
           s.Nama AS siswa_nama, sp.tahun AS spp_tahun, sp.nominal AS spp_nominal
    FROM pembayaran p
    LEFT JOIN siswa s ON p.id_siswa = s.id
    LEFT JOIN spp sp ON p.id_spp = sp.id
    ORDER BY p.tanggal DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Query pembayaran error:", err);
      rows = [];
    }

    // Need siswa & spp for the add form dropdowns
    db.query(
      "SELECT id, NIS AS nis, Nama AS nama FROM siswa",
      (err2, siswa) => {
        if (err2) {
          console.error("Query siswa for pembayaran form error:", err2);
          siswa = [];
        }

        db.query("SELECT id, tahun, nominal FROM spp", (err3, spp) => {
          if (err3) {
            console.error("Query spp for pembayaran form error:", err3);
            spp = [];
          }

          res.render("pembayaran", {
            bayar: rows || [],
            siswa: siswa || [],
            spp: spp || [],
          });
        });
      }
    );
  });
});

// Create pembayaran
app.post("/pembayaran/add", cekLogin, (req, res) => {
  const { id_siswa, id_spp, jumlah_bayar } = req.body;
  if (!id_siswa || !id_spp || !jumlah_bayar)
    return res.send("Data tidak lengkap!");

  db.query(
    "INSERT INTO pembayaran (id_siswa, id_spp, jumlah_bayar, tanggal) VALUES (?, ?, ?, CURDATE())",
    [id_siswa, id_spp, jumlah_bayar],
    (err) => {
      if (err) {
        console.error("Insert pembayaran error:", err);
        return res.redirect("/pembayaran");
      }
      res.redirect("/pembayaran");
    }
  );
});

// Delete pembayaran
app.post("/pembayaran/delete/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM pembayaran WHERE id = ?", [id], (err) => {
    if (err) console.error("Delete pembayaran error:", err);
    res.redirect("/pembayaran");
  });
});

// --------------------
// START SERVER
// --------------------
app.listen(3000, () =>
  console.log("Server berjalan di http://localhost:3000")
);
