const express = require("express");
const path = require("path");
const db = require("./spp-app/database");
const session = require("express-session");
const bcrypt = require("bcryptjs");  
const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "spp-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "spp-app/Public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "spp-app/View"));

//Middleware
function cekLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}
// Halaman login
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("login");
});

// Login pakai tabel petugas
app.post("/login", (req, res) => {
    const { Username, password } = req.body;
  
    if (!Username || !password) {
      return res.redirect("/");
    }
  
    db.query(
      "SELECT * FROM petugas WHERE Username = ?",
      [Username],
      (err, rows) => {
        if (err) {
          console.error("DB error during login:", err);
          return res.status(500).send("Terjadi kesalahan pada server (DB).");
        }
  
        if (!rows || rows.length === 0) {
          // username tidak ada
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
  
        if (!ok) {
          return res.send("Login gagal! Periksa username dan password.");
        }
  
        // sukses login → simpan user ke session
        req.session.user = {
          id: user.id_petugas || user.id,   // sesuaikan nama kolom kalau beda
          username: user.Username,
          level: user.level || null,
          nama: user.nama_petugas || null,
        };
  
        return res.redirect("/dashboard");
      }
    );
  });

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

//Dashboard
app.get("/dashboard", cekLogin, (req, res) => {
  db.query("SELECT COUNT(*) as totalSiswa FROM siswa", (err, s1) => {
    if (err) {
      console.error("Error DB (siswa):", err);
      return res.status(500).send("Error DB (siswa)");
    }

    const totalSiswa = s1[0].totalSiswa || 0;

    db.query("SELECT COUNT(*) as totalBayar FROM pembayaran", (err2, s2) => {
      if (err2) {
        console.error("Error DB (pembayaran):", err2);
        return res.status(500).send("Error DB (pembayaran)");
      }

      const totalBayar = s2[0].totalBayar || 0;
      const totalTunggakan = 0;

      res.render("dashboard", {
        user: req.session.user || { username: "Admin" },
        totalSiswa,
        totalBayar,
        totalTunggakan,
      });
    });
  });
});

// List siswa
app.get("/siswa", cekLogin, (req, res) => {
  db.query("SELECT id, nis, nama, kelas, alamat FROM siswa", (err, results) => {
    if (err) {
      console.error("Query siswa error:", err);
      return res.render("siswa", { data: [] });
    }
    res.render("siswa", { data: results || [] });
  });
});

// Tambah Siswa
app.post("/siswa/add", cekLogin, (req, res) => {
  const { nis, nama, kelas, alamat } = req.body;

  if (!nis || !nama || !kelas || !alamat) {
    return res.send("Data siswa tidak lengkap!");
  }

  const sql = `INSERT INTO siswa (nis, nama, kelas, alamat) VALUES (?,?,?,?)`;
  db.query(sql, [nis, nama, kelas, alamat], (err) => {
    if (err) {
      console.error("Insert siswa error:", err);
      return res.redirect("/siswa");
    }
    res.redirect("/siswa");
  });
});

// Form edit siswa
app.get("/siswa/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT id, nis, nama, kelas, alamat FROM siswa WHERE id = ?",
    [id],
    (err, rows) => {
      if (err || !rows || rows.length === 0) {
        console.error("Fetch siswa for edit error:", err);
        return res.redirect("/siswa");
      }
      res.render("siswa_edit", { siswa: rows[0] });
    }
  );
});

// Update siswa
app.post("/siswa/edit/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  const { nis, nama, kelas, alamat } = req.body;

  if (!nis || !nama || !kelas || !alamat) {
    return res.send("Data tidak lengkap!");
  }

  db.query(
    "UPDATE siswa SET nis = ?, nama = ?, kelas = ?, alamat = ? WHERE id = ?",
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

//SPP
app.get("/spp", cekLogin, (req, res) => {
  db.query("SELECT * FROM spp", (err, results) => {
    if (err) {
      console.error("Query spp error:", err);
      return res.render("spp", { data: [] });
    }
    res.render("spp", { data: results || [] });
  });
});

app.post("/spp/add", cekLogin, (req, res) => {
  const { tahun, nominal } = req.body;

  if (!tahun || !nominal) {
    return res.send("Data SPP tidak lengkap!");
  }

  const sql = `INSERT INTO spp (tahun, nominal) VALUES (?,?)`;
  db.query(sql, [tahun, nominal], (err) => {
    if (err) {
      console.error("Insert spp error:", err);
      return res.redirect("/spp");
    }
    res.redirect("/spp");
  });
});

// Form edit spp
app.get("/spp/edit/:id_spp", cekLogin, (req, res) => {
  const id_spp = req.params.id_spp;

  db.query(
    "SELECT id_spp, tahun, nominal FROM spp WHERE id_spp = ?",
    [id_spp],
    (err, rows) => {
      if (err || !rows || rows.length === 0) {
        console.error("Fetch spp for edit error:", err);
        return res.redirect("/spp");
      }
      res.render("spp_edit", { spp: rows[0] });
    }
  );
});

// Update spp
app.post("/spp/edit/:id_spp", cekLogin, (req, res) => {
  const id_spp = req.params.id_spp;
  const { tahun, nominal } = req.body;

  if (!tahun || !nominal) {
    return res.send("Data tidak lengkap!");
  }

  db.query(
    "UPDATE spp SET tahun = ?, nominal = ? WHERE id_spp = ?",
    [tahun, nominal, id_spp],
    (err) => {
      if (err) {
        console.error("Update spp error:", err);
      }
      res.redirect("/spp");
    }
  );
});

// Delete spp
app.post("/spp/delete/:id_spp", cekLogin, (req, res) => {
  const id_spp = req.params.id_spp;
  db.query("DELETE FROM spp WHERE id_spp = ?", [id_spp], (err) => {
    if (err) {
      console.error("Delete spp error:", err);
    }
    res.redirect("/spp");
  });
});

// =====================
// PEMBAYARAN
// =====================

const pembayaranSql = `
  SELECT p.id,
         p.id_siswa,
         p.id_spp,
         p.jumlah_bayar,
         p.tgl_bayar,
         s.nis   AS siswa_nis,
         s.nama  AS siswa_nama,
         sp.tahun   AS spp_tahun,
         sp.nominal AS spp_nominal
  FROM pembayaran p
  JOIN siswa s ON p.id_siswa = s.id
  JOIN spp   sp ON p.id_spp = sp.id_spp
  ORDER BY p.tgl_bayar DESC
`;

app.get("/pembayaran", cekLogin, (req, res) => {
  db.query(pembayaranSql, (err, bayar) => {
    if (err) {
      console.error("Query pembayaran error:", err);
      bayar = [];
    }

    db.query("SELECT id, nis, nama FROM siswa", (err2, siswa) => {
      if (err2) {
        console.error("Query siswa untuk pembayaran error:", err2);
        siswa = [];
      }

      db.query("SELECT id_spp, tahun, nominal FROM spp", (err3, spp) => {
        if (err3) {
          console.error("Query spp untuk pembayaran form error:", err3);
          spp = [];
        }

        res.render("pembayaran", {
          bayar: bayar || [],
          siswa: siswa || [],
          spp: spp || [],
        });
      });
    });
  });
});

// Tambah Pembayaran
app.post("/pembayaran/add", cekLogin, (req, res) => {
  const { id_siswa, id_spp, jumlah_bayar } = req.body;

  if (!id_siswa || !id_spp || !jumlah_bayar) {
    return res.send("Data pembayaran tidak lengkap!");
  }

  const sql = `
    INSERT INTO pembayaran (id_siswa, id_spp, jumlah_bayar, tgl_bayar)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(sql, [id_siswa, id_spp, jumlah_bayar], (err) => {
    if (err) {
      console.error("Insert pembayaran error:", err);
      return res.redirect("/pembayaran");
    }
    res.redirect("/pembayaran");
  });
});

// Delete pembayaran
app.post("/pembayaran/delete/:id", cekLogin, (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM pembayaran WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Delete pembayaran error:", err);
    }
    res.redirect("/pembayaran");
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
