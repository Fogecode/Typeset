# 贡献指南

感谢你愿意改进这个插件。

## 开发环境

- Node.js 18+
- Obsidian 1.4.0+

```bash
npm install
npm run dev     # 监听模式
npm run build   # 生产构建
```

## 重要：产物必须是 CommonJS

Obsidian 通过 `require()` 加载 `main.js`，因此：

- 源码用 TypeScript / ESM 编写
- 但**构建产物必须是 CJS**（`esbuild --format=cjs`）
- 插件入口必须是 `export default class extends Plugin`

直接提交未打包的 ESM 源码会导致 `SyntaxError: Cannot use import statement outside a module`。

## 代码风格

- TypeScript `strict` 模式，提交前确保 `npx tsc --noEmit` 无错误
- 文件统一 LF 换行、UTF-8 无 BOM、末尾保留换行
- 主题样式一律通过 CSS 自定义属性（`--hx-*`）驱动，不要在主题里写死颜色

## 提交 PR

1. Fork 并新建分支（`feat/xxx` 或 `fix/xxx`）
2. 说明**改了什么**与**为什么**
3. 若改动渲染逻辑，请附一份导出样例的截图
4. 确保 `npm run build` 通过，并提交更新后的 `main.js`

## 新增一套风格

1. 在 `src/themes/` 下新建 `<id>.ts`，导出一个 `Theme` 对象
2. 必须包含 `types.ts` 中 `REQUIRED_TOKENS` 定义的全部 token
3. 在 `src/themes/index.ts` 的 `THEMES` 数组中注册
4. 主题的 `css` 字段只写该风格特有的部分，通用排版交给 `base.css.ts`

## 报告问题

请使用 Issue 模板，并附上：

- Obsidian 版本、操作系统
- 插件版本
- 复现步骤
- 若与渲染有关，附最小可复现的 Markdown 片段
