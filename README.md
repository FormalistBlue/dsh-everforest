# dsh-everforest

[Everforest](https://github.com/sainnhe/everforest) 配色主题插件，用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的 Web / Desktop 界面。

> 状态：**0.0.0 文档阶段** —— 技术评估、实施方案与调色板数据已定稿（见 [`docs/assessment.md`](docs/assessment.md)、[`docs/design.md`](docs/design.md)、[`docs/reference/palette.md`](docs/reference/palette.md)），插件代码尚未落地。

## 功能

- **6 套调色板**：Everforest `Dark` / `Light` × `Hard` / `Medium` / `Soft`。**默认配对对齐 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)**（深色 Soft / 浅色 Hard）；深浅色由 DSH 内置的 Appearance（浅色 / 深色 / 跟随系统）决定，每组深浅色各自选择强度。
- **token 级覆盖，不改组件 CSS**：通过 Client 的 `ctx.theme.overrideTokens()` 覆盖 `--dsw-*`（静态色阶、语义别名、特定表面）与 `--shiki-token-*`（代码高亮），随 DSH 换肤机制自动应用与撤销。
- **设置页**：在 Settings 中提供独立页面（`settings.section`），用色卡选择深色 / 浅色两组强度，切换即时生效并持久化。
- **中英双语**：设置页文案经 Client locale 服务注册。
- **零运行时依赖**：正文只有一份 `client.js`（普通 JS，无构建产物依赖、无 React 重复安装）。
- **已知缺口**：终端 ANSI 16 色（xterm 内置盘）、brand mark、Enchanted 的逐级标题彩色（DSH 无对应 token）不在覆盖范围内。

## 技术路线

```
DSH Client                          插件（browser half）
──────────────                      ─────────────────────
ctx.theme (ThemeRuntime)  ◄──────── overrideTokens('dsh-everforest', tokens)
  │                                   tokens: { '--dsw-alias-bg-base': { light, dark }, … }
  ├─ theme/change ────────────────►   监听 scheme 变化，仅重算展示态
  ▼
ui-layout ThemePresenter
  └─ document.body.style.setProperty(name, value)   ← token 以 body 内联变量落地，优先级最高
```

要点：

- 主题 token 是**内联写在 `body` 上**的，因此覆盖层同时压过 DSH 自带样式表，并按 `{ light, dark }` 自动随 Appearance 切换；插件卸载 / 停用时 DSH 自动撤销该层。
- 覆盖的是任意 CSS 变量名，运行时只校验「每个 token 必须给出 light 与 dark 两个值」。这使 `--dsw-static-*`、`--dsw-specific-*` 和 `--shiki-token-*` 都能一起接管。
- 不为「应用内注册第三方主题」路线：DSH 设置文档只接受 `light | dark | system`，第三方主题 id 不参与持久化，也不出现在 Appearance 色卡里。

详细设计见 [`docs/design.md`](docs/design.md)；可行性证据与方案取舍见 [`docs/assessment.md`](docs/assessment.md)。

## 目标结构

```
dsh-everforest/
├── package.json            # dsh.bundle.patch + dsh.client（platform web，注入 ui-theme）
├── cordis.patch.yml        # 向 profile 插入插件行
├── index.js                # Host 半部（0.1.0 为空 apply；仅让 bundle 有插件行）
├── client.js               # Browser 半部（构建产物，提交入库）
├── src/                    # 编写源码
│   ├── palette.js          # 6 套背景色阶 + 两套前景/强调色（由 scripts/palette.mjs 生成）
│   ├── tokens.js           # token → 调色板角色 的映射表
│   ├── apply.js            # 生成 override 层并应用到 ctx.theme
│   ├── settings-page.js    # settings.section 页面组件（createElement，无 JSX）
│   └── index.js            # Client 入口：apply(ctx) / inject / slots / locale
├── scripts/palette.mjs     # 按 docs/reference/palette.md 生成 src/palette.js
├── scripts/build.mjs       # 零依赖 node 脚本：src/ → client.js
├── locale/{en,zh}.json     # meta.title / meta.description + 设置页文案
├── icon.svg                # 原创图标（必需）
├── docs/assessment.md
├── docs/design.md
├── docs/reference/palette.md  # 配色数据与来源（官方 palette.md + Everforest Enchanted）
├── README.md
├── LICENSE                 # MIT
└── THIRD_PARTY_NOTICES.md  # Everforest / Everforest Enchanted（均 MIT）署名
```

## 安装

本地开发（目录安装）：

1. 在 DSH 侧栏 **Plugins → Add plugin → Install a third-party plugin** 选择本目录；
2. 或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标为本目录的绝对路径）；
3. 刷新页面，打开 **Settings → Everforest** 选择配色。

发布后（npm）：在 Plugin Manager 中安装 `dsh-everforest`（或按发布时的 DSH CLI 说明用 `dsh plugin add dsh-everforest`）。

## 开发

- 运行时零依赖；Node 仅用于生成：`node scripts/palette.mjs`（按 `docs/reference/palette.md` 生成 `src/palette.js`）与 `node scripts/build.mjs`（`src/` → `client.js`）。产物提交入库，安装时不执行构建脚本。
- 改完 `client.js` 后重启 DSH 或等待 HMR；解包分析 DSH 主题实现的方法见 `docs/assessment.md` 的「调研方法」。
- 自动校验点：
  - `cordis_inspect_query`（Client `Theme.listTokens`）应列出本插件注册的覆盖 token 名；
  - `cordis_inspect_query`（Client `Slots.listSubTree`，根 `settings.section`）应出现 `id: everforest` 的占用项；
  - 视觉回归需人工目检各页面（当前无浏览器控制能力）。

## 兼容性

- 目标版本：DSH **0.2.1-rc.2**（本机安装版本）。发布时写入 `engines.dsh`，并按实测结果扩展。
- 覆盖依赖 DSH 内部 token 名（`--dsw-*` / `--shiki-*`）。属于「半官方扩展面」：`Theme` inspect 只列出 14 个推荐 token，运行时接受任意变量名；DSH 升级若改名，缺失的 token 会退化为原生配色（不会白屏），插件侧以版本范围 + 启动自检应对。

## 路线图

- [ ] **0.1.0** — 可安装骨架 + 6 套调色板 + token 覆盖 + 设置页 + 本地持久化 + 本机验证
- [ ] **0.2.0** — 全页面对比度走查与修正、shiki 语法色、中英文案、图标、README 截图、npm 发布
- [ ] **0.3.0** —（可选）Host 侧偏好持久化（跨浏览器一致）、`webServer.tapIndex` 首屏注入消除闪动、系统配色跟随细节

## 参考

- 配色数据：[Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（**主参考**，默认配对 / `header-*` 色 / UI 语义）、[sainnhe/everforest · palette.md](https://github.com/sainnhe/everforest/blob/master/palette.md)（6 套背景色阶）、[在线调色板](https://everforest.vercel.app/palette)（校色）。整理后的数据表见 [`docs/reference/palette.md`](docs/reference/palette.md)。
- 插件开发：DSH 技能 `cordis-plugin-development`（`references/host-plugin.md`、`references/ui-plugin.md`）
- 主题实现：`@deepseek-ai/dsh-client-ui-theme` 与 `@deepseek-ai/dsh-client-ui-layout` 的安装包 README / `lib/client.js`

## License

MIT（本插件）。配色数据来自 [Everforest](https://github.com/sainnhe/everforest)（Copyright (c) 2019 sainnhe）与 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（Copyright (c) 2023 FireIsGood），二者均为 MIT，署名见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
