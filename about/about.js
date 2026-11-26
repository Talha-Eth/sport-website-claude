/* ============================================================
   about.js - Page 9, About & Contact.
   Live project counts, a validated contact form and a friendly
   success state. Messages stay in localStorage because the
   project has no back end.
   ============================================================ */
const stats = {
  leagues: Store.leagues.length,
  teams: Store.teams.length,
  players: Store.players.length,
  matches: Store.matches.length,
};
document.querySelectorAll("[data-stat]").forEach((node) => {
  const key = node.dataset.stat;
  if (stats[key] !== undefined) node.textContent = stats[key].toLocaleString();
});

const form = document.getElementById("contact-form");
const success = document.getElementById("contact-success");
const fields = {
  name: document.getElementById("contact-name"),
  email: document.getElementById("contact-email"),
  message: document.getElementById("contact-message"),
};

function errorNode(name) {
  return document.querySelector(`[data-error-for="${name}"]`);
}

function setError(name, message) {
  const node = errorNode(name);
  const input = fields[name];
  if (!node || !input) return;
  node.textContent = message;
  node.hidden = !message;
  input.classList.toggle("has-error", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearErrors() {
  Object.keys(fields).forEach((name) => setError(name, ""));
}

Object.entries(fields).forEach(([name, input]) => {
  input.addEventListener("input", () => setError(name, ""));
});

function validate() {
  const errors = {};
  const name = fields.name.value.trim();
  const email = fields.email.value.trim();
  const message = fields.message.value.trim();
  if (name.length < 2) errors.name = "Please enter your name (at least two characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address, for example name@example.com.";
  if (message.length < 10) errors.message = "Please write a message of at least 10 characters.";
  return { errors, name, email, message };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  const { errors, name, email, message } = validate();
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    Object.entries(errors).forEach(([field, text]) => setError(field, text));
    fields[firstError].focus();
    return;
  }

  try {
    const messages = JSON.parse(localStorage.getItem("matchday.messages") || "[]");
    messages.unshift({ name, email, message, sentAt: new Date().toISOString() });
    localStorage.setItem("matchday.messages", JSON.stringify(messages.slice(0, 25)));
  } catch (e) { /* storage may be unavailable; the success state still works */ }

  form.hidden = true;
  success.hidden = false;
  success.querySelector("strong").textContent = `Thanks, ${name.split(" ")[0]} — your message is saved.`;
  success.setAttribute("tabindex", "-1");
  success.focus();
  form.reset();
  Matchday.toast("Message saved in this browser", { icon: "check" });
});

document.getElementById("contact-again").addEventListener("click", () => {
  success.hidden = true;
  form.hidden = false;
  fields.name.focus();
});
