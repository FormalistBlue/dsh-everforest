# 调色板数据源与取值

本文件是插件配色数据的**权威参考**：实现时由 `scripts/palette.mjs` 从这里的表格生成 `src/palette.js`，并在单元测试里固定期望值（防止手抄漂移）。

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
- 本表是配色数据的**唯一来源**：表格中的「生效值」以注记为界，生成脚本按注记替换，不得手改 `src/palette.js`。

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

> `statusline1-3` 仅作上游数据留档：本项目的 Foreground 模型（`docs/design.md` §3.1）不使用 statusline 色。

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
| 代码块底 | `bg_dim` | 比正文底色更暗/更深一点 |
| 弹层 / 浮窗 | `bg2` | 菜单、popover |
| 次级表面 / 输入框 | `bg1` | 表单、行 hover 底 |
| 边框 | `bg5`（hover `bg3`） | 表单边框、分隔线 |
| 表格 | 底 `bg2`、隔行 `bg1`、表头 `bg_green`、hover `bg4` | — |
| 选中 | `bg_visual`（light 用 `#DED8DB`） | 文档选区 |
| 搜索高亮 | `bg_yellow` | — |
| 链接（内部） | `header-aqua`（hover `fg-aqua`） | — |
| 链接（外部）/ 文本强调 | `header-blue`（hover `fg-blue` / `header-purple`） | — |
| 交互强调（按钮、选中） | `header-aqua`（hover `header-blue`） | — |
| 代码：注释 / 标点 | `grey1` | — |
| 代码：函数 | `fg-green` | — |
| 代码：关键字 | `fg-blue` | — |
| 代码：运算符 / tag | `fg-orange` | — |
| 代码：属性 | `fg-aqua` | — |
| 代码：字符串 | `fg-yellow` | — |
| 代码：值 / 常量 | `fg-purple` | — |
| 代码：行内代码 | `fg-blue` | — |
| 代码块标题遮罩 | `#0004` | 半透明黑 |
| 标题 h1–h6 | `header-red / orange / yellow / green / blue / purple` | **DSH 无法用 token 逐级着色**，见下方偏差 |
| tag | `header-blue` @ 10% / 20% | — |
| 嵌入块底 | dark `rgba(62,75,80,.7)`、light `rgb(238 236 213 / 70%)` | 近似 bg2 的 70% 透明度 |

### 与 DSH 的已知偏差

1. **逐级标题色**：Enchanted 给 h1–h6 不同颜色；DSH 的 Markdown 标题走统一的字号/字重 token + `label-primary`，没有逐级颜色 token。0.x 不做（保持 token 路线），必要时再议。
2. **Obsidian 专有变量**：`text-muted`（`color-base-70`）、`tag-color-hsl`、`code-header` 等没有 DSH 对应物，仅作语义参考。
3. **平铺背景**：Enchanted 把 secondary 也设成 bg0；DSH 的侧栏 / composer / 气泡需要若干区分面，本项目在保持 bg0 主底的前提下，用 `bg1` / `bg2` 做必要的层级（见 `docs/design.md` §4 的 DSH token 映射）。
4. **header 色不随变体调整**：非默认的 4 个变体沿用同一组 header 色；实现后若对比度检查不达标，再按背景亮度做小幅修正并记录在此。
