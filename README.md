# dsh-everforest

[Everforest](https://github.com/sainnhe/everforest) 配色主题插件，用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的 Web / Desktop 界面。

> 状态：**0.1.2 已发布到 npm**（2026-10-18；0.1.2 为侧栏 / 内容卡边界修正，由 tag `v0.1.2` 触发 GitHub Actions + Trusted Publishing 发布、带 provenance；0.1.0 为本地首发，0.1.1 首次验证 CI 链路）。自动化验证：构建 / 单测 / 集成测试 / 对比度门槛全绿，`plugin_manager` 安装返回 `application: applied`，Client `settings.section` 出现 `id: everforest, order: 25`（页面含「跟随系统 / 深色 / 浅色」外观控制与 6 张色卡），`Theme.listTokens` 出现全部 212 个覆盖 token。**视觉走查与部分真机项仍需目检**（见「验证」）。npm 最新版本：[`dsh-everforest@0.1.2`](https://www.npmjs.com/package/dsh-everforest)。发布记录见 [`docs/releasing.md`](docs/releasing.md)。

## 功能

- **6 套调色板**：Everforest `Dark` / `Light` × `Hard` / `Medium` / `Soft`。**默认配对对齐 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)**（深色 Soft / 浅色 Hard）；深浅色由 DSH 内置的 Appearance（浅色 / 深色 / 跟随系统）决定，每组深浅色各自选择强度。**在设置页点击另一深浅色组的色卡会同时切换 DSH 外观**（会写入 DSH 的全局外观偏好，因此「跟随系统」会变成固定深浅色；设置页的「跟随系统」按钮可随时恢复自动跟随）。
- **token 级覆盖，不改组件 CSS**：通过 Client 的 `ctx.theme.overrideTokens()` 覆盖 `--dsw-*`（77 个 static 色阶 + 107 个 alias + 11 个 specific + 6 个辅助 token）与 `--shiki-*`（9 个 token + foreground/background，共 11 个），随 DSH 换肤机制自动按深浅色应用；插件停用 / 卸载时由插件自己的 `ctx.effect` 清理撤销（`overrideTokens` 的 disposer 不会自动挂 fiber）。
- **设置页**：在 Settings 中提供独立页面（`settings.section`），顶部是「跟随系统 / 深色 / 浅色」外观控制（写入 DSH 同一份全局外观偏好，选择「跟随系统」后随 OS 深浅色自动切换），下面是 6 张色卡（深色 / 浅色各 3 档强度）+ 当前生效行 + 恢复默认；切换即时生效并持久化，色卡带 `aria-pressed`、键盘可达，样式只用 `--dsw-*` token。
- **中英双语**：设置页文案经 Client locale 服务注册（`settings.everforest`，内置 `zh` / `en`）；插件管理页标题 / 描述读取 `locale/*.json`。
- **零运行时依赖**：正文只有一份 `client.js`（普通 JS，无构建产物依赖、无 React 重复安装）。
- **已知缺口**：终端 ANSI 16 色（xterm 内置盘，DSH 只传 bg / fg / cursor）、brand mark / 文件类型图标 artwork、Enchanted 的逐级标题彩色（DSH 无对应 token）、首帧 loading 页（Host 注入的字面底色，早于插件生效）、设置导航项图标（`settings.section` 不带 icon 字段，第三方页面显示默认齿轮）。

## 技术路线

```
DSH Client                          插件（browser half）
─────────────                      ─────────────────────
ctx.theme (ThemeRuntime)  ◄──────── overrideTokens('dsh-everforest', tokens)
  │                                   tokens: { '--dsw-alias-bg-base': { light, dark }, … }
  ├─ theme/change ────────────────►   仅刷新设置页的「当前」指示
  ▼
ui-layout ThemePresenter
  └─ document.body.style.setProperty(name, value)   ← token 以 body 内联变量落地，优先级最高
```

要点：

- 主题 token 是**内联写在 `body` 上**的，因此覆盖层同时压过 DSH 自带样式表，并按 `{ light, dark }` 自动随 Appearance 切换；插件卸载 / 停用时由插件注册的 cleanup 撤销该层（DSH 不会自动清理 override 层）。
- 覆盖的是任意 CSS 变量名，运行时只校验「每个 token 必须给出 light 与 dark 两个值」。这使 `--dsw-static-*`、`--dsw-specific-*`、`--shiki-*` 和 `--dsw-linear-*` / `--dsw-gradient-*` 都能一起接管。
- 映射策略（详见 [`docs/design.md`](docs/design.md) §4 与 [`docs/reference/contrast.md`](docs/reference/contrast.md)）：static 色阶用「明度锚定分段插值」而非按步数一一对应；alias / specific / shiki 全部显式给值，不依赖 static 自动跟随；浅色下承载正文的表面按 25% 向 `bg0` 提亮 + 对比度守卫，保证 6 档正文对比度 ≥ 4.5:1。
- 侧栏不是平铺 `bg0`：`--dsw-specific-sidebar-fill` 取 `bg0` → `bg1` 的 80% 混合并经对比度守卫，与内容卡（`bg-base` + 16px 圆角）保持可辨边界；同时新增「边界 ≥ 1.02:1」与「侧栏正文 ≥ 4.5:1」两道硬门槛，防止退回同色（`contrast.md` §2c）。
- 不为「应用内注册第三方主题」路线：DSH 设置文档只接受 `light | dark | system`，第三方主题 id 不参与持久化，也不出现在 Appearance 色卡里。

详细设计见 [`docs/design.md`](docs/design.md)；可行性证据与方案取舍见 [`docs/assessment.md`](docs/assessment.md)。

## 目录结构

```
dsh-everforest/
├── package.json            # dsh.bundle.patch + dsh.client（platform web，注入 ui-theme）
├── cordis.patch.yml        # 向 profile 插入插件行（id: everforest）
├── index.js                # Host 半部（空的 apply；仅承载 bundle 行与显示信息）
├── client.js               # Browser 半部（构建产物，提交入库）
├── src/                    # 编写源码（普通 ESM，零依赖）
│   ├── palette.js          # 6 套背景色阶 + 两套前景/强调色（由 scripts/palette.mjs 生成；与 docs/reference/palette.md 由测试强制一致）
│   ├── color.js            # 纯颜色工具（hex/rgba、mix、插值、WCAG 对比度）
│   ├── tokens.js           # token → 调色板角色 的映射与覆盖清单
│   ├── state.js            # localStorage 持久化（'dsh-everforest/v1'）
│   ├── locale.js           # 客户端中英文字典（NS: settings.everforest）
│   ├── settings-page.js    # settings.section 页面组件（createElement，无 JSX）
│   └── index.js            # Client 入口：apply(ctx) / inject / slots / locale
├── scripts/
│   ├── palette.mjs         # 内嵌 docs/reference/palette.md 的数据并生成 src/palette.js（测试逐值核对 md）
│   ├── build.mjs           # 零依赖 node 脚本：src/ → client.js（逐模块 IIFE 打包）
│   ├── extract-asar-package.mjs  # 零依赖从 Electron app.asar 导出单个包目录（开发期工具）
│   ├── extract-theme-tokens.mjs  # 从导出的 ui-theme 产物提取 token 清单（开发期工具）
│   └── check-contrast.mjs  # 6 档 WCAG 对比度门槛与报告
├── locale/{en,zh}.json     # meta.title / meta.description（插件管理页显示元数据）
├── icon.svg                # 原创图标
├── tests/                  # node:test（palette / color / tokens / state / settings-page / integration）
├── docs/
│   ├── assessment.md       # 可行性评估与技术证据
│   ├── design.md           # 实施方案
│   ├── releasing.md        # npm 发布与安装验证 runbook
│   └── reference/
│       ├── palette.md      # 配色数据与来源（唯一数据源）
│       ├── token-inventory.md/.json  # DSH 0.2.1-rc.2 的完整 token 清单（206 颜色 token）
│       └── contrast.md     # 6 档对比度报告 + 与 design 的偏差记录
├── .github/workflows/publish.yml  # tag 触发：OIDC trusted publishing + provenance
├── README.md
├── LICENSE                 # MIT
└── THIRD_PARTY_NOTICES.md  # Everforest / Everforest Enchanted（均 MIT）署名
```

## 安装

本地开发（目录安装）：

1. 在 DSH 侧栏 **Plugins → Add plugin → Install a third-party plugin** 选择本目录；
2. 或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标为本目录的绝对路径）；
3. 刷新页面，打开 **Settings → Everforest** 选择配色。

从 npm 安装（0.1.0 起，当前 0.1.2）：在插件管理页输入 `dsh-everforest` 安装，或由 Agent 调用 `plugin_manager` 的 `install_bundle`（目标 `dsh-everforest` / `dsh-everforest@0.1.2`）。发布流程（首次本地发布 → 配置 Trusted Publishing → 之后 tag 触发 CI）、检查清单、发布记录与回滚方式见 [`docs/releasing.md`](docs/releasing.md)；CI 工作流为 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)。

> 本机为目录安装（link 到本仓库），`files` 白名单不生效、移动或改名仓库会断链；`files` 只在 npm pack / 发布时过滤文件。

## 开发

- 运行时零依赖；Node 仅用于生成与测试。本机 Desktop 没把 node 放进 PATH，可用自带运行时（v24.21.0）：
  - Node：`C:\Users\formalistBlue\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`
  - pnpm：`…\dependencies\node\bin\node.exe …\dependencies\pnpm\bin\pnpm.cjs`
- 常用命令（在仓库根目录，把上面的 node 完整路径记作 `node`）：

  ```powershell
  node scripts/palette.mjs            # 生成 src/palette.js（数据与 docs/reference/palette.md 由测试核对）
  node scripts/palette.mjs --check    # 校验生成物未漂移（CI/测试用）
  node scripts/build.mjs              # 由 src/ 生成 client.js
  node scripts/build.mjs --check      # 校验 client.js 与源码同步
  node --test                         # 全部单测 + 集成测试
  node scripts/check-contrast.mjs     # 6 档 WCAG 对比度门槛 + 生成 docs/reference/contrast.md
  ```

- 提取 DSH 安装包里的 ui-theme 产物（token 清单的数据来源；`app.asar` 内文件 shell 读不到，用零依赖脚本解析）：

  ```powershell
  node scripts/extract-asar-package.mjs `
    --asar "C:\Users\<你>\AppData\Local\Programs\DeepSeek Harness\resources\app.asar" `
    --path "dsh/node_modules/@deepseek-ai/dsh-client-ui-theme" `
    --out "$env:TEMP\dsh-ui-theme"
  node scripts/extract-theme-tokens.mjs --from "$env:TEMP\dsh-ui-theme\lib\client.js"   # 生成 inventory
  node scripts/extract-theme-tokens.mjs --from "$env:TEMP\dsh-ui-theme\lib\client.js" --check
  ```

  inventory 里记录的是与路径无关的内容 SHA-256 指纹，因此 `--check` 可从任意路径的同版本文件复现；DSH 升级后先重新导出再 diff token 变化。
- 改动生效方式：
  - `client.js` 内容改动：Host 在启动时快照 bundle 字节，单刷新页面不会换代码；需让插件重新组合（**Plugins 页停用 → 启用**；插件管理器安装/升级同理）或重启 Host；
  - `package.json` / `cordis.patch.yml` / bundle 选择改动：HMR 即时重组合（无需重启）；
  - 停用/卸载后覆盖层必须立即消失（`overrideTokens` 的 disposer 必须挂在 `ctx.effect` 里）。

## 验证

已在本机自动化验证（2026-10-18，DSH 0.2.1-rc.2 / Desktop / Windows）：

| 项 | 证据 |
|---|---|
| 构建产物 | `node scripts/build.mjs --check` 通过；`node --check client.js` 通过；`factory` 返回 `{ name, inject, apply }`（VM 加载测试） |
| 单测 / 集成 | `node --test` 92 项全绿（palette 12、color 8、tokens 18、state 17、settings-page 23、integration 14；含 `apply()` 生命周期、延迟 slots/locale 挂载、token 覆盖率、inline code 芯片映射、侧栏边界、palette.md↔生成物一致性、bundle 格式、manifest/patch/locale/icon） |
| token 覆盖 | `docs/reference/token-inventory.json` 206 色 + 6 辅助全部在 `tokensFor()` 输出中；`Theme.listTokens` 出现全部覆盖 token（含 `--shiki-*` 与 `--dsw-linear-*`） |
| 对比度 | `node scripts/check-contrast.mjs --check` 硬门槛全过（label-primary vs bg-base/layer-1/2/**侧栏** 最小 4.51、shiki fg/bg 最小 4.53、反色前景真实配对 ≥4.66、品牌实底前景 2.70、侧栏 vs bg-base 边界 1.03–1.12、值合法）；报告见 [`docs/reference/contrast.md`](docs/reference/contrast.md) |
| 外观控制 | 设置页新增「跟随系统 / 深色 / 浅色」三按钮，点击经 store 调 `ctx.theme.setTheme`（写入 DSH 全局外观偏好，`system` 恢复 OS 跟随）；非法值被忽略，`aria-pressed` 与说明文案由单测 / 集成测试覆盖 |
| 安装 | `plugin_manager.install_bundle` → `application: applied`；`Slots.listSubTree(settings.section)` 出现 `registrant: dsh-everforest, id: everforest, order: 25, active: true` |
| 启用 / 外观控制上线 | 本轮 `plugin_manager.set_bundle(dsh-everforest, enabled=true)` → `application: applied`；`settings.section` occupant 与 `Theme.listTokens` 的 212 个覆盖 token 均恢复；新页面控件（外观控制 + 6 张色卡）的实际渲染与点击效果仍属人工目检项 |
| 停用清理 | 真机验证：`plugin_manager.set_bundle(dsh-everforest, enabled=false)` → `settings.section` 的 everforest occupant 消失、`Theme.listTokens` 从 212 个覆盖 token 回到内置 14 条（覆盖层已撤销）；重新 enable 后两项均恢复，全程 HMR 生效、无需重启 |
| npm 发布 | 2026-10-18 发布 `dsh-everforest@0.1.0`（dist-tag `latest`）；`npm view` 的 version / dist-tags / shasum（`77459d90…`）与本地打包一致；空缓存 `npm install dsh-everforest@0.1.0` 成功且包含 10 个运行时文件。Provenance 尚未生成（本次为本地 Web-OTP 发布，后续走 Trusted Publishing） |
| npm 发布（0.1.1 / CI） | 2026-10-18 推送 tag `v0.1.1` → GitHub Actions run `39134686583` 成功；registry `latest=0.1.1`、shasum `c88740ea…`；`dist.attestations.provenance` 为 SLSA v1，`_npmUser` 为 GitHub Actions（trustedPublisher id `177c86cc…`）；空缓存 `npm install dsh-everforest@0.1.1` 成功，tarball README 已刷新 |
| npm 发布（0.1.2 / CI） | 2026-10-18 推送 tag `v0.1.2` → GitHub Actions run `39138160540` 成功（`Publish with provenance` 输出 `+ dsh-everforest@0.1.2`，provenance 写入 sigstore transparency log）；registry `latest=0.1.2`、shasum `aebc8d78…`（与本地 `npm pack --dry-run` 的 shasum 一致）、`dist.attestations.provenance` 为 SLSA v1、`_npmUser` 为 GitHub Actions；空缓存 `npm install dsh-everforest@0.1.2` 成功且包含 10 个运行时文件，`gitHead` = 发布提交 |
| Trusted Publishing | 2026-10-18 通过 `npm trust github` 配置 GitHub Actions（repo `FormalistBlue/dsh-everforest`、workflow `publish.yml`、permissions = publish + stage publish、id `177c86cc…`）；`npm trust list` 复核通过；0.1.1 / 0.1.2 均由 CI 发布 |

仍需人工目检（无浏览器控制能力，自动项无法替代）：

1. Settings → Everforest 页面实际渲染（外观控制、6 张色卡、当前行、恢复默认）、中英文案随 DSH 语言切换；
2. 切换强度 / 点击另一深浅色组色卡的效果，以及 `document.body.style.getPropertyValue('--dsw-alias-bg-base')` 等于对应调色板值（DevTools）；
3. 用设置页控制与 DSH 自带 Appearance 分别切到深色 / 浅色 / 跟随系统，主题自动使用对应调色板；改 OS 深浅色时「跟随系统」状态应实时跟随；
4. Desktop 选择强度后退出应用重启，选择保持；
5. 代码高亮（`--shiki-*`）在聊天气泡、diff、工具输出三处生效；终端底色 / 字色跟随；
6. 全站视觉走查（聊天区 / 代码块 / diff / 菜单 / 设置 / 侧栏（含与内容卡的边界）/ composer / hover / 选中 / 状态色）与首帧闪动记录（已知缺口，0.3.0 再评估）。

## 兼容性

- 目标版本：DSH **0.2.1-rc.2**（本机安装版本）。`engines.dsh` 定为 `>=0.2.1-rc.2 <0.3.0-0`（排除 0.3 及其预发布，避免 token 改名后静默半残）。
- `engines.dsh` 在本版本**会被强制**：安装前由插件管理器校验（不满足则 pnpm 前拒绝，给出可读错误）；装载 profile 时由 app-boot 校验（不满足则该 bundle 被跳过并打印警告，不会白屏）。注意安装包自带的 `dsh-package-manifest` README 写「安装器/加载器不强制」，与 app-boot / plugin-manager 的实际行为相反，以实测行为为准。
- 覆盖依赖 DSH 内部 token 名（`--dsw-*` / `--shiki-*`）。属于「半官方扩展面」：`Theme` inspect 的内置推荐清单只有 14 个 token，运行时接受任意变量名；DSH 升级若改名，缺失的 token 会退化为原生配色（不会白屏），插件侧以版本范围 + 启动自检（读取 6 个**不覆盖**的原生 token 的 computed 值）应对。token 清单见 [`docs/reference/token-inventory.md`](docs/reference/token-inventory.md)。

## 已知偏差与设计取舍

- **浅色表面提亮**：light 三档的 `bg-layer-1/2/3`、代码块 / overlay 等承载正文的表面按 `mix(bg0, bgN, 0.25)` 向 `bg0` 提亮，并用对比度守卫微调，以满足正文 ≥ 4.5:1（上游 light·soft 原始映射为 4.17–4.38）。视觉上 light 更接近 DSH 原生（light layer1/2/3 = `#fff`）与 Enchanted 的平铺风格；dark 保留设计原值。详见 `docs/reference/contrast.md` §6。
- **语义色保持上游低对比度**：`state-warn/success/error` 等沿用 Enchanted/官方色（light warn 在 bg0 上约 1.9–2.2:1），与 DSH 原生语义色同级（native amber-500 on `#fff` ≈ 2.15），属图标 / 语义色用途，报告而非强改。
- **inline code 芯片是「表面」不是「前景色」**：DSH 把 `--dsw-alias-markdown-inline-code` 用作 inline code 的 `background-color`（文字继承 `label-primary`），并不是 Enchanted 的 `--code-inline` 前景蓝。旧映射取 `fg.blue` 会渲染成饱和蓝块 + 深色字（light 1.65:1、dark 1.29:1），既显眼又难读；现改为 Everforest `bg_blue` 芯片底（light 淡薄荷 / dark 灰蓝），并纳入文本承载表面硬门槛，6 档 `label-primary` 对比度 ≥ 4.50:1。
- **侧栏与内容卡之间有可见边界**：DSH 的 Windows 外壳用 `--dsw-specific-sidebar-fill` 画侧栏列 / 标题栏条 / 内容卡背后的 frame，用 `--dsw-alias-bg-base` 画带 16px 左上圆角的内容卡；native 两侧本就不同（light `#f9fafb` / `#fff`，dark `#1b1b1c` / `#151517`）。旧版把两者都设成 `bg0`，整条边界消失；现改为侧栏 `mix(bg0, bg1, 80%)` + 对比度守卫（light 更深 / dark 更浅，6 档边界对比度 1.03–1.12，native 为 1.045 / 1.060），并保留 light·soft 的 `label-primary` ≥ 4.5:1。
- **不覆盖**：字体 / 圆角 / 阴影 / `--dsw-focus-ring-*` / `--dsw-menu-backdrop-filter` / 终端 ANSI 16 色 / brand mark 与文件图标 artwork / macOS darwin 渐变 / boot 首帧色（清单见 `src/tokens.js` 顶部与 `TOKEN_COVERAGE.uncovered`）。
- **强度偏好按 origin 保存**：Desktop 窗口 origin 固定（`dsh-app://app`）可跨重启；用浏览器打开 Host URL 时端口每次随机，localStorage 不跨重启（设置页文案已说明）。

## 路线图

- [x] **0.1.0** — 可安装骨架 + 6 套调色板 + token 覆盖 + 设置页（含「跟随系统 / 深色 / 浅色」外观控制）+ inline code 芯片修正 + 本地持久化 + 本机安装验证 + npm 首发（2026-10-18，本地发布）
- [x] **0.1.1** — 补丁发布：通过 tag → GitHub Actions + Trusted Publishing 验证 CI 发布链路（无 2FA、带 provenance），刷新 npm 页面 README
- [x] **0.1.2** — 侧栏 / 内容卡边界修正：`--dsw-specific-sidebar-fill` 不再平铺 `bg0`，改为 `bg0` → `bg1` 80% 混合 + 对比度守卫；新增「侧栏边界 ≥ 1.02:1」「侧栏正文 ≥ 4.5:1」硬门槛；已由 tag `v0.1.2` → CI 发布（provenance）
- [ ] **0.2.0** — 真机目检与视觉回归修正、shiki 三处生效确认、README 截图
- [ ] **0.3.0** —（可选）Host 侧偏好持久化（跨浏览器一致）、消除首帧 loading 闪动（评估首帧注入在 Electron 窗口是否可用）、系统配色跟随细节

## 参考

- 配色数据：[Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（**主参考**，默认配对 / `header-*` 色 / UI 语义）、[sainnhe/everforest · palette.md](https://github.com/sainnhe/everforest/blob/master/palette.md)（6 套背景色阶）、[在线调色板](https://everforest.vercel.app/palette)（校色）。整理后的数据表见 [`docs/reference/palette.md`](docs/reference/palette.md)。
- 插件开发：DSH 技能 `cordis-plugin-development`（`references/host-plugin.md`、`references/ui-plugin.md`）
- 主题实现：`@deepseek-ai/dsh-client-ui-theme` 与 `@deepseek-ai/dsh-client-ui-layout` 的安装包 README / `lib/client.js`

## License

MIT（本插件）。配色数据来自 [Everforest](https://github.com/sainnhe/everforest)（Copyright (c) 2019 sainnhe）与 [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（Copyright (c) 2023 FireIsGood），二者均为 MIT，署名见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
