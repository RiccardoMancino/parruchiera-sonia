const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
// DB
const db = new sqlite3.Database("./database.sqlite");
db.serialize(() => {
  // Tabelle base
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT,
      code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  db.get("SELECT * FROM owners WHERE username = ?", ["sonia"], (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO owners (username, password) VALUES (?, ?)",
        ["sonia", "password123"],
        (err2) => {
          if (err2) console.error("Errore creazione owner:", err2);
        }
      );
    }
  });
  // Tabelle per clienti e trattamenti
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      soprannome TEXT,
      cellulare TEXT UNIQUE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      nome_trattamento TEXT NOT NULL,
      data_trattamento TEXT NOT NULL,
      prezzo_effettivo REAL NOT NULL,
      note TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);
});
// Configurazione email
const SALON_EMAIL = "parrucchierasonia@gmail.com";
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: SALON_EMAIL,
    pass: "INSERISCI-LA-TUA-PASSWORD-APP"
  }
});
// Helpers
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
// 🔐 LOGIN con distinzione area
app.post("/api/owner/login", (req, res) => {
  const { username, password, area } = req.body;
  db.get(
    "SELECT * FROM owners WHERE username = ? AND password = ?",
    [username, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      if (!row) return res.status(401).json({ error: "Credenziali errate" });
      // Risposta dinamica con area
      if (area === "prenotazioni") {
        res.json({ success: true, redirect: "/owner-prenotazioni.html" });
      } else if (area === "trattamenti") {
        res.json({ success: true, redirect: "/owner-trattamenti.html" });
      } else {
        res.json({ success: true });
      }
    }
  );
});
// 📆 API prenotazioni (invariato)
app.get("/api/owner/bookings", (req, res) => {
  db.all("SELECT * FROM bookings ORDER BY date ASC, time ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    res.json(rows);
  });
});
app.put("/api/owner/bookings/:id", (req, res) => {
  const id = req.params.id;
  const { date, time, service, notes } = req.body;
  db.run(
    "UPDATE bookings SET date=?, time=?, service=?, notes=? WHERE id=?",
    [date, time, service, notes || "", id],
    (err) => {
      if (err) return res.status(500).json({ error: "Errore aggiornamento" });
      res.json({ success: true });
    }
  );
});
app.delete("/api/owner/bookings/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM bookings WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Errore cancellazione" });
    res.json({ success: true });
  });
});
// 👩 CLIENTI
app.post("/api/clients", (req, res) => {
  const { nome, cognome, soprannome, cellulare, trattamento, prezzo, data, note } = req.body;
  if (!nome || !cognome || !cellulare) {
    return res.status(400).json({ success: false, error: "Dati mancanti" });
  }
  db.run(
    "INSERT INTO clients (nome, cognome, soprannome, cellulare) VALUES (?, ?, ?, ?)",
    [nome, cognome, soprannome || "", cellulare],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: "Errore salvataggio cliente" });
      const clientId = this.lastID;
      // Se vengono inseriti anche dati di trattamento
      if (trattamento && prezzo && data) {
        db.run(
          "INSERT INTO treatments (client_id, nome_trattamento, data_trattamento, prezzo_effettivo, note) VALUES (?, ?, ?, ?, ?)",
          [clientId, trattamento, data, prezzo, note || ""],
          (err2) => {
            if (err2)
              return res.status(500).json({ success: false, error: "Errore nel trattamento" });
            res.json({ success: true, id: clientId });
          }
        );
      } else {
        res.json({ success: true, id: clientId });
      }
    }
  );
});
app.get("/api/clients/search", (req, res) => {
  const nome = req.query.nome || "";
  const likeParam = `%${nome}%`;
  db.all(
    "SELECT * FROM clients WHERE nome LIKE ? OR cognome LIKE ? OR soprannome LIKE ?",
    [likeParam, likeParam, likeParam],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Errore DB" });
      if (rows.length === 0) return res.json([]);
      const clienti = [];
      let completati = 0;
      rows.forEach((cliente) => {
        db.all(
          "SELECT * FROM treatments WHERE client_id = ? ORDER BY data_trattamento DESC",
          [cliente.id],
          (err2, trattamenti) => {
            cliente.trattamenti = trattamenti || [];
            clienti.push(cliente);
            completati++;
            if (completati === rows.length) res.json(clienti);
          }
        );
      });
    }
  );
});
// ➕ Aggiungi nuovo trattamento
app.post("/api/clients/:id/trattamenti", (req, res) => {
  const id = req.params.id;
  const { nome_trattamento, data_trattamento, prezzo_effettivo, note } = req.body;
  if (!nome_trattamento || !data_trattamento || !prezzo_effettivo)
    return res.status(400).json({ success: false, error: "Dati mancanti" });
  db.run(
    "INSERT INTO treatments (client_id, nome_trattamento, data_trattamento, prezzo_effettivo, note) VALUES (?, ?, ?, ?, ?)",
    [id, nome_trattamento, data_trattamento, prezzo_effettivo, note || ""],
    function (err) {
      if (err)
        return res.status(500).json({ success: false, error: "Errore salvataggio trattamento" });
      res.json({ success: true, id: this.lastID });
    }
  );
});
app.listen(PORT, () => console.log(`✅ Server attivo: http://localhost:${PORT}`));
