// Minimal but faithful stand-in for Obsidian's "obsidian" module.
// Used only by the offline verification harness: it lets us require() the
// built main.js exactly the way Obsidian does (CommonJS + module.exports.default)
// and drive the real export pipeline against a real vault folder.

class Notice {
  constructor(message, timeout) {
    this.message = String(message);
    this.timeout = timeout;
    Notice.instances.push(this);
  }
  setMessage(m) { this.message = String(m); return this; }
  hide() {}
}
Notice.instances = [];

class Component {
  constructor() { this._loaded = false; this._children = []; }
  load() { this._loaded = true; if (this.onload) return this.onload(); }
  unload() { if (this.onunload) this.onunload(); this._loaded = false; }
  addChild(c) { this._children.push(c); return c; }
  register() {}
  registerEvent() {}
  registerDomEvent() {}
  registerInterval() {}
}

class Plugin extends Component {
  constructor(app, manifest) {
    super();
    this.app = app;
    this.manifest = manifest;
    this._data = null;
    this._commands = [];
    this._ribbons = [];
    this._settingTabs = [];
  }
  async loadData() { return this._data; }
  async saveData(d) { this._data = JSON.parse(JSON.stringify(d)); }
  addRibbonIcon(icon, title, cb) {
    const el = { icon, title, cb, addClass() {}, remove() {} };
    this._ribbons.push(el);
    return el;
  }
  addCommand(cmd) { this._commands.push(cmd); return cmd; }
  addSettingTab(tab) { this._settingTabs.push(tab); }
  registerView() {}
  async onload() {}
  onunload() {}
}

class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = makeEl("div");
  }
  display() {}
  hide() {}
}

class Modal {
  constructor(app) {
    this.app = app;
    this.containerEl = makeEl("div");
    this.modalEl = makeEl("div");
    this.titleEl = makeEl("div");
    this.contentEl = makeEl("div");
  }
  open() { this.onOpen && this.onOpen(); }
  close() { this.onClose && this.onClose(); }
  setTitle(t) { this.titleEl.textContent = t; return this; }
}

class SuggestModal extends Modal {
  constructor(app) { super(app); this.inputEl = makeEl("input"); this.resultContainerEl = makeEl("div"); }
  setPlaceholder() {}
  getSuggestions() { return []; }
  renderSuggestion() {}
  onChooseSuggestion() {}
}

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove() {}, toggle() {}, contains() { return false; } },
    textContent: "",
    innerHTML: "",
    id: "",
    empty() { this.children.length = 0; return this; },
    createEl(t) { const c = makeEl(t); this.children.push(c); return c; },
    createDiv(o) { return this.createEl("div"); },
    createSpan(o) { return this.createEl("span"); },
    addClass() { return this; },
    removeClass() { return this; },
    setText(t) { this.textContent = String(t); return this; },
    setAttr() { return this; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    removeEventListener() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
  };
  return el;
}

class Setting {
  constructor(containerEl) { this.containerEl = containerEl; this.settingEl = makeEl("div"); }
  setName() { return this; }
  setDesc() { return this; }
  setHeading() { return this; }
  addText(cb) { cb({ setPlaceholder() { return this; }, setValue() { return this; }, onChange() { return this; }, inputEl: makeEl("input") }); return this; }
  addDropdown(cb) {
    cb({ addOption() { return this; }, setValue() { return this; }, onChange() { return this; }, selectEl: makeEl("select") });
    return this;
  }
  addToggle(cb) { cb({ setValue() { return this; }, onChange() { return this; } }); return this; }
  addButton(cb) { cb({ setButtonText() { return this; }, setCta() { return this; }, onClick() { return this; } }); return this; }
  addExtraButton(cb) { cb({ setIcon() { return this; }, setTooltip() { return this; }, onClick() { return this; } }); return this; }
  addTextArea(cb) { cb({ setValue() { return this; }, onChange() { return this; } }); return this; }
}

class TFile {
  constructor(path) {
    this.path = path;
    this.name = path.split("/").pop();
    this.basename = this.name.replace(/\.[^.]+$/, "");
    this.extension = (this.name.match(/\.([^.]+)$/) || [, ""])[1];
  }
}

const normalizePath = (p) => String(p).replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "");

module.exports = {
  Notice,
  Component,
  Plugin,
  PluginSettingTab,
  Setting,
  Modal,
  SuggestModal,
  TFile,
  TAbstractFile: TFile,
  MarkdownView: class {},
  WorkspaceLeaf: class {},
  ItemView: class extends Component {},
  Platform: { isDesktop: true, isMobile: false, isMacOS: false, isWin: true },
  normalizePath,
  requestUrl: async () => { throw new Error("network disabled in harness"); },
  setIcon: () => {},
  debounce: (fn) => fn,
  moment: () => ({ format: () => "" }),
};
