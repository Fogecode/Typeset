import { App, Modal, Notice, Plugin, TFile } from "obsidian";
import { describeError, exportNoteToHtml, openHtmlPreview, renderNoteDocument } from "./exporter";
import { DEFAULT_SETTINGS, HtmlExporterSettingTab } from "./settings";
import { THEMES } from "./themes";
import type { HtmlExporterSettings } from "./types";

/** Modal listing every theme; choosing one exports the active note with it. */
class ThemePickerModal extends Modal {
  private readonly plugin: HtmlExporterPlugin;

  constructor(app: App, plugin: HtmlExporterPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText("Export active note with theme…");
    contentEl.empty();
    contentEl.addClass("html-exporter-theme-picker");

    for (const theme of THEMES) {
      const row = contentEl.createEl("button", {
        cls: "html-exporter-theme-row",
        attr: { type: "button" },
      });
      if (theme.id === this.plugin.settings.themeId) row.addClass("is-active");

      row.createSpan({ cls: "html-exporter-theme-name", text: theme.name });
      row.createSpan({
        cls: "html-exporter-theme-desc",
        text: theme.mode + " — " + theme.description,
      });

      row.addEventListener("click", () => {
        this.close();
        void this.plugin.exportActiveNote(theme.id);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Obsidian entry point: commands, ribbon icon and settings for the HTML exporter. */
export default class HtmlExporterPlugin extends Plugin {
  /** Never aliases DEFAULT_SETTINGS, so writes cannot leak into the defaults. */
  settings: HtmlExporterSettings = {
    ...DEFAULT_SETTINGS,
    features: { ...DEFAULT_SETTINGS.features },
  };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new HtmlExporterSettingTab(this.app, this));

    this.addRibbonIcon("file-code-2", "Export note to styled HTML", () =>
      this.exportActiveNote()
    );

    this.addCommand({
      id: "export-active-note",
      name: "Export active note to styled HTML",
      callback: () => this.exportActiveNote(),
    });

    this.addCommand({
      id: "export-active-note-theme",
      name: "Export active note with theme…",
      callback: () => {
        new ThemePickerModal(this.app, this).open();
      },
    });
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<HtmlExporterSettings> | null;
    const merged = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
    // Features live one level deeper, so merge them separately to survive
    // data.json files written by an older version.
    merged.features = Object.assign(
      {},
      DEFAULT_SETTINGS.features,
      (stored && stored.features) || {}
    );
    this.settings = merged;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** The note currently open in the active leaf, if it is a markdown file. */
  private getActiveNote(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("No active note to export.");
      return null;
    }
    return file;
  }

  /**
   * Export the active note. Returns the written vault path, or null when there
   * was nothing to export or the export failed.
   */
  async exportActiveNote(themeId?: string): Promise<string | null> {
    const file = this.getActiveNote();
    if (!file) return null;

    try {
      const outputPath = await exportNoteToHtml(this, file, themeId);
      new Notice("Exported " + file.basename + " → " + outputPath);
      return outputPath;
    } catch (error) {
      console.error("[html-exporter] export failed", error);
      new Notice("HTML export failed: " + describeError(error), 8000);
      return null;
    }
  }

  /** Render the active note with the current theme and show it in a modal. */
  async previewCurrentTheme(): Promise<void> {
    const file = this.getActiveNote();
    if (!file) return;

    try {
      const { html } = await renderNoteDocument(this, file, this.settings.themeId);
      openHtmlPreview(this.app, html, file.basename + " — preview");
    } catch (error) {
      console.error("[html-exporter] preview failed", error);
      new Notice("Preview failed: " + describeError(error), 8000);
    }
  }
}
