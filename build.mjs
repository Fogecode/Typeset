// Bundles src/main.ts -> ./main.js (CommonJS), which Obsidian loads via require().
//
// Obsidian plugin repos keep the buildable output at the repository root so that
// releases can attach main.js / manifest.json / styles.css directly.
import * as esbuild from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: [resolve(root, "src", "main.ts")],
  outfile: resolve(root, "main.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2018"],
  // Provided by the Obsidian runtime, never bundled.
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  logLevel: "info",
  sourcemap: false,
  minify: false,
  legalComments: "none",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build] watching...");
} else {
  await esbuild.build(options);
  console.log("[build] wrote " + options.outfile);
}
