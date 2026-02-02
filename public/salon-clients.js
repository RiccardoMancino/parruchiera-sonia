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
      tr.innerHTML = `<td colspan="7" style="text-align:center; color:#999;">Nessun cliente trovato.</td>`;
      tbody.appendChild(tr);
      return;
    }

    clients.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.nome}</td>
        <td>${c.cognome}</td>
        <td>${c.telefono || ""}</td>
        <td>${c.trattamento || ""}</td>
        <td>${c.prezzo ? c.prezzo.toFixed(2) : ""}</td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Errore caricamento:", err);
  }
}

// Carica tabella iniziale
loadClients();

// Gestione invio form
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

    if (!res.ok || !json.success) {
      msg.style.color = "red";
      msg.textContent = json.error || "Errore nell'inserimento del cliente.";
      return;
    }

    msg.style.color = "green";
    msg.textContent = "✅ Cliente aggiunto con successo!";
    form.reset();
    await loadClients();
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Errore di connessione.";
  }
});

searchInput.addEventListener("input", (e) => {
  loadClients(e.target.value.trim());
});
