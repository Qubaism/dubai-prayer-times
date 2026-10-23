const SOURCE_URL = "https://www.khaleejtimes.com/prayer-time-uae/dubai";
const WEATHER_URL = "https://www.khaleejtimes.com/weather/uae/dubai";
const NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const MOSQUE_IMAGE = "__MOSQUE_DATA_URL__";

function clean(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function dubaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

async function getPrayerTimes() {
  const response = await fetch(SOURCE_URL, {
    headers: { "user-agent": "Mozilla/5.0 DubaiPrayerTimesTeams/1.0" },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Khaleej Times returned ${response.status}`);
  const html = await response.text();
  const { day, month, year } = dubaiDateParts();
  const weatherMatch = clean(html).match(/DXB\s*([\d.]+)\s*°?C/i);
  const target = `${day} ${month}`.toLowerCase();
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => clean(match[1]));
    if (cells.length >= 9 && cells[0].toLowerCase() === target) {
      return {
        date: `${day} ${month} ${year}`,
        fullDate: `${month} ${day}, ${year}`,
        hijri: cells[2],
        temperature: weatherMatch ? `${weatherMatch[1]}°C` : null,
        times: Object.fromEntries(NAMES.map((name, index) => [name, cells[index + 3]])),
      };
    }
  }
  throw new Error(`No ${target} schedule row found`);
}

async function getDubaiWeather() {
  const response = await fetch(WEATHER_URL, {
    headers: { "user-agent": "Mozilla/5.0 DubaiPrayerTimesTeams/1.0" },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Khaleej Times weather returned ${response.status}`);
  const encoded = await response.text();
  const html = encoded.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const match = html.match(/"current":\{"temp_c":([\d.]+)[\s\S]{0,500}?"condition":\{"text":"([^"]+)","icon":"([^"]+)"\}/i);
  if (!match) throw new Error("Current Dubai weather was not found");
  const iconParts = match[3].match(/64x64-(day|night)-(\d+)\.png/i);
  return {
    temperature: `${match[1]}°C`,
    condition: match[2],
    iconUrl: iconParts ? `https://cdn.weatherapi.com/weather/64x64/${iconParts[1].toLowerCase()}/${iconParts[2]}.png` : null,
  };
}

function render(data, error = null) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  const iconSvgs = {
    Fajr: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 33h30M14 38h20"/><path d="M17 32a7 7 0 0 1 14 0"/><path d="M24 14v5M13 20l4 4M35 20l-4 4"/></svg>`,
    Sunrise: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="27" r="7"/><path d="M24 10v6M24 38v-4M8 27h6M34 27h6M13 16l5 5M35 16l-5 5M11 38h26"/></svg>`,
    Dhuhr: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="8"/><path d="M24 7v7M24 34v7M7 24h7M34 24h7M12 12l5 5M36 12l-5 5M12 36l5-5M36 36l-5-5"/></svg>`,
    Asr: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="25" cy="25" r="8"/><path d="M25 9v6M25 35v5M9 25h6M35 25h6M14 14l5 5M36 14l-5 5M14 36l5-5M36 36l-5-5M9 42h32"/></svg>`,
    Maghrib: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 29h28M13 35h22"/><path d="M16 28a8 8 0 0 1 16 0"/><path d="M24 11v6M13 17l4 4M35 17l-4 4"/></svg>`,
    Isha: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M33 34A14 14 0 1 1 27 10a12 12 0 0 0 6 24Z"/></svg>`,
  };
  const cards = NAMES.map((name) => `<article class="prayer phase-${name.toLowerCase()}" data-name="${name}"><i aria-hidden="true">${iconSvgs[name]}</i><span>${name}</span><strong>${data?.times?.[name] || "—"}</strong></article>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#0b2d63">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="apple-touch-icon" href="./assets/app-icon.png">
  <title>Dubai Prayer Times</title>
  <style>
    :root { font-family: Inter, "Segoe UI", system-ui, sans-serif; color: #082b69; background: #fff; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; background: #fff; }
    main { width: min(920px, 100%); margin: auto; padding: clamp(18px, 3vw, 34px); }
    header { position: relative; margin-bottom: 18px; }
    .eyebrow { display: none; }
    .title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
    .notify-button { display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 1px solid #d8e2ef; border-radius: 50%; color: #244d88; background: #fff; cursor: pointer; box-shadow: 0 3px 12px #16386518; }
    .notify-button:hover { background: #f4f8fc; }
    .notify-button.active { color: #fff; border-color: #176d58; background: #176d58; }
    .notify-button svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    h1 { margin: 0 0 3px; font-size: clamp(1.45rem, 4vw, 2.1rem); letter-spacing: -.03em; text-align: left; text-transform: uppercase; }
    .header-meta { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; margin-top: 4px; color: #5371a4; font-size: .86rem; }
    .header-meta .details { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; justify-self: start; }
    .date-center { justify-self: center; color: #244d88; font-weight: 650; text-align: center; text-transform: uppercase; letter-spacing: .015em; }
    .header-meta .sep { color: #b7c1d3; }
    .weather-heading { display: grid; flex: 0 0 auto; justify-items: center; color: #5371a4; font-size: .62rem; font-weight: 600; line-height: 1; }
    .weather-heading img { width: 40px; height: 40px; object-fit: contain; }
    .weather-heading span { margin-top: -2px; }
    .weather-temp { justify-self: end; color: #5371a4; font-size: .86rem; font-weight: 400; white-space: nowrap; }
    .sun { position: absolute; right: 4px; top: 6px; color: #e9a400; font-size: 1.7rem; }
    .next { --sky-a: #0d2a50e8; --sky-b: #11223eef; position: relative; overflow: hidden; isolation: isolate; margin-top: 16px; padding: 23px 20px 20px; border: 1px solid #207862; border-radius: 17px; color: white; background-image: linear-gradient(135deg, var(--sky-a), var(--sky-b)), url('${MOSQUE_IMAGE}'); background-position: center, center 60%; background-repeat: no-repeat; background-size: cover, 100% auto; box-shadow: 0 12px 30px #154f4321; text-align: center; }
    .next::before { content: ""; position: absolute; z-index: -1; inset: 0; background: linear-gradient(180deg, #06172a20, #03111f78); }
    .next-icon { position: absolute; right: 22px; top: 15px; width: 44px; height: 44px; color: #fff2a8; opacity: .86; filter: drop-shadow(0 2px 5px #0018); }
    .next-icon svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .next .notify-button { position: absolute; z-index: 2; left: 22px; top: 15px; color: #fff2a8; border-color: #fff3; background: #ffffff12; box-shadow: 0 3px 12px #0013; }
    .next .notify-button:hover { background: #ffffff24; }
    .next .notify-button.active { color: #fff; border-color: #64c4a8; background: #13745f; }
    .next small { display: block; opacity: .92; font-weight: 700; text-transform: uppercase; }
    .next strong { display: block; margin: 10px 0 1px; font-size: 1.85rem; }
    .next-time { display: block; font-size: 1.55rem; font-weight: 700; }
    .count-label { margin-top: 9px; font-size: .78rem; }
    #countdown { margin-top: 6px; font-variant-numeric: tabular-nums; font-size: clamp(2rem, 7vw, 3.2rem); font-weight: 700; letter-spacing: .08em; }
    .units { word-spacing: 18px; font-size: .68rem; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .prayer { --sky-a: #fff9e9e8; --sky-b: #f7eccdbd; position: relative; overflow: hidden; isolation: isolate; min-height: 92px; padding: 23px 12px 16px; border: 1px solid #efe1b7; border-radius: 14px; background-image: linear-gradient(145deg, var(--sky-a), var(--sky-b)), url('${MOSQUE_IMAGE}'); background-position: center, center 62%; background-repeat: no-repeat; background-size: cover, 112% auto; text-align: center; transition: .2s ease; }
    .prayer::before { content: ""; position: absolute; z-index: -1; inset: 0; background: linear-gradient(180deg, #ffffff18, #fff0 45%, #08192b13); }
    .prayer > * { position: relative; z-index: 1; }
    .prayer i { display: block; position: absolute; right: 13px; top: 50%; width: 43px; height: 43px; transform: translateY(-50%); color: #fff3a5; font-style: normal; opacity: .68; filter: drop-shadow(0 2px 5px #0017); }
    .prayer i svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .prayer span { display: block; color: #071e51; font-size: .91rem; }
    .prayer strong { display: block; margin-top: 6px; color: #071e51; font-size: .94rem; }
    .phase-fajr { --sky-a: #07152ff0; --sky-b: #34365cde; }
    .phase-sunrise { --sky-a: #654568dc; --sky-b: #ef9a51cf; }
    .phase-dhuhr { --sky-a: #62bfe4bd; --sky-b: #f7dc76b8; }
    .phase-asr { --sky-a: #e7aa46c9; --sky-b: #f1c878bd; }
    .phase-maghrib { --sky-a: #b34d43e8; --sky-b: #33365bea; }
    .phase-isha { --sky-a: #071a37f2; --sky-b: #123e59ed; }
    .prayer.active { color: white; border-color: #176d58; box-shadow: inset 0 0 0 2px #f2d278a8, 0 7px 18px #174d421d; }
    .prayer.active::before { background: linear-gradient(180deg, #07533f28, #07392d91); }
    .phase-dhuhr span, .phase-dhuhr strong, .phase-asr span, .phase-asr strong { color: #071e51; text-shadow: 0 1px 4px #fff9; }
    .phase-fajr span, .phase-fajr strong, .phase-sunrise span, .phase-sunrise strong, .phase-maghrib span, .phase-maghrib strong, .phase-isha span, .phase-isha strong, .prayer.active span, .prayer.active strong { color: white; text-shadow: 0 1px 4px #0018; }
    footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; color: #5371a4; font-size: clamp(.6rem, 2.2vw, .72rem); white-space: nowrap; }
    a { color: #5371a4; text-decoration: none; }
    .error { margin: 0 0 14px; padding: 12px 14px; border-radius: 12px; color: #7a281e; background: #ffe8e3; }
    dialog { width: min(520px, calc(100% - 28px)); max-height: calc(100vh - 28px); padding: 0; border: 0; border-radius: 20px; color: #0b2d63; background: #fff; box-shadow: 0 24px 80px #0b24435c; }
    dialog::backdrop { background: #071a3766; backdrop-filter: blur(3px); }
    .notify-panel { padding: 24px; }
    .notify-panel header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin: 0 0 18px; }
    .notify-panel h2 { margin: 0; font-size: 1.3rem; }
    .notify-panel p { margin: 5px 0 0; color: #61779a; font-size: .84rem; line-height: 1.45; }
    .dialog-close { border: 0; color: #244d88; background: transparent; font-size: 1.6rem; cursor: pointer; }
    .notification-group { margin-top: 16px; padding: 15px; border: 1px solid #dce5ef; border-radius: 14px; background: #f9fbfd; }
    .notification-group h3 { margin: 0 0 3px; font-size: .95rem; }
    .notification-group > span { display: block; margin-bottom: 12px; color: #61779a; font-size: .74rem; }
    .reminder-time { display: flex; align-items: center; gap: 9px; margin: 12px 0 0; color: #244d88; font-size: .78rem; font-weight: 650; }
    .reminder-time input { width: 72px; padding: 7px 8px; border: 1px solid #cbd8e7; border-radius: 8px; color: #0b2d63; background: #fff; font: inherit; }
    .prayer-options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
    .prayer-options label { display: grid; place-items: center; gap: 5px; min-width: 0; padding: 9px 3px; border: 1px solid #dce5ef; border-radius: 10px; color: #244d88; background: #fff; font-size: .7rem; cursor: pointer; }
    .prayer-options input { accent-color: #176d58; }
    .notify-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
    .notify-actions button { padding: 10px 14px; border: 1px solid #176d58; border-radius: 10px; font-weight: 700; cursor: pointer; }
    .save-notifications { color: #fff; background: #176d58; }
    .disable-notifications { color: #176d58; background: #fff; }
    #notification-status { min-height: 20px; margin-top: 12px; color: #45678f; font-size: .78rem; }
    @media (max-width: 650px) { .header-meta { grid-template-columns: 1fr auto; } .date-center { grid-column: 1 / -1; grid-row: 2; margin-top: 4px; } .grid { grid-template-columns: repeat(2, 1fr); } .weather-heading img { width: 34px; height: 34px; } .notify-button { width: 36px; height: 36px; } .prayer-options { grid-template-columns: repeat(3, 1fr); } }
  </style>
</head>
<body>
  <main>
    <header><div class="eyebrow">Dubai · Asia/Dubai</div><div class="title-row"><h1>Today's Prayer Times</h1>${data?.temperature ? `<span class="weather-heading">${data.iconUrl ? `<img src="${data.iconUrl}" alt="${data.condition || "Dubai weather"}">` : ""}<span>${data.condition || "Dubai weather"}</span></span>` : ""}</div><div class="header-meta"><div class="details"><span>Dubai, UAE</span><span class="sep">·</span><span id="current-time">--:--:--</span></div><div class="date-center">${data?.fullDate || "Schedule unavailable"} &nbsp;|&nbsp; ${data?.hijri || "Hijri date unavailable"}</div>${data?.temperature ? `<strong class="weather-temp">DXB ${data.temperature}</strong>` : `<span aria-hidden="true"></span>`}</div></header>
    ${error ? `<p class="error">Live schedule could not be retrieved. Please refresh shortly.</p>` : ""}
    <section class="grid">${cards}</section>
    <section class="next" id="next-card"><button class="notify-button" id="notification-button" type="button" aria-label="Prayer notification settings" title="Prayer notification settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button><i class="next-icon" id="next-icon" aria-hidden="true">${iconSvgs.Maghrib}</i><small>Upcoming prayer</small><strong id="next-name">Calculating…</strong><span class="next-time" id="next-time">—</span><div class="count-label">Live countdown</div><div id="countdown">00 : 00 : 00</div><div class="units">Hours Minutes Seconds</div></section>
    <footer><span>Source: <a href="${SOURCE_URL}" target="_blank" rel="noreferrer">Khaleej Times · Dubai</a></span><span>↻ Daily auto-update</span></footer>
    <dialog id="notification-dialog"><form method="dialog" class="notify-panel"><header><div><h2>Prayer notifications</h2><p>Choose adhan alerts and separate reminders before the prayer period ends.</p></div><button class="dialog-close" value="cancel" aria-label="Close">×</button></header><section class="notification-group"><h3>At adhan time</h3><span>Notify me when each selected prayer begins.</span><div class="prayer-options" id="adhan-options"></div></section><section class="notification-group"><h3>Before prayer time ends</h3><span>Fajr before Sunrise; every other prayer before the next adhan.</span><div class="prayer-options" id="reminder-options"></div><label class="reminder-time">Remind me <input id="reminder-minutes" type="number" min="5" max="60" step="1" value="15" inputmode="numeric"> minutes before</label></section><div class="notify-actions"><button class="save-notifications" id="save-notifications" type="button">Enable selected notifications</button><button class="disable-notifications" id="disable-notifications" type="button">Disable all</button></div><div id="notification-status" role="status" aria-live="polite"></div></form></dialog>
  </main>
  <script>
    const schedule = ${payload};
    const names = ${JSON.stringify(NAMES)};
    const icons = ${JSON.stringify(iconSvgs)};
    const notificationPrayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const pushApiUrl = "https://dubai-prayer-times-push.qubaismn.workers.dev";
    const originalDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
    function parseTime(value, base) {
      const match = /^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$/i.exec(value || "");
      if (!match) return null;
      let hour = Number(match[1]) % 12;
      if (match[3].toUpperCase() === "PM") hour += 12;
      const result = new Date(base); result.setUTCHours(hour - 4, Number(match[2]), 0, 0); return result;
    }
    function tick() {
      const now = new Date();
      document.querySelector("#current-time").textContent = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dubai", weekday: "short", hour: "numeric", minute: "2-digit" }).format(now);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(now);
      if (today !== originalDate) return location.reload();
      const dubai = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
      const base = new Date(Date.UTC(dubai.getFullYear(), dubai.getMonth(), dubai.getDate()));
      const entries = names.map(name => ({ name, at: parseTime(schedule?.times?.[name], base) })).filter(item => item.at);
      let next = entries.find(item => item.at > now);
      if (!next && entries.length) { next = { ...entries[0], at: new Date(entries[0].at.getTime() + 86400000) }; }
      document.querySelectorAll(".prayer").forEach(card => card.classList.toggle("active", card.dataset.name === next?.name));
      if (!next) return;
      const nextCard = document.querySelector("#next-card");
      nextCard.classList.remove(...names.map(name => "phase-" + name.toLowerCase()));
      nextCard.classList.add("phase-" + next.name.toLowerCase());
      document.querySelector("#next-icon").innerHTML = icons[next.name];
      const seconds = Math.max(0, Math.floor((next.at - now) / 1000));
      const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      document.querySelector("#next-name").textContent = next.name;
      document.querySelector("#next-time").textContent = schedule.times[next.name];
      document.querySelector("#countdown").textContent = h + " : " + m + " : " + s;
    }
    function toApplicationServerKey(value) {
      const padding = "=".repeat((4 - value.length % 4) % 4);
      const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64);
      return Uint8Array.from(Array.from(raw).map(char => char.charCodeAt(0)));
    }
    function renderOptions(containerId, key) {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      const selected = Array.isArray(saved) ? saved : notificationPrayers;
      document.querySelector(containerId).innerHTML = notificationPrayers.map(function(name) {
        return '<label><input type="checkbox" value="' + name + '" ' + (selected.includes(name) ? 'checked' : '') + '><span>' + name + '</span></label>';
      }).join("");
    }
    function selections(containerId) {
      return Array.from(document.querySelectorAll(containerId + " input:checked")).map(input => input.value);
    }
    async function currentSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await navigator.serviceWorker.ready;
      return { registration, subscription: await registration.pushManager.getSubscription() };
    }
    async function refreshNotificationState() {
      const button = document.querySelector("#notification-button");
      try {
        const current = await currentSubscription();
        button.classList.toggle("active", Boolean(current && current.subscription && Notification.permission === "granted"));
      } catch { button.classList.remove("active"); }
    }
    document.querySelector("#notification-button").addEventListener("click", async function() {
      renderOptions("#adhan-options", "prayerAdhanSelections");
      renderOptions("#reminder-options", "prayerReminderSelections");
      document.querySelector("#reminder-minutes").value = localStorage.getItem("prayerReminderMinutes") || "15";
      document.querySelector("#notification-status").textContent = "";
      document.querySelector("#notification-dialog").showModal();
    });
    document.querySelector("#save-notifications").addEventListener("click", async function() {
      const status = document.querySelector("#notification-status");
      const adhanPrayers = selections("#adhan-options");
      const reminderPrayers = selections("#reminder-options");
      const reminderMinutes = Math.min(60, Math.max(5, Number(document.querySelector("#reminder-minutes").value) || 15));
      if (!adhanPrayers.length && !reminderPrayers.length) { status.textContent = "Select at least one notification, or choose Disable all."; return; }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { status.textContent = "Push notifications are not supported in this browser."; return; }
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches) { status.textContent = "On iPhone or iPad, first use Share → Add to Home Screen, then open the installed app."; return; }
      try {
        status.textContent = "Requesting notification permission…";
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { status.textContent = "Notifications were not allowed. You can enable them in browser settings."; return; }
        const current = await currentSubscription();
        let subscription = current.subscription;
        const isNew = !subscription;
        if (!subscription) {
          const keyResponse = await fetch(pushApiUrl + "/vapid-public-key");
          if (!keyResponse.ok) throw new Error("Notification service is unavailable");
          const key = await keyResponse.json();
          subscription = await current.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toApplicationServerKey(key.publicKey) });
        }
        const response = await fetch(pushApiUrl + "/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription, adhanPrayers, reminderPrayers, reminderMinutes }) });
        if (!response.ok) throw new Error("Could not save notification choices");
        localStorage.setItem("prayerAdhanSelections", JSON.stringify(adhanPrayers));
        localStorage.setItem("prayerReminderSelections", JSON.stringify(reminderPrayers));
        localStorage.setItem("prayerReminderMinutes", String(reminderMinutes));
        if (isNew) await fetch(pushApiUrl + "/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }) });
        status.textContent = "Notifications enabled. Your choices have been saved.";
        await refreshNotificationState();
      } catch (error) { status.textContent = error instanceof Error ? error.message : "Could not enable notifications."; }
    });
    document.querySelector("#disable-notifications").addEventListener("click", async function() {
      const status = document.querySelector("#notification-status");
      try {
        const current = await currentSubscription();
        if (current && current.subscription) {
          await fetch(pushApiUrl + "/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: current.subscription.endpoint }) });
          await current.subscription.unsubscribe();
        }
        localStorage.removeItem("prayerAdhanSelections");
        localStorage.removeItem("prayerReminderSelections");
        localStorage.removeItem("prayerReminderMinutes");
        status.textContent = "All prayer notifications are disabled.";
        await refreshNotificationState();
      } catch { status.textContent = "Could not disable notifications. Please try again."; }
    });
    tick(); setInterval(tick, 1000); refreshNotificationState();
  </script>
</body>
</html>`;
}

function renderConfig(origin) {
  const safeOrigin = JSON.stringify(origin).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configure Dubai Prayer Times</title>
<style>body{font-family:"Segoe UI",system-ui,sans-serif;margin:0;padding:28px;color:#153b36;background:#f3f7f5}main{max-width:560px;margin:auto;padding:28px;border:1px solid #dce9e4;border-radius:18px;background:white}h1{margin-top:0}p{line-height:1.55;color:#52736c}.ok{display:inline-block;padding:8px 12px;border-radius:999px;color:#0d6755;background:#d5efe5;font-weight:700}</style>
<script src="https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js"></script></head>
<body><main><span class="ok">Ready to add</span><h1>Dubai Prayer Times</h1><p>Add the live prayer card to this chat. It shows Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha, highlights the next prayer and refreshes its seconds countdown in Asia/Dubai.</p></main>
<script>(async()=>{const origin=${safeOrigin};await microsoftTeams.app.initialize();microsoftTeams.pages.config.registerOnSaveHandler((event)=>{microsoftTeams.pages.config.setConfig({contentUrl:origin,websiteUrl:origin,suggestedDisplayName:"Dubai Prayer Times"}).then(()=>event.notifySuccess()).catch(e=>event.notifyFailure(String(e)))});microsoftTeams.pages.config.setValidityState(true)})().catch(()=>{});</script></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    void env;
    void ctx;

    const url = new URL(request.url);
    if (url.pathname === "/config") {
      return new Response(renderConfig(url.origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://res.cdn.office.net; frame-ancestors https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (url.pathname !== "/") {
      return new Response("Not found", { status: 404 });
    }
    let data = null;
    let error = null;
    try {
      const [prayer, weather] = await Promise.all([getPrayerTimes(), getDubaiWeather().catch(() => null)]);
      data = { ...prayer, ...(weather || {}) };
    } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
    return new Response(render(data, error), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
        "content-security-policy": "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
  },
};
