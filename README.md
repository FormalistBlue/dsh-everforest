<p align="center">
  <img src="https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-icon.png" width="120" alt="Everforest">
</p>

<h1 align="center">🌲 Everforest for DeepSeek Harness</h1>

<p align="center">
  中文 | <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.en.md">English</a>
</p>

<p align="center">
  Everforest 是一套以森林色为基调、温暖柔和的护眼配色。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-everforest"><img src="https://img.shields.io/npm/v/dsh-everforest" alt="npm version"></a>
  <a href="https://dsh-plugin.org/plugins/formalistblue/dsh-everforest"><img src="https://dsh-plugin.org/badges/listed.svg" alt="Listed on dsh-plugin.org"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH%20Web-Plugin-a7c080?labelColor=333C43" alt="DSH Web plugin"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/README.md"><img src="https://img.shields.io/badge/DSH-0.2.1--rc.3-7fbbb3?labelColor=333C43" alt="DSH 0.2.1-rc.3"></a>
  <a href="https://everforest.vercel.app/ports"><img src="https://img.shields.io/badge/Everforest-Ports-e69875?labelColor=333C43" alt="Everforest Ports"></a>
  <a href="https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/dsh-everforest" alt="license"></a>
</p>

dsh-everforest 为 DeepSeek Harness 提供 Everforest 配色主题，同时支持网页和桌面端。以森林为色调，深色与浅色共 6 档配色。对聊天内容（标题、代码、链接、表格等）做样式优化、独立着色，所有色调及饱和度都逐一调校，提供温暖柔和的护眼体验。

## ✨ 预览

**深色 · Soft（默认）**

![Everforest Dark Soft](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-dark-soft.png)

**浅色 · Hard（默认）**

![Everforest Light Hard](https://raw.githubusercontent.com/FormalistBlue/dsh-everforest/main/.github/assets/everforest-light-hard.png)

## 🚀 安装

1. 🧩 打开侧栏 **插件**（Plugins）页。
2. 📃 点 **添加插件**（Add plugin）旁的箭头，选 **安装第三方插件**（Install a third-party plugin）。
3. ✅ 输入 `dsh-everforest` 安装，装好后点 **立即启用**。

## 🔥 特性

- 🌳 颜色以柔和的鼠尾草绿与暖米色为主调，自然耐看。
- 👀 以护眼为设计的基础，对比度、饱和度对眼睛更友好。
- 🎨 设计了深色和浅色两套主要基调颜色，按喜好选择。
- 🖌️ 聊天内容着色：标题、文字、代码等都适配了 Everforest 配色，6 档配色采用 6 种不同的设计。
- 📐 聊天中表格显示边框，可拖动表头边框调整列宽。
- 📄 工作区会话列表按状态着色：待确认 / 已完成一眼分辨。
- ⌛️ 进入应用时的 loading 页面适配当前配色，启动更自然。
- ⚙️ 打开 **Settings → Everforest**，可选 6 档强度：
  - 深色：
    - **Soft（默认）** 对比度最低、最柔和；
    - **Medium** 对比度适中；
    - **Hard** 对比度最高、清晰锐利。
  - 浅色：
    - **Soft** 对比度最低、最柔和；
    - **Medium** 对比度适中；
    - **Hard（默认）** 对比度最高、阅读更清晰。

## ✅ 功能实现

**配色与覆盖**
- ✅ 6 套 Everforest 配色：深色 / 浅色 × 软 / 中 / 硬
- ✅ 默认配对对齐上游：深色 Soft、浅色 Hard
- ✅ 全站颜色 token 覆盖（含 shiki 代码高亮、diff、侧栏、浮层、边框、状态色）
- ✅ 六档配色分别校验对比度。

**内容着色与样式**
- ✅ Markdown 富文本：h1–h6 六色标题、加粗 / 斜体、行内代码、内部文件链接、引用块、分隔线、任务列表、表格（表头 / 斑马纹 / hover）
- ✅ 会话状态行：待确认（黄底）、已完成未查看（绿底），附状态点
- ✅ 工作区当前会话行高亮
- ✅ 原生文本选区配色，保留文字自身颜色
- ✅ 首屏 loading 页、spinner 环与进度弧使用当前配色
- ✅ 表格样式优化，提供列宽调整功能

**设置与持久化**
- ✅ 设置页：6 档强度 + 外观控制（浅色 / 深色 / 跟随系统）
- ✅ 切换即时生效，无需重启
- ✅ 偏好写入当前 profile 的 Host 配置：重启保持、同一 profile 多浏览器共享
- ✅ 深浅切换聚光灯动画

**发布与工程**
- ✅ npm 安装、插件市场收录、真机截图与市场截图清单
- ✅ 自动化测试覆盖配色、设置页、持久化、切换动画与表格列宽交互
- ✅ 构建与对比度校验自动执行

**待实现**
- ⬜ 更多界面语言（当前中 / 英，其余语言回退英文）
- ⬜ 更细粒度的自定义配色选项
- ⬜ 思考过程中的内容与工具调用的差异化着色
- ⬜ 首屏页面显示效果丰富化优化
- ⬜ 下拉选项的着色优化
- ⬜ 内置白天黑夜模式自动切换配置
- ⬜ 其他第三方插件页面兼容性优化
- ⬜ 表格列宽的记忆（刷新 / 切会话后保持）与触摸端支持

## 📚 参考

- 整体配色基于 <a href="https://github.com/sainnhe">sainnhe</a> 原创的 <a href="https://github.com/sainnhe/everforest">Everforest</a> 方案。
- 部分配色参考 <a href="https://github.com/FireIsGood/obsidian-everforest-enchanted">Everforest Enchanted</a>。

## 📜 License

[MIT 许可证](https://github.com/FormalistBlue/dsh-everforest/blob/main/LICENSE)。
