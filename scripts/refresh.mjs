import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/site.js");
const generatedPath = resolve(root, ".generated-site.mjs");
const imagePath = resolve(root, "assets/mosque.png");
const siteOrigin = "https://qubaism.github.io/dubai-prayer-times";

const source = await readFile(sourcePath, "utf8");
const image = await readFile(imagePath);
const dataUrl = `data:image/png;base64,${image.toString("base64")}`;

if (!source.includes("__MOSQUE_DATA_URL__")) {
  throw new Error("Mosque illustration placeholder was not found.");
}

await writeFile(generatedPath, source.replace("__MOSQUE_DATA_URL__", dataUrl));

try {
  const site = (await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`)).default;
  const pageResponse = await site.fetch(new Request("https://qubaism.github.io/"), {}, {});
  if (!pageResponse.ok) throw new Error(`Page generation failed with ${pageResponse.status}`);
  const page = await pageResponse.text();
  if (page.includes("Live schedule could not be retrieved")) {
    throw new Error("Prayer schedule retrieval failed; preserving the previous published page.");
  }

  const configResponse = await site.fetch(new Request("https://qubaism.github.io/config"), {}, {});
  if (!configResponse.ok) throw new Error(`Teams configuration generation failed with ${configResponse.status}`);

  await mkdir(resolve(root, "config"), { recursive: true });
  await writeFile(resolve(root, "index.html"), page);
  const configPage = (await configResponse.text()).replaceAll("https://qubaism.github.io", siteOrigin);
  await writeFile(resolve(root, "config/index.html"), configPage);
  await writeFile(resolve(root, ".nojekyll"), "");
  console.log("Refreshed the GitHub Pages site from the live Dubai sources.");
} finally {
  await rm(generatedPath, { force: true });
}
