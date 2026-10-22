# Typeset

> 把当前笔记一键导出成**美观、自包含、可切换 8 套风格**的 HTML 文件。

一个 Obsidian 插件：点击按钮即可将正在编辑的笔记转换为排版精致的独立 HTML 页面，
支持多种视觉风格即时切换，导出结果**完全离线可用**。

---

## 特性

- **一键导出** — 缎带按钮 / 命令面板，直接转换当前笔记
- **8 套视觉风格** — 每套是完整视觉人格，而非简单换色
- **风格即时切换** — 导出页内置切换器，选择会被记住
- **完全自包含** — 单文件，CSS/JS 内联，图片转 base64，零外链，断网可看
- **内容零遗漏** — 双链、图片嵌入、标注块、表格、代码高亮、任务列表、frontmatter 全部保留
- **响应式** — 桌面与移动端均可正常阅读
- **打印友好** — 打印时自动隐藏界面元素，转为白底黑字

## 安装

### 手动安装

将以下三个文件放入仓库的插件目录：

```
<你的仓库>/.obsidian/plugins/typeset/
├── main.js
├── manifest.json
└── styles.css
```

然后在 **设置 → 第三方插件** 中启用 **Typeset**。
若未出现，重载 Obsidian（`Ctrl+P` → `Reload app without saving`）。

## 使用

| 入口 | 位置 |
| --- | --- |
| 缎带按钮 | 左侧边栏 `</>` 图标 |
| 命令 | `Ctrl+P` → `Export active note to styled HTML` |
| 带主题选择 | `Ctrl+P` → `Export active note with theme…` |

导出成功后会提示文件写入位置。默认输出到**笔记所在目录**，可在设置中修改。

## 8 套风格

| id | 名称 | 视觉特征 |
| --- | --- | --- |
| `paper` | Paper | 暖米白纸面、衬线标题、双细线装饰（默认） |
| `neo-brutalist` | Neo-Brutalist | 4px 纯黑描边、`10px 10px 0` 硬阴影、零圆角、`#FFDD00` |
| `swiss` | Swiss | 瑞士国际主义、Helvetica 系、红色细线、大留白 |
| `nord-dark` | Nord Dark | 冷调深蓝灰暗色，长阅读舒适 |
| `solarized` | Solarized Light | 经典 Solarized 配色 |
| `magazine` | Magazine | 大号展示衬线标题、首字下沉、居中引言 |
| `github` | GitHub | README 风格、系统字体、细边框 |
| `terminal` | Terminal | 绿字黑底等宽、提示符与光标 |

## 设置项

| 设置 | 说明 |
| --- | --- |
| Default theme | 默认使用的风格 |
| Output folder | 输出目录，留空 = 笔记所在目录 |
| Open after export | `browser` / `preview` / `none` |
| Embed images | 是否将图片内嵌为 base64 |
| Features | 目录 / 风格切换器 / 进度条 / 复制按钮 / 回到顶部 |
| Preview current theme | 弹窗预览当前风格，不写文件 |

## 支持的 Markdown 语法

标准 CommonMark + GFM，另加 Obsidian 扩展：

- `[[双链]]`、`[[笔记|别名]]`、`[[笔记#标题]]`
- `![[图片.png]]`、`![[图片.png|300]]`（内嵌为 data URL）
- `> [!note]` / `[!tip]` / `[!warning]` / `[!danger]` 等标注块
- 表格（自动包裹横向滚动容器）
- 代码块（语法高亮 + 复制按钮）
- 任务列表 `- [ ]` / `- [x]`
- YAML frontmatter（转为页头标签）

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 监听模式，自动重新打包
npm run build        # 生产构建
npm run typecheck    # 类型检查
```

构建产物为 CommonJS 格式的 `main.js`（Obsidian 通过 `require()` 加载，必须是 CJS）。

### 项目结构

```
src/
├── main.ts            插件入口（export default class extends Plugin）
├── settings.ts        设置页
├── exporter.ts        导出管线
├── types.ts           类型契约
├── themes/            基础排版系统 + 8 套风格
└── render/            Markdown 渲染与页面模板
scripts/               离线加载验证工具
```

## 许可

本项目采用 **MIT License**，详见 [LICENSE](LICENSE)。

### 第三方组件

构建产物中打包了以下开源库，其许可声明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)：

| 组件 | 版本 | 许可证 |
| --- | --- | --- |
| [marked](https://github.com/markedjs/marked) | 15.x | MIT |
| [highlight.js](https://github.com/highlightjs/highlight.js) | 11.x | BSD-3-Clause |

## 致谢

排版风格参考了 [UI](https://luckymaomi.github.io/ui/) 与 [Style Atlas](https://weepwood.github.io/style-atlas/) 的设计语言。
