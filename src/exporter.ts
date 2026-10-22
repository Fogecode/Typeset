import { App, Modal, Notice, TFile, normalizePath } from "obsidian";
import type HtmlExporterPlugin from "./main";
import { renderMarkdown } from "./render/markdown";
import { buildDocument } from "./render/template";
import { THEMES, getTheme } from "./themes";
import type { RenderContext, RenderResult } from "./types";

/** Extension -> MIME type map used when inlining vault images as data URLs. */
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** Result of rendering a note without writing anything to disk. */
export interface RenderedNote {
  /** Complete standalone HTML document. */
  html: string;
  /** Renderer output, including warnings and stats. */
  result: RenderResult;
}

function pad2(value: number): string {
  return value < 10 ? "0" + value : String(value);
}

/** Local "YYYY-MM-DD HH:mm" stamp, independent of locale settings. */
function localStamp(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    pad2(date.getMonth() + 1) +
    "-" +
    pad2(date.getDate()) +
    " " +
    pad2(date.getHours()) +
    ":" +
    pad2(date.getMinutes())
  );
}

/**
 * Parse the YAML frontmatter block into flat key/value strings.
 * Only simple `key: value` lines are handled; array-ish values are joined
 * with ", " so they can be shown in the exported header.
 */
export function parseFrontmatter(markdown: string): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) return entries;

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (!key) continue;
    // Strip surrounding quotes, then flatten inline arrays into "a, b".
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((part) => part.trim().replace(/^["']|["']$/g, ""))
        .filter((part) => part.length > 0)
        .join(", ");
    }
    if (!value) continue;
    entries.push({ key, value });
  }
  return entries;
}

/** Encode an ArrayBuffer as base64 without relying on Node's Buffer. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.prototype.slice.call(bytes.subarray(i, i + chunkSize)) as number[]
    );
  }
  return btoa(binary);
}

/** Strip Obsidian embed decoration (`![[img.png|300]]`, `#heading`) from a target. */
function cleanEmbedTarget(target: string): string {
  const withoutPipe = target.split("|")[0];
  const withoutHash = withoutPipe.split("#")[0];
  return withoutHash.trim();
}

/** Build the resolveEmbed callback handed to the renderer. */
function makeResolveEmbed(
  plugin: HtmlExporterPlugin,
  file: TFile
): ((target: string) => Promise<string | null>) | undefined {
  if (!plugin.settings.embedImages) return undefined;

  return async (target: string): Promise<string | null> => {
    const linkpath = cleanEmbedTarget(target);
    if (!linkpath) return null;
    if (/^(https?:|data:)/i.test(linkpath)) return null;

    try {
      const dest = plugin.app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
      if (!dest) return null;

      const extension = dest.extension.toLowerCase();
      const mime = IMAGE_MIME[extension];
      if (!mime) return null;

      const binary = await plugin.app.vault.readBinary(dest);
      return "data:" + mime + ";base64," + toBase64(binary);
    } catch (error) {
      console.error("[typeset] failed to embed " + linkpath, error);
      return null;
    }
  };
}

/** Render a note into a full standalone HTML document without writing it. */
export async function renderNoteDocument(
  plugin: HtmlExporterPlugin,
  file: TFile,
  themeId?: string
): Promise<RenderedNote> {
  const markdown = await plugin.app.vault.cachedRead(file);
  const frontmatter = parseFrontmatter(markdown);
  const resolveEmbed = makeResolveEmbed(plugin, file);

  const context: RenderContext = {
    notePath: file.path,
    noteName: file.basename,
    ...(resolveEmbed ? { resolveEmbed } : {}),
  };

  const result = await renderMarkdown(markdown, context);

  const theme = getTheme(themeId ?? plugin.settings.themeId);

  const html = buildDocument({
    title: file.basename,
    sourcePath: file.path,
    frontmatter,
    bodyHtml: result.html,
    toc: result.toc,
    meta: {
      wordCount: result.wordCount,
      readingMinutes: result.readingMinutes,
      exportedAt: localStamp(new Date()),
      headingCount: countHeadings(result.toc),
    },
    theme,
    allThemes: THEMES,
    features: plugin.settings.features,
  });

  return { html, result };
}

/** Count every TOC node recursively (headings h2..h4). */
function countHeadings(entries: RenderResult["toc"]): number {
  let total = 0;
  for (const entry of entries) {
    total += 1 + countHeadings(entry.children);
  }
  return total;
}

/** Modal that shows an exported document in a large sandboxed iframe. */
export class HtmlPreviewModal extends Modal {
  private readonly html: string;
  private readonly title: string;

  constructor(app: App, html: string, title: string) {
    super(app);
    this.html = html;
    this.title = title;
  }

  onOpen(): void {
    const { contentEl, modalEl, titleEl } = this;
    titleEl.setText(this.title);
    contentEl.empty();
    contentEl.addClass("typeset-preview");

    Object.assign(modalEl.style, { width: "90vw", maxWidth: "90vw" });
    Object.assign(contentEl.style, { padding: "0" });

    const frame = contentEl.createEl("iframe", {
      attr: { srcdoc: this.html, title: this.title },
    });
    Object.assign(frame.style, {
      width: "90vw",
      height: "85vh",
      border: "0",
      display: "block",
      borderRadius: "6px",
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Open the preview modal for an already rendered document. */
export function openHtmlPreview(app: App, html: string, title: string): void {
  new HtmlPreviewModal(app, html, title).open();
}

/** Try to hand a vault path to the OS default handler. */
async function openInBrowser(plugin: HtmlExporterPlugin, vaultPath: string): Promise<boolean> {
  let absolute: string | null = null;
  try {
    absolute = (plugin.app.vault.adapter as unknown as { getFullPath(p: string): string }).getFullPath(
      vaultPath
    );
  } catch (error) {
    console.error("[typeset] adapter.getFullPath failed", error);
  }

  if (absolute) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require("electron") as { shell?: { openPath(p: string): Promise<string> } };
      if (electron?.shell?.openPath) {
        await electron.shell.openPath(absolute);
        return true;
      }
    } catch (error) {
      console.error("[typeset] electron.shell.openPath failed", error);
    }
  }

  if (absolute) {
    try {
      window.open("file://" + encodeURI(absolute.replace(/\\/g, "/")), "_blank");
      return true;
    } catch (error) {
      console.error("[typeset] window.open fallback failed", error);
    }
  }
  return false;
}

/**
 * Export one note to a themed standalone HTML file.
 * Returns the vault-relative path of the written file.
 */
export async function exportNoteToHtml(
  plugin: HtmlExporterPlugin,
  file: TFile,
  themeId?: string
): Promise<string> {
  const { html, result } = await renderNoteDocument(plugin, file, themeId);

  const settings = plugin.settings;
  const noteFolder = file.parent?.path ?? "";
  const rawFolder = settings.outputFolder.trim();
  const folder = (rawFolder ? normalizePath(rawFolder) : noteFolder).replace(/^\/+|\/+$/g, "");
  const fileName = file.basename + ".html";
  const outputPath = folder ? normalizePath(folder + "/" + fileName) : normalizePath(fileName);

  if (folder && !plugin.app.vault.getAbstractFileByPath(folder)) {
    try {
      await plugin.app.vault.createFolder(folder);
    } catch (error) {
      // Folder may have been created concurrently; only rethrow if it still is missing.
      if (!plugin.app.vault.getAbstractFileByPath(folder)) {
        throw new Error(
          "Cannot create output folder \"" + folder + "\": " + describeError(error)
        );
      }
    }
  }

  await plugin.app.vault.adapter.write(outputPath, html);

  if (result.warnings.length > 0) {
    const preview = result.warnings.slice(0, 5).join("\n");
    const extra =
      result.warnings.length > 5 ? "\n…and " + (result.warnings.length - 5) + " more." : "";
    new Notice("Export finished with warnings:\n" + preview + extra, 8000);
  }

  if (settings.openAfterExport === "browser") {
    const opened = await openInBrowser(plugin, outputPath);
    if (!opened) {
      new Notice("Exported to " + outputPath + " but could not open a browser.", 8000);
    }
  } else if (settings.openAfterExport === "preview") {
    openHtmlPreview(plugin.app, html, file.basename);
  }

  return outputPath;
}

/** Human-readable message for an unknown thrown value. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
