const form = document.getElementById("addClientForm");
const msg = document.getElementById("clientMsg");
const tbody = document.getElementById("clientsTableBody");
const searchInput = document.getElementById("searchName");

async function loadClients(filter = "") {
  try {
    const res = await fetch(`/api/salon/clients?nome=${encodeURIComponent(filter)}`);
    const clients = await res.json();

    tbody.innerHTML = "";

    if (!clients || clients.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="9" style="text-align:center; color:#999;">Nessun cliente trovato.</td>`;
      tbody.appendChild(tr);
      return;
    }

    clients.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.id}</td>
        <td contenteditable="true" data-field="nome">${c.nome}</td>
        <td contenteditable="true" data-field="cognome">${c.cognome}</td>
        <td contenteditable="true" data-field="telefono">${c.telefono || ""}</td>
        <td contenteditable="true" data-field="trattamento">${c.trattamento || ""}</td>
        <td contenteditable="true" data-field="prezzo">${c.prezzo ? c.prezzo.toFixed(2) : ""}</td>
        <td>${new Date(c.created_at).toLocaleString()}</td>
        <td style="text-align:center;">
          <button class="btn-small save" data-id="${c.id}">💾</button>
          <button class="btn-small delete" data-id="${c.id}">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventi dopo aver generato la tabella
    document.querySelectorAll(".save").forEach((btn) => {
      btn.addEventListener("click", () => updateClient(btn.dataset.id));
    });

    document.querySelectorAll(".delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteClient(btn.dataset.id));
    });
  } catch (err) {
    console.error("Errore caricamento:", err);
  }
}

async function updateClient(id) {
  const row = document.querySelector(`button[data-id="${id}"]`).closest("tr");
  const data = {};
  row.querySelectorAll("[data-field]").forEach((td) => {
    data[td.dataset.field] = td.textContent.trim();
  });

  try {
    const res = await fetch(`/api/salon/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Errore");
    msg.style.color = "green";
    msg.textContent = "✅ Cliente aggiornato con successo!";
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Errore nell'aggiornamento.";
  }
}

async function deleteClient(id) {
  if (!confirm("Vuoi davvero eliminare questo cliente?")) return;

  try {
    const res = await fetch(`/api/salon/clients/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Errore");
    msg.style.color = "green";
    msg.textContent = "🗑️ Cliente eliminato.";
    loadClients();
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Errore nell'eliminazione.";
  }
}

// Aggiunta nuovo cliente
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.style.color = "#333";

  const data = {
    nome: form.nome.value.trim(),
    cognome: form.cognome.value.trim(),
    telefono: form.telefono.value.trim(),
    trattamento: form.trattamento.value.trim(),
    prezzo: parseFloat(form.prezzo.value) || 0
  };

  try {
    const res = await fetch("/api/salon/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error);
    msg.style.color = "green";
    msg.textContent = "✅ Cliente aggiunto con successo!";
    form.reset();
    loadClients();
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Errore di connessione o inserimento.";
  }
});

// Ricerca in tempo reale
searchInput.addEventListener("input", (e) => {
  loadClients(e.target.value.trim());
});

// Avvio
loadClients();

