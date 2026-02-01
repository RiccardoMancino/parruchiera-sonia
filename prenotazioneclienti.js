const form = document.getElementById("bookingForm");
const msg = document.getElementById("bookingMessage");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.style.color = "#333";

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      service: form.service.value,
      date: form.date.value,
      time: form.time.value,
      notes: form.notes.value.trim()
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        msg.style.color = "red";
        msg.textContent =
          json.error || "Si è verificato un errore. Riprova più tardi.";
        return;
      }

      msg.style.color = "green";
      msg.textContent =
        "Prenotazione inviata! Controlla la tua email per la conferma e il codice.";

      form.reset();
    } catch (err) {
      msg.style.color = "red";
      msg.textContent = "Errore di connessione. Controlla la rete.";
    }
  });
}
