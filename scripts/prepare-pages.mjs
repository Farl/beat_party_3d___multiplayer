import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");

const filesToCopy = [
  "app.js",
  "audioContextManager.js",
  "audioHandler.js",
  "audioSettings.js",
  "controls.js",
  "debugLogger.js",
  "dummyManager.js",
  "env.js",
  "index.html",
  "instructionsUI.js",
  "joystick.js",
  "particleEffects.js",
  "player.js",
  "scanLineAudio.js",
  "styles.css",
  "worldGeneration.js"
];

const partyKitHost = process.env.PARTYKIT_HOST;

if (!partyKitHost) {
  throw new Error("PARTYKIT_HOST is required to build the GitHub Pages bundle.");
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const relativePath of filesToCopy) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(distDir, relativePath);
  const targetDir = path.dirname(targetPath);
  fs.mkdirSync(targetDir, { recursive: true });

  if (relativePath === "env.js") {
    const content = fs.readFileSync(sourcePath, "utf8").replace("__PARTYKIT_HOST__", partyKitHost);
    fs.writeFileSync(targetPath, content);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
}

console.log(`Prepared dist/ for GitHub Pages using PartyKit host: ${partyKitHost}`);