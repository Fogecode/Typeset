/**
 * Simulates Obsidian's plugin bootstrap for the vault's enabled plugin list:
 *   1. read community-plugins.json
 *   2. for each id, load .obsidian/plugins/<id>/manifest.json
 *   3. require(.obsidian/plugins/<id>/main.js) and take .default
 *   4. instantiate and call onload()
 * This is the exact code path that produces "Failed to load plugin" in the app.
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");

const vault = process.argv[2];
const mockPath = path.join(__dirname, "mock-obsidian.cjs");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request) {
  if (request === "obsidian") return mockPath;
  if (request === "electron") return path.join(__dirname, "mock-electron.cjs");
  return origResolve.apply(this, arguments);
};
const obsidian = require(mockPath);

const enabled = JSON.parse(fs.readFileSync(path.join(vault, ".obsidian", "community-plugins.json"), "utf8"));
console.log("enabled plugins: " + JSON.stringify(enabled));

let failures = 0;

(async () => {
for (const id of enabled) {
  const dir = path.join(vault, ".obsidian", "plugins", id);
  const mainPath = path.join(dir, "main.js");
  const manifestPath = path.join(dir, "manifest.json");
  process.stdout.write("\n[" + id + "] ");

  if (!fs.existsSync(manifestPath)) { console.log("FAIL: manifest.json missing"); failures++; continue; }
  if (!fs.existsSync(mainPath)) { console.log("FAIL: main.js missing"); failures++; continue; }

  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (e) { console.log("FAIL: manifest.json is not valid JSON - " + e.message); failures++; continue; }

  let mod;
  try { mod = require(mainPath); }
  catch (e) {
    console.log("FAIL: require() threw -> " + e.constructor.name + ": " + e.message.split("\n")[0]);
    failures++;
    continue;
  }

  const PluginClass = mod && mod.default ? mod.default : mod;
  if (typeof PluginClass !== "function") { console.log("FAIL: module does not export a class"); failures++; continue; }

  const app = { vault: {}, metadataCache: {}, workspace: { getActiveFile: () => null, on: () => ({}), onLayoutReady: (cb) => cb() } };
  const plugin = new PluginClass(app, manifest);
  try {
    await plugin.onload();
    console.log("OK: loaded " + manifest.name + " v" + manifest.version +
      " (commands=" + (plugin._commands || []).length +
      ", ribbon=" + (plugin._ribbons || []).length +
      ", settingsTab=" + (plugin._settingTabs || []).length + ")");
  } catch (e) {
    console.log("FAIL: onload() threw -> " + e.constructor.name + ": " + e.message.split("\n")[0]);
    failures++;
  }
}

console.log("\n" + (failures === 0 ? "RESULT: all enabled plugins load cleanly" : "RESULT: " + failures + " plugin(s) failed to load"));
process.exit(failures === 0 ? 0 : 1);
})();
