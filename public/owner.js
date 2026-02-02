<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Area salone - Parrucchiera Sonia</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="page-container" id="loginBox">
    <h1>Accesso salone</h1>
    <form id="ownerLoginForm">
      <div class="form-row">
        <label>Username</label>
        <input type="text" name="username" required />
      </div>
      <div class="form-row">
        <label>Password</label>
        <input type="password" name="password" required />
      </div>
      <button type="submit" class="btn-primary">Accedi</button>
      <p id="ownerLoginMsg" class="message"></p>
    </form>
  </div>
  <div class="table-container" id="bookingsSection" style="display:none;">
    <h1>Prenotazioni - Parrucchiera Sonia</h1>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Data</th>
          <th>Ora</th>
          <th>Nome</th>
          <th>Email</th>
          <th>Telefono</th>
          <th>Servizio</th>
          <th>Note</th>
          <th>Codice</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody id="bookingsTableBody"></tbody>
    </table>
  </div>
  <script src="owner.js"></script>
</body>
</html>
10. public/owner.js (gestione prenotazioni salone)
js


const loginForm = document.getElementById("ownerLoginForm");
const loginMsg = document.getElementById("ownerLoginMsg");
const loginBox = document.getElementById("loginBox");
const bookingsSection = document.getElementById("bookingsSection");
const tbody = document.getElementById("bookingsTableBody");
async function fetchBookings() {
  const res = await fetch("/api/owner/bookings");
  const bookings = await res.json();
  tbody.innerHTML = "";
  bookings.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td><input type="date" value="${b.date}" data-id="${b.id}" class="o-date"/></td>
      <td><input type="time" value="${b.time}" data-id="${b.id}" class="o-time"/></td>
      <td>${b.name}</td>
      <td>${b.email}</td>
      <td>${b.phone || ""}</td>
      <td><input type="text" value="${b.service}" data-id="${b.id}" class="o-service"/></td>
      <td><input type="text" value="${b.notes || ""}" data-id="${b.id}" class="o-notes"/></td>
      <td>${b.code}</td>
      <td>
        <button class="action-btn" onclick="ownerUpdate(${b.id})">Salva</button> |
        <button class="action-btn" onclick="ownerDelete(${b.id})">Cancella</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";
    const data = {
      username: loginForm.username.value.trim(),
      password: loginForm.password.value.trim()
    };
    try {
      const res = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        loginMsg.style.color = "red";
        loginMsg.textContent = json.error || "Credenziali errate";
        return;
      }
      loginBox.style.display = "none";
      bookingsSection.style.display = "block";
      await fetchBookings();
    } catch (err) {
      loginMsg.style.color = "red";
      loginMsg.textContent = "Errore di connessione.";
    }
  });
}
async function ownerUpdate(id) {
  const dateInput = document.querySelector(`.o-date[data-id="${id}"]`);
  const timeInput = document.querySelector(`.o-time[data-id="${id}"]`);
  const serviceInput = document.querySelector(`.o-service[data-id="${id}"]`);
  const notesInput = document.querySelector(`.o-notes[data-id="${id}"]`);
  try {
    const res = await fetch(`/api/owner/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateInput.value,
        time: timeInput.value,
        service: serviceInput.value,
        notes: notesInput.value
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "Errore aggiornamento");
      return;
    }
    alert("Prenotazione aggiornata");
  } catch (err) {
    alert("Errore di connessione");
  }
}
async function ownerDelete(id) {
  if (!confirm("Cancellare questa prenotazione?")) return;
  try {
    const res = await fetch(`/api/owner/bookings/${id}`, {
      method: "DELETE"
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "Errore cancellazione");
      return;
    }
    alert("Prenotazione cancellata");
    await fetchBookings();
  } catch (err) {
    alert("Errore di connessione");
  }
}
window.ownerUpdate = ownerUpdate;
window.ownerDelete = ownerDelete;
