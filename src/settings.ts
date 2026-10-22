import { App, PluginSettingTab, Setting } from "obsidian";
import type HtmlExporterPlugin from "./main";
import { DEFAULT_THEME_ID, THEMES } from "./themes";
import type { ExportFeatures, HtmlExporterSettings } from "./types";

/** Settings used when data.json is missing or incomplete. */
export const DEFAULT_SETTINGS: HtmlExporterSettings = {
  themeId: DEFAULT_THEME_ID,
  outputFolder: "",
  openAfterExport: "browser",
  embedImages: true,
  features: {
    toc: true,
    themeSwitcher: true,
    progressBar: true,
    copyButtons: true,
    backToTop: true,
  },
};

/** One row per runtime feature switch shown in settings. */
const FEATURE_ROWS: Array<{ key: keyof ExportFeatures; name: string; desc: string }> = [
  {
    key: "toc",
    name: "Table of contents",
    desc: "Show a sidebar table of contents built from the note headings.",
  },
  {
    key: "themeSwitcher",
    name: "Theme switcher",
    desc: "Let readers switch between the embedded themes inside the exported page.",
  },
  {
    key: "progressBar",
    name: "Reading progress bar",
    desc: "Show a thin progress bar that tracks how far the reader has scrolled.",
  },
  {
    key: "copyButtons",
    name: "Code copy buttons",
    desc: "Add a copy button to every code block.",
  },
  {
    key: "backToTop",
    name: "Back to top button",
    desc: "Show a floating button that scrolls back to the top of the page.",
  },
];

/** Settings UI, mounted under Settings -> Community plugins -> HTML Exporter. */
export class HtmlExporterSettingTab extends PluginSettingTab {
  plugin: HtmlExporterPlugin;

  constructor(app: App, plugin: HtmlExporterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    // styles.css targets this id; keep it stable.
    containerEl.id = "html-exporter-settings";

    new Setting(containerEl).setName("Appearance").setHeading();

    new Setting(containerEl)
      .setName("Theme")
      .setDesc("Visual style used for the exported page. Every export embeds all themes, so readers can switch later.")
      .addDropdown((dropdown) => {
        for (const theme of THEMES) {
          dropdown.addOption(theme.id, `${theme.name} — ${theme.description}`);
        }
        dropdown.setValue(this.plugin.settings.themeId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.themeId = value;
          await this.plugin.saveSettings();
        });
        return dropdown;
      });

    new Setting(containerEl)
      .setName("Preview current theme")
      .setDesc("Render the active note with the current settings in a preview window, without writing a file.")
      .addButton((button) => {
        button.setButtonText("Preview current theme");
        button.setCta();
        button.onClick(() => {
          void this.plugin.previewCurrentTheme();
        });
        return button;
      });

    new Setting(containerEl).setName("Output").setHeading();

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Vault folder for exported HTML files. Leave empty to export next to the note.")
      .addText((text) => {
        text.setPlaceholder("e.g. exports");
        text.setValue(this.plugin.settings.outputFolder);
        text.onChange(async (value) => {
          this.plugin.settings.outputFolder = value.trim();
          await this.plugin.saveSettings();
        });
        return text;
      });

    new Setting(containerEl)
      .setName("After export")
      .setDesc("What to do once the HTML file has been written.")
      .addDropdown((dropdown) => {
        dropdown.addOption("browser", "Open in default browser");
        dropdown.addOption("preview", "Show preview inside Obsidian");
        dropdown.addOption("none", "Do nothing");
        dropdown.setValue(this.plugin.settings.openAfterExport);
        dropdown.onChange(async (value) => {
          this.plugin.settings.openAfterExport = value as HtmlExporterSettings["openAfterExport"];
          await this.plugin.saveSettings();
        });
        return dropdown;
      });

    new Setting(containerEl)
      .setName("Embed images")
      .setDesc("Inline vault images as base64 data URLs so the exported file works on its own.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.embedImages);
        toggle.onChange(async (value) => {
          this.plugin.settings.embedImages = value;
          await this.plugin.saveSettings();
        });
        return toggle;
      });

    new Setting(containerEl).setName("Page features").setHeading();

    for (const row of FEATURE_ROWS) {
      new Setting(containerEl)
        .setName(row.name)
        .setDesc(row.desc)
        .addToggle((toggle) => {
          toggle.setValue(this.plugin.settings.features[row.key]);
          toggle.onChange(async (value) => {
            this.plugin.settings.features[row.key] = value;
            await this.plugin.saveSettings();
          });
          return toggle;
        });
    }
  }
}
