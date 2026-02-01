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
  // Tabella prenotazioni
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

  // Tabella proprietari (solo Sonia)
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
});

// CONFIG EMAIL  --------------------
// Sostituisci con i tuoi dati reali
const SALON_EMAIL = "parrucchierasonia@gmail.com";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: SALON_EMAIL,             // tua email gmail
    pass: "INSERISCI-LA-TUA-PASSWORD-APP"   // app password
  }
});
// ----------------------------------

// Helpers
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// API ----------------------------------

// Nuova prenotazione (cliente)
app.post("/api/bookings", (req, res) => {
  const { name, email, phone, service, date, time, notes } = req.body;

  if (!name || !email || !service || !date || !time) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  const code = generateCode();

  const stmt = db.prepare(`
    INSERT INTO bookings (name, email, phone, service, date, time, notes, code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    [name, email, phone || "", service, date, time, notes || "", code],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Errore nel salvataggio" });
      }

      const bookingId = this.lastID;

      // Email al cliente
      const mailToClient = {
        from: `"Parrucchiera Sonia" <${SALON_EMAIL}>`,
        to: email,
        subject: "Conferma prenotazione - Parrucchiera Sonia",
        html: `
          <h2>Grazie per la tua prenotazione, ${name}!</h2>
          <p>Dettagli prenotazione:</p>
          <ul>
            <li><b>Codice prenotazione:</b> ${code}</li>
            <li><b>Servizio:</b> ${service}</li>
            <li><b>Data:</b> ${date}</li>
            <li><b>Ora:</b> ${time}</li>
            <li><b>Telefono:</b> ${phone || "-"}</li>
            <li><b>Note:</b> ${notes || "-"}</li>
          </ul>
          <p>Per gestire la tua prenotazione puoi accedere all'area clienti con:</p>
          <p><b>Email:</b> ${email}<br/><b>Codice:</b> ${code}</p>
          <p>Ti aspettiamo in salone!</p>
        `
      };

      // Email al salone
      const mailToSalon = {
        from: `"Sistema Prenotazioni" <${SALON_EMAIL}>`,
        to: SALON_EMAIL,
        subject: `Nuova prenotazione - ${name} (${date} ${time})`,
        html: `
          <h2>Nuova prenotazione ricevuta</h2>
          <ul>
            <li><b>ID:</b> ${bookingId}</li>
            <li><b>Codice:</b> ${code}</li>
            <li><b>Nome:</b> ${name}</li>
            <li><b>Email:</b> ${email}</li>
            <li><b>Telefono:</b> ${phone || "-"}</li>
            <li><b>Servizio:</b> ${service}</li>
            <li><b>Data:</b> ${date}</li>
            <li><b>Ora:</b> ${time}</li>
            <li><b>Note:</b> ${notes || "-"}</li>
          </ul>
        `
      };

      transporter.sendMail(mailToClient, (error) => {
        if (error) console.error("Errore invio email cliente:", error);
      });

      transporter.sendMail(mailToSalon, (error) => {
        if (error) console.error("Errore invio email salone:", error);
      });

      res.json({ success: true, id: bookingId, code });
    }
  );
});

// LOGIN CLIENTE (email + codice)
app.post("/api/client/login", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  db.all(
    "SELECT * FROM bookings WHERE email = ? AND code = ? ORDER BY date ASC, time ASC",
    [email, code],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      if (!rows || rows.length === 0)
        return res.status(404).json({ error: "Nessuna prenotazione trovata" });

      res.json({ success: true, bookings: rows });
    }
  );
});

// CLIENTE: modifica prenotazione
app.put("/api/client/bookings/:id", (req, res) => {
  const id = req.params.id;
  const { email, code, date, time } = req.body;

  if (!email || !code || !date || !time) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  db.get(
    "SELECT * FROM bookings WHERE id = ? AND email = ? AND code = ?",
    [id, email, code],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      if (!row) return res.status(404).json({ error: "Prenotazione non trovata" });

      db.run(
        "UPDATE bookings SET date = ?, time = ? WHERE id = ?",
        [date, time, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Errore aggiornamento" });
          res.json({ success: true });
        }
      );
    }
  );
});

// CLIENTE: cancella prenotazione
app.delete("/api/client/bookings/:id", (req, res) => {
  const id = req.params.id;
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  db.get(
    "SELECT * FROM bookings WHERE id = ? AND email = ? AND code = ?",
    [id, email, code],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      if (!row) return res.status(404).json({ error: "Prenotazione non trovata" });

      db.run("DELETE FROM bookings WHERE id = ?", [id], (err2) => {
        if (err2) return res.status(500).json({ error: "Errore cancellazione" });
        res.json({ success: true });
      });
    }
  );
});

// OWNER LOGIN
app.post("/api/owner/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM owners WHERE username = ? AND password = ?",
    [username, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      if (!row) return res.status(401).json({ error: "Credenziali errate" });
      res.json({ success: true });
    }
  );
});

// OWNER: tutte le prenotazioni
app.get("/api/owner/bookings", (req, res) => {
  db.all(
    "SELECT * FROM bookings ORDER BY date ASC, time ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Errore DB" });
      res.json(rows);
    }
  );
});

// OWNER: modifica completa prenotazione
app.put("/api/owner/bookings/:id", (req, res) => {
  const id = req.params.id;
  const { date, time, service, notes } = req.body;

  db.run(
    "UPDATE bookings SET date = ?, time = ?, service = ?, notes = ? WHERE id = ?",
    [date, time, service, notes || "", id],
    (err) => {
      if (err) return res.status(500).json({ error: "Errore aggiornamento" });
      res.json({ success: true });
    }
  );
});

// OWNER: cancella prenotazione
app.delete("/api/owner/bookings/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM bookings WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Errore cancellazione" });
    res.json({ success: true });
  });
});

// Routing pagine
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/owner", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "owner.html"));
});

app.get("/clienti", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "clienti.html"));
});

app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
