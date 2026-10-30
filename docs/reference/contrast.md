# Everforest token contrast report

> 由 `node scripts/check-contrast.mjs` 生成，请勿手改。
> WCAG 2.x 相对亮度公式；6 档 = light/dark × hard/medium/soft。

## 1. 结论

- 硬门槛：**全部通过** ✅
- 报告项（次要文本 / 语义色 / diff / 反色前景）：全部 ≥ 1.5，无映射损坏 ✅
- 覆盖 token 数：212（206 颜色 + 6 辅助 token）

硬门槛定义：

1. `label-primary`（= `fg`）对 `bg-base` / `bg-layer-1` / `bg-layer-2` ≥ 4.5:1（6 档）；
2. `--shiki-foreground` 对 `--shiki-background` ≥ 4.5:1（6 档）；
3. 每个被覆盖的颜色值必须是合法 CSS 颜色，且 `label-primary` ≠ `bg-base`；
4. 品牌实底前景（`label-primary-foreground` = `bg0` on `header-aqua`）≥ 2.5:1（上游 aqua 能力上限，见 `palette.md` §5）；
5. `--dsw-alias-label-primary-inverted` 的真实配对（DSH 把它用作对比墨色）：对 `label-primary`（侧栏 build 徽标 + brand wordmark 的反色镂空）与 `button-contrast-fill`（附件删除按钮）≥ 4.5:1；
6. 侧栏表面 `--dsw-specific-sidebar-fill` 与内容底 `--dsw-alias-bg-base` 的边界对比度 ≥ 1.02:1（6 档）：DSH 用前者画侧栏列 / Windows 标题栏 / 内容卡背后的 frame，用后者画内容卡（16px 左上圆角），同色时边界消失（见 §2c）；
7. 聊天气泡 `--dsw-specific-bubble` 与 `bg-base` 的边界对比度 ≥ 1.10:1（light·soft 为 1.05:1 的可见性取舍，见 §2d），且气泡上的 `label-primary` ≥ 4.5:1（文本承载表面，见 §3）：气泡画在聊天画布上，同色时用户消息和背景融为一体（2026-10-19 走查，见 §2d / §6.8）；
8. FileDiff 的 added / deleted 行底色（`--dsw-alias-file-diff-*-bg`）上的 `label-primary` 代码文本 ≥ 4.5:1（light·soft 为 4.1:1 的可见性取舍，见 §2e）；DSH 用这两个 token 画行底色、文字继承 `label-primary`（2026-10-21 走查：「浅绿色背景配白色文字」与「浅色绿色背景太不明显」，见 §6.3）；
9. 色彩模式（中彩）大号标题 h1 / h2 / h3 / h4 对 `bg-base` ≥ 3.0:1（6 档）；
10. 色彩模式（中彩）`marker` / `quote` / `hr` / `check` 对 `bg-base` ≥ 3.0:1（6 档）；
11. 色彩模式（中彩）表头色带上的 `label-primary` ≥ 4.5:1（6 档）；
12. 色彩模式（中彩）斑马纹 / 行 hover / 引用块淡底上的 `label-primary` ≥ 4.5:1（6 档）；
13. 色彩模式（中彩）会话行底色（待确认 / 已完成，含 `:hover`）上的 `label-primary` ≥ 4.5:1（6 档）；
14. 色彩模式（中彩）状态点（待确认 / 已完成）对 `bg-base` 与 `sidebar-fill` 都 ≥ 3.0:1（6 档）；
15. 色彩模式（中彩）全部 25 个角色色值是合法 `#RRGGBB`（6 档）；
16. 色彩模式（中彩）强调文字（h5 / h6 / emphasis / 内部链接 / 行内 code）对其可能落到的每个 markdown 表面 ≥ 3.0:1（6 档）：浅色档调色板强调色本身达不到 4.5:1（Enchanted 同类文本约 2.6:1），本实现抬到 3.0:1 并保留色相，正文 `label-primary` 仍保持 4.5:1；
17. 工作区当前会话行（`src/active-session.js`，常驻、与色彩模式无关）：底色是合法 `#RRGGBB`、`label-primary` 在其上 ≥ 4.5:1（文本承载表面），且底色相对侧栏至少有 0.02 L* 的可见步长（不退化为侧栏同色）；6 档实测值见 §2g；

报告项（不 exit 1，仅低于 1.5 视为映射损坏）：上游 Everforest 的 muted 色对比度有意偏低（Enchanted 亦如此），下表给出数值与 native DSH 参考值对照。

## 2. 硬门槛明细（6 档）

| 变体 | label-primary / bg-base | / bg-layer-1 | / bg-layer-2 | shiki fg / bg | 品牌前景 / 品牌底 | 结果 |
|---|---:|---:|---:|---:|---:|---|
| light-hard | 5.40 | 5.34 | 5.26 | 5.26 | 2.91 | ✅ |
| light-medium | 5.18 | 5.12 | 5.04 | 5.04 | 2.79 | ✅ |
| light-soft | 4.66 | 4.61 | 4.53 | 4.53 | 2.51 | ✅ |
| dark-hard | 8.15 | 7.11 | 6.20 | 9.39 | 6.51 | ✅ |
| dark-medium | 7.38 | 6.40 | 5.57 | 8.62 | 5.89 | ✅ |
| dark-soft | 6.65 | 5.75 | 4.99 | 7.83 | 5.31 | ✅ |

## 2b. 反色前景真实配对（硬门槛）

`--dsw-alias-label-primary-inverted` 在 DSH 0.2.1-rc.2 / rc.3 中不是 toast/tooltip 深色底的文字色，而是与 `label-primary` / `button-contrast-fill` 配对的「对比墨色」（安装包 CSS：侧栏 build 徽标、附件删除按钮、brand wordmark 在当前 ink 上的反色镂空）。实现按真实配对硬门槛：

| 真实配对 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft | 阈值 | 结果 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| attachment remove button: label-primary-inverted on button-contrast-fill | 5.40 ✅ | 5.18 ✅ | 4.66 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ | 4.5 | ✅ |
| sidebar build badge + brand wordmark: label-primary-inverted on label-primary ink | 5.40 ✅ | 5.18 ✅ | 4.66 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ | 4.5 | ✅ |

## 2c. 侧栏边界（硬门槛）

DSH 的 Windows 外壳把标题栏条、侧栏列以及内容卡背后的 frame 都画成 `--dsw-specific-sidebar-fill`，内容卡本身是 `--dsw-alias-bg-base`（`bg0`）+ 16px 左上圆角（`ui-layout` 的 `AppFrame.module.css`）。两者取值相同时整条边界消失 —— 这正是 0.1.1 视觉走查报告的「Everforest 全屏一个颜色」。实现把侧栏定为从 `bg0` 向 `bg1` 混合 80%（light 更深、dark 更浅，方向与 native 侧栏一致）并经对比度守卫；本门槛确保它不会退回 `bg0`：

| 变体 | sidebar-fill | bg-base | 边界对比度 | 阈值 | 结果 |
|---|---|---|---:|---:|---|
| light-hard | `#f9f6e6` | `#FFFBEF` | 1.05 | 1.02 | ✅ |
| light-medium | `#f6f1db` | `#FDF6E3` | 1.05 | 1.02 | ✅ |
| light-soft | `#eee7ce` | `#F3EAD3` | 1.03 | 1.02 | ✅ |
| dark-hard | `#2d363a` | `#272E33` | 1.12 | 1.02 | ✅ |
| dark-medium | `#333d42` | `#2D353B` | 1.12 | 1.02 | ✅ |
| dark-soft | `#39444a` | `#333C43` | 1.12 | 1.02 | ✅ |

对照：DSH native light 侧栏 `#f9fafb` / 内容 `#fff` ≈ 1.045，native dark `#1b1b1c` / `#151517` ≈ 1.060，所以 1.03–1.12 的边界与 native 观感同级（light·soft 受正文 4.5:1 上限约束，取守卫后的最大步长）。侧栏上的正文可读性见 §3 第一行（`--dsw-specific-sidebar-fill` 已纳入文本承载表面）。

## 2d. 聊天气泡边界（硬门槛）

DSH 用 `--dsw-specific-bubble` 画用户消息气泡（`MessageItem.module.css`：`.bubble { background: var(--dsw-specific-bubble) }`），文字继承 `label-primary`。旧映射取 `surface(p, 1)`，light 下得到 `#FDFAEE` 对画布 `#FFFBEF` 只有 1.02:1，与背景融为一体（2026-10-19 走查）。现在 hard / medium 为 sage tint（`bg0` → `header-aqua` 16%）并经**向白**守卫；light·soft 因 `bg0` 已只有 4.66:1 文本余量、无法再用深色 tint，走「抬起卡片」方向——2026-10-21 用户走查指出近白卡片「变成白色了」，因此抬起方向改为白 → `fg.green` 13% 的**淡鼠尾草纸**（`#f0f3de`，文字 4.94:1）；它牺牲了部分明度差（对画布 1.06:1，阈值降到 1.05），由绿 vs 暖奶油的色相差异承担可辨识性。本门槛确保它不会退回画布：

| 变体 | bubble | bg-base | 边界对比度 | 阈值 | 结果 |
|---|---|---|---:|---:|---|
| light-hard | `#e4ecdc` | `#FFFBEF` | 1.17 | 1.1 | ✅ |
| light-medium | `#e4ead6` | `#FDF6E3` | 1.14 | 1.1 | ✅ |
| light-soft | `#f0f3de` | `#F3EAD3` | 1.06 | 1.05 | ✅ |
| dark-hard | `#2E383C` | `#272E33` | 1.15 | 1.1 | ✅ |
| dark-medium | `#343F44` | `#2D353B` | 1.15 | 1.1 | ✅ |
| dark-soft | `#3A464C` | `#333C43` | 1.16 | 1.1 | ✅ |

对照：native light 气泡 `static-deepseek-50 #edf3fe` on `#fff` ≈ 1.08；本实现 light·hard / medium 为 1.17 / 1.14，light·soft 为 1.06（低于 native 的明度差，由绿 vs 暖奶油的色相差异承担，阈值相应降到 1.05），dark 1.15–1.16。气泡文本对比度见 §3 的 `--dsw-specific-bubble` 行。

## 2e. FileDiff 行底文本（硬门槛）

DSH `FileDiff` 用 `--dsw-alias-file-diff-added/deleted-bg` 画行底、代码文字继承 `label-primary`，所以两者同属文本承载表面。默认门槛 4.5:1；**light·soft 例外**：该档代码画布本身已卡在 4.5:1，4.5:1 的行底与画布几乎同色（用户走查「浅色档绿色背景看不出」），因此允许行底文字降到 4.1:1 换取可辨识的绿 / 红条（2026-10-21 用户确认取舍，见 §6.3）。

| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---:|---:|---:|---:|---:|---:|
| `--dsw-alias-file-diff-added-bg` | 4.57 ✅ | 4.56 ✅ | 4.17 ✅ | 6.55 ✅ | 5.89 ✅ | 5.23 ✅ |
| `--dsw-alias-file-diff-deleted-bg` | 4.61 ✅ | 4.54 ✅ | 4.11 ✅ | 6.99 ✅ | 6.34 ✅ | 5.74 ✅ |

light·hard / medium / soft 的 added 行底对代码画布明度差约 1.15 / 1.10 / 1.09，deleted 1.14 / 1.11 / 1.10：浅色档现在能看出绿 / 红条；dark 行底向画布收 40% 后文字 ≥5.23:1。

## 2f. 色彩模式（中彩）角色色值（硬门槛 G9–G16）

`src/color-mode.js` 在 token 层之上派生一套「中彩」内容角色色，自 2026-10-24 起作为默认功能始终生效（设置页开关已移除）。映射参考 Obsidian **Everforest Enchanted** 的 markdown 配色，按 DSH 渲染器实际存在的元素落地：标题 h1–h6 依次 red → orange → yellow → green → blue → purple；strong / em 紫；行内 code 蓝（落在 DSH 的蓝底 chip 上）；内部文件链接 aqua（外链继续用官方 link token）；删除线与已完成任务淡化；引用块 aqua 淡底；表格表头绿色带 / 斑马纹 / 行 hover；复选框（浅色档绿、深色档蓝）；列表 marker / 引用条 / 分隔线 aqua；表格列宽提示线取 `headerAqua`（§18 的 2px 装饰线，不参与 G9–G16 文本门槛，由 `tests/color-mode.test.mjs` 钉住对表头色带 ≥ 2.5:1）；会话行保持 0.4.0 的整行实色底，2026-10-24 重制版把行底换成 Everforest palette1 的 `bg_green`（已完成）与 `bg_yellow`（待确认 / 待审批；用户反馈红色像报错，当日后续由 `bg_red` 改黄），浅色档的黄色再向 `fg.yellow` 加深到 3.5 L* 或 4.5:1 门槛为止（超过 4.5:1 的 soft 档沿 `bg0` 方向微调）；深色档因为 palette 的 `bg_yellow` 在浅色墨水下只能读作橄榄灰，改为「亮琥珀底 + 深色对比墨」（`--dsw-alias-label-primary-inverted`，标题 / 尾标 / 状态点一起继承，2026-10-24 第二轮反馈「深色档再亮/更黄一点」）。hover 向对应 `fg` 强调色混 16% 后重新守卫；完成行状态点颜色不变。全部由当前变体的 `bg-base` / `sidebar-fill` / `label-primary` / `label-tertiary` / 行内 code chip / 代码块表面和 `fg` 强调色算出：大号标题（h1–h4）与装饰朝 ink 混合到对 `bg-base` 3:1；强调文字对每个可能落到的 markdown 表面 3:1（见门槛 16）；彩色表面把强调色混入底色、权重由 `label-primary` 4.5:1 反推；状态点同时满足 `bg-base` 与 `sidebar-fill` 3:1。元素规则一律以 `html[data-everforest-color-mode="on"]` 开头——该属性恒为 `on`，只作作用域锚点；token 层零差异（与基线一致）。

角色色值（自定义属性均为 `--everforest-color-<角色>`，6 档）：

| 角色 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---|---|---|---|---|---|
| h1 | `#F85552` | `#F85552` | `#e45856` | `#E67E80` | `#E67E80` | `#E67E80` |
| h2 | `#d87934` | `#d07838` | `#bc7642` | `#E69875` | `#E69875` | `#E69875` |
| h3 | `#b18d28` | `#ac8b2c` | `#9c843a` | `#DBBC7F` | `#DBBC7F` | `#DBBC7F` |
| h4 | `#889b0d` | `#849715` | `#7d8f25` | `#A7C080` | `#A7C080` | `#A7C080` |
| h5 | `#3d90bd` | `#3f8db8` | `#408cb6` | `#7FBBB3` | `#7FBBB3` | `#7FBBB3` |
| h6 | `#c369ab` | `#bc69a7` | `#b969a5` | `#D699B6` | `#D699B6` | `#D699B6` |
| emphasis（strong+em） | `#c369ab` | `#bc69a7` | `#b969a5` | `#D699B6` | `#D699B6` | `#D699B6` |
| inline-code 文字 | `#3A94C5` | `#3c91c0` | `#408cb5` | `#7FBBB3` | `#7FBBB3` | `#7FBBB3` |
| 内部文件链接 | `#579478` | `#589077` | `#588f77` | `#569D79` | `#5b9f7b` | `#6ea582` |
| faint（删除线/已完成任务） | `#829181` | `#829181` | `#829181` | `#9DA9A0` | `#9DA9A0` | `#9DA9A0` |
| marker | `#37a47c` | `#39a07b` | `#409579` | `#83C092` | `#83C092` | `#83C092` |
| quote | `#37a47c` | `#39a07b` | `#409579` | `#83C092` | `#83C092` | `#83C092` |
| hr | `#37a47c` | `#39a07b` | `#409579` | `#83C092` | `#83C092` | `#83C092` |
| 列宽提示线（table-handle） | `#569D79` | `#569D79` | `#569D79` | `#569D79` | `#569D79` | `#569D79` |
| check | `#3f9779` | `#419379` | `#429279` | `#7FBBB3` | `#7FBBB3` | `#7FBBB3` |
| band | `#efeece` | `#edeac3` | `#efe7cb` | `#39423e` | `#3e4845` | `#434e4c` |
| zebra | `#f8f6e1` | `#f6f1d5` | `#efe7cb` | `#2f3738` | `#343d3f` | `#3a4447` |
| table-hover | `#f4f2d7` | `#f2eecc` | `#efe7cb` | `#343d3b` | `#394342` | `#3f4949` |
| quote-bg | `#eff4e6` | `#edf0db` | `#ede8d0` | `#2e3a3b` | `#344042` | `#394749` |
| row-warn | `#fbeac0` | `#f8e6bb` | `#f2e6c9` | `#b19a6b` | `#b39c6d` | `#b49d6f` |
| row-warn-hover | `#f9e6b5` | `#f8e6b9` | `#f2e6c7` | `#b89f6e` | `#b9a170` | `#baa272` |
| row-done | `#F3F5D9` | `#F0F1D2` | `#ebe8cb` | `#3C4841` | `#425047` | `#48574e` |
| row-done-hover | `#e7ebbe` | `#e9eac1` | `#eee7ca` | `#4a5749` | `#49574b` | `#49574f` |
| dot-warn | `#d07838` | `#c7773d` | `#b67545` | `#E69875` | `#E69875` | `#E69875` |
| dot-done | `#849715` | `#81931d` | `#7a8c2c` | `#A7C080` | `#A7C080` | `#A7C080` |

对比度门槛明细（数值为实际比值，✅/❌ 按阈值判定）：

| 检查项 | 阈值 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft | 结果 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| h1 / bg-base | 3 | 3.17 ✅ | 3.04 ✅ | 3.01 ✅ | 5.02 ✅ | 4.55 ✅ | 4.10 ✅ | ✅ |
| h2 / bg-base | 3 | 3.03 ✅ | 3.03 ✅ | 3.02 ✅ | 5.98 ✅ | 5.41 ✅ | 4.88 ✅ | ✅ |
| h3 / bg-base | 3 | 3.02 ✅ | 3.00 ✅ | 3.03 ✅ | 7.55 ✅ | 6.84 ✅ | 6.16 ✅ | ✅ |
| h4 / bg-base | 3 | 3.01 ✅ | 3.03 ✅ | 3.01 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| h5 / markdown 表面（取最弱） | 3 | 3.00 ✅ | 3.00 ✅ | 3.01 ✅ | 4.78 ✅ | 4.36 ✅ | 3.97 ✅ | ✅ |
| h6 / markdown 表面（取最弱） | 3 | 3.00 ✅ | 3.00 ✅ | 3.01 ✅ | 4.49 ✅ | 4.10 ✅ | 3.74 ✅ | ✅ |
| emphasis / markdown 表面（取最弱） | 3 | 3.00 ✅ | 3.00 ✅ | 3.01 ✅ | 4.49 ✅ | 4.10 ✅ | 3.74 ✅ | ✅ |
| link-internal / markdown 表面（取最弱） | 3 | 3.01 ✅ | 3.03 ✅ | 3.02 ✅ | 3.21 ✅ | 3.02 ✅ | 3.03 ✅ | ✅ |
| inline-code / inline-code 底色 | 3 | 3.03 ✅ | 3.02 ✅ | 3.00 ✅ | 7.02 ✅ | 6.42 ✅ | 5.82 ✅ | ✅ |
| marker / bg-base | 3 | 3.00 ✅ | 3.00 ✅ | 3.02 ✅ | 6.51 ✅ | 5.89 ✅ | 5.31 ✅ | ✅ |
| quote / bg-base | 3 | 3.00 ✅ | 3.00 ✅ | 3.02 ✅ | 6.51 ✅ | 5.89 ✅ | 5.31 ✅ | ✅ |
| hr / bg-base | 3 | 3.00 ✅ | 3.00 ✅ | 3.02 ✅ | 6.51 ✅ | 5.89 ✅ | 5.31 ✅ | ✅ |
| check / bg-base | 3 | 3.43 ✅ | 3.43 ✅ | 3.12 ✅ | 6.34 ✅ | 5.74 ✅ | 5.17 ✅ | ✅ |
| band / label-primary | 4.5 | 4.73 ✅ | 4.56 ✅ | 4.51 ✅ | 6.14 ✅ | 5.60 ✅ | 5.11 ✅ | ✅ |
| zebra / label-primary | 4.5 | 5.12 ✅ | 4.91 ✅ | 4.51 ✅ | 7.21 ✅ | 6.59 ✅ | 5.92 ✅ | ✅ |
| table-hover / label-primary | 4.5 | 4.93 ✅ | 4.76 ✅ | 4.51 ✅ | 6.62 ✅ | 6.05 ✅ | 5.50 ✅ | ✅ |
| quote-bg / label-primary | 4.5 | 4.99 ✅ | 4.81 ✅ | 4.54 ✅ | 6.96 ✅ | 6.35 ✅ | 5.72 ✅ | ✅ |
| row-warn / 行文字色（light label-primary，dark inverted） | 4.5 | 4.69 ✅ | 4.53 ✅ | 4.51 ✅ | 5.82 ✅ | 5.47 ✅ | 5.04 ✅ | ✅ |
| row-warn-hover / 行文字色（light label-primary，dark inverted） | 4.5 | 4.53 ✅ | 4.52 ✅ | 4.50 ✅ | 6.21 ✅ | 5.82 ✅ | 5.36 ✅ | ✅ |
| row-done / label-primary | 4.5 | 5.02 ✅ | 4.85 ✅ | 4.51 ✅ | 5.66 ✅ | 5.03 ✅ | 4.52 ✅ | ✅ |
| row-done-hover / label-primary | 4.5 | 4.53 ✅ | 4.52 ✅ | 4.50 ✅ | 4.52 ✅ | 4.52 ✅ | 4.50 ✅ | ✅ |
| dot-warn / bg-base | 3 | 3.16 ✅ | 3.17 ✅ | 3.12 ✅ | 5.98 ✅ | 5.41 ✅ | 4.88 ✅ | ✅ |
| dot-warn / sidebar-fill | 3 | 3.01 ✅ | 3.02 ✅ | 3.02 ✅ | 5.36 ✅ | 4.83 ✅ | 4.34 ✅ | ✅ |
| dot-done / bg-base | 3 | 3.16 ✅ | 3.18 ✅ | 3.12 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| dot-done / sidebar-fill | 3 | 3.02 ✅ | 3.02 ✅ | 3.02 ✅ | 6.17 ✅ | 5.56 ✅ | 5.00 ✅ | ✅ |

G15：以上 6 档 × 25 个角色色值全部是合法 `#RRGGBB`。取值公式与期望值来自 2026-10-23 的中彩样张（`.tmp/color-mode-preview`，不入库）、Enchanted 的 markdown 角色映射与 2026-10-24 的状态行重制（行底取 palette1 的 `bg_yellow` / `bg_green`，浅色档黄色按可见性下限加深，hover 重新守卫），由 `tests/color-mode.test.mjs` 逐值锁定、本报告逐档把关；色彩模式自 2026-10-24 起默认提供、没有设置开关（0.4.x 的开关已随设置页区块移除）；`html` 上的 `data-everforest-color-mode` 恒为 `on`，仅作作用域锚点，只改 `data-everforest-*` 属性、不写任何 token。faint 直接取该档 `label-tertiary`，是刻意的弱化色（删除线 / 已完成任务），不参与门槛。

## 2g. 工作区当前会话行（active-session，硬门槛 G17）

DSH 把「当前打开的会话」和 hover 画成同一条规则（`ui-workspace` 的 `Rows` 模块：`.wnFoaW_sessionRow:hover,.wnFoaW_sessionRow.wnFoaW_selected{background:var(--dsw-alias-interactive-bg-hover)}`），而该 token 只是 `bg5` 的 16% alpha —— 在 Everforest 的压缩 ramp 里对侧栏只有约 2.6 L*，深 / 浅两档都很难找到当前会话（2026-10-24 用户反馈）。上游没有独立的「选中行」token，`src/active-session.js` 因此用一行常驻规则（`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`）把选中行画成 palette1 的 `bg_blue`，再按「先保证可读、再尽量可见」的顺序守卫：① 向 `bg0` 微调到 `label-primary` ≥ 4.5:1；② 若离侧栏仍不足 4.5 L*，向 `fg.blue` 混合到 4.5 L* 或文本门槛先到为止。蓝色与色彩模式给「待确认 / 已完成」行的 `bg_yellow` / `bg_green` 属于不同色相，语义上又和 DSH 的 business primary 一致。该样式常驻、与色彩模式无关（导航可见性，不是内容着色；色彩模式自 2026-10-24 起也没有开关）。

| 变体 | active fill | sidebar-fill | L* 步长 | label-primary | 阈值 | 结果 |
|---|---|---|---:|---:|---:|---|
| light-hard | `#dcece9` | `#f9f6e6` | 4.55 | 4.58 | 4.5 | ✅ |
| light-medium | `#ddeae6` | `#f6f1db` | 3.35 | 4.52 | 4.5 | ✅ |
| light-soft | `#e6e8db` | `#eee7ce` | 0.06 | 4.50 | 4.5 | ✅ |
| dark-hard | `#384B55` | `#2d363a` | 8.76 | 5.39 | 4.5 | ✅ |
| dark-medium | `#3A515D` | `#333d42` | 8.02 | 4.94 | 4.5 | ✅ |
| dark-soft | `#3f5764` | `#39444a` | 7.47 | 4.51 | 4.5 | ✅ |

已知上限：light·soft 的画布本身已卡在 4.5:1 文本门槛（`bg0` 对 ink 约 4.59:1），侧栏与画布只差约 2 L*，任何更深的行底都会把正文压到 4.5:1 以下，所以该档只保留 palette 色相、明度步长接近 0 —— 与色彩模式会话行的 light·soft 限制同源（§2f / design doc §13.7）。light·medium 走到文本门槛上限约 3.35 L*，light·hard 4.55、dark 三档 7.47–8.76（均为 palette 原值）。

## 3. 文本承载表面（label-primary 对比度）

`docs/design.md` §4 要求这些表面上的主文本可读；`src/tokens.js` 的 `readableSurface` 会在不达标时向方案背景色 `bg0` 微调（light 提亮、dark 压暗，bg0 始终是该 scheme 下与 `fg` 对比最高的背景），实际值如下。

| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---:|---:|---:|---:|---:|---:|
| `--dsw-specific-sidebar-fill` | 5.15 ✅ | 4.93 ✅ | 4.51 ✅ | 7.31 ✅ | 6.59 ✅ | 5.92 ✅ |
| `--dsw-alias-bg-layer-1` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-alias-bg-layer-2` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-bg-layer-3` | 5.21 ✅ | 4.94 ✅ | 4.52 ✅ | 5.30 ✅ | 4.75 ✅ | 4.54 ✅ |
| `--dsw-alias-bg-overlay` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-bg-document-preview` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-alias-bg-module-platform` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-bg-multi-select` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-settings-card-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-markdown-code-block` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ |
| `--dsw-alias-markdown-code-block-banner` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ |
| `--dsw-alias-markdown-code-segment-selected` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-alias-markdown-code-segment-unselected` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ |
| `--dsw-alias-markdown-inline-code` | 5.01 ✅ | 4.82 ✅ | 4.50 ✅ | 9.04 ✅ | 8.26 ✅ | 7.49 ✅ |
| `--dsw-alias-markdown-citation` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-markdown-placeholder` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-markdown-tag` | 5.21 ✅ | 4.94 ✅ | 4.52 ✅ | 5.30 ✅ | 4.75 ✅ | 4.54 ✅ |
| `--dsw-alias-button-elevated-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-button-floating-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-button-ghost-active-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-interactive-bg-hover-solid` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-turn-trigger-bg` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 9.39 ✅ | 8.62 ✅ | 7.83 ✅ |
| `--dsw-alias-menu-group-header-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.30 ✅ | 5.65 ✅ | 5.07 ✅ |
| `--dsw-menu-surface-fill` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.30 ✅ | 5.65 ✅ | 5.07 ✅ |
| `--dsw-specific-menu` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.30 ✅ | 5.65 ✅ | 5.07 ✅ |
| `--dsw-specific-bubble` | 4.61 ✅ | 4.53 ✅ | 4.94 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-bubble-highlight` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-input-major` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-login-input` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-selector` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-tip` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-sidebar-nav-item-active` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-sidebar-nav-item-hover` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-alias-onboarding-card-fill` | 5.30 ✅ | 5.09 ✅ | 4.58 ✅ | 6.58 ✅ | 5.91 ✅ | 5.30 ✅ |
| `--dsw-alias-onboarding-secondary-fill` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |

## 4. 语义色 / 次要文本报告（不 exit 1）

| 用途 | token | 背景 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---|---|---:|---:|---:|---:|---:|---:|
| label-secondary | `--dsw-alias-label-secondary` | `--dsw-alias-bg-base` | 2.67 | 2.56 | 2.30 | 4.24 | 3.84 | 3.46 |
| label-secondary / layer-1 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-1` | 2.64 | 2.53 | 2.28 | 3.70 | 3.33 | 2.99 |
| label-secondary / layer-2 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-2` | 2.60 | 2.49 | 2.24 | 3.23 | 2.90 | 2.60 |
| label-secondary / layer-3 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-3` | 2.58 | 2.44 | 2.23 | 2.76 | 2.47 | 2.36 |
| label-tertiary | `--dsw-alias-label-tertiary` | `--dsw-alias-bg-base` | 3.21 | 3.08 | 2.77 | 5.65 | 5.12 | 4.61 |
| link | `--dsw-alias-link` | `--dsw-alias-bg-base` | 3.26 | 3.13 | 2.82 | 6.34 | 5.74 | 5.17 |
| state-success | `--dsw-alias-state-success-primary` | `--dsw-alias-bg-base` | 2.81 | 2.69 | 2.42 | 6.88 | 6.23 | 5.62 |
| state-warn | `--dsw-alias-state-warn-primary` | `--dsw-alias-bg-base` | 2.21 | 2.12 | 1.91 | 7.55 | 6.84 | 6.16 |
| state-error | `--dsw-alias-state-error-primary` | `--dsw-alias-bg-base` | 3.17 | 3.04 | 2.73 | 5.02 | 4.55 | 4.10 |
| state-business | `--dsw-alias-state-business-primary` | `--dsw-alias-bg-base` | 3.26 | 3.13 | 2.82 | 6.34 | 5.74 | 5.17 |
| state-warn-label | `--dsw-alias-state-warn-label` | `--dsw-alias-bg-base` | 3.02 | 2.90 | 2.61 | 7.77 | 7.04 | 6.34 |
| diff-added-marker | `--dsw-alias-file-diff-added-marker` | `--dsw-alias-file-diff-added-bg` | 2.38 | 2.37 | 2.17 | 5.53 | 4.97 | 4.41 |
| diff-deleted-marker | `--dsw-alias-file-diff-deleted-marker` | `--dsw-alias-file-diff-deleted-bg` | 2.70 | 2.66 | 2.41 | 4.31 | 3.91 | 3.54 |
| diff-added-number | `--dsw-alias-file-diff-added-marker` | `--dsw-alias-file-diff-added-gutter` | 2.53 | 2.48 | 2.26 | 6.30 | 5.69 | 5.11 |
| diff-deleted-number | `--dsw-alias-file-diff-deleted-marker` | `--dsw-alias-file-diff-deleted-gutter` | 2.85 | 2.79 | 2.52 | 4.83 | 4.36 | 3.97 |
| toast-label (inverted) | `--dsw-alias-toast-label` | `--dsw-alias-toast-bg` | 5.40 | 5.18 | 4.66 | 9.39 | 8.62 | 7.83 |
| primary-foreground (brand) | `--dsw-alias-label-primary-foreground` | `--dsw-alias-brand-primary` | 2.91 | 2.79 | 2.51 | 6.51 | 5.89 | 5.31 |

以上报告项 floor = 1.5。状态色/次要文本低于 4.5 属**上游设计取舍**：DSH 原生语义色在 light 主题下同样偏低（见 §5），插件保持 Enchanted/上游语义色，不为了数字把它们改成 `fg`。

## 5. native DSH 参考值（light 主题，on #fff 或对应底色）

| 项 | 前景 | 背景 | 对比度 |
|---|---|---|---:|
| label-secondary (native) | `#61666b` | `#ffffff` | 5.80 |
| label-tertiary (native) | `#81858c` | `#ffffff` | 3.71 |
| link / state-business (native) | `#4176e6` | `#ffffff` | 4.23 |
| state-success (native) | `#22c55e` | `#ffffff` | 2.28 |
| state-warn (native) | `#f59e0b` | `#ffffff` | 2.15 |
| state-error (native) | `#ec1313` | `#ffffff` | 4.50 |
| diff added marker (native) | `#01a241` | `#e6f4e7` | 2.96 |
| diff deleted marker (native) | `#ba2723` | `#fce6e2` | 5.16 |

对照可见：native DSH 的 `state-warn`（amber-500 on #fff = 2.15）与 `state-success`（green-500 on #fff = 2.28）本身就是低对比；Everforest 的 `yellow` / `green` 与之同级，属于语义色层固有取舍，而不是映射错误。`label-secondary` 同理：native 用 `neutral-bluish-700`（on #fff = 5.80），Everforest `grey1` 在 light 下只有 2.30–2.67 —— 这是 Enchanted/上游刻意采用的 muted 语义，不为了数字把它提亮成 `fg`。

## 6. 与 design.md 的偏差

### 6.1 light scheme 文本表面提亮（approved）

- **原因**：上游 light·soft 档 `bg1 = #EAE4CA`、`bg2 = bgDim = #E5DFC5`，`fg = #5C6A72` 只得到 4.38 / 4.17:1，达不到硬门槛 4.5；而 light·hard / light·medium 的对应值原本就达标（4.66–5.40）。
- **做法**：light scheme 的文本表面（`bg-layer-1/2/3`、`bg-overlay`、`bg-document-preview`、`markdown-code-block` / `--shiki-background`、输入框 / 菜单 / settings 卡片 / diff 底色等）以 `mix(bg0, bgN, 0.25)` 提亮（diff 为 0.45），再由 `readableSurface` 按实际对比度向 `bg0` 微调直到 `label-primary` ≥ 4.5:1；实际值见 §3。聊天气泡不在这族里：它按 2026-10-19 走查单独处理（§6.8）。inline code 芯片同理不在 bgN 表面族内：DSH 把它当 `background-color` 用，映射取调色板 `bg_blue`（见 `src/tokens.js`），同样经 `readableSurface` 守卫。
- **影响 token**：见 §3 全表（light 三档）；dark scheme 保持 design 原值（原生 bg1/bg2 已 ≥4.99，`bg-layer-3` 在 dark·soft 下 4.27 也由 `readableSurface` 微调到达标）。
- **依据**：DSH 原生 light 主题的 `bg-layer-1/2/3` 全部是 `#fff`（`static-neutral-bluish-00`），层次靠边框/阴影；Everforest Enchanted 也是平铺风格（`palette.md` §5「主背景 bg0 平铺」）。因此 light 表面趋近 bg0 并不破坏 DSH 结构语义，只是修正 `fg` 在较暗浅色底上的可读性。

### 6.2 static 色阶插值的端点解释

- design 写「最暗 = bg5、最亮 = bg0」。对 dark scheme 而言 `bg5` 比 `bg0` **更亮**，按字面会得到反向亮度（statics 无法作为浅色文本色）。
- 实现按「绝对亮度锚定」解释：DSH static 是双 scheme 相同的绝对色阶（00 = 白 … 1000 = 黑），映射到各 scheme 的最亮锚点 → `bg5` → 最暗锚点：
  - light：`bg0` → `bg5` → `fg`；dark：`fg` → `bg5` → `bgDim`；色相族为「浅 tint → fg 色相 → 深 tint」。
- 该解释让所有 `var(--dsw-static-*)` 引用在两个 scheme 下都保持方向正确（design 对 static 层的目标），且不改变 206 个 token 的显式覆盖。

### 6.3 diff 底色

- `file-diff-added/deleted-bg` 在 light 下把 `bg0` 向 `fg.green` / `fg.red` 压到「`label-primary` 仍 ≥4.5」的极限（2026-10-21 走查：旧实现 `bg0` → `bg_green` 混 45%，行底与代码画布只有 1.001–1.007:1，浅色档根本看不出 added / deleted 行）。现在 light·hard / medium 的绿 / 红条对代码画布分别有 1.15 / 1.10 与 1.14 / 1.11:1 的明度差。light·soft 的代码画布本身已卡在 4.5:1 文本门槛上，4.5:1 的行底与画布仍然同色；该档允许行底文字降到 4.1:1（`#e5e0b6` / `#f4d8c4`），对画布明度差 1.09 / 1.10，与 medium 观感同级——2026-10-21 用户确认的可见性取舍。
- dark 下 `file-diff-*-bg` 向 `bg0` 混合 40%——DSH 直接用 ramp 色画行底，dark·soft 的 `bg_green` = `#48574e` 是明显偏亮的绿色带，近白的 `label-primary` 只有 4.52:1（同上走查「浅绿色背景配白色文字」），向画布收 40% 后为 `#404d4a`、文字 5.23:1，仍是可辨识的绿色条；
- gutter 在底色基础上沿 scheme 的纵深方向退一步：light 向 `bg0` 提亮 35%，dark 向 `bgDim` 压暗 35%（与 native 同向：light `#edf7ed` on `#e6f4e7`、dark `#132016` on `#1f3124`）。旧实现两个 scheme 都向亮端 `lift`，dark 下行号 gutter 反而比行底更亮（`#797e6e`），绿色行号只有 2.09:1；现在 dark 行号 ≥3.97:1、绿色条与 gutter 的层次也与 native 一致。
- 行号 / marker 属小号文本，按既有口径保留为报告项（§4）：light 下 marker on gutter 为 2.38–3.04（native light 为 2.6，同属 muted 取舍），dark 为 3.97–6.30。

### 6.4 toast / tooltip / 反色前景

- DSH 原生 `toast-bg` / `tooltip-bg` 在**两个 scheme 下都是深色表面**（light: `toast-bg` = `neutral-bluish-800`、`tooltip-bg` = `neutral-bluish-850`；dark: 两者都是 `neutral-bluish-750`），`toast-label` 恒为 `neutral-bluish-00`。
- 因此实现为「反色表面 + 反色前景」：`toast-bg` / `tooltip-bg` = `fg`（light）/ `bgDim`（dark）派生深色，`toast-label` = `bg0`（light）/ `fg`（dark）。design §4 把 `tooltip-key-bg` 标为 `bg3`，这里改为在 tooltip 深色底上向亮端混合 25%（保持键帽可见），属实现细节偏差。
- `label-primary-inverted` 单独处理：它在 DSH 中与 `label-primary`（侧栏 build 徽标、brand wordmark 的 currentColor 反色镂空）、`button-contrast-fill`（附件删除按钮）配对，必须是 scheme ink 的反色（light = `bg0`、dark = `bgDim`），不能沿用 toast/tooltip 的浅色文字（否则 dark 主题下与背景同色不可见）。真实配对对比度见 §2b。

### 6.5 菜单/浮层材质

- `menu-surface-fill` / `menu-group-header-fill` / `button-tool-bar-*` 保持 `bg2` + 原 45%–94% 不透明度语义（design §4 第 2 层）；alpha 值不变。

### 6.6 未覆盖项

字体 / 圆角 / 阴影 / 焦点环 / 菜单模糊 / `--dsh-*` 终端几何等保持 DSH 原生值，清单见 `src/tokens.js` 顶部与 `TOKEN_COVERAGE.uncovered`。焦点环颜色通过 `--dsw-alias-state-business-primary` 自动跟随 Everforest blue。

### 6.7 侧栏与内容卡的边界（视觉走查修正）

- **问题**：0.1.1 把 `--dsw-specific-sidebar-fill` 和 `--dsw-alias-bg-base` 都映射为 `bg0`（Enchanted 平铺风格），但 DSH 的 Windows 外壳用前者画侧栏列 / 标题栏条 / 内容卡背后的 frame，用后者画带 16px 左上圆角的内容卡；同色后整条边界消失，窗口看上去是一个平面（用户走查：「Everforest 全部用的同一个颜色，没法区分边界线」）。
- **做法**：侧栏取 `mix(bg0, bg1, 80%)` 并经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏 `#f9fafb`/`#fff`、`#1b1b1c`/`#151517` 一致）。light·soft 的正文 4.5:1 上限把步长压到 `#eee7ce`（边界 1.03），其余档 1.05–1.12；native 为 1.045 / 1.060，观感同级。数值见 §2c。
- **连带影响**：`--dsw-specific-sidebar-fill` 同时是 DSH 桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会随侧栏一起变色，与自绘标题栏条保持一致；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。

### 6.8 聊天气泡（2026-10-19 / 2026-10-21 走查修正）

- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射取 `surface(p, 1)`；light 下 `mix(bg0, bg1, 0.25)` = `#FDFAEE`，与画布 `#FFFBEF` 仅 1.02:1，用户报告「聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡并不是中性色阶，而是 `static-deepseek-50` 的淡蓝色 tint（on `#fff` ≈ 1.08），靠色相 + 轻微明度区分。2026-10-21 二次走查：light·soft 的近白「抬起卡片」被用户描述为「聊天气泡框变成白色的了」，与暖色画布不像一家人。
- **做法**：light 下取 `bg0` → `header-aqua` 16% 的 sage tint，经 `readableToward(..., #ffffff)`（**向白**而非向暖色画布）守卫到 4.5:1。light·hard / medium 的 tint 能保持 ~1.17 / 1.14:1 边界、气泡文字 4.6 / 4.5:1；light·soft 的 `bg0` 已是 4.66:1 文本余量，任何再压暗都会跌破 4.5，所以走抬起方向，但不再用近白冷调：改为白 → `fg.green` 13% 的淡鼠尾草纸（`#f0f3de`，文字 4.94:1，对画布 1.06:1）。它用绿 vs 暖奶油的色相差异代替已不可得的明度差，气泡边界门槛对该档放宽到 1.05。dark 保持 `bg1`（边界 1.14–1.16，文字 ≥5.7:1）。
- **门槛**：新增硬门槛 §2d（气泡 vs `bg-base` ≥ 1.10:1，light·soft 1.05:1）+ §3 的文本承载表面检查（气泡文字 ≥ 4.5:1）。`--dsw-specific-bubble-highlight` 当前 chat 未使用，保持 `surface(p, 2)`。
- **影响 token**：仅 `--dsw-specific-bubble`；其余表面与文字色不变。

## 7. 复现

```bash
node scripts/check-contrast.mjs
node --test tests/color.test.mjs tests/tokens.test.mjs tests/color-mode.test.mjs
```
