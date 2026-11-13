# 实施方案

> 配套：[`assessment.md`](assessment.md)（为什么这样做）· [`reference/palette.md`](reference/palette.md)（配色数据与来源）· 目标环境：DSH 0.2.2-rc.2（兼容范围自 rc.2 起） · 状态：**已实现（v0.2.0，2026-10-19 增加首帧 Host boot 注入与系统跟随/文档收尾；2026-10-21 并入 0.2.1 的 P1 打磨；2026-10-22 0.3.0 落地 Host 侧持久化；2026-10-23 0.4.0 增加实验性色彩模式，含参考 Enchanted 的富文本扩展，见 §13；2026-10-24 复核 0.2.1-rc.3：token 集合 / 色彩模式锚点 / 集成点均无变化，见 §12；2026-10-24 色彩模式改为默认提供、移除设置开关（§13.9），同日落地工作区当前会话行（§15）、原生文本选区（§16.2）、dev-only 调试面板（§14）与深浅切换聚光灯（§17）；2026-10-25 追加「跟随系统」OS 翻转也走聚光灯（§17.1）；2026-10-25 发布 1.0.0 首个稳定版，含「鲸鱼 + 山脊松树」图标与 2 张真机截图，见 §10；2026-10-27 发布 1.1.0（OS 跟随翻转聚光灯 + README 重写）；2026-10-28 发布 1.2.0：聊天表格细边框与列宽拖动 / 宽表 Element 表格式滚动，见 §18；2026-10-30 复核 0.2.1-rc.5：token / 渲染层锚点 / 集成点均无变化，见 §12；同日实现任务列表复选框重绘（§13.1）、列宽提示线改用 header_aqua 并加长（§18.2）、设置导航松树图标（§19）与第三方插件兼容别名桥（§20）；2026-10-31 增加表格列宽记忆（本地缓存，§18.6）；2026-11-06 复核 0.2.2-rc.1：token 扩到 217 并补 illustration / done 映射（§4 / §12）、设置导航图标改走官方 `settings.section.icon` 槽位（§19）；2026-11-07/08 交互强调色改为上游 `statusline1`、选中会话行改实色绿底（§15 / §21 / §23）、聊天气泡改苔纸底与派生墨（§12）、新增目录名称 / 标题与下拉选中项 / 插件更新弹窗 / 聊天气泡等常驻样式表（§12 / §22–§25），插件图标改为透明底鲸鱼；2026-11-09 修复设置导航与侧栏面板列表选中项没有高亮（§26），同日按用户要求撤掉会话标题的文字绿、标题回到 DSH 原生 `label-primary`（§27）；同日按用户要求把新会话首屏的鲸鱼标志与「探索未至之境」标题改为文字绿（§28）；2026-11-13 复核 0.2.2-rc.2：token 契约扩到 244，补 JSON 树 / 附件上传槽映射、19 项声明由 static 层继承（§4 / §12），删掉 rc.2 已不存在的 `selectedFill` 规则（§21），并修复 token / asar 两个提取脚本对 rc.2 产物格式的支持）**；实现实况见 [`reference/token-inventory.md`](reference/token-inventory.md) 与 [`reference/contrast.md`](reference/contrast.md)

## 1. 目标与非目标

**目标**

1. 6 套 Everforest 调色板：`dark-hard` / `dark-medium` / `dark-soft` / `light-hard` / `light-medium` / `light-soft`；**默认配对对齐 Everforest Enchanted**（深色 soft、浅色 hard）。
2. 全站改色：背景、文字、边框、品牌、状态、侧栏、菜单/浮层、diff、代码高亮。
3. 设置页可选强度，切换即时生效；强度保存在**当前 profile 的 Host 配置**，同一 profile 的所有浏览器共享、重启后保持（见 §7）。
4. 可用 npm 安装。DSH 版本不匹配时给出可读结果：安装前被插件管理器拒绝（`engines.dsh`，可读错误）；已安装后升级 DSH 导致不兼容时，该 bundle 在装载 profile 时被跳过并在启动诊断里打印警告（不会白屏）。
5. 冷启动首帧使用当前配色：Host 半部经 `webserver/index-inject` 在 Client 加载前写入 boot 调色板（loading 页底色、文字、spinner 环与进度弧）。强度按 **B 方案**解析：本浏览器缓存优先 → Host 配置兜底 → 默认最后；解析结果经 `window.__EVERFOREST_BOOT__` 交给 Client 首帧。Web 首帧即为 Everforest；Desktop 窗口在 load 后才显示、注入行由页面侧异步应用，最多残留 1 帧原生色（2026-10-19 决策接受）。
6. **色彩模式**（0.4.0 引入；2026-10-24 起默认提供、没有设置开关，见 §13.9）：把调色板中尚未上场的强调色用到聊天 Markdown 内容与工作区会话记录状态行。首版（2026-10-23 用户目检后确认）为 h1–h3 标题、列表 marker、引用条 / 分隔线、表格表头色带 / 隔行斑马纹、任务列表 checkbox，以及会话记录「待确认 / 已完成未查看」的行底色与状态点（2026-10-24 重制：行底直接取 palette1 的 `bg_yellow` / `bg_green`；当日后续把待确认行改黄，见 §13.8.1）；用户验收初版后，参考 Obsidian Everforest Enchanted 的 markdown 配色扩展为完整富文本角色——h1–h6 六色标题、strong + em 紫、行内 code 蓝、内部文件链接 aqua、删除线与已完成任务淡化、引用块淡底、表头色带 / 斑马纹 / 行 hover、复选框（浅色绿 / 深色蓝，见 §13.1）。**token 层零差异**：模式只额外注入一段作用域 CSS，不改 token 层、色值固定；设置页不再有开关（见 §13 / §13.9）。

7. **内容 / 交互层（0.4.0 → 1.0.0）**：色彩模式默认提供（§13）；工作区当前会话行（§15）、原生文本选区（§16.2）、深浅切换聚光灯（§17）是 1.0.0 的稳定行为；dev 调试面板只存在于 `npm run build:dev` 的产物（§14）。

**非目标（0.x）**

- 不替换 DSH 的 Appearance 开关（light / dark / system 仍由 DSH 决定）；设置页只提供等价的快捷控制（见 §6），写入同一份全局偏好。
- 不接管终端 ANSI 16 色、brand mark、macOS 专用渐变。
- ~~不写 DSH 设置文档里的强度偏好~~ **已于 0.3.0 落地（2026-10-22）**：强度偏好改走官方 settings / `configForms` 通道写入当前 profile 的 `cordis.patch.yml`（见 §7），不再是「localStorage 唯一持久化」。**Appearance 偏好**仍归 DSH：点色卡或设置页外观控制会通过 `ctx.theme.setTheme` 写入（见 §2 / §6，已决策），本插件不接管其存储格式与 UI。
- 不做 Enchanted 的**全量**逐级标题彩色（h1–h6 各一色）作为**默认**行为：DSH 没有逐级标题颜色 token，改写组件选择器违背「只走 token」的原则。**0.4.0 的例外**：色彩模式（作用域 CSS；2026-10-24 起默认提供、无开关）在用户验收初版后从 h1–h3 扩展到 h1–h6 与完整富文本角色；默认层（token 层）标题仍是单色（见 §13 / §13.9）。

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
- 深浅色切换不需要插件做任何事：覆盖层里每个 token 同时带 `light` 与 `dark`，presenter 按当前 `active.colorScheme` 取值。**1.0.0 起有例外**：跨深浅切换由 `src/theme-spotlight.js` 包住 `ctx.theme.setTheme`，以 View Transition 圆形揭示过渡（见 §17）；**2026-10-25 追加**：`system` 跟随下 OS 翻深/翻浅也走同一揭示（包 `ThemeRuntime.publish`，见 §17.1）；同深浅内的强度切换、会改变偏好的跨窗口广播仍是瞬切。
- **强度真源是 Host 文档**（0.3.0）：Client 不直接写 `cordis.patch.yml`，只调用配置表单的写操作（选择 = 一次 `mutate` 里 set 两个字段，恢复默认 = 一次 `mutate` 里 unset 两个字段）；settings 服务负责落盘并在同一 profile 的所有浏览器间广播。表单通过**软注入** `ctx.inject(['configForms'], …)` 等待（不写进模块级 `inject`，否则旧宿主会把整个 Client 插件挂起）；Client 拿到 Host 快照后以它收敛内存与首帧缓存，本机缓存只在首帧与旧宿主降级时被读取（§7）。
- **升级 / 回滚需要重启 DSH**：Host 半部（`Config` 注册与 boot 脚本）在 Host 启动时装载，刷新页面不会重载 `index.js`；0.3.0 之后运行中改强度走 settings 通道，不需要重启。**只换 npm 包不重启时**，新 Client 会因 Host 半部仍是旧版而退回 localStorage-only（选择仍生效、只是暂不写 Host）；重启 DSH 后首次加载会把本地缓存一次性播种到 Host。`mutate` 被拒（`response.ok` 为 false / revision 冲突）时回读 Host 值、以 Host 为准并 warn 一次；代码保留 `writable` 守卫只是防御——0.2.1-rc.2 / rc.3 / rc.5 的 native settings provider 恒报告 `writable: true`，实际不可达。
- **首帧（Client 加载前）**：Host 半部的 boot row 写入 8 个 token（`bg-base`、三级 label、代码块底、`sidebar-fill`、`border-l2`、`brand-primary`），值来自同一份 `tokensFor()`；强度按 B 方案在脚本执行时解析（缓存 → Host → 默认），并把结果发布到 `window.__EVERFOREST_BOOT__` 供 Client 首帧沿用。Client ThemePresenter 首次 apply 用同名 body 内联变量覆盖，因此不会残留。若 Client 半部加载失败，boot 调色板保留到本页结束（可接受的降级）。
- 设置页点另一深浅色组的色卡会调用 `ctx.theme.setTheme(scheme)` 立即预览；**这会真实写入 DSH 的全局 Appearance 偏好**（Host 设置文档，所有已认证浏览器共享），并把「跟随系统」改成固定深浅色。页面顶部的「跟随系统 / 深色 / 浅色」控制写同一份偏好，可随时恢复 `system`（已决策，2026-10-18；外观控制为后续补充）。
- **内容层与交互层（0.4.0 / 1.0.0 / 1.2.0 / 2026-10-30 起）**：token 层之外另有**十二张常驻**样式表——色彩模式（§13）、原生文本选区（§16.2）、工作区当前会话行（§15）、设置导航选中行（§26）、工作区目录名称（§22.3）、下拉选中项（§25）、表格列宽交互（§18）、聚光灯过渡（§17）、插件更新弹窗（§24）、聊天气泡（§12）、新会话首屏鲸鱼 + 标题（§28）、工作步骤行（§29）；设置 UI 挂载时再加设置页样式表（§19 的导航图标自 2026-11-06 起走官方槽位，不再注入样式表），全部生效时共 13 张。全部由 `src/client-entry.js` 的独立 `ctx.effect` 注入、与 `configForms` 解耦（设置 UI 不可用时除设置页外的样式仍生效）。dev 监听面板只在 `--dev` 构建里挂 `shell.overlay`（§14）。

## 3. 数据模型

### 3.1 调色板（6 套）

完整数据表与来源见 [`reference/palette.md`](reference/palette.md)（官方 palette.md + Everforest Enchanted，均记录 commit 快照）。模型把「背景」与「前景」拆开：

```js
/** 每个变体 = 一套背景色阶（hard/medium/soft × dark/light，来自官方 palette.md） */
/** @typedef {{ bgDim,bg0,bg1,bg2,bg3,bg4,bg5,
 *  bgVisual,bgRed,bgYellow,bgGreen,bgBlue,bgPurple }} BackgroundRamp */
/** 前景 / 强调 / header 色按 scheme 共享（官方语义：强调色不随对比度变化） */
/** @typedef {{ fg, red,orange,yellow,green,aqua,blue,purple, grey0,grey1,grey2,statusline1,
 *  headerRed,headerOrange,headerYellow,headerGreen,headerAqua,headerBlue,headerPurple }} Foreground */
```

- **变体只切换背景色阶**：`dark-hard / dark-medium / dark-soft / light-hard / light-medium / light-soft`，共 6 套；前景、强调、`header-*` 色在同一 scheme 内保持不变。这样选强度只改「底」，语义色（链接、状态、品牌）始终是同一套 Everforest 色。
- **默认配对对齐 Everforest Enchanted**：深色 = `soft`、浅色 = `hard`。Enchanted 的背景值严格等于官方这两套，所以默认观感与其一致；另外四套作为可选的强度档。
- **`header-*` 自定义色**也来自 Enchanted（比 `fg-*` 更沉稳）；2026-10-24 起品牌 / 链接 / 深潜 / 危险 hover 等 UI 强调改用官方 accent（2026-11-07 起品牌 / 交互强调定为绿色；2026-11-08 第三轮起该绿精确取上游 `statusline1`：dark `#A7C080`、light `#93B259`，链接仍 `fg.blue`，见 §21 / §23），`header-*` 只保留给 onboarding 渐变 stops、shiki link 与色彩模式内部链接 / 表格列宽提示线（`headerAqua`）；浅色气泡已改用 `bg_green` → `bg5` 苔纸，不再用 `header-*`。light 的文档选中色采用 Enchanted 的 `#DED8DB` 修正——该修正上游只在 light · hard 上出现，本插件外推到 light · medium / soft（见 `reference/palette.md` §3 注）。
- 数据由 `scripts/palette.mjs` 生成 `src/palette.js`，单元测试固定期望值，避免手抄漂移。

### 3.2 用户状态

**真源 = 当前 profile 的 Host 配置**（0.3.0 起）。当前 active profile 的 `cordis.patch.yml` 里，本插件行带 `config`：

```yaml
- id: everforest            # = ENTRY_ID（src/host-config.js 与 src/durable.js），也是 configForms 的键
  name: dsh-everforest
  config:
    light: hard
    dark: soft
    # 0.4.0 发布版的 colorMode 键已不再是 schema 字段（2026-10-24 起）；旧 patch 里若残留，
    # schemastery 会忽略未知键：校验通过、值不生效、也不会被主动 unset（无需手改）。
```

```js
// Host 半部 src/host-config.js（2026-10-24 起：只有两个强度）
export const Config = Schema.object({
  light: Schema.union(STRENGTHS).default(DEFAULT_STATE.light).volatile(),
  dark:  Schema.union(STRENGTHS).default(DEFAULT_STATE.dark).volatile(),
})
```

- **`Config`** 由 DSH settings 服务扫描活跃 profile 条目后投影成表单，表单键 = entry id（`everforest`）；`.volatile()` 让 Loader 把新值写进运行中的引用而不重挂插件。非法值在校验期被拒：**冷启动 / 重挂**时 entry 不激活（无主题）；**运行中**的 volatile-only 更新失败被 Loader 捕获、保留旧值（entry 保持 ACTIVE，见 §7）。`light` / `dark` 是两个 volatile 叶子字段，写入时**一次原子提交**。旧 patch 里残留的 `colorMode` 键不属于 schema：schemastery 忽略未知键，因此校验照常通过、该值被忽略，插件也不会主动把它删掉（2026-10-24 移除开关时的兼容口径，见 §13.9）。
- **Client** 通过 `ctx.inject(['configForms'], …)` 软等待服务，再 `formsCtx.configForms.get('everforest')` 读（`status` / `value` / `base` / `user` / `revision` / `writable` + `subscribe`）与写（`mutate(ops)`）；entry id 必须与 `cordis.patch.yml` 的 `id` 一致（Client 的 `src/durable.js` 与 Host 的 `src/host-config.js` 各持一份常量，测试把两者与 patch 行一起钉住）。Client 侧纯逻辑（`hasUserLayer` / `shouldSeed` / `stateFromHost` / `statesEqual` / `stateToSetOps` / `stateToUnsetOps` / `bootHintState`）集中在 `src/durable.js`，随 `build.mjs` 打进 `client.js`（不进 `files`）。
- **首帧缓存（不是真源）**：`localStorage['dsh-everforest/v1']`，内容是 `{ version: 1, light, dark }`。**`STATE_VERSION` 保持 1**：0.3.x 缓存同形、直接沿用；0.4.x 带 `colorMode` 字段的旧缓存仍合法——多出的字段在读取时被忽略、下次写入自然丢弃，**不触发修复重写**（见 §13.9）。
- **首帧 boot payload 只有两个强度**：Host boot 行只画首帧需要的 8 个 token，色彩模式 CSS 在 Client 挂载后才有意义（首帧还没有聊天 / 会话 DOM），因此 `__EVERFOREST_BOOT__` 是 `{ version: 1, light, dark }`、`hostState()` 是 `{ light, dark }`，强度部分与 0.3.0 逐字节一致。
- **解析顺序**：首帧 = 缓存 → Host 值 → 默认；运行期 = Host 文档为权威。读取失败 / 缓存非法 / 版本不认识 → 逐字段回退，最终回退默认状态 `{ light: 'hard', dark: 'soft' }`，不抛错。

```js
/** 首帧缓存 / 旧宿主降级结构（localStorage: 'dsh-everforest/v1'） */
{
  version: 1,
  light: 'hard' | 'medium' | 'soft',   // 默认 'hard'（对齐 Enchanted 的 Light 主题）
  dark:  'hard' | 'medium' | 'soft',   // 默认 'soft'（对齐 Enchanted 的 Dark 主题）
  // 0.4.x 的 colorMode 字段已废弃：旧 payload 仍合法，读取时忽略、下次写入丢弃（不重写修复）
}
```

### 3.3 覆盖层

```js
/** Record<cssVariableName, { light: string, dark: string }> */
tokensFor(state) → {
  '--dsw-alias-bg-base': { light: lightRamp.bg0, dark: darkRamp.bg0 },
  '--dsw-alias-brand-primary': { light: lightFg.statusline1, dark: darkFg.statusline1 },
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
> - **文档选中色保留 40% 透明语义**：`--dsw-alias-bg-document-selection` 给 `color-mix(in srgb, bg_visual 40%, transparent)`，不要直接给实色（否则文档预览选区会盖住底图）。**原生文本选区**不走这个 token（DSH 样式表根本没有消费它），由 `src/selection.js` 注入 `::selection`，取实色 `bg_visual` 并 `color: inherit`（见 §16.2）。
> - **shiki 必须显式**：`shiki.css` 在 `:root` 声明 light 值，且 `--shiki-background` / `--shiki-foreground` 在 `:root` 引用的是 body 级 alias（级联上属 guaranteed-invalid），不能靠 alias 继承。
> - **明确不覆盖**：字体 / 圆角 / 阴影 / `--dsw-focus-ring-color` / `--dsw-focus-ring-width` / `--dsw-menu-backdrop-filter` / `--dsw-mask-blur` / `--dsw-elevation-*`（5 条）/ `--dsw-corner-shape` / `--dsh-*`（覆盖层的 `TOKEN_COVERAGE.uncovered` 共 17 条）/ 终端 ANSI 16 色 / brand mark 与文件图标 artwork / macOS darwin 渐变。boot 首帧色已改由 Host 半部的 `index-inject` row 覆盖（见 §5「首帧注入」与 §12），不再属于不覆盖项。未覆盖的 alias 保持 DSH 原值，并在 `src/tokens.js` 顶部登记清单。

> **2026-10-18 视觉走查修正（inline code 芯片）**（证据：`dsh-web-frontend/dist/assets/index-*.css`：`.markdown :not(pre) > code { background-color: var(--dsw-alias-markdown-inline-code); border: .5px solid var(--dsw-alias-border-l1) }`；native light = `static-neutral-50`、dark = `static-neutral-800`，两侧都是**背景**中性色）：
>
> - 旧方案把该 token 映射成 `p.fg.blue`，误把 Enchanted 的前景变量 `--code-inline`（蓝色**文字**）当成了 DSH 的背景语义。实际渲染是「饱和蓝色块 + 继承的 `label-primary` 深色字」：`label-primary` 对该底的对比度 light 仅 **1.65:1**、dark **1.29:1**，既抢眼又难读（浅色主题下最明显）。
> - 修正：映射为 Everforest 的 `bg_blue` 芯片表面（`inlineCodeSurface`，取调色板里「蓝色背景」角色：light 淡薄荷、dark 灰蓝），文案仍继承 `label-primary`；并把该 token 加入 `scripts/check-contrast.mjs` 的文本承载表面硬门槛，6 档 ≥ 4.5:1。
> - 结果：light-hard 芯片 `#ECF5ED`（5.01:1）、light-soft `#E6E8DA`（4.50:1）、dark-hard `#384B55`（5.39:1）、dark-soft `#3F5764`（4.51:1）；芯片比 `bg0` 略深（light）/ 略浅（dark），只是一个安静的代码底，不再是前景强调色。**深色两档已被下方 2026-10-24 修正取代**（现行 dark-hard `#21262a`、dark-soft `#2c343a`；light 档不变）。

> **2026-10-24 视觉修正（深色 inline code 芯片）**（用户截图对比 Everforest Enchanted 的行内代码）：
>
> - dark 侧由 `bg_blue` 改为 `bg_dim`。`bg_blue` 在深色下比 `bg0` 高一档（dark·soft `#3F5865`，画布 `#333C43`），芯片读成「抬起的灰蓝色块」；Enchanted 的行内代码底色是 `bg_dim`（截图实测 `#293136`，即本调色板 dark·soft 的 `bgDim`），比画布更深、呈凹陷的代码底。
> - 修正分两步：先取 Enchanted 的行内代码底 `bg_dim`（dark·soft `#293136`），真机目检偏深（用户二次反馈「有点太深」）；最终以 `bg_dim` 为起点向 `bg0` 提亮 30%（`DARK_INLINE_CHIP_LIFT = 0.3`），dark·soft 芯片变为 `#2C343A`，比画布 `#333C43` 只略深（1.13:1），仍是凹陷的代码底，但不再和代码块同底。
> - 蓝色语义由色彩模式的行内 code 前景（`--everforest-color-inline-code`）承担；浅色档保持 `bg_blue`（淡薄荷）。`label-primary` 对芯片 6 档仍 ≥ 4.5:1、色彩模式 `inlineCode` 蓝字对芯片 ≥ 3:1，数值由 `docs/reference/contrast.md` 重新生成。

> **2026-10-24 视觉修正（深色边框可见度）**（用户反馈「深色模式下设置界面里面的各种边框线条有点不明显」；证据：`@deepseek-ai/dsh-client-ui-settings-*` 的 `client.js` 内联 CSS —— `.qgYWUG_card` / `.jrmgQW_rowCard` / `_6qcDqa_card` 都是 `border:.5px solid var(--dsw-alias-settings-card-stroke)` + `background:var(--dsw-alias-settings-card-fill)`，设置页出现最多的边框 token 依次是 `border-l2` 13 处 / `border-l3` 10 / `border-l4` 5 / `settings-card-stroke` 4）：
>
> - 两层原因：① Everforest 深色 ramp 压缩，`bg0` → `bg5` 只有约 2.0:1（浅色 1.56:1），同一 alpha 在深色下天生更弱；② DSH 深色表面比 Obsidian 浅、层次更平，卡片描边（`bg5` 60%）压在自己的 `bg2` 填充上只有 **1.29:1**，融进卡片。
> - 修正：深色边框墨色由 `bg5` 向 `grey1` 提亮 20%（`DARK_BORDER_LIFT = 0.2`），并把每档 alpha 抬高一档 —— `l1/l2/l3/l4` = **60/78/90/100%**、`border-l2-darkmode-thin` 30→45%；浅色档保持 Enchanted 的 45/60/75/90% 不动（用户只反馈深色）。
> - 效果（dark·soft）：`border-l2` 对 `bg0` 1.52 → **1.91:1**、对 `bg1` 1.40 → **1.70:1**；设置卡片描边对自己的填充 1.29 → **1.52:1**、对页面底 1.73 → **2.08:1**；`border-l4` 到 100%（Enchanted 的边框本来就接近不透明的 `bg5`）。
> - 连带：`settings-card-stroke` / `button-ghost-active-border` / `onboarding-checkbox-border` 改为复用 `l2` / `l3` / `l1` 档位，避免三套数值漂移；`tests/tokens.test.mjs` 钉住 6 档色值，并新增「卡片描边 / 填充 ≥ 1.45:1、描边 / 页面 ≥ 1.8:1」两道回归下限。

> **2026-10-18 视觉走查修正（侧栏边界）**（证据：`@deepseek-ai/dsh-client-ui-layout` 的 `AppFrame.module.css`、`dsh-client-ui-sidebar` 的 `SidebarRoot.module.css`；用户截图对比）：
>
> - DSH 用 `--dsw-specific-sidebar-fill` 画三处：侧栏列（`.sidebarCol`）、Windows 标题栏条（`[data-windows-titlebar] .frame:before`）以及内容卡背后的 frame；内容卡本身是 `--dsw-alias-bg-base`（bg0）+ 16px 左上圆角（`[data-windows-titlebar] .centerCol`）。native 两侧本就不同（light 侧栏 `#f9fafb` / 内容 `#fff`，dark `#1b1b1c` / `#151517`），所以能看出边界。
> - 旧方案把两者都映射成 `bg0`（Enchanted 平铺风格），整条边界消失 —— 用户报告「Everforest 全部用的同一个颜色，没法区分边界线了」。
> - 修正：`--dsw-specific-sidebar-fill` = `mix(bg0, bg1, 80%)` 再经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏一致）；6 档边界对比度 1.03–1.12（native 1.045 / 1.060，观感同级）。light·soft 受正文 4.5:1 上限约束，实际取 `#eee7ce`（守卫后的最大步长）。该 token 已加入 `scripts/check-contrast.mjs` 的文本承载表面，并新增「侧栏边界 ≥ 1.02:1」硬门槛（`contrast.md` §2c/§3）。
> - 连带：该 token 同时是桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会与自绘标题栏条同色；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。

> **2026-10-25 复核修正（token 计数与分类口径）**（证据：`src/tokens.js` 的 `AUXILIARY_TOKENS` / `TOKEN_COVERAGE`、`docs/reference/token-inventory.json` 的 `counts` 与逐 token 形态、本次 import 实测）：
>
> - **`tokensFor()` 实际输出 212 条** = 206 个颜色 token（77 static + 107 alias + 11 specific + 11 shiki）+ **6 个辅助 token**（`--dsw-gradient-onboarding-violet/blue/cyan-stops`、`--dsw-linear-gradient-think`、`--dsw-linear-think-select`、`--dsw-menu-surface-fill`）。`reference/token-inventory.md` §5 只把 206 个颜色 token 计入覆盖清单、把 202 个非颜色 token 列为保留，这 6 个辅助 token 单列。本文件把它写进「菜单 / 浮层材质」等 alias 层的地方（如 `menu-surface-fill`）按「辅助层」理解。
> - **alias / specific 118 条的 light 侧形态**（inventory 统计）：**76 var-static + 7 color-mix + 29 literal + 6 alias 间引用 = 118**。旧写的「74 var-static + 5 color-mix + 28 literal + 5 alias-ref = 112」是 `design-platform.css` 单 sheet 的拆分；差 6 条来自 `base.css`（2 alias-ref）与 `onboarding.css`（1 literal + 1 var-static + 2 color-mix），覆盖结论不变。因此第 2 层「33 个字面量 alias」修正为 **35 条必须显式给值（29 字面量 + 6 alias 间引用）**。
> - **dark 侧**：107 个 alias 中 **104 个**有 `body[data-ds-dark-theme]` 重定义（28 literal / 5 alias-ref / 65 var-static / 6 color-mix），3 个 missing（`onboarding-accent`、`settings-card-fill`、`settings-card-stroke`，按级联沿用 light 声明；插件两侧仍显式给值）。旧写「dark 侧 alias 重定义为 101」是本次复核前的数字。
> - **未覆盖清单**：`TOKEN_COVERAGE.uncovered` 共 **17 条**，除下文明列的字体 / 圆角 / 阴影 / 焦点环 / `menu-backdrop-filter` 外，还包括 `--dsw-mask-blur`、`--dsw-elevation-*`（5 条）、`--dsw-corner-shape` 与 `--dsh-*`。另有 `SELF_CHECK_TOKENS` 5 个探针（`--dsw-focus-ring-width`、`--dsw-menu-backdrop-filter`、`--dsw-shadow-lv1`、`--dsw-mask-blur`、`--dsw-elevation-stroke-color`），启动后检查一次、缺失只 warn。

> **2026-11-06 复核修正（0.2.2-rc.1 token 契约扩展）**（证据：安装包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js` 重新提取，`node scripts/extract-theme-tokens.mjs --from <rc.1 client.js>` 输出）：
>
> - **颜色 token 206 → 217**：82 static（+5：`neutral-bluish-55/90/310`、`violet-400/600`）+ 114 alias（+7：`illustration-background/backing/detail/inset/shadow/surface`、`state-done-primary`）+ 10 specific（−1：`--dsw-specific-sidebar-nav-item-hover` 上游不再声明）+ 11 shiki。`tokensFor()` 共 **223 条**（217 颜色 + 6 辅助），`reference/token-inventory.*` 已重新生成（SHA-256 `12f3c67b…`）。
> - **映射**：illustration 六项按 DSH 声明值的「绝对亮度锚定」落在各 scheme 的中性 ramp 上（light：background < surface < backing/detail；dark：detail < surface < backing < background，保留插图的明暗层次；`inset` / `shadow` 按 DSH 语义 light 取 surface、dark 取 backing）；`state-done-primary` = Everforest purple（DSH 的 done 用紫色，与 success 绿区分）；violet static 只有 400/600 两档，用显式 `positions` 放在纯色相附近，而不是被索引拉伸到 tint → shade 两端。
> - **消费方**：新增 token 在已发布包里只被 `dsh-client-ui-schedule` 的 `ScheduleEmptyIllustration`（自动化任务页空态插图）与实验性 `forge` 插件引用；核心 UI 无其它引用，所以不补也不会崩，只是插图不跟随主题。
> - **删除的 token**：`--dsw-specific-sidebar-nav-item-hover` 在 0.2.2 不再声明（设置导航 hover 改用既有 `interactive-bg-hover` 等 token），插件从映射表移除；旧 inventory 中的历史值不再输出。

> **2026-11-13 复核修正（0.2.2-rc.2 token 契约 217 → 244）**（证据：安装包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js` 重新提取，`node scripts/extract-theme-tokens.mjs --from <rc.2 client.js>`；与旧 inventory 逐项比对：+27 / −0 / 改值 0）：
>
> - **颜色 token 217 → 244**：82 static + 138 alias（+24）+ 13 specific（+3）+ 11 shiki。新增 27 项覆盖卡片、图表、悬停卡片、通知 / tooltip 文字、JSON 树、附件上传槽、侧栏指南 hero 与侧栏闪动 —— 对应上游 release notes「改善自定义主题对通知、卡片、计划和任务等界面颜色的覆盖」。`tokensFor()` 共 **231 条**（225 颜色 + 6 辅助）；剩余 **19 条**（`INHERITED_TOKEN_NAMES`）声明值只引用已覆盖的 static / alias，按继承得到主题色。
> - **显式新增 8 条**（2026-11-13 用户逐项选定，语法角色与 Shiki 层一致）：`json-tree-keyword` = `fg.blue`、`json-tree-number` = `fg.purple`、`json-tree-property` = `fg.aqua`、`json-tree-string` = `fg.yellow`、`json-tree-punctuation` / `-icon` = `fg.grey1`、`json-tree-hover` = `alpha(fg.grey1, 0.08)`；`--dsw-specific-file-upload-track` = `alpha(ramp.bg5, 0.45)`。
> - **继承 19 条**：卡片 / 图表 / hovercard / `label-on-color` / `toast-action` / `tooltip-label` / `trajectory-accent` / `guide-hero` / `sidebar-right-flash`。它们的声明是 `var(--dsw-static-*)`、`color-mix(static)` 或 alias 间引用，static 层改写后即为主题色（真机 light·hard 实测：`card-fill #faf7ea`、`hovercard-bg #616f75`、`sidebar-right-flash #93B259`、`guide-hero #e4e5d6`）。测试按 `INHERITED_TOKEN_NAMES` 校验「契约 = 显式 + 继承」，上游把任一项改成字面量会直接失败。
> - **消费方**：`dsh-client-ui-deliverables` / `-plan` / `-schedule`（card-*）、`-conversation`（chart-*）、`-workspace` / `-schedule`（hovercard-*）、`-sidebar-right`（guide-hero、sidebar-right-flash）、`-attachment`（file-upload-track、label-on-color）、`-agent-preset`（border-selected）、`-trajectory`（json-tree-*、trajectory-accent）、`-theme`（tooltip-label、toast-action）。
> - **工具链**：rc.2 的 `ui-theme/lib/client.js` 不再输出 `//#region … dsh-inline-css:`，8 张样式表改为 `var <name>_css_default = ...` 模板字符串；`scripts/extract-theme-tokens.mjs` 已同时支持两种编码。新版 `app.asar` 的 header JSON 后带 NUL padding，`scripts/extract-asar-package.mjs` 已剔除后再 `JSON.parse`。
> - **删除的规则**：`MENU_SELECTED_FILL` / `MENU_SELECTED_FILL_RADIO`（`selectedFill` 子元素）在 rc.2 整包 0 处；选中项改为在 `_selected_` 行上直接画底，规则与导出删除后颜色不变（真机实测底 `#93B259`、字 `#FFFBEF`）。

### 第 1 层：派生映射（契约 244 个颜色 token，显式覆盖 225 个）

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
  // 气泡 = 浅色苔纸（bg_green → bg5 22%，light·soft 抬起）；深色 token 保持 bg1。2026-11-10 起两个 scheme 的实际绘制都由常驻样式表画成侧栏选中绿底：深色配画布墨、浅色配派生深墨（token 仅作失效回落，见 §12）
  '--dsw-specific-bubble':             r => bubbleSurface(r),
  '--dsw-alias-markdown-code-block':   r => r.bgDim,
  // 文字 / 边框
  '--dsw-alias-label-primary':         r => r.fg,
  '--dsw-alias-label-secondary':       r => r.grey1,
  '--dsw-alias-label-tertiary':        r => r.grey0,
  '--dsw-alias-border-l1':             r => border(r, 'l1'),
  '--dsw-alias-border-l3':             r => border(r, 'l3'),
  // 强调 / 状态（Enchanted 语义；品牌 / 链接 2026-10-24 起改用官方 accent，见 §16.1）
  '--dsw-alias-brand-primary':         r => r.green,
  '--dsw-alias-link':                  r => r.blue,
  '--dsw-alias-state-success-primary': r => r.green,
  '--dsw-alias-state-warn-primary':    r => r.yellow,
  '--dsw-alias-state-error-primary':   r => r.red,
  '--dsw-alias-state-business-primary':r => r.blue,
  '--dsw-alias-state-idle-primary':    r => r.grey0,
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
| `specific-bubble` | 浅色：`bg_green` → `bg5` 22% 的苔纸，按 `label-primary` 4.5:1 守卫（hard `#e7ead0`、medium `#e7e9cd`）；light·soft 因文本上限改为白 → 同一苔纸 40% 的淡苔纸（`#f1f2e5`）。深色：`bg1`（对比度守卫）。2026-11-10 起两个 scheme 的实际绘制都由常驻样式表改成侧栏选中绿底 + 画布墨：浅色 `#93B259` + `#FFFBEF` / `#FDF6E3` / `#F3EAD3`（2.32 / 2.22 / 2.00:1，强调层奶油墨上限），深色 `#A7C080` + `#272E33` / `#2D353B` / `#333C43`（6.88 / 6.23 / 5.62:1，AA）；token 保持不变，作为样式表失效时的可读回落 | DSH 用户消息气泡；2026-10-19 修正：旧映射 `bg1` 与 `bg0` 仅 1.02–1.06，浅色下与画布融为一体；2026-10-21：light·soft 不再用近白卡片；2026-11-08：用户从六方案 demo 选「苔纸 / 只换字色」；2026-11-10：用户要求气泡与侧栏选中行同色对（先深色后浅色），长文本曾试深墨后换回奶油白（见 §12） |
| `specific-bubble-highlight` | 浅色 / 深色均 `surface(p, 2)` | 气泡高亮态（当前 chat 未使用，保留最近层级语义） |
| `markdown-code-block` | `bg_dim` | Enchanted 代码底 |
| `markdown-inline-code` | 深色 `bg_dim` 向 `bg0` 提亮 30% / 浅色 `bg_blue`（芯片表面） | DSH 用作 inline code 的**背景**（文字继承 `label-primary`）；Enchanted `--code-inline` 是前景色，不可复用；深色 2026-10-24 先由 `bg_blue` 改为 `bg_dim`、再向 `bg0` 提亮 30%（芯片对画布 1.11–1.13:1 的凹陷，见上方修正） |
| `label-primary/secondary/tertiary` | `fg` / `grey1` / `grey0` | — |
| `border-l1..l4` | 浅色 `bg5` 的 45/60/75/90% alpha；深色 `bg5` 向 `grey1` 提亮 20% 后 60/78/90/100%（2026-10-24，见上方修正） | Enchanted 边框 = `bg5`；深色因 ramp 压缩 + DSH 表面更平而抬高 |
| `brand-primary`（主按钮、选中、交互强调） | `statusline1`（上游「Menu Selection Background / Tab Line Label Background (active)」；dark `#A7C080` = `green`，light `#93B259`；2026-10-24 起先试 `aqua`、2026-11-07 按官方参考图定为 `green`、2026-11-08 第三轮换成 statusline1，见 §16.1 / §21 / §23；`button-info-fill` / `state-business-*` / `label-primary-bluish` / `label-deep-diving` 同色；实底取原值、不再微深） | 上游拿 statusline1 绿色画菜单选中 / 当前标签 / statusline，`interactive-accent` 的替代 |
| `link` | `blue`（官方 accent；2026-10-24 起，见 §16.1） | Enchanted 外部链接 / `text-accent` 的替代；文本 / 信息角色保留蓝色（2026-11-07 起，见 §21） |
| `state-success / warn / error / idle` | `green` / `yellow` / `red` / `grey0` | Enchanted 语义 + 状态可读性（idle 随 A9 改用 `grey0`） |
| `state-business`（DSH 的 DeepSeek 品牌蓝角色：活动 / 选中 / 焦点环） | `statusline1`（2026-11-07 起为绿色，2026-11-08 第三轮精确到 statusline1，见 §21 / §23；原为 `blue`） | 上游拿品牌蓝画交互强调，本主题按交互语义归绿 |
| `bg-document-selection` | `bg_visual`（light 用 `#DED8DB`） | Enchanted 选区修正；原生文本选区另见 §16.2 |
| `file-diff-*` / `code-diff-*` | `file-diff-*` = `bg_green` / `bg_red` 底（light 向 `bg0` 混 45%，dark 40%，再按 `label-primary` 4.5:1 守卫）；`code-diff-*` = `green` / `red` 标记色 10% alpha；`green` / `red` 作 gutter 与标记 | Everforest diff 语义（2026-10-21 可读性修正，见 §12） |
| `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑白高透明，仅按变体微调 | 遮罩语义 |
| `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 原不透明度 alpha | 浮层 / 工具栏材质 |
| `border-inverted` / `border-inverted2` | `bg5` alpha（浅色低透明度、深色约白 6%） | 反向边框 |
| `label-primary-foreground` / `brand-text` | `bg0`（品牌 / 主按钮实色底上的前景） | 避免青绿底配白字对比不足 |
| `button-primary-hover` / `button-primary-dimmed` | `accentFill` 向亮端提亮 18%（hover）/ 降低饱和（dimmed；2026-10-24 起，2026-11-07 hover 由 `blue` 改为强调色，见 §21） | 主按钮状态，默认引用中性 static |
| `interactive-bg-active` / `-hover` / `-hover-accent` / `-hover-danger` | 上游无 hover 角色、`bg5` 未使用：`-active` / `-hover` 为 `bg4` 的 80% / 50% 半透明叠层（2026-11-08 A7）；`-hover-accent` = `statusline1` 16%、`-hover-danger` = `red` 12% | 交互反馈 |
| `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐隐 | 思考过程渐隐（Windows 可见） |
| onboarding（accent + 3 渐变 stops + card/secondary/checkbox 边框） | accent = `statusline1`（2026-11-08 第三轮；此前 2026-11-07 为 `green`、2026-10-24 至 11-07 为 `aqua`）；3 个渐变 stops 仍用 `header-*`（装饰）/ `bg_*` 派生 | 首登页，7 个 token |
| `brand-primary-new-color` | `statusline1`（2026-11-08 第三轮，见 §23；此前 `green` / `aqua`） | 品牌强调（light 侧是字面量） |
| `tooltip-key-bg` | tooltip 深色底向亮端 `mix(…, 25%)`（实现修正，原写 `bg3`） | 键帽 |
| `focus-ring`（不覆盖） | 走 `state-business-primary` 派生 | 焦点环跟随状态色，不单独覆盖 |

- **static 色阶**（82）：把 DSH 的 `neutral-bluish-00…1000`、`neutral-*`、`deepseek-*`、`blue-*`、`green/red/amber-*` 各自映射到 Everforest 对应色相当量。**不能按明度顺序一一对应**（两边步数不同）：以「最暗 = bg5、最亮 = bg0」为端点做分段线性插值，中间按目标色相的明度分布取档；4 个带 alpha 的 static（`green-500-a08/a12`、`red-400-a12`、`red-600-a08`）单独给 rgba。使所有 `var(--dsw-static-*)` 引用自动跟随。
- **alias / specific**（2026-10-25 口径 118 = 107 alias + 11 specific；2026-11-06 起 124 = 114 alias + 10 specific；2026-11-13 起 **151 = 138 alias + 13 specific**）：97 条直接 static var + 8 条含 static 的 color-mix 自动跟随；**37 条字面量 + 9 条 alias 间引用 = 46 条**必须显式给值（见第 2 层；其中 19 条由 `INHERITED_TOKEN_NAMES` 走 static / alias 继承，其余 8 条 2026-11-13 新增字面量已显式覆盖）。
- 保底规则：任何没有显式映射、且不引用被覆盖 static 的 `--dsw-alias-*` 不覆盖（保持 DSH 值），避免误伤；在 `src/tokens.js` 顶部列出「未覆盖清单」，便于逐版本核对。

### 第 2 层：46 个字面量 / alias 间引用（必须显式给值）

| 分类 | 例子 | 处理 |
|---|---|---|
| 边框透明度 | `border-l1/l2/l3/l4`、`border-l2-darkmode-thin` | 用 `bg5` 的 alpha 重算（`color-mix` 或 8 位 hex），保持「边框 = bg5、hover 边框 = bg3」的 Enchanted 语义；深色档墨色向 `grey1` 提亮 20%、每档 alpha 抬高一档（2026-10-24，见上方修正） |
| 交互叠层 | `interactive-bg-active` / `-hover` | `bg5` 退出交互层：改为 `bg4` 的 80% / 50% 半透明叠层；菜单选中项另由 `ui-accents` 画 `statusline1` 实底（2026-11-08 A7，见 §25） |
| 反向边框 | `border-inverted`、`border-inverted2`（旧文档漏） | `bg5` alpha：浅色低透明度、深色约白 6% |
| 遮罩 | `bg-mask-1/2/3`、`bg-mask-photo`、`bg-mask-drop`、`bg-skeleton` | 保持黑色/白色高透明，仅按变体微调 |
| 菜单 / 浮层材质 | `menu-surface-fill`、`alias-menu-group-header-fill`、`button-tool-bar-*` | `bg2` + 45%–94% alpha，保持原不透明度语义 |
| diff | `file-diff-added/deleted-{bg,gutter,marker}`、`code-diff-*` | `file-diff-*` 用 `bg_green` / `bg_red` 作底（向 `bg0` 收 40–45% 并守卫）；`code-diff-*` 用 `green` / `red` 10% alpha 标记色，`green` / `red` 作 gutter 与标记 |
| 选区 | `bg-document-selection`（原生是 blue-500 40%） | `color-mix(in srgb, bg_visual 40%, transparent)`；light 用 `#DED8DB` 的 40% |
| 品牌 / 主按钮 | `brand-primary-new-color`、`label-primary-foreground`、`brand-text`、`button-primary-hover` / `-dimmed` | `statusline1` + `bg0` 前景；hover 用 `accentFill` 向亮端提亮 18%（2026-11-07 起，见 §21 / §23） |
| 思考渐隐 | `linear-gradient-think`、`linear-think-select` | `bg0` → `bg1` 渐变（Windows 可见） |
| 首登页 | `onboarding-accent`、`gradient-onboarding-{violet,blue,cyan}-stops`、`onboarding-card-fill` / `secondary-fill` / `checkbox-border` | accent = `statusline1`（2026-11-08 第三轮，§23）；3 个渐变 stops 仍用 `header-*` / `bg1` / `bg2` 派生（7 个 token） |
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
| `link` | `header-blue`（代码链接保持 Enchanted 色，不随 UI accent 切换） | 链接色 |

两套 scheme 各一份值。**11 个全部显式覆盖**（9 个 `--shiki-token-*` + `--shiki-background` + `--shiki-foreground`）：`shiki.css` 在 `:root` 声明 light 值，且 foreground/background 在 `:root` 引用 body 级 alias（级联上 guaranteed-invalid），不能依赖 alias 继承。`--dsw-alias-markdown-inline-code`（不属 shiki 层）也必须显式：DSH 把它用作 inline code 的 `background-color`，映射为芯片表面（浅色 `bg_blue` / 深色 `bg_dim`）并受对比度守卫（见上文「视觉走查修正」），不沿用 Enchanted 的 `--code-inline` 前景蓝。

### 焦点环与派生变量

`--dsw-focus-ring-color` 走 `--dsw-alias-state-business-primary`（DSH 默认蓝），所以映射 `state-business-*` 即自动换色；**不要覆盖 `--dsw-focus-ring-color` 本身**（pointer 模态靠它置 transparent 来消隐焦点环），也不要覆盖 `--dsw-focus-ring-width`。

## 5. 应用流程（伪代码，0.3.0 持久化口径；1.0.0 的接线增量见本节末）

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

### 1.0.0 起的接线增量（与上面伪代码的差异）

上面伪代码保留 0.3.0 的持久化主流程（Host 表单 → 覆盖层 → 设置页），仍是现行骨架；0.4.0 / 1.0.0 之后 `src/client-entry.js` 又叠了下列独立段，每段各有自己的 `ctx.effect`，与设置 UI 完全解耦：

1. **主题聚光灯**（§17）：`createThemeSpotlight()` → 卸载时 `dispose()`；注入 `data-plugin-css="dsh-everforest/theme-spotlight"` 样式表；`spotlight.trackOrigin()` 记录最后一次 `pointerdown`；包装 `ctx.theme.setTheme`（仅跨深浅走 `spotlight.run`，卸载按「原方法是否自有属性」还原）。见 `src/client-entry.js` L212–274。
2. **token 层与状态属性**：`applyLayer()` = `overrideTokens`（pair 未变时不重栈）+ `applyStateAttributes()`（写 `data-everforest-color-mode` / `-light` / `-dark` 三个属性）。
3. **常驻样式表（十二张）**：色彩模式（§13）、文本选区（§16.2）、当前会话行（§15）、设置导航选中行（§26）、工作区目录名称（§22.3）、下拉选中项（§25）、表格列宽（§18.3）、聚光灯（§17）、插件更新弹窗（§24）、聊天气泡（§12）、新会话首屏鲸鱼 + 标题（§28）、工作步骤行（§29），各为 `<style data-plugin="dsh-everforest" data-plugin-css="dsh-everforest/<name>">`，cleanup 里 `tag.remove()`；不依赖 slots / locale / configForms（设置页样式表另行挂载）。
4. **表单胶水**（把 §7 落到代码）：`queuedWrite`、`hasUserLayer`、`shouldSeed`、`seedHost(snapshot)`（播种时才带 `snapshot.revision`）、`adoptHostState()`、`writeToHost(ops, failureMessage)`（不带 revision）、`warnRefusedOnce()`、`writesInFlight` + `beginWrite()` / `flushQueuedWrite()`。`select()` 的跨深浅分支把 `applyLayer() + ctx.theme.setTheme(scheme)` 一起包进 `spotlight.run()`，同深浅分支只重栈（瞬切），`notify()` 在切换之后；`reset()` 先回默认状态，`persistReset()` 在 `writesInFlight > 0` 时把 unset 排到在途写入之后。
5. **其它**：`setPreference()`（外观三卡 → `ctx.theme.setTheme(preference)`，写 DSH 全局偏好，不进本插件持久化）；`theme/change → notify()`（幂等，字号/字体变化也会触发）；`storage` 事件比对两个强度后 `applyLayer() + notify()`；启动后 `setTimeout(runSelfCheck, 0)` 用 `SELF_CHECK_TOKENS` 检查 DSH 是否改名/删除 token（缺失只 warn 一次）；dev 构建额外挂 `shell.overlay` 面板（§14）。

## 6. 设置页

- **插槽**：`settings.section`（list），在 `ctx.slots.inject(...)` 回调内注册 `{ name: 'settings.section', id: 'everforest', order: 25, label: thunk, locale: NS, inject: () => ({ t, store }) }`；owner props 提供 `close`（本页不使用）。`label` thunk 每次投影重读，locale 切换不必重注册；`locale` / `inject` 面与 `dshmarket` 的注册方式一致。
- **布局**（2026-10-23 用户截图复核后精简，见 §6.1）：
  - 标题「Everforest」——标题下不再有说明段落。
  - 外观控制：`浅色` / `深色` / `跟随系统` 三张卡片，样式、顺序、图标与尺寸对齐 DSH 自带的 Appearance row（`themeCube`：`flex: 180px`、`.5px` 描边 + `--dsw-radius-xl` 圆角、`--dsw-alias-border-l4` 边框；图标用 DSH 同款 16×16 SVG path，stroke 1.3；选中卡片用 `--dsw-alias-brand-primary` 描边 + `--dsw-alias-bg-module-platform` 底色）。选中态没有额外说明文字。
  - `深色` 分组：3 张卡（Hard / Medium / Soft，默认 Soft），每张含 5 段色带（`bg0`、`bg1`、`bg2`、`fg`、`green`；第 5 段 2026-11-07 起用交互强调绿，见 §21）。
  - `浅色` 分组：同上（默认 Hard）。
  - ~~色彩模式区块（0.4.0）~~ **2026-10-24 已移除**（色彩模式改为默认提供、无开关，见 §13.9）：原区块位于两个强度分组之后、当前选择行之前，含标题 + 一行说明 + `role="switch"` 开关 + 当前 scheme 的 5 个强调色装饰片；现在整块不存在，设置页也不再渲染任何色彩模式文案。
  - 当前生效行：「深色 Soft · 浅色 Hard」+ 当前实际 scheme（`active.colorScheme`；偏好为 `system` 时注明「跟随系统」）；右侧「恢复默认」（**只恢复 Enchanted 默认配对的两个强度，不改外观偏好**，2026-10-21 用户确认保持；2026-10-24 起色彩模式已无开关，重置也不再涉及它）。该行是 `role="group"` + `aria-label` 的有名分组。
  - 页面末尾不再有 `hint.scheme` / `hint.storage` 说明列表。
- **交互**：点击卡片 → 立即应用；写入顺序是「内存 + 首帧缓存 → `configForms.mutate`（一次原子写两个字段：`light` / `dark`，落 profile patch）」，若该卡属于另一个 scheme，再调用 `ctx.theme.setTheme(scheme)` 让用户马上看到效果（**已决策**；1.0.0 起这一步包在聚光灯过渡回调里，见 §17）。写入被拒 / revision 冲突时由 settings 服务回读，Client 以 Host 值为准（设置页不弹错、不静默丢掉用户选择）；「恢复默认」先回默认状态并写缓存，再 `unset` Host 的两个字段（清掉 user 层，回到 base 默认）。外观卡片调用 `ctx.theme.setTheme(preference)`（`system` 恢复跟随 OS，`light` / `dark` 固定）；它与 DSH 自带 Appearance 写的是同一份全局偏好（所有已认证浏览器共享）。
- **i18n**：命名空间 `settings.everforest`，内置 locale id 是 **`zh` / `en`**（`{ zh: zhDict, en: enDict }`；`zh-CN` 只是 `<html lang>` 的映射，不是注册键）；键共 **18 个**：`nav.title`、`appearance.title/label/light/dark/system`、`group.dark/light`、`strength.hard/medium/soft`、`current.label/summary/active/system`、`reset`、`aria.card/group`。2026-10-23 删除 `intro`、`appearance.systemActive/fixed`、`colorMode.experimental`、`hint.scheme`、`hint.storage`（用户要求不再显示这些解释性文案）；2026-10-24 再删 `colorMode.title/desc/on/off/switch`（随色彩模式区块移除，键集 23 → 18，中英同步）。
- **样式**：全部用 `--dsw-alias-*` token；类名前缀 `.everforest-*`。**不能用 `styles.insert`**（那是模型动态 Cordis 包的闭包内建，npm 安装的 client bundle 没有）；在 factory 内创建 `<style>`，打 `data-plugin="dsh-everforest"` / `data-plugin-css` 标记，并在 `ctx.effect` 的 cleanup 里移除（照抄 ui-theme `installThemeStyles` 的写法；module 系统只会在物化期自动认领无标记 style，停用清理仍靠自己）。强度卡外观参照 DSH 设置卡片；外观三张卡片直接对齐 DSH `AppearanceRow` 的 `themeCube` 规则（`docs/design.md` §6.1 记录唯一偏差：选中描边改用主题强调色 `--dsw-alias-brand-primary`，因为 DSH 原生的 `--dsw-static-neutral-bluish-400` 在 Everforest 浅色下与未选中边框几乎同色，会看不出选中）。
- **无障碍**：`aria-pressed`、键盘可达、`:focus-visible` 用 DSH 焦点环；色卡附文本标签，不只靠颜色区分；`aria-label` 只挂在有命名 role 的元素上（当前行 `role="group"`，裸 `<div>` 的 `aria-label` 不进无障碍树）。
- **降级**：`ctx.get('slots'/'locale')` 立即不可用时用 `ctx.inject` 等待再挂载；等待也不可用时跳过页面注册（主题仍生效），并在控制台留一条带前缀的警告。
- **已知限制**：① `settings.section` 仍没有 `icon` 字段，第三方页在设置导航里显示 DSH 默认齿轮图标——2026-10-30 起本插件只给自己那一行改用 DOM 标记 + MutationObserver 画松树图标（同 `dshmarket` / `dsh-notify-me`，见 §19），其它第三方页不受影响；② DSH 不会在 Plugins 页给本插件再生成一份自动表单——Host 半部用 `settings.configure({ auto: false })` 声明设置页由本插件自己渲染，所以强度只能在本页修改（插件详情页没有可编辑的强度卡片）。

### 6.1 2026-10-23 设置页文案精简与外观控件对齐 DSH

用户对 0.4.0 设置页截图复核后提出两点：①红框中的解释性文字全部去掉；②「外观」按 DSH 默认设置页的样式显示。落地：

- **删除的文案**（中英同步删键）：标题下的 `intro` 说明；外观控制下方的 `appearance.systemActive` / `appearance.fixed` 当前状态说明；色彩模式开关下方的 `colorMode.experimental` 实验性提示；页尾 `hint.scheme` / `hint.storage` 两条说明（Host 配置 / 首帧缓存 / 重启口径改由 README 与设计文档承载）。页面只保留：标题、外观三卡、两个强度分组、色彩模式标题 + 一行功能说明 + 开关、当前生效行 + 恢复默认。
- **外观控件改 DSH 同款**：直接对齐 DSH `ui-theme` 包 `AppearanceRow.module.css` 的 `themeCube` 规则与 `AppearanceRow.js` 的顺序/图标——顺序 `浅色 / 深色 / 跟随系统`，16×16 内联 SVG（Light / Dark / Follows-system 的 path 原样复制，`stroke-width` 1.3、`currentColor`），卡片 `flex: 180px; padding: 20px 32px; gap: 4px; border: .5px solid --dsw-alias-border-l4; border-radius: --dsw-radius-xl; 14px/22px`，hover 用 `--dsw-alias-interactive-bg-hover`，选中底色 `--dsw-alias-bg-module-platform`。
- **唯一偏差**：选中描边用 `--dsw-alias-brand-primary`（Everforest 交互强调绿），不用 DSH 的 `--dsw-static-neutral-bluish-400`。理由：该 token 在本主题的映射是 `#b8c0ae`（light）/ `#83887c`（dark），light 下与未选中边框 `--dsw-alias-border-l4`（`#bec5b2`）几乎同色，选中态不可辨；用主题强调色同时与插件自己的强度卡 / 色彩模式开关选中态保持一致。
- **验证**：`tests/settings-page.test.mjs` 覆盖新顺序、图标 path 数、`aria-pressed`、被删文案不再渲染；`.tmp/settings-preview/` 用真实 `SETTINGS_STYLES` + `tokensFor()` 渲染 dark-soft / light-hard 两档截图目检（选中态在浅色档可见）。
- **未改**：README（用户要求保持原文案）、色彩模式的行为与持久化路径、Host `Config` 字段。

> 注：本节记录的「色彩模式标题 + 说明 + 开关」区块已在 2026-10-24 随「默认提供、无开关」一起移除（见 §13.9）；本节其余内容（文案精简、外观控件样式、选中描边偏差）仍是现状。

### 6.2 2026-10-24 边框宽度统一

用户截图反馈「everforest 里面的 border 宽度没有统一」。窗口截图逐像素实测：选中强度卡的描边是 **2px** —— 1px `border` 之外又叠了一层 `box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary)`；未选中卡片、外观三卡、色卡条、开关、恢复按钮都是 1px（`.5px` 在 DPR 1 上像素对齐成 1px 实色，与 1px 同宽）。**当时的色彩模式开关行同日随后随设置页区块移除（§13.9）**，其余控件的边框规则不变。

- 修正：`.everforest-page` 定义唯一宽度变量 `--everforest-border-width: .5px`，页面内 6 处 solid `border`（外观卡 / 强度卡 / 色带条 / 恢复按钮 + 当前行上下两条）全部引用它，另 1 处 `border: 0` 属 sr-only（与 DSH 自带的 `.5px solid` 设置卡片 / 输入框 / 描边按钮一致）；选中态只改 `border-color`，删除 inset box-shadow。
- 回归：`tests/settings-page.test.mjs` 新增断言——所有 solid 边框必须引用该变量、页面只声明一次宽度、禁止 `box-shadow`。
- 未改：颜色层级（外观卡 `border-l4`、强度卡 `settings-card-stroke` / `l2`、hover `l3`、选中 `brand-primary`）、圆角与焦点环。

## 7. 持久化（0.3.0 起：Host 侧持久化；2026-10-24 起只有两个强度）

强度选择的真源是**当前 profile 的 Host 配置**；`localStorage` 降级为「首帧缓存 + 旧宿主兜底」。Appearance（light / dark / system）仍归 DSH 自己的全局偏好，不在本节范围。色彩模式自 2026-10-24 起是默认功能、没有开关，不参与任何持久化（见 §13.9）。

| 项 | 方案 |
|---|---|
| 真源 | 当前 active profile 的 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中本插件行的 `config`（`light` / `dark`）；由 DSH settings 服务写入并在同一 profile 的所有已认证浏览器间广播。0.3.x 的 patch 只有这两个字段；0.4.0 / 0.4.x 写入过的 `colorMode` 键会被当前版本的 schema 忽略（未知键不报错、值不生效），插件既不会读它也不会主动 unset，**无需手改 patch**。 |
| 声明 | Host 半部 `src/host-config.js` 导出 `Config = Schema.object({ light, dark })`：两个强度是 `union(STRENGTHS).default(...).volatile()`（两个叶子字段各自挂 `.volatile()`，不可嵌在已 volatile 的对象里）；settings 服务只把挂 `.volatile()` 的活跃 profile 条目投影成表单。入口 id 常量在两处各持一份——Host 的 `src/host-config.js` 与 Client 的 `src/durable.js`（bundle 不能 import Host 模块）——都必须等于 patch 行的 `id`（configForms 按 entry id 寻址；改名会静默退化为 localStorage-only，测试把三者钉住）。 |
| Client 读 | `ctx.inject(['configForms'], …)` 软等待服务（服务缺失 = 旧宿主，永不挂起插件），再 `formsCtx.configForms.get('everforest')` → `{ status, value, base, user, revision, writable }` + `subscribe(listener)`；就绪（`status: 'ready'`）后以 Host 值为权威：与内存不同则 adopt（重建覆盖层 / 刷新设置页 / 把 Host 值写回 localStorage 缓存）。`unavailable`（旧宿主 / 条目未被 serve）时保持 localStorage 行为；快照变化（其他浏览器写入的广播）走同一 adopt 路径。 |
| Client 写 | 选择色卡：一次 `mutate([{ op: 'set', path: ['light'], value }, { op: 'set', path: ['dark'], value }])` 原子写两个字段（用户写不带 `expectedRevision`，以 settings 服务的最新 revision 为准）；恢复默认：一次 `mutate` 里 `unset` 两个字段，若上一次写还在途（镜像快照尚未 fold、`user` 仍为 `{}`），用 `writesInFlight` 判断后把 `unset` 排在表单控制器的串行写队列之后，避免被后到的 `set` 覆盖。表单就绪前的选择排队（`queuedWrite`）后补写；`mutate` 被拒（`response.ok` 为 false / revision 冲突）时服务回读，Client adopt 远端值并 warn 一次（不把未被接受的值留在本地）。`writable: false` 的守卫只是防御——0.2.1-rc.2 / rc.3 / rc.5 的 native settings provider 恒为 `true`，实际不可达。 |
| 首帧 | B 方案（§5「首帧注入」）：boot 脚本读 `localStorage['dsh-everforest/v1']` 缓存，缺失 / 版本不符 / 字段非法时逐字段回退 emit 时嵌入的 Host 值，再回退默认；解析结果发布到 `window.__EVERFOREST_BOOT__`，Client 首帧直接沿用。Web 每次 index 渲染重算，Desktop 在 Host ready 时采集一次。**boot payload 只有两个强度**：首帧没有聊天 / 会话 DOM，色彩模式 CSS 在 Client 挂载后才生效；payload 与 0.3.0 逐字节一致（见 §13）。已知取舍：本浏览器缓存过期（另一浏览器改过而它没收到广播）时首次打开先画缓存旧值、随后一次 adopt Host 值，之后收敛。 |
| 缓存 | `localStorage` 保留为「首帧缓存 + 旧宿主兜底」，key 不变（`dsh-everforest/v1`），payload 为 `{ version: 1, light, dark }`（**`STATE_VERSION` 保持 1**：0.3.x 缓存同形、直接沿用；0.4.x 带 `colorMode` 的旧缓存仍合法，多出的字段读取时忽略、下次写入自然丢弃，**不触发修复重写**）。每次选择 / adopt 后同步写（adopt 即使值相同也写，保证新浏览器下一次 reload 有首帧缓存）。同一 origin 的 `storage` 事件同步保留（Host 广播覆盖不到时的兜底），比较只含两个强度。 |
| 迁移 | 0.2.1 → 0.3.0 / 0.3.0 → 0.4.x：启动时若（a）Host 文档**无用户层**（`user` 非空才算有；空对象 `{}` 也是无）且（b）`readStoredState()` 读到的是**真实选择**（存在，且非默认状态——即两个强度不全是默认配对）→ 把缓存值一次性播种到 Host（一次 `mutate` set 两个字段，带观察到的 `revision` 作栅栏）。播种后本地保留该值；Host 已有用户层时以 Host 为准，不覆盖。旧 patch 里只残留 `colorMode` 的 user 层同样算「有用户层」（不播种），此时两个强度取 schema 默认值，与宿主解析结果一致。 |
| 迁移 / 重置取舍 | **已知取舍**：浏览器 A「恢复默认」清掉 Host override 后，若另一个从未升级/打开的浏览器 B 仍持有旧的缓存，B 下次加载会把这个旧值当作待迁移值**重新播种回 Host 一次**；之后 B 的缓存与 Host 收敛，不会反复。0.3.0 接受该取舍（一次性迁移只以「Host 无用户层」为条件，无法区分「从未选择」与「刚被重置」）。 |
| 旧宿主降级 | 没有 settings 服务 / schemastery 无 `volatile()`（< 3.18.3）/ `configForms` 软注入永不送达 / 表单 `status: 'unavailable'` → 无表单，Client 继续用 localStorage（只含两个强度），主题、色彩模式与设置页不受影响，也不会因为等待服务而挂起插件。**只换 npm 包不重启 DSH** 即属于这一类：选择仍生效、只是暂不写 Host；重启后首启会播种。 |
| 写入被拒 | home patch / `--patch` 覆盖等场景以 `mutate` 的 `response.ok === false` 表现：settings 服务回读后返回 `false` → Client adopt 远端值并 warn 一次，设置页不弹错（未被接受的值不会留在本地）。代码里的 `writable: false` 守卫只是防御；native settings provider 恒为 `true`，不要把 writable 当成可达主路径。 |
| 范围 | 按 profile 隔离：同一 profile 的所有浏览器 / 窗口共享；不同 profile 各存各的。 |
| 非法值 | 手改 patch 的 `config.light` / `dark` 为枚举外值：**冷启动 / 重挂**时 `Config` 校验失败 → entry 不激活（无主题），改回合法值或删除 `config` 后重启恢复；**运行中**的 volatile-only 变更由 Loader 的 `_commitVolatile` 捕获解析错误 → Host 记 warning、保留旧引用、entry 保持 **ACTIVE**（主题不丢），改回合法值即可热恢复，不必重启。残留的 `colorMode` 键不是 schema 字段、不参与校验（`true` / `false` 都不会导致校验失败）。 |
| 升级 / 回滚 | Host 半部（Config 注册、boot 脚本）在 Host 启动时装载，改动需**重启 DSH**（刷新页面不会重载 `index.js`）；0.3.0 之后运行中改强度走 settings 通道，不需要重启。只换包不重启 DSH → 新 Client 退回 localStorage-only（旧宿主降级），重启后首启补播种。0.4.0 → 0.3.0 回滚（**历史口径，针对 0.4.0 发布版**）：0.3.0 的 `Config` 不认识 `colorMode` 字段，若 profile patch 里已写入该字段，回滚前应先删除再重启；0.2.1 没有 `Config` 导出，不受影响。**2026-10-24 起的版本**不再声明 `colorMode`：旧 patch 里残留的键被当前 schema 忽略、无需手动清理，插件也不会写它或删它。 |

> 为什么这样取舍：`localStorage` 是同步的、per-origin 的（Web 端口每次随机、换浏览器就丢）；DSH 的 settings 文档本来就是跨浏览器共享的 profile 级真源，但它异步、可被 home patch 覆盖、且换 Host 半部要重启。组合成「Host 真源 + 本地首帧缓存 + 失败降级」后，正常路径得到跨浏览器一致与重启保持，首帧又不等待网络；代价是首帧与 Host 可能短暂不一致（缓存过期的那一次，见 §5「残余」）。

## 8. 清单与构建

```jsonc
// package.json（1.5.0 发布后更新；本快照随版本维护，发版时核对）
{
  "name": "dsh-everforest",
  "version": "1.5.0",
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
  "keywords": ["deepseek", "harness", "dsh", "dsh-plugin", "plugin", "theme", "everforest", "dark-theme", "light-theme"],
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
  "scripts": {
    "generate": "node scripts/palette.mjs",
    "build": "node scripts/build.mjs",
    "build:dev": "node scripts/build.mjs --dev",
    "test": "node --test",
    "check": "node scripts/palette.mjs --check && node scripts/build.mjs --check && node scripts/check-contrast.mjs --check",
    "prepack": "node scripts/build.mjs -C"
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
- **Host 半部不打包**：`index.js` 直接从包目录 import `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js` / `src/host-config.js`（普通 ESM；唯一的 bare import 由 DSH 运行时解析），所以这五个文件必须进 `files`；`scripts/build.mjs` 只产出 `client.js`。`tests/integration.test.mjs` 会遍历 Host 半部的相对 import，核对 `files` 覆盖它们。Client 侧模块（`src/durable.js`、`src/color-mode.js`、`src/locale.js`、`src/settings-page.js`、`src/client-entry.js`，以及 1.0.0 起的 `src/selection.js`、`src/active-session.js`、`src/theme-spotlight.js`、1.2.0 的 `src/table-resize.js` / `src/table-scrollbar.js`、1.3.0 的 `src/colwidth-store.js` 与 2026-11-08 的 `src/chat-bubble.js` / `src/workspace-labels.js` / `src/ui-accents.js` / `src/plugin-update.js`）被 `client.js` 打包，不需要进 `files`；`src/dev-panel.js` 只在 `--dev` 构建里打包。
- **entry id 是双半部契约**：`cordis.patch.yml` 的 `id: everforest` 必须等于 Host（`src/host-config.js`）与 Client（`src/durable.js`）各自持有的 `ENTRY_ID`——settings 服务按 entry id 投影表单，Client 也按它 `get`；测试把三者钉在一起。Host 半部还调用 `settings.configure({ auto: false })`（可选接线）声明设置页由 Client 渲染，避免 DSH 再生成一份重复表单。
- `dsh.client.immediately`：本版本只用于 **prefetch** bundle（前端 `manifest.plugins.filter(p => p.immediately)` 预取），不改变 apply 时机，减不了首帧；`platform: 'web'` 是必需字段，package 必须导出 `./client`。
- `scripts/build.mjs`：零依赖 Node，把 `src/*.js` 合成 `client.js` 并包成
  `window.__ModuleLoader__.load({ id: 'dsh-everforest', factory(require) { … } })`（id 必须等于包名）；产物提交入库，安装/运行不执行构建脚本（`prepack` 只在发布前**校验**产物是否最新，即 `build.mjs -C`，不会重新生成；改动 `src/` 后必须本地 `npm run build` 并提交 `client.js`）。另有只供本地调试的 `--dev`（`npm run build:dev`）：额外打包 `src/dev-panel.js`、保留 `// @dev-only:` 标记段内容，并在产物首行标注 `DEVELOPMENT BUILD`；`--check` / CI / `prepack` 仍只认生产组合，遇到开发产物会报错要求先 `npm run build`（见 §14）。
- **客户端入口文件名是 `src/client-entry.js`，不要改回 `src/index.js`**：npm 11 的 packlist 在根 `main` 为 `index.js` 且 `files` 含嵌套文件时，会把嵌套的 `src/index.js` 误打进 tarball（2026-10-19 实测；改名后 `npm pack` 只含白名单）。
- `tests/host-boot.test.mjs` 用 `node:vm` 执行 boot 脚本文本，断言它与 Client token 层同值、scheme 解析与回退分支、B 方案（缓存优先 / Host 兜底 / 非法值回退）与 `window.__EVERFOREST_BOOT__` 发布正确；`tests/durable.test.mjs` 覆盖 Client 持久化胶水的纯函数（用户层判定、播种条件、set / unset 操作、归一化、boot hint），`tests/integration.test.mjs` 用假 configForms 覆盖生命周期。不依赖真机即可守住首帧与迁移不漂移。
- 调色板提取脚本（开发期可重复）：按 [`reference/palette.md`](reference/palette.md) 的表格生成 `src/palette.js`（6 套背景色阶 + 两套前景/强调/header 色；light `bg_visual` 使用注记的生效值 `#DED8DB`）。
- **仓库根另有非 npm 产物**：`screenshots.json`（市场预览清单，1.0.0 起为 2 张真机截图 `.github/assets/everforest-dark-soft.png` / `everforest-light-hard.png`，路径相对该文件、不能跳出插件目录，见 [`releasing.md`](releasing.md) §8.6）与 `icon.svg`（自包含 SVG；2026-11-08 起为透明底的绿色鲸鱼，填充 `#93B259`，仅单个鲸鱼图形、无山脊 / 松树，约 2.0 KB）。`screenshots.json` 与 `.github/assets/` 不进 `files`；`icon.svg` 在 `files` 与 `exports["./icon"]` 里。

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
| 深浅色 | 用 DSH 自带 Appearance、设置页外观控制或插件色卡切到 light/dark/system，主题自动使用对应调色板；**跨深浅切换走聚光灯**：新主题从最后一次 `pointerdown` 位置以 `circle()` 扩张揭示 400ms（无指针记录时从视口中心），旧主题快照留底层，浅→深结束不闪白；同深浅内的强度切换与跨窗口广播为瞬切；`system` 跟随下 OS 翻深/翻浅同样走揭示（无点击位置，从视口中心扩张）；`prefers-reduced-motion: reduce` / 无 View Transitions 一律瞬切（§17）；`system` 下改 OS 深浅色应实时跟随（聊天区、设置页「当前」行、Windows 标题栏都要变）；点另一 scheme 色卡后 Appearance 偏好被改写（设计如此），可用设置页「跟随系统」恢复；点同侧色卡不得改偏好 |
| 代码高亮 | 三处代码块（聊天气泡 fenced code / 工具输出 / 右侧文件预览）的 token 色与块底正确；diff 的 add/del 底色与 marker 来自 `--dsw-alias-file-diff-*` / `code-diff-*`（diff 没有语法高亮，**不要**按 shiki 验收） |
| 聊天气泡 | 两个 scheme 都绘制成交互强调绿底 + 画布墨（与选中会话行 / 选中导航项 / 发送键同色对）：浅色 `#93B259` + `#FFFBEF` / `#FDF6E3` / `#F3EAD3`（2.32 / 2.22 / 2.00:1，强调层奶油墨上限）、深色 `#A7C080` + `#272E33` / `#2D353B` / `#333C43`（6.88 / 6.23 / 5.62:1，AA）；token 保留苔纸 / `bg1` 作为样式表失效时的可读回落（`src/chat-bubble.js` 常驻样式表；2026-10-19 / 2026-10-21 / 2026-11-08 / 2026-11-10，见 §12） |
| 聊天表格（1.2.0，§18） | 6 档下中性 `border-l3` 外框 + `border-l2` 列线可见（浅色档贴对比度门槛，属已接受）；首 / 末列 16px 内边距、末行无叠加下边框；表头色带 / 斑马纹 / 行 hover 不变。表头右缘 6px 命中：fill 表（<4 列）拖动相邻两列重分配、总宽不变、无幽灵滚动条；宽表（≥4 列）拖哪列只改哪列、表格总宽跟随列宽之和、**最后一列右边框也是拖动柄**、放不下时底部常驻 5px 横向滚动条（10px 条位、hover 时带 160ms 过渡长成 10px 便于按住，2026-10-29）且右缘不越过正文列；双击边缘复位、拖动中 Esc 取消、单列最小 64px；锁定宽表窗口变窄保持列宽只滚动。§18.4 的 106 项全场景矩阵与真机 fill / wide 复测为自动化证据 |
| 停用 | 关闭插件 → 回到 DSH 原生配色，`body` 内联 `--dsw-*` 消失（验证 disposer 挂在 effect 上的清理）；重启 Host 后 boot row 消失；patch 里的 `config` 保留，重新启用后继续生效 |
| 首帧 | Web：首屏 / loading 页即为 Everforest（DevTools 首帧截图，无 `#fff` / `#151517` 帧，spinner 环与进度弧同色系）；强度分别验证「有缓存」「无缓存但 Host 有值」「两者都缺」三条路径与 `window.__EVERFOREST_BOOT__` 的值；Desktop：完全退出应用后冷启动录屏，原生色 ≤ 1 帧（2026-10-19 接受）；loading 动效的 spinner / 边框随 boot token 一起着色（2026-10-21） |
| 视觉走查 | 聊天区 / 代码块 / diff / 菜单 / 设置 / 侧栏 / composer / hover / 选中态 / 状态色；侧栏与内容卡边界（`sidebar-fill` ≠ `bg-base`，Windows 标题栏条同色）；深色边框可见度（设置卡片 / 行 / 输入框的 `.5px` 描边对自己的填充 ≥ 1.45:1、对页面底 ≥ 1.8:1，2026-10-24）；1.0.0 新增层：选中会话行 vs hover vs 待确认黄底 / 已完成蓝底三色可辨（§15 / §22）、文本选区六档底色（§16.2）、跨深浅聚光灯无闪色（§17）；记录已知缺口 |
| 色彩模式（0.4.0 引入；2026-10-24 起默认提供、无设置开关） | 设置页**没有**色彩模式区块（无标题 / 说明 / 开关 / 色片）；默认即生效：聊天 h1–h6 六色标题、strong + em 紫、行内 code 蓝、内部文件链接 aqua、删除线 / 已完成任务淡化、引用块淡底、列表 marker / 引用条 / 分隔线、表头色带 / 斑马纹 / 行 hover、checkbox，以及会话列表「待确认 / 已完成未查看」行底色与状态点变色（行底取 palette1 自带的状态背景色，见 §13.8 / §13.8.1；hover 再深一档）；`<html>` 上恒有 `data-everforest-color-mode="on"`（作用域锚点，不再表示开关状态）与两个强度属性，切换强度 / 深浅色时按 6 个变体块 × 25 个变量自动切换；色彩模式本身不改 token 层（与同版本 token 层一致；0.4.0 当时与 0.3.0 逐字节一致，后续强调色评审已更新 token 值）；选中行不覆盖选中态、hover 有加深；浅色档特别是 light·soft 的表格色带 / 会话行底会被压成极淡甚至不可辨（见 §13.3），属已接受的「淡彩」取舍；DSH 升级后若选择器失效，模式静默退回单色且控制台无报错 |
| 聚光灯（1.0.0，§17；2026-10-25 追加跟随系统 OS 翻转） | 跨深浅切换：新主题从点击点圆形扩张 400ms，无灰峰（颜色插值中途仅 1.01:1）、浅→深结束无闪白；DSH Appearance 行 / 插件色卡 / 设置页外观控件三个入口都走揭示；`system` 偏好下 OS 翻转也走揭示（从视口中心扩张、不建立第二段过渡）；跨窗口广播、同深浅强度切换、reduced-motion、无 View Transitions 均瞬切；插件卸载后 `ctx.theme.setTheme` 与 `publish` 都恢复原方法；常驻样式表共 9 张（含 `dsh-everforest/theme-spotlight`），`<html>` 上无 `data-everforest-transition` |
| 当前会话行（1.0.0，§15 / §22 / §23） | 选中会话行（`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`）恒为交互强调色 `statusline1` 实色底 + 方案画布 `bg0` 文字（2026-11-08 第三轮起：dark `#A7C080` / light `#93B259`；原为 `bg_blue` 蓝底 → 2026-11-07 绿色强调底 → 同日第二轮 `fg.green`），行内 tertiary 灰（状态槽 / 时间 / pin / 操作按钮 / spinner）**显式**写成墨色（时间嵌在 `rowResting` 内且父级自带 `label-tertiary`，`inherit` 会被截断），状态点保留语义色；与「待确认」黄底 /「已完成」蓝底并排可一眼区分；6 档实测见 §15 表格（深色 5.62–6.88:1；浅色 2.00–2.32:1，见 §2g）；hover 其他行不再与选中态混淆；卸载后样式表移除；**无行首竖条**（2026-11-08 移除） |
| 工作区目录名称（§22.3 / §25） | 侧栏工作区（项目）行的标题（`[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"]`）为**文字绿 `green` 600 字重**（dark `#A7C080` / light `#8DA101`，原值不做守卫；上游把 `green` 当前景文字色、`statusline1` 当背景色，两者在浅色档差一档）；2026-11-08 用户两次要求绿色，A7 曾短暂撤回 `label-primary`，同日复核后恢复；**2026-11-13 用户要求名称加粗，并让「有当前打开会话」的工作区文件夹图标（`[class*="folderActive"]`）也变成同一文字绿**——浅色档图标由 DSH 的 business 强调绿 `#93B259` 改为 `#8DA101`，深色档两者同值无变化；静止行深色 5.00–6.17:1（AA）、A7 的 50% `bg4` hover 叠加底 4.01–4.98:1，浅色 2.35–2.68 / 2.13–2.47:1（见 `contrast.md` §2h）；卸载后样式表移除 |
| 下拉选中项（§25 / §27） | 下拉列表选中项（`menuitem` / `menuitemradio`）以 `statusline1`（浅色 `#93B259`）实底 + 画布 `bg0` 文字与勾勾，选中项内的前导图标与次要文字（`--dsw-alias-menu-icon`、`label-*` 族：模式选项的标题 / 说明、工作区路径后缀、快捷键）同样取该墨色（2026-11-08 追加）：深色档墨色 5.62–6.88:1（AA），浅色档 2.00–2.32:1（`contrast.md` §2i）；会话标题曾取文字绿 `green`（2026-11-08 – 11-09），现回到 DSH 原生 `label-primary`（§27）；卸载后样式表移除 |
| 新会话首屏鲸鱼 + 标题（§28） | 欢迎页 `HeroShell` 的鲸鱼标志与「探索未至之境」标题取**文字绿 `green`**（dark `#A7C080` / light `#8DA101`，与目录名称同角色，6 档 5.62–6.88 / 2.42–2.81:1）；`[class*="headline"]:has([class*="fishHitbox"])` 结构锚点只命中首屏 headline、不误伤上下文弹层的 `A6Bq1a_headline`，鲸鱼单独重墨（`.fish` 自带 `color`）；「预览版」角标保持 `statusline1`；卸载后样式表移除 |
| 文本选区（1.0.0，§16.2） | 六档 `::selection` 底色 = 各变体 `bg_visual`（light 统一 `#DED8DB`；dark `#4C3743` / `#543A48` / `#5C3F4F`），`color: inherit` 保留元素自身颜色（h2 / strong / 行内 code 选中后仍是原色）；与色彩模式解耦、常驻；不改变 `user-select` 与复制行为 |
| dev 调试面板（1.0.0，§14） | `npm run build:dev` 后主界面出现浮动面板，可切换外观与两套强度、拖动、折叠成 38×38 圆钮且折叠 / 展开态都保留样式与内联兜底；`npm run build` 后消失；`--check` / CI / `prepack` 拒绝停留在开发产物；生产 `client.js` 无面板代码 |
| 图标与 README 截图（1.0.0） | `icon.svg` 为自包含 SVG（无脚本 / 无外链，约 3.1 KB）：绿色鲸鱼 + 远景山脊 `#4D5960` / 森林山脊 `#A7C080` / 两棵松 `#293136`，36px 下均可辨；`README.md` / `README.en.md` 各只有 2 张真机截图（dark-soft / light-hard，1263×981 未裁剪），仓库根 `screenshots.json` 2 项与 README 引用逐项一致，README / 图标断言通过 |
| 发布 | `npm pack --dry-run` 文件清单齐全（`files` 与 `exports` 对齐）；`engines.dsh` 校验生效；包名 `dsh-everforest` 仍可用 |

**改动生效方式（开发循环）**：`client.js` 内容改动 → Plugins 页停用/启用该插件（Host 重新快照 bundle，浏览器经 HMR 换模块）或重启 Host；`package.json` / `cordis.patch.yml` 改动 → HMR 即时重组合；单纯刷新页面不会换 bundle 字节。

无浏览器控制能力时：自动项按上表验证，视觉项请用户目检并回传截图。

## 10. 里程碑与验收

| 版本 | 交付 | 验收 |
|---|---|---|
| 0.1.0 | 6 套调色板、覆盖层、设置页、持久化、本机可安装 | 安装 / 覆盖 / 设置页 / 持久化 / 深浅色 / 停用 / 首帧记录逐项通过（当时按本节表格顺序，序号与现行表不同） |
| 0.2.0 | 对比度与全页走查、shiki / diff 口径与目检、i18n、图标、README 截图、**首帧 Host boot 注入**、系统跟随收尾、npm 发布 | 走查无阻断问题；Web 首帧即 Everforest，Desktop 冷启动原生色 ≤ 1 帧；npm 包可安装并生效；中英文案与图标经检查 |
| 0.3.0 | **Host 侧持久化（`configForms`）**、首帧 B 方案（缓存优先 / Host 兜底）、0.2.1 旧值一次性播种、localStorage 降级为缓存 + 旧宿主兜底、文案 / CI / 发布元数据同步 | 跨浏览器共享与重启保持落 profile patch；旧值迁移；写入被拒 / 旧宿主降级；其余人工目检见 §9 |
| 0.4.0 | **实验性色彩模式（中彩）**：初版为聊天 h1–h3 / marker / 引用条 / 分隔线 / checkbox / 表格表头色带与斑马纹、会话「待确认 / 已完成未查看」行底与状态点；验收后按 Enchanted 扩展为 h1–h6 六色标题与完整富文本角色（strong / em、行内 code、内部链接、删除线、引用块淡底、行 hover）；Host `Config` 增第三个 volatile 字段 `colorMode`（2026-10-24 已移除，见 §13.9）；token 层零差异；门禁 G9–G16（24 个角色） | 色彩模式用例 12 → 17 项（次日扩到 19 项，见 §13.5）；`node scripts/check-contrast.mjs --check` 全绿；全量 `node --test`（170 项，现 329）与 `npm run check` 由最终门禁复核；样张一致性；关闭零差异；真机目检已于 2026-10-23 由用户完成（见下方证据条） |
| 1.0.0 | **首个稳定版**：把 0.4.0 之后未发布的改动全部转正——色彩模式默认提供、无开关（§13.9）；工作区当前会话行（§15）；原生文本选区（§16.2）；深浅切换聚光灯（§17）；dev-only 调试面板及其折叠态样式回归修复（§14）；「待确认」行改黄（§13.8.1）；UI 强调色改用官方 palette accent（§16.1）；设置页边框宽度统一（§6.2）与深色边框 / 行内 code 芯片修正（§4）；插件图标改为「鲸鱼 + 山脊松树」（`icon.svg` 约 3.1 KB）；README / 市场预览换成 2 张真机截图；`engines.dsh`（`>=0.2.1-rc.2 <0.3.0-0`）与 token 层不变 | `node --test` **220/220** + `npm run check` 全绿（palette / build / contrast）；聚光灯用例 9 项、集成样式表 4/5 张断言；发布 tag `v1.0.0` → run `40116912287`（SLSA provenance）；真机目检见下方 1.0.0 证据条 |
| 1.1.0 | **跟随系统的 OS 翻转也走聚光灯**：外观为「跟随系统」时，系统翻深 / 翻浅从视口中心圆形扩张揭示，其余入口与软 / 中 / 硬切换行为不变；README 重写「特性」文案并新增「功能实现」清单（中英同步）；Host 半部与 `Config` schema 未变 | `node --test` **224/224** + `npm run check` 全绿；发布 tag `v1.1.0` → run `40494550768`（SLSA provenance，transparency log `3514424283`）；用户目检通过（见 §17.1） |
| 1.2.0 | **聊天表格边框与列宽拖动**（§18）：中性色阶外框 + 列分隔线；表头右缘 6px 拖动调列宽，fill 表相邻两列重分配、宽表（≥4 列）逐列独立改宽且表格总宽跟随列宽之和、最后一列右边框也可拖；宽表重新装箱为 Element 表格式固定视口（容器收在正文列内、列宽保持自然长度、放不下底部常驻横向滚动条）；双击复位、Esc 取消、64px 下限；2026-10-28 代码梳理（删 `dblclick` 死路径、合并锁定状态、统一拖动提交）；README 表格特性压成一句话 | `node --test` **239/239** + `npm run check` 全绿；`scenarios.mjs` 全场景矩阵 **106/106**（真实 CDP 鼠标输入，深 / 浅两套主题，含 fill / wide / 异常表 / 生命周期）；真机 fill + wide 复测见 §18.4；发布 tag `v1.2.0` → publish run `40713360126`（SLSA provenance），verify run `40713342591` 在 Linux / Windows × Node 20/22/24 全绿 |
| 1.3.0 | **设置导航松树图标与第三方插件配色**：设置导航里的本插件行改用 DOM 标记 + MutationObserver 画松树图标（DSH 仍无 `icon` 字段，失效回退默认齿轮，§19）；新增 41 个猜测式 `--dsw-alias-*` 别名桥，让第三方插件页面跟随主题配色（不进官方 token 契约，启动探测让位宿主，§20）；任务列表复选框重绘（浅色绿 / 深色蓝、去掉多余圆点，§13.1）；表格列宽提示线改用 `header_aqua` 并加长到整列高（§18.2）。Host 半部与 `Config` schema 未变 | `node --test` **262/262** + `npm run check` 全绿（palette / build / contrast；`contrast.md` 已重新生成，25 个角色色值）；发布 tag `v1.3.0` → publish run `41075123199`（SLSA provenance），verify run `41075168286` 在 Linux / Windows × Node 20/22/24 全绿 |
| 1.4.0 | **DSH 0.2.2-rc.1 适配与表格列宽记忆**：token 契约 206 → 217，补 illustration 六项与 `state-done-primary` 的映射、移除上游不再声明的 `--dsw-specific-sidebar-nav-item-hover`（§4 / §12）；设置导航图标改走官方 `settings.section.icon` 槽位，删除 DOM 标记 + MutationObserver 与导航图标样式表（§19，样式表回到 6 张）；聊天表格拖动后的列宽写入浏览器本地缓存，刷新 / 切换会话后恢复、双击边缘仍复位（§18.6）；表格最小列宽从 100px 降到 64px，与拖动下限对齐（§18.1）。Host 半部与 `Config` schema 未变 | `node --test` **295/295** + `npm run check` 全绿（palette / build / contrast；`contrast.md` 已重新生成）；发布 tag `v1.4.0` → publish run `42253364321`（SLSA provenance），verify run `42253398080` 在 Linux / Windows × Node 20/22/24 全绿 |
| 1.5.0 | **绿色交互层与上游 `statusline1` 对齐**：交互强调色统一取上游 `statusline1`（浅色 `#93B259` / 深色 `#A7C080`），会话标题与目录名称改用文字绿 `green`（浅色 `#8DA101`）；选中会话行改为实色强调底 + 画布墨色，并补齐行内灰字 / 加载 spinner / 按钮 hover（§15 / §22 / §23）；下拉选中项与插件更新弹窗改为绿色强调（§24 / §25）；聊天气泡改为苔纸底 + 派生墨（§12）；A7 / A9 上游语义对齐（`bg4` hover 叠层、`grey0` 弱化文字族）；图标改为透明底鲸鱼。Host 半部与 `Config` schema 未变 | `node --test` **321/321** + `npm run check` 全绿（palette / build / contrast / release-notes）；发布 tag `v1.5.0` → publish run `42494099760`（SLSA provenance），verify run `42494087912` 在 Linux / Windows × Node 20/22/24 全绿 |

> **1.2.0 验收证据（2026-10-28，已发布）**：`node --test` **239/239**（1.1.0 的 224 项 + 本批 15 项，新增 `table-resize` 14 项与 `tests/support/css.mjs` 公共解析器）；`npm run check` 全绿（palette / build / contrast）；`client.js` 重建为 v1.2.0（md5 `b8d9adac…`）并同步 desktop profile；§18.4 的 `scenarios.mjs` 全场景矩阵 **106/106**（真实 CDP 鼠标输入，深 / 浅两套主题，覆盖 fill / wide / 异常表 / 生命周期）+ 真机 fill / wide 复测（fill `203.64 / 541.8 → 243.64 / 501.8`、表格 `745.44px` 不变；wide 最后一列 `353 → 232.5`、表格 `1192.47 → 1072px`，逐列拖窄到 `511px` 无滚动条，双击复位）；发布 tag `v1.2.0` → publish run `40713360126` → npm `latest` = 1.2.0（`dist.shasum` `480aadf8…`，SLSA provenance），GitHub Release `v1.2.0` 自动创建；verify run `40713342591`（Linux / Windows × Node 20/22/24）全绿。

> **1.3.0 验收证据（2026-10-30，已发布）**：`node --test` **262/262**（1.2.0 的 239 项 + 未发布批次的 13 项 + 本批 10 项：`nav-icon` 6、`tokens` / `color-mode` / `integration` / `table-resize` 各 1）；`npm run check` 全绿（palette / build / contrast，`contrast.md` 重新生成，25 个角色色值）；`client.js` 重建为 v1.3.0（249,605 字节，md5 `d96e3661…`）并随发布提交入库；发布 tag `v1.3.0` → publish run `41075123199` → npm `latest` = 1.3.0（`dist.shasum` `8e6bf013…`，SLSA provenance，transparency log `3595682972`），GitHub Release `v1.3.0` 自动创建（正文取自 CHANGELOG 1.3.0 小节，295 字符 / 667 字节，远低于市场 4096 字符截断线）；verify run `41075168286`（Linux / Windows × Node 20/22/24）全绿。

> **1.4.0 验收证据（2026-11-07，已发布）**：`node --test` **295/295**（1.3.0 的 262 项 + 列宽记忆批次 34 项 = 296，导航图标用例随重写由 6 项减为 4 项、`tokens` 新增 1 项后为 295；`nav-icon` 4、`tokens` 23、`integration` 44）；`npm run check` 全绿（palette / build / contrast，`contrast.md` 重新生成）；`docs/reference/token-inventory.*` 重新生成（217 个颜色 token，提取摘要 `12f3c67b…`）；`client.js` 重建为 v1.4.0（276,941 字节，md5 `806fb167…`）并随发布提交入库；`npm pack --dry-run` 清单 16 个文件（118.4 kB）；发布 tag `v1.4.0`（commit `b7b9e76`）→ publish run `42253364321` → npm `latest` = 1.4.0（`dist.shasum` `ec49ae73…`，SLSA provenance v1，transparency log `3721440653`），GitHub Release `v1.4.0` 自动创建（正文取自 CHANGELOG 1.4.0 小节，223 字符 / 493 字节，远低于市场 4096 字符截断线）；verify run `42253398080`（Linux / Windows × Node 20/22/24）全绿。

> **1.5.0 验收证据（2026-11-08，已发布）**：`node --test` **321/321**（1.4.0 的 295 项 + 绿色交互层 / 气泡 / 新增样式表 / 门禁批次 26 项：`active-session` / `color-mode` / `integration` / `palette` / `settings-page` / `tokens` 更新，新增 `chat-bubble` / `plugin-update` / `ui-accents` / `workspace-labels` 与阈值钉死用例）；`npm run check` 全绿（palette / build / contrast / release-notes，`contrast.md` 重新生成并新增 G18–G20）；`client.js` 重建为 v1.5.0（316,822 字节，md5 `45455eb4…`）并随发布提交入库；`npm pack --dry-run` 清单 16 个文件（131.9 kB）；发布 tag `v1.5.0`（commit `acf9970`）→ publish run `42494099760` → npm `latest` = 1.5.0（`dist.shasum` `b713cb06…`，SLSA provenance v1，transparency log `3756537238`），GitHub Release `v1.5.0` 自动创建（正文取自 CHANGELOG 1.5.0 小节，434 字符 / 1,110 字节，远低于市场 4096 字符截断线）；verify run `42494087912`（Linux / Windows × Node 20/22/24）全绿。

> **1.0.0 验收证据（2026-10-25，已发布）**：`node --test` **220/220**（14 个测试文件，含 `theme-spotlight` 9、`active-session` 8、`selection` 4、`dev-panel` 16、`color-mode` 19、`integration` 41 等）；`npm run check` 全绿（palette / build / contrast，`docs/reference/contrast.md` 由脚本重新生成）；`npm pack --dry-run` 清单含 `icon.svg`（约 3.1 KB，`tests/integration.test.mjs` 断言其自包含且在尺寸上限内）；两份 README 的预览图与仓库图一致、`screenshots.json` 与 README 引用逐项相同；npm `latest` = 1.0.0（`dist.shasum` `162d8c59…`，publish run `40116912287`，见 [`releasing.md`](releasing.md) 发布记录）。聚光灯 / 当前会话行 / 文本选区 / dev 面板的真机验收分别见 §17 / §15 / §16.2 / §14。

> **0.4.0 验收证据（截至 2026-10-23）**：色彩模式用例 `tests/color-mode.test.mjs` 12 → **17 项**并全部通过（次日扩到 19 项，见 §13.5）；`node scripts/check-contrast.mjs --check` 全绿（G9–G16，报告 `docs/reference/contrast.md` 已重新生成）；6 变体 × 24 个角色 = **144 个派生色值**由测试逐值钉住（初版 15 个角色与方案 0 样张快照一致，扩展的 9 个角色按 Enchanted 映射公式固定）；全部 **34 条** CSS 规则以 `html[data-everforest-color-mode="on"]` 开头、无 `!important`，关闭时零匹配（现行 54 条，见 §13.2）。全量 `node --test`（170 项，现 329）与 `npm run check`（palette / build / contrast）由最终门禁复核。**真机目检已于 2026-10-23 完成**：用户在本机 DSH（重启后）按 §9「色彩模式」行与 §13.6 目检 6 套配色、富文本角色与关闭零差异，确认「这次调整没什么问题了」并要求发布（见 [`releasing.md`](releasing.md) 0.4.0 段）。

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
7. ~~是否值得为设置导航项做自定义图标~~ **已决策（2026-10-22 用户确认）：标为待做，等 DSH 官方给 `settings.section` 加 icon 字段**。现状核对：导航图标由 ui-settings-general 的 `navIcon(id)` 按 section id 硬编码（`account` / `models` / `agent-presets` / `plugins` / `archived-sessions`），未知 id 一律回退默认齿轮；注册项只有 `id` / `order` / `label`。**2026-10-30 更新：改为已实现**——DSH 仍没有 icon 字段，本插件改用 `dshmarket` / `dsh-notify-me` 的 DOM 标记 + MutationObserver 给自己那一行画松树图标（只认本插件 section label、不动 shell 结构；DSH 将来若加 icon 字段即删除该模块，见 §19）。**2026-11-06 更新：DSH 0.2.2 新增官方 `settings.section.icon` 槽位（注册 id 等于 section id，组件收 `{ size, active }`），本插件已迁移并删除 DOM hack / 样式表 / observer；旧宿主回退默认齿轮（见 §19）。**
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

**机制证据**（DSH 0.2.1-rc.2 / rc.3，安装包源码；抽取副本仅用于只读分析；2026-10-24 对照 rc.3 安装包复核，下列相关包 rc.2→rc.3 无实现差异）

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

### 2026-11-08 聊天气泡：苔纸底色 + 派生墨（用户选定）

- **背景**：用户反馈聊天里「气泡框背景和文字颜色不太好看」。先做了六方案对比页（`.tmp/bubble-demo`，按真实 token 现算 + 每档现状对照），用户选定 **light C「苔纸」/ dark F「只换字色」**。
- **做法（token）**：light 由 palette `bg_green` 向 `bg5` 混 22% 成苔纸，经 `readableSurface` 守卫保证官方 `label-primary` 仍 ≥4.5:1（hard `#e7ead0` 4.54、medium `#e7e9cd` 4.50）；light·soft 的 `bg0` 没有正文余量，改走抬起方向——白 → 同一苔纸 40% 的淡苔纸 `#f1f2e5`（文字 4.94:1，对画布 1.06:1，门槛仍 1.05）。dark 保持 `bg1` 不变。
- **做法（字色）**：DSH 把气泡文字写死为 `label-primary`，token 层无法单独换色，新增常驻样式表 `src/chat-bubble.js`（`<style data-plugin-css="dsh-everforest/chat-bubble">`）用 `[class*="_userStack"] [class*="_bubble"]` 覆盖：light 深松 `#3E5647`、dark 淡鼠尾草 `#DAE2C7`，六档实测 6.45–8.98:1。`userStack` 祖先把 tooltip 的 `_bubble` 排除在外；选择器失效时回落官方墨仍满足 AA。
- **验收**：`tests/tokens.test.mjs` 钉 light 三档底色；新增 `tests/chat-bubble.test.mjs` 钉派生墨与回落覆盖率；`tests/integration.test.mjs` 钉第 9 张常驻样式表（含设置页第 10 张）；`reference/contrast.md` 重新生成（§2d / §6.8）。

### 2026-11-10 聊天气泡：改侧栏选中绿底 + 画布墨

- **背景**：深色气泡的 `bg1` 底色对画布只有 1.15–1.16:1，用户报告「深色模式下的聊天气泡颜色有点淡了」，随后直接指定方向：「试试直接改成侧边栏选中那种绿色和文字颜色」；同日又补充浅色：「浅色气泡的也和侧边栏颜色保持一致」。
- **做法**：两个 scheme 的气泡都改成与选中会话行 / 选中导航项 / 发送键相同的强调色对——交互强调 `statusline1` 实底 + 画布墨 `bg0`：浅色 `#93B259` + `#FFFBEF` / `#FDF6E3` / `#F3EAD3`（2.32 / 2.22 / 2.00:1），深色 `#A7C080` + `#272E33` / `#2D353B` / `#333C43`（6.88 / 6.23 / 5.62:1）。深色仍是 AA；浅色沿用强调层既有的「奶油墨 on statusline1」上限（与选中行 / 发送键同一取舍，见 `reference/contrast.md` §2i），按用户要求保持与侧栏一致，属明示取舍。绘制只写进 `src/chat-bubble.js` 的作用域样式表（六条规则，并把 `--dsw-alias-state-business-primary` 重指向带墨色，气泡内的会话引用 chip 跟着换色）；`--dsw-specific-bubble` token 仍是苔纸 / 守卫后的 `bg1`：气泡回落文字是 `label-primary`，绿底进 token 会让样式表失效时变成不可读色块；token 保持不变则失效时回到苔纸 / `bg1` + `label-primary` 的可读组合。
- **长文本试验（当天回退）**：用户用重复长文本实测整段效果后要求浅色气泡「文字帮我改成深墨色试试」；实现为保留 `#93B259` 底、字改派生深墨 `#2F3B33`（4.88:1，AA，测试与真机均验证过）。随后用户又要求「文字还是换回白色吧」，最终交付回到奶油白（与侧栏选中行完全同色对），深墨方案只保留在记录里，不进入 token 或最终样式表。
- **验收**：`tests/chat-bubble.test.mjs` 钉两个 scheme 的绿底 / 画布墨 / 六条规则 / 引用 chip token / 浅色 2.00–2.32 与深色 5.62–6.88 的实测值 / 「失效回落」覆盖；`tests/integration.test.mjs` 钉 `#93B259` + `#FFFBEF` + `#A7C080` 与效果标签；`reference/contrast.md` §2d / §6.8 口径同步；真机窗口采样：浅色 light·hard 气泡底 `#93B259`、字 `#FFFBEF`，与同窗口选中会话行完全一致；深色此前实测 `#A7C080` + `#333C43`。

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

### 2026-10-24 rc.3 复核（无实现改动）

DSH Desktop 自动更新到 `0.2.1-rc.3`（安装包 `@deepseek-ai/dsh` / `dsh-desktop` 均为 rc.3）。逐项复核结论：

- **token 层不变**：从安装包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js` 重新提取仍是 8 张样式表 / 206 个颜色 token（77 static + 107 alias + 11 specific + 11 shiki），SHA-256 `882ea20f…` 与 `reference/token-inventory.json` 一致；rc.3 源码 `packages/client/ui-theme` 仅版本号变化。
- **rc.3 新增引用仅 3 个既有 token**（`--dsw-alias-interactive-bg-hover` / `--dsw-alias-label-secondary` / `--dsw-alias-state-business-primary`），均已在覆盖层内；新增的「更多」菜单（`ui-entry-customization`）与侧栏 / 右侧栏面板 pin 只用既有 menu / interactive / label token，无新 token、无新自定义属性。
- **色彩模式锚点保持**：`[class*="markdown"]`（rc.3 构建类名仍含 `markdown` 子串）、`[class*="fileLink"]`、`[role="treeitem"][data-row-key^="session:"]` 与 `data-state=warning/done` 均未变（`ui-workspace` / `ui-primitives` 该部分 rc.2→rc.3 无 diff）；`body[data-ds-dark-theme]` 仍由 boot 脚本 + ThemePresenter 写入。
- **首帧与 spinner**：boot 页 6 个 `--dsw-*` 全在 `BOOT_TOKENS` 内（含 spinner 环 `border-l2`、进度弧 `brand-primary`），rc.3 构建 CSS 与 rc.2 逐字节相同；`webserver/index-inject` row 形状、ui-theme `{prepend:true}` 顺序与 presenter 覆盖机制未变。
- **Host 集成未变**：`Config` / `configForms`（volatile 投影、`mutate` / `snapshot`、`writable`）、`locale`、`slots`（`settings.section` / `shell.overlay`）与 HMR 传输在 rc.3 均无变化；`engines.dsh` 区间无需调整（rc.3 满足，见 [assessment.md](assessment.md) 2026-10-24 注记）。
- **已知上游小瑕疵（非阻塞）**：rc.3 新右侧栏「更多工具」图标（`ui-sidebar-right/.../GuideMoreIcon.tsx`）硬编码 `stroke="#A6B2C7"`，浅色档对比仅 1.76–2.04:1；这是 DSH 自身字面量、不走 token，上游改 `currentColor` 即消失，插件暂不做 DOM 特例。

### 2026-10-30 rc.5 复核（无实现改动）

DSH Desktop 自动更新到 `0.2.1-rc.5`（`app.asar` 内 `dsh-desktop-runtime` 与全部 `@deepseek-ai/*` 包均为 rc.5；Node 24.21.0 / pnpm 11.28.5）。上游 release notes：rc.3→rc.4 只有「ACP 模式诊断输出混入 stdout」修复，rc.4→rc.5 只有「优化对话中思考内容的展示效果」（`ui-chat` 的 `ReasoningRow` 剥离 `<signature>` 块）。逐项复核结论：

- **token 层逐字节不变**：安装包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js` 的 SHA-256 `acaf3e03…` 与 rc.3 安装包完全相同（仍是 8 张样式表 / 206 个颜色 token）；`node scripts/extract-theme-tokens.mjs --from <rc.5 client.js> --check` 通过，`reference/token-inventory.*` 无需重生成。
- **渲染层 bundle 逐字节不变**：`dsh-web-frontend/dist/assets/index-BXV-oxvX.js`（SHA-256 `0f3fc6b8…`）与 `index-BNYAYEM7.css` 和 rc.3 相同，`markdown` 容器（含 `data-markdown-variant`）、`[class*="tableScroll"]` / `_tableScroll_*` 与 `.md-table-wide` 的 DOM 形状不变；真机进程实际加载的就是这两个文件（`dsh-app://app/assets/…`）。`dsh-client-ui-chat` 的 diff 只有 rc.5 的 reasoning 文本处理，表格 / markdown 样式未动。
- **会话行锚点不变**：`[role="treeitem"][data-row-key^="session:"]` 的树行（`dsh-client-ui-workspace/lib/client.js` 与 rc.3 逐字节相同，SHA-256 `bafd2d6e…`，`_time` / `_iconButton` / `_pinIndicator` 后缀都在）、`data-state` 状态点与 `_dot_*`（在逐字节相同的 web-frontend bundle 里）均未变。真机 25 行会话实测：`done` 行底色 = `bg_green`、状态点 = `green`，选中行 = `bg_blue`（§15），与 1.2.0 行为一致。
- **集成点未变**：`theme.overrideTokens`（rc.5 的 ui-theme 与 rc.3 逐字节相同）、`configForms`（`dsh-settings` / `dsh-client-ui-settings` 只有版本号变化）、`slots` 的 `settings.section` / `shell.overlay`、`locale.register` 与 `webserver/index-inject`（`dsh-host-webserver` / `dsh-desktop-host` / `dsh-host-frontend-static` 未变）均在；`@deepseek-ai/schemastery` 仍为 3.18.5、`cordis` 4.0.5。设置页 client bundle 的差异是 CSS-modules 哈希重排、版本号与一处 developer-tools 开关埋点；插件管理页新增 `pluginNavigation.openList`；均不涉及本插件用到的接口。
- **真机复核**：Desktop 窗口（rc.5）body 内联 token 生效（`--dsw-alias-bg-base #333C43`、`--dsw-alias-label-primary #D3C6AA`、`--dsw-alias-brand-primary #83C092`，dark·soft），6 张 `<style data-plugin-css>` 样式表全部挂载（settings / color-mode / selection / active-session / table-resize / theme-spotlight）；`window.__EVERFOREST_BOOT__ = { version: 1, light: 'hard', dark: 'soft' }`，boot 脚本读取的 `html[data-ds-theme-source]` / `body[data-ds-dark-theme]` 仍在原位；控制台无插件报错。
- **`engines.dsh` 无需调整**：`>=0.2.1-rc.2 <0.3.0-0` 已覆盖 rc.5，不抬高下限。
- **既有上游瑕疵（非本次新增）**：若干组件引用了 ui-theme 未声明的别名（如 `--dsw-alias-fill-l1` / `--dsw-alias-bg-layer-4` / `--dsw-alias-label-quaternary`），rc.3 的 web-frontend 里已如此，属 DSH 自身未定义的自定义属性，不走覆盖层、插件不做特例。

### 2026-11-06 0.2.2-rc.1 复核（token 扩展 + 导航图标迁移）

DSH Desktop 已升级到 `0.2.2-rc.1`（`app.asar` 根与全部 `@deepseek-ai/*` 包均为 rc.1；npm 11-04 发布，本机 11-04 17:30 安装）。上游 release notes 与插件相关的有：手机 / 平板适配、聊天文本引用、统一右键菜单、**插件设置页导航图标 API**、设置导航深色 hover 修复、桌面更新提示改为窗内视图、侧栏拖动预览、新语言、插件管理页富文本 / 更新、Trajectory 改造等。逐项复核结论：

- **token 层扩展（唯一契约变化）**：安装包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js` 重新提取为 8 张样式表 / **217** 个颜色 token（82 static + 114 alias + 10 specific + 11 shiki；rc.5 为 206）。新增 12 个：`--dsw-static-neutral-bluish-55/90/310`、`--dsw-static-violet-400/600`、`--dsw-alias-illustration-background/backing/detail/inset/shadow/surface`、`--dsw-alias-state-done-primary`；删除 `--dsw-specific-sidebar-nav-item-hover`。已补映射并重生成 `reference/token-inventory.*`（提取 SHA-256 `12f3c67bbd1643eade93e6cc8ece4257b7d458f098d465c4c79f351fd16e79b5`），计数口径见 §4 的 2026-11-06 修正。
- **新增 token 的实际消费方**：`dsh-client-ui-schedule` 的 `ScheduleEmptyIllustration`（自动化任务页空态插图，6 个 illustration token）与实验性 `forge` 插件（violet-400 / state-done-primary）；核心 UI 没有其它引用。
- **设置导航行结构变化（本次唯一必须改的 UI 集成）**：0.2.2 的 `ui-settings-general` 把导航行改成 `button > span.navIcon > svg` + `span.navLabel`，并新增官方槽位 `settings.section.icon`（`kind: list`、`scope: root`、`inline: true`；注册项 `id` 必须等于目标 section id，组件收 `{ size, active }`）。旧 DOM hack 的 `[marker] > svg` 只匹配直接子级，导致齿轮与松树同时显示（真机截图：Everforest / 插件市场 / 通知提醒三行都是双图标）。已改为注册官方槽位（`src/nav-icon.js` 只保留组件，接线在 `src/client-entry.js`），DOM hack、样式表与 observer 删除。
- **渲染层 bundle 变化**：`dsh-web-frontend/dist/assets/index-BgUyXZcc.js` / `index-lh_YM6sT.css`（rc.5 为 `index-BXV-oxvX.js` / `index-BNYAYEM7.css`）均重新构建；逐项确认 `[class*="markdown"]` / `data-markdown-variant`、`[class*="tableScroll"]` / `.md-table-wide` / `tableFill`、`[class*="fileLink"]`、`task-list-item`、`[data-state="done"/"warning"]` 与 `data-chat-node-key` / `data-conversation-session` 锚点仍在。
- **会话行 / 聊天**：`ui-workspace` 的 `_time` / `_iconButton` / `_pinIndicator` 后缀、`[role="treeitem"][data-row-key^="session:"]` 与 `ui-chat` 的 `data-chat-node-key` 均在；新增的右键菜单、聊天引用、文件预览等 UI 只用既有 token（右键菜单真机实测为 Everforest 配色）。
- **集成点未变**：`theme.overrideTokens` / `getTheme` / `setTheme` / `publish` / `theme/change`、`configForms`、`settings.configure({ auto: false })`、`locale.register`、`slots` 的 `settings.section` / `shell.overlay`、`webserver/index-inject` 行形状均在；`engines.dsh` 区间 `>=0.2.1-rc.2 <0.3.0-0` 仍覆盖 0.2.2-rc.1，不抬高下限。
- **真机复核**：Desktop（0.2.2-rc.1）token 生效（`--dsw-alias-bg-base #FFFBEF`、`--dsw-alias-label-primary #5C6A72`、`--dsw-alias-brand-primary #35A77C`，light·hard；该值属 2026-11-06 当时口径，现行品牌色为 `statusline1`），5 张常驻样式表 + 设置页样式表（当时共 6 张）挂载，`window.__EVERFOREST_BOOT__ = { version: 1, light: 'hard', dark: 'soft' }`，设置页 6 档色卡正常，控制台无插件报错；修复后设置导航行只剩松树（§19）。
- **升级影响**：主题层无需改动；token 补齐与导航图标迁移属于本次适配。`engines.dsh` 不变，旧宿主（0.2.1-rc.x）仍可用主题，只是设置导航回退默认齿轮。

### 2026-11-13 0.2.2-rc.2 复核（token 244 + JSON 树 / 上传槽映射 + 提取器修复）

DSH Desktop 已升级到 `0.2.2-rc.2`（`resources/app.asar` 的 `dsh/package.json` 与全部 `@deepseek-ai/*` 均为 rc.2）。上游 release notes 与插件相关的有：自定义主题对卡片 / 计划 / 任务的配色覆盖、菜单定位与浮层、暗色文件树浮层、侧栏共用滚动区、右键菜单、聊天代码差异着色、会话首页动画等。逐项复核结论：

- **token 层扩展（唯一契约变化）**：244 颜色 token（82 static + 138 alias + 13 specific + 11 shiki），与 rc.1 的 217 逐项比对为 **+27 / −0 / 改值 0**。已显式补 8 条（JSON 树 7 + 附件上传槽 1），其余 19 条按 `INHERITED_TOKEN_NAMES` 继承；`reference/token-inventory.*` 用 rc.2 产物重新生成（SHA-256 `fdfc460e70de24a188c4ef357634357ae8cf69b15fe0a58595fcbf4b5e1a89e8`），`contrast.md` 重新生成（覆盖 231 条 = 225 颜色 + 6 辅助）。映射细节见 §4 的 2026-11-13 修正。
- **渲染层锚点未变**：`[class*="tableScroll"]`（实测 `_tableScroll_13jw0_199 _tableFill_13jw0_252`）、`[class*="markdown"]`、`data-chat-node-key`、菜单 `selected`、设置导航 `[data-shortcut-modal="settings"]` + `nav button[aria-current="true"]`、`_userStack` / `_bubble`、`headline` / `fishHitbox`、`projectText` / `folderActive` 均仍在；`settings.section.icon` 槽位、`shell.overlay`、`settings.general.item`、`webserver/index-inject`、`theme.overrideTokens` / `publish` / `theme/change` 未变。新出现的 `_tableFill_*` 只是表格底色填充，不影响既有规则。
- **rc.2 不再渲染 `selectedFill`**：菜单选中项改为在行上直接画底（实测 `_item_70kcw_173 _selected_70kcw_308`，底 `#93B259`、字 `#FFFBEF`，`_itemIcon_` / `_itemLabel_` 也被 `MENU_INK_TOKENS` 改对）。两条子元素规则与导出删除，颜色不变（§21）。
- **新增 token 的消费方**：`deliverables` / `plan` / `schedule`（card-*）、`conversation`（chart-*）、`workspace` / `schedule`（hovercard-*）、`sidebar-right`（guide-hero / sidebar-right-flash）、`attachment`（file-upload-track / label-on-color）、`agent-preset`（border-selected）、`trajectory`（json-tree-* / trajectory-accent）、`theme`（tooltip-label / toast-action）。
- **工具链**：`scripts/extract-theme-tokens.mjs` 同时支持 rc.2 的模板字符串编码与旧的 region + JSON 编码；`scripts/extract-asar-package.mjs` 先剔除 asar header 的 NUL padding 再 `JSON.parse`。`node --test` 全绿，palette / build / contrast 三项 `--check` 全绿。
- **真机复核**：Desktop（0.2.2-rc.2）13 张 `dsh-everforest/*` 样式表挂载，`window.__EVERFOREST_BOOT__ = { version: 1, light: 'hard', dark: 'soft' }`，控制台只有 favicon 404；会话表格边框、设置导航选中行（`#93B259` / `#FFFBEF`）、菜单选中、聊天气泡（`#93B259`）、首页鲸鱼与标题、工作区目录名均为主题色；右侧栏新面板面板底 `#FFFBEF`、栏底 `#F9F6E6`，与主区口径一致。
- **升级影响**：`engines.dsh` 不变（`>=0.2.1-rc.2 <0.3.0-0` 覆盖 rc.2）；主题主体无需改动，token 补齐与死规则清理属于本次适配。

## 13. 2026-10-23 0.4.0：色彩模式（中彩；2026-10-24 起默认提供、无开关）

> 前置：方案 0 样张（`.tmp/color-mode-preview/`，四列「关闭 / 轻彩 / 中彩 / 浓彩」× 6 变体，用真实 token 值复刻聊天区与会话列表）于 2026-10-23 经用户目检，选定**中彩**一档并确认初版范围。初版（h1–h3 + 表格 + 会话行）落地后用户验收反馈「还行」，随即要求把标题扩展到 h1–h6、并参考 Obsidian **Everforest Enchanted**（[FireIsGood/obsidian-everforest-enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) 的 `theme.css` @ `bdd7ac7`，MIT）补齐富文本角色；扩展轮与初版同日完成。评估、参考与取舍过程见 [`assessment.md`](assessment.md) §14 / §15；样张截图见 `.tmp/color-mode-preview/shots/`（初版）；富文本扩展的预览页与截图在同一目录下另行生成（`rich.mjs` / `shots-rich/`，均为本地留档、不入库）。

> **2026-10-24 更新（口径变更）**：色彩模式改为**默认提供、没有设置开关**——设置页的色彩模式区块（标题 / 说明 / `role="switch"` 开关 / 5 个强调色装饰片）全部移除，状态与 Host `Config` 回到两个强度，`<html>` 上的 `data-everforest-color-mode` 恒为 `on`（仅作作用域锚点）。本章 13.1 / 13.4 / 13.6 中「实验性 / 设置页开关 / `colorMode` 字段 / 关闭零差异」等表述是 0.4.0 发布时的史实，**现行契约以 §13.9 为准**；13.2 / 13.3 / 13.7 / 13.8 里的 CSS 规则、角色色值与对比度门槛不受影响（token 层与色值零改动）。

### 13.1 范围（2026-10-23 用户确认，两轮）

**初版（第一轮，用户目检后确认）**

| 项 | 结论 |
|---|---|
| 标题 | 只做 h1–h3 分级色；h4–h6 暂不做 |
| 特殊格式 | 加粗 / 斜体 / 链接 / 行内 code 文字 / 引用文字 / 代码块保持单色（链接与行内 code 芯片本来就是彩色 token） |
| 表格 | 做表头色带 + 隔行斑马纹；彩色边框不做（彩色边框要达到 3:1 会被压成灰绿，失去意义）；2026-10-27 起补中性色阶的外框 + 列分隔线（§18） |
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
| 复选框 | 深色档 `blue`（`#7FBBB3`，与行内 code / h5 同色系）；浅色档 `aqua` 绿（`#3f9779` 起，与列表 marker 同族；2026-10-30 用户目检后「深色的还行，浅色的用绿色试试」，试过「浅底深勾」后用户改口「还是用这种吧」，定回实心绿 + canvas 色勾）。DSH 的任务项复选框恒为 `disabled`，而 Chromium 对禁用控件忽略 `accent-color`、直接画原生灰框（2026-10-30 实测），所以改成重绘：选中为实心 accent + canvas 色勾，未选中为 accent 描边 + 淡底；同时去掉任务项多余的列表圆点（DSH 同时画 marker 与 checkbox） |
| 未扩展 | fenced code 块与外部链接保持既有 token 颜色；「运行中」仍不上色 |
| 定位 | 不变：实验性、默认开启（可关闭）、DSH 升级后需回归 |

> 两轮「定位」是 2026-10-23 当时的实验性口径：0.4.0 发布后同日曾把默认值改为开启；2026-10-24 又按用户要求**移除设置开关**，改为默认提供（见 §13.9）。

### 13.2 架构：token 层零差异 + 一段作用域 CSS

色彩模式**不改变任何 token**：`tokensFor(state)` 的输出与 0.3.0 逐字节一致，boot payload 也不变。新增的是客户端的一段样式与三个 `<html>` 属性：

- **`src/color-mode.js`**（纯 ESM，无 DOM / storage）：
  - `COLOR_MODE_ATTRS`：`data-everforest-color-mode`（本版恒为 `on`，只作样式表作用域锚点）、`data-everforest-light`、`data-everforest-dark`（各自 scheme 的强度）。
  - `colorModeRoles()`：6 变体 × **25 个角色色值**（2026-10-30 新增列宽提示线 `tableHandle`，直接取 `headerAqua`、不做文本守卫），全部由 `tokensFor()` 的表面值（`bg-base`、`sidebar-fill`、`label-primary`、`label-tertiary`、行内 code 芯片、代码块表面）+ `resolvePalette()` 的强调色实算并做对比度守卫（见 13.3）。
  - `colorModeDataset(state)`：Client 写到 `document.documentElement` 的属性映射。
  - `colorModeStyles()`：静态样式表 = 6 个自定义属性块 + **49 条元素规则**（27 条变量驱动 + 22 条字面规则：标题内强调色 `inherit`、引用块右内边距 / 圆角、§13.8.1 的 6 条深色 warn 反相，2026-10-27 的 8 条表格框与 2026-10-29 的 2 条表格滚动条 literal 规则（§18.1 / §18.3），2026-10-30 的 3 条任务列表复选框字面规则：去圆点、重绘方框、`::after` 勾，以及 2026-11-10 的 1 条宽表滚动条下沿线规则（§18.1）），共 **55 条**规则（0.4.0 时为 40 条），全部以 `html[data-everforest-color-mode="on"]` 开头；深浅色由 `body[data-ds-dark-theme]` 区分（DSH ui-theme 在 boot row 写 body 属性），强度由 `<html>` 上的两个 data 属性选择。
- **`src/client-entry.js`**：`applyLayer()` 在 token 层之外同步 `<html>` 属性（色彩模式没有开关，不再有「切换模式」动作；CSS 与 token 层彻底解耦）；一个独立的 `ctx.effect` 注入 `<style data-plugin="dsh-everforest" data-plugin-css="dsh-everforest/color-mode">`，与设置页样式 / slots / locale 完全解耦（设置 UI 不可用时色彩模式仍生效）。
- **作用域选择器**：
  - 聊天 Markdown：`[class*="markdown"]:not([data-markdown-variant="compact"])`（DSH 的容器类名是 CSS modules 哈希，但 `markdown` 子串保留；排除 compact 推理变体）。DSH 0.2.1-rc.2 / rc.3 / rc.5 的 markdown 正文容器**没有稳定 data 锚点**（rc.3 / rc.5 构建类名仍含 `markdown` 子串），这是本功能最脆弱的依赖（见 13.7）。
  - 富文本元素：h1–h6、`strong`、`em`、`del`、`:not(pre) > code`（行内 code）、`[class*="fileLink"]`（内部文件链接）、`li::marker`、`blockquote`（左边框 + 淡底）、`hr`、`thead th`、`tbody tr:nth-child(even) > td`（斑马纹）、`tbody tr:hover > td`（行 hover）、`ul.contains-task-list > li.task-list-item`（去掉多余圆点）、`input[type="checkbox"]`（重绘的复选框：accent 描边 / 淡底 + canvas 色勾）、`li.task-list-item:has(input[type=checkbox]:checked)`（已完成任务淡化）。
  - 状态点：`[data-state="warning"]` / `[data-state="done"]`（StateDot 的语义属性，稳定）。
  - 会话行：`[role="treeitem"][data-row-key^="session:"]:has([data-state="warning"|"done"]):not([aria-selected="true"])`（`data-row-key` / `role` / `data-state` 都是稳定锚点；选中行不覆盖，hover 用单独规则加深）。**2026-10-24 晚更新**：选中行改由常驻的 `src/active-session.js` 上 `bg_blue` 底（不再「完全交还 DSH」），见 §15；本条 `:not([aria-selected="true"])` 保持不变，避免状态色盖掉当前行。

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
| checkbox accent | 深色档 `guard(fg.blue, 文字面, 3)`；浅色档 `guard(fg.aqua, 文字面, 3)` | 装饰 ≥ 3:1（G10） |
| 列宽提示线（`tableHandle`） | 直接取 `headerAqua`（6 档同值 `#569D79`） | 不参与 G9–G16 文本门槛；`tests/color-mode.test.mjs` 钉住对表头色带 ≥ 2.5:1（2px 装饰线，见 §18.2） |
| 表格表头色带 | `safeTint(bg, fg.green, 0.14)` | 表头上的 `label-primary` ≥ 4.5:1（G11） |
| 隔行斑马纹 / 行 hover | `safeTint(bg, fg.green, 0.06 / 0.10)` | `label-primary` ≥ 4.5:1（G12） |
| 引用块淡底 | `safeTint(bg, fg.aqua, 0.08)` | `label-primary` ≥ 4.5:1（G12） |
| 「待确认」行底 | 浅色档：`readableRowFill(palette.bgYellow, palette.bg0, ink)`，再按 `ROW_WARN_SEPARATION = 3.5` 向 `fg.yellow` 加深；深色档：`mix(fg.yellow, bgDim, 0.22)` 的亮琥珀 + 深色对比墨（2026-10-24 两轮改色见 §13.8.1） | 行内 `label-primary` ≥ 4.5:1（G13） |
| 「已完成」行底 | 同上，取 `palette.bgBlue`（2026-11-08 起；此前为 `bgGreen`，见 §22），再向 `fg.blue` 加深到距侧栏 4.5 L* 或 4.5:1 门槛为止 | 同上 ≥ 4.5:1（G13） |
| 行底 hover | `readableRowFill(mix(fill, fg.yellow / fg.green, 0.16), palette.bg0, ink)`（向对应强调色混一档再守卫） | 同上 ≥ 4.5:1（G13） |
| 待确认 / 已完成状态点 | `guard(fg.orange / fg.green, [bg, sidebar], 3)` | 对内容底与侧栏底都 ≥ 3:1（G14） |

**为什么强调文字是 3:1（G16），不是 4.5:1**：浅色档的 Everforest 强调色本身达不到 4.5:1——以 light·soft 为例，`fg.purple` 对画布只有 2.55:1，按 4.5 守卫会把紫 / 蓝 / aqua 全部混成 `#5C6A72`（即墨色，颜色消失）；Enchanted 自身在浅色下同类文本也只有约 **2.6:1**。本实现把强调文字抬到 **3:1** 并保留色相（深色档本来就直接通过 4.5:1，守卫只在浅色档生效），同时**所有正文 `label-primary` 仍保持 4.5:1**（彩色表面按此反推权重）。这是「保留颜色」与「可读性」之间明确的一次取舍；被否决的两个极端见 [`assessment.md`](assessment.md) §15。

`safeTint` 从给定权重开始逐 1% 下调，直到表面上的 `label-primary` 满足 4.5:1；因此**浅色档的实际权重会低于深色档**。两个可观测后果（已知边界，非缺陷）：light·soft 的表格表头 / 斑马纹 / 行 hover 三种绿染收敛到同一档 `#efe7cb`；light·soft 的表格绿染仍接近画布。会话行底取 palette1 的 `bg_yellow` / `bg_blue`（done 2026-11-08 起由 `bg_green` 改为 `bg_blue`，见 §22.2），再经 `readableRowFill` + `liftRowFill` 按可见性下限向对应 `fg` 加深（warn 3.5 L* / done 4.5 L*，均为距侧栏步长；见 §13.8 / §13.8.1），hover 重新守卫，因此 light·soft 保住了黄 / 蓝底相；浅色档的明度差仍受 4.5:1 门槛压缩。light 三档的实测值全部贴着门槛（3.00–3.43），浅色档标题 / 强调文字因此明显偏 muted（h3 可能是橄榄色），属目检已接受的「淡彩」。

对比度由 `scripts/check-contrast.mjs` 的 **G9–G16** 硬门槛逐变体锁定；`docs/reference/contrast.md` §2f 有完整色值表与逐项实测值（G16 最弱项实测 3.00–3.03）。样张与实现共用同一组公式：`tests/color-mode.test.mjs` 把 6 变体 × 25 角色 = 150 个色值逐字节钉住（初版 15 角色来自 `.tmp/color-mode-preview/spec.json` 快照，扩展的 9 个角色按上表公式固定；2026-10-24 的四个会话行角色按 §13.8 重算并重钉）。

### 13.4 持久化与状态（2026-10-24 起：两字段口径）

> 0.4.0 发布时这里是「三字段」口径（state / Host `Config` / 缓存都带 `colorMode`）；2026-10-24 移除开关后回到两个强度，现行契约见 §7，变更记录见 §13.9。

- **Host `Config`**：只有 `light` / `dark` 两个 volatile 字段。旧 patch 里残留的 `colorMode` 键不是 schema 字段：schemastery 忽略未知键 → 校验通过、值不生效，插件也不会主动 unset（无需手改，见 §13.9）。
- **localStorage**：payload 为 `{ version: 1, light, dark }`，**`STATE_VERSION` 保持 1**；0.3.x 缓存同形沿用，0.4.x 带 `colorMode` 的旧缓存仍合法（多出的字段忽略、下次写入丢弃，不触发修复重写）。默认状态 `{ light: 'hard', dark: 'soft' }`。
- **写入**：选择强度一次原子写两个字段；「恢复默认」unset 两个字段；表单就绪前的选择排队补写；广播 / storage 事件 / 迁移播种都只含两个强度。
- **迁移**：`shouldSeed` 的「真实选择」判定为「非默认配对」（只比两个强度）；播种一次写两个字段。
- **首帧**：boot payload / `hostState()` / `__EVERFOREST_BOOT__` 只含两个强度（首帧没有聊天 / 会话 DOM，模式 CSS 在挂载后才生效），与 0.3.0 一致。
- **兼容**：0.4.x 的 JSON 缓存里多出来的 `colorMode` 既不报错也不影响解析；Host snapshot 的 `user` 层若只含该旧键，仍被视为「有用户层」（不播种），两个强度解析为默认值，与宿主结果一致。
- **回滚**：0.4.0 → 0.3.0 的历史注意事项见 §7「升级 / 回滚」；当前版本不再声明 `colorMode`，旧键被当前 schema 忽略。

### 13.5 实现清单

- 新增 `src/color-mode.js`（24 角色实算 + 40 条规则的作用域样式）、`tests/color-mode.test.mjs`（12 → 17 项；2026-10-24 重制后 19 项）。
- 修改 `src/state.js` / `src/durable.js` / `src/host-config.js` / `src/locale.js` / `src/settings-page.js` / `src/client-entry.js`，以及对应的 5 个测试文件（初版轮）。
- 修改 `scripts/build.mjs`（SOURCES 增 `color-mode.js`，位置在 `tokens.js` 之后）、`scripts/check-contrast.mjs`（G9–G16 + 报告 §2f）、`package.json`（0.4.0；1.0.0 发布时已随版本号更新）。
- 富文本扩展轮只改 `src/color-mode.js` / `tests/color-mode.test.mjs` / `scripts/check-contrast.mjs` 与生成物；状态、持久化与设置页不变——开关与写入路径和初版完全一致。
- 生成物：`client.js`、`docs/reference/contrast.md`。

### 13.6 验证

- 自动化：`tests/color-mode.test.mjs` **19/19 通过**（初版 12 项 + 富文本 5 项 + 2026-10-24 行重制 2 项：24 角色快照、G16 多表面守卫、字面规则、规则总数、CSS 作用域）；`node scripts/check-contrast.mjs --check` 全绿（报告与 G9–G16 一致）。全量 `node --test`（0.4.0 时 170 项，现 329 项）与 `npm run check` 由最终门禁复核。
- 样张一致性：初版 15 角色与方案 0 样张 `spec.json` 逐字节一致；扩展的 9 个角色（h4–h6、emphasis、inlineCode、linkInternal、faint、tableHover、quoteBg）按 13.3 公式固定并由测试逐值钉住。
- 富文本预览目检（2026-10-23）：用 `colorModeStyles()` 的真实输出 + `tokensFor()` 的真实表面值渲染 6 个变体（`.tmp/color-mode-preview/rich.mjs`，截图在 `shots-rich/`）。dark 三档与 light·hard / light·medium 下 h1–h6、加粗 / 斜体、行内 code、内部链接、删除线、引用块淡底、表格三档、复选框、已完成任务淡化、会话行底与状态点均清晰可辨；light·soft 除已记录的「表格三档同色」外，标题与强调文字仍保留色相（会话行底在 2026-10-24 palette 版改为可见的淡黄 / 淡绿）。样张与实现同源，不能替代真机目检。
- 复选框重绘目检（2026-10-30）：`.tmp/preview/` 用真实 DSH 样式 + `tokensFor()` token 层 + `colorModeStyles()` 输出同页渲染 6 个变体，确认六档下选中框为实心 accent + canvas 勾（浅色档绿、深色档蓝）、未选框为 accent 描边 / 淡底，任务项的列表圆点已去掉；`tests/color-mode.test.mjs` 21/21、`node scripts/build.mjs --check` 与 `check-contrast.mjs --check` 全绿。样张与实现同源，但**真机目检仍待用户确认**（点击一次的复选框在真机里同样是 `disabled`，样式表重绘，不需要交互态）。
- 最低对比度实测（`contrast.md` §2f）：G9 大号标题 3.01（light·soft h1）、G10 装饰 3.00、G11–G13 彩色表面正文 4.50–4.51、G14 状态点 3.01、G16 强调文字 3.00–3.03——全部贴着门槛通过，浅色档没有余量。
- 零匹配口径（0.4.0 当时的验证方式；2026-10-24 起属性恒为 `on`、开关已移除，规则与色值不变）：全部 **40 条** CSS 规则都以 `html[data-everforest-color-mode="on"]` 开头（无 `!important`）；token 层与 boot payload 未改。
- **人工（0.4.0 发布时；后于 2026-10-23 由用户真机目检确认）**：真实 DSH 需要**重启**才能加载当时的 Host `Config`；重启后（当时需在设置页开启色彩模式）目检 6 套配色下的 h1–h6 / strong / em / 行内 code / 内部链接 / 删除线 / 引用块 / 表格色带与 hover / checkbox / 会话行；重点看 light·soft 的淡彩与「会话行底不可见」是否符合预期。本仓库测试环境无法替代这一步。

### 13.7 已知风险与边界

1. **选择器脆弱性（最高）**：DSH 的组件类名是 CSS modules 哈希，markdown 正文容器没有稳定 data 锚点，只能依赖 `[class*="markdown"]` 子串；富文本扩展进一步依赖 `[class*="fileLink"]` / `:not(pre) > code` / `li.task-list-item` 等结构。DSH 升级若重命名容器 / 改变结构，色彩模式可能**静默失效**（颜色不生效，但 token 层与页面不会坏）。会话行锚点（`data-row-key` / `role=treeitem` / `data-state`）稳定得多。
2. **违背官方主题契约**：DSH 官方扩展点是 alias token 覆盖（「token 样式表是颜色值的唯一权威来源」），选择器注入是本项目为内容层色彩做的**实验性例外**；不承诺跨 DSH 版本的兼容。
3. **强调文字低于正文门槛**：h5/h6、strong/em、内部链接、行内 code 对画布 3:1（正文 `label-primary` 仍 4.5:1），浅色档尤其 muted；这是为保住色相而接受的取舍（G16，见 13.3）。
4. **浅色档彩色表面接近不可辨**：light·soft 的表格三档绿染收敛为同一色；会话行底自 2026-10-24 palette 版起改为可见的淡黄 / 淡蓝（light·soft warn `#F2E6C9` / done `#E6E8DA`；done 2026-11-08 起改蓝，见 §22.2）。light 三档全部贴着 3:1 门槛，进一步加深会跌破门槛。已由用户接受为「淡彩」，但真机目检要确认可辨识度。
5. **视觉噪音**：6 色标题 + 富文本 + 表格 + 会话行同时上色，信息密度高的会话可能显得花。0.4.0 曾用设置页开关作为「一键关闭」的退路；**2026-10-24 起开关已按用户要求移除**——目前没有单独关闭色彩模式的入口，若要退回单色内容层只能停用整个插件（会同时失去配色主题），该取舍见 §13.9。
6. **维护面**：每次 DSH 升级（尤其主题 / Markdown 渲染 / 会话列表相关）都要检查选择器是否仍命中；`check-contrast` 只能守住色值门槛，守不住 DOM。

### 13.8 2026-10-24 会话状态行重制（palette 实色底）

> 2026-11-08 更新：「已完成未读」行底由 `bg_green` 改回 palette1 `bg_blue`（绿色让给当前会话行，见 §22）；
> 本节及 §13.8.1 中关于 done 行的 `bg_green` 描述保留为当时记录，现行值以 §22 与 `tests/color-mode.test.mjs` 为准。

> 触发：用户反馈「工作区根据状态变色的功能观感不是很理想，再调整一版新样式」。三轮迭代后才定为最终形态：
> ①「左锚渐层洗色 + 2px 左轨」被用户否决（**不要渐变色、不要最左边的 border 效果**）；
> ② 回到整行实色底、行底由强调色在 OKLab 里派生——用户反馈「深色模式下的绿色和红色都感觉有点不好看」；
> ③ **最终**：行底直接取 Everforest 官方 palette（sainnhe/everforest `palette.md`）palette1 的 `bg_red` / `bg_green`，
> 不再自行推导。评估用真实 DSH 行 CSS（`@deepseek-ai/dsh-client-ui-workspace` 的 `Rows` 模块；已核对真机 DOM：
> 行高 32、圆角 12、`wnFoaW_sessionRow` / `wnFoaW_time` 类名）+ 真实 token + `colorModeStyles()` 输出渲染样张
> （`.tmp/status-preview.mjs`）。**只改 `src/color-mode.js` 的会话行取值**：规则集合不变（仍是 4 条
> `background-color`），markdown 角色、token 层、持久化与设置页均未动。

**为什么行底改为 palette 原色**

- 0.4.0 的 `safeTint(sidebar, accent, 0.12)` 在 sRGB 里把浅橙 / 浅绿混进深色侧栏，色相被亮度抵消：`dark·soft`
  的「待确认」行底实测 `#4E4E4F`（OKLab chroma ≈ 0.001），读起来像 hover / 选中态。
- 2026-10-24 第二版改在 OKLab 里派生（`#52423B` / `#42463D`），仍有「绿色和红色都不好看」的反馈——派生色
  终究不是 Everforest 自己的表面色。
- palette1 的 `bg_red` / `bg_green` 就是上游为状态 / 语义内容准备的背景色，直接使用不会偏色，也天然与
  `bg0..bg5` 全部 ramp 同一套明度关系。

**取值与守卫**

| 项 | 规则 |
|---|---|
| 底色 | `readableRowFill(palette.ramp.bgRed | bgGreen, palette.ramp.bg0, ink)`：先取 palette 原色，若 `label-primary` 不足 4.5:1 再沿 `bg0` 方向 2% 一档微调（dark 变暗、light 变亮，方向自适应）。**2026-10-24 后续**：warn 改 `bgYellow` 并加可见性下限，见 §13.8.1，本表其余行仍适用 |
| 实测值 | dark：hard `#493B40` / `#3C4841`、medium `#514045` / `#425047`、soft `#59464C` / `#48574E`（soft 绿从 `#48584E` 微调 1）；light：hard `#FFE7DE` / `#F3F5D9`、medium `#FDE3DA` / `#F0F1D2`、soft `#F6E4D2` / `#EBE8CB`（**本表是 bg_red 时代的 warn 值，已被同日 §13.8.1 的 `bg_yellow` 口径取代**：warn 现为 dark `#B19A6B` / `#B39C6D` / `#B49D6F`、light `#FBEAC0` / `#F8E6BB` / `#F2E6C9`；done 行当时不变，2026-11-08 起改 `bg_blue`（§22.2）） |
| hover | `readableRowFill(mix(fill, fg.red / fg.green, 0.16), bg0, ink)`：向对应强调色混一档再重新守卫；dark·soft 的 done 行因底色已贴 4.5:1，hover 会被守卫压回几乎同色（已知边界，不另做弹层） |
| 状态点 | 不变：`guard(fg.orange / fg.green, [bg, sidebar], 3)`（橙色 warning 点 / 绿色 done 点）；**2026-11-08 起** done 点随行底改为守卫后的 `fg.blue`（§22） |
| 选中行 | 仍用 `:not([aria-selected="true"])` 排除；**2026-10-24 晚起**选中态由常驻的 `src/active-session.js` 画成强调色底（2026-11-07 曾为森林绿，**2026-11-08 起为上游 `statusline1` 实色底 + `bg0` 文字**，§15 / §22），不再交给 DSH 的 `interactive-bg-hover` |

**落点**：`ColorModeRoles` 仍为 24 个角色（`rowWarn` / `rowWarnHover` / `rowDone` / `rowDoneHover` 改取 palette 值）；
规则集合（6 个属性块 + 26 条变量规则 + 8 条字面规则 = **40 条**；其中 6 条字面规则是 §13.8.1 的深色 warn 反相，另 2 条是标题内强调色 `inherit` 与引用块内边距）；新增 `readableRowFill()` 守卫，
OKLab 辅助函数已随派生方案一起移除。门禁 G13 覆盖 base + hover 四种底色上的正文 4.5:1；测试新增
「行底来自 palette 的 bg_red / bg_green（hard / medium 逐值相等；soft 只在 accent→bg0 连线上微调）」
「dark 行底保持红 / 绿方向」两项。（§13.8.1 之后 warn 改为 `bg_yellow`：来源校验改为 `bg_yellow → bg0 / fg.yellow` + 可见性下限，方向校验改为「暖黄 / 绿」。）

**边界**：light·soft 的表格绿染仍接近画布（旧边界，未动）；dark·soft 的 done hover 因 4.5:1 无余量而几乎不变；
样张与真机共用同一份 CSS，但不能替代真机目检。

### 13.8.1 2026-10-24 后续：待确认 / 待审批行改为黄色（`bg_yellow`）

> 触发：用户反馈「待回答或者待审批的背景色可以改成黄色吗？现在感觉红色就像是报错了一样」。

**问题**：§13.8 把「待确认」行底定为 palette1 的 `bg_red`。红底 + 橙点在工作区里读起来像错误 / 失败状态，
而这一行的语义只是「等你处理」。用户要求换成黄色。

**方案**：`ROW_RAMP.warn` 改为 `{ fill: 'bgYellow', accent: 'yellow' }`：

- 浅色档：底色取 palette `bg_yellow`；它与暖奶油画布几乎同明度（约 1 L*），所以新增 **可见性下限**
  `ROW_WARN_SEPARATION = 3.5`——向 `fg.yellow` 以 1% 步长加深，到 3.5 L* 或正文 4.5:1 门槛先到为止
  （`liftWarnFill()`）；该守卫只作用于 warning 行，done 行保持 §13.8 的取值；状态点仍是 `fg.orange`；
- 深色档（同日晚第二轮，用户看过浅色档后反馈「深色档再亮/更黄一点」）：palette 的 `bg_yellow`
  （`#45443C`/`#4D4C43`/`#55544A`）是低饱和橄榄色，在浅色 `label-primary` 下亮度已到 4.5:1 上限，
  再亮就会压到门槛以下。深色档因此**反相**：底色用 `mix(fg.yellow, bgDim, 0.22)` 的亮琥珀，
  行内文字改用方案的深色对比墨 `--dsw-alias-label-primary-inverted`（= `bgDim`），并由 6 条深色作用域规则
  让行本体 / 标题 / 尾标（`[class*="_time"]`）/ 状态点 / 行尾控件（第三轮补 `_iconButton` / `_pinIndicator`）一起继承；浅色档完全不反相（仍是深墨 + 淡黄底）。

**实测**（`colorModeRoles()`）：

| 变体 | 行底 | 行内文字色 | L* vs 侧栏 | 文字对比度 |
|---|---|---|---:|---:|
| light-hard | `#FBEAC0` | `label-primary` `#5C6A72` | 3.64 | 4.69 |
| light-medium | `#F8E6BB` | `label-primary` | 3.25（文本门槛先到） | 4.53 |
| light-soft | `#F2E6C9` | `label-primary` | 0.04（画布已贴门槛，只保留色相） | 4.51 |
| dark-hard | `#B19A6B`（亮琥珀） | `inverted` `#1E2326` | 31.8 | 5.82 |
| dark-medium | `#B39C6D`（亮琥珀） | `inverted` `#232A2E` | 29.8 | 5.47 |
| dark-soft | `#B49D6F`（亮琥珀） | `inverted` `#293136` | 27.7 | 5.04 |

hover 在行底基础上向 `fg.yellow` 混 16% 后重新守卫（light `#F9E6B5` / `#F8E6B9` / `#F2E6C7`；
dark `#B89F6E` / `#B9A170` / `#BAA272`，深墨对比度 6.21 / 5.82 / 5.36）。

**为什么浅色档不能更黄**：`label-primary` 已贴着 4.5:1（light·medium 4.53、light·soft 4.51），再深就把行内正文
压到门槛以下；这是 §13.7 记录的浅色边界，与 active-session（§15）同源。深色档的 `bg_yellow` 本身就是低饱和
橄榄黄——Everforest 的深色背景都压过 chroma，这正是第一轮「黄但不够亮」的原因；第二轮用反相（亮底 + 深墨）
把亮度上限从「浅色文字能读」换到「深色文字能读」，才得到真正的黄色。两档语义因此统一为
「黄色表面 + 深色字」，只是深色档的黄色比 palette 的 `bg_yellow` 更亮。

**验证**：浅色档用真机热替换后的 DOM 探针取色（探针读取后移除，不改界面）：warning 行底色
`rgb(251,234,192)` = `#FBEAC0`，done 行当时仍是 `rgb(243,245,217)` = `#F3F5D9`（2026-11-08 起改为 `bg_blue` 派生的淡蓝，§22），warning + 选中行显示
active-session 的**当时**蓝色底 `rgb(220,236,233)`（选中态优先；2026-11-07 改为绿色强调底、2026-11-08 起为 `statusline1` 实色绿底，§15）。深色档在用户把外观切到深色后同样在真机 DOM 里探针取色（dark·soft，
探针读取后移除）：warning 行底 `rgb(180,157,111)` = `#B49D6F`（亮琥珀），行文字 / 尾标 / 状态点
均为 `rgb(41,49,54)` = `#293136`（`label-primary-inverted`），与「真实 token + 真实 DSH 行 CSS」的
Chrome 渲染样张一致（样张见 `.tmp/active-row-shots/warn-final-*.png`、前后对照
`warn-dark-before-after.png`）；Light 档的探针结果与第一轮相同。

**hover 图标（2026-10-24 第三轮，用户反馈「hover 上去的时候后面的 icon 有点看不见」）**：DSH 会话行在 hover 时
展开行尾操作（「…」菜单 / 归档 / 置顶），这些按钮用 `label-tertiary` / `label-primary` 上色，在琥珀底上会消失。
深色反相规则因此一并覆盖行尾控件：`[class*="_iconButton"]`（含 `:hover`）与 `[class*="_pinIndicator"]`
也改用 `label-primary-inverted`。真机（dark·soft）探针：图标 / 置顶颜色由原 `rgb(157,169,160)` 变为
`rgb(41,49,54)`，与行底 `rgb(180,157,111)` 对比 5.0:1。

**落点与门禁**：改动都在 `src/color-mode.js`（`ROW_RAMP`、`ROW_WARN_SEPARATION`、`ROW_WARN_AMBER`、
`liftWarnFill()` / `readableDeepInk()`、`DARK_WARN_ROW` 三条深色作用域规则；import `labLightness`），
`token 层与 24 个角色数量不变`（深色 warn 只是取值改为琥珀）。`tests/color-mode.test.mjs` 更新快照
（warn / hover 六档）、来源校验（done 走 `bg_blue → bg0 / fg.blue`（2026-11-08 起；此前为 `bg_green → bg0`）；light warn 走 `bg_yellow → bg0 / fg.yellow`；
dark warn 走 `fg.yellow → bgDim` 且深色文字 4.5:1）、方向校验（dark warn 由「橄榄」改为「红>绿>蓝的琥珀」）、
字面规则校验（8 条字面规则：2 条基础 + 6 条深色反相）与「深色 warn 必须反相」断言；`scripts/check-contrast.mjs` 的 G13 按 scheme
选择文字色（light `label-primary`、dark `label-primary-inverted`）继续守 4.5:1；
`docs/reference/contrast.md` §2f 重新生成。

### 13.9 2026-10-24 色彩模式改为默认提供（移除设置开关）

**用户要求**：把设置里的「色彩模式」选项去掉，作为默认提供的功能（同日早先的口径是「实验性、默认开启、可在设置页关闭」，见 [`assessment.md`](assessment.md) §16）。

**变更**

| 项 | 0.4.0（发布时） | 2026-10-24 起 |
|---|---|---|
| 开关 | 设置页「色彩模式」区块：标题 + 说明 + `role="switch"` + 5 个强调色装饰片 | 整块删除；设置页只剩标题、外观三卡、两个强度分组、当前选择行 + 恢复默认 |
| locale | 23 键（含 `colorMode.title/desc/on/off/switch`） | 18 键（5 个 `colorMode.*` 键中英同步删除） |
| 客户端状态 | `{ light, dark, colorMode }` | `{ light, dark }` |
| Host `Config` | 三个 volatile 字段（多一个 `colorMode` 布尔） | 只有 `light` / `dark` 两个 volatile 字段 |
| 首帧缓存 | `{ version, light, dark, colorMode? }` | `{ version: 1, light, dark }`（`STATE_VERSION` 仍为 1） |
| boot payload | 只含两个强度 | 只含两个强度（不变） |
| `<html>` 属性 | `data-everforest-color-mode` = `on` / `off` | 恒为 `on`，仅作 CSS 作用域锚点（不再表示开关状态） |
| dev 面板 | 含色彩模式开关行 + 页脚「色彩模式 开/关」 | 两者删除（面板保留外观 + 两个强度分组 + 当前摘要 / 恢复默认 / DEV 构建页脚） |

**明确不变**：本次变更不动 token 层（`tokensFor()` 输出与之前逐字节一致），也不动 `src/color-mode.js` 的 24 个角色色值、40 条作用域 CSS 规则、取值公式与 G9–G16 门槛——只把「模式是否启用」从开关改成恒开；CSS 选择器前缀与 `data-everforest-*` 属性名不变（锚点保留，若将来需要恢复开关可零改动启用）。

**兼容性（旧缓存 / 旧 patch）**

- 0.4.x 的 localStorage 缓存里多出的 `colorMode` 字段：读取时忽略（`{ version: 1, light, dark, colorMode }` 仍合法），不触发修复重写，下次写入自然丢弃。
- profile patch 里残留的 `colorMode` 键：当前 `Config` schema 不认识它，schemastery 忽略未知键 → 校验通过、值被忽略；插件既不会读它，也不会主动 unset（**无需手改 patch**）。
- 迁移（seed）/ `isDefaultState` / 「恢复默认」都只涉及两个强度；0.3.x 旧缓存继续按老规则播种。
- Host snapshot 的 `user` 层若只含旧 `colorMode` 键，仍按「有用户层」处理（不播种），两个强度取 schema 默认值，与宿主解析结果一致。

**取舍**：不保留「隐藏入口 / 高级设置 / 环境变量开关」——用户明确要求设置里不出现该选项。移除开关后没有单独关闭色彩模式的入口，若不想内容层着色只能停用插件（会同时失去配色主题），见 §13.7 第 5 条。当时版本号保持 0.4.0、未发布；这批改动最终随 **1.0.0（2026-10-25）** 发布，`CHANGELOG.md` 记为 `## [1.0.0]`（随该版一起还发布当前会话行 / 文本选区 / 聚光灯 / dev 面板，见 §14–§17）。

**实现清单**：`src/settings-page.js`（删区块与相关 store 动作）、`src/locale.js`（删 5 键，23 → 18）、`src/state.js`（state / 缓存 / 默认值两字段化，旧字段兼容读取）、`src/durable.js`（Host / cache 归一化与播种只看两个强度）、`src/host-config.js`（`Config` 两字段）、`src/client-entry.js`（不再有 `setColorMode`，`<html>` 属性恒写）、`src/dev-panel.js`（删开关行与页脚状态行）；对应测试同步。文档：本文件 §1 / §2 / §3.2 / §6 / §7 / §9 / §13.4 / §13.9 / §14 / §15 / §16.2、[`assessment.md`](assessment.md) §18、`CHANGELOG.md`（该批改动最终记入 `[1.0.0]`）、`README.md` / `README.en.md`、[`releasing.md`](releasing.md)、[`reference/palette.md`](reference/palette.md)、`scripts/check-contrast.mjs` 报告文案与重新生成的 [`reference/contrast.md`](reference/contrast.md)。

**验证**：`node scripts/check-contrast.mjs --check` 通过（`docs/reference/contrast.md` 由脚本重新生成）；设置页 / state / durable / host-boot / integration / dev 面板测试同步覆盖本次变更（键集 18、旧缓存与旧 patch 的兼容读取、dev 面板无开关行）。全量门禁由 Lead 在 src 全部落定后复核。

## 14. 2026-10-24 开发期调试面板（dev-only 构建）

**问题**：调 6 套配色与外观时必须反复打开 Settings → Everforest，每次切换都打断主界面上的调试。

**方案**：一块挂在主界面的浮动面板，复用设置页的同一个 store，**只存在于 `npm run build:dev` 的产物**。

- **入口**：`src/dev-panel.js`（新增，仅开发构建打包）+ `src/client-entry.js` 中两处 `// @dev-only:` 标记段（`import` 与挂载）。生产构建把标记段内容与整个模块一起剥掉，发布产物里没有面板代码、没有额外 DOM、也没有新增 locale 条目。
- **落点**：`shell.overlay`——DSH 的 frame-wide 浮动层（`slots.register({ name: 'shell.overlay', id: 'everforest-dev', order: 100 }, DevPanel)`）。该层本身 click-through，面板在自己的根节点上开 `pointer-events: auto`；`order: 100` 排在已发布 toast 之后。
- **内容**：外观（浅色 / 深色 / 跟随系统，顺序与设置页一致）、深色与浅色各 3 档强度（色块取自 `RAMPS[scheme][strength].bg0` + `FOREGROUNDS[scheme].fg`，只作色卡装饰）、当前状态摘要与「恢复默认」。面板用标题栏拖动、可折叠成 38px 圆钮，位置与折叠状态存 `localStorage`（键 `dsh-everforest/dev-panel/v1`，非法/不可读时回退右下角默认位置）。
- **零新状态、零新持久化**：所有操作走设置页的同一个 store（`select` / `reset` / `setPreference`），因此 Host 配置写入、首帧缓存、跨窗口广播、Appearance 写 DSH 全局偏好的行为与设置页完全一致，不存在第二套真源。
- **构建门禁**：`scripts/build.mjs` 新增 `--dev`（`npm run build:dev`）：开发组合多出 `dev-panel.js` 与标记段内容，并在产物首行加 `DEVELOPMENT BUILD` 注释；`stripDevBlocks()` 负责生产构建的剥离，标记不成对（多一个 start / end、嵌套）直接构建失败。`--check` 只校验生产组合，若 `client.js` 是开发产物则报错并提示先 `npm run build`；`--check --dev` 直接拒绝。因此 `npm run check`、CI 与 `prepack` 都会拦住误提交 / 误发布。
- **热替换**：DSH 的 Client HMR 轮询 bundle 产物（`dsh-client-hmr`，~500ms），`npm run build:dev` 后无需刷新页面，面板即出现在主界面；`npm run build` 后自动移除。
- **测试**：`tests/dev-panel.test.mjs`（16 项：面板渲染、交互、折叠 / 拖动持久化、坏 `localStorage` 兜底、标记剥离、两种组合的内容与语法、生产产物无面板、`--check` 拒绝开发构建）；`tests/integration.test.mjs` 新增 dev-bundle 用例（注册 `shell.overlay`、渲染面板、点色卡重栈 token 层）。
- **真机验收（2026-10-24，Desktop 1294×857，dark·soft）**：HMR 热替换后面板出现；用 Windows UI Automation 驱动面板点击：`深色硬` → 面板状态 `深色 硬` 且 Host `cordis.patch.yml` 写 `dark: hard`；`关闭色彩模式` → `colorMode: false`（该开关行与页脚「色彩模式 开/关」已于同日晚随设置页区块一起移除，见 §13.9）；`浅色中` → `light: medium` 且整体外观切到 light；`恢复默认` → Host 覆盖行被 unset；`深色外观` → `ui-theme` 的 `preference: dark` 复原。窗口采样像素 dark·soft `#333C43` → dark·hard `#272E33` → 复原 `#333C43`，证明面板驱动的是真实 token 层。
- **折叠态样式回归修复（2026-10-24，用户反馈「点最小化后跑到最左上角、点不出来」）**：`<style>` 原先只随展开树渲染，折叠时被一起卸载 → 圆钮退回无样式 `<button>`，落进 click-through 的 `shell.overlay` 文档流左上角，并继承 `pointer-events: none`，鼠标无法命中（UIA 的 Invoke 仍可用，表现为「看得见/看不见但点不到」）。修复：① 样式表在两种状态都渲染（组件返回 `[<style>, 面板或圆钮]`）；② `position: fixed` / `left` / `top` / `z-index` / `pointer-events: auto` 作为内联兜底，任何一次缺样式都不再逃逸或失去点击；③ 折叠位置同样走视口 clamp。`tests/dev-panel.test.mjs` 增加回归断言（折叠态仍有样式表与内联结构性样式）。真机鼠标走通：展开 → 折叠（38×38 圆形留在原位置）→ 再展开。

### 14.1 已知边界

- 面板只存在于开发构建；若另一并行会话在同一工作树里重建 `client.js`（发布构建），热替换后圆钮/面板会消失，需要再 `npm run build:dev` 一次。
- 圆钮/面板位置按 `left/top` 还原；窗口大幅缩小后由 clamp 拉回可见区，但不会自动重新贴靠右下角。
- **约束**：开发产物不可提交（`--check` / CI / `prepack` 会拦）；面板文案不经过 locale 服务（开发者工具，避免给发布产物增字典，且 locale 挂载失败时仍要能渲染）；改动 `src/` 后开发期间必须先 `npm run build:dev` 才看得到面板。

## 15. 2026-10-24 工作区当前会话行（active-session；2026-11-08 改为实色强调绿）

> 触发：用户反馈「工作区里选中的 tab 激活显示效果不明显，深色模式和浅色模式下都不明显；同时要和『已完成 / 待回答』状态下的颜色区分开」。
> **2026-11-08 更新（现行行为，第三轮）**：用户先贴 Everforest 官方 Neovim 活动 tab 裁图，要求「选中的不需要左边的边框显示，直接绿色显示，不改变绿色的透明度了」；
> 同日第二轮又要求「浅色目录名称还是用原绿色」「发送按钮的绿色感觉也有点不一样」——全部绿色 UI 曾收敛到 `fg.green`；
> 同日第三轮用户再贴浅色裁图（`#93B259` 底）指出「浅色模式的绿色不对…绿色应该是浅绿色」，于是**现行**取值 = 上游交互绿 `statusline1`
> （dark `#A7C080` / light `#93B259`），选中行与发送按钮 / 角标 / 下拉选中项共用它；目录名称另取文字绿 `green`（浅色 `#8DA101`、深色同值，见 §25.6；会话标题 2026-11-09 起回 `label-primary`，见 §27）。3px 行首竖条与「先守卫再可见」的混色算法一并移除；
> 「已完成未读」行改回 palette1 `bg_blue` 蓝底（§22.2），绿色只属于当前会话与交互强调。第三轮细节（含时间 / 图标不可见的 bug）见 §23。

**问题**：`@deepseek-ai/dsh-client-ui-workspace` 的 `Rows` CSS 模块把「选中」与 hover 合并成同一条规则：
`.wnFoaW_sessionRow:hover,.wnFoaW_sessionRow.wnFoaW_selected{background:var(--dsw-alias-interactive-bg-hover)}`
（0.2.1-rc.3 / 0.2.2-rc.1 安装包与真机 DOM 均核对过）。该 token 只是 `bg5` 的 16% alpha overlay，对侧栏只有约 2.6 L* 的
步长；打开中的会话既难找到、又与 hover 完全等价（§13.8 当时把选中行「完全交还 DSH」，本版按用户新反馈改回）。

**方案**：`src/active-session.js`（纯 ESM，无 DOM / 无状态），由 `src/client-entry.js` 安装一张**常驻**
`<style>`（与 `src/selection.js` 同一注入模式，`data-plugin-css="dsh-everforest/active-session"`）。选择器只用稳定锚点：
`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`（`role` / `data-row-key` / `aria-selected` 都是
DSH 的 a11y 契约，不用 CSS modules 哈希类名）。不使用 `!important`；特异性高于上游 `:hover` / `.selected` 规则，
因此选中行恒为实色绿底（hover / 菜单打开 / 拖拽插入标记都不受影响）。

**取值**（`activeSessionRoles()`，6 档 = 两个 palette 值，零推导）：

| 项 | 取值 | 说明 |
|---|---|---|
| 行底 | 该 scheme 的 `statusline1`：dark `#A7C080`、light `#93B259` | 与发送按钮 / 下拉选中项同一个交互强调色；目录名称用文字绿 `green`（§25.6；标题自 2026-11-09 起回 `label-primary`，§27）；实色、不混色、不设透明度 |
| 文字 | 该变体的 `ramp.bg0`：light `#FFFBEF` / `#FDF6E3` / `#F3EAD3`，dark `#272E33` / `#2D353B` / `#333C43` | 强调实底 + 画布墨的既定配对（按钮 / 角标同款），也是上游参考 tab 的配对 |
| 行内灰字 | 规则把行内直接子 `span`、`[class*="time"]`、`[class*="pinIndicator"]`、`[class*="iconButton"]`、`button`、`svg:not([data-state])`、`[data-state="ongoing"]` **显式**写成墨色（不是 `inherit`） | DSH 给状态槽 / 时间 / pin / hover 操作按钮都写了 `label-tertiary` / `label-caption`，在实色绿底上只剩 1.2–1.6:1；`rowResting` / `rowActions` 自己带灰，`inherit` 会被那一层截断（2026-11-08 第三轮修复，见 §23.2）；运行中的加载 spinner 是中性灰（`label-tertiary`，不是语义色），一并改成墨色（第四轮，见 §23.6） |
| 状态点 | 保持语义色（未被覆盖） | 状态点是独立图形、不是绿底上的文字；选中行通常是已读状态，点本身多为空。例外：`data-state="ongoing"` 的加载 spinner 是中性环（DSH 用 `label-tertiary`），已改为行墨色（§23.6） |

实测（2026-11-08 第三轮，现行）：

| 变体 | fill | ink | 墨色对比度 | 与侧栏 L* 步长 | 门槛 |
|---|---|---|---:|---:|---:|
| light-hard | `#93B259` | `#FFFBEF` | 2.32 | 28.1 | 1.95 |
| light-medium | `#93B259` | `#FDF6E3` | 2.22 | 26.4 | 1.95 |
| light-soft | `#93B259` | `#F3EAD3` | 2.00 | 23.0 | 1.95 |
| dark-hard | `#A7C080` | `#272E33` | 6.88 | 52.5 | 4.5 |
| dark-medium | `#A7C080` | `#2D353B` | 6.23 | 49.4 | 4.5 |
| dark-soft | `#A7C080` | `#333C43` | 5.62 | 46.4 | 4.5 |

**为什么是实色 `statusline1`**：2026-11-07 的强调色归位已把品牌 / 交互强调统一到绿色（§21）；2026-11-08 用户先按参考图要求
选中行「直接绿色显示、不要透明度、不要左边框」，第三轮又指出浅色档「绿色应该是浅绿色」——而参考图里 tab 底正是上游 `statusline1`
（`palette.md`：Menu Selection Background / Tab Line Label Background (active)）。因此选中行与发送按钮 / 角标 /
下拉选中项共用 `statusline1` 原值：dark `#A7C080`（与 `green` 同值）、light `#93B259`；目录名称另取文字绿 `green`（浅色 `#8DA101`，§25.6；标题自 2026-11-09 起回 DSH 的 `label-primary`，§27）。**不再**混入画布制造「淡绿」，也不再加 3px 竖条。

**对比度取舍**：深色三档是 WCAG AA 配对（5.62–6.88:1）。浅色三档是上游参考 tab 的同一配对——浅色调色板里最亮的墨色就是画布
`bg0`，与 `statusline1` 只有 2.00–2.32:1，没有任何更深的浅色墨可用。G17 因此按 scheme 分开：深色要求 ≥4.5:1，浅色固定 1.95 的**已记录下限**
（`docs/reference/contrast.md` §2g）。这是为「全部绿色 UI 使用同一 accent」接受的偏差；若以后要求浅色也达 AA，只能改用不属于浅色调色板的深墨，
或放弃实色绿底。

**与色彩模式的关系**：**常驻**、与色彩模式无关（色彩模式自 2026-10-24 起也没有设置开关）——导航可见性不属于
「内容着色」，与 `selection.js` 同级。2026-11-08 同批改动把「已完成未读」行改回蓝色（§22.2），所以绿色不再与状态行撞色。
因此 0.4.0 文档里「色彩模式关闭 = 与 0.3.0 逐字节一致」的表述在本版不再成立：token 层与 markdown 内容仍与基线一致，
但选中会话行、目录名称与下拉选中项是本版新增的常驻样式（会话标题的绿色已于 2026-11-09 按用户要求撤掉，见 §27）。

**边界**：浅色三档 2.00–2.32:1 的墨色对比是统一 accent 的取舍（上游参考 tab 也是同一配对）；选中行同时带 warning / done 状态时，状态行底仍被
`:not([aria-selected="true"])` 排除、显示绿底，状态由状态点表达；`aria-selected` 是唯一的选中锚点，若未来 DSH 改用它表示别的含义需要复核。

**落点与门禁**：`src/active-session.js`（`activeSessionRoles()` 返回 `{ fill, ink }`，规则 = 每个变体 3 条，共 18 条：实色底 + 行内显式墨色 + 操作按钮 hover/focus 薄雾）；
`src/client-entry.js` 的注入段注释同步。测试 `tests/active-session.test.mjs`（8 项：6 档 fill/ink 钉死、fill/ink 必须等于 palette 原值、
深色 ≥4.5 与浅色 1.95 记录值、无竖条 / 无混色 / 无透明度、与 color-mode 蓝 / 黄行拉开距离、每变体 3 条规则 + 选择器回归（7 条墨色选择器含 `[data-state="ongoing"]`、每条只出现一次行锚点、无 `color: inherit`、hover 薄雾 = 墨色 16% 且不含实底 token）、
加载 spinner 取墨色而语义状态点不被覆盖、无 `!important` 且不受色彩模式门控）；`scripts/check-contrast.mjs` 的 **G17** 按 scheme 判定并写入报告 §2g。

**真机验收（2026-10-24 晚，Desktop 1294×857，light·hard 与 dark·soft）**：`npm run build:dev` 热替换后，
在真实 DSH 窗口确认选中会话行底色为当时 §2g 的表格值（light·hard `#DCECE9`、dark·soft `#3F5764`，当时是蓝色方案），与
「待回答」黄底 / 「已完成」绿底并排时可一眼区分，hover 其他行不再与选中态混淆；样张见 `.tmp/active-row-shots/`。
**2026-11-07 更新**：随强调色归位改为绿色强调底（light·hard `#E9EAC2`、dark·soft `#4B564F`）。
**2026-11-08 更新（第三轮，现行）**：改为实色 `statusline1`（light `#93B259`、dark `#A7C080`）+ 画布 `bg0` 文字，移除 3px 竖条；
同日第二轮曾补上时间单元格的墨色继承，但选择器拼接 bug 让 `[class*="time"]` 等规则一条都没生效；第三轮改成显式墨色 + 单次作用域前缀（§23.2）。
见 `.tmp/accent-preview/` 的对照样张。
**注**：本工作树可能同时被另一并行会话构建，热替换以最终 `npm run build` 的产物为准。

## 16. 2026-10-24 UI 强调色切换与文本选区

### 16.1 UI 强调色改用官方 palette accent

> 2026-11-07 更新：品牌 / 交互强调当日改为 `fg.green`（参考官方 Everforest 截图里的 statusline1 / green 家族），见 §21；2026-11-08 第三轮起再改为上游 `statusline1`（§23）。本节保留 2026-10-24 的 aqua 决策记录。

**背景**：0.2.x 起 UI 强调色（品牌 / 主按钮 / 链接 / 深潜标签 / 危险 hover）沿用 Enchanted 的
`header-aqua` / `header-blue` 中间调——比官方 accent 更闷，但在深浅两套背景上都能用。2026-10-24 的
对照样张（`.tmp/palette-review/`，5 组可调整项）经用户目检后选定「官方 fg accent」一版，
`header-*` 的使用面收起，只保留给 onboarding 渐变、shiki link 与浅色气泡染色。

**改动**（`src/tokens.js`，15 个 token；`src/settings-page.js` 色卡同步）：

| 用途 | token | 原值 | 现值 |
|---|---|---|---|
| 品牌 / 主按钮 | `brand-primary`、`brand-primary-new-color`（实际 CSS 变量名带上游重复后缀：`--dsw-alias-brand-primary-new-colorprimary-new-color`）、`button-primary-fill` | `header-aqua` | `aqua` |
| 主按钮 dimmed | `button-primary-dimmed` | `mix(header-aqua, surface(2), 45%)` | `mix(aqua, surface(2), 45%)` |
| 主按钮 hover / info | `button-primary-hover`、`button-info-fill` / `-hover` | `header-blue` | `blue`（hover 向亮端提亮 18%） |
| 链接 / 文本强调 | `link`、`label-primary-bluish`、`label-deep-diving`(+shimmer) | `header-blue` | `blue` |
| 交互 | `interactive-bg-hover-accent`、`sidebar-nav-item-active-accent` | `alpha(headerAqua, …)` | `alpha(aqua, …)` |
| 危险交互 | `interactive-bg-hover-danger` | `alpha(headerRed, 12%)` | `alpha(red, 12%)` |
| Onboarding | `onboarding-accent` | `header-aqua` | `aqua`（3 个渐变 stops 仍是 `header-*` 装饰） |
| 设置页色卡 | 第 5 段 | `header-aqua` | `aqua`（预览与真实强调一致） |

**对比度**（官方 accent 两套固定）：dark `aqua #83C092` / `blue #7FBBB3` / `red #E67E80`；light
`aqua #35A77C` / `blue #3A94C5` / `red #F85552`。品牌前景 `bg0` on 品牌底：dark 5.31、light 2.91
（原 headerAqua 3.48 / 3.13），仍高于 G4 的 2.5:1 门槛；链接类对比度反而提高（dark blue on bg0 5.17，
原 3.28）。**浅色品牌按钮文字 2.91:1 是这轮唯一负向变化**，用户目检接受，不再保留 header 版本。

**门禁**：`tests/tokens.test.mjs`（brand / link 断言）、`tests/integration.test.mjs`（token 值快照与样式表计数）、
`tests/settings-page.test.mjs`（色卡第 5 段）同步更新；`docs/reference/contrast.md` 重新生成
（品牌前景行 3.13 → 2.91），`npm run check` 全绿。

### 16.2 原生文本选区（`::selection`）

**问题**：DSH ui-theme 声明了 `--dsw-alias-bg-document-selection`，但安装包 176 张样式表里没有任何
`::selection` 规则消费它（2026-10-24 用 DevTools 逐表核对，0 匹配），所以聊天 / 代码里的文字选中一直是
浏览器原生蓝底白字——token 层改不到它（用户报告「选中的文字还是蓝底白字」）。

**方案**：新增 `src/selection.js`（纯 ESM，无 DOM / 状态），由 `src/client-entry.js` 在 token 层后注入
一条常驻 `<style data-plugin-css="dsh-everforest/selection">`，六档各一条规则：

```css
html[data-everforest-light="hard"] body:not([data-ds-dark-theme]) ::selection {
  background-color: #DED8DB;   /* 各档 bg_visual；light 统一 Enchanted 修正值 */
  color: inherit;              /* 保留元素自身颜色 */
}
```

- 底色取各变体的 `bg_visual`：light 三档统一 `#DED8DB`；dark hard / medium / soft 依次
  `#4C3743` / `#543A48` / `#5C3F4F`。强度跟随 `<html>` 上的 `data-everforest-light/dark`，深浅由
  `body[data-ds-dark-theme]` 区分；与色彩模式无关（该功能自 2026-10-24 起已无开关），与 `src/active-session.js` 同级常驻。
- **`color: inherit` 是用户反馈后的修正**：第一版写死 `color: <fg>`，选中后代码语法色 / 链接色 / 色彩模式
  标题色全部变成同一种墨色（用户：「选中的文字颜色全部变成一样的」）。改为 `inherit` 后每个元素保留自身颜色，
  与 Enchanted 的行为一致；真机用 `getComputedStyle(el, '::selection').color` 在 h2 / strong / 行内 code 上
  核对均等于元素自身颜色（如 light h2 `rgb(216,121,52)`、行内 code `rgb(58,148,197)`）。
- `--dsw-alias-bg-document-selection` 的 40% 透明语义**未改**，仍只服务文档预览；原生选区是另一个入口。
- 构建：`scripts/build.mjs` 的 `SOURCES` 在 `color-mode.js` 之后增加 `selection.js`；新增
  `tests/selection.test.mjs`（4 项：六档规则与底色、`color: inherit`、light `#DED8DB`、与色彩模式解耦）；
  `tests/integration.test.mjs` 的样式表计数同步为常驻 4 张 / 含设置页 5 张（2026-11-08 起常驻 6 / 含设置页 7，见 §22），并断言 selection 样式表注入。
- 边界：`::selection` 只改选区底色 / 文字颜色，不动 `user-select` 与复制行为；若 DSH 将来自己声明
  `::selection`，本规则的 `html[...] body[...]` 作用域优先级更高；当前安装包内未发现其他作者选区样式。

## 17. 2026-10-24/25 深浅切换聚光灯（theme-spotlight）

> 触发：2026-10-24 用户要求「先做一个出来看看效果」；同日四轮收敛——①先交付可目检原型、②改为聚光灯式圆形揭示、③修掉浅→深结束闪白、④去掉同色系软/硬切换的渐变。**2026-10-25 追加第⑤轮**：用户问「跟随系统自动切换时会有这个效果吗」，于是把 `system` 跟随下的 OS 翻转也接进同一揭示（§17.1）。原型阶段按用户要求只记 `CHANGELOG.md`，本节是验收后补的正式记录（`CHANGELOG.md` 的 1.0.0 / Unreleased 段）。

**问题**

深浅切换原先只是整套 token 的瞬换（`ThemePresenter.apply()` 一次性替换 body 内联变量）。要过渡观感，但两条直觉做法都不可接受：

1. **颜色插值**（每个颜色从旧值渐到新值）：深浅互换中途文字与画布等亮度，实测 50% 处仅 **1.01:1**，整页发灰（`src/theme-spotlight.js` L23–27）。
2. **镜像揭示**（旧主题快照放上层、向点击点收缩）：View Transition 拆除快照时，clip 动画结束与伪元素移除之间会产生无裁剪的一帧，旧快照整帧露出；浅→深时旧快照正是浅色页，结束瞬间闪白——真机 screencast **5 次复现 4 次**（`src/theme-spotlight.js` L10–21；`CHANGELOG.md` 1.0.0「主题切换过渡」段）。

**方案：View Transitions + `clip-path: circle()`，「新主题在上层」**

- 控制器 `createThemeSpotlight()`（`src/theme-spotlight.js` L149–300）：在 `document.startViewTransition(change)` 内执行真正的换色；`transition.ready` 后对 `documentElement` 做 Web Animations 的 `clip-path` 动画，从点击点 `circle(0px at X Y)` 扩张到覆盖最远角的半径 `hypot(max(x, W-x), max(y, H-y))`。
- **只裁新快照**：动画挂在 `pseudoElement: '::view-transition-new(root)'`。旧快照留在底层且永不参与动画——即使结束掉一帧裁剪，露出的也是目标主题，结构上不会闪错色。
- 一张常驻样式表关掉 UA 默认 cross-fade（cross-fade 同样经过灰色中点）：`::view-transition-old/new(root){animation:none; mix-blend-mode:normal}`，层级固定 `old: z-index 1` / `new: z-index 9999`；由 `src/client-entry.js` 在 token 层之前注入，`data-plugin-css="dsh-everforest/theme-spotlight"`（`src/client-entry.js` L218–229）。
- 实现同 rspress 的外观切换（`web-infra-dev/rspress#1270`）。

**为什么不用镜像做法 / 不用颜色插值**

- 镜像：View Transition 拆卸快照与 clip 结束不同步，旧快照会被无裁剪画一帧 → 浅→深闪白；所以揭示方向统一为「**新**主题从点击点扩张」，浅→深与深→浅共用同一套层级（`tests/theme-spotlight.test.mjs` 断言两个方向的 `pseudoElement` 都是 new）。
- 插值：1.01:1 发灰（见上）；圆形揭示只在移动边缘混合像素，正文全程可读。
- 单靠 `fill: 'forwards'` 不够：Chromium 仍可能在 fill 生效前画一帧未裁剪快照，修复点是层级而非 fill 模式。

**覆盖范围（哪些入口有动画）**

| 入口 | 接线 | 证据 |
|---|---|---|
| 插件自己的色卡（跨深浅切换） | `select()` 在 `spotlight.run()` 里同时做 token 重栈与 `ctx.theme.setTheme(scheme)`，一次过渡覆盖换色与 Appearance 写入 | `src/client-entry.js` L651–683 |
| 设置页外观控制（浅色/深色/跟随系统） | `setPreference()` → `ctx.theme.setTheme(preference)`，命中下面包装后的服务方法 | 同文件 L703–714 |
| DSH 自带 Appearance 行 | 在 ThemeRuntime 实例上包装 `setTheme`：仅 `light/dark/system` 且目标 scheme ≠ 当前 scheme 时进 `spotlight.run`，其余原样透传；同 scheme 写偏好短路、不建过渡；卸载时按「原方法是否自有属性」还原或删除 | 同文件 L244–279；`tests/integration.test.mjs` |
| OS 深浅色翻转（`system` 跟随） | 包装实例上的 `publish`：仅「旧快照偏好与新偏好都是 `system`、且解析出的 scheme 与当前不同」时进 `spotlight.run`（原点固定视口中心）；其余 publish（字体/字号、token 重栈、广播改偏好）原样透传；`spotlight.running` 时直通，不叠第二段过渡；卸载时同样还原 | 同文件 L281–323；`src/theme-spotlight.js` L123–139；`tests/integration.test.mjs` |
| 跨窗口广播（Host 配置变更） | 会改偏好（如 `dark → system`）的广播不满足「旧快照偏好也是 `system`」，保持瞬切 | 同上 |
| 同深浅内的强度切换（soft/medium/hard） | **瞬切**：原地 `applyLayer()`，不建过渡 | `src/client-entry.js` L671–675 |

**17.1 `system` 跟随下的 OS 翻转（2026-10-25 追加）**

- **为什么必须换钩子**：OS 深浅翻转不经过 `setTheme`。当前安装的 DSH 0.2.1-rc.5 里（ui-theme bundle 与 rc.3 逐字节相同），`ThemeRuntime` 在构造期持有 `matchMedia('(prefers-color-scheme: dark)')`，其 `change` 监听在偏好为 `system` 时直接调 `this.publish()`（`dsh-client-ui-theme/lib/client.js` 的监听 L1666–1680、`publish` L1877–1881，bundle 内）。包装 `setTheme` 看不到这次变更；等 `theme/change` 到达时旧帧已被 presenter 抹掉，无法再拍快照。
- **接缝 = 包装 `publish`**：`publish()` 内部才重建快照并同步 `emit('theme/change')`，而 `ThemePresenter.apply()` 就挂在这个 emit 上（`dsh-client-ui-layout/lib/client.js` L700–710）。把 `publish` 包进 `startViewTransition` 回调，就把整次重绘放进「旧帧已拍、新帧未拍」的窗口里——这是唯一够深的接缝。包装/还原手法与 `setTheme` 相同（类方法在原型上，删实例属性即恢复）。
- **窄门**：`shouldRevealSystemFlip(previous, preference)` 只在「偏好是 `system`、旧快照偏好也是 `system`、且解析出的 scheme 与旧帧不同」时放行；`spotlight.running` 时直通。于是字体/字号 publish、同深浅 token 重栈、以及**会改偏好**的 Host 广播（`dark → system`）都保持瞬切——与 1.0.0 的口径一致。点「跟随系统」若真的换色本来就由 `setTheme` 包装负责，`publish` 在 `running` 中不会再包一层。
- **原点**：OS 翻转没有点击，最后一次 `pointerdown` 可能是几分钟前的，因此显式 `run(change, { origin: 'center' })` 从视口中心扩张；`run()` 默认仍是指针原点，原有入口不受影响。
- **兜底与边界**：`prefers-reduced-motion` / 无 View Transitions / `resolveSchemePreference` 无法回答时 `run()` 同步执行，和原来一样瞬切；揭示进行中再翻一次 OS 会直通（与连点行为一致），结束后直接落在最新状态。
- **风险**：`publish` 是 DSH 内部方法（不在文档化 API 里），比 `setTheme` 更贴实现；DSH 升级若改名或改结构，`typeof` 守卫会让包装装不上 → 只有 OS 翻转退回瞬切，其余三个入口不受影响，也不会报错。

**瞬切兜底口径**（任何情况下都不丢用户操作）

- 不支持 View Transitions（`startViewTransition` 非函数）/ 没有 `Element.animate` / `prefers-reduced-motion: reduce` → `run()` 同步执行 `change()` 并返回 `false`。
- 重入（上一次揭示仍在跑）→ 同步执行，不叠加第二个 view transition。
- `startViewTransition` 抛错 / `ready` 不可用 → 同步执行，或由 `durationMs + 240` 的定时器收尾。
- 无 DOM（SSR / 单测）→ no-op 控制器。

**时长 / 原点**

- 时长 `SPOTLIGHT_DURATION_MS = 400`，缓动 `ease-in`；收尾定时器 400+240ms。
- 原点 = 最后一次 `pointerdown` 的 client 坐标，document 捕获阶段监听，插件自己的控件与 DSH Appearance 行都自动覆盖；无指针记录时从视口中心出发。
- OS 翻转没有点击位置（上一次 `pointerdown` 可能已过去很久），显式 `run(change, { origin: 'center' })` 忽略指针、从视口中心扩张。
- 终点半径取「点击点到最远角」的距离，保证整页覆盖。

**已知取舍**

1. 设置弹窗也参与快照；弹窗内的选中描边要等揭示结束后随 React 重渲染才更新。
2. Windows 原生标题栏 / 终端由页面快照覆盖，但原生窗口框架在揭示**开始**时就切色。
3. 只有「跨深浅」有动画：插件色卡、设置页外观控制、DSH 自带 Appearance 行，以及 `system` 跟随下的 OS 翻转；同深浅强度切换、会改偏好的跨窗口广播、reduced-motion、无 View Transitions 全部瞬切。
4. 旧的颜色渐变实现已整体删除：`src/theme-transition.js` 及其样式表、prepended `theme/change` 监听器、结束后的同值 token 重放、首屏动画守卫；`src/` 下已无该文件，`tests/integration.test.mjs` 断言只剩一个非 prepend 的 `theme/change` 监听器、`<html>` 上无 `data-everforest-transition`。
5. 键盘 / 无指针路径没有真实点击位置，揭示从视口中心开始。
6. OS 翻转的真机验收要手动切系统深浅色；自动化只能验证到「`publish` 被包住 → `startViewTransition` 启动 → 换色发生在回调内 → 从中心扩张」（§17.1、两个测试文件）。

**文件与测试清单**

- 新增 `src/theme-spotlight.js`（301 行：样式表 + 控制器 + `run()` 的 `origin` 选项 + 指针原点 + `resolveSchemePreference` + `shouldRevealSystemFlip`）。
- `src/client-entry.js`：import 与 5 段接线（卸载 `spotlight.dispose()`、样式表、原点跟踪、`setTheme` 包装与 `publish` 包装各自还原）、`select()`、`setPreference()`。
- `scripts/build.mjs` 的 `SOURCES` 已含 `theme-spotlight.js`（本轮未改）；`client.js` 已重新构建入库。
- `tests/theme-spotlight.test.mjs`（11 项：样式表禁用 cross-fade 与 z-order、`resolveSchemePreference`、`shouldRevealSystemFlip` 的窄门六分支、无 View Transitions 兜底、reduced motion、快照→换色→揭示顺序与中心原点/半径、两方向都从指针点扩张、`origin: 'center'` 忽略旧指针、重入、dispose、无 DOM）；`tests/integration.test.mjs` 覆盖同深浅瞬切、无 prepend 监听、无 `data-everforest-transition`、服务包装在无 View Transitions 时瞬切与卸载还原，以及本轮新增的「OS 翻转走揭示」与「其他 publish 仍瞬切 / setTheme 只揭示一次」两项。
- 常驻样式表共 4 张（含 `dsh-everforest/theme-spotlight`），含设置页样式共 5 张；2026-10-27 新增表格列宽样式表后为 5 / 6 张（§18）；2026-10-30 曾为设置导航图标加过一张样式表（5 / 7 张），2026-11-06 改走官方 `settings.section.icon` 槽位后删除，回到 5 / 6 张（§19）；2026-11-08 新增工作区目录名称样式表后为常驻 6 张 / 含设置页 7 张（§22）；同日插件更新弹窗与下拉选中项样式表后为 8 / 9 张，A7 删除目录名样式表后为 7 / 8 张，复核恢复后回到 8 / 9 张（§25）；同日聊天气泡样式表加入后为常驻 9 张 / 含设置页 10 张；2026-11-09 设置导航选中行（§26）与新会话首屏（§28）各加一张，**现行常驻 11 张 / 含设置页 12 张**（§12）。

**门禁**：`node --test` 全量 **224/224**（2026-10-25 追加跟随系统 OS 翻转后）与 `npm run check`（palette / build / contrast）全绿；本轮只动 Client 侧接线，token 层、24 个角色色值与 6 档强度均未改动。

## 18. 2026-10-27 表格边框与列宽拖动

**触发**：用户 2026-10-27 提出「优化一下聊天内容中的表格样式，比如加上边框，提供拖动表头边框控制列宽度的功能」。这推翻了 §13.1「表格边框不动」的旧口径，但**只推翻结论、不推翻理由**：当时否决的是**彩色**边框（彩色要 3:1 会被压成灰绿），本次外框与列线全部取中性 `border-l1..l3` 色阶，与 DSH 自己的 cell 分隔线同源，因此不触碰 §13.1 的取舍。

### 18.1 样式：中性色阶画框；fill 表框在滚动容器上，宽表框在 table 上

- **fill 表（<4 列）**：外框画在 `_tableScroll` 滚动包装层，不画在 `<table>` 上。DSH 的表格是 `border-collapse: collapse`，collapsed table 无法画圆角外框；包装层本身是 `overflow-x` 滚动容器，`border-radius` 会连带裁剪内容。
- **宽表（≥4 列，`md-table-wide`）**：DSH 的 `AssistantMarkdown.module.css` 给宽表包装层一条**出血（bleed）布局**：`width: calc(100% + lead + spare)`、`margin-left: calc(-1 * lead)`、`padding-left: lead`——包装层横跨整个聊天滚动区，负外边距把它左移，等量左内边距再把表格内容推回正文列左缘。包装层同时是横向滚动容器（DSH 默认 rest 隐藏、hover 才切成 `overflow-x: scroll`）。我们把它**重新装箱（re-box）**成 Element 表格式的固定视口：`width: max-content`（放得下时贴合表格）、`max-width: 100%`（右缘固定在正文列右缘，不伸进聊天区右侧留白）、`margin-left: 0`、`padding-left: 0`、`overflow-x: auto`、`padding-bottom: 0`。宽度 / 左外边距 / 左内边距**必须一起改**：只改 width 会把表格挤出正文列（见下的 2026-10-27 修正）。列宽保持 DSH 的自然长度，放不下时由包装层横向滚动（滚动条常驻在表格底部），而不是换行或裁到屏幕外。框仍然画在 `<table>` 自己身上（包装层画框会画出一个横跨出血区的空框）：框宽天然贴合表格、表格内容仍与正文列对齐；代价是宽表没有圆角（collapsed table 无法圆角），横向滚动时框的右边线会随内容滚出视口。
- **三层线宽/色阶**：外框 `.5px solid var(--dsw-alias-border-l3)`、列分隔 `.5px solid var(--dsw-alias-border-l2)`、行分隔沿用 DSH 自己的 `th` `.5px` `border-l3` / `td` `.5px` `border-l2`。外框比内线高一档，让表格在色带/斑马纹上仍有轮廓。DPR 1 下 `.5px` 栅格化为 1px 实色（与 DSH 现有细线一致）；DPR 2 下正好 1 设备像素。
- **收口**：`tbody tr:last-child > td` 去掉下边框，避免与外框叠成双线；最后一列去掉右线（外框负责）；恢复 DSH 为「无边框观感」删掉的首/末列 16px 内边距，文字不再贴框。
- **不选彩色**：理由见上，`border-l*` 是主题为边框准备的中性可读色，深色档已按 §4 提亮（`border-l3` dark = 90% 灰阶），浅色档为 `bg5` 75%。
- **滚动条改成常显（Element 表格式）**：DSH 原本在 rest 时给包装层 `padding-bottom: 5px` 的条位预留、hover 才切 `overflow-x: scroll`；2026-10-28 用户要求「显示不下就在下面出滚动条滚动」，因此重新装箱时固定 `overflow-x: auto` + `padding-bottom: 0`：表格放得下时不占高度也没有条，放不下时 5px 滚动条常驻在表格底部（不依赖 hover），两种情况高度都自然。条本身沿用 DSH/主题的滚动条配色（`::-webkit-scrollbar` 5px）。
- **2026-10-29 横向滚动条 hover 加粗 + 过渡动画**：先收到「当 hover 滚动条的时候，让滚动条稍微变粗一点，让用户更容易选中」，随后收到「加上变化的时候的过渡动画效果」。落地分两层——
  - **形状（样式表）**：条位（track）固定 10px，`::-webkit-scrollbar-thumb` 用 `border-bottom: var(--everforest-table-scrollbar-inset, 5px) solid transparent` + `background-clip: content-box` 把可见圆角条内缩成紧贴表格底边的 5px（位置与 1.2.0 完全一致）。track 高度恒定，所以任何时刻都**不产生布局位移**：表格、包装层高度、下方内容在 5px / 10px 两态逐像素相同。
  - **过渡（`src/table-scrollbar.js`）**：Chromium **不会**在滚动条伪元素上运行 CSS transition / animation——2026-10-29 探针给 `::-webkit-scrollbar-thumb` 写了 10s 的 `transition`，计算值显示已生效，但 `getAnimations()` 为空、像素上直接跳到终态。所以改由控制器逐帧写 inset：指针在原生滚动条上时事件仍派发给滚动条所属元素（document 级 `pointermove` 的 `target` 就是包装层），而写在包装层上的自定义属性会被该元素的滚动条伪元素继承，于是每帧把 inset 从 5px 缓动到 0（ease-out cubic，160ms），thumb 向下长满 10px；移开再反向收回。Blink 会把滚动条部件的边框宽取整到整 CSS 像素，DPR 1 下的过渡就是 5 → 4 → 3 → 2 → 1 → 0 六个绘制态（pill 5 → 10px）——平台能画的最细粒度，时长只决定这六步的间隔。
  - **否决的写法**：`::-webkit-scrollbar:hover` 在 Chromium 不匹配（指针停在 5px 条上条高不变）；`包装层:hover::-webkit-scrollbar` 会在鼠标经过表格任意位置时就加粗、并让包装层与下方内容跳 5px；在样式表里保留 `::-webkit-scrollbar-thumb:hover` 改 border 会瞬间跳变、把动画掐掉。`prefers-reduced-motion: reduce` 时控制器直接跳到终态；颜色始终是 DSH 的主题滚动条 token（`--dsh-scrollbar-thumb(-hover)`），控制器只动 inset，`background-clip: content-box` 由样式表兜住（防止主题给 thumb 加边框时把透明带画上颜色）。
  - **代价 / 边界**：可滚动表格的包装层比 1.2.0 高 5px（多出来的 5px 是可见条下方的透明轨道），表格之后的正文整体下移 5px；不可滚动 / fill 表不出现条，完全不受影响。非 Chromium（Firefox）走 DSH 的 `scrollbar-width: thin` 兜底，不会加粗（见 §18.5 第 7 条）。
- **2026-11-10 宽表滚动条下沿补线**：宽表外框按 §18.1 画在 `<table>` 上，滚动条在框外，所以条下方没有线；fill 表外框本来就在包装层上、滚动条已被框住，不需要改。用户要求滚动条下方也带边框，落地只加一条规则：`[class*="tableScroll"].md-table-wide::-webkit-scrollbar-track { border-bottom: .5px solid var(--dsw-alias-border-l3) }`。选择 track 边框而不是包装层边框 / 伪元素：track 只在表格真的溢出时存在，线因此与滚动条同生灭，不需要 JS 判定或观察器，也不占布局（不可滚动宽表完全没有变化）；`.5px` 边框与插件其它细线同一栅格化行为（DPR 1 → 1px 实色，DPR 2 → 1 设备像素）。实测 `background-image` 的 `.5px` 渐变停止点在 DPR 1 完全不绘制（2026-11-10 离线预览逐像素采样），所以用 border 不用渐变。thumb 的透明下内缩（静止可见 5px 的 pill）让线在静止状态下从条下方透出；hover 画满 10px 时线被 thumb 覆盖属预期。
- **2026-10-27 修正（用户反馈「表格错位」）**：第一版为了让宽表框贴住表格，给 `.md-table-wide` 覆盖了 `width: max-content; max-width: 100%`，但没动 DSH 的 `margin-left` / `padding-left`。结果包装层被压成 100% 宽（748px）、又被 `margin-left` 左移 `lead`（真机实测 389px）、内容区再被 `padding-left` 占掉后只剩约 360px：表格从右侧被裁掉（4 列只显示 3 列）、整个框左移——就是用户截图里的「错位」（截图实测：框 298→1046，表格从 683 开始、被裁在 1046）。修法：宽表框改画在 `<table>` 上，并加回归测试挡住「只覆盖宽度」这类半套改动。
- **2026-10-27 第二次修正（用户反馈「表格的下滚动条超出左边的位置」）**：上一版把 DSH 的 bleed 布局原样保留，宽表 hover 时的横向滚动条就落在包装层的 border box 上——包装层左缘在聊天滚动区左缘（正文列左缘再左移 `lead`），滚动条于是从表格左边 130+px 的地方开始（用户截图里条左端明显在框左缘之外）。修法即上面的重新装箱：包装层左缘 = 表格左缘，滚动条因此正好落在表格自己的宽度内（表格不超宽时与框等宽）。右侧额度当时先保留为 DSH 的出血量，第三次 / 第四次修正再逐步收紧到正文列右缘。回归测试改为钉住重新装箱的 4 条声明，并禁止其它规则再碰这四个属性；fill 表的包装层仍不得改动。
- **2026-10-27 第三次修正（用户反馈「很长的表格右边又超出显示范围」）**：DSH 给宽表设的是 `width: max-content`，所以表格比可用宽度还宽时保持自然宽度、被包装层在右缘裁掉，既看不到最后一列也看不到外框右边线。修法：给 `.md-table-wide > table` 加 `max-width: 100%`——放得下的宽表仍是自然宽度，放不下的把列内容换行收进可用宽度；锁定了列宽的宽表由 `onWrapperResize` 按「包装层宽 − 表格自身边框」重排并写回内联宽度。
- **2026-10-27 第四次修正（用户反馈「表格右边超出聊天内容最右边的显示区域」）**：第三次修正把上限放在「正文列 + 右侧留白」——真机 1280 窗口实测正文列右缘 1150.22px，表格右缘 1240.98px（超出 90.77px，4 列表格也超出 17.33px）。修法：包装层的 `max-width` 从 `calc(100% + var(--dsh-table-spare))` 收紧为 `100%`（表格的 `max-width: 100%` 不变）；同时给宽表单元格加 `min-width: 0`——DSH 的 `min-width: 100px` 再加 32px 内边距意味着 6 列最少要 792px，不解除这个下限，收紧后的上限对 6 列以上表格仍然无效（会再次被裁或滚动）。收紧后真机复测：4 张宽表右缘都不超过 1150.22（5 列 747.44px、右缘 1150.22，差值 0；4 列 733.44 / 747.44），`scrollWidth == clientWidth`，单元格 `min-width: 0`。
- **2026-10-28 第五次修正（用户反馈：要 Element 表格那样，列保持原长度、放不下出横向滚动条）**：第四次的「收窄换行 + 去掉 min-width 下限」会让窄列挤扁、行高变大，用户明确要列宽保持自然长度、容器固定在正文列内、超出时横向滚动。修法：撤掉表格的 `max-width: 100%` 与单元格 `min-width: 0`（恢复 DSH 的自然列宽 / 100px 下限），包装层固定 `overflow-x: auto` + `padding-bottom: 0`——放不下时出现常驻横向滚动条，可滚到所有列。真机 1280 窗口复测：4 张宽表的包装层都是 `747.44px`、右缘 `1150.22`（与正文右缘差值 0，不再伸进留白），表格保持自然宽 `1056.22 / 764.77 / 1192.47 / 1048.09px`，`scrollWidth > clientWidth` 且条高 5px，页面无横向溢出（`innerWidth 1280`）；列宽分配沿用 DSH 原有度量。
- **2026-11-04 最小列宽回调（用户反馈「第一列这种内容很少的列也占据了很长的宽度」）**：DSH 给每个 `th/td` 设的 `min-width: 100px` 是内容盒，加上插件自己的 12/16px 左右内边距，任何列的最小占位约 128px——`#` 这种一两字符的列也被撑到同样宽。修法：通用单元格规则里把下限换成插件自己的 64px 边框盒下限（`min-width: calc(64px - 12px - 16px)`，与拖拽的 64px 下限一致，拖窄列不会先跳宽），DSH 的长文本上限 `max-width: min(30vw, 320px)` 保持原样，换行位置不动。离线高保真预览（真实 DSH 表格 DOM/CSS，1200 宽，10 列样表）实测：总宽 1333 → 934px、`#` 列 129 → 65px、其余短列收到 64px 下限；fill 表与宽表的滚动行为不变。

### 18.2 交互：document 级指针事件，首次拖动才锁定列宽

DSH 的 Markdown 渲染器（`MarkdownText`）是 memo 化的 mdast switch，没有表格渲染扩展点（见 §17 之外的 2026-10-26 结论），所以交互不能做成 React 组件。`src/table-resize.js` 只做 DOM 侧接线：

- **命中区**：表头单元格右缘 6px（`EDGE_ZONE`，`thead th` 内、≤12 列）。内部分界线始终响应；**最后一列的右缘只在宽表响应**——那是表格自身的右边框，拖它改最后一列的宽、表格总宽跟着变（fill 表的右边框属于 100% 宽的包装层，拖了没有效果，保持不响应，见 `isResizeBoundary`）。鼠标进入命中区时给 th 加 `data-everforest-edge`，右侧画 2px 提示线（2026-10-30 起用 `--everforest-color-table-handle`，取调色板 `headerAqua` `#569D79`，不再是偏亮的强调色 `brand-primary`；提示线也从上下各让 25% 改为整列高 `top: 0; bottom: 0`，更容易看见），光标变 `col-resize`；离开即消失。**不加任何 DOM 节点**（命中区靠指针坐标算，提示线是 `th::after`）。宽表最后一列的提示线改成 `right: 0`，否则会被裁在滚动包装层外、只剩一半。
- **首次拖动才锁定**：pointerdown 时才量各列 `getBoundingClientRect().width`，写 `data-everforest-resizable="N"` + `--everforest-col-1..N`（px），并切 `table-layout: fixed`。锁定同时给 cell 加 `box-sizing: border-box`——否则量到的 border-box 宽度会按 content-box 写回去，每列被 padding（10px 16px）撑宽 32px，表格整体变宽（离线验证实测 998→1096px，已修复并纳入回归）。
- **锁定宽度向下取整到 0.5px 网格**：`normalizeWidths` 的目标宽度取 `floor(可用宽度 × 2) / 2`，保证各列 px 之和 **不超过** 容器内容宽。表格是 `width: 100%` + `table-layout: fixed`，列和一旦比内容宽多半像素，表格就被撑大、`scrollWidth` 取整 +1，底部会出现一条「能看见但滚不动」的横向滚动条（2026-10-27 用户反馈：内容宽 747.44px，列和 747.5px → `scrollWidth` 748）。向下取整后列和 747px，表格仍是 747.44px、`scrollWidth` 747，滚动条消失；0.5px 的对齐网格不变。
- **拖动 = fill 表在相邻两列重分配、宽表只改被拖的那一列**：fill 表（`<4` 列，宽度 100%）用 `clampSpan` 保持两列宽度和不变，因此**表格总宽不变**；宽表（`md-table-wide`）宽度自由，用 `resizeColumn` 只改被拖的列、其余列不动，**表格总宽 = 列宽之和**，每次拖动都同步写 `table.style.width`。指针坐标从拖动起点算（不是累加），+60px 实测列宽 +60。两种表都保持单列最小 64px（`MIN_COLUMN_WIDTH`）。pointer 事件挂在 `document` 上，指针移出单元格甚至表格仍可继续拖。
- **2026-10-28 第六次修正（用户反馈：宽表最后一列拖不窄、所有列都调小也调不小）**：根因有两条——(1) 最后一列的右缘（表格自身右边框）被 `edgeHit` 排除（`index >= cells.length - 1` 直接返回 null），所以最后一列没有自己的拖动柄；(2) 拖动只做相邻两列重分配、表格总宽恒定，于是把各列调窄时多出来的宽度只会一路推给最后一列，而最后一列既不能把宽度传出去（它是最后一列）也没有外侧手柄。表现就是「始终有一列宽度没法变小」。修法：宽表改为每列独立改宽、表格总宽 = 列宽之和（拖完即刷新 `table.style.width`，`width: max-content` 的包装层随之变宽/变窄，放不下继续出滚动条、放下滚动条消失），`edgeHit` 对宽表放行最后一列右缘（`isResizeBoundary`），并给最后一列的提示线补 `right: 0`。fill 表仍是原来的一对两列重分配（它的总宽必须等于容器宽，不能改）。
- **复位**：双击边缘 → 移除属性/变量，回到 DSH 自动布局；拖动中按 Esc → 恢复拖动前宽度。双击不是用 `dblclick` 事件，而是「同一列边界、两次 press 间隔 ≤500ms、两次坐标差 ≤8px、且上一次 press 没有真的拖动过」——`pointerdown` 里的 `preventDefault()` 会抑制 Chromium 的兼容鼠标事件，`dblclick` 不保证送达；「上一次没有拖动」保证拖完立刻再按同一处分界不会误复位。2026-10-28 梳理时删掉了 `dblclick` 监听：实测原生 `dblclick` 从不送达（`pointerdown` 的 `preventDefault()` 已把它抑制掉），那条兜底路径是死代码（见 §18.3）。
- **拖动期视觉状态**：`data-everforest-col-resize` 打在表格的滚动包装层（不是 `<html>`），拖动期间的 `cursor: col-resize` / 禁止选中只作用于这张表的子树。第一版为求「全窗口都是 resize 光标」把状态放在 `<html>` 并用 `html[data-…] *` 选择器，真机实测每次按下 / 松开要 **~260ms**（整页样式失效重算，聊天窗口明显卡顿）；改为包装层后同一操作 **~2ms**（首帧测量：down 1–3ms、up 2ms、拖动中 0.4–4ms）。光标只在表内变成 resize 是接受的取舍。
- **跟随列宽**：`<4` 列的 fill 表宽度是 100%，锁定后用 `ResizeObserver` 观察包装层，聊天列宽变化时按比例重排各列（保持总和=容器宽）；宽表（`md-table-wide`）锁定后是显式像素宽（内容宽 + 自身 1px 外框），**不跟随容器**：窗口变窄时保持列宽、由包装层横向滚动（Element 表格式），窗口变宽也不自动撑回去。未锁定的宽表同样按 DSH 的自然列宽排版、放不下就滚动。
- **状态以表格元素为准**（attribute + CSS 变量是当前页面的真源）；2026-10-31 起另有一份**浏览器本地列宽缓存**（§18.6：独立 localStorage key、不进 Host），在表格被重挂载时用来恢复。table 元素不是 MarkdownText 管理 `style`/`class` 的对象，因此内联属性和变量不会被 React 覆盖。
- **边界**：触摸不启用——2026-10-31 评估后**决定不做**（mouse/pen only）：手指拖表头会与宽表的横向滚动抢手势，且触摸端没有 hover、拖动柄不可发现；评估与代价见 [assessment.md](assessment.md) §24。>12 列不响应拖动；fill 表拖动只在相邻两列间重分配、不改表格总宽（它必须等于容器宽），宽表拖动改表格总宽（可以一路拖窄到放进正文列，或拖宽到溢出后滚动）；`md-table-wide` 是 rc.3 的字面工具类（不是 CSS modules 哈希），和 `_tableScroll` 一样属于 DSH 升级时要复查的选择器面。

### 18.3 实现清单

- 新增 `src/table-resize.js`（512 行：样式表 + 控制器 + 纯函数 `clampSpan` / `resizeColumn` / `nextColumnWidths` / `normalizeWidths` / `isResizeBoundary` + 常量契约）、`tests/table-resize.test.mjs`（14 项：属性契约、样式表作用域/规则/生成列宽、drag 态、纯函数数学（含「列和不得超过可用宽度」「宽表最后一列可拖动、fill 表不可」「fill 重分配 / 宽表单列改宽」回归）、无 DOM 与 listener 生命周期）。
- `src/table-resize.js`（2026-10-28 第六次修正）：新增 `resizeColumn`（宽表单列改宽）与 `isResizeBoundary`（内部分界线始终响应、最后一列只对宽表响应）；宽表拖动时同步写 `table.style.width`（列宽之和），`lock` / 拖动 / Esc 恢复统一走 `applyWidths`；resize 样式表新增 1 条「宽表最后一列提示线 `right: 0`」规则（18 → 19 条）。
- `src/table-resize.js`（2026-10-28 梳理，522 → 512 行，行为不变）：删掉从未送达的 `dblclick` 监听与 `onDoubleClick` 死路径（double-click 复位只靠两次 press 的检测）；合并 `tables` Map 与 `locked` Set 两套锁定状态（Set 冗余，dispose 直接遍历 Map 的键）；`paintWidths` 并入唯一的写入口 `applyWidths`；`onPointerMove` 的两条分支收敛成 `nextColumnWidths`（fill 动相邻两列 / 宽表只动被拖列），提交路径只剩一份；`onPointerUp` 不再重复 touch 判断（touch 根本不会进入拖动）；抽 `isWideTable()` 消除三处重复的 `parentElement.classList.contains('md-table-wide')`。`tests/color-mode.test.mjs` / `tests/table-resize.test.mjs` 里重复的 CSS 解析 helper 抽到 `tests/support/css.mjs`（36 行，两边共用）。
- `src/color-mode.js`：`MARKDOWN_SCOPE` 改为导出（resize 样式表复用同一作用域）、新增 `TABLE_FRAME` 与 **8 条**表框 literal 规则（宽表包装层重新装箱 + 常驻横向滚动、fill 表外框 + 圆角、宽表 `<table>` 边框、列线、末列、末行、首列/末列内边距）。
- `src/color-mode.js`（2026-10-29）：滚动条部分只留 **2 条** literal 规则——`::-webkit-scrollbar { height: 10px }`（固定轨道）与 `::-webkit-scrollbar-thumb { border-top: 0; border-bottom: var(--everforest-table-scrollbar-inset, 5px) solid transparent; background-clip: content-box }`（静止画 5px，inset 留给控制器逐帧改写）。**没有** `:hover` 规则：滚动条伪元素不能过渡，hover 态改由 `src/table-scrollbar.js` 动画驱动。color-mode 样式表 **48 → 50 条**，字面规则 16 → 18 条。
- 新增 `src/table-scrollbar.js`（约 260 行：常量契约 `SCROLLBAR_INSET_VARIABLE` / `REST_SCROLLBAR_INSET` / `HOVER_SCROLLBAR_INSET` / `SCROLLBAR_GROW_MS` + 纯函数 `scrollbarInsetAt` / `isScrollbarPoint` + `installTableScrollbarHover` 控制器）、`tests/table-scrollbar.test.mjs`（12 项：常量、缓动与钳制、命中几何、listener 生命周期、逐帧 inset 序列、重复 pointermove 不重启、中途反向从当前值重算、触摸 / 非滚动 / compact 排除、reduced-motion 与无 rAF 瞬切、pointerleave / blur 收起、切换目标表时旧表复位、dispose 清理）。
- `src/client-entry.js`：新增 1f effect（`installTableScrollbarHover({ document, window })`；安装失败只 warn、动画缺失但样式与 rest 态不受影响）；`scripts/build.mjs` 的 `SOURCES` 在 `table-resize.js` 之后插入 `table-scrollbar.js`，`client.js` 重建。
- `tests/color-mode.test.mjs`（2026-10-29）：literal 规则表改 2 条（10px 轨道、var 内缩 thumb）；「10px 轨道 / 5px inset pill」用例断言两条规则、无 `::-webkit-scrollbar` 的 `:hover` 规则、且样式表里只有这两条 `::-webkit-scrollbar` 选择器（不得出现未加作用域的条规则，否则会改到全应用的滚动条）。
- `src/color-mode.js`（2026-11-10，§18.1）：滚动条 literal 规则 2 → **3 条**，新增 `${TABLE_FRAME}.md-table-wide::-webkit-scrollbar-track { border-bottom: .5px solid var(--dsw-alias-border-l3) }`（宽表下沿补线）。color-mode 样式表 54 → 55 条、字面规则 21 → 22 条。`tests/color-mode.test.mjs` 同步：literal 规则表加 1 条、滚动条白名单改为 3 条，并新增「track 规则必须限定在 `.md-table-wide`、fill 表不得出现该规则」与边框值断言。
- `src/client-entry.js`：新增 1e effect（注入 `dsh-everforest/table-resize` 样式表 + `installColumnResize({document, window})`，cleanup 先 dispose 再移除样式表）。
- `scripts/build.mjs`：`SOURCES` 增 `table-resize.js`（`color-mode.js` 之后、`client-entry.js` 之前）；`client.js` 重建。
- `src/table-resize.js`：`onWrapperResize` 只服务 fill 表（宽表保持列宽、由包装层滚动，不观察容器）。
- `tests/color-mode.test.mjs`：literal 规则表更新为上面的 8 条并补 `border-l1..l3` 外部变量白名单；宽表回归测试钉住重新装箱的 6 条声明（`width/max-content`、`max-width/100%`、`margin-left/padding-left: 0`、`overflow-x/auto`、`padding-bottom/0`），并断言表格不得再被 `max-width` 收窄、单元格不得改 `min-width`、**其它**规则不得再碰重新装箱的属性、fill 表包装层不得改动、宽表框必须落在 `> table` 上。`tests/integration.test.mjs`：常驻样式表 5 → 6 张、新增 table-resize 样式表断言。
- 常驻样式表 5 张（color-mode / table-resize / selection / active-session / theme-spotlight），含设置页样式共 6 张；2026-10-30 曾另有导航图标样式表（共 7 张），2026-11-06 改走官方 `settings.section.icon` 槽位后删除，当时回到 6 张（§19；现行 11 / 12 张，见 §12 / §26 / §28）。
- 2026-10-31（§18.6）：新增 `src/colwidth-store.js` 与 `tests/colwidth-store.test.mjs`；`src/table-resize.js` 增加列宽记忆（`memoryWidths` / `tableMemoryKey` / 首帧扫描 + MutationObserver / 拖动结束写 / 双击删）；`src/client-entry.js` 1e effect 接线；`scripts/build.mjs` 的 `SOURCES` 插入 `colwidth-store.js`；`client.js` 重建。

### 18.4 验证

- **自动化**：`node --test` 全量 **296/296**（1.3.0 的 262 项 + 2026-10-31 列宽记忆 34 项：`tests/colwidth-store.test.mjs` 21 + `tests/table-resize.test.mjs` 新增 13，后者含拖动写记忆 / Esc 不写 / 双击删条目 / MutationObserver 晚挂载与 dispose / 无 memory 等价 / 卸载表释放等事件路径）；`npm run check`（palette / build / contrast）全绿。color-mode 样式表 50 条规则、resize 样式表 19 条规则、滚动条动画的命中几何与逐帧序列由测试逐条钉住；列宽记忆的 key / 签名 / TTL / 300 条淘汰 / 坏数据与坏 storage 由 `tests/colwidth-store.test.mjs` 钉住。
- **性能（2026-10-31，Chromium 156 实测，import 真实 `src/colwidth-store.js` + 真实 `localStorage`，封顶 300 条）**：写入（拖动松手，读整包+改一条+剪枝+写回）现实最坏 0.72 ms / 理论最坏（300×160 字符 key×32 列，118 KB payload）1.00 ms；双击删除 0.28 / 0.40 ms；单表恢复（getItem+parse+normalize+prune）0.24 / 0.40 ms（常见 20 条 2 KB payload 为 0.011 ms）；20 张表同批恢复 4.65 / 7.92 ms；`localStorage.setItem` 118 KB 为 0.09 ms（`getItem` 由 Chromium 内存缓存，0.2 µs 量级）；TTL/上限剪枝 0.11 / 0.20 ms；`headerSignature` / `tableWidthKey` 0.0004 / 0.0001 ms。`MutationObserver` 回调只遍历新增节点，未发现表时不读存储（微秒级）。真实会话量级（几十条、几 KB、单页 2–5 张表）各环节都在 0.01–1 ms，远低于一帧预算；极端封顶场景（20+ 张表同批恢复）约 8 ms，仍在单帧内。（如需进一步压低，现成杠杆是「一批只解析一次 payload」，但会引入缓存失效逻辑，当前不值得。）
- **真实浏览器（2026-10-31，共享调试 Chromium）**：独立 harness 页加载**真实** `src/table-resize.js` / `src/colwidth-store.js`，53 项检查全部通过（`.tmp/colwidth-memory/verify/results.json`）。关键读数：fill 表恢复列和 `746` = 容器内容宽 `746`、`scrollWidth == clientWidth == 746`、`maxScrollLeft 0`、条高 `0`（无幽灵条）；宽表恢复 `[200, 250, 300, 350]`、`tableWidth 1101`（列和 1100 + 1px 外框）、`max-width: none`、可滚动；表头签名 / 列数不符 → 保持自动布局；双击后条目被删、回到自动布局；真实拖动后存储宽度与屏幕逐像素一致（`338.5 / 407.5`）；301 次写入后保留 300 条、最久未写被淘汰（payload 22,224 B）；TTL / 未知版本 / 坏 JSON / 坏条目都被丢弃；`MutationObserver` 晚挂载的表被恢复；console 零错误。注：早前一轮 `scrollWidth 747 / clientWidth 746` 的失败已定位为 harness 自己给单元格加四边 `.5px` 边框的近似 CSS 造成（真实 DSH 的 fill 表 `<table>` 无水平外边框），修正 harness 后 `746/746`。
- **离线预览（高保真）**：`.tmp/table-preview/`（`gen.mjs` 用真实 `tokensFor()` + `colorModeStyles()` + 真实 DSH rc.3 样式表/真实 token 变量/真实表格 DOM 生成 6 档页面；`serve.mjs` 只读静态服务；截图在 `shots/`）。DPR 1 下实测外框/列线各 1px 实色，th 13px/500、td 13px/400（与 rc.3 `--dsw-font-markdown-table*` 一致）。
- **交互实测（真实浏览器，synthetic PointerEvent + 真实 DOM）**：hover 边缘 → `th[data-everforest-edge]` 出现；pointerdown → 锁定、`--everforest-col-1..3` = 332/333.5/332.5；+60px → 332/393.5/272.5（列对和 666 不变）；表格宽 998 不变、锁定后各列 rect 与锁定前一致（box-sizing 修复后）；双击 → 属性/变量清空、回到自动布局；Esc → 恢复拖动前宽度；console 零错误/零警告。
- **真实鼠标事件（CDP `Input.dispatchMouseEvent`，不是合成事件）**：在预览页上用真实 hover → press → move → release 复跑：hover 提示线 `2px rgb(131,192,146)` 出现；press 后列宽 332/333.5/332.5、表格 998 不变；move +60 → 332/393.5/272.5；release 保持；**双击（两次真实 press）在绝对边缘复位成功** → `data-everforest-resizable` 为空、`table-layout: auto`、列宽回到 332.23/333.5/332.27。双击必须用「两次 press 的间隔检测」而不是 `dblclick`：`pointerdown` 里的 `preventDefault()` 会抑制 Chromium 的兼容鼠标事件，`dblclick` 不一定送达（实测反例即由此发现）。Esc 取消同样通过；宽表 rest / hover 包装层高度 266 / 266（滚动条补偿成立）。
- **真机（2026-10-27）**：把重建后的 `client.js` 放入 desktop profile 由 HMR 热替换（统计到的 bundle mtime 变化 → `clientModules.rebuilt` → 页面热换模块，无需刷新），随后在真实 DSH 窗口里用 `evaluate_script` 做**隐藏探针**（容器 `position:fixed; left:-20000px`，挂载后即移除，不改变用户可见界面）：
  - 样式落地：`style[data-plugin-css="dsh-everforest/table-resize"]` 存在；color-mode 样式表含 `tableScroll`；真实 rc.3 DOM 上实测 wrapper `1px solid rgba(101,115,109,0.9)`（l3）、radius 8px、`th` 右线 `rgba(...,0.78)`（l2）、首列 padding-left 16px、末列 padding-right 16px、末行 `border-bottom: 0`；th 字体 `500 13px/22px`。
  - 交互（真实窗口的真实 document 监听器）：合成 pointer 事件在 `_markdown_1ypvv_5` 容器里 hover 到 `th` 右缘 → edge 属性出现、`::after` 2px `rgb(131,192,146)`；press → 锁定 3 列、表格宽 898 不变；+60 → 299/360/239（列对和 599 不变）；release 保持；真实边界上的第二次 press（双击）→ 属性/变量清空、`table-layout: auto`；Esc → 恢复。ResizeObserver：容器宽 898 → 698 后列宽自动重排为 232.5/233/232.5（和 698）。
  - console 里没有 everforest 相关错误/警告（仅有本机既存的 `ws://127.0.0.1:9230/ingest` 观测服务失败，与本插件无关）。
  - 说明：真机探针的表格是「真实 DOM + 真实样式 + 真实插件监听器」但由脚本挂载；真实 React 渲染路径（MarkdownText 流式输出）无法在不污染当前会话的前提下注入，交给用户目检与后续会话自然覆盖。
- **真机回归（2026-10-27 用户反馈：拖动一点点后表格底部出现一条无法滚动的横向滚动条）**：在真实聊天的 3 列表格上复现——锁定后列和 747.5px 比容器内容宽 747.44px 多 0.06px，`table-layout: fixed` 把表格撑到 747.5px，`wrapper.scrollWidth` 取整为 748 > `clientWidth` 747，出现滚动条但可滚距离不足 1px。修复（预算向下取整到 0.5px）后在同一张真实表格上复测：锁定列和 747px、表格仍 747.44px、`scrollWidth` 747 = `clientWidth`，无滚动条；+2px 与 +80px 拖动后列和保持 747px、均无滚动条；双击复位回到自动布局。`normalizeWidths` 增加「列和不得超可用宽」的参数化回归用例。
- **真机回归（2026-10-27 用户反馈：宽表「错位」、右侧列被裁）**：截图实测外框 `298→1046`、表格从 `683` 开始、在 `1046` 被裁（4 列只显示 3 列），与「包装层 100% 宽 + DSH 的 `margin-left:-389 / padding-left:389` 仍在」的几何完全吻合。根因：我们的 `width: max-content; max-width: 100%` 覆盖了 DSH 的 bleed 宽度却没覆盖它的 margin/padding。修复后用真实 assistant 消息体里的隐藏探针复测：包装层 `border:none`、`width:1517px`（= 聊天滚动区内容宽）、`margin-left:-388.78px`、`padding-left:388.78px`（DSH bleed 原样）；`<table>` 有 `1px solid rgba(101,115,109,0.9)` 边框，表格左缘与消息正文左缘对齐（差值 0），4 列自然宽 `133/133/353/261` 全部可见，`scrollWidth == clientWidth`；锁定该宽表后 `data-everforest-resizable=4`、`table-layout: fixed`、表格宽 879px 不变。离线预览同步补齐了 DSH 的聊天层级与 bleed 规则，并加入复刻「分镜」消息的 4 列长文本回归表。
- **真机 + 离线复测（2026-10-27，滚动条越出表格左边 / 表格右边超过正文列）**：重新装箱后包装层左缘 = 表格左缘（差值 0）；真机 1280 窗口正文列 747.44px、右缘 1150.22，收紧到正文列后宽表右缘不再超出；HMR 热替换（color-mode 样式表已更新、不再引用 `--dsh-table-spare`）与锁定列宽行为同时得到验证，最终形态见下一条。
- **Element 表格式复测（2026-10-28 用户反馈：列保持原长度、放不下出横向滚动条）**：离线（1200px 窗口，7 张表）：宽表包装层一律 `748px`、右缘 `971.5`（= 正文列右缘，差值 0），表格保持自然宽 `753.34 / 799 / 1325.27 / 914.61px`，4 张溢出表的 `scrollWidth > clientWidth` 且 `offsetHeight − clientHeight = 5px`（常驻横向滚动条）；`overflow-x: auto`、`padding-bottom: 0`、rest 与 hover 一致；锁定后表格保持 `1325px`（inline `1324px` + 1px 外框）、+40px 拖动相邻两列 `171.5→211.5 / 353→313`（列和不变）、`scrollLeft` 可到 577（= 1325 − 748），双击复位回自然宽；页面 `scrollWidth 1195 = 视口内容宽`。真机（dsh-app MCP，1280 窗口，session「代码生成视频工具推荐」，HMR 热替换后）：4 张宽表的包装层都是 `747.44px`、右缘 `1150.22`（与正文右缘差值 0，不再伸进右侧留白），表格自然宽 `1056.22 / 764.77 / 1192.47 / 1048.09px`，滚动条高 5px，页面无横向溢出（`innerWidth 1280`）；截图 `.tmp/lead/live-element.png`。
- **宽表最后一列复测（2026-10-28 用户反馈：最后一列拖不小、所有列都调小也调不小）**：离线（1200px 窗口，Element-scroll 5 列表，`.tmp/table-preview/drive-wide-input.mjs` 走真实 CDP 鼠标事件）：最后一列右缘 hover 出 2px 提示线（`right: 0`、`cursor: col-resize`），真实拖动 −120px 后该列 `155.5 → 64`（触底 64）、其余四列 `291 / 171.5 / 353 / 353` 不变、表格 `1325 → 1233.5`；随后逐列拖到 100px：列和 `1041.5 → 970 → 717 → 464`、表格 `465px`、包装层 `465px`（`max-content` 贴合）、`scrollWidth == clientWidth == 465`（无滚动条）、页面无横向溢出；最后一列再拖宽 +400px → 表格 `865px`、滚动条回来（5px）；双击复位回自然宽 `1325.27`、`table-layout: auto`。fill 表（3 列）外缘 hover 不出现提示线、内部分界线正常。真机（`.tmp/lead/drive-live-wide.mjs` 用 CDP `Input.dispatchMouseEvent` 直接驱动 dsh-app 窗口，1280 窗口，session「代码生成视频工具推荐」，HMR 热替换后）：4 列宽表自然宽 `1192.47px`、包装层 `747.44px`；最后一列右缘 hover 出提示线（`col-resize`、`right: 0`），真实拖动 −120px → 最后一列 `353 → 232.5`、其余 `314 / 171.5 / 353` 不变、表格 `1192.47 → 1072`、`scrollWidth 1192 → 1072`；逐列拖窄后列和 `877 → 825.5 → 592.5 → 510`、表格 `511px`、包装层贴合 `511px`、无滚动条、页面无横向溢出；双击复位回 `1192.47px`、`table-layout: auto`。截图 `shots/last-column-handle-dark-soft.png`、`shots/last-column-shrunk-dark-soft.png`、`shots/last-column-fitted-dark-soft.png`。
- **全场景自测（2026-10-28 代码梳理后）**：离线高保真页（`.tmp/table-preview/scenarios.mjs`，走真实 CDP `Input.dispatchMouseEvent`，不是合成 PointerEvent）**106/106 项通过**，报告 `.tmp/table-preview/scenarios-report.json`。覆盖：样式表安装 + 19 条规则 + 最后一列提示线规则；fill 表（2 / 3 列）hover 提示线 / 光标 / 颜色、press 锁定、相邻两列重分配与总宽不变、无幽灵横向滚动条、指针移出表格继续拖、Esc 取消、两次 press 复位、64px 下限、右键不响应、文本列 `748 → 520 → 748` 时 ResizeObserver 重排；宽表（4 / 5 列）自然列宽、右缘对齐正文列、5px 常驻滚动条、内部边界拖拽只改被拖列而表格总宽跟随、最后一列右边框可拖（提示线 `right: 0`）、逐列拖窄到放进正文列后滚动条消失且无幽灵条、再拖宽滚动条回来、Esc 恢复表格宽、双击复位、锁定后窗口变窄保持像素宽只滚动；异常表（2 列、12 列上限、13 列、无表头、compact 变体、markdown 容器外、单列表）全部静默不响应；生命周期（两张表同时锁定互不影响、`window` blur 结束拖动、dispose 移除样式表并还原所有锁定表、reload 后重新安装）；深 / 浅两套主题各跑一遍，console 零错误。
- **真机复测（2026-10-28 梳理后，`client.js` md5 `fd328693…`，HMR 热替换后，CDP 真实鼠标输入）**：fill 表（2 列）：hover 提示线 2px、press 锁定、+40px 后列宽 `203.64 / 541.8 → 243.64 / 501.8`、表格 `745.44px` 不变、`scrollWidth == clientWidth`、双击复位；宽表（4 列，session「代码生成视频工具推荐」）：最后一列右边框 hover 出 2px 提示线（`right: 0`），拖 −120px → 最后一列 `353 → 232.5`、其余三列不动、表格 `1192.47 → 1072px`，逐列拖窄到 `511px` 后容器贴合、滚动条消失、页面无横向溢出，双击复位回 `1192.47px`；验证后已切回原会话，未留下锁定表。
- **滚动条机制探针（2026-10-29，共享调试 Chromium / DPR 1）**：在独立探针页上逐条验证——① `::-webkit-scrollbar:hover` 不匹配：真实指针停在 5px 条上，条高仍是 5px（`offsetHeight − clientHeight = 5`）；② `包装层:hover::-webkit-scrollbar` 匹配，但指针在元素内任意位置就触发，且 5 → 10px 时包装层 `offsetHeight 9 → 14`（+5px 布局位移），语义也不对；③ **CSS 过渡 / 动画在滚动条伪元素上不运行**：给 `::-webkit-scrollbar-thumb` 写 10s 的 `transition`，计算值显示已生效，但 `getAnimations({subtree:true})` 为空、10s 后与 0s 的像素一致（直接是终态）——所以过渡不能用 CSS 写；④ 指针在原生滚动条上时事件仍到页面：document 级 capture 监听到 `pointermove`，`target` 正是滚动条所属的包装层，坐标落在条内（`y 123.25`，条 `119.25–129.25`）；⑤ 包装层的自定义属性能被子滚动条伪元素继承：包装层 inline 写 `--probe-inset: 2.5px` 后 `getComputedStyle(el, '::-webkit-scrollbar-thumb').borderBottomWidth` 读回 `2px`，页面截图里 thumb 由 5px 画成 8px（10 − 2）——逐帧改 inset 会真实重绘，这也是动画方案成立的关键。
- **离线高保真预览（2026-10-29，`.tmp/scrollbar-preview/build.mjs`）**：用真实 rc.3 web-frontend 表格 CSS + 真实 `dsh-client-ui-theme` 全局滚动条样式表 + 真实 `tokensFor()` 六个月色 token + 真实 `colorModeStyles()` 生成 before / after 两页（before = 插件样式表里扣掉 2 条滚动条规则；after 规则数 48 → 50），1280 视口、正文列 747.44px、dark·soft。after：宽表包装层 `747.44 × 189.22`、条高 **10px**、thumb 静止可见 5px（像素行 `256–260`，与 before 的 `256–260` 完全同一位置）、表格自然宽 `1385.63px`、表格底边 `256.41` 两版一致、表格后内容 `267.41 → 272.41`（+5px）、页面 `scrollWidth == clientWidth`（1275）；fill 表（3 列）两版一致（不出现条）。
- **滚动条过渡实测（2026-10-29，`animate.html` / `animate-slow.html`）**：把**真实 `src/table-scrollbar.js`** 内联进上面同一套真实 CSS，用「一行 1px 高、容器中心正好落在条上」的表让 MCP 的真实指针对准滚动条。静止：`inlineInset` 为空、computed border `5px`、像素上 thumb 5 行（`54–58`）；hover 后：`inlineInset 0px`、computed border `0px`、颜色切到 hover 色、像素上 thumb 10 行（`54–63`）。把动画时长放慢到 4s 后逐 50ms 采样，`inlineInset` 走 `4.88 → 4.70 → 4.52 → … → 2.98` 的缓动序列，computed border 逐档 `5px → 4px → 3px → 2px → 1px`（**逐帧动画真的在跑，每次都是滚动条重绘**）；hover 全程包装层高 13px、表格底边与下方内容逐像素不动（**过渡不产生布局位移**）。note：元素级截图会临时切到 overlay 滚动条（页面后续报告 `thickness 0`），刷新即恢复，属截图工具副作用、不是 CSS 问题；视口截图不受影响。
- **滚动条下沿补线离线预览（2026-11-10，`.tmp/scroll-border-preview/`）**：真实 `.tmp/installed-web.css`（当前 DSH web-frontend）+ ui-theme 全局滚动条样式表 + 真实 `tokensFor()` + `colorModeStyles()`，440px 正文列、5 列溢出宽表 / 2 列 fill 表，视口截图逐行采样。宽表：条位 10px、静止 thumb 仍是 5px pill 且位置不变；新规则在条位最下一行画出 1px `border-l3` 线（DPR 1，与表格底框同色），before 版无此行；`.5px` 渐变停止点写法在 DPR 1 完全不绘制 → 改用 `border-bottom`。fill 表与不溢出的宽表无任何变化。
- **残余（人工项）**：本轮没有真机读数——共享调试 Chrome 打不开需要 token 的 Web GUI（`dsh web authentication required`），本会话也没有桌面 app 的 MCP 通道；改动是 Client 半部（样式表 + 控制器），`client.js` 重建后刷新页面即生效，真实窗口的 hover 手感目检留给用户（见 §18.5 第 7 条）。

### 18.5 已知风险

1. **选择器面**：`[class*="tableScroll"]`、`.md-table-wide`、`thead th`、document 级 pointer 事件，DSH 升级改 Markdown 渲染结构时交互会静默失效（样式仍在）；与 §13.7 的选择器风险同源。
2. **依赖 DSH 的表格度量**：重新装箱依赖 DSH 的 `.md-table-wide` 类名与 `.body` 布局；包装层不再读 `--dsh-table-spare`。列宽由 DSH 的单元格度量（`padding`、`max-width: min(30vw, 320px)`）与插件下调后的 64px 最小列宽共同决定（2026-11-04 起覆盖了 DSH 的 `min-width: 100px`，见 §18.1），DSH 改 padding / max-width 会改变列宽与换行位置。fill 表包装层仍完全不碰。
3. **宽表框形态**：宽表框画在 `<table>` 上，因此没有圆角；表格比正文列宽时列宽保持自然长度、由包装层横向滚动（10px 条位、静止可见条 5px、hover 画满 10px，2026-10-29），横向滚动时框的右边线随内容移出视口。
4. **重挂载不再丢列宽，但依赖 DSH 内部锚点**：宽度由 §18.6 的本地缓存恢复；缓存靠 `data-conversation-session` / `data-chat-node-key` 两个 DSH 内部属性（无公开契约），升级改名则恢复静默失效、退化为自动布局（不报错），与本节第 1 条同源。
5. **触摸端不做**（2026-10-31 决定，非待办：手势与宽表横向滚动冲突、无 hover 可发现性；见 [assessment.md](assessment.md) §24）；>12 列不提供拖动；列宽现在**跨刷新 / 切会话保留**（§18.6 的本地缓存），但只在同一浏览器同一 origin 有效：Desktop 的 `dsh-app://app` 固定、跨重启保留；用浏览器打开 DSH Web GUI 时端口每次随机，换一次启动就是新 origin（不保留）。
6. **fill 表不能改总宽，宽表可以**：`<4` 列的 fill 表宽度必须等于容器宽，拖动只在相邻两列间重分配；宽表拖动改被拖的那一列、表格总宽 = 列宽之和（因此可以一路拖窄到放进正文列，也可以拖宽到溢出后横向滚动），但拖宽超过正文列后最后几列要横向滚动才能看到；最后一列的拖动柄在表格右边框上，表格溢出时它只在滚动到最右端时可见。
7. **滚动条过渡依赖 Chromium 的事件与私有伪元素行为**：`::-webkit-scrollbar` / `::-webkit-scrollbar-thumb` 的尺寸、命中与「伪元素能否继承自定义属性」都是 Blink 行为（2026-10-29 在共享调试 Chromium 实测）；CSS 过渡 / 动画在滚动条伪元素上不会运行，因此过渡由 `src/table-scrollbar.js` 用 `pointermove` + `requestAnimationFrame` 驱动——若某版本不再把指针在原生滚动条上的事件派发给所属元素，hover 就不再加粗（静止 5px 不变，样式表本身不依赖 JS），若 rAF 不可用或 `prefers-reduced-motion: reduce` 则退化为瞬切。Blink 把滚动条部件的边框宽取整到整 CSS 像素，DPR 1 下只有 5 → 4 → 3 → 2 → 1 → 0 六个绘制态（DPR 2 有半像素档）。Firefox 等非 Chromium 引擎走 DSH 的 `scrollbar-width: thin` 兜底，条不会加粗。可滚动表格的包装层比 1.2.0 高 5px（多出来的是透明条位，位于可见条下方），表格之后的正文整体下移 5px，属预期；不可滚动 / fill 表不受影响。若 DSH / 主题改了全局 thumb 的 `background-clip` 或给 thumb 加边框，插件已重新声明 `background-clip: content-box`，但升级后仍建议目检一次条的形状。2026-11-10 起宽表条位还多一条 `.5px` 下边框（画在 `::-webkit-scrollbar-track` 上，§18.1），同样属于 Blink 私有伪元素行为：Firefox 会忽略该规则（宽表条下沿无这条线，其余不变）；Chromium 升级后一并目检这条线的栅格化与位置。
8. **列宽记忆的失效面**（§18.6）：DSH 改聊天锚点 → 记不住（静默）；retry / 重新生成复用 turn/step → 由表头签名 + 列数拦截；会话 fork 不继承父会话；Web 随机端口不跨重启；多标签 last-write-wins；本地缓存上限 300 条 / 180 天 TTL。

### 18.6 2026-10-31 列宽记忆（localStorage）

**触发**：用户提出「表格修改列宽增加记忆功能」。评估结论（见 [assessment.md](assessment.md) §23）：可做，代价中等偏小；确认方案「localStorage + 300 条上限 + 最久未写淘汰 + 双击删除 + 180 天 TTL」后实现。

**为什么需要**：DSH 聊天行没有虚拟化——滚动、折叠、搜索隐藏、流式输出、向上翻页都**不会卸载**表格 DOM（隐藏只是 `hidden`/`until-found` 属性，表格块用源码偏移量 key 在 frozen/tail/settle 三态间 reconcile），这些场景列宽本来就不丢。真正会丢的只有两处：**切会话再切回**（session 作用域 slot 用 generation key 强制 remount）与**刷新 / 重开**；另外向上翻页新挂载的旧消息也没有宽度。记忆只补这几种重挂载。

**表身份（key = `sessionId|nodeKey|ordinal`）**：
- `sessionId`：`table.closest('[data-conversation-session]')`，ui-conversation 写在会话内容根上；
- `nodeKey`：`table.closest('[data-chat-node-key]')`，ui-chat 的 ChatNodeSeat 写在消息行上；assistant 形如 `14:assistant-step<turn>:<step>`，由事件日志确定性推导，**刷新重放 / 切会话 / 流式输出全程不变**（user 消息是 `13:input-message<uuid>`）；
- `ordinal`：该 node 内「本模块可锁定的 markdown 表」序号（compact 推理变体排除，与拖动作用域一致）。一条消息可渲染多张表（真实样本 2–3 张），必须用序号区分；真实数据里不同会话存在同名表头，所以**不跨会话共享**。
- 两个锚点都是 DSH 内部实现属性（无公开契约），集中成 `SESSION_ATTR` / `NODE_ATTR` 两个常量（`src/table-resize.js`）；拿不到 = 不记忆（退化），绝不报错。来源：rc.5 安装包 `dsh-client-ui-chat` / `dsh-client-ui-conversation` 的 JSX，真实 session journal 实测 40 个会话 / 58 个含表节点（详见 `.tmp/colwidth-memory/dom-anchor.md`）。

**存储**（`src/colwidth-store.js`，独立 key `dsh-everforest/colwidths/v1`）：
- **不进** `dsh-everforest/v1`：强度缓存每次写入只序列化 `{version, light, dark}`，会丢掉列宽；boot 脚本每页解析那份 payload。
- **不进** Host 配置：`cordis.patch.yml` 是用户可读配置，一次写入 = 整份 patch 重写 + profile recompose，和强度偏好共用 revision、每次写都广播给所有浏览器——列宽是 per-browser 布局结果，广播语义本身就是错的；冷启动 schema 校验失败还会让整个插件条目不激活。
- 条目 `{ w, c, h, t }`：半像素网格列宽 / 列数 / 表头 FNV-1a 8 位签名 / 最后写入时间；约 90 B/条。
- 上限 `MAX_COLWIDTH_ENTRIES = 300`（约 27 KB），写入时按 `t` 淘汰最久未写的；`COLWIDTH_TTL_MS = 180 天`，过期条目读时过滤、下一次写入时持久删除；`COLWIDTH_VERSION = 1`，版本不符整包丢弃（cache 语义，不迁移）。读写永不 throw。
- 写入时机：**拖动结束且真的移动过**（`finishDrag` 的 `moved`）写一次；Esc 取消不写；**双击复位 = 删除该条**。恢复前校验 `c === 当前列数` 且 `h === 当前表头签名`（retry 复用 turn/step 时旧宽度不得套到新内容），不符直接丢弃。

**存储硬化与容量**（2026-10-31 复核）：
- key 用 `|` 连接，id 内含 `|` 的表直接不记忆（否则 `a|b` + `c` 与 `a` + `b|c` 会别名同一份条目）；key 超过 160 字符不截断、直接不记忆。
- 表头签名把分隔符与转义字符各自转义成自定界编码（引号 / 反斜杠 / 换行 / U+0001 / 孤立代理都不会让两个不同表头得到同一输入），单格文本上限 512 字符；不含这两个控制字符的普通表头哈希与上一版一致，已写入的条目不需要重新拖动。
- payload 读取前先看长度：超过 `MAX_COLWIDTH_PAYLOAD_LENGTH = 262,144` 字符整包当空、不 `JSON.parse`（防手改 / 损坏值让每次恢复都解析大字符串）。写路径上限有界：300 条 × 160 字符 key × 32 列 = 118,224 字符；真实最坏（key 101、12 列）约 64,524 字符 ≈ 129 KB 配额，离 5 MiB 很远。
- 条目集合放在 null-prototype 对象上，`__proto__` / `constructor` 等键只当普通条目；读写永不 throw，quota 写失败返回 false、旧 payload 保持可读。
- 会话切换后旧会话已锁定的表在下一批 `MutationObserver` 里 `release()`（`pruneDetached`），`tables` Map 不长期持有已卸载 DOM（否则每切一次会话就留一份旧 chat 子树）。

**恢复**：
- 安装时扫一遍 `[class*="tableScroll"] > table`；之后用 `MutationObserver`（`documentElement`，`childList + subtree`）处理后挂载的表：切会话整棵子树替换、`loadEarlier` 前插、流式渲染新建的表。**不监听 scroll**（行不卸载，滚动不是恢复时机）。
- 宽度按表型修复：fill 表用 `normalizeWidths(saved, 当前容器内容宽, 64)` **按比例重排**（列和不得超容器，防幽灵滚动条）；宽表保持绝对像素宽（表宽 = 列和、包装层横向滚动）；容器宽为 0（隐藏 / 折叠）时先套像素，等 ResizeObserver 在显示后重排。
- 恢复走与拖动相同的 `lock()` 路径，因此样式表规则、双击、Esc、ResizeObserver 行为不变；隐藏组里的表也恢复（容器宽为 0 时先按保存像素套上，显示后由 ResizeObserver 重排）。
- `memory` 缺失时行为与 1.3.0 完全一致（无观察器、无存储调用）；记忆读写抛错只影响本次记忆，不影响拖动与样式。

**实现清单**：新增 `src/colwidth-store.js`（纯逻辑：key / 签名 / 校验 / 剪枝 / 读写 / never-throw）与 `tests/colwidth-store.test.mjs`（21 项）；`src/table-resize.js` 增加 `memoryWidths`、`tableMemoryKey`、首帧扫描 + `MutationObserver`、`finishDrag` 写记忆、双击删条（+约 250 行，512 → 759）；`src/client-entry.js` 1e effect 传入 `memory: createColumnWidthMemory()`；`scripts/build.mjs` 的 `SOURCES` 在 `table-resize.js` 前插入 `colwidth-store.js`；`client.js` 重建。`tests/table-resize.test.mjs` +13 项（锚点契约、`memoryWidths` 几何、key/序号/compact、fake DOM 恢复接线、宽表恢复、坏 memory 容错、拖动写记忆、Esc 不写、双击删条目、MutationObserver 晚挂载与 dispose、无 memory 等价、会话切换后卸载表释放）。

**已知边界**：会话 fork 不继承父会话记忆（新 sessionId）；retry 后 node key 变化 → 旧条目成孤儿、由 TTL/上限自然清理；Web 随机端口不跨重启（Desktop `dsh-app://app` 固定）；多标签 last-write-wins（每次写是「读最新 → 改本条 → 写」）；窗口 / 字体 / DPI 变化后 fill 表按比例缩放、宽表保持像素宽。

## 19. 设置导航松树图标（settings-nav-icon；2026-11-06 起走官方槽位）

**触发**：用户要求「设置导航里 Everforest 有了自己的松树图标」。DSH 0.2.1 的 `settings.section` 注册项只有 `id` / `order` / `label`，没有 icon 字段（§11 第 7 条）：ui-settings-general 的 `navIcon(id)` 只认内置 section id，其它一律回退默认齿轮。2026-10-30 先用 DOM hack 实现（与 `dshmarket` / `dsh-notify-me` 同法）：`MutationObserver` 认领文本等于本插件 label 的 `[role="dialog"] nav button`，打 `data-everforest-nav-icon` 标记，再用 `::before` + `mask-image` 藏掉 shell 齿轮并画单色松树。

**2026-11-06 迁移（0.2.2-rc.1）**：0.2.2 新增官方槽位 `settings.section.icon`，同时把导航行改成 `button > span.navIcon > svg` + `span.navLabel`——旧规则 `[marker] > svg` 只匹配直接子级，齿轮没被藏掉，Everforest 行出现「松树 + 齿轮」双图标（`dshmarket` / `dsh-notify-me` 同受影响）。迁移后：

- **只保留组件**（`src/nav-icon.js`）：`createSettingsNavIcon({ h })` 返回一个 React 组件，按 `{ size, active }` 画 16px 方形 SVG（`viewBox="0 0 16 16"`、`fill="currentColor"`、`aria-hidden`），松树 path 是 nav-icon.js 的内置常量 `NAV_GLYPH_PATH`（沿用旧包图标的 glyph；2026-11-08 图标改为鲸鱼后仍保留）；`NAV_ICON_SLOT` 导出槽位名，`NAV_GLYPH_PATH` 导出 path。
- **注册**（`src/client-entry.js` 的 `setupSettingsUi()`）：`slots.inject('settings.section.icon', () => slots.register({ name, id: ENTRY_ID, order: 25 }, SettingsNavIcon))`；**id 必须等于 `settings.section` 的 id**（`ENTRY_ID = 'everforest'`），shell 才会在该行渲染它并替换默认齿轮。slot 声明由 settings shell 在挂载时给出，`slots.inject` 会等待。
- **旧宿主**：0.2.1-rc.x 不声明该槽位，`slots.inject` 不触发，设置导航回退默认齿轮；主题与其它功能不受影响（不再需要 DOM hack，也不再注入 `everforest/settings-nav-icon` 样式表，当时设置 UI 挂载时共 6 张样式表；现行 11 / 12 张，见 §12 / §26 / §28）。
- **验证**：`tests/nav-icon.test.mjs` 4 项（槽位名与松树 path 契约、按 size 画 currentColor SVG、默认 16px 与非法 size 回退、缺少 `h` 时报错）；`tests/integration.test.mjs` 断言注册项 `{ name: 'settings.section.icon', id: 'everforest', order: 25 }`、组件返回 `svg`、以及 dev 包 `slotInjectKeys` 顺序为 `settings.section` → `settings.section.icon` → `shell.overlay`。真机：设置对话框 Everforest 行只剩松树，normal / hover / 选中随行 `currentColor`。

## 20. 2026-10-30 第三方插件兼容别名桥（compat aliases）

**触发**：用户要求「第三方插件页面跟随主题配色」。排查本机已安装的 UI 插件发现，不少插件不直接用 DSH 的真实 token（`--dsw-alias-label-primary` 等），而是**猜**别名命名（`--dsw-alias-text-primary`、`--dsw-alias-bg-primary`、`--dsw-alias-separator-primary`、`--dsw-alias-state-error-primary` …）。DSH 不声明这些名字，插件代码里的 fallback 字面量生效（`var(--dsw-alias-bg-primary, #fff)` → 深色主题下仍是白卡），页面就停在浅色。

**方案**（`src/tokens.js` + `src/client-entry.js`）：

- `COMPAT_ALIASES`：41 个观测到的猜测名 → 最接近的真实 token 的静态映射（文本 / 表面 / 边框 / 交互 / 品牌 / 语义状态六组，见源码注释）；`COMPAT_ALIAS_NAMES` 供启动探测。
- `compatAliasesFor(overlay, isDeclared)`：每个别名**直接拷贝目标 token 的 `{ light, dark }` 值**（不是 `var()` 间接），因此别名与真实 token 一样跟随 6 档强度与深浅；目标必须由 `tokensFor()` 输出，否则抛错。
- 叠加点只有一处：`src/client-entry.js` 的 `applyLayer()` 把 `tokensFor()` + `compatAliasesFor()` 一起交给 `ctx.theme.overrideTokens()`；**不进** `TOKEN_COVERAGE` / token-inventory / 官方 217 token 契约，便于上游修好后一处删除。
- **宿主声明优先**：第一次 apply 时用 `getComputedStyle(document.body)` 探测每个别名 DSH 是否已声明（在我们的覆盖层生效之前），已声明的跳过——未来 DSH 采纳某个同名 token 时不会被我们的内联值遮蔽。
- **准入规则**：别名必须是 DSH 未声明的名字（`tests/tokens.test.mjs` 用 `docs/reference/token-inventory.json` 钉住「不得与真实 token 重名」）；只收实际观测到的名字，优先推动上游插件修复，不主动扩大表。

**边界**：这是猜测名桥，不是万能适配——插件若用别的猜名或硬编码颜色，页面仍不跟随；只影响使用这些自定义属性的第三方页面，DSH 自身 UI 与本插件不受影响；DSH 升级若新增同名 token，启动探测会自动让位。

**验证**：`tests/tokens.test.mjs`（别名与真实 token 不冲突、目标存在、值跟随 6 档）、`tests/integration.test.mjs` 两项——`apply()` 的覆盖层包含别名且等于目标值、「compat alias layer drops names DSH already declares」（模拟宿主声明 `--dsw-alias-bg-primary` 时该别名被丢弃）。全量 `node --test` **262/262**，`npm run check`（palette / build / contrast）全绿。

## 21. 2026-11-07 交互强调色：blue → aqua → green（accent-role split）

**触发**：用户先拿首页截图提问「许多强调色都是蓝色（预览版角标 / 活动工作区文件夹 / 发送按钮），按 Everforest 的配色是不是应该用绿色？」；改完后又贴出官方 Everforest（sainnhe/everforest）Neovim 参考图：「我看到的参考图中的绿色是这样的，感觉和现在的效果不太一样」。

**事实核对**（像素 + 安装包 CSS 双向确认）：

- 首页那三处都是官方 Everforest `fg.blue`（dark·soft = `#7FBBB3`），不是 DSH 默认蓝（`#4176e6` / `#4D6BFE` 系）漏映射；整张贴图里没有 DSH 品牌蓝的像素。
- 它们各自的真实来源（DSH 0.2.2-rc.1 组件 CSS）：
  - 发送按钮：`.GRgSLq_primary{background:var(--dsw-alias-button-info-fill)}`（`ui-conversation` 的 `InputBar`）；DSH 默认该 token = `--dsw-static-deepseek-500`（`#4176e6`，DeepSeek 品牌蓝）。
  - 活动工作区文件夹：`.wnFoaW_folderActive{color:var(--dsw-alias-state-business-primary)}`（`ui-workspace` 的 `Rows`）；深色档默认 = `deepseek-400/500`，浅色 = `deepseek-500`。
  - 「预览版」角标：`.WOwLGG_previewBadge{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-label-primary-bluish)}`（`ui-conversation` 的 `HeroShell`）；默认 = `deepseek-100/800` + `blue-900 / neutral-bluish-50`。
  - 另外 `state-business-primary` 同时是 DSH 焦点环的 fallback（`focus.css`）与活动 / 选中态（安装包 40+ 个内置 UI 包共 225 处引用），`label-deep-diving` 是聊天里「运行中」状态标签。
- 参考图是官方 Everforest Light · medium（code bg = `#FDF6E3`）：其中占面积最大的绿是 **`statusline1` `#93B259`**（active tab 底、补全浮窗标题条、statusline 段），语法绿是 **`green` `#8DA101`**，`aqua` `#35A77C` 只在少量语法位置出现。也就是说参考图的「UI 绿」是上游的 statusline1 / green 家族，而不是 aqua。

**判断**：`blue` 是 Everforest 官方色，但上游职责是 **Info Messages / Identifiers**；DSH 却拿同一支 DeepSeek 品牌蓝来画主操作 / 活动 / 选中 / 焦点——按 token 名直译成 palette blue 就把整支交互强调染蓝了。第一版改成 `fg.aqua`（Enchanted `interactive-accent` 口径）；对照官方截图后用户确认要的是参考图的绿，**最终改为 `fg.green`**：深色档 `#A7C080` 与参考图 statusline1 完全同值，浅色档用 palette `green #8DA101`（参考图浅色 UI 条是浅一档的 `#93B259`，但那支会让品牌前景掉到 2.32:1、破本项目的 2.5:1 门槛，因此仍用 `green`）。

**改动**（`src/tokens.js`；用户从 4 个方向里选定绿色方案，深浅两档样张见 `.tmp/accent-preview/`）：

| 用途 | token | 旧值 | 新值 |
|---|---|---|---|
| 主发送按钮 / info 实底 | `button-info-fill` | `fg.blue` | `accentFill`（= `fg.green`，light·soft 微深） |
| 上述 hover | `button-info-hover` | `lift(blue, 18%)` | `lift(accentFill, 18%)` |
| 主按钮 hover（不再跳蓝） | `button-primary-hover` | `fg.blue` | `lift(accentFill, 18%)` |
| 品牌 / 主按钮实底 | `brand-primary`、`brand-primary-new-color`、`button-primary-fill` | `fg.blue` / `fg.aqua` | `accentFill` |
| 活动 / 选中 / 焦点环 | `state-business-primary` | `fg.blue` | `fg.green` |
| 上述软底（角标 / info 底） | `state-business-tertiary` | `tint(blue, 85%)` | `tint(green, 85%)` |
| 角标文字 | `label-primary-bluish` | `fg.blue` | `fg.green` |
| 运行中状态标签（+ shimmer） | `label-deep-diving` / `-shimmer` | `fg.blue` / 40% 透明 | `fg.green` / 40% 透明 |
| 交互 hover / 导航选中底 | `interactive-bg-hover-accent`、`sidebar-nav-item-active-accent` | `alpha(aqua, …)` | `alpha(green, …)` |
| Onboarding | `onboarding-accent` | `fg.aqua` | `fg.green` |
| 当前会话行底 | `src/active-session.js` 起点 | palette1 `bg_blue` | `mix(bg0, fg.green, 22%)` + 原守卫（2026-11-07 同日二次调整，见 §15） |

**浅色档的 `accentFill`**：brand / 填充按钮要配 `bg0` 墨色（`label-primary-foreground`），palette `green` 在 light·soft 只有 2.42:1，低于本项目 2.5:1 的已接受门槛，因此 `accentFill()` 仅在品牌前景不足 2.5:1 时向 `fg` 微调（light·soft → `#8a9e08`，2.51:1；其余五档保持原色，light·hard 2.81:1 / dark·soft 5.62:1）。这是有意的派生值，`tests/tokens.test.mjs` 的「brand foreground on brand …」钉住该门槛。

**保留蓝色**（文本 / 信息 / 内容层，不与交互混淆）：`link`、`--shiki-token-keyword`、色彩模式的行内 code 文字 / h5、`--dsw-static-blue-*` 与 `deepseek-*` 兼容色阶（第三方插件用的静态家族仍在 blue 色相上）。checkbox 不属于纯蓝：浅色档用 `aqua`（绿）、深色档用 `blue`（§13.1）。**aqua 的去向**：token 层不再用它做交互强调，但色彩模式仍用 `fg.aqua` 画列表 marker / 引用左条 / 分隔线（内容装饰层，Enchanted 语义），属于有意保留。

**影响面**：焦点环（不经 token 覆盖、跟随 `state-business-primary`）、DSH 全部内置 UI 包的 active / selected 态、第三方插件读取的 `state-business-primary`；对比度上 `state-business` on bg0：dark 6.88 / 6.23 / 5.62:1，light 2.81 / 2.69 / 2.42:1（语义色，report-only，见 `contrast.md` §2b）；品牌前景 2.81（light·hard）~ 5.62（dark·soft），light·soft 由 `accentFill` 抬到 2.51:1。当前会话行 6 档 fill 与对比度见 §15。

**验证**：`tests/tokens.test.mjs` 的 brand / 交互强调 / 语义状态断言 + 新增「interaction emphasis follows the green accent」；`tests/active-session.test.mjs` 6 档取值钉死 + 派生线 + 两道可见性守卫 + 0.02 L* 下限；`tests/integration.test.mjs` 的 `#8DA101` / `#A7C080` 断言；`node --test` **297/297**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建。

**已知边界（本轮不处理）**：发送按钮图标由 DSH 硬编码 `color:#fff`，深色档 `#A7C080` 上只有 2.00:1（浅色档 2.90:1），低于 3:1 图形门槛；要真正改善需注入作用域 CSS 把图标改成 bg0 墨色。参考图的浅色 UI 条 `#93B259`（statusline1）当时未采纳——需要把 statusline1 加进 palette 模型并接受品牌前景 2.32:1（破 2.5:1 门槛）。**2026-11-08 第二轮**按「浅色也用原绿色 / 各处绿色一致」统一回 `fg.green`；**同日第三轮**用户拿新的浅色裁图指出「绿色应该是浅绿色」，遂把 `statusline1` 纳入模型并把品牌门槛放宽到 1.95:1，浅色档采用 `#93B259`（现行值见 §23）。

## 22. 2026-11-08 绿色交互层收敛：选中行实色绿、「已完成未读」回蓝、目录 / 标题 / 下拉选中项绿色

> 触发：用户贴出 Everforest 官方 Neovim 的活动 tab 两枚裁图（深色 `#A7C080` 底 + 深色字；浅色 `#93B259` 底 + 奶油色字），
> 提出「选中的不需要左边的边框显示，直接绿色显示，不改变绿色的透明度了」「把 已完成未读 改成之前的蓝色模式」「工作区的每个目录名称也用绿色显示」；
> 同一天第二轮又提出「浅色目录名称还是用原绿色」「绿色选中后的时间看不清楚」「发送按钮的绿色感觉也有点不一样」
> 「上面标题的名称也改为绿色」「模型选择，推理强度、权限等下拉选项打开后，选中的内容文字和勾勾也改为绿色」。
> 两轮合并后的行为（第二轮口径，第三轮见上）：**所有交互 / 选中绿 = palette `fg.green` 原值**（dark `#A7C080` / light `#8DA101`），绿色只服务「当前 / 选中」语义。
>
> **2026-11-08 第三轮（现行，见 §23）**：用户再贴浅色裁图（`#93B259` 底）指出「浅色模式的绿色不对…绿色应该是浅绿色」，
> 同时报告选中行的时间 / 图标仍看不清 —— 浅色档交互绿因此改为上游 `statusline1` `#93B259`（dark 仍 `#A7C080`），
> `statusline1` 纳入 Foreground 模型（19 色），并修掉 active-session 的选择器拼接 bug（时间 / pin / 图标此前压根没拿到墨色）。
> §22 以下保留第二轮的过程记录，现行值以 §23 为准。
>
> **2026-11-09 更新**：会话标题的文字绿已按用户要求撤掉（「标题不需要绿色显示了」，见 §27），§22 / §25.6 里「标题改绿」的记录只作历史；侧栏目录名称仍为文字绿 `green`。

### 22.1 选中会话行：实色 `fg.green` 底 + 画布墨色

第一轮按参考图用了浅色档的 `statusline1`（`#93B259`）；第二轮用户要求浅色档回到原绿色并保持各处一致，于是统一为 `fg.green`：

- 行底 = 该 scheme 的 `fg.green`（第二轮取值；第三轮改为 `statusline1`）：dark `#A7C080`、light `#8DA101`；
- 文字 = 该变体的 `ramp.bg0`（与品牌实底 / 发送按钮 / 角标同一「强调实底 + 画布墨」配对）；
- 行内 tertiary 灰（状态槽、时间、pin、hover 操作按钮、加载 spinner）由规则重新 `color: inherit`；状态点保留语义色；
- 时间在 DSH 0.2.2-rc.1 里是 `rowResting` 单元格内的**嵌套** `span._time`，仅靠「直接子 span」覆盖不到（首轮漏掉，用户看到时间几乎不可见）——
  规则追加 `[class*="time"]` 命中；其余嵌套灰（pin / 图标按钮 / spinner）一并覆盖；
- 3px 竖条、`readableFill` / `separatedFill` / `visibleFill` 三道混色守卫全部删除。

墨色对比度：深色 6.88 / 6.23 / 5.62:1（AA）；浅色 2.81 / 2.69 / 2.42:1 —— 浅色调色板没有更深的墨，G17 按 scheme 分开
（深色 ≥4.5、浅色固定 2.3 已记录下限，`contrast.md` §2g），属统一 accent 的取舍而非漏检。

### 22.2 「已完成未读」行：回到 palette1 `bg_blue`

绿色既然专属当前会话行，完成未读行不能再用绿底。用户要求「改成之前的蓝色模式」——即 2026-10-24 蓝色选中行的观感：

- `ROW_RAMP.done` 改为 `{ fill: 'bgBlue', accent: 'blue' }`，`dotDone` 改为守护后的 `fg.blue`；
- 行底先走 `readableRowFill(bgBlue, bg0, labelPrimary)`，再用新的 `liftRowFill()`（原 `liftWarnFill` 泛化，目标 `ROW_DONE_SEPARATION = 4.5`）
  向 `fg.blue` 加深到「距侧栏 4.5 L*」或「4.5:1 门槛先到」；hover 再混 16% `fg.blue` 并重新守卫；
- 实测：dark-soft `#3f5764`、light-hard `#dcece9`，与 10-24 蓝色选中行同值；light·soft 因 4.5:1 无余量仍只剩极淡色（与 §13.7 记录的浅色限制同源，状态点仍是蓝的）。

### 22.3 工作区目录名称：`fg.green` 原值 + 600 字重（第三轮改为 `statusline1`，复核后回到 `fg.green`）

新增 `src/workspace-labels.js` + 常驻样式表（`data-plugin-css="dsh-everforest/workspace-labels"`）：

- 选择器 `[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"]`（`data-row-key` 是 DSH 的项目行契约，`projectText` 是 CSS-module 稳定后缀）；
- 颜色 = 该档文字绿 `fg.green` **原值、不做对比度守卫**（第三轮一度改为 `statusline1`，复核后回到 `green`；第一版曾守卫到 3:1，浅色档变成 `#7f9122`–`#768736` 的橄榄色，用户要求「还是用原绿色」所以去掉）；
- 深色档 `#A7C080`（5.0–6.2:1）；浅色档第二轮为 `#8DA101`（2.35–2.68:1），第三轮按「绿色应该是浅绿色」改为 `statusline1` `#93B259`（1.94–2.21:1，hover 底最弱 1.82:1），与选中行 / 发送按钮完全同色；**2026-11-08 复核**：用户对照上游配色指出「纯文字的绿色和选中的背景块绿色不是同一种，文字的更深」，确认上游的 `green`（前景文字色）与 `statusline1`（背景色）在浅色档本就是两种绿，于是文字回到 `fg.green`（浅色 `#8DA101`，2.35–2.68 / hover 2.13–2.47:1），选中块仍取 `statusline1`（§25.6）。
- **2026-11-13 追加（本轮）**：用户要求「帮我把文字加粗吧，如果是选中的打开了工作区下的对话，那么这个工作区的图标也变成全绿色」——
  ① 名称规则加 `font-weight: 600`（标题 14px/20px，字重不改变行高，34px 项目行与缩进不变）；
  ② 新增活动工作区图标规则 `[role="treeitem"][data-row-key^="workspace:"] [class*="folderActive"]`（DSH 的 `active = containsCurrentDescendant || expanded && containsCurrent`，即「该工作区下有当前打开的会话」），颜色取同一文字绿：浅色档 `#8DA101`、深色档 `#A7C080`。DSH 原生 `.folderActive` 取 business 强调色 `statusline1`，浅色档是更浅的 `#93B259`，本轮因此只改浅色档的图标观感（深色档两者同值，零变化），让「加粗名称 + 文件夹图标」读成同一种绿；
  ③ 规则总数 6 → **12**（6 条名称 + 6 条活动图标）；G18 仍只量文字（图标是装饰性标记，不单独设门槛，颜色与文字同值）。

### 22.4 会话标题与下拉选中项：`fg.green`（第三轮改为 `statusline1`）

新增 `src/ui-accents.js` + 常驻样式表（`data-plugin-css="dsh-everforest/ui-accents"`）。两处 DSH 原生都是 `label-primary`：

- **会话标题**：`ui-conversation` 头部当前面包屑 `crumbCurrent`（安装包内为 `_<hash>_crumbCurrent`），选择器 `[class*="crumbCurrent"]`；
- **下拉选中项**：`[role="menu"]` 内的 `[role="menuitem"][class*="selected"]`（Menu 的 check / fill 选择模式，权限选择器即此）
  以及 `[role="menuitemradio"][aria-checked="true"]`（模型、推理强度列表）；勾勾是它们的 `[class*="check"]` 子元素，单独覆盖；
- **选中项内部**（2026-11-08 追加）：DSH 不给每个部件继承 `color`，而是各自写死 token —— 前导图标 `_itemIcon_` 取 `--dsw-alias-menu-icon`、
  模式选项的标题 / 说明 `_itemName_` / `_itemDesc_` 取 `label-primary` / `label-caption`、工作区路径后缀 `pathSuffix` 取 `label-secondary`;
  于是选中项规则把这些 token（`MENU_INK_TOKENS`：`menu-icon` + `label-primary/secondary/tertiary/caption/dimmed`）
  在选中项的子树内一并重指为画布墨色（用户反馈「第一个图中 icon 颜色不对，第二个图中文字的颜色不对」）；未选中行保持中性色；
- 颜色 = 标题取**文字绿 `fg.green`**（复核后：dark `#A7C080`、light `#8DA101`），选中项实底取背景绿 `statusline1`（dark `#A7C080`、light `#93B259`）。深色档标题 5.62–6.88:1（AA）、菜单卡 4.28–5.32:1；
  浅色档标题 2.36–2.81:1、菜单卡 2.36–2.73:1，选中项墨色 2.00–2.32:1 —— G19 记录门槛（深色 4.0、浅色标题 2.3 / 墨色 1.95，`contrast.md` §2i）。

### 22.5 落点与门禁

- `src/active-session.js` 重写（18 条规则：6 条实色底 + 6 条行内墨色 + 6 条按钮 hover/focus 薄雾，含 `[class*="time"]`）；`src/color-mode.js` 的 `ROW_RAMP` / `dotDone` / `liftRowFill`；
- 新增 `src/workspace-labels.js`（6 条名称规则；2026-11-13 追加 6 条活动图标规则 = 12 条）与 `src/ui-accents.js`（6 变体 × 4 条规则 = 24 条；25.6 复核加回标题规则），`scripts/build.mjs` 的 `SOURCES`、`client-entry.js` 当时第 7 / 8 张常驻样式表；
- `Foreground` 模型第二轮保持 18 色；**第三轮加入 `statusline1` 变 19 色**（交互强调色，§23.1），`statusline2` / `statusline3` 仍只作上游留档；
- `scripts/check-contrast.mjs`：G4 品牌前景下限 1.95；G17 按 scheme 判定（深色 4.5 / 浅色 1.95）；G18 目录名称按静止 / hover 分档（深色静止 4.5、hover 4.0；浅色静止 2.3、hover 2.1）；**G19** 标题深 4.0（另检查标题本身 ≥4.5 的 AA）/ 浅 2.3，选中项墨色深 4.5 / 浅 1.95；重新生成 `contrast.md` §2g / §2h / §2i（2026-11-08 复核后：目录名 / 标题改文字绿 `green`，见 §25.6）；
- 测试：`tests/active-session.test.mjs`、`tests/color-mode.test.mjs`、新增 `tests/workspace-labels.test.mjs` 与 `tests/ui-accents.test.mjs`、`tests/integration.test.mjs`（当时 8 张样式表）；
- 结果：`node --test` **304/304**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建。
- 边界：浅色档选中行 2.42–2.81:1、浅色目录名称 2.2–2.7:1、浅色标题 / 菜单 2.36–2.81:1、light·soft 完成行仍极淡 —— 均为「统一原绿 + 不做守卫」的第二轮取舍，**第三轮已按 §23 换成 `statusline1`（2.0–2.3:1）**；2026-11-08 复核后文字绿（目录名 / 标题）回到 `fg.green`，浅色档 2.13–2.81:1，选中块仍是 `statusline1`（见 §25.6）；
  发送按钮图标仍由 DSH 硬编码 `color:#fff`（深色档 2.00:1），两轮都未改。

## 23. 2026-11-08 第三轮：浅色交互绿改用上游 `statusline1` + 修掉选中行时间 / 图标不可见

> 触发：用户贴两枚裁图 —— ① 官方 Everforest 浅色活动 tab（浅色 soft 画布 `#F3EAD3` 中，标签底是 `#93B259`，文字是浅奶油色）；
> ② 本插件浅色侧栏（选中行 `#8DA101` 底、时间 / pin 几乎看不见，红框标出 `29分钟`）。原话：
> 「浅色模式的绿色不对，不是要这个颜色，去参考 https://github.com/sainnhe/everforest 上面的，绿色应该是浅绿色」
> 「现在还是看不清楚后面的时间和图标」。

### 23.1 浅色交互绿 = 上游 `statusline1`

上游 `palette.md` 对 `statusline1` 的用途写得很明确：**Menu Selection Background、Tab Line Label Background (active)、Status Line Mode Indicator** ——
就是「选中 / 当前」表面的颜色（dark `#A7C080` 与 `green` 同值，light `#93B259`）。用户裁图里的 tab 底正是它，因此：

- `statusline1` 纳入 `Foreground` 模型（18 → 19 色，`scripts/palette.mjs` / `docs/reference/palette.md` §4 / `tests/palette.test.mjs` 同步；`statusline2` / `statusline3` 仍只作上游数据留档）；
- token 层新增 `interactionAccent(p) = p.fg.statusline1`，所有**交互 / 选中**角色改读它：`accentFill`（品牌 / 主按钮 / info 实底 + hover）、`state-business-*`、`label-primary-bluish`（预览版角标）、`label-deep-diving`（+ shimmer）、`onboarding-accent`、`interactive-bg-hover-accent`、`sidebar-nav-item-active-accent`；
- `accentFill` 不再向 `fg` 微深（旧实现为了让品牌前景达到 2.5:1，把 light·soft 抬到 `#8a9e08`）——用户要的就是参考色原值，品牌前景门槛随之放宽到 **1.95:1**（G4）；
- **语义绿不动**：`state-success-*`、`file-diff-*` / `code-diff-*`、色彩模式 h4 / 表头绿染 / 斑马纹、`shiki-token-function` 仍取 `green`；h1–h6 是六色（red / orange / yellow / green / blue / purple），checkbox 浅色档 `aqua`、深色档 `blue`，浅色气泡是 `bg_green`→`bg5` 22% 苔纸（不再用 `fg.green` 13%）；
- `src/active-session.js`（选中会话行）与 `src/ui-accents.js` 的选中项实底取 `statusline1`；`src/workspace-labels.js`（目录名称）与 `src/ui-accents.js` 的标题取文字绿 `green`（浅色档 `#8DA101`、深色同值），因此浅色档「选中行 / 发送按钮 / 角标 / 下拉选中项 = 一个浅绿，目录名称 / 标题 = 更深一档的文字绿」（§25.6）。

### 23.2 选中行时间 / 图标不可见：选择器拼接 bug

第二轮把墨色规则写成「每条选择器重新拼一遍作用域前缀」：

```js
[`${row} > span`, `${row} [class*="time"]`, …].join(`,\n${row} `)
```

结果第二条起变成 `row row [class*="time"]`（作用域出现两次），**一条都不匹配** —— 只有 `> span`（标题 / 时间单元格的父级）拿到墨色，
而 `rowResting` 里的 `span._time`、`pinIndicator`、`rowActions` 里的 `iconButton` 仍是 DSH 的 `label-tertiary` 灰（浅色档在绿底上约 1.4:1，红框里那就是「看不清」）。
另外 `color: inherit` 也不够：`rowResting` / `rowActions` 自己写了 `color: label-tertiary`，继承链在那里就断了。

修法：作用域只拼一次（`suffixes.map(s => `${row} ${s}`)`），并且**显式写入墨色**而不是 `inherit`；
命中 `> span`、`[class*="time"]`、`[class*="pinIndicator"]`、`[class*="iconButton"]`、`button`、`svg:not([data-state])`（`svg` 排除 `[data-state]`，状态点的语义色仍归色彩模式；§23.6 再补上中性的 `[data-state="ongoing"]` 加载 spinner）。
`tests/active-session.test.mjs` 增加了回归断言：墨色规则必须是 6 条选择器（§23.6 追加 spinner 后为 7 条）、每条只出现一次行锚点、且不含 `color: inherit`。

**定位方式**：用安装包里的 `ui-workspace` CSS（`.wnFoaW_sessionRow` / `.rowResting` / `.time` 真实规则）+ 本插件的样式表在共享 Chrome 里搭了一个
同构 DOM 复现（`.tmp/ref/ink-harness.html`），先复现出 `time = rgb(130,145,129)`（= light `grey2` `#829181`，与用户截图同值），再修好后复测为 `rgb(255,251,239)`。

### 23.3 6 档实测（`contrast.md` §2g–§2i）

| 变体 | 选中行底 | 墨 / 时间 / 图标 | 墨对比度 | 目录名称（侧栏 / hover 底） | 标题 | 菜单卡 | 品牌实底 |
|---|---|---|---|---|---:|---:|---:|
| light-hard | `#93B259` | `#FFFBEF` | 2.32 | 2.21 / 2.06 | 2.32 | 2.26 | 2.32 |
| light-medium | `#93B259` | `#FDF6E3` | 2.22 | 2.12 / 1.98 | 2.22 | 2.17 | 2.22 |
| light-soft | `#93B259` | `#F3EAD3` | 2.00 | 1.94 / 1.82 | 2.00 | 1.95 | 2.00 |
| dark-hard | `#A7C080` | `#272E33` | 6.88 | 6.17 / 5.66 | 6.88 | 5.32 | 6.88 |
| dark-medium | `#A7C080` | `#2D353B` | 6.23 | 5.56 / 5.08 | 6.23 | 4.78 | 6.23 |
| dark-soft | `#A7C080` | `#333C43` | 5.62 | 5.00 / 4.56 | 5.62 | 4.28 | 5.62 |

> 注：本表是第三轮（`statusline1` 时代）的当时值；§25.6 复核后目录名称 / 标题改用文字绿 `green`，现行值见 `contrast.md` §2h / §2i。

### 23.4 落点与门禁

- `scripts/palette.mjs`（`FOREGROUND_KEYS` / `FOREGROUNDS` / typedef）→ 重新生成 `src/palette.js`（19 色）；`docs/reference/palette.md` §4 表 + §5 语义行 + 偏差 9；
- `src/tokens.js`：新增 `interactionAccent()`，`accentFill()` 去掉守卫，`BRAND_INK_CONTRAST` 常量删除（门槛由 G4 把关）；
- `src/active-session.js`（fill = `statusline1`，墨色规则重写）、`src/workspace-labels.js`、`src/ui-accents.js`；
- `scripts/check-contrast.mjs`：G4 阈值 2.5 → 1.95，G17 浅色下限 2.3 → 1.95，G18 分档（深色静止 4.5 / hover 4.0、浅色静止 2.3 / hover 2.1），G19 标题深 4.0（另查 AA 4.5）/ 浅 2.3，重新生成 `contrast.md` §2g / §2h / §2i；
- 测试：`tests/active-session.test.mjs`（fill / 墨色值 + 6 档对比度 + 选择器回归）、`tests/palette.test.mjs`（19 色 + 文档表）、`tests/tokens.test.mjs`（brand / 交互强调 / 语义状态 / 品牌前景下限）、`tests/workspace-labels.test.mjs`、`tests/ui-accents.test.mjs`、`tests/integration.test.mjs`；
- 结果（第三轮当时）：`node --test` **304/304**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建（8 张样式表）；现行全量 **336/336**、常驻 11 张 / 含设置页 12 张（§12）。
- **边界**：浅色档墨色 2.00–2.32:1、目录名称 1.94–2.21:1、菜单卡 1.95–2.26:1 —— 这是上游参考 tab 本身的配对（奶油墨 on `statusline1`），
  浅色调色板没有更深的墨；发送按钮图标仍是 DSH 硬编码 `#fff`（浅色档 2.90:1、深色档 2.00:1），本轮未改。

### 23.5 选中行操作按钮的 hover / focus：换成墨色薄雾

> 追加反馈（2026-11-08）：「这个铃铛 hover 的时候显示还有点问题」。裁图里选中行右侧的提醒（铃铛）按钮悬停时出现一块**深灰实底方块**
> （dark·soft 实测 `#434F55` = `surface(2)`，浅色档同理是浅灰实底），而按钮图标已经被 23.2 的规则改成行墨色 —— 深底 + 墨图上几乎看不见。

**原因**：DSH 的 ghost / icon 按钮 hover 用的是**实底 surface token**，设计前提是「普通行底色」（`--dsw-alias-button-ghost-active-fill` /
`--dsw-alias-interactive-bg-hover-solid` = `bg2`；行内自带的 `.wnFoaW_iconButton` 本身只改字色、不加底色）。放到实色绿带上，
这块实底就成了不透明灰方块，并且吃掉墨色图标；第三方插件注入的行内动作（如提醒）也走同一 token。

**做法**：每个变体多加一条规则（第 3 条，共 18 条）：

```css
row button:hover,
row button:focus-visible {
  background-color: <行墨色 16% alpha>;  /* 8 位 hex，由 color.js 的 alpha() 生成 */
  outline-color: <行墨色>;               /* DSH 焦点环默认用 accent 绿，在绿底上不可见 */
}
```

- 薄雾用**行墨色**而非固定灰：深色档是深墨在绿底上压暗一层，浅色档是奶油墨提亮一层，两档都像「按了一层雾」；
- 16% 与 DSH 自己的 hover 叠加语义一致（`interactive-bg-hover` 也是 16%）；
- 焦点环改墨色（宽度仍取 `--dsw-focus-ring-width`），键盘导航在绿底上才看得见；
- 实现验证：在装了**真实安装包 CSS**（`.wnFoaW_sessionRow` / `.wnFoaW_iconButton`）的共享 Chrome 页面里放一枚「ghost 按钮 + `background:var(--dsw-alias-button-ghost-active-fill)` 的 hover 规则」，
  真实鼠标悬停后计算值 = `rgba(255,251,239,0.16)`（light·hard）/ 图标仍为墨色 —— 我们的选择器（6–7 个属性级）稳定压过该实底规则；
- 边界：薄雾 16% 在绿底上的可见度约 1.10–1.13:1（与 DSH 原生 hover 同量级），只作「可点击」提示，不承担对比度职责。

### 23.6 选中行的转圈图标（运行中 spinner）：`label-tertiary` 灰 → 行墨色

> 追加反馈（2026-11-08）：「整块高亮的时候，前面这个转圈的图标显示不明显，调整一下」。裁图是选中行左端的状态槽，
> 运行中的加载环几乎融进实色绿底，只剩一个影子。

**原因**：会话行首的状态槽由 `SessionStatusDots` 渲染，运行中那一档是 ui-primitives 的
`StateDot({ state: 'ongoing' })` —— 安装包里的真实标记是 `<svg data-state="ongoing" class="_spinner_…">`，
环与弧都用 `currentColor` 描边，而 `<svg>` 自己写着 `color: var(--dsw-alias-label-tertiary)`（安装包 CSS
`._spinner_1i3xo_37{flex:none;color:var(--dsw-alias-label-tertiary)}` 已核对）。它和文字不同：不是语义色，只是一个中性灰。
§23.2 的墨色规则用 `svg:not([data-state])` 刻意放过所有 `[data-state]` 图形（保住 done / warning / error 状态点的语义色），
于是 spinner 落在规则之外，在绿底上只剩 **1.22–1.39:1**（`grey2` `#9DA9A0` / `#829181` vs `statusline1`）——
比文字（1.2–1.6 的同批灰）更容易被当成「空槽」，因为环本身只有 2px 描边、轨道还有 25% 透明度。

**做法**：墨色选择器增加一条 `[data-state="ongoing"]`（第 7 条），颜色仍取该变体的行墨色 `bg0`；不碰其他 `[data-state]`：

```css
row [data-state="ongoing"] { color: <行墨色 bg0>; }
```

- `ongoing` 是 ui-primitives 里**唯一**的「非圆点」状态（`done` / `warning` / `error` / `idle` 是实心点、带语义色），
  而且是中性加载环，所以改写它不丢语义、也不会和色彩模式的状态点规则打架；
- 轨道仍保持 DSH 的 25% 透明度（只换色相），弧继续保持 1.5s dash 动画；`prefers-reduced-motion` 下静态环同样取墨色；
- 规则总数不变（每变体 3 条，共 18 条），只是墨色规则从 6 条选择器变 7 条。

**验证**（共享 Chrome，装了真实安装包 CSS + 真实 `StateDot` 标记的复现页 `.tmp/accent-preview/v8-*.html`，2× 截图）：

| 变体 | 改前 spinner 计算色 | 对绿底 | 改后 spinner 计算色 | 对绿底 |
|---|---|---:|---:|---:|
| dark·soft | `rgb(157,169,160)` = `grey2` `#9DA9A0` | 1.22 | `rgb(51,60,67)` = `bg0` `#333C43` | 5.62 |
| light·hard | `rgb(130,145,129)` = `grey2` `#829181` | 1.39 | `rgb(255,251,239)` = `bg0` `#FFFBEF` | 2.32 |

- 同一页里未选中的同款 spinner 仍是 `rgb(157,169,160)`（规则只在选中行作用域内），证明没有波及普通行；
- 状态点（`done` / `warning`）计算色不变，墨色规则没有任何 `[data-state="done"|"warning"|"error"|"idle"]` 选择器；
- `tests/active-session.test.mjs` 新增 1 项：6 档都含 `[data-state="ongoing"]`、且整张表不出现其他 `data-state` 状态；
- **边界**：浅色档 spinner 与文字同一配对（2.00–2.32:1），是「统一 accent」的既定取舍（§23.3），不是漏检；转圈图标的可读性由色相（灰 → 墨）解决，不改 DSH 的环宽 / 动画；语义状态点（`warning` 琥珀 / `done` 绿 / `error` 红）在绿带上仍是原语义色 —— 若以后也看不清，再单独给它们加墨色描边（本轮未动）。
- 结果：`node --test` **309/309**（新增 1 项）、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建（6935 行）。

## 24. 2026-11-08 插件更新弹窗：步骤文字改绿、勾选徽标改实底

> 触发：用户贴「更新 dsh-ops」完成弹窗裁图（dark·soft）并反馈：「这个更新界面的配色感觉不好看，打勾的图标颜色太淡了，
> 还有文字为什么是蓝色显示的？为什么不用绿色？你看看怎么帮我调整一下。」

### 24.1 弹窗结构与实测颜色

DSH `ui-plugin-manager` 的 `UpdateDialog`（安装包 0.2.2-rc.1 已核对）把更新过程渲染成：

- 外层 body：`<div data-plugin-update="done">`（阶段即 `confirm` / `running` / `done`）；
- 结果行：`<div role="status">` + 32px 圆形容器 `[data-tone="success"]`（勾）+ 标题 / 说明；
- 步骤列表：`<ol>` 里每个 `<li data-state="done|failed|running|unknown">`，子元素是 20px 圆点（`span`）和纯文字标签（`span`）。

安装包 CSS 只给完成态圆点 `background: color-mix(success 12%, transparent); color: success`，**步骤文字没有任何显式颜色**；
用户裁图的实测值：弹窗底 / 步骤面板 `#434F55`（dark·soft `bg2`）、标题与结果标题 `#D3C6AA`（`fg`）、说明 `#9DA9A0`（`grey2`）、
步骤文字 `#7FBBB3`（= 本主题 `--dsw-alias-link` 的 dark 值，即 Everforest 的信息蓝），完成圆点底 `#4F5C5A`（12% `#A7C080` 叠在 `#434F55` 上）。
也就是说：**步骤文字落在了信息蓝上而不是成功绿**，而 12px 的细线勾在 12% 淡底上只有约 3.6:1，观感发灰。

### 24.2 调整

新增常驻样式表 `src/plugin-update.js`（与 §15 / §22 / §23 的 chrome 层同构，6 档 × 5 条规则，作用域用 `html[data-everforest-*]` + `body[data-ds-dark-theme]`）：

| 表面 | 规则 | 颜色 |
|---|---|---|
| 步骤文字（默认 / running / unknown） | `[data-plugin-update] [data-state] > span:last-child` | 方案 `fg`（`label-primary`） |
| 完成步骤文字 | 同上 `[data-state="done"]` | 交互强调色 `statusline1`（dark `#A7C080` / light `#93B259`） |
| 失败步骤文字 | 同上 `[data-state="failed"]` | 语义红 `fg.red` |
| 完成步骤圆点（20px） | `[data-plugin-update] [data-state="done"] > span:first-child` | **实底** `statusline1` + 方案画布 `bg0` 墨色勾 |
| 结果行大图标（32px） | `[data-plugin-update] > [role="status"] > [data-tone="success"]` | 同上：实底绿 + `bg0` 墨色勾 |

- **为什么用交互强调色 `statusline1`**：2026-11-08 同日追加反馈——浅色模式下弹窗里的绿是 `#8DA101`（语义绿），
  而同一个弹窗右下角的「完成」按钮是 `#93B259`（`statusline1`），用户要求统一到 `#93B259` 这一档。
  于是完成步骤文字 / 实底圆点 / 结果大图标都改用交互强调色：dark 取 `#A7C080`（与语义绿同值，观感不变），
  light 取 `#93B259`，与「完成」按钮、选中会话行、下拉选中项同一个 `statusline1` 绿；会话标题 / 目录名称用文字绿 `green`（浅色 `#8DA101`，§25.6；§21 / §23）。
  失败步骤仍用语义红 `fg.red`；`state-success-*` 等语义绿 token 不动（§23.1）。
- **为什么勾选改实底**：淡底细线的观感问题不在色相而在明度差（3.6:1）。实底绿 + 画布墨把勾选变成高对比徽标：
  dark 5.62–6.88:1；light 是调色板同一配对（`bg0` on `statusline1` = 2.00–2.32:1，与品牌实底 §23.3 同级的已记录取舍）。
- **选择器只用稳定钩子**：`data-plugin-update`（DSH 自己写在 body 上的数据钩子）、`data-state`、`role="status"`、`data-tone`，
  不依赖 `V7pFBG_` 这类 CSS-module 哈希前缀；颜色全部由调色板算出（无手调 hex），不写 `!important`。
- 只改这两类表面：弹窗标题 / 说明 / 结果标题、失败圆点、running 的 `StateDot` 全部保持 DSH 原样。

### 24.3 落点与门禁

- `src/plugin-update.js`（新）、`src/client-entry.js`（1g 常驻样式表 + 卸载移除）、`tests/plugin-update.test.mjs`（4 项：6 档角色值 / 对比度下限 / 30 条规则结构 / 无门控无 `!important`）；
- `scripts/build.mjs` 的 `SOURCES` 增一项；`tests/integration.test.mjs` 的常驻样式表断言当时 8 → 9（含设置页），并补 `plugin-update` owner 断言；
- `scripts/check-contrast.mjs` 新增 **G20**：深色档步骤文字 ≥ 4.0:1、实底徽标墨色 ≥ 4.5:1；浅色档固定 1.9 / 1.95 的已记录下限；失败步骤的语义红文字只测量 / 打印、不设门槛；重新生成 `contrast.md` §2j；
- 6 档实测（`contrast.md` §2j）：dark 步骤文字 4.22–5.24、徽标 5.62–6.88；light 步骤文字 1.95–2.26、徽标 2.00–2.32；失败步骤红字 2.66–3.82（仅报告，无门槛）；
- 结果（插件更新弹窗轮当时）：`node --test` **313/313**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建（7107 行；当时常驻样式表 8 张、含设置页 9 张）；现行全量 **336/336**、常驻 11 张 / 含设置页 12 张（§12）。
- 验证：共享 Chrome 里用安装包真实 CSS（`ui-plugin-manager` 的 `V7pFBG_*` + 壳层 Modal / Button）+ 同构 DOM 复现弹窗（`.tmp/update-dialog-preview.html`）：
  改前步骤文字计算值 `rgb(127,187,179)`（= `#7FBBB3`，与用户截图同值）、圆点底 `color(srgb .65 .75 .50 / .12)`、勾 `rgb(167,192,128)`；
  改后步骤文字 `rgb(167,192,128)`（交互强调色）、圆点底实色 `rgb(167,192,128)`、勾 `rgb(51,60,67)`（dark·soft 5.62:1）；前 / 后对照截图见 `.tmp/update-dialog-preview.png`。
  浅色档（light·hard，`.tmp/update-dialog-light-preview.html`）：改前步骤文字 / 圆点 / 结果图标计算值 `rgb(141,161,1)`（= `#8DA101`），而同一弹窗「完成」按钮是 `rgb(147,178,89)`（= `#93B259`）；
  改后四者统一为 `rgb(147,178,89)`（`#93B259`），对照截图见 `.tmp/update-dialog-light-preview.png`。


## 25. 2026-11-08 上游 `palette.md` 语义对齐：A7 / A9（A8 仅登记）

> 触发：`docs/reference/palette.md` 对照 sainnhe/everforest `palette.md` 的符合性评估（见 Obsidian 笔记 `02-上游palette规范符合性评估-2026-11-08`）后，用户逐条拍板：A7 修改、A8 只登记 Diff Changed 语义、A9 修改、§5 文档失真确认后修正。

### 25.1 A7：选中项 = 背景色（`statusline1`），标题 / 目录名回默认文字色

- 上游把 `statusline1` 定义为**背景**色（Menu Selection Background / 活动 tab 底 / statusline 模式块），`bg5` 标注「Not currently used」。
- `src/ui-accents.js` 重写：A7 当下先把会话标题、菜单文字的染色撤掉，只给下拉菜单 / 单选列表的**选中项**染色——`statusline1` 实色底 + 方案画布 `bg0` 文字与勾勾，粒度 6 档 × 3 条规则（25.6 复核时按用户要求把标题规则加回，变为 6 档 × 4 条规则）。命中的稳定钩子：`[role="menu"] [role="menuitem"][class*="selected"]`、`[role="menu"] [role="menuitemradio"][aria-checked="true"]`，以及 DSH 菜单的 `[class*="selectedFill"]` 填充子元素与 `[class*="check"]` 勾勾。
- `src/workspace-labels.js` 与 `dsh-everforest/workspace-labels` 常驻样式表在本轮删除，工作区目录名称、会话标题回到 DSH 原生 `label-primary`（`client-entry.js` 常驻样式表 8 → 7 张、含设置页 9 → 8 张）；25.6 复核时按用户要求恢复（8 / 9 张）；聊天气泡样式表随后加入为 10 / 11 张；2026-11-09 新会话首屏样式表加入后现行 11 / 12 张（§12 / §26 / §28）。
- `src/tokens.js`：`interactive-bg-hover` / `-active` 从 `bg5` 的 16% / 28% 改为 `bg4` 的 50% / 80% 半透明叠层（上游没有 hover 角色；`bg5` 退出交互层，边框仍按 Enchanted 语义取 `bg5`，见 §4）。
- 对比度：深色档画布墨 on `statusline1` = 5.62–6.88:1（AA）；浅色档 2.00–2.32:1，是调色板奶油墨的自身上限（上游参考 tab 同配对），G19 记 1.95 下限并新增「对菜单卡 ≥ 0.02 L* 步长」检查。

### 25.2 A9：弱化文字族改用 `grey0`

- 上游灰阶分工：`grey0` = 行号 / 折叠列 / 隐藏文字 / 前景 UI 元素；`grey2` = 光标行号 / 非活动 tab 标签。
- `src/tokens.js` 的 `label-tertiary` / `label-caption` / `label-dimmed` / `state-idle-primary` 从 `grey2` 改为 `grey0`；DSH 用 `label-tertiary` 画代码行号，因此行号 / 折叠列 / 「⋯ 展开」等一并落到上游角色。
- 可读性取舍：`grey0` 在浅色档对 `bg0` 约 1.9–2.2:1（`contrast.md` §4 label-tertiary 实测 2.17 / 2.08 / 1.88；上游本就把它当非正文），弱化文字会明显变淡；`label-secondary` 仍是 `grey1`，正文与注释不受影响。色彩模式的 `faint`（删除线 / 已完成任务）跟随 `label-tertiary`，逐值由 `tests/color-mode.test.mjs` 更新。

### 25.3 A8：`bg_blue` 的 Diff Changed 只登记语义

- 上游 `bg_blue` = Diff Changed Line Background / Info Highlights；DSH 0.2.2 的 diff 只有 added / deleted 行（`_add_` / `_del_` / `_context_`），没有 changed 行表面与 token（已核对安装包 CSS / JS 与 217 token 清单）。
- 因此在 `docs/reference/palette.md` §5 偏差 11 登记该角色，不新增无消费者 token，也不改动现有 diff 配色（`bg_blue` 继续用于「已完成未读」行底与浅色行内 code 芯片，info 高亮仍取 `statusline1` 淡染）。

### 25.4 §5 文档失真修正（评估表 1–6、9）

- `palette.md` §5：表格三色淡染、搜索高亮无落点、运算符 / tag / 属性映射、tag = `bg3` alpha 面、checkbox 浅色 aqua / 深色 blue、`header-*` 实际使用面、`label-tertiary` 由 `grey0` 派生——按实现改写；新增偏差 10 / 11。
- `tests/palette.test.mjs`：补 `statusline2` / `statusline3` 的文档取值校验（上游 `#D3C6AA`/`#708089`、`#E67E80`/`#E66868`），并断言它们不进 Foreground 模型——补上评估里「改错不会失败」的门禁缺口。

### 25.5 落点与门禁

- 代码：`src/ui-accents.js`（重写，25.6 复核后加回标题规则）、`src/tokens.js`（交互叠层 + 灰阶）、`src/client-entry.js`（常驻样式表合并，25.6 复核后恢复目录名样式表）。
- 测试：`tests/ui-accents.test.mjs` 重写（fill / ink / 6 档对比度 / 规则结构，25.6 复核后加标题规则）、`tests/workspace-labels.test.mjs` 在 A7 删除、25.6 复核时恢复、`tests/integration.test.mjs` 样式表数量（当时 8 → 9；10 → 11（§26 后），见 §12）、`tests/tokens.test.mjs` 灰阶期望、`tests/color-mode.test.mjs` faint 期望、`tests/palette.test.mjs` 新增档案色校验。
- 脚本：`scripts/build.mjs` SOURCES（A7 去掉 `workspace-labels.js`、25.6 复核后加回）；`scripts/check-contrast.mjs` 删除 G18、重写 G19（25.6 复核后恢复 G18 并扩展 G19：标题 + 选中项两张表），报告 §2h 恢复、§2i 重写，重新生成 `contrast.md`。
- 验证：`node --test`（A7 阶段 308/308；25.6 复核后 314/314；现行 329/329）、`npm run check`（palette / build / contrast）全绿、`client.js` 已重建。
### 25.6 复核：按用户要求恢复「标题 / 目录名称」绿色

- 用户看完 A7 效果后要求「侧边栏中，工作区的名称还是改为绿色，标题的名称也改为绿色显示」，并明确「标题」指对话区上方的当前会话标题（不是侧栏会话列表每一行）。
- `src/workspace-labels.js` 恢复：侧栏项目行标题（`[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"]`，6 档 × 1 条规则，不做对比度守卫）；`src/ui-accents.js` 加回标题规则（`[class*="crumbCurrent"]`），6 档 × 4 条规则：标题文字 / 选中项实底 / 填充子元素 / 勾勾。
- **复核修正（同日）**：恢复的第一版让文字也取 `statusline1`，用户对照上游配色指出「纯文字的绿色，和选中的背景块绿色不是同一种，文字的好像更深」。查 `palette.md`：上游 `green` 是前景色（Function Names / Strings / Search Highlights 等），`statusline1` 是背景色（Menu Selection Background / 活动 tab 底）——浅色档 `#8DA101` vs `#93B259`，深色档两者同为 `#A7C080`。于是文字（标题、目录名）改用 `fg.green`，选中块实底仍取 `statusline1`；深色档无变化，浅色档文字明显加深，同时也把浅色档的实测对比度从 1.94–2.32:1 抬到 2.13–2.81:1。
- 对比度：A7 把 hover 叠加层换成 `bg4` 50%，目录名在 hover 行最强弱——深色静止 5.00–6.17:1 / hover 4.01–4.98:1，浅色静止 2.35–2.68:1 / hover 2.13–2.47:1；G18 下限因此定为深色静止 4.5 / hover 4.0、浅色静止 2.3 / hover 2.1（实测值见 `contrast.md` §2h），G19 标题门槛保持深 4.0（另要求标题本身 ≥4.5:1 的 AA）/ 浅 2.3，选中项墨色仍为深 4.5 / 浅 1.95。
- 落点：常驻样式表当时回到 8 张（含设置页 9 张），聊天气泡样式表加入后为 10 / 11 张（现行 11 / 12，§12 / §26 / §28）、`tests/integration.test.mjs` 样式表数量当时 7 → 8 / 8 → 9（现行断言 11 / 12）、`tests/workspace-labels.test.mjs` 恢复（期望值改为 `green`）、`tests/ui-accents.test.mjs` 改为 4 条规则并新增标题对比度断言（文字绿 ≠ 选中块绿）、`scripts/check-contrast.mjs` 恢复 G18 并扩展 G19（标题取 `green`、选中底取 `statusline1`）、`contrast.md` §2h 恢复 + §2i 重写；`palette.md` 偏差 10 / §5 表同步。
- **2026-11-09 撤回（现行）**：用户贴出对话区标题截图要求「这里调整一下，标题不需要绿色显示了」，会话标题规则（`[class*="crumbCurrent"]`）删除，标题回到 DSH 原生 `label-primary`；`ui-accents` 由 6 档 × 4 条规则收缩为 6 档 × 3 条（标题 / 选中项实底 / 填充子元素 / 勾勾 → 后三条），G19 只剩选中项一张表。详见 §27。

## 26. 2026-11-09 选中导航行高亮（nav-accent）

> 触发（两轮）：用户先贴设置弹窗截图（红框标出左侧导航的 Everforest 行）：「设置这里，选中某一项过后，目录栏的高亮显示没有了」；
> 随后贴侧栏面板列表截图（深色档，红框标出「自动化任务」行）：「帮我把这里也加上选中变色」。

### 26.1 两个表面的根因

1. **设置弹窗导航**（`ui-settings-general`）：`.panel { background: var(--dsw-alias-bg-layer-2) }`、
   `.navCell.active { background: var(--dsw-specific-sidebar-nav-item-active) }`、
   `.navCell:hover { background-color: var(--dsw-alias-interactive-bg-hover) }`。上游取值为
   `sidebar-nav-item-active` 浅色 = `neutral-bluish-100`（白面板上一档灰）、深色 = `neutral-bluish-750`（比面板亮两档）；
   但本插件 token 层（`src/tokens.js`）把 `--dsw-alias-bg-layer-2` 与 `--dsw-specific-sidebar-nav-item-active`
   **都映射到 `surface(p, 2)`**，选中行被涂成面板同色 → 只有 hover 可见，点中即「消失」。该映射自 0.1.0 起存在。
2. **侧栏面板列表**（`ui-sidebar`，插件市场 / 自动化任务 / 上下文洞察 / Todoist …）：`SidebarRoot.module.css` 的
   `.panelRow.panelActive { background-color: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary) }`
   —— 选中行直接复用了 **hover token**，既没有专属选中 token，也和 hover 完全同色（实测 dark·soft：
   sidebar `#39444A` 上叠 50% `bg4` = `#475258`；用户截图里红框行正是这个中性灰）。

### 26.2 为什么不由 token 层单独修

- 设置弹窗：面板在 `bg-layer-2` 上，浅色档 `label-primary` 在面板上只有 4.53–5.26:1（light·soft 只剩 0.03 余量），
  任何「深到看得见」的填充都会把导航文字压到 4.5:1 以下；反过来亮到能保住 AA 的填充离面板只有 1–2 L*，仍看不出。
  `surface(p,3)` 实测浅色档只有 0.1–0.8 L* 差，深色档同理越亮越糊。
- 侧栏面板列表：上游根本没有选中 token，DSH 的规则把 hover 当选中。
- 因此两个表面都改用主题既有的**交互式凭据**：chrome 里所有「选中 / 当前」都是 `statusline1` 实底 + 画布 `bg0` 墨
  （选中会话行、下拉选中项、发送键、预览角标）。设置导航的 token 层维持原值不动（回落时文字仍可读，只是没有高亮；
  token 的 4.5:1 文字表面门禁保持有效）。

### 26.3 做法

- 常驻样式表 `src/nav-accent.js`（`<style data-plugin-css="dsh-everforest/nav-accent">`），6 档 × 2 条规则：
  ① 两条选中行选择器共用的 `statusline1` 实底 + 画布墨；② 两条选中行的 `:focus-visible { outline-color: <ink> }`
  （DSH 焦点环默认取 accent 绿，在 accent 带上不可见——选中会话行同款处理）。

```css
html[data-everforest-light="hard"] body:not([data-ds-dark-theme])
  [data-shortcut-modal="settings"] nav button[aria-current="true"],
html[data-everforest-light="hard"] body:not([data-ds-dark-theme])
  [data-slot="sidebar"] nav button[aria-current="page"] {
  background-color: #93B259;  /* statusline1 */
  color: #FFFBEF;             /* bg0 */
}
```

- 锚点只用 DSH 契约，不用 CSS-module 哈希：
  - 设置弹窗 = `[data-shortcut-modal="settings"]`（快捷层 modal id）+ `nav button[aria-current="true"]`；
  - 侧栏面板行 = `[data-slot="sidebar"]`（layout 声明的 `sidebar` 槽位，渲染器给每个 slot outlet 的
    `display:contents` 包裹层写 `data-slot`）+ `nav button[aria-current="page"]`。
  - 注意 layout 的 `data-sidebar-collapsed` 只在折叠时存在，不能用来限定展开态；`aria-current` 的值两边不同
    （设置 `"true"`、面板行 `"page"`），互不误伤。0.2.2-rc.1 / 0.2.1-rc.5 均核对过。
- 规则特异性高于上游 `.navCell:hover` / `.navCell.active` / `.panelRow:hover` / `.panelRow.panelActive`，
  选中行 hover 时不会退回半透明 hover 洗色；按钮 `color` 由 `navLabel` / `navIcon` / `panelTitle` 继承，
  松树、dshmarket 的 `MarketLogo`、dsh-context 等 glyph 都用 `currentColor`，同为画布墨。
- 取值（`navAccentRoles()` = palette 原值，零推导）：

| 变体 | fill（statusline1） | ink（bg0） | 墨对比度 | 与设置面板对比 | 与侧栏中性洗色对比 |
|---|---|---|---:|---:|---:|
| light-hard | `#93B259` | `#FFFBEF` | 2.32 | 2.26 | 2.04 |
| light-medium | `#93B259` | `#FDF6E3` | 2.22 | 2.17 | 1.92 |
| light-soft | `#93B259` | `#F3EAD3` | 2.00 | 1.95 | 1.76 |
| dark-hard | `#A7C080` | `#272E33` | 6.88 | 5.24 | 4.98 |
| dark-medium | `#A7C080` | `#2D353B` | 6.23 | 4.70 | 4.47 |
| dark-soft | `#A7C080` | `#333C43` | 5.62 | 4.22 | 4.01 |

  浅色三档的 2.00–2.32:1 与选中会话行 / 下拉选中项是同一对（上游参考 tab 的配对，`contrast.md` §2g 已记录）；
  深色三档为 WCAG AA。侧栏洗色对比 = 实底 vs 「`interactive-bg-hover` 叠在 `sidebar-fill` 上」的旧选中外观。

### 26.4 落点与门禁

- 代码：`src/nav-accent.js`（新增，`navAccentRoles()` / `navAccentStyles()`；上一轮的 `settings-nav.js` 并入并改名）、
  `src/client-entry.js`（1e 常驻样式表）、`scripts/build.mjs`（SOURCES 增加 `nav-accent.js`）；
  token 层零改动，`contrast.md` 无需重生成。
- 测试：`tests/nav-accent.test.mjs`（8 项）——6 档 fill / ink 钉死为 palette 原值、墨色对比度分档门禁、
  设置带与面板 / 选中 token 的可见性下限（≥1.9:1，并钉住「token 仍等于面板」这一根因）、
  侧栏带与旧中性洗色的可见性下限（浅 ≥1.7 / 深 ≥4.0，实测值钉死）、锚点契约（两条 `aria-current`、
  不含 `AnXs9G` / `wtg9ga` / 类名）、每档两条规则（band + focus）且选择器精确、无 `!important`、hover 不丢底色；
  `tests/integration.test.mjs` 的常驻样式表断言 10 / 11 张并新增本样式表。
- 验证：`node --test` **329/329**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建；
  **DOM 实测**：用安装包真实的 `SettingsRoot` / `SidebarRoot` CSS + `tokensFor()` token 层 + `navAccentStyles()`
  输出搭同构页面（`data-shortcut-modal` / `[data-slot="sidebar"]` / `aria-current` / `data-ds-dark-theme` /
  `<html>` 强度属性齐全），共享调试 Chrome 六档读数：两条选中行背景 = `statusline1`、文字 / glyph = `bg0`、
  面板与侧栏保持原色、非选中行不变；CDP `CSS.forcePseudoState('hover')` 下选中行仍是实底（特异性生效）。
- **边界**：`[data-shortcut-modal="settings"]` / `[data-slot="sidebar"]` 是 DSH 内部标识（modal id / slot 名，
  后者属公开槽位契约），未来改名会让对应规则静默失效 → 回落到现状（设置行无高亮 / 面板行中性洗色，文字仍可读）；
  `aria-current` 是 a11y 契约，风险更低。真机窗口目检仍待用户确认（桌面 app 未开 CDP、Web GUI 需 token，
  与会话内既有约束一致）。

## 27. 2026-11-09 会话标题去掉绿色（ui-accents 收缩）

> 触发：用户贴出对话区头部截图（红框标出当前会话标题「修复目录栏选中高亮」）：「这里调整一下，标题不需要绿色显示了」。

### 27.1 表面与决策

- 会话标题是 `ui-conversation` 头部的当前 crumb：`ConversationRoot` 的 `conversation.session.header` 渲染
  `span.crumb.crumbCurrent`（ancestry 最后一段），上游 CSS 是
  `.crumbCurrent { color: var(--dsw-alias-label-primary); cursor: default; font-weight: 500 }`
  （0.2.2-rc.1 安装包 `@deepseek-ai/dsh-client-ui-conversation/lib/client.js` 核对；同一类名在
  `ui-input-trigger` 的菜单面包屑里也出现，但那是 11px 的菜单触发器，本规则此前一并命中）。
- 2026-11-08 用户要求标题改文字绿（§22 / §25.6），`src/ui-accents.js` 用 `[class*="crumbCurrent"]` 覆盖成
  `fg.green`；G19 另有「标题对标题表面 / 菜单卡」两项对比度检查。
- 决策：**删除标题规则**，标题回到 DSH 自己的 `label-primary`（token 层映射为本主题 `fg`：浅色 `#5C6A72`、
  深色 `#D3C6AA`）。理由：① 标题是「位置」信息，不是「选中 / 当前操作」语义，绿色在本主题里专属于交互强调
  （§15 / §23）；② 浅色档文字绿对奶油底只有 2.42–2.81:1，作为常驻标题是一块亮色，页面一打开就抢注意力
  （用户截图红框标出的正是这一点）。
- **否决**：改用别的强调色（同样抢眼，且破坏「绿色 = 当前 / 选中」的既定分工）；给标题加粗 / 加底色
  （超出「去掉绿色」的范围，属另一轮设计）。**保留**：侧栏工作区目录名称仍是文字绿 `green`
  （`src/workspace-labels.js`，2026-11-08 的独立用户要求，本轮截图只针对对话标题）。

### 27.2 落点

- `src/ui-accents.js`：删除 `HEADER_TITLE` 导出、`UI_ACCENT_DARK_CONTRAST` / `UI_ACCENT_LIGHT_CONTRAST`
  两个标题门槛常量以及每档的标题规则；`uiAccentRoles()` 由 `{ green, fill, ink }` 收缩为 `{ fill, ink }`，
  样式表 6 档 × **3 条规则**（选中项实底 / 填充子元素 / 勾勾）。常量只剩 `UI_ACCENT_DARK_INK_CONTRAST`（4.5）与
  `UI_ACCENT_LIGHT_INK_CONTRAST`（1.95）。常驻样式表数量与顺序不变（仍 10 张 / 含设置页 11 张，§12）。
- `src/client-entry.js`：1g 注释同步（不再描述标题规则）。
- `scripts/check-contrast.mjs`：G19 收缩为「下拉选中项」单表——删除标题合法色、标题对标题表面 / 菜单卡两项检查与
  `titleThreshold`，只保留选中项 fill / ink 合法性、墨色阈值与对菜单卡的 L* 步长；§1 门槛 19、§2g / §2i 文案同步，
  `contrast.md` 重新生成（§2i 由两张表变一张，标题表删除）。
- `tests/ui-accents.test.mjs`：去掉 `HEADER_TITLE` / `EXPECTED_GREEN` / 标题对比度用例与两条标题门槛；规则数 4 → 3；
  新增「会话标题不由本样式表染色」回归断言（`!css.includes('crumbCurrent')`，并钉住 `projectText` 不在本表）。
  `tests/integration.test.mjs`：`ui-accents` 样式表断言由「包含 `crumbCurrent`」反转为「不包含」。
- 未改：token 层、`src/workspace-labels.js`、其它常驻样式表；`client.js` 随本轮重建（7511 行 / 325,332 字节）。

### 27.3 验证与边界

- `node --test` **329/329**（`ui-accents` 仍 7 项：删一条标题对比度、加一条「标题不染色」，总数不变）、
  `npm run check` 全绿（palette / build / contrast），`contrast.md` 已重生成。
- DOM 实测（2026-11-09）：用安装包真实的 `ConversationRoot.module.css`（`header` / `titleCluster` / `crumbs` /
  `crumbSeg` / `crumb` / `crumbCurrent`）+ `tokensFor()` 六档 token 层 + `uiAccentStyles()` 输出搭同构页面，
  共享调试 Chrome 读数（light / dark 各三档，用 `data-everforest-*` 属性切档）：
  - 标题 `color` = `rgb(92,106,114)` `#5C6A72`（浅色三档）/ `rgb(211,198,170)` `#D3C6AA`（深色三档），即本变体
    `label-primary`；`font-weight` 仍为上游的 500。
  - 灵敏度对照：在页面里注入已删除的旧规则（`[class*="crumbCurrent"] { color: #8DA101 }`）后标题立刻变成
    `rgb(141,161,1)`，移除即回到 `#5C6A72` —— 说明测量能抓住旧行为，修复后的中性色不是「规则没命中」。
  - 下拉选中项未受影响：底 = `rgb(147,178,89)` `#93B259`（浅）/ `rgb(167,192,128)` `#A7C080`（深），
    文字 / 勾勾 / 前导图标 = 该档画布 `bg0`（2026-11-13 rc.2 复核：选中项已不再渲染 `selectedFill` 子元素，
    子元素规则随之删除，见 §12）。未选中行透明。
- 边界：`[class*="crumbCurrent"]` 是 CSS-module 本地名（哈希前缀后保留），本轮删除后不再依赖它；若以后又要标题绿色，
  恢复一条规则 + G19 标题检查即可。桌面 app 未开 CDP、Web GUI 需 token（§26.4 同一约束），真机窗口目检仍需用户
  刷新页面确认。

## 28. 2026-11-09 新会话首屏：鲸鱼标志 + 标题改绿（hero-title）

> 触发：用户贴出新会话欢迎页截图（红框标出鲸鱼标志 +「探索未至之境」标题）：「帮我把这里的也改成绿色，我看看效果」。

### 28.1 表面与决策

- 首屏标题是 `ui-conversation` 的 `HeroShell`（0.2.2-rc.1 安装包 `@deepseek-ai/dsh-client-ui-conversation/lib/client.js` 的
  `HeroShell.module.css` 核对）：`.headline { color: var(--dsw-alias-label-primary) }`、`.titleGroup > span`
  （标题文字继承 headline 墨色）、`.fish { color: var(--dsw-alias-label-primary) }`（鲸鱼 SVG path 用
  `fill="currentColor"`）、「预览版」角标 `.previewBadge { color: var(--dsw-alias-label-primary-bluish);
  background: var(--dsw-alias-state-business-tertiary) }` —— 即鲸鱼与标题共用 `label-primary`（本主题 `fg`：
  浅色 `#5C6A72`、深色 `#D3C6AA`）；角标已有自己的主题色。
- 决策：鲸鱼 + 标题取调色板**文字绿 `green`**（浅色 `#8DA101` / 深色 `#A7C080`），与侧栏目录名称（§22.3）同一角色；
  不用背景绿 `statusline1`（浅色 `#93B259` 更浅，26px 大字上像一层水洗）。「预览版」角标不动。
- **否决**：把 `label-primary` 全局改绿（会连带所有正文）；改用 `conversation.hero.brand.mark` 槽位换插件自己的鲸鱼图标
  （用户要的是颜色，不是换图形；占用槽位还会盖掉 DSH 的 hover 游动动效）。

### 28.2 做法

- 常驻样式表 `src/hero-title.js`（`<style data-plugin-css="dsh-everforest/hero-title">`），6 档 × 1 条规则：
  选择器 = `[class*="headline"]:has([class*="fishHitbox"])` 及其下的 `[class*="fish"]`。
  为什么不裸用 `[class*="headline"]`：同一个安装包里上下文用量弹层也有 `.A6Bq1a_headline`（`label-tertiary`），
  而首屏 headline 是唯一含 `fishHitbox`（`conversation.hero.brand.mark` 槽的包裹层）的那个 —— 这是结构锚点，
  不依赖 CSS-module 哈希。鲸鱼单独写一条选择器，是因为 DSH 在 `.fish` 上重述了 `color`，不继承 headline 的墨色。
- 取值：`heroTitleRoles()` = palette `fg.green` 原值，零推导。

| 变体 | 鲸鱼 + 标题 | 画布（bg-base） | 对比度 |
|---|---:|---:|---:|
| light-hard | `#8DA101` | `#FFFBEF` | 2.81 |
| light-medium | `#8DA101` | `#FDF6E3` | 2.69 |
| light-soft | `#8DA101` | `#F3EAD3` | 2.42 |
| dark-hard | `#A7C080` | `#272E33` | 6.88 |
| dark-medium | `#A7C080` | `#2D353B` | 6.23 |
| dark-soft | `#A7C080` | `#333C43` | 5.62 |

  深色三档是 WCAG AA；浅色三档 2.42–2.81:1 是调色板文字绿对奶油画布的自身上限（与目录名称同一取舍），不做对比度守卫，
  门槛由 `tests/hero-title.test.mjs` 分档钉死（深色 ≥4.5、浅色 ≥2.3）。

### 28.3 落点与门禁

- 代码：`src/hero-title.js`（新增，`heroTitleRoles()` / `heroTitleStyles()`）、`src/client-entry.js`（1j 常驻样式表，
  其后表列编号顺延）、`scripts/build.mjs`（SOURCES 增加 `hero-title.js`）；token 层零改动。
- 测试：`tests/hero-title.test.mjs`（7 项）——6 档颜色钉死为 palette 文字绿、深 / 浅分档对比度门禁、常量字面量、
  每档一条规则且两条选择器各带一次作用域、结构锚点（含 `:has(` / `fishHitbox`，不含 `WOwLGG` 哈希 / `crumbCurrent`）、
  无 `!important` / 不挂色彩模式；`tests/integration.test.mjs` 的常驻样式表断言 11 / 12 张并新增本表。
- 验证：`node --test` **336/336**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建
  （7667 行 / 331,730 字节）；**DOM 实测**：用安装包真实的 `HeroShell.module.css` + `tokensFor()` 六档 token 层 +
  `heroTitleStyles()` 输出搭同构页面（`.headline` / `.fishHitbox` / `.fish` / `.titleGroup` / `.previewBadge`
  类名与 DSH 一致，六档 `<html>` 强度属性齐全），共享调试 Chrome 读数：改后标题与鲸鱼 = `rgb(141,161,1)` `#8DA101`
  （浅色三档）/ `rgb(167,192,128)` `#A7C080`（深色三档）；改前 = `label-primary`（`#5C6A72` / `#D3C6AA`）；
  「预览版」角标保持 `statusline1`（`#93B259` / `#A7C080`）—— 说明选择器命中且未误伤角标。
- 边界：`:has()` 需 Chromium ≥105（桌面端 Electron 39 / Chromium 142，Web GUI 同内核）；依赖 `fishHitbox` 这个
  CSS-module 本地名，DSH 若重命名会静默失效、回落到 `label-primary`（文字仍可读，只是不绿）。真机窗口目检需用户刷新
  页面（桌面 app 未开 CDP、Web GUI 需 token，§26.4 / §27.3 同一约束）。

## 29. 2026-11-10 工作步骤文字提到正文下一档（work-steps）

> 触发：用户贴出会话「工作步骤」列表截图（`正在分析请求` / `思考` / `读取` / `运行命令` / `工具调用` 等行）：
> 「把这些文字的颜色调整一下，现在颜色太浅了，看不清楚，改成和正常文字差不多的深浅」。同日第二轮（本轮的最终值）：
> 「改稍微浅一点点，和正文形成差距，但还是要比改之前深。包括展开的内容的文字颜色，也同样处理」。

### 29.1 表面与决策

- 「工作步骤」列表在 `ui-chat` 里：单步行走 ui-primitives 的 `DisclosureRow`（安装包 `dsh-web-frontend` 的
  index CSS：`._row_l4nv8_26 { color: var(--dsw-alias-label-tertiary) }`，`:hover` 回 `label-secondary`），
  折叠分组头是 `ChatGroupSeat` 的 `.title`，整轮过程的收起摘要行是 `TurnProcessNodeView` 的 `.root`
  （两个模块 CSS 同为 `label-tertiary`）。展开的思考正文走 `MarkdownText` 的 compact 变体
  （`._compact_rve47_351 { color: var(--dsw-alias-label-tertiary) }`；安装包里 `variant: "compact"` 只有
  `ReasoningContent` 一处使用，即推理正文）——五处因此共用同一个 muted grey。
- 本主题把 `label-tertiary` 映射成上游 `grey0`（浅色 `#A6B0A0` / 深色 `#7A8478`），在主题画布上只有 1.88–3.54:1；
  DSH 原生 tertiary 是在近黑画布上选的，搬到 Everforest 的浅色画布后「原生弱化」变成「看不清」。用户截图逐像素实测：
  行文字 `#7A8478`、展开正文 `#7A8478`、画布 `#333C43`（dark·soft），即 2.89:1。
- 决策（第二轮定稿）：五处统一用「正文墨色向画布混 15%」的派生墨 `mix(fg, bg0, 0.15)`（`WORK_STEP_DIM`）——
  比正文低一档（CIE L* 差 7.8–8.8）、清晰可读，且明显深于改前的 grey0。深色三档保持 WCAG AA（5.29–6.33:1）；
  浅色三档 3.52–3.93:1，低于 AA——浅色档正文本身只剩 4.66–5.40:1 余量，任何可见的层级差都必然跌破 4.5，
  用户明确要求「和正文形成差距」，因此钉住实测 3.5 下限（仍是旧 tertiary 的近两倍对比度），在 `contrast.md`
  之外的 §29 与测试里记录为有意取舍。
- **否决**：直接用 `label-primary`（第一轮做法，用户随后要求「稍微浅一点点、和正文形成差距」）；用 token
  `label-primary-dimmed`（= 混 35%，dark·soft 仅 3.80:1，比目标「稍微浅」暗太多）；直接改 `label-tertiary` token
  （会连带代码行号、设置提示、占位符等所有 muted 文字，远超本次范围，也会抹平层级）；只提一档到
  `label-secondary`（`grey1` 与 `grey0` 只差约 0.3–0.5:1，截图基本看不出变化）。

### 29.2 做法

- 常驻样式表 `src/work-steps.js`（`<style data-plugin-css="dsh-everforest/work-steps">`），6 档 × 1 条规则，
  选择器列表 = 行 + 分组头 + 收起摘要 + 展开正文：
  - 行：`[data-chat-flow-key] [data-disclosure-row]`（`data-chat-flow-key` 是 ChatView / ChatGroupSeat 的布局契约
    属性，`data-disclosure-row` 是 `DisclosureRow` primitive 渲染的行元素）；
  - 分组头：`[data-chat-flow-key] [data-process-activity]`（`ChatGroupSeat` 的折叠按钮）；
  - 收起摘要：`[data-chat-flow-key] [data-turn-process]`（`TurnProcessNodeView` 的折叠按钮）；
  - 展开正文：`[data-chat-flow-key] [data-markdown-variant="compact"]`（`MarkdownText` 的 compact 变体，
    DSH 在该变体里让标题 / 链接 / 代码都 `color: inherit`，所以一条规则即可改完整段推理正文，且不碰语法高亮）。
  均为 DSH 自己的结构 / 布局锚点，不钉 CSS-module 哈希；作用域沿用其它常驻表的
  `html[data-everforest-light|dark="<强度>"] body[:not]([data-ds-dark-theme])`。
- 取值：`workStepRoles()` = `mix(palette.fg.fg, palette.ramp.bg0, WORK_STEP_DIM)`，`WORK_STEP_DIM = 0.15`，
  即 `label-primary` 向 `bg-base` 混 15%，零手写色值。
- hover / 展开态保持同一墨色：DSH 的 `DisclosureRow` hover 规则会把文字降回 `label-secondary`，本表选择器特异性更高，
  hover 时不会「变暗闪回」；hover 反馈仍由图标 → chevron 的切换承担（harness 实测两种 scheme 的 hover 均保持该墨色）。

| 变体 | 步骤墨色（最终） | 画布（bg-base） | 对画布对比度 | 改前（`label-tertiary`） | 正文（`label-primary`） |
|---|---:|---:|---:|---:|---:|
| light-hard | `#748085` | `#FFFBEF` | 3.93 | 2.17 | 5.40 |
| light-medium | `#747f83` | `#FDF6E3` | 3.81 | 2.08 | 5.18 |
| light-soft | `#737d81` | `#F3EAD3` | 3.52 | 1.88 | 4.66 |
| dark-hard | `#b9af98` | `#272E33` | 6.33 | 3.54 | 8.15 |
| dark-medium | `#bab099` | `#2D353B` | 5.79 | 3.21 | 7.38 |
| dark-soft | `#bbb19b` | `#333C43` | 5.29 | 2.89 | 6.65 |

### 29.3 落点与门禁

- 代码：`src/work-steps.js`（新增，`workStepRoles()` / `workStepStyles()`）、`src/client-entry.js`（1m 常驻样式表，
  卸载移除）、`scripts/build.mjs`（SOURCES 增加 `work-steps.js`）；token 层零改动，`check-contrast.mjs` 不需要新门槛
  （派生墨不是正文 token；深色档的 AA 与浅色档的 3.5 取舍由测试钉住）。
- 测试：`tests/work-steps.test.mjs`（7 项）——6 档墨色钉死为 `mix(fg, bg0, 0.15)`、`WORK_STEP_DIM` 字面量
  0.15、每档「深于旧 tertiary 且浅于正文」且层级差 ≥6 CIE L*、深色 ≥4.5 / 浅色 ≥3.5 的门槛字面量、每档一条
  规则且四条选择器各带一次作用域、结构锚点（`data-chat-flow-key` / `data-disclosure-row` /
  `data-process-activity` / `data-turn-process` / `data-markdown-variant="compact"`，不含模块哈希）、
  无 `!important` / 不挂色彩模式；`tests/integration.test.mjs` 的常驻样式表断言 12 / 13 张并新增本表。
- 验证：`node --test` **343/343**、`npm run check`（palette / build / contrast）全绿，`client.js` 已重建
  （7895 行 / 342,689 字节）。
  - **DOM 实测**：用安装包真实 CSS（`DisclosureRow` 的 `root/header/row/leading/title` 规则 + `ReasoningRow` /
    `ToolRow` / `ChatGroupSeat` / `TurnProcessNodeView` 模块 + compact markdown 的 `_rve47_` 规则）+
    `tokensFor()` 六档 token + `workStepStyles()` 输出搭同构页面，共享调试 Chrome 读数：改前行 / 展开正文 /
    工具行 / 分组头 / 收起摘要全部 = `rgb(166,176,160)`（浅三档）/ `rgb(122,132,120)`（深三档），改后 =
    `rgb(116,128,133)`（light-hard，其余按表）/ `rgb(185,175,152)`（dark-hard，其余按表）；chat flow 之外的
    `DisclosureRow` 对照组保持 DSH 灰（没有过宽命中）；hover 仍为派生墨（未被 `label-secondary` 覆盖）。
  - **真机窗口**：第一轮（正文同色版）在 DSH Desktop（dark·soft）抓到 19:45（`#7A8478`）→ 20:03 / 20:12
    （`#D3C6AA`）的同窗口对照，HMR 无需手动刷新即可换色。第二轮 20:34 的抓图里，运行中的分组头
    （`正在分析请求`）文字像素为 `#BBB19B`（`rgb(187,177,155)`；TextShimmer 扫光的高亮像素
    `rgb(194,183,159)`），即第二轮 dim 值已在真机生效；展开正文的同构页面读数见上一条。
- 边界：`data-chat-flow-key` / `data-disclosure-row` / `data-process-activity` / `data-turn-process` /
  `data-markdown-variant` 是 DSH 的布局 / 渲染契约属性，若未来 DSH 重命名会静默失效、回落到 `label-tertiary`
  （文字仍可读，只是回到旧观感）；若上游把行墨色改成非 token 值，本表仍以显式颜色覆盖（只是不再是正文同源的派生值）。
  浅色档 3.5 的对比度是用户选定的层级取舍，不是漏检。


