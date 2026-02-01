const clientLoginForm = document.getElementById("clientLoginForm");
const clientLoginMsg = document.getElementById("clientLoginMsg");
const clientLoginBox = document.getElementById("clientLoginBox");
const clientBookingsSection = document.getElementById("clientBookingsSection");
const clientBookingsBody = document.getElementById("clientBookingsBody");

let clientEmail = "";
let clientCode = "";

async function loadClientBookings() {
  try {
    const res = await fetch("/api/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: clientEmail, code: clientCode })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      clientLoginMsg.style.color = "red";
      clientLoginMsg.textContent = json.error || "Errore caricamento prenotazioni";
      return;
    }

    const bookings = json.bookings;
    clientBookingsBody.innerHTML = "";

    bookings.forEach((b) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.id}</td>
        <td><input type="date" value="${b.date}" data-id="${b.id}" class="edit-date"/></td>
        <td><input type="time" value="${b.time}" data-id="${b.id}" class="edit-time"/></td>
        <td>${b.service}</td>
        <td>${b.notes || ""}</td>
        <td>
          <button class="action-btn" onclick="updateClientBooking(${b.id})">Salva</button>
          |
          <button class="action-btn" onclick="deleteClientBooking(${b.id})">Cancella</button>
        </td>
      `;
      clientBookingsBody.appendChild(tr);
    });
  } catch (err) {
    clientLoginMsg.style.color = "red";
    clientLoginMsg.textContent = "Errore di connessione.";
  }
}

if (clientLoginForm) {
  clientLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clientLoginMsg.textContent = "";

    clientEmail = clientLoginForm.email.value.trim();
    clientCode = clientLoginForm.code.value.trim().toUpperCase();

    await loadClientBookings();

    if (clientBookingsBody.children.length > 0) {
      clientLoginBox.style.display = "none";
      clientBookingsSection.style.display = "block";
    }
  });
}

async function updateClientBooking(id) {
  const dateInput = document.querySelector(`input.edit-date[data-id="${id}"]`);
  const timeInput = document.querySelector(`input.edit-time[data-id="${id}"]`);

  try {
    const res = await fetch(`/api/client/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: clientEmail,
        code: clientCode,
        date: dateInput.value,
        time: timeInput.value
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "Errore aggiornamento prenotazione");
      return;
    }
    alert("Prenotazione aggiornata con successo");
  } catch (err) {
    alert("Errore di connessione");
  }
}

async function deleteClientBooking(id) {
  if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;

  try {
    const res = await fetch(`/api/client/bookings/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: clientEmail,
        code: clientCode
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "Errore cancellazione prenotazione");
      return;
    }
    alert("Prenotazione cancellata");
    await loadClientBookings();
  } catch (err) {
    alert("Errore di connessione");
  }
}

// Rende funzioni globali
window.updateClientBooking = updateClientBooking;
window.deleteClientBooking = deleteClientBooking;
