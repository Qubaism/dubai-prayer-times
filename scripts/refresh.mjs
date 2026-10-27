import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
const names = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const emirates = [
  { key: "abu-dhabi", name: "Abu Dhabi", code: "AUH" }, { key: "dubai", name: "Dubai", code: "DXB" },
  { key: "ajman", name: "Ajman", code: "AJM" }, { key: "fujairah", name: "Fujairah", code: "FUJ" },
  { key: "ras-al-khaimah", name: "Ras Al Khaimah", code: "RAK" }, { key: "sharjah", name: "Sharjah", code: "SHJ" },
  { key: "umm-al-quwain", name: "Umm Al Quwain", code: "UAQ" },
];

function clean(value) { return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }
function dubaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric" }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}
async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 UAEPrayerTimes/1.0" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}
async function fetchEmirate(definition) {
  const [scheduleHtml, weatherEncoded] = await Promise.all([
    fetchText(`https://www.khaleejtimes.com/prayer-time-uae/${definition.key}`),
    fetchText(`https://www.khaleejtimes.com/weather/uae/${definition.key}`),
  ]);
  const { day, month, year } = dubaiDateParts();
  const target = `${day} ${month}`.toLowerCase();
  let schedule = null;
  for (const row of scheduleHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => clean(match[1]));
    if (cells.length >= 9 && cells[0].toLowerCase() === target) {
      schedule = { fullDate: `${month} ${day}, ${year}`, hijri: cells[2], times: Object.fromEntries(names.map((name, index) => [name, cells[index + 3]])) };
      break;
    }
  }
  if (!schedule) throw new Error(`No ${target} schedule row found for ${definition.name}`);
  const weatherHtml = weatherEncoded.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const weather = weatherHtml.match(/"current":\{"temp_c":([\d.]+)[\s\S]{0,500}?"condition":\{"text":"([^"]+)","icon":"([^"]+)"/i);
  if (!weather) throw new Error(`Current weather was not found for ${definition.name}`);
  const icon = weather[3].match(/64x64-(day|night)-(\d+)\.png/i);
  return { name: definition.name, code: definition.code, slug: definition.key, ...schedule, temperature: `${weather[1]}°C`, condition: weather[2], iconUrl: icon ? `https://cdn.weatherapi.com/weather/64x64/${icon[1].toLowerCase()}/${icon[2]}.png` : null };
}

const page = await readFile(indexPath, "utf8");
const match = page.match(/const emirateSchedules = (\{[^;]+\});/);
if (!match) throw new Error("Existing emirate schedule data was not found.");
const refreshed = { ...JSON.parse(match[1]) };
let successes = 0;
await Promise.all(emirates.map(async (definition) => {
  try { refreshed[definition.key] = await fetchEmirate(definition); successes += 1; }
  catch (error) { console.warn(`Preserving ${definition.name}: ${error instanceof Error ? error.message : String(error)}`); }
}));
if (!successes) throw new Error("No emirate source could be refreshed; preserving the previously published page.");
const payload = JSON.stringify(refreshed).replace(/</g, "\\u003c");
await writeFile(indexPath, page.replace(/const emirateSchedules = \{[^;]+\};/, `const emirateSchedules = ${payload};`));
await writeFile(resolve(root, ".nojekyll"), "");
console.log(`Refreshed ${successes}/${emirates.length} emirate schedules and weather records.`);
