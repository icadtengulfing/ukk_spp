const express = require("express");
const path = require("path");
const db = require("./spp-app/database");
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "spp-app/Public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "spp-app/View"));


app.get("/", (req, res) => {
  res.render("login");
});

app.get("/dashboard", (req, res) => {
    // Hitung total siswa
    db.query("SELECT COUNT(*) as totalSiswa FROM siswa", (err, s1) => {
      if (err) return res.status(500).send("Error DB (siswa)");
  
      const totalSiswa = s1[0].totalSiswa;
  
      // Hitung total transaksi pembayaran
      db.query("SELECT COUNT(*) as totalBayar FROM pembayaran", (err2, s2) => {
        if (err2) return res.status(500).send("Error DB (pembayaran)");
  
        const totalBayar = s2[0].totalBayar;
  
        // Tunggakan nanti bisa dihitung dari total nominal spp - total bayar
        const totalTunggakan = 0;
  
        res.render("dashboard", {
          user: { username: "Admin" },
          totalSiswa,
          totalBayar,
          totalTunggakan,
        });
      });
    });
  });
  

// Halaman Data Siswa
app.get("/siswa", (req, res) => {
  db.query("SELECT id, nis, nama, kelas, alamat FROM siswa", (err, results) => {
    if (err) {
      console.error("Query siswa error:", err);
      return res.render("siswa", { data: [] });
    }
    res.render("siswa", { data: results || [] });
  });
});

// Halaman Data SPP
app.get("/spp", (req, res) => {
  db.query("SELECT * FROM spp", (err, results) => {
    if (err) {
      console.error("Query spp error:", err);
      return res.render("spp", { data: [] });
    }
    res.render("spp", { data: results || [] });
  });
});

// ----------------------------------------------------------
// PEMBAYARAN (GET) – pake JOIN biar bisa tampilkan siswa + spp
// ----------------------------------------------------------

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

app.get("/pembayaran", (req, res) => {
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

// ----------------------------------------------------------
// 2. ROUTE POST (MENAMBAHKAN / EDIT / HAPUS DATA)
// ----------------------------------------------------------

// Login (masih dummy)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/");
  }
});

// Tambah Siswa
app.post("/siswa/add", (req, res) => {
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

// Render form edit siswa
app.get("/siswa/edit/:id", (req, res) => {
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
app.post("/siswa/edit/:id", (req, res) => {
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
app.post("/siswa/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM siswa WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Delete siswa error:", err);
    }
    res.redirect("/siswa");
  });
});

// Tambah SPP
app.post("/spp/add", (req, res) => {
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

// Render form edit spp
app.get("/spp/edit/:id_spp", (req, res) => {
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
  app.post("/spp/edit/:id_spp", (req, res) => {
    const id_spp = req.params.id_spp;
    const { tahun, nominal } = req.body;
  
    if (!tahun || !nominal ) {
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
  app.post("/spp/delete/:id_spp", (req, res) => {
    const id_spp = req.params.id_spp;
    db.query("DELETE FROM spp WHERE id_spp = ?", [id_spp], (err) => {
      if (err) {
        console.error("Delete spp error:", err);
      }
      res.redirect("/spp");
    });
  });   

// Tambah Pembayaran
app.post("/pembayaran/add", (req, res) => {
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

app.post("/pembayaran/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM pembayaran WHERE id = ?", [id], (err) => {
      if (err) {
        console.error("Delete siswa error:", err);
      }
      res.redirect("/pembayaran");
    });
  });

// Logout
app.get("/logout", (req, res) => {
  res.redirect("/");
});

// ----------------------------------------------------------
// 3. MENJALANKAN SERVER
// ----------------------------------------------------------
app.listen(process.env.PORT || 3000, () => {
    console.log("Server berjalan...");
});
