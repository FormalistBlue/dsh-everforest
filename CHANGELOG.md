# Changelog

`dsh-everforest` 的所有重要变更记录在此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：补丁版本只做配色修正、工程与文档修复，不改变 token/API 契约。

## [0.4.0] - 2026-10-23

次版本：新增**实验性「色彩模式」**（默认关闭）。开启后把 Everforest 调色板里此前未上场的强调色用到聊天
Markdown 内容（h1–h3 标题、列表 marker、引用条 / 分隔线、表格表头色带与隔行斑马纹、任务列表 checkbox）
和工作区会话记录的状态行（「待确认」行淡橙底 + 橙色状态点，「已完成未查看」行淡绿底 + 绿色状态点）。
默认配色与 0.3.0 逐字节一致：色彩模式只注入一段作用域 CSS，**不改变 token 层**，开关关闭时所有选择器都不匹配。

### Added

- **色彩模式开关（实验性，默认关闭）**：设置页新增「色彩模式」区块（`role="switch"` + `aria-checked`、
  当前 scheme 的 5 个强调色装饰片、实验性说明）；开关与两个强度一起写入当前 profile 的 Host 配置
  （`Config` 新增 `colorMode` 布尔字段，默认 `false`、标记 `.volatile()`），同一 profile 的所有浏览器共享。
  中英文案（`colorMode.title/desc/on/off/switch/experimental`）随 DSH 语言切换。
- **色彩引擎 `src/color-mode.js`**：`colorModeRoles()` 对 6 个配色变体实算「中彩」角色色值——标题
  `h1/h2/h3 = red/orange/yellow`、marker / 引用条 / hr / checkbox 用 `aqua`、表格色带与斑马纹用
  `fg.green` 混入 `bg0`（14% / 6%）、「待确认」行底与状态点用 `orange`、「已完成」行底与状态点用
  `green`；所有文本承载表面按 `label-primary ≥ 4.5:1` 反推权重，标题 / 装饰按 3:1、状态点对
  `bg0` 与侧栏两个表面都按 3:1 守卫。`colorModeStyles()` 生成静态样式表：6 个自定义属性块
  （浅色 `body:not([data-ds-dark-theme])`、深色 `body[data-ds-dark-theme]`，强度由
  `html[data-everforest-light|dark]` 选择）+ 15 条元素规则，全部以
  `html[data-everforest-color-mode="on"]` 开头。
- **作用域**：只命中聊天 Markdown（`[class*="markdown"]`，排除 compact 推理变体）与会话树行
  （`[role="treeitem"][data-row-key^="session:"]:has([data-state=…])`，选中行不覆盖、hover 单独加深）；
  特殊格式（加粗 / 斜体 / 链接 / 行内 code 文字 / 引用文字 / 代码块）保持单色，「运行中」不上色。
- **对比度硬门槛 G9–G15**：标题 / 装饰 ≥3.0、彩色表面上的正文 ≥4.5、状态点对两个表面 ≥3.0、
  角色色值合法性；`docs/reference/contrast.md` 新增「色彩模式（中彩）」章节。
- 测试：`tests/color-mode.test.mjs`（角色快照 + 4 组对比度 + CSS 结构 / 作用域 / 颜色合法性）。

### Changed

- `src/state.js`：state 变为 `{ light, dark, colorMode }`；localStorage payload 增加可选 `colorMode`，
  **`STATE_VERSION` 保持 1**（0.3.x 缓存缺字段视为 `false`、不算损坏、仍参与迁移；非布尔值按损坏处理）。
- `src/durable.js` / `src/host-config.js` / `src/client-entry.js`：Host 写入一次原子提交三个字段
  （`light` / `dark` / `colorMode`），「恢复默认」unset 三个字段；host 表单就绪前的选择继续排队补写；
  跨浏览器广播 / storage 事件比较也包含该 flag。`hostState()` 与首帧 boot payload **保持只含两个强度**
  （色彩模式只影响 Client 挂载后的内容层，不影响首帧 token）。
- 设置页「恢复默认」与说明文案、README、CHANGELOG 同步；`package.json` `version` 0.4.0、
  `files` 增 `src/color-mode.js`。
- 测试从 144 项增至 **163 项**（新增色彩模式、三字段状态 / 持久化 / 设置页用例）。

### Notes

- **实验性边界**：色彩模式依赖 DSH 0.2.1-rc.2 的 Markdown 容器类名（`[class*="markdown"]`）与会话行
  `data-row-key` / `data-state` / `role=treeitem` 等语义锚点；DSH 升级若改名，模式可能静默失效（token 层
  不受影响）。官方主题扩展点只支持 token 覆盖，选择器注入属本项目的实验性例外，升级 DSH 后需回归。
- **真实界面目检需要重启 DSH**（Host `Config` schema 变化），刷新页面只更新 Client 半部；未重启时色彩模式
  开关仍可用，但只写入 localStorage（旧宿主降级）。

## [0.3.0] - 2026-10-22

次版本：强度偏好的**真源**从浏览器 `localStorage` 迁到当前 profile 的 Host 配置（官方 settings / `configForms` 通道），
同一 profile 的所有浏览器共享；`localStorage` 降为首帧缓存与旧宿主兜底。Appearance（light / dark / system）仍归
DSH 自己的全局偏好，本插件不另存。

### Added

- **Host 侧持久化（`configForms`）**：Host 半部新增 `src/host-config.js`，导出
  `Config = Schema.object({ light, dark })`（`union(STRENGTHS)`、默认 `hard` / `soft`、两个叶子字段标记
  `.volatile()`）；`index.js` 导出 `Config` 并改为 `apply(ctx, config)`。DSH settings 服务把 volatile 字段投影成
  以 profile entry id（`everforest`）为键的表单；Client 用软注入 `ctx.inject(['configForms'], …)` 等待服务，
  再通过 `ctx.configForms.get('everforest')` 读写，写入落当前 profile 的 `cordis.patch.yml`：

  ```yaml
  - id: everforest
    name: dsh-everforest
    config:
      light: hard
      dark: soft
  ```

  同一 profile 的所有已认证浏览器共享同一份强度，不再按 origin 各存一份。
- **Client 侧持久化胶水**：新增 `src/durable.js`（`hasUserLayer` / `shouldSeed` / `stateFromHost` /
  `statesEqual` / set-unset ops / `bootHintState` 纯函数）；`src/state.js` 增加 `readStoredState()` 区分
  「有真实缓存选择」与「无 / 默认」；表单就绪前用户点的强度先排队（`queuedWrite`），服务到达后补写一次，
  不会被首次 adopt 覆盖或静默丢弃。
- **首帧 B 方案（缓存优先、Host 兜底）**：boot 注入脚本先读本浏览器 `localStorage['dsh-everforest/v1']` 缓存，
  缓存缺失 / 版本不符 / 字段非法时逐字段回退到 emit 时嵌入的 Host 值，再回退默认配对；解析结果写入
  `window.__EVERFOREST_BOOT__`，Client 首帧直接沿用，不再先画默认值。Web 每次 index 渲染重新生成脚本
  （Host 值实时读取），Desktop 的 boot payload 在 Host ready 时采集一次（运行中改档后重载窗口靠缓存兜底）。
- **0.2.1 旧值一次性播种**：`readStoredState()` 读到真实非默认强度、且 Host 文档尚无用户层时，Client 启动后把
  缓存值一次性写入 Host（一次 `mutate` 写两个字段、带观察到的 revision）；此后清空 localStorage，强度仍来自 Host。
- **`settings.configure({ auto: false })`**：声明本插件自己渲染设置页，DSH 不会在 Plugins 页再生成一份重复的
  自动表单；这是可选接线，settings 服务缺失时静默跳过并保持 localStorage 降级。
- **测试**：新增 `tests/durable.test.mjs`（`hasUserLayer` / 播种判定 / set-unset ops / 归一化 / `bootHintState`
  的纯函数）；`tests/host-boot.test.mjs` 增 Config 导出且 light/dark 均 volatile、非法值拒绝、emit 时读取、
  `settings.configure` 失败不致命、首帧 B 各分支与 `__EVERFOREST_BOOT__` 发布；`tests/integration.test.mjs`
  增假 configForms 生命周期（就绪采纳、播种、选择、恢复默认、写入被拒、旧宿主降级、延迟到达、跨浏览器广播、
  就绪前排队补写、卸载清理、manifest / Host import 守卫）；`tests/state.test.mjs` 增 `readStoredState`。

### Changed

- **持久化语义**：`localStorage` 从「唯一持久化」降为「首帧缓存 + 旧宿主兜底」，key 与数据格式不变（仍是
  `dsh-everforest/v1`）；同一 origin 的 `storage` 事件同步保留，作为没有 Host 广播时的兜底。
- **首帧强度来源**：从「只读 localStorage、缺失即默认」改为 B 方案（缓存 → Host → 默认）。
- **依赖口径**：运行时仍是零依赖——Host 半部 `import '@deepseek-ai/schemastery'` 由 DSH 运行时从自身安装解析，
  不随包安装；仓库改为声明一个 devDependency（`@deepseek-ai/schemastery`）供 `node --test` 使用，CI / publish
  在测试前执行 `npm install --no-package-lock --ignore-scripts --no-audit --no-fund`。capability 集合不变。
- **`cordis.patch.yml` 行成为契约**：entry id `everforest` 现在是 Client 定位 configForms 表单的键
  （`ENTRY_ID`）——Host `src/host-config.js` 与 Client `src/durable.js` 各持一份常量（bundle 不能 import
  schemastery 的 Host 模块），改名会静默退化为 localStorage-only；测试把 patch 行与两份常量一起钉住。
- **文案**：`locale/en.json` / `locale/zh.json` 的 `meta.description`、`src/locale.js` 的 `hint.storage`
  （EN / ZH，键集不变）改为 profile 级 Host 持久化、同 profile 浏览器共享、localStorage 仅首帧缓存、
  Host 半部更新需重启 DSH。
- **构建/发布**：`client.js` 因文案改动重新构建；`package.json` 版本 0.3.0、`files` 增加 `src/host-config.js`；
  `.github/workflows/ci.yml` / `publish.yml` 在 Test 前安装 devDependency，并更新「无依赖、无安装步骤」的旧注释。
- **文档**：README 中英、`design.md`（§1 / §2 / §3.2 / §5 / §7 / §8 / §9 / §10 / §11 与 §12 的 0.3.0 记录）、
  `assessment.md`（新增 §13 落地记录）、`releasing.md` 同步 0.3.0 口径。

### Fixed

- **换浏览器 / 换端口丢强度**：0.2.1 的跨窗口同步只在同一 origin 内生效；用浏览器打开 Host URL（端口每次随机）
  或换一个浏览器就是另一份值。现在强度以 Host 为真源，这些场景都读同一份。
- **首帧在「Host 有值、本机无缓存」时回退默认**：旧 boot 脚本只读 localStorage，新浏览器 / 清缓存 / 新端口
  的首帧会先画默认配对；B 方案改用 Host 值兜底。
- **设置页旧文案与实现不符**：`hint.storage` 不再声称「按浏览器 / 窗口保存」（EN / ZH 同步）。
- **「恢复默认」在一次强度写入在途时被静默丢弃**：真实 Host 写要等一次往返才 fold 进镜像快照，这期间 `user`
  仍是 `{}`；旧实现据此跳过 `unset`，随后在途的 `set` 落地并广播，把刚点的「恢复默认」覆盖掉（需再点一次）。
  现在 Client 记录在途写数量（`writesInFlight`），此时把 `unset` 排在表单控制器的写队列之后——控制器本身串行化
  写，最终状态落在继承的默认值上；`tests/integration.test.mjs` 用异步假 form 复现该窗口作为回归用例。

### Known limitations

- **Host 半部更新需重启 DSH**：升级到 0.3.0 后必须重启 DSH（只刷新页面不会重载 `index.js`）。**只换 npm 包
  不重启时**，新 Client 会因 Host 半部仍是旧版而退回 localStorage-only——选择仍生效、只是暂不写 Host；重启
  DSH 后第一次加载会把本地缓存一次性播种到 Host。之后修改 `config.light` / `config.dark` 由 settings 服务运行时
  写入，不需要再重启。
- **profile 级隔离**：强度按 profile 各存各的，不同 profile 之间不共享。
- **写入被拒绝时回读 Host**：home patch / `--patch` 覆盖等场景以 `mutate` 的 `response.ok === false` 表现——
  settings 服务回读后返回 `false`，Client adopt 远端值并 `console.warn` 一次，设置页不弹错（代码里的
  `writable: false` 守卫只是防御，0.2.1-rc.2 的 native provider 恒报告可写）。旧宿主（没有 settings 服务，
  或 schemastery 无 `volatile()`）下表单不出现，强度退回 localStorage（仍按 origin，旧行为）。
- **手改配置非法值分两种情况**：运行中把 `cordis.patch.yml` 的 `config.light` / `dark` 改成枚举外的值，Loader
  的 volatile-only 更新捕获解析错误 → Host 记 warning、保留旧引用、entry 保持 ACTIVE（主题不丢），改回合法值
  即热恢复；只有冷启动 / 重挂时才 `Config` 校验失败、entry 不激活（无主题），改回合法值或删除 `config` 后重启
  恢复。
- **一次性迁移与跨浏览器重置的取舍**：浏览器 A「恢复默认」清掉 Host override 后，若另一个从未升级打开的浏览器
  B 仍持有 0.2.1 的非默认 localStorage 缓存，B 下次加载会把这个旧值当作待迁移值**重新播种回 Host 一次**；之后
  B 的缓存与 Host 收敛，不会反复。0.3.0 接受该取舍（一次性迁移只以「Host 无用户层」为条件，无法区分「从未
  选择」与「刚被重置」）。
- **没有插件详情页设置卡片**：强度只在本插件自己的 Settings → Everforest 页修改；本插件声明自行渲染设置页
  （`settings.configure({ auto: false })`），DSH 不会生成第二份自动表单。
- **首帧可能短暂显示过期缓存**：若本浏览器缓存落后于 Host（例如另一个浏览器刚改过、本窗口未收到广播），首帧
  画缓存值，Client 拿到 Host 快照后立即 adopt 一次；随后缓存与 Host 收敛。

> 0.3.0 自动化验收：`node --test` **144/144 通过**（Node 22）、`npm run check` 全绿（palette / build / contrast，
> `client.js` 已重建为 v0.3.0 头）、`npm pack --dry-run` 清单齐全（含 `src/host-config.js`）。跨浏览器共享、
> Web / Desktop 首帧与重启行为的真机目检，以及发布，仍待按
> [`docs/releasing.md`](https://github.com/FormalistBlue/dsh-everforest/blob/main/docs/releasing.md) §5 完成。

## [0.2.1] - 2026-10-21

补丁版本，不改变对外契约。

### Added

- **Windows 换行安全网**：新增 `.gitattributes`（`* text=auto eol=lf`）。Git for Windows 默认
  `core.autocrlf=true`，此前全新 clone 会把文本文件签出为 CRLF，直接导致 `node scripts/build.mjs --check`
  与 `tests/palette.test.mjs` 的 LF 断言失败；现在两种平台签出均为 LF。二进制资产标记为 binary，
  生成物在 GitHub diff 中折叠。
- **PR/推送 CI**：新增 `verify` workflow（`ci.yml`）：Ubuntu + Windows × Node 20/22/24 六格矩阵，
  跑 `node --test` 与 `npm run check`（palette / build / contrast 三项 `--check`）。仓库此前只有发布
  workflow，PR 零检查。
- **发布前门禁**：`publish.yml` 在 `npm publish` 之前跑同一组测试与检查，失败即中止发布；
  `workflow_dispatch` 手动发布也必须落在 `v<version>` 标签对应的提交上（此前可绕过 tag↔version 校验）。
- **自动 GitHub Release**：tag 推送（且发布成功后）用 `--generate-notes` 创建 Release，预发布版本自动
  `--prerelease`；已存在的 Release 会跳过（幂等）。
- **CHANGELOG.md**：回填 0.1.0 → 0.2.0 的发布记录。
- **跨窗口强度同步**：`client-entry.js` 监听 `storage` 事件，同一地址的其他标签页 / 窗口写入强度后，
  本窗口重读状态、重建 token 覆盖层并刷新设置页；`clear()` 按默认配对处理。此前多窗口各持旧值，
  后操作的一方会把对方选择写回（丢失更新）。
- **loading spinner / 边框着色**：boot token 6→8，新增 `--dsw-alias-border-l2`（spinner 环）与
  `--dsw-alias-brand-primary`（进度弧）；Web loading 页首帧即完整 Everforest。装包
  `dsh-web-frontend@0.2.1-rc.2` 的 CSS 里两者以 alias token 为主值、局部字面量只是 fallback，
  旧文档「局部字面变量、不可覆盖」的结论已作废并同步修正（README / design / assessment / releasing）。

### Fixed

- **启动自检假警告**：`SELF_CHECK_TOKENS` 移除了 `--dsw-focus-ring-color`。DSH 只在
  `html[data-input-modality=pointer] body :focus-visible` 上声明它，`getComputedStyle(document.body)`
  永远取到空值，导致每次启动都误报「token 可能被改名」。其余 5 个探针保持；新增 computed-style stub
  测试，锁定「探针可解析时不告警、缺失时才告警、focus ring 不再是探针」。
- **设置页注册失败后不再永久缺失**：`settingsUiMounted` 只在 `slots.register` 成功后置位，
  `settingsUiPrepared` 保证重试不重复注册字典 / 样式表；此前注册抛异常会把 flag 留在 true，
  `ctx.inject` 兜底被跳过，整段会话都没有设置页。
- **「当前选择」行的无障碍命名**：行容器补 `role="group"`，`aria-label` 才会进入无障碍树
  （裸 `<div>` 的 `aria-label` 会被忽略）；测试新增「所有 `aria-label` 必须有命名 role」的通用断言。
- **构建器静默丢导出**：`build.mjs` 拒绝一条语句多绑定的 `export const a = 1, b = 2`
  （原实现只把 `a` 导出到模块表，`b` 静默消失），并导出 `parseModule` 供负向测试；CLI 行为不变。
- **light·soft 聊天气泡变成白色**（用户走查「聊天气泡框变成白色的了」）：2026-10-19 的修复把
  light·soft 气泡翻到「抬起」方向，用近白冷调（`#ffffff` + 4% `header-aqua`)——在暖奶油画布上像一块
  白卡片。现改为白 → `fg.green` 13% 的淡鼠尾草纸 `#f0f3de`（文字 4.94:1），对画布明度差 1.06:1，
  以绿 vs 暖奶油的色相差异承担区分，气泡边界门槛对该档放宽到 1.05（其余亮色档 1.10 不变）。
- **diff 行底色看不清（深色）/ 看不出（浅色）**（用户走查：深色「浅绿色背景配白色的文字」；浅色
  「绿色背景太不明显」→ 二次走查「light·soft 还是偏浅」）：`FileDiff` 的 added/deleted 行底由
  `--dsw-alias-file-diff-*-bg` 绘制、代码文字继承 `label-primary`。深色档原直接取 `bg_green` `#48574e`
  （dark·soft），近白文字仅 4.52:1，行号 gutter 又向亮端提亮到 `#797e6e`（2.09:1）；浅色档原
  `bg0` → `bg_green` 混 45%，与代码画布只有 1.001–1.007:1，added/deleted 行与普通代码没有区别。
  现在：dark 行底向 `bg0` 收 40%（`#404d4a`，文字 5.23:1）、gutter 深色改向暗退（行号 3.97–6.30:1）；
  light 行底把 `bg0` 向绿 / 红墨色压到 4.5 门槛（hard / medium 与代码画布 1.15 / 1.10 明度差，文字仍
  4.56+），light·soft 因代码画布本身卡在 4.5:1，单独允许行底文字降到 4.1:1（`#e5e0b6` / `#f4d8c4`，
  与画布 1.09 / 1.10 明度差，2026-10-21 用户确认的可见性取舍）。新增 diff 行底文本硬门槛（light·soft
  4.1 例外）与「marker on gutter」报告项，报告见 `docs/reference/contrast.md` §2e / §4 / §6.3。

### Changed

- **文档口径**：README 中英、`design.md`、`assessment.md`、`releasing.md` 更新首帧 / spinner 覆盖面，
  并记录「恢复默认只重置强度、不改 DSH 全局外观偏好」（用户确认 2026-10-21）；`design.md` §12 新增
  2026-10-21 P1 打磨记录。
- **npm 页面链接**：`README.md` / `README.en.md` 中的 `docs/...`、`LICENSE`、`THIRD_PARTY_NOTICES.md`
  改用 GitHub 绝对 URL。`docs/` 不在 `files` 白名单内，npm 页面上的相对链接此前全部 404。
- **`prepack` 表述纠正**：`prepack` 实际是 `build.mjs -C`（只校验产物是否最新，不重新生成）。
  同步修正 `publish.yml` 注释、`docs/design.md`、`docs/releasing.md` 三处旧说法。

## [0.2.0] - 2026-10-19

### Added

- **首帧注入（Host 半部）**：`index.js` 通过 `webserver/index-inject` 注入 boot 脚本，在 Client 加载前
  用当前配色重绘 DSH 的 pre-Client loading 页面。Web 端 loading 页 / 首帧即 Everforest，Desktop 冷启动
  最多 1 帧原生色。配色与 Client token 层同源（同一个 `tokensFor()` 表），scheme 取自 ui-theme 解析后的
  boot 属性而非裸 `prefers-color-scheme`，强度取自本浏览器 localStorage。
- `tests/host-boot.test.mjs`：boot 行形状、JSON/HTML 安全、6×6 取值与 Client token 层一致、scheme 回退、
  幂等性。
- 英文 README（`README.en.md`）、6 张六档预览图、`screenshots.json`（市场条目素材）。

### Fixed

- **浅色聊天气泡与画布分离**：旧映射把用户气泡画成 `#FDFAEE`，与浅色 `#FFFBEF` 画布仅 1.02:1，气泡融进
  背景。light-hard/medium 改用 header-aqua 的鼠尾草色倾向并做对比度守卫（边界 1.17/1.14:1，正文 4.61/4.53:1）；
  light-soft 因 `bg0` 与正文已只有 4.66:1，改为略冷的近白抬起卡片（边界 1.15:1、正文 5.37:1）。
  新增「气泡 vs bg-base ≥ 1.10:1」硬门槛与报告章节。

### Changed

- 客户端入口 `src/index.js` 更名为 `src/client-entry.js`：npm 11 packlist 在根 `main` 为 `index.js` 且
  `files` 含嵌套文件时会把嵌套的 `src/index.js` 误打进 tarball；`files` 现在与运行时文件一一对应。
- `files` 白名单扩展：Host 半部直接 import 的 `src/color.js`、`src/palette.js`、`src/state.js`、
  `src/tokens.js` 随包发布（0.2.0 起 Host 半部不再是 461 字节的空壳）。
- 文档澄清 diff 区域没有语法高亮（按 shiki 验收会误判），并记录 Host 侧持久化暂缓、系统跟随边界。

## [0.1.2] - 2026-10-18

### Fixed

- **侧栏与内容区分离**：DSH 用 `--dsw-specific-sidebar-fill` 画侧栏列、Windows 标题栏条与内容卡边框，
  而内容卡是 `--dsw-alias-bg-base`（bg0）。两者此前都映射到 bg0（Enchanted 的扁平风格），浅/深色下窗口
  糊成一整块。侧栏改为 `mix(bg0, bg1, 80%)` 并走 readableSurface 对比度守卫（浅色略深的纸、深色略亮的
  面板，方向与原生一致），新增「侧栏 / bg-base ≥ 1.02:1」硬门槛，并把侧栏视为承载文本的表面
  （label-primary ≥ 4.5:1）。

## [0.1.1] - 2026-10-18

### Changed

- **发布链路切换**：首个通过 GitHub Actions + npm Trusted Publishing（OIDC）发布、带 SLSA provenance
  的版本。代码与 0.1.0 完全相同，只有版本号与 README 更新；0.1.0 是本机 `npm publish`（无 provenance），
  0.1.1 用来把 registry 上的版本换成可验证的 CI 产物。

## [0.1.0] - 2026-10-18

首个发布（本地 `npm publish`，无 tag、无 provenance）。

### Added

- **6 档配色**：Dark / Light × Hard / Medium / Soft，默认对齐 Everforest Enchanted（深色 Soft / 浅色 Hard）。
- **Client token 覆盖层**：206 个颜色 token（77 static + 107 alias + 11 specific + 11 shiki）+ 6 个辅助量，
  每条同时带 light / dark 值，跟随 DSH 自身 Appearance 开关；未覆盖项保持原生（字体、圆角、阴影、
  focus ring 等）。
- **设置页**（`settings.section`，id `everforest`，order 25）：6 张色卡、中英文案、按浏览器 localStorage
  持久化、恢复默认；**跟随系统 / 深色 / 浅色**外观控制（写 DSH 全局外观偏好 `ctx.theme.setTheme`，
  选过色卡后可用它恢复自动跟随，当前状态行内显示）；卸载时清理 override / style / locale / 事件监听。
- **对比度守卫**：`scripts/check-contrast.mjs` 对正文在各级表面上的 WCAG AA（≥ 4.5:1）等硬门槛做校验，
  生成 `docs/reference/contrast.md`；行内代码 chip 映射到 `bg_blue` 表面并纳入门槛。
- **零依赖工具链**：`scripts/build.mjs`（按模块 IIFE 打包 `client.js`，产物入库）、`palette.mjs`
  （从 `docs/reference/palette.md` 生成 `src/palette.js` 并做一致性校验）、`extract-theme-tokens.mjs`
  （从 ui-theme 构建产物抽取 token 清单）、`extract-asar-package.mjs`（零依赖读 Electron asar）。
- **文档**：`docs/design.md`（方案）、`docs/reference/palette.md`（色阶）、`docs/reference/token-inventory.md`
  （206 token 清单）、`docs/releasing.md`（发布与上架 runbook）、`THIRD_PARTY_NOTICES.md`。

[Unreleased]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FormalistBlue/dsh-everforest/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-everforest/v/0.1.0
