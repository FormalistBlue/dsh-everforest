# 实施方案

> 配套：[`assessment.md`](assessment.md)（为什么这样做）· [`reference/palette.md`](reference/palette.md)（配色数据与来源）· 目标环境：DSH 0.2.1-rc.2 · 状态：待实现

## 1. 目标与非目标

**目标**

1. 6 套 Everforest 调色板：`dark-hard` / `dark-medium` / `dark-soft` / `light-hard` / `light-medium` / `light-soft`；**默认配对对齐 Everforest Enchanted**（深色 soft、浅色 hard）。
2. 全站改色：背景、文字、边框、品牌、状态、侧栏、菜单/浮层、diff、代码高亮。
3. 设置页可选强度，切换即时生效、重载后保持。
4. 可用 npm 安装；DSH 版本不匹配时给出可读的失败而不是白屏。

**非目标（0.x）**

- 不替换 DSH 的 Appearance 开关（light / dark / system 仍由 DSH 决定）。
- 不接管终端 ANSI 16 色、brand mark、macOS 专用渐变。
- 不写 DSH 设置文档（第三方主题 id 不参与持久化），偏好先用 localStorage。
- 不做 Enchanted 的逐级标题彩色（h1–h6 各一色）：DSH 没有逐级标题颜色 token，实现它需要改写组件选择器，违背「只走 token」的原则。

## 2. 总体架构

```
┌────────────────────────── Browser（Client 半部 client.js）──────────────────────────┐
│                                                                                     │
│  apply(ctx)                                                                         │
│   ├─ inject: ['theme', 'slots', 'locale']                                           │
│   ├─ readState() ── localStorage('dsh-everforest/v1') ──► { light, dark }            │
│   ├─ ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state))  ──► layer (disposer)    │
│   ├─ ctx.slots.inject('settings.section', () => register EverforestSection)          │
│   └─ ctx.locale.register('settings.everforest', { en, 'zh-CN' })                     │
│                                                                                     │
│  EverforestSection                                                                  │
│   ├─ 深色组 3 张卡 / 浅色组 3 张卡                                                   │
│   └─ onClick: writeState → overrideTokens(同 source 替换层) → ctx.theme.setTheme()   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                     DSH ThemeRuntime + ui-layout ThemePresenter
                     （body 内联变量；theme/change 广播；卸载自动还原）
                                        │
┌────────────────────────── Host（index.js）──────────────────────────────────────────┐
│  export function apply() {}   // 空实现：仅承载 bundle 行与显示信息                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

生命周期要点：

- 覆盖层由插件自己的 effect 持有；插件停用 / 卸载 / 页面重载时 DSH 撤销该层，界面回到原生配色。
- 选强度不重建插件，只替换同一 `source` 的覆盖层（`overrideTokens` 文档语义：同 source 整体替换并重新置顶，旧 disposer 变为 no-op）。
- 深浅色切换不需要插件做任何事：覆盖层里每个 token 同时带 `light` 与 `dark`，presenter 按当前 scheme 取值。

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
- **`header-*` 自定义色**也来自 Enchanted（比 `fg-*` 更沉稳，用于链接 / 交互强调 / 品牌）；light 的文档选中色采用 Enchanted 的 `#DED8DB` 修正。
- 数据由 `scripts/palette.mjs` 生成 `src/palette.js`，单元测试固定期望值，避免手抄漂移。

### 3.2 用户状态

```js
/** 持久化结构（localStorage: 'dsh-everforest/v1'） */
{
  version: 1,
  light: 'hard' | 'medium' | 'soft',   // 默认 'hard'（对齐 Enchanted 的 Light 主题）
  dark:  'hard' | 'medium' | 'soft'    // 默认 'soft'（对齐 Enchanted 的 Dark 主题）
}
```

读取失败、字段非法、版本不认识 → 回退默认并尝试重写，不抛错。

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
  '--dsw-specific-sidebar-fill':       r => r.bg0,    // Enchanted 平铺风格
  '--dsw-specific-bubble':             r => r.bg1,
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
| `specific-sidebar-fill` | `bg0` | Enchanted 的平铺（不靠明度分层） |
| `specific-bubble` / `bubble-highlight` | `bg1` / `bg2` | DSH 专有，按最近层级取 |
| `markdown-code-block` | `bg_dim` | Enchanted 代码底 |
| `label-primary/secondary/tertiary` | `fg` / `grey1` / `grey2` | — |
| `border-l1..l4` | `bg5` 的 45/60/75/90% alpha | Enchanted 边框 = `bg5` |
| `brand-primary`（主按钮、选中） | `header-aqua` | Enchanted `interactive-accent` |
| `link` | `header-blue` | Enchanted 外部链接 / `text-accent` |
| `state-success / warn / error / business / idle` | `green` / `yellow` / `red` / `blue` / `grey2` | Enchanted 语义 + 状态可读性 |
| `bg-document-selection` | `bg_visual`（light 用 `#DED8DB`） | Enchanted 选区修正 |
| `file-diff-*` / `code-diff-*` | `bg_green` / `bg_red` 底 + `green` / `red` 标记 | Everforest diff 语义 |
| 焦点环（`state-business-primary`） | `blue` | 派生变量跟随，无需单独覆盖 |

- **static 色阶**（77）：把 DSH 的 `neutral-bluish-00…1000`、`neutral-*`、`deepseek-*`、`blue-*`、`green/red/amber-*` 各自重排到 Everforest 对应色阶（按明度顺序一一映射），使所有 `var(--dsw-static-*)` 引用自动跟随。
- **alias / specific**（118）：79 条 var 引用无需单独处理；其余按语义映射。
- 保底规则：任何没有显式映射的 `--dsw-alias-*` 不覆盖（保持 DSH 值），避免误伤；但会在 `src/tokens.js` 顶部列出「未覆盖清单」，便于逐版本核对。

### 第 2 层：33 个字面量 alias（必须显式给值）

| 分类 | 例子 | 处理 |
|---|---|---|
| 边框透明度 | `border-l1/l2/l3/l4`、`border-l2-darkmode-thin`、`interactive-bg-hover*` | 用 `bg5` 的 alpha 重算（`color-mix` 或 8 位 hex），保持「边框 = bg5、hover 边框 = bg3」的 Enchanted 语义 |
| 遮罩 | `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑色/白色高透明，仅按变体微调 |
| 菜单 / 浮层材质 | `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 45%–94% alpha，保持原不透明度语义 |
| diff | `file-diff-added/deleted-{bg,gutter,marker}`、`code-diff-*` | `bg_green` / `bg_red` 底，`green` / `red` 作 gutter 与标记 |
| 选区 | `bg-document-selection`（原生是 blue-500 40%） | 直接给 `bg_visual`；light 用 `#DED8DB` |
| 其它 | `label-deep-diving*`、`label-shimmer`、`brand-primary-new-color`、`tooltip-key-bg` | 按语义取 accent / 半透明叠加 |

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

两套 scheme 各一份值；`--dsw-alias-markdown-inline-code` 用 `blue`（Enchanted `--code-inline`）。

### 焦点环与派生变量

`--dsw-focus-ring-color` 走 `--dsw-alias-state-business-primary`（DSH 默认蓝），所以映射 `state-business-*` 即自动换色；不单独覆盖派生变量。

## 5. 应用流程（伪代码）

```js
const PACKAGE_ID = 'dsh-everforest'
let layer = null

export function apply(ctx) {
  let state = readState()
  layer = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state))
  ctx.effect(() => () => { layer = null }, 'everforest: token layer handle')

  ctx.locale.register(NS, { en: enDict, 'zh-CN': zhDict })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'everforest', order: 25,
    label: () => ctx.locale.bind(NS).('nav.title'),
  }, createSection({ getState: () => state, select })))

  function select(scheme, strength) {
    state = { ...state, [scheme]: strength }
    writeState(state)
    layer = ctx.theme.overrideTokens(PACKAGE_ID, tokensFor(state)) // 同 source 替换
    if (ctx.theme.getTheme().active.colorScheme !== scheme) ctx.theme.setTheme(scheme)
  }
}
```

- 覆盖层同步建立，首屏不等待网络。
- 页面内「当前」指示从 `ctx.theme.getTheme()` + 本地 `state` 推导；`theme/change` 事件只用于刷新指示，不重建覆盖层。
- 所有注册走 `ctx.effect` / slot 的注入回调，插件停用时回到原生主题。

## 6. 设置页

- **插槽**：`settings.section`（list），注册 `{ id: 'everforest', order: 25, label: thunk }`；owner props 提供 `close`（本页不使用）。
- **布局**：
  - 标题「Everforest」+ 说明（深浅色由 DSH 的「外观」决定；此处分别选择深色与浅色强度）。
  - `深色` 分组：3 张卡（Hard / Medium / Soft，默认 Soft），每张含 5 段色带（`bg0`、`bg1`、`bg2`、`fg`、`header-aqua`）。
  - `浅色` 分组：同上（默认 Hard）。
  - 当前生效行：「深色 Soft · 浅色 Hard」；右侧「恢复默认」（恢复为 Enchanted 默认配对）。
- **交互**：点击卡片 → 立即应用；若该卡属于另一个 scheme，同时调用 `ctx.theme.setTheme(scheme)`，让用户马上看到效果（Appearance 开关之后仍可自由切换，插件按已保存的强度自动跟随）。
- **i18n**：命名空间 `settings.everforest`，`en` / `zh-CN` 两份字典；键：`nav.title`、`intro`、`group.dark`、`group.light`、`strength.hard/medium/soft`、`current`、`reset`、`hint.scheme`、`error.fallback`。
- **样式**：全部用 `--dsw-alias-*` token；类名前缀 `.everforest-*`，通过内置 `styles.insert(css)` 注入（随 Client run 清理）。卡片外观参照 DSH 设置卡片（圆角、边框、hover、selected 用 token，不抄写死颜色）。
- **无障碍**：`aria-pressed`、键盘可达、`:focus-visible` 用 DSH 焦点环；色卡附文本标签，不只靠颜色区分。
- **降级**：`slots.inject('settings.section')` 不可用时跳过页面注册（主题仍生效），并在控制台留一条带前缀的警告。

## 7. 持久化

| 项 | 方案 |
|---|---|
| 存储 | `localStorage['dsh-everforest/v1']`（JSON） |
| 读 | `apply` 时同步读；解析/校验失败回退 `{ light:'medium', dark:'medium' }` |
| 写 | 只在用户选择时写；写入失败（隐私模式/配额）静默降级为会话内生效 |
| 范围 | 逐浏览器（与 DSH Host 偏好不同，设置页文案说明） |
| 迁移 | 0.3.0：改存 Host 侧（方案见 assessment §5 附注），读取时兼容旧 key 并回写 |

## 8. 清单与构建

```jsonc
// package.json（草案）
{
  "name": "dsh-everforest",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "icon": "icon.svg",
  "engines": { "node": ">=20", "dsh": ">=0.2.1-rc.2 <0.3.0" },
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale", "icon.svg", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-theme"] }
  }
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: everforest
      name: dsh-everforest
```

- **无运行时依赖、无 peerDependencies**（正文不使用任何 DSH 包模块，只用注入的服务与 `styles` 内建）。
- `scripts/build.mjs`：零依赖 Node，把 `src/*.js` 合成 `client.js` 并包成
  `window.__ModuleLoader__.load({ id: 'dsh-everforest', factory(require) { … } })`；产物提交入库，安装/运行不执行构建脚本（`prepack` 只在发布前构建）。
- 调色板提取脚本（开发期可重复）：按 [`reference/palette.md`](reference/palette.md) 的表格生成 `src/palette.js`（6 套背景色阶 + 两套前景/强调/header 色）。

## 9. 验证计划

| 步骤 | 通过标准 |
|---|---|
| 安装 | `plugin_manager.install_bundle` 返回 `application: applied`；Plugin Manager 显示标题/描述/图标 |
| 覆盖生效 | Client `Theme.listTokens` 出现本插件注册的覆盖 token（如 `--dsw-alias-bg-base` 在 override 层里被列出）；body 计算值与调色板一致 |
| 设置页 | `Slots.listSubTree` 根 `settings.section` 出现 `id: everforest, order: 25`；页面可见、切换即时生效 |
| 持久化 | 选择 Hard → 刷新页面 → 仍是 Hard；清除 localStorage → 回到默认（深色 Soft / 浅色 Hard） |
| 深浅色 | 用 DSH Appearance 切换 light/dark/system，主题自动使用对应调色板 |
| 停用 | 关闭插件 → 回到 DSH 原生配色，无残留样式 |
| 视觉走查 | 聊天区 / 代码块 / diff / 菜单 / 设置 / 侧栏 / composer / hover / 选中态 / 状态色；记录已知缺口 |
| 发布 | `npm pack --dry-run` 文件清单齐全（`files` 与 `exports` 对齐）；`engines.dsh` 校验生效 |

无浏览器控制能力时：自动项按上表验证，视觉项请用户目检并回传截图。

## 10. 里程碑与验收

| 版本 | 交付 | 验收 |
|---|---|---|
| 0.1.0 | 6 套调色板、覆盖层、设置页、持久化、本机可安装 | 上表前 6 项通过 |
| 0.2.0 | 对比度与全页走查、shiki、i18n、图标、README 截图、npm 发布 | 走查无阻断问题；npm 包可安装并生效 |
| 0.3.0（可选） | Host 侧持久化、`tapIndex` 首屏注入 | 跨浏览器一致；无明显闪动 |

## 11. 开放问题

1. DSH 的 token 集合是否随版本扩展（新增 alias 未覆盖时会保留原生色）——以 `src/tokens.js` 的未覆盖清单跟踪。
2. 设置页文案是否需要跟随 DSH 的 locale 完整语言列表（当前 en + zh-CN，其余回退 en）。
3. 是否需要在 Appearance 行旁增加「Everforest」快捷入口（`settings.general.item`），还是只保留独立页面。
4. 非默认的 4 个变体是否沿用 Enchanted 的 `header-*` 常量值：若硬/软档的对比度检查不通过，需要按背景亮度做小幅修正，并回写 `docs/reference/palette.md`。
5. 侧栏是否要保留 Enchanted 的「平铺背景」（当前方案侧栏用 `bg0`；若视觉上侧栏与主区难以区分，再引入 `bg1`）。
