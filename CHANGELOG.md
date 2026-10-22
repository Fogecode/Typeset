# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-10-22

首个公开发布版本。

### 新增

- 一键将当前笔记导出为独立 HTML 文件
- 8 套视觉风格：`paper`、`neo-brutalist`、`swiss`、`nord-dark`、`solarized`、`magazine`、`github`、`terminal`
- 导出页内置风格切换器，选择持久化到 localStorage
- 支持 Obsidian 扩展语法：双链、图片嵌入（base64）、标注块、任务列表、frontmatter
- 代码块语法高亮与一键复制
- 目录导航、阅读进度条、回到顶部
- 响应式布局与打印样式
- 设置页：默认风格、输出目录、导出后行为、图片内嵌开关、功能开关

### 技术说明

- 插件以 CommonJS 格式打包，入口为 `export default class extends Plugin`
- 导出结果为单文件，CSS/JS 全部内联，零外部请求

[1.1.0]: https://github.com/Fogecode/obsidian-html-exporter/releases/tag/1.1.0
