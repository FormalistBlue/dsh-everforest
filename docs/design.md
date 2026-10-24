# 实施方案

> 配套：[`assessment.md`](assessment.md)（为什么这样做）· [`reference/palette.md`](reference/palette.md)（配色数据与来源）· 目标环境：DSH 0.2.1-rc.2 · 状态：**已实现（v0.2.0，2026-10-19 增加首帧 Host boot 注入与系统跟随/文档收尾；2026-10-21 并入 0.2.1 的 P1 打磨；2026-10-22 0.3.0 落地 Host 侧持久化；2026-10-23 0.4.0 增加实验性色彩模式，含参考 Enchanted 的富文本扩展，见 §13）**；实现实况见 [`reference/token-inventory.md`](reference/token-inventory.md) 与 [`reference/contrast.md`](reference/contrast.md)

## 1. 目标与非目标

**目标**

1. 6 套 Everforest 调色板：`dark-hard` / `dark-medium` / `dark-soft` / `light-hard` / `light-medium` / `light-soft`；**默认配对对齐 Everforest Enchanted**（深色 soft、浅色 hard）。
2. 全站改色：背景、文字、边框、品牌、状态、侧栏、菜单/浮层、diff、代码高亮。
3. 设置页可选强度，切换即时生效；强度保存在**当前 profile 的 Host 配置**，同一 profile 的所有浏览器共享、重启后保持（见 §7）。
4. 可用 npm 安装。DSH 版本不匹配时给出可读结果：安装前被插件管理器拒绝（`engines.dsh`，可读错误）；已安装后升级 DSH 导致不兼容时，该 bundle 在装载 profile 时被跳过并在启动诊断里打印警告（不会白屏）。
5. 冷启动首帧使用当前配色：Host 半部经 `webserver/index-inject` 在 Client 加载前写入 boot 调色板（loading 页底色、文字、spinner 环与进度弧）。强度按 **B 方案**解析：本浏览器缓存优先 → Host 配置兜底 → 默认最后；解析结果经 `window.__EVERFOREST_BOOT__` 交给 Client 首帧。Web 首帧即为 Everforest；Desktop 窗口在 load 后才显示、注入行由页面侧异步应用，最多残留 1 帧原生色（2026-10-19 决策接受）。
6. 实验性**色彩模式**（0.4.0，默认开启、可在设置页关闭）：把调色板中尚未上场的强调色用到聊天 Markdown 内容与工作区会话记录状态行。首版（2026-10-23 用户目检后确认）为 h1–h3 标题、列表 marker、引用条 / 分隔线、表格表头色带 / 隔行斑马纹、任务列表 checkbox，以及会话记录「待确认 / 已完成未查看」的行底与状态点；用户验收初版后，参考 Obsidian Everforest Enchanted 的 markdown 配色扩展为完整富文本角色——h1–h6 六色标题、strong + em 紫、行内 code 蓝、内部文件链接 aqua、删除线与已完成任务淡化、引用块淡底、表头色带 / 斑马纹 / 行 hover、复选框蓝。**token 层零差异**：模式只额外注入一段作用域 CSS，关闭时所有选择器不匹配，渲染与 0.3.0 逐字节一致（见 §13）。

**非目标（0.x）**

- 不替换 DSH 的 Appearance 开关（light / dark / system 仍由 DSH 决定）；设置页只提供等价的快捷控制（见 §6），写入同一份全局偏好。
- 不接管终端 ANSI 16 色、brand mark、macOS 专用渐变。
- ~~不写 DSH 设置文档里的强度偏好~~ **已于 0.3.0 落地（2026-10-22）**：强度偏好改走官方 settings / `configForms` 通道写入当前 profile 的 `cordis.patch.yml`（见 §7），不再是「localStorage 唯一持久化」。**Appearance 偏好**仍归 DSH：点色卡或设置页外观控制会通过 `ctx.theme.setTheme` 写入（见 §2 / §6，已决策），本插件不接管其存储格式与 UI。
- 不做 Enchanted 的**全量**逐级标题彩色（h1–h6 各一色）作为**默认**行为：DSH 没有逐级标题颜色 token，改写组件选择器违背「只走 token」的原则。**0.4.0 的例外**：实验性色彩模式（默认开启、作用域 CSS）在用户验收初版后从 h1–h3 扩展到 h1–h6 与完整富文本角色；默认层标题仍是单色（见 §13）。

## 2. 总体架构

```
┌────────────────────────── Browser（Client 半部 client.js）──────────────────────────┐
│                                                                                     │
│  apply(ctx)                                                                         │
│   ├─ export const inject = ['theme']（configForms / slots / locale 用 ctx.inject 软等待）│
│   ├─ 首帧状态 = window.__EVERFOREST_BOOT__（Host boot 脚本发布；缓存→Host→默认）     │
│   ├─ ctx.effect(() => ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state)))        │
│   ├─ ctx.inject(['configForms'], formsCtx => formsCtx.configForms.get('everforest')) │
│   │    ├─ 订阅快照：就绪后以 Host 文档为准，与内存不同 → adopt（重建覆盖层 /          │
│   │    │   刷新设置页 / 把 Host 值写回 localStorage 缓存）；其他浏览器写入即广播      │
│   │    ├─ 迁移：本地缓存是真选择 + Host 无用户层 → 一次性 mutate 播种                │
│   │    └─ 表单就绪前的用户选择先排队（queuedWrite），绑定后补写                     │
│   ├─ ctx.effect(() => ctx.locale.register(NS, { zh, en }))（en/zh 是内置 locale id）  │
│   └─ ctx.slots.inject('settings.section', () => ctx.slots.register({ id: 'everforest', … }))│
│                                                                                     │
│  EverforestSection                                                                  │
│   ├─ 外观 3 卡片：浅色 / 深色 / 跟随系统（DSH AppearanceRow 样式）→ setPreference      │
│   ├─ 深色组 3 张卡 / 浅色组 3 张卡                                                   │
│   └─ onClick: select → 更新内存 + 写缓存 + configForms.mutate 写 Host → 替换覆盖层   │
│       → ctx.theme.setTheme(scheme)（已决策）                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                     DSH ThemeRuntime + ui-layout ThemePresenter
                     （body 内联变量；theme/change 广播；卸载自动还原）
                                        │
┌────────────────────── Host（index.js + src/host-config.js）─────────────────────────┐
│  export { Config }                                                                  │
│   = Schema.object({ light: union(STRENGTHS).default(…).volatile(),                  │
│                     dark:  同上 })                                                  │
│   → settings 服务投影为以 profile entry id `everforest` 为键的 configForms 表单      │
│   → 写入落当前 profile 的 cordis.patch.yml，同一 profile 的所有浏览器共享            │
│                                                                                     │
│  apply(ctx, config)                                                                 │
│   ├─ settings.configure({ auto: false })（可选）：声明本插件自己渲染设置页，         │
│   │   DSH 不再生成重复的自动表单；settings 服务缺失时静默跳过                        │
│   └─ ctx.on('webserver/index-inject', table => table.push({                          │
│        kind: 'script', placement: 'body', text: createBootScript(hostState(config))  │
│      }))                                                                             │
│       // 首帧 B：脚本执行时先读 localStorage 缓存，缺失/非法时逐字段回退到 emit 时    │
│       // 嵌入的 Host 值，再回退默认；结果写 window.__EVERFOREST_BOOT__，并给 body    │
│       // 写 boot 调色板内联变量（见 §5「首帧注入」）                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

> Host 半部不直接读写表单：它只声明 `Config` schema（settings 服务据此投影表单），并在每次 `webserver/index-inject` emit 时用 `hostState(config)` 把 volatile 引用读成当前值、嵌入首帧脚本作为 Host 兜底值。ui-theme 也监听同一事件并 `prepend` 自己的 boot rows（`:root{color-scheme}` + body `background-color:#fff/#151517` + `data-ds-theme-source` / `data-ds-dark-theme`），所以本插件的 row 一定排在它之后，脚本里能读到已解析的 scheme。

生命周期要点：

- **覆盖层必须由插件自己的 effect 持有**：`overrideTokens` 返回的 disposer 不会随插件 fiber 自动调用（层存在 root 级 `ThemeRuntime` 里），所以必须 `ctx.effect(() => ctx.theme.overrideTokens(...))` 或把返回的 disposer 挂进 effect；否则插件停用后会残留到页面重载。`ctx.locale.register` 同理需要 `ctx.effect`；`ctx.slots.register` / `ctx.slots.inject` 由 slot service 代挂调用者 fiber，可省略。
- 选强度不重建插件，只替换同一 source 的覆盖层（`overrideTokens` 语义：同 source 整体替换并重新置顶，旧 disposer 变为 no-op）；替换后发 `theme/change`，presenter 同步重新应用。
- 深浅色切换不需要插件做任何事：覆盖层里每个 token 同时带 `light` 与 `dark`，presenter 按当前 `active.colorScheme` 取值。
- **强度真源是 Host 文档**（0.3.0）：Client 不直接写 `cordis.patch.yml`，只调用配置表单的写操作（选择 = 一次 `mutate` 里 set 两个字段，恢复默认 = 一次 `mutate` 里 unset 两个字段）；settings 服务负责落盘并在同一 profile 的所有浏览器间广播。表单通过**软注入** `ctx.inject(['configForms'], …)` 等待（不写进模块级 `inject`，否则旧宿主会把整个 Client 插件挂起）；Client 拿到 Host 快照后以它收敛内存与首帧缓存，本机缓存只在首帧与旧宿主降级时被读取（§7）。
- **升级 / 回滚需要重启 DSH**：Host 半部（`Config` 注册与 boot 脚本）在 Host 启动时装载，刷新页面不会重载 `index.js`；0.3.0 之后运行中改强度走 settings 通道，不需要重启。**只换 npm 包不重启时**，新 Client 会因 Host 半部仍是旧版而退回 localStorage-only（选择仍生效、只是暂不写 Host）；重启 DSH 后首次加载会把本地缓存一次性播种到 Host。`mutate` 被拒（`response.ok` 为 false / revision 冲突）时回读 Host 值、以 Host 为准并 warn 一次；代码保留 `writable` 守卫只是防御——0.2.1-rc.2 的 native settings provider 恒报告 `writable: true`，实际不可达。
- **首帧（Client 加载前）**：Host 半部的 boot row 写入 8 个 token（`bg-base`、三级 label、代码块底、`sidebar-fill`、`border-l2`、`brand-primary`），值来自同一份 `tokensFor()`；强度按 B 方案在脚本执行时解析（缓存 → Host → 默认），并把结果发布到 `window.__EVERFOREST_BOOT__` 供 Client 首帧沿用。Client ThemePresenter 首次 apply 用同名 body 内联变量覆盖，因此不会残留。若 Client 半部加载失败，boot 调色板保留到本页结束（可接受的降级）。
- 设置页点另一深浅色组的色卡会调用 `ctx.theme.setTheme(scheme)` 立即预览；**这会真实写入 DSH 的全局 Appearance 偏好**（Host 设置文档，所有已认证浏览器共享），并把「跟随系统」改成固定深浅色。页面顶部的「跟随系统 / 深色 / 浅色」控制写同一份偏好，可随时恢复 `system`（已决策，2026-10-18；外观控制为后续补充）。

## 3. 数据模型

### 3.1 调色板（6 套）

完整数据表与来源见 [`reference/palette.md`](reference/palette.md)（官方 palette.md + Everforest Enchanted，均记录 commit 快照）。模型把「背景」与「前景」拆开：

```js
/** 每个变体 = 一套背景色阶（hard/medium/soft × dark/light，来自官方 palette.md） */
/** @typedef {{ bgDim,bg0,bg1,bg2,bg3,bg4,bg5,
 *  bgVisual,bgRed,bgYellow,bgGreen,bgBlue,bgPurple }} BackgroundRamp */
/** 前景 / 强调 / header 色按 scheme 共享（官方语义：强调色不随对比度变化） */
/** @typedef {{ fg, red,orange,yellow,green,aqua,blue,purple, grey0,grey1,grey2,
 *  headerRed,headerOrange,headerYellow,headerGreen,headerAqua,headerBlue,headerPurple }} Foreground */
```

- **变体只切换背景色阶**：`dark-hard / dark-medium / dark-soft / light-hard / light-medium / light-soft`，共 6 套；前景、强调、`header-*` 色在同一 scheme 内保持不变。这样选强度只改「底」，语义色（链接、状态、品牌）始终是同一套 Everforest 色。
- **默认配对对齐 Everforest Enchanted**：深色 = `soft`、浅色 = `hard`。Enchanted 的背景值严格等于官方这两套，所以默认观感与其一致；另外四套作为可选的强度档。
- **`header-*` 自定义色**也来自 Enchanted（比 `fg-*` 更沉稳，用于链接 / 交互强调 / 品牌）；light 的文档选中色采用 Enchanted 的 `#DED8DB` 修正——该修正上游只在 light · hard 上出现，本插件外推到 light · medium / soft（见 `reference/palette.md` §3 注）。
- 数据由 `scripts/palette.mjs` 生成 `src/palette.js`，单元测试固定期望值，避免手抄漂移。

### 3.2 用户状态

**真源 = 当前 profile 的 Host 配置**（0.3.0 起）。当前 active profile 的 `cordis.patch.yml` 里，本插件行带 `config`：

```yaml
- id: everforest            # = ENTRY_ID（src/host-config.js 与 src/durable.js），也是 configForms 的键
  name: dsh-everforest
  config:
    light: hard
    dark: soft
    colorMode: true        # 0.4.0 起；缺省即 true（默认开启，0.3.x patch 不用手改）
```

```js
// Host 半部 src/host-config.js（0.4.0）
export const Config = Schema.object({
  light: Schema.union(STRENGTHS).default(DEFAULT_STATE.light).volatile(),
  dark:  Schema.union(STRENGTHS).default(DEFAULT_STATE.dark).volatile(),
  colorMode: Schema.boolean().default(false).volatile(),
})
```

- **`Config`** 由 DSH settings 服务扫描活跃 profile 条目后投影成表单，表单键 = entry id（`everforest`）；`.volatile()` 让 Loader 把新值写进运行中的引用而不重挂插件。非法值在校验期被拒：**冷启动 / 重挂**时 entry 不激活（无主题）；**运行中**的 volatile-only 更新失败被 Loader 捕获、保留旧值（entry 保持 ACTIVE，见 §7）。`colorMode` 是 0.4.0 新增的第三个 volatile 字段（布尔、默认 `false`），写入与两个强度一起**一次原子提交**。
- **Client** 通过 `ctx.inject(['configForms'], …)` 软等待服务，再 `formsCtx.configForms.get('everforest')` 读（`status` / `value` / `base` / `user` / `revision` / `writable` + `subscribe`）与写（`mutate(ops)`）；entry id 必须与 `cordis.patch.yml` 的 `id` 一致（Client 的 `src/durable.js` 与 Host 的 `src/host-config.js` 各持一份常量，测试把两者与 patch 行一起钉住）。Client 侧纯逻辑（`hasUserLayer` / `shouldSeed` / `stateFromHost` / `statesEqual` / `stateToSetOps` / `stateToUnsetOps` / `bootHintState`）集中在 `src/durable.js`，随 `build.mjs` 打进 `client.js`（不进 `files`）。
- **首帧缓存（不是真源）**：`localStorage['dsh-everforest/v1']`，内容是 `{ version: 1, light, dark, colorMode? }`。0.4.0 起增加可选 `colorMode`；**`STATE_VERSION` 保持 1**，0.3.x 缓存缺该字段读作 `false` 且不算损坏（仍参与迁移），非布尔值按损坏处理。
- **首帧 boot payload 不含 `colorMode`**：Host boot 行只画首帧需要的 8 个 token，色彩模式 CSS 在 Client 挂载后才有意义（首帧还没有聊天 / 会话 DOM），因此 `__EVERFOREST_BOOT__` 与 `hostState()` 保持只含两个强度，payload 与 0.3.0 逐字节一致。
- **解析顺序**：首帧 = 缓存 → Host 值 → 默认；运行期 = Host 文档为权威。读取失败 / 缓存非法 / 版本不认识 → 逐字段回退，最终回退默认状态 `{ light: 'hard', dark: 'soft', colorMode: true }`，不抛错。

```js
/** 首帧缓存 / 旧宿主降级结构（localStorage: 'dsh-everforest/v1'） */
{
  version: 1,
  light: 'hard' | 'medium' | 'soft',   // 默认 'hard'（对齐 Enchanted 的 Light 主题）
  dark:  'hard' | 'medium' | 'soft',   // 默认 'soft'（对齐 Enchanted 的 Dark 主题）
  colorMode: true | false              // 0.4.0；可缺省（缺省 = false，0.3.x 缓存兼容）
}
```

### 3.3 覆盖层

```js
/** Record<cssVariableName, { light: string, dark: string }> */
tokensFor(state) → {
  '--dsw-alias-bg-base': { light: lightRamp.bg0, dark: darkRamp.bg0 },
  '--dsw-alias-brand-primary': { light: lightFg.headerAqua, dark: darkFg.headerAqua },
  '--dsw-static-neutral-bluish-1000': { light: lightFg.fg, dark: darkFg.fg },
  '--shiki-token-keyword': { light: lightFg.blue, dark: darkFg.blue },
  …
}
```

## 4. token 映射策略（三层）

> **2026-10-18 实现前审计修正**（证据：DSH 0.2.1-rc.2 的 `@deepseek-ai/dsh-client-ui-theme` 8 张样式表；与本机 asar 交叉）：
>
> - 统计口径：403 个 `--dsw-*` 是 **ui-theme 单包 8 张 sheet 的唯一名合计**（不是四个包）；颜色类 77 static + 107 alias + 11 specific = 195 ✔；107 alias = 101 design-platform + 2 settings-card + 4 onboarding；dark 侧 alias 重定义为 **101**（旧文档写 105 有误）；「11 个 `--shiki-token-*`」实为 **9 个 token 变量 + `--shiki-foreground` + `--shiki-background`**。
> - light 侧 112 条 alias/specific 声明（101 alias + 11 specific）：74 条直接 `var(--dsw-static-*)` + 5 条 color-mix（内含 static）可跟随；**28 条字面量 + 5 条 alias 间引用**需要显式处理。
> - **static 色阶不能「按明度顺序一一映射」**：DSH 的 blue 12 步、neutral-bluish 19 步，Everforest 同色相只有 3–5 档。实现时先写映射公式（分段线性插值 + 明度端点锚定，必要时 `color-mix`），再用对比度检查验证，不能逐条手抄。
> - **必须显式覆盖的新增项**（旧文档未提）：`border-inverted*`、`label-primary-foreground` / `brand-text`（品牌实底上的前景）、`button-primary-hover` / `-dimmed`、`markdown-inline-code`（默认引用中性 static，只改 static 会变中性；DSH 实际用作背景，映射见下文修正）、4 个带 alpha 的 static（`green-500-a08/a12`、`red-400-a12`、`red-600-a08`）、`menu-surface-fill` / `menu-group-header-fill` / `button-tool-bar-*`、遮罩族、`linear-gradient-think*`（Windows 可见）、onboarding 7 个 token、`tooltip-key-bg`。
> - **文档选中色保留 40% 透明语义**：`--dsw-alias-bg-document-selection` 给 `color-mix(in srgb, bg_visual 40%, transparent)`，不要直接给实色（否则文档预览选区会盖住底图）。
> - **shiki 必须显式**：`shiki.css` 在 `:root` 声明 light 值，且 `--shiki-background` / `--shiki-foreground` 在 `:root` 引用的是 body 级 alias（级联上属 guaranteed-invalid），不能靠 alias 继承。
> - **明确不覆盖**：字体 / 圆角 / 阴影 / `--dsw-focus-ring-color` / `--dsw-focus-ring-width` / `--dsw-menu-backdrop-filter` / 终端 ANSI 16 色 / brand mark 与文件图标 artwork / macOS darwin 渐变。boot 首帧色已改由 Host 半部的 `index-inject` row 覆盖（见 §5「首帧注入」与 §12），不再属于不覆盖项。未覆盖的 alias 保持 DSH 原值，并在 `src/tokens.js` 顶部登记清单。

> **2026-10-18 视觉走查修正（inline code 芯片）**（证据：`dsh-web-frontend/dist/assets/index-*.css`：`.markdown :not(pre) > code { background-color: var(--dsw-alias-markdown-inline-code); border: .5px solid var(--dsw-alias-border-l1) }`；native light = `static-neutral-50`、dark = `static-neutral-800`，两侧都是**背景**中性色）：
>
> - 旧方案把该 token 映射成 `p.fg.blue`，误把 Enchanted 的前景变量 `--code-inline`（蓝色**文字**）当成了 DSH 的背景语义。实际渲染是「饱和蓝色块 + 继承的 `label-primary` 深色字」：`label-primary` 对该底的对比度 light 仅 **1.65:1**、dark **1.29:1**，既抢眼又难读（浅色主题下最明显）。
> - 修正：映射为 Everforest 的 `bg_blue` 芯片表面（`inlineCodeSurface`，取调色板里「蓝色背景」角色：light 淡薄荷、dark 灰蓝），文案仍继承 `label-primary`；并把该 token 加入 `scripts/check-contrast.mjs` 的文本承载表面硬门槛，6 档 ≥ 4.5:1。
> - 结果：light-hard 芯片 `#ECF5ED`（5.01:1）、light-soft `#E6E8DA`（4.50:1）、dark-hard `#384B55`（5.39:1）、dark-soft `#3F5764`（4.51:1）；芯片比 `bg0` 略深（light）/ 略浅（dark），只是一个安静的代码底，不再是前景强调色。

> **2026-10-24 视觉修正（深色 inline code 芯片）**（用户截图对比 Everforest Enchanted 的行内代码）：
>
> - dark 侧由 `bg_blue` 改为 `bg_dim`。`bg_blue` 在深色下比 `bg0` 高一档（dark·soft `#3F5864` / `#3F5765`，画布 `#333C43`），芯片读成「抬起的灰蓝色块」；Enchanted 的行内代码底色是 `bg_dim`（截图实测 `#293136`，即本调色板 dark·soft 的 `bgDim`），比画布更深、呈凹陷的代码底。
> - 修正分两步：先取 Enchanted 的行内代码底 `bg_dim`（dark·soft `#293136`），真机目检偏深（用户二次反馈「有点太深」）；最终以 `bg_dim` 为起点向 `bg0` 提亮 30%（`DARK_INLINE_CHIP_LIFT = 0.3`），dark·soft 芯片变为 `#2C343A`，比画布 `#333C43` 只略深（1.13:1），仍是凹陷的代码底，但不再和代码块同底。
> - 蓝色语义由色彩模式的行内 code 前景（`--everforest-color-inline-code`）承担；浅色档保持 `bg_blue`（淡薄荷）。`label-primary` 对芯片 6 档仍 ≥ 4.5:1、色彩模式 `inlineCode` 蓝字对芯片 ≥ 3:1，数值由 `docs/reference/contrast.md` 重新生成。

> **2026-10-18 视觉走查修正（侧栏边界）**（证据：`@deepseek-ai/dsh-client-ui-layout` 的 `AppFrame.module.css`、`dsh-client-ui-sidebar` 的 `SidebarRoot.module.css`；用户截图对比）：
>
> - DSH 用 `--dsw-specific-sidebar-fill` 画三处：侧栏列（`.sidebarCol`）、Windows 标题栏条（`[data-windows-titlebar] .frame:before`）以及内容卡背后的 frame；内容卡本身是 `--dsw-alias-bg-base`（bg0）+ 16px 左上圆角（`[data-windows-titlebar] .centerCol`）。native 两侧本就不同（light 侧栏 `#f9fafb` / 内容 `#fff`，dark `#1b1b1c` / `#151517`），所以能看出边界。
> - 旧方案把两者都映射成 `bg0`（Enchanted 平铺风格），整条边界消失 —— 用户报告「Everforest 全部用的同一个颜色，没法区分边界线了」。
> - 修正：`--dsw-specific-sidebar-fill` = `mix(bg0, bg1, 80%)` 再经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏一致）；6 档边界对比度 1.03–1.12（native 1.045 / 1.060，观感同级）。light·soft 受正文 4.5:1 上限约束，实际取 `#eee7ce`（守卫后的最大步长）。该 token 已加入 `scripts/check-contrast.mjs` 的文本承载表面，并新增「侧栏边界 ≥ 1.02:1」硬门槛（`contrast.md` §2c/§3）。
> - 连带：该 token 同时是桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会与自绘标题栏条同色；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。

### 第 1 层：派生映射（覆盖 195 个颜色 token）

`src/tokens.js` 用「角色 / 表达式」描述，而不是逐条写死六份颜色：

```js
export const TOKEN_MAP = {
  // 背景 / 表面
  '--dsw-alias-bg-base':               r => r.bg0,
  '--dsw-alias-bg-layer-1':            r => r.bg1,
  '--dsw-alias-bg-layer-2':            r => r.bg2,
  '--dsw-alias-bg-layer-3':            r => r.bg3,
  '--dsw-alias-bg-overlay':            r => r.bg2,
  // 侧栏 = bg0 向 bg1 混 80% + 对比度守卫：与 bg-base 拉开可辨边界（见上方修正）
  '--dsw-specific-sidebar-fill':       r => sidebarSurface(r),
  // 气泡 = 浅色 sage tint（light·soft 因 4.5:1 文本上限改用淡鼠尾草纸抬起卡片）；深色 bg1（见 §12）
  '--dsw-specific-bubble':             r => bubbleSurface(r),
  '--dsw-alias-markdown-code-block':   r => r.bgDim,
  // 文字 / 边框
  '--dsw-alias-label-primary':         r => r.fg,
  '--dsw-alias-label-secondary':       r => r.grey1,
  '--dsw-alias-label-tertiary':        r => r.grey2,
  '--dsw-alias-border-l1':             r => alpha(r.bg5, 0.45),
  '--dsw-alias-border-l3':             r => alpha(r.bg5, 0.80),
  // 强调 / 状态（Enchanted 语义）
  '--dsw-alias-brand-primary':         r => r.headerAqua,
  '--dsw-alias-link':                  r => r.headerBlue,
  '--dsw-alias-state-success-primary': r => r.green,
  '--dsw-alias-state-warn-primary':    r => r.yellow,
  '--dsw-alias-state-error-primary':   r => r.red,
  '--dsw-alias-state-business-primary':r => r.blue,
  '--dsw-alias-state-idle-primary':    r => r.grey2,
  …
}
```

DSH 概念 → Everforest 角色的基线映射（细节在实现时展开）：

| DSH | Everforest | 依据 |
|---|---|---|
| `bg-base` | `bg0` | 主背景 |
| `bg-layer-1/2/3` | `bg1` / `bg2` / `bg3` | 输入框、行 hover、菜单、嵌套层 |
| `bg-overlay` | `bg2` | 浮层 / popover |
| `specific-sidebar-fill` | `bg0` → `bg1` 的 80% 混合（对比度守卫） | 侧栏列 / Windows 标题栏条与内容卡（`bg-base` + 16px 圆角）之间需要可辨边界；平铺 `bg0` 会让边界消失（见上方 2026-10-18 修正） |
| `specific-bubble` | 浅色：`bg0` → `header-aqua` 16% 的 sage 纸面（`readableToward` 向白守卫）；light·soft 因文本 4.5:1 上限改为白 → `fg.green` 13% 的淡鼠尾草纸（`#f0f3de`）。深色：`bg1`（对比度守卫） | DSH 用户消息气泡；2026-10-19 修正：旧映射 `bg1` 与 `bg0` 仅 1.02–1.06，浅色下与画布融为一体；2026-10-21：light·soft 不再用近白卡片（见 §12） |
| `specific-bubble-highlight` | 浅色 / 深色均 `surface(p, 2)` | 气泡高亮态（当前 chat 未使用，保留最近层级语义） |
| `markdown-code-block` | `bg_dim` | Enchanted 代码底 |
| `markdown-inline-code` | 深色 `bg_dim` 向 `bg0` 提亮 30% / 浅色 `bg_blue`（芯片表面） | DSH 用作 inline code 的**背景**（文字继承 `label-primary`）；Enchanted `--code-inline` 是前景色，不可复用；深色 2026-10-24 先由 `bg_blue` 改为 `bg_dim`、再向 `bg0` 提亮 30%（芯片对画布 1.11–1.13:1 的凹陷，见上方修正） |
| `label-primary/secondary/tertiary` | `fg` / `grey1` / `grey2` | — |
| `border-l1..l4` | `bg5` 的 45/60/75/90% alpha | Enchanted 边框 = `bg5` |
| `brand-primary`（主按钮、选中） | `header-aqua` | Enchanted `interactive-accent` |
| `link` | `header-blue` | Enchanted 外部链接 / `text-accent` |
| `state-success / warn / error / business / idle` | `green` / `yellow` / `red` / `blue` / `grey2` | Enchanted 语义 + 状态可读性 |
| `bg-document-selection` | `bg_visual`（light 用 `#DED8DB`） | Enchanted 选区修正 |
| `file-diff-*` / `code-diff-*` | `bg_green` / `bg_red` 底（light 向 `bg0` 混 45%，dark 也向 `bg0` 混 40%）+ `green` / `red` 标记；gutter light 提亮 35% / dark 压暗 35% | Everforest diff 语义（2026-10-21 可读性修正，见 §12） |
| `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑白高透明，仅按变体微调 | 遮罩语义 |
| `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 原不透明度 alpha | 浮层 / 工具栏材质 |
| `border-inverted` / `border-inverted2` | `bg5` alpha（浅色低透明度、深色约白 6%） | 反向边框 |
| `label-primary-foreground` / `brand-text` | `bg0`（品牌 / 主按钮实色底上的前景） | 避免青绿底配白字对比不足 |
| `button-primary-hover` / `button-primary-dimmed` | `header-blue`（hover）/ `header-aqua` 降低饱和（dimmed） | 主按钮状态，默认引用中性 static |
| `interactive-bg-active` / `-hover` / `-hover-accent` / `-hover-danger` | `bg3` / `bg4` + `header-*` 半透明 | 交互反馈 |
| `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐隐 | 思考过程渐隐（Windows 可见） |
| onboarding（accent + 3 渐变 stops + card/secondary/checkbox 边框） | `header-aqua` / `bg_*` 派生 | 首登页，7 个 token |
| `brand-primary-new-color` | `header-aqua` | 品牌强调（light 侧是字面量） |
| `tooltip-key-bg` | tooltip 深色底向亮端 `mix(…, 25%)`（实现修正，原写 `bg3`） | 键帽 |
| `focus-ring`（不覆盖） | 走 `state-business-primary` 派生 | 焦点环跟随状态色，不单独覆盖 |

- **static 色阶**（77）：把 DSH 的 `neutral-bluish-00…1000`、`neutral-*`、`deepseek-*`、`blue-*`、`green/red/amber-*` 各自映射到 Everforest 对应色相当量。**不能按明度顺序一一对应**（两边步数不同）：以「最暗 = bg5、最亮 = bg0」为端点做分段线性插值，中间按目标色相的明度分布取档；4 个带 alpha 的 static（`green-500-a08/a12`、`red-400-a12`、`red-600-a08`）单独给 rgba。使所有 `var(--dsw-static-*)` 引用自动跟随。
- **alias / specific**（118）：74 条直接 static var + 5 条含 static 的 color-mix 自动跟随；**28 条字面量 + 5 条 alias 间引用**必须显式给值（见第 2 层）。
- 保底规则：任何没有显式映射、且不引用被覆盖 static 的 `--dsw-alias-*` 不覆盖（保持 DSH 值），避免误伤；在 `src/tokens.js` 顶部列出「未覆盖清单」，便于逐版本核对。

### 第 2 层：33 个字面量 alias（必须显式给值）

| 分类 | 例子 | 处理 |
|---|---|---|
| 边框透明度 | `border-l1/l2/l3/l4`、`border-l2-darkmode-thin`、`interactive-bg-hover*` | 用 `bg5` 的 alpha 重算（`color-mix` 或 8 位 hex），保持「边框 = bg5、hover 边框 = bg3」的 Enchanted 语义 |
| 反向边框 | `border-inverted`、`border-inverted2`（旧文档漏） | `bg5` alpha：浅色低透明度、深色约白 6% |
| 遮罩 | `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑色/白色高透明，仅按变体微调 |
| 菜单 / 浮层材质 | `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 45%–94% alpha，保持原不透明度语义 |
| diff | `file-diff-added/deleted-{bg,gutter,marker}`、`code-diff-*` | `bg_green` / `bg_red` 底（dark 也向 `bg0` 收 40%，避免亮绿条；gutter 沿 scheme 纵深方向退一步），`green` / `red` 作 gutter 与标记 |
| 选区 | `bg-document-selection`（原生是 blue-500 40%） | `color-mix(in srgb, bg_visual 40%, transparent)`；light 用 `#DED8DB` 的 40% |
| 品牌 / 主按钮 | `brand-primary-new-color`、`label-primary-foreground`、`brand-text`、`button-primary-hover` / `-dimmed` | `header-aqua` + `bg0` 前景；hover 用 `header-blue` |
| 思考渐隐 | `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐变（Windows 可见） |
| 首登页 | `onboarding-accent`、`gradient-onboarding-{violet,blue,cyan}-stops`、`onboarding-card-fill` / `secondary-fill` / `checkbox-border` | `header-*` / `bg1` / `bg2` 派生（7 个 token） |
| 其它 | `label-deep-diving*`、`label-shimmer`、`tooltip-key-bg` | 按语义取 accent / 半透明叠加 |

### 第 3 层：代码高亮（11 个）

`--shiki-token-constant / string / comment / keyword / parameter / function / string-expression / punctuation / link` 以及 `--shiki-foreground` / `--shiki-background`。映射沿用 Enchanted 的代码语义：

| shiki token | 取值 | Enchanted 对应 |
|---|---|---|
| `foreground` | `fg` | `--code-normal` |
| `background` | `bg_dim` | `--code-background` |
| `comment` | `grey1` | `--code-comment` |
| `punctuation` | `grey1` | `--code-punctuation` |
| `function` | `green` | `--code-function` |
| `keyword` | `blue` | `--code-keyword` |
| `parameter` | `orange` | `--code-operator` |
| `string` / `string-expression` | `yellow` | `--code-string` |
| `constant` | `purple` | `--code-value` |
| `link` | `header-blue` | 链接色 |

两套 scheme 各一份值。**11 个全部显式覆盖**（9 个 `--shiki-token-*` + `--shiki-background` + `--shiki-foreground`）：`shiki.css` 在 `:root` 声明 light 值，且 foreground/background 在 `:root` 引用 body 级 alias（级联上 guaranteed-invalid），不能依赖 alias 继承。`--dsw-alias-markdown-inline-code`（不属 shiki 层）也必须显式：DSH 把它用作 inline code 的 `background-color`，映射为芯片表面（浅色 `bg_blue` / 深色 `bg_dim`）并受对比度守卫（见上文「视觉走查修正」），不沿用 Enchanted 的 `--code-inline` 前景蓝。

### 焦点环与派生变量

`--dsw-focus-ring-color` 走 `--dsw-alias-state-business-primary`（DSH 默认蓝），所以映射 `state-business-*` 即自动换色；**不要覆盖 `--dsw-focus-ring-color` 本身**（pointer 模态靠它置 transparent 来消隐焦点环），也不要覆盖 `--dsw-focus-ring-width`。

## 5. 应用流程（伪代码，0.3.0 口径）

```js
export const inject = ['theme']   // 模块导出只写硬依赖；configForms 用 ctx.inject 软等待，slots / locale 用 ctx.get + ctx.inject 兜底

const PACKAGE_ID = 'dsh-everforest'
const ENTRY_ID = 'everforest'     // = cordis.patch.yml 的 id，也是 configForms 的键

export function apply(ctx) {
  // 0) 首帧状态：先读 Host boot 脚本发布的 B 方案结果（缓存→Host→默认）；
  //    没有 boot 行（旧宿主 / 非 index 页面）时退回 localStorage 缓存 / 默认配对。
  let state = bootHintState(window.__EVERFOREST_BOOT__) ?? readState()

  // 1) token 覆盖层 + 词典 + 跨 origin 兜底同步（同 0.2.1 的效果）
  ctx.effect(() => {
    applyLayer()
    return () => { layerDispose?.(); layerDispose = null }
  }, 'everforest: token layer')
  ctx.effect(() => locale.register(NS, { zh, en }), 'everforest: dictionaries')
  ctx.effect(() => subscribeStorageSync(onStorage), 'everforest: cross-window sync')

  // 2) Host 真源（0.3.0）：configForms 软等待。模块级 inject 只写 'theme'——
  //    旧宿主没有该服务时，写进数组会让整个 Client 插件永久挂起。
  let form = null
  let seedCompleted = false
  let queuedWrite = null
  ctx.inject(['configForms'], (formsCtx) => {
    form = formsCtx.configForms.get(ENTRY_ID)
    const off = form.subscribe(syncFromHost)
    syncFromHost()
    return () => { off?.(); form = null }
  })

  function syncFromHost() {
    const snapshot = form.getSnapshot()          // { status, value, base, user, revision, writable }
    if (snapshot.status !== 'ready') return      // idle / loading / unavailable（旧宿主）→ 保持 localStorage
    if (queuedWrite !== null) return flushQueuedWrite(snapshot)
    if (hasUserLayer(snapshot.user)) {           // Host 有用户选择 → 以它为权威
      seedCompleted = true
      return adoptHostPair(stateFromHost(snapshot.value))
    }
    if (!seedCompleted && shouldSeed(snapshot.user, readStoredState())) {
      seedCompleted = true                       // 0.2.1 迁移：真缓存 + 无 Host 用户层 → 一次性播种
      return writeToHost(stateToSetOps(state), '迁移失败时保留本地缓存', snapshot.revision)
    }
    seedCompleted = true
    adoptHostPair(stateFromHost(snapshot.value)) // 无用户层且缓存无真选择 → 采纳 Host 默认配对
  }

  function persistChoice() {
    const snapshot = form?.getSnapshot()
    if (!snapshot || snapshot.status !== 'ready') { queuedWrite = 'set'; return } // 就绪前的选择先排队
    if (snapshot.writable === false) return      // 防御：native settings provider 恒为 true
    writeToHost(stateToSetOps(state), '写入未被接受时以 Host 为准')
  }

  function persistReset() {
    const snapshot = form?.getSnapshot()
    if (!snapshot || snapshot.status !== 'ready') { queuedWrite = 'unset'; return }
    if (snapshot.writable === false || !hasUserLayer(snapshot.user)) return
    writeToHost(stateToUnsetOps(state), '写入未被接受时以 Host 为准')
  }

  // 3) 设置页
  function select(scheme, strength) {
    state = { ...state, [scheme]: strength }
    writeState(state)                            // 首帧缓存同步写（Host 慢或被拒也不丢本次选择）
    applyLayer(); notify()
    persistChoice()                              // 一次 mutate 原子写两个字段
    // 已决策：点另一深浅色卡立即预览；会持久写 DSH 全局 Appearance 偏好（system → 固定）
    if (ctx.theme.getTheme().active.colorScheme !== scheme) ctx.theme.setTheme(scheme)
  }

  function reset() {
    const next = { ...DEFAULT_STATE }
    const changed = !statesEqual(next, state)
    state = next; writeState(state)
    if (changed) applyLayer()
    notify()
    persistReset()                               // 一次 mutate 里 unset 两个字段（清 user 层）
  }

  function writeToHost(ops, message, expectedRevision) {
    Promise.resolve(form.mutate(ops, expectedRevision))
      .then((accepted) => { if (!accepted) { warnRefusedOnce(); syncFromHost() } })
      .catch((error) => console.warn(message, error))
  }
}
```

- 覆盖层在 client 半部物化时同步建立，不等待网络；Client 加载前的 loading 页 / 首帧由 Host 半部的 `index-inject` row 着色（见下「首帧注入」）。
- **首帧与运行期分界**：首帧用 `window.__EVERFOREST_BOOT__`（Host 脚本解析好的 B 方案结果），Client 挂载后不再把缓存当权威；`configForms` 快照就绪后以 Host 文档为准，内存 / 覆盖层 / 设置页 / 缓存一起收敛。正常路径下三者一致，唯一可见变化是「本浏览器缓存已过期」时首帧先画缓存、随后一次切到 Host 值（之后收敛，不反复）。
- 页面内「当前」指示从 `ctx.theme.getTheme()` + 本地 `state` 推导（`active.colorScheme` 是 system 解析后的实际深浅色；`preference === 'system'` 时不要把它当成用户选择）；`theme/change` 只用于刷新指示（字号/字体变化也会触发，监听者必须幂等），不重建覆盖层。
- `configForms` / `slots` / `locale` 缺失时只降级持久化方式或设置页，主题仍生效（`theme` 是唯一硬依赖）。**三者都用 `ctx.inject` 软等待**：`configForms` 单独一个软注入（旧宿主不提供也不能挂起插件）；`slots` / `locale` 用「`ctx.get` 立即挂载 + `ctx.inject(['slots','locale'])` 延迟等待」的混合策略，两者都不可用才跳过设置页并 console.warn。表单就绪前的用户选择进 `queuedWrite` 队列，绑定后补写一次（用户手速快于 Host 时不会静默丢失）。
- 所有注册走 `ctx.effect` / slot 的注入回调，插件停用时回到原生主题；`form` 的订阅随 effect 释放。

### 首帧注入（Host 半部，v0.2.0；0.3.0 改为 B 方案）

- **入口**：Host 半部 `apply(ctx, config)` 监听 `webserver/index-inject`，向表格追加一条 `{ kind: 'script', placement: 'body', text }`。同一张 rows 表有两个消费端：Web 由 `dsh-host-frontend-static` 在每次 index 渲染时调用 `webServer.renderIndex()` 写进 HTML；Desktop 由 `dsh-desktop-host` 在 Host ready 时 `collectIndexInjections()`，经 IPC（`DESKTOP_IPC.boot`）交给主进程、再由页面侧 boot 内核在加载插件 roster 之前应用。`webServer.tapIndex` 只是 raw HTML escape hatch，不是这条路径。
- **顺序**：ui-theme 用 `{ prepend: true }` 注册自己的 listener，所以它的 style/script rows 永远在前；本插件的 row 排在其后，脚本里能读到 `data-ds-theme-source`（已解析偏好）与 `data-ds-dark-theme`（实际 scheme）。
- **读什么**：scheme 取自 ui-theme 的 boot 属性（**不要**用裸 `prefers-color-scheme`，否则「固定浅色 + OS 深色」首帧会错；ui-theme 缺失时才退回 `matchMedia`）。强度按 **B 方案**在脚本执行时解析：先读本浏览器 `localStorage['dsh-everforest/v1']`，校验 `version` 与两个 strength，逐字段覆盖；缓存缺失 / 版本不符 / 字段非法时逐字段回退到 **emit 时嵌入的 Host 值**（`hostState(config)` 从 volatile 引用 `.get()` 读出并再校验一次），再回退默认配对。解析结果写入 `window.__EVERFOREST_BOOT__ = { version, light, dark }`，供 Client 首帧沿用。
- **为什么缓存优先**：Desktop 的 boot payload 在 Host ready 时只采集一次、之后不刷新；缓存由选择操作同步写入，永远至少与它一样新。Host 值兜底覆盖「新浏览器 / 清过缓存 / Web 每次随机端口」这些没有缓存的场景。
- **写什么**：`BOOT_TOKENS` = `--dsw-alias-bg-base`、`--dsw-alias-label-primary/secondary/tertiary`、`--dsw-alias-markdown-code-block`、`--dsw-specific-sidebar-fill`、`--dsw-alias-border-l2`、`--dsw-alias-brand-primary`（共 8 个；后两个是 boot 页 spinner 的环与进度弧，见 §12 2026-10-21 记录）。全部是 `tokensFor()` 也会输出的 token，所以 presenter 首次 apply 会用同名的 body 内联变量覆盖它们；**不要**用 `<style>` + `!important`（那会压过 presenter 的内联值，把配色冻在启动态）。
- **值从哪来**：Host 半部 import `src/tokens.js` / `src/palette.js` / `src/state.js` / `src/host-config.js`（普通 ESM；`@deepseek-ai/schemastery` 由 DSH 运行时解析），启动时用 `tokensFor()` 生成 6 个变体的值表，再拼成脚本文本；Web 每次 index 渲染重新 emit（Host 值实时），Desktop 只采集一次。`package.json#files` 必须包含这些 `src` 运行时模块（见 §8）。测试 `tests/host-boot.test.mjs` 断言脚本写入值与 Client token 层逐项相等、B 方案各分支与 `__EVERFOREST_BOOT__` 发布行为，防止两边漂移。
- **安全/健壮**：row 是纯 JSON 字符串（要过 IPC 与 HTML 文本），脚本文本里不能出现 `</script`；Host 值先按 `STRENGTHS` 枚举再校验一次，嵌入走 JSON + `<` / U+2028 / U+2029 转义；脚本包 try/catch（storage 被禁、`document.body` 不存在都不报错）。
- **残余**：Desktop 上窗口在 `loadURL` resolve 后才 `show()`，rows 由页面侧在 IPC 之后应用 → 理论上最多 1 帧原生色（2026-10-19 决策接受，需冷启动录屏实测）；loading 动效的 spinner / 边框已由 boot token 覆盖（2026-10-21，见 §12）；插件停用后 row 要等 Host 重启 / 下次 index 渲染才消失（运行中的本页会保留最后一次注入的底色）；本浏览器缓存过期时首帧可能短暂显示旧值（随后一次切到 Host 值，见 §7）。

## 6. 设置页

- **插槽**：`settings.section`（list），在 `ctx.slots.inject(...)` 回调内注册 `{ name: 'settings.section', id: 'everforest', order: 25, label: thunk, locale: NS, inject: () => ({ t }) }`；owner props 提供 `close`（本页不使用）。`label` thunk 每次投影重读，locale 切换不必重注册；`locale` / `inject` 面与 `dshmarket` 的注册方式一致。
- **布局**（2026-10-23 用户截图复核后精简，见 §6.1）：
  - 标题「Everforest」——标题下不再有说明段落。
  - 外观控制：`浅色` / `深色` / `跟随系统` 三张卡片，样式、顺序、图标与尺寸对齐 DSH 自带的 Appearance row（`themeCube`：`flex: 180px`、1.5px 圆角卡片、`--dsw-alias-border-l4` 边框、`--dsw-radius-xl`；图标用 DSH 同款 16×16 SVG path，stroke 1.3；选中卡片用 `--dsw-alias-brand-primary` 描边 + `--dsw-alias-bg-module-platform` 底色）。选中态没有额外说明文字。
  - `深色` 分组：3 张卡（Hard / Medium / Soft，默认 Soft），每张含 5 段色带（`bg0`、`bg1`、`bg2`、`fg`、`header-aqua`）。
  - `浅色` 分组：同上（默认 Hard）。
  - **色彩模式区块（0.4.0）**：位于两个强度分组之后、当前选择行之前。标题 + 一行说明 + `role="switch"` 开关（`aria-checked`、`everforest-switch` 轨道/滑块样式，选中态用 `--dsw-alias-brand-primary`）+ 当前 scheme 的 5 个强调色装饰片（red / orange / yellow / aqua / green，`aria-hidden`）。开关只翻转 store 的 `colorMode`，DOM / CSS 侧由 client entry 负责。
  - 当前生效行：「深色 Soft · 浅色 Hard」+ 当前实际 scheme（`active.colorScheme`；偏好为 `system` 时注明「跟随系统」）；右侧「恢复默认」（**只恢复 Enchanted 默认配对与关闭色彩模式，不改外观偏好**，2026-10-21 用户确认保持）。该行是 `role="group"` + `aria-label` 的有名分组。
  - 页面末尾不再有 `hint.scheme` / `hint.storage` 说明列表。
- **交互**：点击卡片 → 立即应用；写入顺序是「内存 + 首帧缓存 → `configForms.mutate`（一次原子写三个字段：`light` / `dark` / `colorMode`，落 profile patch）」，若该卡属于另一个 scheme，再调用 `ctx.theme.setTheme(scheme)` 让用户马上看到效果（**已决策**）。写入被拒 / revision 冲突时由 settings 服务回读，Client 以 Host 值为准（设置页不弹错、不静默丢掉用户选择）；「恢复默认」先回默认状态并写缓存，再 `unset` Host 的三个字段（清掉 user 层，回到 base 默认）。色彩模式开关走同一条写路径（三字段原子写），只切换选择器作用域、不重建 token 覆盖层。外观卡片调用 `ctx.theme.setTheme(preference)`（`system` 恢复跟随 OS，`light` / `dark` 固定）；它与 DSH 自带 Appearance 写的是同一份全局偏好（所有已认证浏览器共享）。
- **i18n**：命名空间 `settings.everforest`，内置 locale id 是 **`zh` / `en`**（`{ zh: zhDict, en: enDict }`；`zh-CN` 只是 `<html lang>` 的映射，不是注册键）；键共 23 个：`nav.title`、`appearance.title/label/light/dark/system`、`group.dark/light`、`strength.hard/medium/soft`、`current.label/summary/active/system`、`colorMode.title/desc/on/off/switch`、`reset`、`aria.card/group`。2026-10-23 删除 `intro`、`appearance.systemActive/fixed`、`colorMode.experimental`、`hint.scheme`、`hint.storage`（用户要求不再显示这些解释性文案）。
- **样式**：全部用 `--dsw-alias-*` token；类名前缀 `.everforest-*`。**不能用 `styles.insert`**（那是模型动态 Cordis 包的闭包内建，npm 安装的 client bundle 没有）；在 factory 内创建 `<style>`，打 `data-plugin="dsh-everforest"` / `data-plugin-css` 标记，并在 `ctx.effect` 的 cleanup 里移除（照抄 ui-theme `installThemeStyles` 的写法；module 系统只会在物化期自动认领无标记 style，停用清理仍靠自己）。强度卡外观参照 DSH 设置卡片；外观三张卡片直接对齐 DSH `AppearanceRow` 的 `themeCube` 规则（`docs/design.md` §6.1 记录唯一偏差：选中描边改用主题强调色 `--dsw-alias-brand-primary`，因为 DSH 原生的 `--dsw-static-neutral-bluish-400` 在 Everforest 浅色下与未选中边框几乎同色，会看不出选中）。
- **无障碍**：`aria-pressed`、键盘可达、`:focus-visible` 用 DSH 焦点环；色卡附文本标签，不只靠颜色区分；`aria-label` 只挂在有命名 role 的元素上（当前行 `role="group"`，裸 `<div>` 的 `aria-label` 不进无障碍树）。
- **降级**：`ctx.get('slots'/'locale')` 立即不可用时用 `ctx.inject` 等待再挂载；等待也不可用时跳过页面注册（主题仍生效），并在控制台留一条带前缀的警告。
- **已知限制**：① `settings.section` 没有 `icon` 字段，第三方页在设置导航里显示 DSH 默认齿轮图标（要换图标只能像 `dshmarket` 那样用 DOM 标记 + MutationObserver 改写，0.x 不做）；② DSH 不会在 Plugins 页给本插件再生成一份自动表单——Host 半部用 `settings.configure({ auto: false })` 声明设置页由本插件自己渲染，所以强度只能在本页修改（插件详情页没有可编辑的强度卡片）。

### 6.1 2026-10-23 设置页文案精简与外观控件对齐 DSH

用户对 0.4.0 设置页截图复核后提出两点：①红框中的解释性文字全部去掉；②「外观」按 DSH 默认设置页的样式显示。落地：

- **删除的文案**（中英同步删键）：标题下的 `intro` 说明；外观控制下方的 `appearance.systemActive` / `appearance.fixed` 当前状态说明；色彩模式开关下方的 `colorMode.experimental` 实验性提示；页尾 `hint.scheme` / `hint.storage` 两条说明（Host 配置 / 首帧缓存 / 重启口径改由 README 与设计文档承载）。页面只保留：标题、外观三卡、两个强度分组、色彩模式标题 + 一行功能说明 + 开关、当前生效行 + 恢复默认。
- **外观控件改 DSH 同款**：直接对齐 DSH `ui-theme` 包 `AppearanceRow.module.css` 的 `themeCube` 规则与 `AppearanceRow.js` 的顺序/图标——顺序 `浅色 / 深色 / 跟随系统`，16×16 内联 SVG（Light / Dark / Follows-system 的 path 原样复制，`stroke-width` 1.3、`currentColor`），卡片 `flex: 180px; padding: 20px 32px; gap: 4px; border: .5px solid --dsw-alias-border-l4; border-radius: --dsw-radius-xl; 14px/22px`，hover 用 `--dsw-alias-interactive-bg-hover`，选中底色 `--dsw-alias-bg-module-platform`。
- **唯一偏差**：选中描边用 `--dsw-alias-brand-primary`（Everforest aqua），不用 DSH 的 `--dsw-static-neutral-bluish-400`。理由：该 token 在本主题的映射是 `#b8c0ae`（light）/ `#83887c`（dark），light 下与未选中边框 `--dsw-alias-border-l4`（`#bec5b2`）几乎同色，选中态不可辨；用主题强调色同时与插件自己的强度卡 / 色彩模式开关选中态保持一致。
- **验证**：`tests/settings-page.test.mjs` 覆盖新顺序、图标 path 数、`aria-pressed`、被删文案不再渲染；`.tmp/settings-preview/` 用真实 `SETTINGS_STYLES` + `tokensFor()` 渲染 dark-soft / light-hard 两档截图目检（选中态在浅色档可见）。
- **未改**：README（用户要求保持原文案）、色彩模式的行为与持久化路径、Host `Config` 字段。

## 7. 持久化（0.3.0 起：Host 侧持久化；0.4.0 增加 `colorMode`）

强度选择与实验性色彩模式的真源是**当前 profile 的 Host 配置**；`localStorage` 降级为「首帧缓存 + 旧宿主兜底」。Appearance（light / dark / system）仍归 DSH 自己的全局偏好，不在本节范围。

| 项 | 方案 |
|---|---|
| 真源 | 当前 active profile 的 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中本插件行的 `config`（`light` / `dark` / `colorMode`）；由 DSH settings 服务写入并在同一 profile 的所有已认证浏览器间广播。0.3.x 的 patch 只有前两个字段，`colorMode` 由 schema 默认值补成 `false`，不需要手改。 |
| 声明 | Host 半部 `src/host-config.js` 导出 `Config = Schema.object({ light, dark, colorMode })`：两个强度是 `union(STRENGTHS).default(...).volatile()`，`colorMode` 是 `boolean().default(false).volatile()`（三个叶子字段各自挂 `.volatile()`，不可嵌在已 volatile 的对象里）；settings 服务只把挂 `.volatile()` 的活跃 profile 条目投影成表单。入口 id 常量在两处各持一份——Host 的 `src/host-config.js` 与 Client 的 `src/durable.js`（bundle 不能 import Host 模块）——都必须等于 patch 行的 `id`（configForms 按 entry id 寻址；改名会静默退化为 localStorage-only，测试把三者钉住）。 |
| Client 读 | `ctx.inject(['configForms'], …)` 软等待服务（服务缺失 = 旧宿主，永不挂起插件），再 `formsCtx.configForms.get('everforest')` → `{ status, value, base, user, revision, writable }` + `subscribe(listener)`；就绪（`status: 'ready'`）后以 Host 值为权威：与内存不同则 adopt（重建覆盖层 / 刷新设置页 / 把 Host 值写回 localStorage 缓存）。`unavailable`（旧宿主 / 条目未被 serve）时保持 localStorage 行为；快照变化（其他浏览器写入的广播）走同一 adopt 路径。 |
| Client 写 | 选择色卡 / 切换色彩模式：一次 `mutate([{ op: 'set', path: ['light'], value }, { op: 'set', path: ['dark'], value }, { op: 'set', path: ['colorMode'], value }])` 原子写三个字段（用户写不带 `expectedRevision`，以 settings 服务的最新 revision 为准）；恢复默认：一次 `mutate` 里 `unset` 三个字段，若上一次写还在途（镜像快照尚未 fold、`user` 仍为 `{}`），用 `writesInFlight` 判断后把 `unset` 排在表单控制器的串行写队列之后，避免被后到的 `set` 覆盖。表单就绪前的选择排队（`queuedWrite`）后补写；`mutate` 被拒（`response.ok` 为 false / revision 冲突）时服务回读，Client adopt 远端值并 warn 一次（不把未被接受的值留在本地）。`writable: false` 的守卫只是防御——0.2.1-rc.2 的 native settings provider 恒为 `true`，实际不可达。 |
| 首帧 | B 方案（§5「首帧注入」）：boot 脚本读 `localStorage['dsh-everforest/v1']` 缓存，缺失 / 版本不符 / 字段非法时逐字段回退 emit 时嵌入的 Host 值，再回退默认；解析结果发布到 `window.__EVERFOREST_BOOT__`，Client 首帧直接沿用。Web 每次 index 渲染重算，Desktop 在 Host ready 时采集一次。**`colorMode` 不进 boot payload**：首帧没有聊天 / 会话 DOM，模式 CSS 在 Client 挂载后才生效；payload 与 0.3.0 逐字节一致（见 §13）。已知取舍：本浏览器缓存过期（另一浏览器改过而它没收到广播）时首次打开先画缓存旧值、随后一次 adopt Host 值，之后收敛。 |
| 缓存 | `localStorage` 保留为「首帧缓存 + 旧宿主兜底」，key 不变（`dsh-everforest/v1`），payload 增加可选 `colorMode`（**`STATE_VERSION` 保持 1**：0.3.x 缓存缺字段读作 `false`、不算损坏、仍参与迁移；非布尔值按损坏处理）。每次选择 / adopt 后同步写（adopt 即使值相同也写，保证新浏览器下一次 reload 有首帧缓存）。同一 origin 的 `storage` 事件同步保留（Host 广播覆盖不到时的兜底），比较含 `colorMode`。 |
| 迁移 | 0.2.1 → 0.3.0 / 0.3.0 → 0.4.0：启动时若（a）Host 文档**无用户层**（`user` 非空才算有；空对象 `{}` 也是无）且（b）`readStoredState()` 读到的是**真实选择**（存在，且非默认状态——非默认强度或色彩模式开启）→ 把缓存值一次性播种到 Host（一次 `mutate` set 三个字段，带观察到的 `revision` 作栅栏）。播种后本地保留该值；Host 已有用户层时以 Host 为准，不覆盖。 |
| 迁移 / 重置取舍 | **已知取舍**：浏览器 A「恢复默认」清掉 Host override 后，若另一个从未升级/打开的浏览器 B 仍持有旧的缓存，B 下次加载会把这个旧值当作待迁移值**重新播种回 Host 一次**；之后 B 的缓存与 Host 收敛，不会反复。0.3.0 接受该取舍（一次性迁移只以「Host 无用户层」为条件，无法区分「从未选择」与「刚被重置」）。 |
| 旧宿主降级 | 没有 settings 服务 / schemastery 无 `volatile()`（< 3.18.3）/ `configForms` 软注入永不送达 / 表单 `status: 'unavailable'` → 无表单，Client 继续用 localStorage（含 `colorMode`），主题、色彩模式与设置页不受影响，也不会因为等待服务而挂起插件。**只换 npm 包不重启 DSH** 即属于这一类：选择仍生效、只是暂不写 Host；重启后首启会播种。 |
| 写入被拒 | home patch / `--patch` 覆盖等场景以 `mutate` 的 `response.ok === false` 表现：settings 服务回读后返回 `false` → Client adopt 远端值并 warn 一次，设置页不弹错（未被接受的值不会留在本地）。代码里的 `writable: false` 守卫只是防御；native settings provider 恒为 `true`，不要把 writable 当成可达主路径。 |
| 范围 | 按 profile 隔离：同一 profile 的所有浏览器 / 窗口共享；不同 profile 各存各的。 |
| 非法值 | 手改 patch 的 `config.light` / `dark` 为枚举外值、或 `colorMode` 不是布尔，分两种情况：**冷启动 / 重挂**时 `Config` 校验失败 → entry 不激活（无主题），改回合法值或删除 `config` 后重启恢复；**运行中**的 volatile-only 变更由 Loader 的 `_commitVolatile` 捕获解析错误 → Host 记 warning、保留旧引用、entry 保持 **ACTIVE**（主题不丢），改回合法值即可热恢复，不必重启。 |
| 升级 / 回滚 | Host 半部（Config 注册、boot 脚本）在 Host 启动时装载，改动需**重启 DSH**（刷新页面不会重载 `index.js`）；0.3.0 之后运行中改强度 / 色彩模式走 settings 通道，不需要重启。只换包不重启 DSH → 新 Client 退回 localStorage-only（旧宿主降级），重启后首启补播种。0.4.0 → 0.3.0 回滚：0.3.0 的 `Config` 不认识 `colorMode` 字段，若 profile patch 里已写入该字段，0.3.0 的 schema 校验会失败并导致 entry 不激活（无主题，同 2026-10-22 accent 回滚的教训），因此回滚前必须先从 `cordis.patch.yml` 删除 `colorMode` 再重启；0.2.1 没有 `Config` 导出，不受影响。 |

> 为什么这样取舍：`localStorage` 是同步的、per-origin 的（Web 端口每次随机、换浏览器就丢）；DSH 的 settings 文档本来就是跨浏览器共享的 profile 级真源，但它异步、可被 home patch 覆盖、且换 Host 半部要重启。组合成「Host 真源 + 本地首帧缓存 + 失败降级」后，正常路径得到跨浏览器一致与重启保持，首帧又不等待网络；代价是首帧与 Host 可能短暂不一致（缓存过期的那一次，见 §5「残余」）。

## 8. 清单与构建

```jsonc
// package.json（草案；2026-10-23 0.4.0 色彩模式后更新）
{
  "name": "dsh-everforest",
  "version": "0.4.0",
  "description": "Everforest color themes (Dark/Light × Hard/Medium/Soft) for DeepSeek Harness Web/Desktop.",
  "type": "module",
  "main": "index.js",
  "icon": "icon.svg",
  "license": "MIT",
  "author": "FormalistBlue",
  "publishConfig": { "access": "public" },
  "repository": { "type": "git", "url": "git+https://github.com/FormalistBlue/dsh-everforest.git" },
  "homepage": "https://github.com/FormalistBlue/dsh-everforest#readme",
  "bugs": { "url": "https://github.com/FormalistBlue/dsh-everforest/issues" },
  "keywords": ["deepseek", "harness", "dsh", "dsh-plugin", "theme", "everforest"],
  "engines": { "node": ">=20", "dsh": ">=0.2.1-rc.2 <0.3.0-0" },
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": [
    "index.js", "client.js",
    "src/palette.js", "src/color.js", "src/tokens.js", "src/state.js", "src/host-config.js",
    "cordis.patch.yml", "locale/*.json", "icon.svg", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"
  ],
  "dsh": {
    "manifestVersion": 1,
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-ui-theme", "@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-settings"]
    }
  },
  "devDependencies": {
    "@deepseek-ai/schemastery": "^3.18.5"
  }
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: everforest        # = ENTRY_ID（host-config.js / durable.js），也是 Client configForms 的键
      name: dsh-everforest
```

- **运行时零依赖、无 peerDependencies**：Host 半部 `import '@deepseek-ai/schemastery'` 由 DSH 进程从自身安装解析（写进 `dependencies` 会装出第二份实例）；仓库只声明一个 devDependency 供测试 / CI 从 `node_modules` import，测试前执行 `npm install --no-package-lock --ignore-scripts --no-audit --no-fund`。`dsh.client.inject` 只影响**浏览器 bundle 的到达顺序**，不是服务注入——真正的服务门是模块导出 `export const inject = ['theme']`。`<pkg>/client` 与裸包名归一化到同一模块。
- **Host 半部不打包**：`index.js` 直接从包目录 import `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js` / `src/host-config.js`（普通 ESM；唯一的 bare import 由 DSH 运行时解析），所以这五个文件必须进 `files`；`scripts/build.mjs` 只产出 `client.js`。`tests/integration.test.mjs` 会遍历 Host 半部的相对 import，核对 `files` 覆盖它们。Client 侧模块（`src/durable.js`、`src/color-mode.js`、`src/locale.js`、`src/settings-page.js`、`src/client-entry.js`）被 `client.js` 打包，不需要进 `files`。
- **entry id 是双半部契约**：`cordis.patch.yml` 的 `id: everforest` 必须等于 Host（`src/host-config.js`）与 Client（`src/durable.js`）各自持有的 `ENTRY_ID`——settings 服务按 entry id 投影表单，Client 也按它 `get`；测试把三者钉在一起。Host 半部还调用 `settings.configure({ auto: false })`（可选接线）声明设置页由 Client 渲染，避免 DSH 再生成一份重复表单。
- `dsh.client.immediately`：本版本只用于 **prefetch** bundle（前端 `manifest.plugins.filter(p => p.immediately)` 预取），不改变 apply 时机，减不了首帧；`platform: 'web'` 是必需字段，package 必须导出 `./client`。
- `scripts/build.mjs`：零依赖 Node，把 `src/*.js` 合成 `client.js` 并包成
  `window.__ModuleLoader__.load({ id: 'dsh-everforest', factory(require) { … } })`（id 必须等于包名）；产物提交入库，安装/运行不执行构建脚本（`prepack` 只在发布前**校验**产物是否最新，即 `build.mjs -C`，不会重新生成；改动 `src/` 后必须本地 `npm run build` 并提交 `client.js`）。
- **客户端入口文件名是 `src/client-entry.js`，不要改回 `src/index.js`**：npm 11 的 packlist 在根 `main` 为 `index.js` 且 `files` 含嵌套文件时，会把嵌套的 `src/index.js` 误打进 tarball（2026-10-19 实测；改名后 `npm pack` 只含白名单）。
- `tests/host-boot.test.mjs` 用 `node:vm` 执行 boot 脚本文本，断言它与 Client token 层同值、scheme 解析与回退分支、B 方案（缓存优先 / Host 兜底 / 非法值回退）与 `window.__EVERFOREST_BOOT__` 发布正确；`tests/durable.test.mjs` 覆盖 Client 持久化胶水的纯函数（用户层判定、播种条件、set / unset 操作、归一化、boot hint），`tests/integration.test.mjs` 用假 configForms 覆盖生命周期。不依赖真机即可守住首帧与迁移不漂移。
- 调色板提取脚本（开发期可重复）：按 [`reference/palette.md`](reference/palette.md) 的表格生成 `src/palette.js`（6 套背景色阶 + 两套前景/强调/header 色；light `bg_visual` 使用注记的生效值 `#DED8DB`）。

## 9. 验证计划

| 步骤 | 通过标准 |
|---|---|
| 安装 | `plugin_manager.install_bundle` 返回 `application: applied`；Plugin Manager 显示标题/描述/图标 |
| 覆盖生效 | Client `Theme.listTokens` 出现本插件注册的覆盖 token 名（内置 14 个推荐 token + 动态注册/覆盖 token 都会列出）；`document.body.style.getPropertyValue('--dsw-alias-bg-base')` 等于当前调色板；**不要用首帧阶段 body 的字面背景色校验**（首帧由 Host boot row 写内联 token，Client 生效后 presenter 覆盖同名变量） |
| 设置页 | `Slots.listSubTree` 根 `settings.section` 出现 `id: everforest, order: 25`；页面可见、切换即时生效、中英文案随 locale 切换；Plugins 页**不应**出现重复的自动强度表单（`settings.configure({ auto: false })`） |
| 持久化 | 选择 Hard → patch 的 `everforest` 行出现 `config.light: hard`；**换一个浏览器 / 清掉 localStorage 打开同一 profile** → 仍是 Hard；**重启 DSH（或重启 Host）** → 仍是 Hard；「恢复默认」后 `config` 字段被清掉、回到深色 Soft / 浅色 Hard。localStorage 清空不再影响强度（只影响首帧缓存） |
| 迁移 | 从 0.2.1 升级：旧 localStorage 留非默认强度、Host 无用户层 → 首次启动后 Host 出现该值（一次播种），之后清 localStorage 仍在；Host 已有用户层时以 Host 为准、不会被本地缓存覆盖 |
| Host 写入失败 | home patch / `--patch` 覆盖等场景 → `mutate` 返回 `false`（`response.ok=false`），Client 以回读的 Host 值为准并 warn 一次，设置页不弹错、主题正常；旧宿主 / 无表单时退回 localStorage（按 origin） |
| 非法配置 | 分两种情况验证：①**运行中**把 patch 的 `config.light` 改成 `nope` → Host 记 warning、entry 保持 ACTIVE、旧配色不丢，改回合法值热恢复（不必重启）；②**冷启动**时 patch 已是非法值 → entry 不激活（无主题、启动诊断可见），改回合法值 / 删除 `config` 后重启恢复 |
| 深浅色 | 用 DSH 自带 Appearance 或设置页外观控制切到 light/dark/system，主题自动使用对应调色板；`system` 下改 OS 深浅色应实时跟随（聊天区、设置页「当前」行、Windows 标题栏都要变）；点另一 scheme 色卡后 Appearance 偏好被改写（设计如此），可用设置页「跟随系统」恢复；点同侧色卡不得改偏好 |
| 代码高亮 | 三处代码块（聊天气泡 fenced code / 工具输出 / 右侧文件预览）的 token 色与块底正确；diff 的 add/del 底色与 marker 来自 `--dsw-alias-file-diff-*` / `code-diff-*`（diff 没有语法高亮，**不要**按 shiki 验收） |
| 聊天气泡 | 浅色（hard / medium）为 sage tint、light·soft 为淡鼠尾草纸抬起卡片，与画布边界 ≥ 1.10:1（light·soft 1.05:1，见 `reference/contrast.md` §2d）；深色保持 `bg1`；气泡内文字 4.5:1（2026-10-19 / 2026-10-21 修正，见 §12） |
| 停用 | 关闭插件 → 回到 DSH 原生配色，`body` 内联 `--dsw-*` 消失（验证 disposer 挂在 effect 上的清理）；重启 Host 后 boot row 消失；patch 里的 `config` 保留，重新启用后继续生效 |
| 首帧 | Web：首屏 / loading 页即为 Everforest（DevTools 首帧截图，无 `#fff` / `#151517` 帧，spinner 环与进度弧同色系）；强度分别验证「有缓存」「无缓存但 Host 有值」「两者都缺」三条路径与 `window.__EVERFOREST_BOOT__` 的值；Desktop：完全退出应用后冷启动录屏，原生色 ≤ 1 帧（2026-10-19 接受）；loading 动效的 spinner / 边框随 boot token 一起着色（2026-10-21） |
| 视觉走查 | 聊天区 / 代码块 / diff / 菜单 / 设置 / 侧栏 / composer / hover / 选中态 / 状态色；侧栏与内容卡边界（`sidebar-fill` ≠ `bg-base`，Windows 标题栏条同色）；记录已知缺口 |
| 色彩模式（0.4.0，实验性） | 设置页开关出现且可切换；开启后聊天 h1–h6 六色标题、strong + em 紫、行内 code 蓝、内部文件链接 aqua、删除线 / 已完成任务淡化、引用块淡底、列表 marker / 引用条 / 分隔线、表头色带 / 斑马纹 / 行 hover、checkbox，以及会话列表「待确认 / 已完成未查看」行底与状态点变色；**关闭后与 0.3.0 视觉逐字节一致**（所有色彩模式选择器不匹配）；`<html>` 上出现 `data-everforest-color-mode="on"` 与两个强度属性，切换强度 / 深浅色时四组变量自动切换；选中行不覆盖选中态、hover 有加深；浅色档特别是 light·soft 的表格色带 / 会话行底会被压成极淡甚至不可辨（见 §13.3），属已接受的「淡彩」取舍；DSH 升级后若选择器失效，模式静默退回单色且控制台无报错 |
| 发布 | `npm pack --dry-run` 文件清单齐全（`files` 与 `exports` 对齐）；`engines.dsh` 校验生效；包名 `dsh-everforest` 仍可用 |

**改动生效方式（开发循环）**：`client.js` 内容改动 → Plugins 页停用/启用该插件（Host 重新快照 bundle，浏览器经 HMR 换模块）或重启 Host；`package.json` / `cordis.patch.yml` 改动 → HMR 即时重组合；单纯刷新页面不会换 bundle 字节。

无浏览器控制能力时：自动项按上表验证，视觉项请用户目检并回传截图。

## 10. 里程碑与验收

| 版本 | 交付 | 验收 |
|---|---|---|
| 0.1.0 | 6 套调色板、覆盖层、设置页、持久化、本机可安装 | 上表前 7 项通过（安装 / 覆盖 / 设置页 / 持久化 / 深浅色 / 停用 / 首帧记录） |
| 0.2.0 | 对比度与全页走查、shiki / diff 口径与目检、i18n、图标、README 截图、**首帧 Host boot 注入**、系统跟随收尾、npm 发布 | 走查无阻断问题；Web 首帧即 Everforest，Desktop 冷启动原生色 ≤ 1 帧；npm 包可安装并生效；中英文案与图标经检查 |
| 0.3.0 | **Host 侧持久化（`configForms`）**、首帧 B 方案（缓存优先 / Host 兜底）、0.2.1 旧值一次性播种、localStorage 降级为缓存 + 旧宿主兜底、文案 / CI / 发布元数据同步 | 跨浏览器共享与重启保持落 profile patch；旧值迁移；写入被拒 / 旧宿主降级；其余人工目检见 §9 |
| 0.4.0 | **实验性色彩模式（中彩）**：初版为聊天 h1–h3 / marker / 引用条 / 分隔线 / checkbox / 表格表头色带与斑马纹、会话「待确认 / 已完成未查看」行底与状态点；验收后按 Enchanted 扩展为 h1–h6 六色标题与完整富文本角色（strong / em、行内 code、内部链接、删除线、引用块淡底、行 hover）；Host `Config` 增第三个 volatile 字段 `colorMode`；token 层零差异；门禁 G9–G16（24 个角色） | 色彩模式用例 12 → 17 项；`node scripts/check-contrast.mjs --check` 全绿；全量 `node --test`（170 项）与 `npm run check` 由最终门禁复核；样张一致性；关闭零差异；**真机目检待重启 DSH 后确认**（见 §13 残余） |

> **0.4.0 验收证据（截至 2026-10-23，待真机）**：色彩模式用例 `tests/color-mode.test.mjs` 12 → **17 项**并全部通过；`node scripts/check-contrast.mjs --check` 全绿（G9–G16，报告 `docs/reference/contrast.md` 已重新生成）；6 变体 × 24 个角色 = **144 个派生色值**由测试逐值钉住（初版 15 个角色与方案 0 样张快照一致，扩展的 9 个角色按 Enchanted 映射公式固定）；全部 34 条 CSS 规则以 `html[data-everforest-color-mode="on"]` 开头、无 `!important`，关闭时零匹配。全量 `node --test`（170 项）与 `npm run check`（palette / build / contrast）由最终门禁复核。**真机目检未做**：Host `Config` 变化需要重启 DSH，重启后按 §9「色彩模式」行与 §13.6 目检 6 套配色、富文本角色与关闭零差异。

> **0.3.0 验收证据**：`node --test` 144/144 通过（Node 22；含 `host-boot.test.mjs` 的 Config 与 B 方案、`durable.test.mjs` 的纯函数、`integration.test.mjs` 的假 configForms 生命周期），`npm run check` 全绿（palette / build / contrast，`client.js` 已重建为 v0.3.0），`npm pack --dry-run` 清单齐全（含 `src/host-config.js`）；跨浏览器共享（两个浏览器 / 清 localStorage）、Desktop 与 Web 首帧、升级迁移与「Host 半部需重启」等人工项已于 2026-10-22 由用户真机目检确认通过（按 [`releasing.md`](releasing.md) §5）。

> **0.2.0 验收证据**：构建 / 单测（含 `tests/host-boot.test.mjs` 的首帧调色板一致性断言）/ 集成 / 对比度 / 安装 / 停用清理为自动化项；首帧目检（Web 首帧截图、Desktop 冷启动录屏）、三处代码块与 diff、全站视觉走查、系统跟随仍为人工目检项。

> **0.1.0 验收证据**：构建 / 单测 / 集成 / 对比度 / 安装 / 停用清理为自动化项，证据见 [`reference/contrast.md`](reference/contrast.md)、[`reference/token-inventory.md`](reference/token-inventory.md) 与测试套件；持久化跨重启、深浅色与 system 切换、首帧记录、全站视觉走查仍为人工目检项（交付时如实标注）。

## 11. 开放问题

1. DSH 的 token 集合是否随版本扩展（新增 alias 未覆盖时会保留原生色）——以 `src/tokens.js` 的未覆盖清单跟踪。
2. 设置页文案只做 `zh` / `en`（内置 locale id），其余语言回退英文；是否要随 DSH 语言包扩展再议。
3. ~~是否需要在 Appearance 行旁增加「Everforest」快捷入口~~ **已决策（2026-10-22 用户确认）：不做**，保留独立设置页。补充核对：`settings.general.item` 是 ui-settings-general 声明的官方列表槽（ui-theme 的外观 / 字号行用它，General 自己的开发者工具 / 版本号行也用它），但 General 行拿不到「跳转另一个设置分区」的官方 API（设置 shell 的 store 未 provide 成服务），快捷入口只能做成行内嵌控件，与独立设置页重复；收益仅是发现性，不值得维护两处控件。
4. 非默认的 4 个变体沿用 Enchanted 的 `header-*` 常量值：若硬/软档的对比度检查不通过，需要按背景亮度做小幅修正，并回写 `docs/reference/palette.md`。
5. ~~侧栏是否要保留 Enchanted 的「平铺背景」~~ **已决策（2026-10-18 视觉走查）**：不保留 —— 侧栏改为 `bg0` → `bg1` 的 80% 混合 + 对比度守卫；平铺时 Windows 下侧栏 / 标题栏 / 内容卡同色，边界完全消失（并新增边界 ≥ 1.02:1 硬门槛）。
6. ~~冷启动首帧（loading 页 / 首帧底色是 Host 字面 CSS）是否接受；若要消除，需要评估首帧注入在 Electron `dsh-app://` 窗口是否可用~~ **已解决（2026-10-19）**：官方 `webserver/index-inject` 结构化 rows 同时服务 Web（`renderIndex`）与 Desktop（Host ready 时 `collectIndexInjections()` → `DESKTOP_IPC.boot` → 页面侧 boot 内核在插件 roster 前应用），与 `tapIndex` 无关；Host 半部追加一条 body script row 即可。Desktop 上窗口在 load 后才 show、rows 在页面侧 IPC 后应用，因此接受「最多 1 帧原生色」；loading 动效的灰 spinner / 边框在 2026-10-21 由 boot token 6→8 覆盖（见 §5 / §12）。
7. ~~是否值得为设置导航项做自定义图标~~ **已决策（2026-10-22 用户确认）：标为待做，等 DSH 官方给 `settings.section` 加 icon 字段**。现状核对：导航图标由 ui-settings-general 的 `navIcon(id)` 按 section id 硬编码（`account` / `models` / `agent-presets` / `plugins` / `archived-sessions`），未知 id 一律回退默认齿轮；注册项只有 `id` / `order` / `label`。0.x 不做 DOM 改写（`dshmarket` 的做法），导航沿用齿轮，功能不受影响。
8. `--dsw-token` 自检策略：启动时读取若干关键 token 的 computed 值判断是否缺失/改名；缺失时降级（保留原生值）并 console.warn，是否要暴露到设置页「诊断」区。
9. ~~Host 侧强度持久化何时重启~~ **已解决（2026-10-22，0.3.0）**：确认第三方 Host entry 导出的 `Config`（volatile 叶子字段）会被 settings 服务投影为 `ctx.configForms.get('<entry id>')` 表单，写入落当前 profile 的 `cordis.patch.yml` 并跨浏览器广播；localStorage 已降级为「首帧缓存 + 旧宿主兜底」，0.2.1 旧值一次性播种。遗留：旧宿主（无 settings / schemastery 无 `volatile()`）降级路径与多 profile 边界见 §7。
10. 首帧注入的降级边界：插件停用 / Client 半部加载失败时 boot 调色板保留到本页结束；本机缓存与 Host 值都不可用时回退默认配对。是否需要在设置页暴露「首帧注入是否生效」诊断（读取 index 里是否存在本插件 row / `window.__EVERFOREST_BOOT__`）——0.x 不做。
11. 缓存与 Host 短暂不一致（另一个浏览器刚改过、本窗口未收到广播）时，首帧先画缓存、随后一次切到 Host 值；是否需要给用户「已同步」提示或强制 `settings.describe` 重读——0.x 不做（用户无感，收敛后不再变化）。
12. **一次性迁移与跨浏览器重置的取舍**：浏览器 A「恢复默认」清掉 Host override 后，若另一个从未升级打开的浏览器 B 仍持有 0.2.1 的非默认缓存，B 下次加载会把旧值当迁移**重新播种回 Host 一次**（之后 B 的缓存与 Host 收敛，不反复）。0.3.0 接受该取舍——一次性迁移只以「Host 无用户层」为条件，无法区分「从未选择」与「刚被重置」；将来若要消除，需要给播种加 per-browser 一次性标记或按版本 / 时间戳判定。

## 12. 实现记录（v0.2.0 首帧注入起）

**决策（用户确认）**

| 项 | 结论 |
|---|---|
| shiki / diff 文档口径 | 接受修正：shiki 只覆盖**代码块**三处（聊天气泡 / 工具输出 / 文件预览）；diff 走 `--dsw-alias-file-diff-*` / `code-diff-*`，没有语法高亮 |
| Desktop 首帧 | 接受「最多 1 帧原生色」，不追求绝对 0 帧 |
| Host 侧偏好持久化 | **暂缓**，先不做（路线与 spike 条件见 §7 / §11 #9）；2026-10-22 已由 0.3.0 落地，见 §12 末节 |
| 点另一组色卡固定全局外观 | 保留现有 UX（`ctx.theme.setTheme(scheme)`），「跟随系统」按钮可恢复 |

**机制证据**（DSH 0.2.1-rc.2，安装包源码；抽取副本仅用于只读分析）

- `dsh-host-webserver`：结构化 row 类型 `IndexInjection`（`global` / `script` / `script-src` / `script-preload` / `style` / `html`，script/html 带 `placement: head | body`）；`collectIndexInjections()` 每次 emit `webserver/index-inject`，`renderIndex()` 先渲染 rows 再跑 `tapIndex`。运行时 inspect 的 Host Event 契约与此一致。
- `dsh-host-frontend-static`：Web 的 index 响应调用 `ctx.webServer.renderIndex(...)`。
- `dsh-desktop-host`：Host ready 时把 `ctx.webServer.collectIndexInjections()` 随 `ready` IPC 发给 Electron 主进程；主进程经 `DESKTOP_IPC.boot` 交给页面。
- `dsh-web-frontend`：页面 boot 内核把 `style` rows append 到 `<head>`、`script` rows 作为 inline script 依次执行（`placement` 决定 head/body），全部在 `__DSH_BOOT_READY__` resolve、插件 roster 加载之前。主窗口在 `loadURL` resolve 后才 `show()`。
- `dsh-client-ui-theme`：Host 半部用 `{ prepend: true }` 推 boot rows——head style 写 `:root{color-scheme}` + `body{background-color:#fff/#151517;--dsh-boot-bg}`，body script 写 `data-ds-theme-source` / `data-ds-dark-theme`。boot 页 CSS 用 `var(--dsw-alias-bg-base, var(--dsh-boot-bg, Canvas))` 与 `var(--dsw-alias-label-*, var(--dsh-boot-label-*))`。
- `dsh-client-ui-layout` 的 `ThemePresenter` 与 Windows preload 的 caption 探针：presenter 用 body 内联变量落地 token；探针读 `--dsw-specific-sidebar-fill` / `--dsw-alias-label-primary`，并监听 body 属性/style 变化后通过 `windowsAppearance` IPC 更新原生标题栏（OS 翻转时也会重跑）。

**实现**

- `index.js`（Host 半部）：`ctx.on('webserver/index-inject', table => table.push({ kind: 'script', placement: 'body', text }))`；`createBootScript()` 从 `tokensFor()` 生成 6 变体的值表（`BOOT_TOKENS` 8 个 token，2026-10-21 起含 spinner 环与进度弧），脚本文本读 ui-theme 解析后的 scheme + localStorage 强度并写 body 内联变量。
- `tests/host-boot.test.mjs`：row 形状 / JSON 安全 / 无 `!important` / 全部 6×6 组合与 `tokensFor()` 同值 / 默认与损坏存储回退 / 固定深浅色 + 相反 OS / ui-theme 缺失回退 / storage 抛错 / 幂等 / 8 个 boot token（含 spinner 环与进度弧）。
- `package.json`：版本 0.2.0；`files` 增加 Host 半部运行时 import 的 `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js`（集成测试遍历 import 核对）。
- README（中英）与 `assessment.md` 更新首帧/代码高亮口径；`src/tokens.js` 顶部注释同步。

### 2026-10-19 视觉修正（聊天气泡）

- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射 `surface(p, 1)`，light 下 `#FDFAEE` 对画布 `#FFFBEF` 仅 1.02:1；用户报告「浅色模式下聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡是 `static-deepseek-50` 冷色 tint（≈1.08），不是中性色阶。
- **做法**：light 改为 `mix(bg0, header-aqua, 16%)` 的 sage 纸面，经 **向白** 的 `readableToward` 守卫（不能向暖色 bg0 回退，否则 tint 消失）。light·hard / medium 边界 1.17 / 1.14、气泡文字 4.61 / 4.53；light·soft 的 `bg0` 已只有 4.66:1 文本余量，不能压暗，改用近白冷调「抬起卡片」（`#ffffff` + 4% `header-aqua`，边界 1.15、文字 5.37）；两个方向由代码按实际边界对比度自动择大。dark 保持 `bg1`（1.15–1.16）。
- **验收**：新增硬门槛「气泡 vs `bg-base` ≥ 1.10:1（6 档）」+ 既有文本承载表面 4.5:1；单测固定在 `tests/tokens.test.mjs`，报告见 [`reference/contrast.md`](reference/contrast.md) §2d / §6.8。
- **未动**：`--dsw-specific-bubble-highlight`（当前 chat 未使用，保持 `surface(p, 2)`）。

### 2026-10-21 light·soft 聊天气泡：近白卡片 → 淡鼠尾草纸

- **问题（用户走查）**：「浅色 soft 模式下，聊天气泡框变成白色的了」。light·soft 的 `bg0` 已只有 4.66:1 文本余量，2026-10-19 的方案把气泡翻到抬起方向，用近白冷调（`#ffffff` + 4% `header-aqua`）——在暖色奶油画布上像一块白卡片，与 Everforest 纸感不搭。
- **做法**：抬起方向不再从纯白出发，而是白 → `fg.green` 13% 的淡鼠尾草纸 `#f0f3de`；气泡文字 4.94:1，对画布明度差 1.06:1。明度差达不到 1.10（再压暗就会牺牲气泡正文的 AA），改由绿 vs 暖奶油的色相差异承担可辨识性，气泡边界门槛对该档放宽到 **1.05**（`BUBBLE_BOUNDARY_MIN_BY_VARIANT`）。
- **影响范围**：仅 light·soft 的 `--dsw-specific-bubble`；light·hard / medium 的 sage tint（1.17 / 1.14，文字 4.61 / 4.53）与深色 `bg1` 不变。
- **验收**：`reference/contrast.md` §2d / §6.8 重新生成；单测气泡边界按变体阈值（soft 1.05、其余 1.10）+ 文字 ≥4.5；真机目检 light·soft 聊天区。

### 2026-10-21 P1 打磨（并入 0.2.1）

**决策（用户确认）**

| 项 | 结论 |
|---|---|
| 「恢复默认」范围 | 只重置深浅强度，不连带把外观偏好改回 `system`（Appearance 是 DSH 的全局偏好，插件页的重置不应改写它） |

**实现**

- **loading spinner / 边框**：装包 `dsh-web-frontend@0.2.1-rc.2` 的 boot CSS 里，spinner 环是 `var(--dsw-alias-border-l2, …)`、进度弧是 `var(--dsw-alias-brand-primary, …)`，字面量只是 fallback；把这两个 token 加入 `BOOT_TOKENS`（6→8）即让首帧 spinner 着色。旧结论「`.boot` 局部字面变量、不可覆盖」作废（README / assessment / releasing 同步修正）。
- **跨窗口同步**：`client-entry.js` 在 `ctx.effect` 内监听 `window` 的 `storage` 事件，按 `STORAGE_KEY` 过滤（`key === null` 是另一窗口调了 `clear()`）；状态有变化才重建覆盖层并 `notify()`，卸载时移除监听。写入窗口自己收不到该事件是浏览器语义，天然无回环。
- **设置页失败重试**：`settingsUiMounted` 只在 `slots.inject → slots.register` 返回后置位；`settingsUiPrepared` 保证重试不重复注册字典 / 样式表。首次 setup 抛异常时 `ctx.inject` 兜底得以继续，而不是整段跳过。
- **无障碍**：「当前选择」行改为 `role="group"` + `aria-label`（裸 `<div>` 的 `aria-label` 会被忽略）；测试新增「所有 `aria-label` 必须有命名 role」的通用断言。
- **构建守卫**：`build.mjs` 拒绝一条语句多个绑定的 `export const a = 1, b = 2`（原实现只导出 `a`，其余静默丢失），并导出 `parseModule` 供负向测试；CLI 行为不变（`build: …` + exit 1）。
- **测试**：新增 storage 同步（含忽略无关 key、`clear()` 回默认、卸载后失效）、设置页失败重试、构建多绑定拒绝、boot spinner token 断言；卸载用例补 locale 字典与 storage 监听清理断言。
- **文档**：README 中英、`assessment.md`、`releasing.md`、CHANGELOG 同步 spinner 与跨窗口口径。

### 2026-10-21 diff 行底色可读性修正（FileDiff）

- **问题（用户走查，两次）**：
  - dark·soft（默认深色）看代码 diff 时「浅绿色的背景配白色的文字，看不清」——`FileDiff` 用 `--dsw-alias-file-diff-*-bg` 画 added/deleted 行底、文字继承 `label-primary`；原映射直接取 `bg_green` = `#48574e`，对近白 `#d3c6aa` 只有 4.52:1，行号 gutter 又是向亮端 lift 的 `#797e6e`（marker `#a7c080` 仅 2.09:1）。
  - 切到浅色档后「绿色背景太不明显，看不出来」——原 light 映射 `bg0` → `bg_green` 混 45% 后已接近画布，与 `markdown-code-block` 只有 1.001–1.007:1（light·hard / medium / soft 全部如此），added / deleted 行与普通代码没有区别。
- **做法**：
  - dark：diff 底向 `bg0` 混合 40%（`#48574e` → `#404d4a`，文字 5.23:1）。
  - light：把 `bg0` 向 `fg.green` / `fg.red` 压到「`label-primary` 仍 ≥4.5」的极限（`lightDiffSurface()`），实际 light·hard `#eaebc4`、light·medium `#edeac3`，与代码画布的明度差 1.15 / 1.10（deleted 1.14 / 1.11）——绿 / 红条清晰可辨，文字仍 4.56+。
  - light·soft 特例：它的代码画布本身已卡在 4.5:1 文本门槛，4.5:1 的行底与画布仍然同色（用户二次走查「soft 还是偏浅」）。该档允许行底文字降到 **4.1:1**（`#e5e0b6` / `#f4d8c4`），换来对画布 1.09 / 1.10 的明度差，与 medium 观感同级——2026-10-21 用户确认的可见性取舍。
  - gutter 沿 scheme 纵深方向退一步：light 向 `bg0` 提亮 35%、dark 向 `bgDim` 压暗 35%（对齐 native：light `#edf7ed` on `#e6f4e7`、dark `#132016` on `#1f3124`），dark 行号对比度从 2.09:1 提到 3.97–6.30:1。
- **门槛 / 报告**：diff 行底按文本承载表面硬门槛（默认 `label-primary` ≥ 4.5，light·soft 例外 4.1，见 `docs/reference/contrast.md` §2e）；marker on gutter 加入 §4 报告项；单测断言浅色各档行底与代码画布 ≥1.08:1。`--dsw-alias-code-diff-added/deleted`（聊天 diff 卡片底色）未动。
- **验证**：`node --test`、`npm run check`；`docs/reference/contrast.md` 重新生成。真机验收：浅色 / 深色档各打开一次文件 diff（Review / 右侧文件预览），added 行为清晰的低饱和绿条、deleted 行为红条，代码文字与行号都清楚。

### 2026-10-22 0.3.0：Host 侧持久化（`configForms`）

**决策**

| 项 | 结论 |
|---|---|
| 强度真源 | 当前 profile 的 Host 配置（`cordis.patch.yml` 的 `everforest` 行 `config`）；同一 profile 所有浏览器共享 |
| localStorage | 降级为「首帧缓存 + 旧宿主兜底」，key / 格式不变、不删除；换 origin / 换浏览器由 Host 兜底 |
| 首帧 | **B 方案**：缓存优先 → Host 值兜底 → 默认；解析结果经 `window.__EVERFOREST_BOOT__` 交给 Client 首帧 |
| 迁移 | 0.2.1 localStorage 有非默认强度 + Host 无用户层 → 启动时一次性播种到 Host；Host 已有用户层不覆盖。已知取舍：浏览器 A 恢复默认后，仍持有旧缓存的浏览器 B 下次加载会把它再播种回 Host 一次（之后收敛，不反复） |
| DSH 重启 | Host 半部改动（含本版本升级）必须重启 DSH；运行中改强度经 settings 通道，不需重启。只换包不重启 → 新 Client 退回 localStorage-only（选择仍生效、暂不写 Host），重启后首启补播种 |
| 写入被拒 | 以 `mutate` 的 `response.ok === false` 为准：回读后返回 `false` → adopt 远端值，warn 一次、不弹错；`writable: false` 守卫只是防御（native settings provider 恒为 true） |
| 非法值 | 冷启动 / 重挂时 `Config` 校验失败 → entry 不激活（无主题）；运行中 volatile-only 变更解析失败 → `_commitVolatile` 捕获、Host warning、保留旧引用、entry 保持 ACTIVE，改回合法值热恢复 |
| 设置页位置 | 仍只有本插件 `settings.section` 一页；`settings.configure({ auto: false })` 明确不生成 DSH 自动表单 |

**机制证据**（DSH 0.2.1-rc.2 源码；抽取副本仅用于只读分析）

- `dsh-settings` / loader：`Config` 中挂 `.volatile()` 的叶子字段会被投影进表单；「仅 config 变化」走 volatile-only 更新——把新值原地 commit 到运行中的引用，不重挂插件（`entry.ts` 的 `volatileOnly` / `commitVolatile` 路径）；该路径解析失败被捕获 → Host 记 warning、保留旧引用、entry 保持 ACTIVE（热恢复）。改 Host 半部代码（`index.js`）仍是启动期装载，必须重启；冷启动校验失败才会让 entry 不激活。
- `dsh-client-ui-settings`：`ConfigForms.get(entryId)` 返回 `ConfigFormController`（`getSnapshot` / `subscribe` / `set` / `unset` / `mutate(ops, expectedRevision)`），快照含 `status` / `value` / `base` / `user` / `revision` / `writable`；写入被拒 / revision 冲突会回读（`recover`）并以 `false` 返回。`settings.configure({ auto: false }, ctx.fiber)` 声明该 entry 的自动表单由插件自己渲染。
- 仓库 `src/host-config.js` 的能力守卫：schemastery 无 `volatile()`（< 3.18.3）时 schema 只是普通 union，服务不投影表单 → Client 降级 localStorage。

**实现**

- `src/host-config.js`：`ENTRY_ID` / `SCHEMES` / `Config` / `hostState(config)`（emit 时读 `.get()` 并按枚举再校验）；`index.js` 重新导出 `Config`、改为 `apply(ctx, config)`，boot 脚本把 Host 值作为兜底嵌入；`settings.configure({ auto: false })` 为可选接线（settings 服务缺失时静默跳过）。
- Client：新增 `src/durable.js` 纯逻辑（`hasUserLayer` / `shouldSeed` / `stateFromHost` / `statesEqual` / `stateToSetOps` / `stateToUnsetOps` / `bootHintState`）；`src/state.js` 增加 `readStoredState()` 区分「有真实缓存选择」与「无 / 默认」；`client-entry.js` 用 `ctx.inject(['configForms'], …)` 软等待表单，订阅快照后 adopt / 播种 / 写，`mutate` 被拒（`response.ok=false`）warn 一次并回读（`writable` 守卫留作防御），表单就绪前的选择排队补写；首帧优先读 `window.__EVERFOREST_BOOT__`；跨 origin 的 `storage` 监听保留为兜底。
- 文案：`locale/*/meta.description` 与 `src/locale.js#hint.storage` 改为 profile 级 Host 持久化口径（键集不变）；README / design / assessment / releasing / CHANGELOG 同步。
- 构建 / 发布：`package.json` 0.3.0、`files` 增 `src/host-config.js`、devDependency（`@deepseek-ai/schemastery`）；CI / publish 在 Test 前 `npm install --no-package-lock --ignore-scripts --no-audit --no-fund`。

**验证**

- 自动化：`tests/host-boot.test.mjs`（Config 导出且 light/dark 均 volatile、默认 hard/soft、非法值被 schema 拒绝、`hostState()` 在 emit 时读取、`settings.configure` 失败不致命、B 方案各分支与 `__EVERFOREST_BOOT__` 发布）、`tests/durable.test.mjs`（用户层判定 / 播种条件 / set-unset ops / 归一化 / `bootHintState`）、`tests/integration.test.mjs`（假 configForms 生命周期：采纳 / 播种 / 选择 / 恢复默认 / 写入被拒 / 旧宿主降级 / 延迟到达 / 广播 / 排队补写 / 卸载清理 / manifest 与 Host import 守卫）、`tests/state.test.mjs`（`readStoredState`）；本机 Node 22 实测 `node --test` **144/144 通过**、`npm run check` 全绿（`client.js` 重建为 v0.3.0 头）、`npm pack --dry-run` 清单齐全（含 `src/host-config.js`）。
- 人工（待发布前）：跨浏览器共享、清 localStorage、重启保持、0.2.1 → 0.3.0 迁移播种、写入被拒回读、非法值冷启动 / 运行中两种表现、首帧三路径、Desktop 冷启动 ≤1 帧；见 §9 与 [`assessment.md`](assessment.md) §13。

**§12 整体残余与人工项**：Web 首帧截图、Desktop 冷启动录屏（≤1 帧）、三处代码块与 diff 目检、系统跟随全链路走查（OS 切换 / DSH Appearance / 插件按钮 / Windows 标题栏）、浅色气泡在 light·soft 下的目检；0.3.0 追加的跨浏览器 / 重启 / 迁移 / 写入被拒降级 / 首帧 B 三路径真机目检——以上已由用户于 2026-10-22 确认通过（未逐项留存截图，细节见 [`releasing.md`](releasing.md) §5）。见 §9 与 [`assessment.md`](assessment.md) §13。Desktop 的欢迎 / 登录窗口是 shell 自己的文档（`dsh-app://shell/...`），只跟随 light/dark，不走 `index-inject`，0.x 不覆盖（可接受边界）。

## 13. 2026-10-23 0.4.0：色彩模式（中彩，实验性）

> 前置：方案 0 样张（`.tmp/color-mode-preview/`，四列「关闭 / 轻彩 / 中彩 / 浓彩」× 6 变体，用真实 token 值复刻聊天区与会话列表）于 2026-10-23 经用户目检，选定**中彩**一档并确认初版范围。初版（h1–h3 + 表格 + 会话行）落地后用户验收反馈「还行」，随即要求把标题扩展到 h1–h6、并参考 Obsidian **Everforest Enchanted**（[FireIsGood/obsidian-everforest-enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) 的 `theme.css` @ `bdd7ac7`，MIT）补齐富文本角色；扩展轮与初版同日完成。评估、参考与取舍过程见 [`assessment.md`](assessment.md) §14 / §15；样张截图见 `.tmp/color-mode-preview/shots/`（初版）；富文本扩展的预览页与截图在同一目录下另行生成（`rich.mjs` / `shots-rich/`，均为本地留档、不入库）。

### 13.1 范围（2026-10-23 用户确认，两轮）

**初版（第一轮，用户目检后确认）**

| 项 | 结论 |
|---|---|
| 标题 | 只做 h1–h3 分级色；h4–h6 暂不做 |
| 特殊格式 | 加粗 / 斜体 / 链接 / 行内 code 文字 / 引用文字 / 代码块保持单色（链接与行内 code 芯片本来就是彩色 token） |
| 表格 | 做表头色带 + 隔行斑马纹；边框不动（彩色边框要达到 3:1 会被压成灰绿，失去意义） |
| 列表 / 引用 / 分隔线 / checkbox | 做（marker、引用左条、hr、checkbox accent 用 aqua） |
| 会话记录 | 「待确认」行（含待审批 / 计划待审 / 待回答）与「已完成未查看」行给**整行淡色底** + 状态点换色；「运行中」不上色 |
| 浅色档 | 接受被对比度守卫压暗的「淡彩」 |
| 定位 | 实验性增强，默认开启（可在设置页关闭）；DSH 升级后需回归 |

**扩展轮（用户验收初版「还行」后追加，参考 Enchanted）**

| 项 | 结论 |
|---|---|
| 标题 | h1–h6 依次 `red` / `orange` / `yellow` / `green` / `blue` / `purple`（Enchanted 的逐级标题语义；h1–h4 是大号 / 加粗文本按 3:1，h5–h6 与强调文字同档，见 13.3） |
| strong + em | `purple`，两者同色（与 Enchanted 的强调语义一致）；标题内的 strong / em 用 `color: inherit` 保持标题色 |
| 行内 code 文字 | `blue`，落在 DSH 的蓝底 inline-code 芯片上，按芯片底色单独守卫 |
| 内部文件链接 | `aqua`（`[class*="fileLink"]`）；外链继续用官方 `--dsw-alias-link` token（header-blue） |
| 删除线 / 已完成任务 | `label-tertiary`（`del` 与 `li.task-list-item:has(input[type=checkbox]:checked)`）；刻意弱化，不参与对比度门槛 |
| 引用块 | 左边框仍 aqua，另加 aqua 8% 淡底 + 右侧 12px padding / 右圆角（给淡底留白） |
| 表格 | 表头绿色带 14%、斑马纹 6%、行 hover 10%，权重都按 `label-primary` ≥4.5:1 反推 |
| 复选框 | accent 由初版的 aqua 改为 `blue`（与行内 code / h5 同色系） |
| 未扩展 | fenced code 块与外部链接保持既有 token 颜色；「运行中」仍不上色 |
| 定位 | 不变：实验性、默认开启（可关闭）、DSH 升级后需回归 |

### 13.2 架构：token 层零差异 + 一段作用域 CSS

色彩模式**不改变任何 token**：`tokensFor(state)` 的输出与 0.3.0 逐字节一致，boot payload 也不变。新增的是客户端的一段样式与三个 `<html>` 属性：

- **`src/color-mode.js`**（纯 ESM，无 DOM / storage）：
  - `COLOR_MODE_ATTRS`：`data-everforest-color-mode`（`on` / `off`）、`data-everforest-light`、`data-everforest-dark`（各自 scheme 的强度）。
  - `colorModeRoles()`：6 变体 × **24 个角色色值**，全部由 `tokensFor()` 的表面值（`bg-base`、`sidebar-fill`、`label-primary`、`label-tertiary`、行内 code 芯片、代码块表面）+ `resolvePalette()` 的强调色实算并做对比度守卫（见 13.3）。
  - `colorModeDataset(state)`：Client 写到 `document.documentElement` 的属性映射。
  - `colorModeStyles()`：静态样式表 = 6 个自定义属性块 + **28 条元素规则**（26 条变量驱动 + 2 条字面规则：标题内强调色 `inherit`、引用块右内边距 / 圆角），共 34 条规则，全部以 `html[data-everforest-color-mode="on"]` 开头；深浅色由 `body[data-ds-dark-theme]` 区分（DSH ui-theme 在 boot row 写 body 属性），强度由 `<html>` 上的两个 data 属性选择。
- **`src/client-entry.js`**：`applyLayer()` 在 token 层之外同步 `<html>` 属性（切换色彩模式不重堆 token 层）；一个独立的 `ctx.effect` 注入 `<style data-plugin="dsh-everforest" data-plugin-css="dsh-everforest/color-mode">`，与设置页样式 / slots / locale 完全解耦（设置 UI 不可用时色彩模式仍生效）。
- **作用域选择器**：
  - 聊天 Markdown：`[class*="markdown"]:not([data-markdown-variant="compact"])`（DSH 的容器类名是 CSS modules 哈希，但 `markdown` 子串保留；排除 compact 推理变体）。DSH 0.2.1-rc.2 的 markdown 正文容器**没有稳定 data 锚点**，这是本功能最脆弱的依赖（见 13.7）。
  - 富文本元素：h1–h6、`strong`、`em`、`del`、`:not(pre) > code`（行内 code）、`[class*="fileLink"]`（内部文件链接）、`li::marker`、`blockquote`（左边框 + 淡底）、`hr`、`thead th`、`tbody tr:nth-child(even) > td`（斑马纹）、`tbody tr:hover > td`（行 hover）、`input[type="checkbox"]`（accent-color）、`li.task-list-item:has(input[type=checkbox]:checked)`（已完成任务淡化）。
  - 状态点：`[data-state="warning"]` / `[data-state="done"]`（StateDot 的语义属性，稳定）。
  - 会话行：`[role="treeitem"][data-row-key^="session:"]:has([data-state="warning"|"done"]):not([aria-selected="true"])`（`data-row-key` / `role` / `data-state` 都是稳定锚点；选中行不覆盖，hover 用单独规则加深）。

### 13.3 中彩取值与门槛

所有值都是**派生值**（守卫混合），不是上游调色板原值；默认层仍原样使用官方色。记 `ink = fg.fg`、`bg = bg-base`、`sidebar = sidebar-fill`、`chip = 行内 code 芯片底色`；markdown 文字面 = `[bg, band, zebra, tableHover, quoteBg]`（一段文字可能落到的每一个表面）。

| 角色 | 公式 | 门槛 |
|---|---|---|
| h1 / h2 / h3 / h4 | `guard(fg.red / orange / yellow / green, bg, 3)` | 大号 / 加粗彩色标题 ≥ 3:1（G9） |
| h5 / h6 | `guard(fg.blue / purple, markdown 文字面, 3)` | 强调文字 ≥ 3:1（G16） |
| strong + em（emphasis） | `guard(fg.purple, markdown 文字面, 3)`，标题内 `inherit` | 强调文字 ≥ 3:1（G16） |
| 行内 code 文字 | `guard(fg.blue, chip, 3)` | 对芯片底色 ≥ 3:1（G16） |
| 内部文件链接 | `guard(fg.headerAqua, markdown 文字面, 3)` | 强调文字 ≥ 3:1（G16） |
| 删除线 / 已完成任务（faint） | 直接取 `label-tertiary` | 刻意弱化，不设门槛 |
| marker / quote / hr | `guard(fg.aqua, bg, 3)` | 装饰（非文本）≥ 3:1（G10） |
| checkbox accent | `guard(fg.blue, bg, 3)` | 装饰 ≥ 3:1（G10） |
| 表格表头色带 | `safeTint(bg, fg.green, 0.14)` | 表头上的 `label-primary` ≥ 4.5:1（G11） |
| 隔行斑马纹 / 行 hover | `safeTint(bg, fg.green, 0.06 / 0.10)` | `label-primary` ≥ 4.5:1（G12） |
| 引用块淡底 | `safeTint(bg, fg.aqua, 0.08)` | `label-primary` ≥ 4.5:1（G12） |
| 「待确认」行底 | `safeTint(sidebar, fg.orange, 0.12)` | 行内 `label-primary` ≥ 4.5:1（G13） |
| 「已完成」行底 | `safeTint(sidebar, fg.green, 0.12)` | 同上 ≥ 4.5:1（G13） |
| 行底 hover | 同公式 0.18 | 同上 ≥ 4.5:1（G13） |
| 待确认 / 已完成状态点 | `guard(fg.orange / fg.green, [bg, sidebar], 3)` | 对内容底与侧栏底都 ≥ 3:1（G14） |

**为什么强调文字是 3:1（G16），不是 4.5:1**：浅色档的 Everforest 强调色本身达不到 4.5:1——以 light·soft 为例，`fg.purple` 对画布只有 2.55:1，按 4.5 守卫会把紫 / 蓝 / aqua 全部混成 `#5C6A72`（即墨色，颜色消失）；Enchanted 自身在浅色下同类文本也只有约 **2.6:1**。本实现把强调文字抬到 **3:1** 并保留色相（深色档本来就直接通过 4.5:1，守卫只在浅色档生效），同时**所有正文 `label-primary` 仍保持 4.5:1**（彩色表面按此反推权重）。这是「保留颜色」与「可读性」之间明确的一次取舍；被否决的两个极端见 [`assessment.md`](assessment.md) §15。

`safeTint` 从给定权重开始逐 1% 下调，直到表面上的 `label-primary` 满足 4.5:1；因此**浅色档的实际权重会低于深色档**。两个可观测后果（已知边界，非缺陷）：light·soft 的表格表头 / 斑马纹 / 行 hover 三种绿染收敛到同一档 `#efe7cb`；light·soft 的会话行底退化为侧栏底色本身（权重降到 0，行底不再可见，只有状态点还有颜色）。light 三档的实测值全部贴着门槛（3.00–3.43），浅色档标题 / 强调文字因此明显偏 muted（h3 可能是橄榄色），属目检已接受的「淡彩」。

对比度由 `scripts/check-contrast.mjs` 的 **G9–G16** 硬门槛逐变体锁定；`docs/reference/contrast.md` §2f 有完整色值表与逐项实测值（G16 最弱项实测 3.00–3.03）。样张与实现共用同一组公式：`tests/color-mode.test.mjs` 把 6 变体 × 24 角色 = 144 个色值逐字节钉住（初版 15 角色来自 `.tmp/color-mode-preview/spec.json` 快照，扩展的 9 个角色按上表公式固定）。

### 13.4 持久化与状态

- **Host `Config`**：`light` / `dark` / `colorMode` 三个 volatile 字段（`colorMode` 为 `boolean().default(false)`，`booleanSchema()` 做 `.volatile()` 能力守卫）。0.3.x 的 patch 只有两个字段，schema 默认值补 `false`，无需手改。
- **localStorage**：payload 增加可选 `colorMode`，**`STATE_VERSION` 保持 1**；0.3.x 缓存缺字段读作默认值 `true`（默认开启）且不算损坏（仍参与迁移），非布尔值按损坏处理。默认状态 `{ light: hard, dark: soft, colorMode: true }`。显式 `false`（用户关闭过）继续保留，不会被默认值覆盖。注意：0.4.0 初版默认关闭时，凡使用过的浏览器都写过显式 `colorMode: false`，升级到默认开启后这些设备会继续保持关闭（视为用户选择）——想开启需拨一次开关；只有从未写过该字段的 0.3.x 缓存 / profile patch 才会采用新默认 `true`。
- **写入**：选择强度 / 切换色彩模式一次原子写三个字段；「恢复默认」unset 三个字段；表单就绪前的选择排队补写；广播 / storage 事件 / 迁移播种都包含该字段。
- **迁移**：`shouldSeed` 的「真实选择」判定扩展为「非默认配对或 colorMode 开启」，播种一次写三个字段。
- **首帧**：boot payload / `hostState()` / `__EVERFOREST_BOOT__` 保持只含两个强度（首帧没有聊天 / 会话 DOM，模式 CSS 在挂载后才生效），所以 0.4.0 的首帧行为与 0.3.0 一致。
- **回滚**：0.4.0 → 0.3.0 前必须从 profile patch 删除 `colorMode`，否则 0.3.0 的 `Config` 校验会失败导致 entry 不激活（无主题）；0.2.1 不受影响。

### 13.5 实现清单

- 新增 `src/color-mode.js`（24 角色实算 + 34 条规则的作用域样式）、`tests/color-mode.test.mjs`（12 → 17 项）。
- 修改 `src/state.js` / `src/durable.js` / `src/host-config.js` / `src/locale.js` / `src/settings-page.js` / `src/client-entry.js`，以及对应的 5 个测试文件（初版轮）。
- 修改 `scripts/build.mjs`（SOURCES 增 `color-mode.js`，位置在 `tokens.js` 之后）、`scripts/check-contrast.mjs`（G9–G16 + 报告 §2f）、`package.json`（0.4.0）。
- 富文本扩展轮只改 `src/color-mode.js` / `tests/color-mode.test.mjs` / `scripts/check-contrast.mjs` 与生成物；状态、持久化与设置页不变——开关与写入路径和初版完全一致。
- 生成物：`client.js`、`docs/reference/contrast.md`。

### 13.6 验证

- 自动化：`tests/color-mode.test.mjs` **17/17 通过**（初版 12 项 + 富文本 5 项：24 角色快照、G16 多表面守卫、字面规则、规则总数、CSS 作用域）；`node scripts/check-contrast.mjs --check` 全绿（报告与 G9–G16 一致）。全量 `node --test`（170 项）与 `npm run check` 由最终门禁复核。
- 样张一致性：初版 15 角色与方案 0 样张 `spec.json` 逐字节一致；扩展的 9 个角色（h4–h6、emphasis、inlineCode、linkInternal、faint、tableHover、quoteBg）按 13.3 公式固定并由测试逐值钉住。
- 富文本预览目检（2026-10-23）：用 `colorModeStyles()` 的真实输出 + `tokensFor()` 的真实表面值渲染 6 个变体（`.tmp/color-mode-preview/rich.mjs`，截图在 `shots-rich/`）。dark 三档与 light·hard / light·medium 下 h1–h6、加粗 / 斜体、行内 code、内部链接、删除线、引用块淡底、表格三档、复选框、已完成任务淡化、会话行底与状态点均清晰可辨；light·soft 除已记录的「表格三档同色 / 会话行底不可见」外，标题与强调文字仍保留色相。样张与实现同源，不能替代真机目检。
- 最低对比度实测（`contrast.md` §2f）：G9 大号标题 3.01（light·soft h1）、G10 装饰 3.00、G11–G13 彩色表面正文 4.50–4.51、G14 状态点 3.01、G16 强调文字 3.00–3.03——全部贴着门槛通过，浅色档没有余量。
- 关闭零差异：全部 34 条 CSS 规则都以 `html[data-everforest-color-mode="on"]` 开头（无 `!important`），关闭时匹配不到任何元素；token 层与 boot payload 未改。
- **人工（待真机）**：真实 DSH 需要**重启**才能加载新的 Host `Config`；重启后在设置页开启色彩模式，目检 6 套配色下的 h1–h6 / strong / em / 行内 code / 内部链接 / 删除线 / 引用块 / 表格色带与 hover / checkbox / 会话行，并确认关闭后与 0.3.0 无差异；重点看 light·soft 的淡彩与「会话行底不可见」是否符合预期。本仓库测试环境无法替代这一步。

### 13.7 已知风险与边界

1. **选择器脆弱性（最高）**：DSH 的组件类名是 CSS modules 哈希，markdown 正文容器没有稳定 data 锚点，只能依赖 `[class*="markdown"]` 子串；富文本扩展进一步依赖 `[class*="fileLink"]` / `:not(pre) > code` / `li.task-list-item` 等结构。DSH 升级若重命名容器 / 改变结构，色彩模式可能**静默失效**（颜色不生效，但 token 层与页面不会坏）。会话行锚点（`data-row-key` / `role=treeitem` / `data-state`）稳定得多。
2. **违背官方主题契约**：DSH 官方扩展点是 alias token 覆盖（「token 样式表是颜色值的唯一权威来源」），选择器注入是本项目为内容层色彩做的**实验性例外**；不承诺跨 DSH 版本的兼容。
3. **强调文字低于正文门槛**：h5/h6、strong/em、内部链接、行内 code 对画布 3:1（正文 `label-primary` 仍 4.5:1），浅色档尤其 muted；这是为保住色相而接受的取舍（G16，见 13.3）。
4. **浅色档彩色表面接近不可辨**：light·soft 的表格三档绿染收敛为同一色、会话行底退化为侧栏底色；light 三档全部贴着 3:1 门槛，进一步加深会跌破门槛。已由用户接受为「淡彩」，但真机目检要确认可辨识度。
5. **视觉噪音**：6 色标题 + 富文本 + 表格 + 会话行同时上色，信息密度高的会话可能显得花；默认开启后由设置页开关承担「一键关闭」的退路（实验性标注从设置页移除，改由 README / 文档承载）。
6. **维护面**：每次 DSH 升级（尤其主题 / Markdown 渲染 / 会话列表相关）都要检查选择器是否仍命中；`check-contrast` 只能守住色值门槛，守不住 DOM。
