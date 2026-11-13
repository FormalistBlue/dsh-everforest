# 调色板数据源与取值

本文件是插件配色数据的**权威参考**：`scripts/palette.mjs` 内嵌同一份数据并生成 `src/palette.js`；`tests/palette.test.mjs` 会解析本文件的表格逐值核对（防止文档与实现漂移），并用固定期望值锁住生成物。

## 1. 来源

| 来源 | 版本 / 快照 | 用途 |
|---|---|---|
| [sainnhe/everforest · palette.md](https://github.com/sainnhe/everforest/blob/master/palette.md) | master @ `85a86eb`（2026-06-08） | **6 套背景色阶**（hard / medium / soft × dark / light）与两套前景/强调色、语法语义 |
| [everforest.vercel.app/palette](https://everforest.vercel.app/palette) | 2026-10-18 抓取 | 校色用的可视化版本；页面内 100 个唯一色值与 palette.md 完全一致（已扣除 light 色阶中 `bg_dim == bg2` 的重复） |
| [FireIsGood/obsidian-everforest-enchanted](https://github.com/fireisgood/obsidian-everforest-enchanted) `theme.css` | main @ `bdd7ac7`（2026-10-10） | **主参考**：默认强度配对、`header-*` 自定义色、UI 语义映射（链接 / 代码 / 表格 / 选中 / 高亮 / tag）与几处可见性修正 |

三者均为 MIT 许可（Everforest: Copyright (c) 2019 sainnhe；Enchanted: Copyright (c) 2023 FireIsGood），署名见仓库根目录 `THIRD_PARTY_NOTICES.md`。

## 2. 与 Enchanted 的关系

- Enchanted 只有两套主题，其背景色**严格等于**官方调色板：
  - `Dark` = 官方 **dark · soft**（`bg_dim #293136`、`bg0 #333C43` …）
  - `Light` = 官方 **light · hard**（`bg_dim #F2EFDF`、`bg0 #FFFBEF` …）
- 在此之上，Enchanted 增加了：
  - `header-*` 自定义色（比 `fg-*` 强调色更沉稳，用于链接 / 标题 / 交互强调）；
  - 一处 light 选中色修正：`bg_visual` 由官方 `#F0F2D4` 改为 `#DED8DB`（提高可见性）。该修正发生在 Enchanted 的 **Light（= 官方 light · hard）** 上；本插件把它**外推到 light · medium / light · soft**（属于本项目外推，不是上游数据，见 §3 表注）；
  - UI 语义约定（见 §5）。
- 因此本插件的**默认配对**是：深色 = `soft`，浅色 = `hard`；6 个变体只是把背景色阶换成另外四套官方值，前景 / 强调 / header 色在同一 scheme 内保持不变（官方语义也是这样：强调色不随对比度变化）。

## 3. 背景色阶（6 套）

| 变体 | bg_dim | bg0 | bg1 | bg2 | bg3 | bg4 | bg5 | bg_visual | bg_red | bg_yellow | bg_green | bg_blue | bg_purple |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dark · hard | `#1E2326` | `#272E33` | `#2E383C` | `#374145` | `#414B50` | `#495156` | `#4F5B58` | `#4C3743` | `#493B40` | `#45443C` | `#3C4841` | `#384B55` | `#463F48` |
| dark · medium | `#232A2E` | `#2D353B` | `#343F44` | `#3D484D` | `#475258` | `#4F585E` | `#56635F` | `#543A48` | `#514045` | `#4D4C43` | `#425047` | `#3A515D` | `#4A444E` |
| **dark · soft（默认）** | `#293136` | `#333C43` | `#3A464C` | `#434F55` | `#4D5960` | `#555F66` | `#5D6B66` | `#5C3F4F` | `#59464C` | `#55544A` | `#48584E` | `#3F5865` | `#4E4953` |
| **light · hard（默认）** | `#F2EFDF` | `#FFFBEF` | `#F8F5E4` | `#F2EFDF` | `#EDEADA` | `#E8E5D5` | `#BEC5B2` | `#F0F2D4` | `#FFE7DE` | `#FEF2D5` | `#F3F5D9` | `#ECF5ED` | `#FCECED` |
| light · medium | `#EFEBD4` | `#FDF6E3` | `#F4F0D9` | `#EFEBD4` | `#E6E2CC` | `#E0DCC7` | `#BDC3AF` | `#EAEDC8` | `#FDE3DA` | `#FAEDCD` | `#F0F1D2` | `#E9F0E9` | `#FAE8E2` |
| light · soft | `#E5DFC5` | `#F3EAD3` | `#EAE4CA` | `#E5DFC5` | `#DDD8BE` | `#D8D3BA` | `#B9C0AB` | `#E1E4BD` | `#FADBD0` | `#F1E4C5` | `#E5E6C5` | `#E1E7DD` | `#F1DDD4` |

说明：

- 官方 light 色阶中 `bg_dim` 与 `bg2` 同值（表中已合并）。
- `bg5` 官方标注「当前未使用」；Enchanted 用它作边框色，本项目沿用（见 §5）。
- **Enchanted 的 light 选中色修正**：`bg_visual` 使用 `#DED8DB`（而非官方值），因为官方值在浅色下几乎不可见。**表里 `bg_visual` 列保留官方值；`scripts/palette.mjs` 对 light 三档必须改用生效值 `#DED8DB`**（Enchanted 只在 light · hard 上用该修正，light · medium / soft 沿用是本项目外推）。
- 本表是配色数据的**唯一来源**：表格中的「生效值」以注记为界，`scripts/palette.mjs` 按注记替换；`tests/palette.test.mjs` 解析本表并与生成物逐值比对，不得手改 `src/palette.js`。

## 4. 前景 / 强调 / 灰阶（按 scheme 共享，不随 hard/medium/soft 变化）

| 角色 | dark | light |
|---|---|---|
| fg | `#D3C6AA` | `#5C6A72` |
| red | `#E67E80` | `#F85552` |
| orange | `#E69875` | `#F57D26` |
| yellow | `#DBBC7F` | `#DFA000` |
| green | `#A7C080` | `#8DA101` |
| aqua | `#83C092` | `#35A77C` |
| blue | `#7FBBB3` | `#3A94C5` |
| purple | `#D699B6` | `#DF69BA` |
| grey0 | `#7A8478` | `#A6B0A0` |
| grey1 | `#859289` | `#939F91` |
| grey2 | `#9DA9A0` | `#829181` |
| statusline1 | `#A7C080` | `#93B259` |
| statusline2 | `#D3C6AA` | `#708089` |
| statusline3 | `#E67E80` | `#E66868` |

> `statusline1` 已纳入 Foreground 模型（`docs/design.md` §3.1，2026-11-08 起作为**交互强调色**：上游语义正是「Menu Selection Background / Tab Line Label Background (active)」——主按钮实底、选中会话行、下拉菜单选中项的**背景**取它；侧栏目录名称**不取它**，而是取上游的文字绿 `green`（上游 `green` 的语义是 Function Names / Strings / Search Highlights 等**前景**色）：浅色 `green` `#8DA101` 比 `statusline1` `#93B259` 深一档，深色两者同为 `#A7C080`，所以只有浅色档有差别；2026-11-08 复核时用户对照上游配色确认了这一点。A7 曾把两处文字撤回 DSH 原生 `label-primary`，同日复核时用户再次要求绿色，于是恢复；2026-11-09 用户又要求「标题不需要绿色显示了」，会话标题回到 DSH 原生 `label-primary`，只余侧栏目录名称取 `green`（见 design.md §27））。`statusline2` / `statusline3` 仍只作上游数据留档，但由 `tests/palette.test.mjs` 逐值钉住文档取值（无消费者、不进 Foreground 模型）。
>
> 灰阶分工（上游 Highlights）：`grey0` = 行号 / 折叠列 / 隐藏文字 / 前景 UI 元素；`grey1` = 注释 / 标点 / 关闭的折叠 / UI 边框 / statusline 文字；`grey2` = 光标行号 / 非活动 tab 标签。2026-11-08 的 A9 起，token 层的弱化文字族（`label-tertiary` / `label-caption` / `label-dimmed` / `state-idle-primary`）取 `grey0`，`grey2` 不再参与 token 映射（`tests/tokens.test.mjs` 钉住）。

### Enchanted `header-*` 自定义色

| 角色 | dark | light |
|---|---|---|
| header-red | `#DA6362` | `#F85552` |
| header-orange | `#D77F48` | `#F88F44` |
| header-yellow | `#BF983D` | `#F3B931` |
| header-green | `#899C40` | `#ABD113` |
| header-aqua | `#569D79` | `#569D79` |
| header-blue | `#5A93A2` | `#5A93A2` |
| header-purple | `#B87B9D` | `#DD2B8D` |

（header-aqua / header-blue 在深浅两套中同值，是 Enchanted 有意选的「两套背景上都能用」的中间调。）

## 5. Enchanted 的 UI 语义映射（本项目采纳为默认语义）

| 用途 | Enchanted 取值 | 说明 |
|---|---|---|
| 主背景 | `bg0` | primary / secondary 都是 bg0（**平铺风格**，不靠明度分层） |
| 侧栏 / 标题栏条 | `bg0` → `bg1` 的 80% 混合（对比度守卫） | 本项目偏离 Enchanted 的平铺：DSH 用 `--dsw-specific-sidebar-fill` 画侧栏 / Windows 标题栏，内容卡是 `bg-base`（bg0）+ 16px 圆角，平铺会让整条边界消失（见 `docs/design.md` §4 的 2026-10-18 修正） |
| 代码块底 | `bg_dim` | 比正文底色更暗/更深一点 |
| 弹层 / 浮窗 | `bg2` | 菜单、popover |
| 次级表面 / 输入框 | `bg1` | 表单、行 hover 底 |
| 边框 | `bg5`（hover `bg3`） | 表单边框、分隔线 |
| 表格 | 表头 / 隔行斑马纹 / 行 hover = `green` 混入 `bg0` 的 14% / 6% / 10% 淡染（对比度守卫后的派生值） | 上游没有表格角色；由色彩模式按 Enchanted 口径落地（`src/color-mode.js`），不是 palette 原值（见 §6） |
| 选中 | `bg_visual`（light 用 `#DED8DB`） | 文档预览选区 = `bg_visual` 40% 透明 token；原生文本选区由插件 `::selection` 用实色 `bg_visual`、文字 `color: inherit`（2026-10-24，见 `design.md` §16.2）。**例外：聊天气泡内选中文字**（2026-11-13，见 `design.md` §30）——底色仍是全局 `bg_visual`（各处同色），只把气泡内选中文字改成方案 C 的墨色：浅色 `#2F3B33`、深色 `#FFFBEF` |
| 搜索高亮 | — | DSH 没有接管搜索高亮，当前**无落点**；上游 Search Highlights 取 `green`。`bg_yellow` 实际只用于「待确认 / 待审批」会话行底 |
| 链接（内部） | `header-aqua`（hover `fg-aqua`） | 色彩模式的内部文件链接仍用此色；基础 `--dsw-alias-link` 2026-10-24 起改用官方 `fg-blue`（见偏差 5） |
| 链接（外部）/ 文本强调 | `fg-blue` | 2026-10-24 起由 header-blue 改为官方 accent（见偏差 5） |
| 交互强调（按钮、选中） | `statusline1`（hover 向亮端提亮 18%） | 2026-10-24 起由 header-aqua / header-blue 改为官方 accent（见偏差 5）；2026-11-07 起 `button-info-fill`（DSH 主发送按钮）、`state-business-primary/tertiary`（活动 / 选中 / 焦点环）、`label-primary-bluish`（预览版角标）与 `label-deep-diving` 也归此色；同日按官方参考图从 aqua 定为 green（见偏差 7、`design.md` §21）；2026-11-08 第三轮改取上游 `statusline1`（语义即「Menu Selection Background / Tab Line Label Background (active)」，dark `#A7C080` 与 green 同值、light `#93B259`），见偏差 9 |
| 工作区当前会话行（选中 tab） | 实色 `statusline1` 底 + `bg0` 文字 | 2026-11-08 起改为**实色**：dark `#A7C080` + `#272E33`–`#333C43`，light `#93B259` + `#FFFBEF`–`#F3EAD3`；不再混入 `bg0`、不再画行首竖条（浅色档第三轮按用户裁图改回上游 `statusline1` 的浅绿，见偏差 9、`design.md` §15 / §22） |
| 工作区目录名称 | `green`（文字绿原值） | 2026-11-08 用户要求「工作区的每个目录名称也用绿色显示」；A7 曾撤回 `label-primary`，复核时用户再次要求绿色，于是恢复；同日再复核（用户对照上游配色「文字的绿色好像要更深一点」）确认文字应取前景绿 `green`（浅色 `#8DA101`，比选中块背景 `statusline1` `#93B259` 深），不做对比度守卫（hover 行 4.01–4.98:1 / 2.13–2.47:1 见偏差 10） |
| 标题 / 下拉选中项 | 标题 = `green` 文字；下拉选中项 = `statusline1` 实底 + `bg0` 文字 / 勾勾 / 图标 / 次要文字 | 2026-11-08 起下拉选中项按上游「Menu Selection Background」语义改为实底 + 画布墨；标题用户要求绿色，取前景绿 `green`（A7 曾撤回、复核后恢复，见偏差 10）；同日追加：选中项内的前导图标与次要文字（`--dsw-alias-menu-icon`、`label-*` 族）也取画布墨（见偏差 10 末段） |
| 代码：注释 / 标点 | `grey1` | — |
| 代码：函数 | `fg-green` | — |
| 代码：关键字 | `fg-blue` | — |
| 代码：运算符 / tag | 运算符随 keyword 槽 = `blue`；tag 走 `markdown-tag` 的 `bg3` alpha 面（见下方 tag 行） | DSH 只暴露 9 个 shiki 槽，没有独立的运算符 / 标签槽位 |
| 代码：属性 | `purple`（`constant` 槽吃进 properties）或继承 `fg` | DSH 无属性专用槽；上游 treesitter 属性 = `purple`（Attributes / Annotations），`aqua` 在 token 层零引用 |
| 代码：字符串 | `fg-yellow` | — |
| 代码：值 / 常量 | `fg-purple` | — |
| 代码：行内代码 | `fg-blue` | — |
| 加粗 / 斜体（strong + em） | `fg-purple` | 两者同色；色彩模式在标题内用 `color: inherit` 保留标题色（见 §6） |
| 删除线 / 已完成任务 | `text-faint` | 本项目对应 `label-tertiary`（由 `grey0` 派生），刻意弱化、不参与对比度门槛（见 §6） |
| 代码块标题遮罩 | `#0004` | 半透明黑 |
| 标题 h1–h6 | `header-red / orange / yellow / green / blue / purple` | **DSH 没有逐级标题颜色 token**，默认层标题仍单色；0.4.0 起由色彩模式（2026-10-24 起默认提供、无开关）按同一顺序改用 `fg-*` 系并经 3:1 守卫，见 §6 与下方偏差 1 |
| tag | `bg3` 的 alpha 面（`--dsw-alias-markdown-tag`） | `header-blue` 10% / 20% 未实现；上游没有 tag 角色 |
| 嵌入块底 | dark `rgba(62,75,80,.7)`、light `rgb(238 236 213 / 70%)` | 近似 bg2 的 70% 透明度 |

### 与 DSH 的已知偏差

1. **逐级标题色**：Enchanted 给 h1–h6 不同颜色（`header-*` 系）；DSH 的 Markdown 标题走统一的字号 / 字重 token + `label-primary`，没有逐级颜色 token。0.4.0 起由**色彩模式**（2026-10-24 起默认提供、无开关）用客户端作用域 CSS 实现 **h1–h6**：按 Enchanted 的顺序取 `fg.red / orange / yellow / green / blue / purple`，h1–h4 对 `bg0` 守卫到 3:1、h5–h6 对每个 markdown 表面守卫到 3:1，**token 层保持零差异**；浅色档会明显被压暗。默认层仍是单色标题。
2. **Obsidian 专有变量**：`text-muted`（`color-base-70`）、`tag-color-hsl`、`code-header` 等没有 DSH 对应物，仅作语义参考。
3. **平铺背景**：Enchanted 把 secondary 也设成 bg0；DSH 的侧栏 / composer / 气泡需要若干区分面，本项目在保持 bg0 主底的前提下，用 `bg1` / `bg2` 做必要的层级（见 `docs/design.md` §4 的 DSH token 映射）。其中**侧栏例外**：`--dsw-specific-sidebar-fill` 取 `bg0` → `bg1` 的 80% 混合并经对比度守卫，否则 Windows 外壳把侧栏 / 标题栏 / 内容卡背后的 frame 画成同色、列边界消失（2026-10-18 视觉走查修正）。
4. **header 色不随变体调整**：非默认的 4 个变体沿用同一组 header 色；实现后若对比度检查不达标，再按背景亮度做小幅修正并记录在此。
5. **UI 强调色改用官方 accent（2026-10-24）**：品牌 / 主按钮 / 链接 / 深潜标签 / 危险 hover 等 token 从 Enchanted 的 `header-aqua` / `header-blue` 改为官方 `fg.aqua` / `fg.blue` / `fg.red`；`header-*` 只保留给 onboarding 渐变与 shiki link。理由：更鲜亮的官方 accent 经用户目检确认；代价是浅色档品牌前景从 3.13:1 降到 2.91:1（仍高于 2.5 的品牌门槛），详见 `design.md` §16.1 与 `contrast.md`。
6. **交互强调从 blue 收回强调色（2026-11-07）**：DSH 的 `button-info-fill`（主发送按钮）、`state-business-primary`（活动 / 选中 / 焦点环，内置 UI 包共 225 处引用）、`label-primary-bluish`（预览版角标）与 `label-deep-diving`（运行中状态标签）原本映到 `fg-blue`，导致最显眼的强调色全是蓝色。按 Everforest 的分工（`blue` = Info / Identifiers），这些角色改为交互强调色；`link`、`shiki keyword` 与色彩模式的行内 code 等文本 / 信息角色继续用 `fg-blue`。详见 `design.md` §21。
7. **交互强调定为 green 而非 aqua（2026-11-07，同日第二轮；2026-11-08 第三轮改取 `statusline1`，见偏差 9）**：第一版按 Enchanted 口径用 `fg-aqua`，用户对照官方 Everforest（sainnhe/everforest）Neovim 截图后指出参考绿不同——参考图的 UI 绿是 `statusline1`（light `#93B259` / dark `#A7C080`）与 `green`（light `#8DA101` / dark `#A7C080`），aqua 只是少量语法色。当时改用 `fg-green`：深色 `#A7C080` 与参考图同值；浅色用 `#8DA101`（参考图的 `#93B259` 会让品牌前景掉到 2.32:1、破 2.5:1 门槛），light·soft 中品牌 / 按钮实底由 `accentFill` 向 `fg` 微深到品牌前景 2.51:1。aqua 仍由色彩模式用于列表 marker / 引用条 / 分隔线。
8. **绿色交互层收敛（2026-11-08，前两轮）**：第一轮用户贴出 Everforest 活动 tab 的两枚裁图，要求「选中的不要左边框、直接绿色显示、不改透明度」；第二轮又要求「浅色目录名称还是用原绿色」「发送按钮的绿色感觉也有点不一样」「上面标题的名称也改为绿色」「下拉选中项文字和勾勾改为绿色」。最终：① 工作区当前会话行 = **实色 accents 底 + 画布 `bg0` 文字**（第一、二轮用 `fg-green`，第三轮起浅色档改回 `statusline1` `#93B259`，见偏差 9）；②「已完成未读」会话行从 `bg_green` 改回 palette1 `bg_blue`（`dot-done` 也改 `fg-blue`），把绿色让给当前会话行；③ 侧栏每个工作区目录名称 = **原值、不做守卫**；④ 会话标题与下拉菜单选中项（文字 + 勾勾）= 当时同一强调绿（复核后按上游拆分为文字绿 / 背景绿，见偏差 10）。浅色档的墨色 / 文字对比度因此降到 2.0–2.8:1，属用户明确要求的「统一浅绿」取舍，见 `design.md` §15 / §22 与 `contrast.md` §2g–§2i；2026-11-08 后续 A7 曾撤回其中的目录名称 / 标题绿色（恢复 `label-primary`），下拉选中项改为 `statusline1` 实底 + `bg0` 墨；同日复核时用户再次要求目录名称 / 标题绿色，已恢复，见偏差 10。
9. **浅色交互绿改用上游 `statusline1`（2026-11-08 第三轮）**：用户贴出 Everforest 活动 tab 的浅色裁图（底色 `#93B259`）并指出「浅色模式的绿色不对…绿色应该是浅绿色」，同时报告选中行的时间 / 图标仍看不清。于是把 `statusline1` 纳入 Foreground 模型并作为**唯一交互强调色**：dark `#A7C080`（与 `green` 同值）、light `#93B259`；品牌 / 主按钮实底不再由 `accentFill` 向 `fg` 微深（品牌前景门槛从 2.5:1 放宽到 1.95:1 的已记录下限，只有这时浅色档才与参考色同值）。语义绿（`state-success`、diff、h4 / 表格绿染、`shiki-token-function`）仍取 `green`；h1–h6 为六色（red / orange / yellow / green / blue / purple），checkbox 浅色档 `aqua`、深色档 `blue`。同一轮修掉 `src/active-session.js` 的**选择器拼接 bug**（把 scope 前缀重复拼进每条选择器，导致只有 `> span` 生效、`rowResting` 内的时间 / pin / 操作按钮仍是 `label-tertiary` 灰，浅色档只有 1.4:1 不可见）。2026-11-08 后续 A7 曾撤回「文字绿」：目录名称 / 标题回到 `label-primary`；同日复核时用户再次要求绿色，已恢复——文字取前景绿 `green`（浅色 `#8DA101` / 深色 `#A7C080`），背景类角色（主按钮实底、选中会话行、下拉选中项实底）仍取 `statusline1`（浅色 `#93B259` / 深色同值），见偏差 10。
10. **上游语义对齐（2026-11-08，A7 / A9；同日复核恢复标题 / 目录名称绿色并按上游拆分文字绿与背景绿）**：对照 sainnhe/everforest `palette.md` 的 Highlights 后落地两处修正——① A7：`statusline1` 是背景色，下拉菜单 / 单选列表的选中项改为 `statusline1` 实底 + 画布 `bg0` 文字与勾勾（`src/ui-accents.js`）；会话标题与工作区目录名称在 A7 中曾恢复 DSH 原生 `label-primary`（删除 `src/workspace-labels.js` 的绿色），同日复核时用户再次要求「工作区的名称还是改为绿色，标题的名称也改为绿色显示」，于是恢复；随后用户对照上游配色指出「纯文字的绿色和选中的背景块绿色不是同一种，文字的更深」，复核确认上游正是两种：文字取**前景绿 `green`**（浅色 `#8DA101` / 深色 `#A7C080`，`src/workspace-labels.js` 与 `src/ui-accents.js` 的 `crumbCurrent` 规则），选中块背景取 **`statusline1`**（浅色 `#93B259` / 深色 `#A7C080`）——深色档两值相同，只有浅色档有可见差别；G18 / G19 钉住实测值。`bg5` 退出交互叠层，hover / active 改为 `bg4` 的 50% / 80% 半透明（上游没有 hover 角色、`bg5` 标注「Not currently used」；边框仍取 `bg5`，见前九条未改动的部分），hover 叠加底因此压低了目录名的对比度（深色 4.01–4.98:1、浅色 2.13–2.47:1）。② A9：弱化文字族（`label-tertiary` / `label-caption` / `label-dimmed` / `state-idle-primary`）从 `grey2` 改到 `grey0`——DSH 用 `label-tertiary` 画行号 / 折叠列 / 隐藏文字，正是上游 `grey0` 的角色；`grey2` 只留给光标行号 / 非活动 tab，不再参与 token 映射。③ 同日追加（用户反馈「第一个图中 icon 颜色不对，第二个图中文字的颜色不对」）：选中项内部件各自写死色 token（前导图标 `--dsw-alias-menu-icon`、模式选项标题 / 说明的 `label-primary` / `label-caption`、工作区路径后缀的 `label-secondary`），父级 `color` 到不了，因此在绿带上仍是中性灰；`src/ui-accents.js` 把这些 token 在选中项子树内一并重指为画布 `bg0`（`MENU_INK_TOKENS`），未选中行不变。④ 2026-11-09：会话标题撤掉文字绿，回到 DSH 原生 `label-primary`（用户「标题不需要绿色显示了」），`src/ui-accents.js` 的 `crumbCurrent` 规则删除、G19 只剩下拉选中项一张表；侧栏目录名称仍取 `green`（见 design.md §27）。
11. **上游 `bg_blue` 的 Diff Changed 角色无落点（2026-11-08，A8）**：上游 `bg_blue` =「Diff Changed Line Background, Info Highlights」。DSH 0.2.2 的 diff 只渲染 added / deleted 行（`_add_` / `_del_` / `_context_`），没有 changed 行表面，也没有对应 token；因此只在本表登记语义，不新增无消费者的 token，也不改变现有 diff 配色（added / deleted 的 marker alpha 保持现状）。

## 6. 色彩模式（0.4.0）的派生色

色彩模式（2026-10-24 起默认提供、无开关）**不新增调色板数据**：它在 6 个变体上把已有强调色映射到内容层角色，并对每个值做对比度守卫（公式与门槛见 [`design.md`](../design.md) §13，逐变体实算值见 [`contrast.md`](contrast.md) §2f）。映射参考 Obsidian **Everforest Enchanted** 的 markdown 语义（h1–h6 六色、strong/em 紫、行内 code 蓝、内部链接 aqua、删除线淡化、引用块 / 表格淡底、checkbox 浅色 aqua / 深色蓝）：

- **标题 h1–h6**：依次 `red` → `orange` → `yellow` → `green` → `blue` → `purple`；h1–h4 对 `bg0` 守卫到 3:1，h5–h6 对每个 markdown 表面（画布 / 表头带 / 斑马纹 / 行 hover / 引用块淡底）取最弱值守卫到 3:1。浅色档因此明显被压暗（light·soft 的 h1 ≈ `#e45856`、h3 ≈ `#9c843a` 橄榄色）。
- **强调文字**：strong + em = `purple`（两者同色）；内部文件链接 = `header-aqua`；行内 code 文字 = `blue`（落在 `bg_blue` 芯片上，按芯片底色守卫）；删除线与已完成任务 = `label-tertiary`（由 `grey0` 派生，刻意弱化、不设门槛）。
- **装饰**：列表 marker、引用左条、分隔线 = `aqua`（对 `bg0` 3:1）；任务列表 checkbox 的 accent = 浅色档 `aqua`（绿）/ 深色档 `blue`（3:1）。
- **彩色表面**：表格表头色带 / 隔行斑马纹 / 行 hover = `green` 混入 `bg0`（14% / 6% / 10%，按 `label-primary ≥ 4.5:1` 反推）；引用块淡底 = `aqua` 混入 `bg0`（8%）；「待确认 / 待审批」行底：浅色档 = palette1 的 `bg_yellow` 再向 `fg.yellow` 加深到 3.5 L* 或 4.5:1 门槛为止，深色档 = `fg.yellow` 向 `bgDim` 收 22% 的亮琥珀 + 深色对比墨（palette 深色 `bg_yellow` 太暗，2026-10-24 两轮：红改黄、深色档反相），「已完成未查看」行底 = palette1 的 `bg_blue`（2026-11-08 起；此前为 `bg_green`，绿色让给当前会话行），向 `fg-blue` 加深到距侧栏 4.5 L* 或 4.5:1 门槛为止；hover 向对应 `fg` 强调色混 16% 后重新守卫。浅色档（尤其 light·soft）受 4.5:1 门槛限制：light·soft 的表格三档绿染收敛为同一色 `#efe7cb`，会话行底只剩很低的明度差（状态点仍有颜色）。
- **状态点**：「待确认」=`orange`、「已完成」=`blue`（2026-11-08 起，随行底改蓝），对 `bg0` 与侧栏底两个表面都守卫到 3:1。

因此 0.4.0 之后，调色板的 **7 个强调色（red / orange / yellow / green / blue / purple / aqua）全部在内容层有了角色**：red / yellow / green / blue 此前已服务状态色 / 语法色，本轮新增的是「内容层」角色；`orange` / `purple` 此前只服务个别 shiki token，现也用于内容层（h2 / h6、emphasis）。`header-*` 的使用面自 2026-10-24 起收窄：`header-aqua` 服务色彩模式内部链接色、表格列宽提示线与 onboarding 渐变 stops，`header-blue` 服务 shiki link 与 onboarding 渐变，`header-purple` 只服务 onboarding 渐变；`headerRed` / `headerOrange` / `headerYellow` / `headerGreen` **运行时零引用**。UI 强调改用官方 accent（§5 偏差 5）。`bg5` 仍用于边框与滚动条混色，交互叠层改 `bg4`（见偏差 10）；`bgPurple` 与 headerRed/Orange/Yellow/Green 未被使用（`bgYellow` 自 2026-10-24 起用于「待确认」行底）——不为「用满调色板」而硬塞颜色。

这些值是**派生值而非上游色**（守卫混合），与「官方 6 档背景 + 原样强调色」的默认层严格分离：色彩模式始终开启、只注入作用域 CSS——色彩模式本身不改 token 层；调色板数据在 2026-11-08 增加 `statusline1`（Foreground 19 色，见 §4），强调色评审也更新了 token 值，0.4.0 当时的「与 0.3.0 逐字节一致」不再适用于当前版本。
