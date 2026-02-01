const loginForm = document.getElementById("ownerLoginForm");
const loginMsg = document.getElementById("ownerLoginMsg");
const loginBox = document.getElementById("loginBox");
const mainSection = document.getElementById("mainSection");
// PRENOTAZIONI
const bookingsTableBody = document.getElementById("bookingsTableBody");
// CLIENTI
const addClientForm = document.getElementById("addClientForm");
const searchClientForm = document.getElementById("searchClientForm");
const clientResults = document.getElementById("clientResults");
/* ========== LOGIN ========== */
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
        loginMsg.textContent = json.error || "Credenziali errate.";
        return;
      }
      loginBox.style.display = "none";
      mainSection.style.display = "block";
      await fetchBookings();
    } catch (err) {
      loginMsg.style.color = "red";
      loginMsg.textContent = "Errore di connessione.";
    }
  });
}
/* ========== PRENOTAZIONI ========== */
async function fetchBookings() {
  const res = await fetch("/api/owner/bookings");
  const bookings = await res.json();
  bookingsTableBody.innerHTML = "";
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
        <button class="action-btn" onclick="ownerUpdate(${b.id})">💾</button> |
        <button class="action-btn" onclick="ownerDelete(${b.id})">🗑️</button>
      </td>
    `;
    bookingsTableBody.appendChild(tr);
  });
}
async function ownerUpdate(id) {
  const dateInput = document.querySelector(`.o-date[data-id="${id}"]`);
  const timeInput = document.querySelector(`.o-time[data-id="${id}"]`);
  const serviceInput = document.querySelector(`.o-service[data-id="${id}"]`);
  const notesInput = document.querySelector(`.o-notes[data-id="${id}"]`);
  await fetch(`/api/owner/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: dateInput.value,
      time: timeInput.value,
      service: serviceInput.value,
      notes: notesInput.value
    })
  });
}
async function ownerDelete(id) {
  if (!confirm("Cancellare questa prenotazione?")) return;
  await fetch(`/api/owner/bookings/${id}`, { method: "DELETE" });
  await fetchBookings();
}
window.ownerUpdate = ownerUpdate;
window.ownerDelete = ownerDelete;
/* ========== CLIENTI ========== */
// 1. Aggiungi cliente
if (addClientForm) {
  addClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      nome: addClientForm.nome.value.trim(),
      cognome: addClientForm.cognome.value.trim(),
      soprannome: addClientForm.soprannome.value.trim(),
      cellulare: addClientForm.cellulare.value.trim()
    };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      alert("Cliente aggiunto!");
      addClientForm.reset();
    } else {
      alert("Errore nel salvataggio del cliente.");
    }
  });
}
// 2. Cerca cliente
if (searchClientForm) {
  searchClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = searchClientForm.nome.value.trim();
    const res = await fetch(`/api/clients/search?nome=${encodeURIComponent(nome)}`);
    const json = await res.json();
    renderClientResults(json);
  });
}
function renderClientResults(lista) {
  if (lista.length === 0) {
    clientResults.innerHTML = "<p>Nessun cliente trovato.</p>";
    return;
  }
  clientResults.innerHTML = `
    <h3>Risultati</h3>
    <table>
      <thead><tr><th>Nome</th><th>Cognome</th><th>Soprannome</th><th>Cellulare</th><th>Trattamenti</th></tr></thead>
      <tbody>
        ${lista
          .map(
            (c) => `
            <tr>
              <td>${c.nome}</td>
              <td>${c.cognome}</td>
              <td>${c.soprannome || ""}</td>
              <td>${c.cellulare}</td>
              <td>
                ${c.trattamenti && c.trattamenti.length
                  ? c.trattamenti.map(
                      (t) =>
                        `<div>${t.data_trattamento} - ${t.nome_trattamento} (€${t.prezzo_effettivo})</div>`
                    ).join("")
                  : "Nessun trattamento"}
              </td>
            </tr>
          `
          )
          .join("")}
      </tbody>
    </table>
  `;
}
