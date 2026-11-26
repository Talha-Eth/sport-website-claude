/* ============================================================
   reminders.js - Page 8, My Reminders.
   Joins the saved reminders in localStorage with live match data,
   shows a ticking countdown, per-match delivery choice, remove
   and the delivery settings form.
   ============================================================ */
const summaryRoot = document.getElementById("reminder-summary");
const listRoot = document.getElementById("reminders-list");
const browseMore = document.getElementById("browse-more");
const settingsForm = document.getElementById("settings-form");
const emailInput = document.getElementById("settings-email");
const leadSelect = document.getElementById("settings-lead");
const emailError = document.getElementById("email-error");

function leadLabel(minutes) {
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes === 60) return "1 hour before";
  if (minutes < 1440) return `${minutes / 60} hours before`;
  return `${minutes / 1440} day before`;
}

function deliveryName(value) {
  return value === "website" ? "On website" : "Email";
}

function sortedReminders() {
  return Matchday.getReminders().slice().sort((a, b) => {
    const aTime = new Date(a.kickoff).getTime();
    const bTime = new Date(b.kickoff).getTime();
    const aPast = aTime <= Date.now();
    const bPast = bTime <= Date.now();
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aTime - bTime;
  });
}

function nextReminder() {
  return sortedReminders().find((reminder) => new Date(reminder.kickoff) > new Date());
}

function renderSummary() {
  const reminders = Matchday.getReminders();
  if (!reminders.length) {
    summaryRoot.innerHTML = "";
    return;
  }
  const settings = Matchday.getSettings();
  const active = reminders.filter((reminder) => new Date(reminder.kickoff) > new Date()).length;
  const emailCount = reminders.filter((reminder) => reminder.delivery === "email").length;
  const webCount = reminders.length - emailCount;
  const next = nextReminder();
  summaryRoot.innerHTML = `
    <div class="summary-pill">${Matchday.icon("bell")} <strong>${active}</strong> active reminder${active === 1 ? "" : "s"}</div>
    ${next ? `<div class="summary-pill">${Matchday.icon("clock")} Next in <strong data-countdown="${next.kickoff}">${Matchday.formatCountdown(next.kickoff)}</strong></div>` : ""}
    <div class="summary-pill">${Matchday.icon("mail")} <strong>${emailCount}</strong> email · <strong>${webCount}</strong> on-site</div>
    <div class="summary-pill">${Matchday.icon("sliders")} ${leadLabel(settings.leadMinutes)}</div>`;
}

function reminderCard(reminder) {
  const match = Store.match(reminder.id);
  const kickoff = new Date(reminder.kickoff);
  const past = kickoff <= new Date();
  const live = match && match.status === "live";
  const finished = match && match.status === "finished";
  const soon = !past && kickoff - new Date() < 86400000;
  const home = match ? `<a href="${Matchday.url.team(match.home.id)}">${Matchday.crest(match.homeTeam, "sm")}<span>${Matchday.esc(match.home.name)}</span></a>`
    : `<span class="reminder-team-plain">${Matchday.esc(reminder.home)}</span>`;
  const away = match ? `<a href="${Matchday.url.team(match.away.id)}">${Matchday.crest(match.awayTeam, "sm")}<span>${Matchday.esc(match.away.name)}</span></a>`
    : `<span class="reminder-team-plain">${Matchday.esc(reminder.away)}</span>`;
  const settings = Matchday.getSettings();
  const deliveryText = `${deliveryName(reminder.delivery)} · ${leadLabel(settings.leadMinutes)}`;
  const countdown = finished ? "Finished" : live ? Matchday.liveMinuteText(match) : Matchday.formatCountdown(reminder.kickoff);
  const countdownLabel = finished ? "Full time" : live ? "Live now" : "Until kick-off";
  const leagueName = match && match.league ? match.league.name : reminder.league;

  return `<article class="reminder-card ${past ? "is-past" : ""} ${soon ? "is-soon" : ""} ${live ? "is-live" : ""}" aria-label="Reminder for ${Matchday.esc(reminder.home)} versus ${Matchday.esc(reminder.away)}">
    <div class="reminder-main">
      <div class="reminder-league">
        ${Matchday.esc(leagueName)}${match && match.round ? ` · Matchweek ${match.round}` : ""}
        ${live ? ' <span class="badge badge-live"><span class="live-dot"></span>LIVE</span>' : ""}
      </div>
      <div class="reminder-teams">${home} <span class="reminder-vs">v</span> ${away}</div>
      <div class="reminder-when">
        <span>${Matchday.icon("calendar")}${Matchday.esc(Matchday.kickoffLabel(reminder.kickoff))}</span>
        ${match ? `<span>${Matchday.icon("pin")}${Matchday.esc(match.venue)}</span>` : ""}
        <span>${Matchday.icon(reminder.delivery === "website" ? "globe" : "mail")}${Matchday.esc(deliveryText)}</span>
      </div>
    </div>
    <div class="reminder-countdown">
      <strong ${finished || live ? "" : `data-countdown="${reminder.kickoff}"`}>${countdown}</strong>
      <small>${countdownLabel}</small>
    </div>
    <div class="reminder-actions">
      <label class="reminder-delivery">Delivery
        <select class="select" data-delivery="${reminder.id}" aria-label="Delivery method for ${Matchday.esc(reminder.home)} versus ${Matchday.esc(reminder.away)}">
          <option value="email" ${reminder.delivery === "email" ? "selected" : ""}>Email</option>
          <option value="website" ${reminder.delivery === "website" ? "selected" : ""}>On website</option>
        </select>
      </label>
      ${match ? `<a class="btn btn-sm btn-outline" href="${Matchday.url.match(match.id)}">Match centre ${Matchday.icon("chevronRight")}</a>` : ""}
      <button class="btn-remove push-right" type="button" data-remove="${reminder.id}">${Matchday.icon("trash")} Remove</button>
    </div>
  </article>`;
}

function renderList() {
  const reminders = sortedReminders();
  browseMore.hidden = reminders.length === 0;
  if (!reminders.length) {
    listRoot.innerHTML = Matchday.emptyState({
      iconName: "bell",
      title: "No reminders yet",
      text: "Find an upcoming match and press “Remind me”. Your saved matches will appear here with a live countdown and delivery choice.",
      ctaLabel: "Browse upcoming matches",
      ctaHref: "../index.html#matches",
    });
    return;
  }
  listRoot.innerHTML = reminders.map(reminderCard).join("");
}

/* ---------- settings ---------- */
function fillSettings() {
  const settings = Matchday.getSettings();
  emailInput.value = settings.email || "";
  leadSelect.value = String(settings.leadMinutes);
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const valid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  emailError.hidden = valid;
  emailInput.classList.toggle("has-error", !valid);
  if (!valid) {
    emailError.textContent = "Enter a valid email address, for example name@example.com.";
    emailInput.focus();
    return;
  }
  Matchday.saveSettings({ email, leadMinutes: Number(leadSelect.value) });
  Matchday.toast(email ? "Delivery settings saved for this browser" : "Settings saved. Add an email to use email delivery.", { icon: "check" });
  renderSummary();
  renderList();
});

/* ---------- reminder actions ---------- */
listRoot.addEventListener("change", (event) => {
  const select = event.target.closest("[data-delivery]");
  if (!select) return;
  Matchday.updateReminderDelivery(select.dataset.delivery, select.value);
  Matchday.toast(`Delivery set to ${deliveryName(select.value).toLowerCase()}`, { icon: select.value === "website" ? "globe" : "mail" });
});

listRoot.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (!remove) return;
  const id = remove.dataset.remove;
  const reminder = Matchday.getReminders().find((item) => item.id === id);
  const match = Store.match(id);
  Matchday.removeReminder(id);
  Matchday.toast(`Reminder removed${reminder ? ` for ${reminder.home} v ${reminder.away}` : ""}`, {
    icon: "trash",
    action: match ? {
      label: "Undo",
      onClick: () => {
        Matchday.addReminder(match);
        Matchday.toast("Reminder restored", { icon: "bell" });
      },
    } : undefined,
  });
});

document.addEventListener("matchday:reminders", () => {
  renderSummary();
  renderList();
});

/* ---------- start ---------- */
fillSettings();
renderSummary();
renderList();
