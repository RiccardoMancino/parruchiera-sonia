const form = document.getElementById("addClientForm");
const msg = document.getElementById("clientMsg");
const tbody = document.getElementById("clientsTableBody");
const searchInput = document.getElementById("searchName");

async function loadClients(filter = "") {
  const res = await fetch(`/api/salon/clients?nome=${encodeURIComponent(filter)}`);
  const clients = await res.json();

  tbody.innerHTML = "";
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
}

// Iniziale
loadClients();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const data = {
    nome: form.nome.value.trim(),
    cognome: form.cognome.value.trim(),
    telefono: form.telefono.value.trim(),
    trattamento: form.trattamento.value.trim(),
    prezzo: form.prezzo.value.trim()
  };

  const res = await fetch("/api/salon/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    msg.style.color = "red";
    msg.textContent = json.error || "Errore inserimento cliente.";
  } else {
    msg.style.color = "green";
    msg.textContent = "Cliente aggiunto con successo!";
    form.reset();
    loadClients();
  }
});

searchInput.addEventListener("input", (e) => {
  loadClients(e.target.value.trim());
});
