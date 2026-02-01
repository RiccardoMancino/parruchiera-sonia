const loginForm = document.getElementById("ownerLoginForm");
const loginMsg = document.getElementById("ownerLoginMsg");
const loginBox = document.getElementById("loginBox");
const mainSection = document.getElementById("mainSection");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const area = loginForm.area.value;
    const data = {
      username: loginForm.username.value.trim(),
      password: loginForm.password.value.trim(),
      area
    };
    try {
      const res = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!json.success) {
        loginMsg.style.color = "red";
        loginMsg.textContent = json.error || "Credenziali errate.";
        return;
      }
      loginBox.style.display = "none";
      mainSection.style.display = "block";
      if (area === "prenotazioni") fetchBookings();
    } catch {
      loginMsg.style.color = "red";
      loginMsg.textContent = "Errore di connessione.";
    }
  });
}
// === PRENOTAZIONI ===
const bookingsTableBody = document.getElementById("bookingsTableBody");
async function fetchBookings() {
  if (!bookingsTableBody) return;
  const res = await fetch("/api/owner/bookings");
  const bookings = await res.json();
  bookingsTableBody.innerHTML = bookings
    .map(
      (b) => `
      <tr>
        <td>${b.id}</td>
        <td><input type="date" value="${b.date}" data-id="${b.id}" class="o-date" /></td>
        <td><input type="time" value="${b.time}" data-id="${b.id}" class="o-time" /></td>
        <td>${b.name}</td><td>${b.email}</td><td>${b.phone||""}</td>
        <td><input type="text" value="${b.service}" data-id="${b.id}" class="o-service"/></td>
        <td><input type="text" value="${b.notes||""}" data-id="${b.id}" class="o-notes"/></td>
        <td>${b.code}</td>
        <td><button onclick="updateBooking(${b.id})">💾</button> <button onclick="deleteBooking(${b.id})">🗑️</button></td>
      </tr>`
    )
    .join("");
}
window.updateBooking = async (id) => {
  const d = (s) => document.querySelector(`.${s}[data-id="${id}"]`).value;
  await fetch(`/api/owner/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: d("o-date"),
      time: d("o-time"),
      service: d("o-service"),
      notes: d("o-notes")
    })
  });
  alert("Prenotazione aggiornata!");
  fetchBookings();
};
window.deleteBooking = async (id) => {
  if (!confirm("Cancellare questa prenotazione?")) return;
  await fetch(`/api/owner/bookings/${id}`, { method: "DELETE" });
  fetchBookings();
};
// === CLIENTI & TRATTAMENTI ===
const addClientForm = document.getElementById("addClientForm");
const searchClientForm = document.getElementById("searchClientForm");
const clientResults = document.getElementById("clientResults");
if (addClientForm) {
  addClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = addClientForm;
    const data = {
      nome: f.nome.value.trim(),
      cognome: f.cognome.value.trim(),
      soprannome: f.soprannome.value.trim(),
      cellulare: f.cellulare.value.trim(),
      trattamento: f.trattamento.value.trim(),
      data: f.data.value,
      prezzo: f.prezzo.value,
      note: f.note.value
    };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    alert(json.success ? "Cliente e trattamento salvati!" : "Errore nel salvataggio.");
    if (json.success) f.reset();
  });
}
if (searchClientForm) {
  searchClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = searchClientForm.nome.value.trim();
    const res = await fetch(`/api/clients/search?nome=${encodeURIComponent(nome)}`);
    const list = await res.json();
    renderClients(list);
  });
}
function renderClients(list) {
  if (list.length == 0) {
    clientResults.innerHTML = "<p>Nessun cliente trovato.</p>";
    return;
  }
  clientResults.innerHTML = `
    <h3>Risultati</h3>
    <table><thead><tr>
      <th>Nome</th><th>Cognome</th><th>Soprannome</th><th>Cellulare</th><th>Trattamenti</th>
    </tr></thead><tbody>
      ${list
        .map(
          (c) =>
            `<tr>
            <td>${c.nome}</td><td>${c.cognome}</td><td>${c.soprannome||""}</td><td>${c.cellulare}</td>
            <td>${c.trattamenti?.length ? c.trattamenti.map(t=>`${t.data_trattamento} - ${t.nome_trattamento} (€${t.prezzo_effettivo})`).join("<br>") : "Nessuno"}</td>
          </tr>`
        )
        .join("")}
    </tbody></table>`;
}
