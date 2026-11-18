# Everforest token contrast report

> 由 `node scripts/check-contrast.mjs` 生成，请勿手改。
> WCAG 2.x 相对亮度公式；6 档 = light/dark × hard/medium/soft。

## 1. 结论

- 硬门槛：**全部通过** ✅
- 报告项（次要文本 / 语义色 / diff / 反色前景）：全部 ≥ 1.5，无映射损坏 ✅
- 覆盖 token 数：232（226 颜色 + 6 辅助 token）

硬门槛定义：

1. `label-primary`（= `fg`）对 `bg-base` / `bg-layer-1` / `bg-layer-2` ≥ 4.5:1（6 档）；
2. `--shiki-foreground` 对 `--shiki-background` ≥ 4.5:1（6 档）；
3. 每个被覆盖的颜色值必须是合法 CSS 颜色，且 `label-primary` ≠ `bg-base`；
4. 品牌实底前景（`label-primary-foreground` = `bg0` on `statusline1` 交互强调色）≥ 1.95:1：上游 Everforest 的同一配对就是奶油墨 + 浅绿（参考 tab 亦如此），2026-11-08 第三轮起实底取 `statusline1` 原值、不再向 `fg` 微调，浅色档因此固定为 2.00–2.32:1（见 `palette.md` §5 偏差 9）；
5. `--dsw-alias-label-primary-inverted` 的真实配对（DSH 把它用作对比墨色）：对 `label-primary`（侧栏 build 徽标 + brand wordmark 的反色镂空）与 `button-contrast-fill`（附件删除按钮）≥ 4.5:1；
6. 侧栏表面 `--dsw-specific-sidebar-fill` 与内容底 `--dsw-alias-bg-base` 的边界对比度 ≥ 1.02:1（6 档）：DSH 用前者画侧栏列 / Windows 标题栏 / 内容卡背后的 frame，用后者画内容卡（16px 左上圆角），同色时边界消失（见 §2c）；
7. 聊天气泡 `--dsw-specific-bubble` 与 `bg-base` 的边界对比度 ≥ 1.10:1（light·soft 为 1.05:1 的可见性取舍，见 §2d），且气泡上的 `label-primary` ≥ 4.5:1（文本承载表面，见 §3）：气泡画在聊天画布上，同色时用户消息和背景融为一体（2026-10-19 走查，见 §2d / §6.8）；
8. FileDiff 的 added / deleted 行底色（`--dsw-alias-file-diff-*-bg`）上的 `label-primary` 代码文本 ≥ 4.5:1（light·soft 为 4.1:1 的可见性取舍，见 §2e）；DSH 用这两个 token 画行底色、文字继承 `label-primary`（2026-10-21 走查：「浅绿色背景配白色文字」与「浅色绿色背景太不明显」，见 §6.3）；
9. 色彩模式（中彩）大号标题 h1 / h2 / h3 / h4 对 `bg-base` ≥ 3.0:1（6 档）；
10. 色彩模式（中彩）`marker` / `quote` / `hr` / `check` 对 `bg-base` ≥ 3.0:1（6 档）；未勾选的任务框是同一支绿的 68% 描边 + 10% 淡底，已勾选框是实底 + 勾：浅色档是该档画布奶油，深色档是主题白 `#FFFBEF`（1.93:1，图形标记，见 design §48）；
11. 色彩模式（中彩）表头色带上的 `label-primary` ≥ 4.5:1（6 档）；
12. 色彩模式（中彩）斑马纹 / 行 hover / 引用块淡底上的 `label-primary` ≥ 4.5:1（6 档）；
13. 色彩模式（中彩）会话行底色（待确认 / 已完成，含 `:hover`）上的 `label-primary` ≥ 4.5:1（6 档；light·soft 的「已完成」行按 §35 记 4.2 下限，实测 4.39 / 4.25:1；「待确认」行按 §37 记 4.1 下限，实测 4.24 / 4.13:1）；
14. 色彩模式（中彩）状态点（待确认 / 已完成）对 `bg-base` 与 `sidebar-fill` 都 ≥ 3.0:1（6 档）；
15. 色彩模式（中彩）全部 25 个角色色值是合法 `#RRGGBB`（6 档）；
16. 色彩模式（中彩）强调文字（h5 / h6 / emphasis / 内部链接 / 行内 code）对其可能落到的每个 markdown 表面 ≥ 3.0:1（6 档）：浅色档调色板强调色本身达不到 4.5:1（Enchanted 同类文本约 2.6:1），本实现抬到 3.0:1 并保留色相，正文 `label-primary` 仍保持 4.5:1；
17. 工作区当前会话行（`src/active-session.js`，常驻、与色彩模式无关）：底色是合法 `#RRGGBB` 的交互强调色 `statusline1`、文字墨色是方案画布 `bg0`（两者都是合法色值，无混色 / 无透明度）；墨色同时覆盖行内灰字与中性的加载 spinner（`[data-state="ongoing"]`，§23.6），语义状态点保持语义色；深色档墨色在其上 ≥ 4.5:1（5.62–6.88:1，取画布 `bg0`），浅色档同取画布 `bg0`（2.00–2.32:1，已记录的 1.95 下限）；6 档实测值见 §2g；
18. 工作区目录名称（`src/workspace-labels.js`，常驻、与色彩模式无关）：颜色是合法 `#RRGGBB` 的**文字绿 `green`**（上游 foreground green，浅色 `#8DA101` 比背景绿 `statusline1` `#93B259` 深一档；深色两者同为 `#A7C080`）；深色档静止行 ≥4.5:1（AA 下限，实测 5.00–6.17）、A7 的 50% `bg4` hover 叠加底上 ≥4.0:1（已记录取舍）；浅色档静止行 ≥2.3、hover 底固定 2.1 的已记录下限（文字绿实测下限）；6 档实测值见 §2h；
19. 下拉选中项（`src/ui-accents.js`，常驻、与色彩模式无关）：菜单 / 单选列表的选中项以`statusline1`（浅色 `#93B259`）作实色底、方案画布 `bg0` 作文字与勾勾墨色（深色档 ≥ 4.5:1，浅色档 2.00–2.32:1，已记录的 1.95 下限），选中项内由 DSH 单独上色的图标与次要文字（`--dsw-alias-menu-icon` 与 `label-*` 族）同样取该墨色，并对菜单卡保持 ≥ 0.02 的 L* 步长；会话标题自 2026-11-09 起回到 DSH 原生 `label-primary`（用户「标题不需要绿色显示了」），不再由本样式表染色；6 档实测值见 §2i；
20. 插件更新弹窗（`src/plugin-update.js`，常驻、与色彩模式无关）：完成步骤的文字是合法 `#RRGGBB` 的交互强调色 `statusline1`（浅色档即 `#93B259`，与弹窗「完成」按钮同色）、失败步骤是语义红 `fg.red`（语义色，仅报告不设门槛，实测 2.66–3.82:1）、其余状态回到 `label-primary`；完成步骤的 20px 圆点与结果大图标改为「`statusline1` 实底 + 画布 `bg0` 墨色」（深色 5.62–6.88:1，浅色 2.00–2.32:1，门槛 1.95）；完成步骤的绿色**文字**在浅色奶油面板上仍是 1.95–2.26:1 的已记录下限（与徽标不同，那是绿字压奶油，门槛 1.9），深色档文字 ≥ 4.0:1；6 档实测值见 §2j；
21. 聊天气泡文字选区（`src/chat-bubble.js`，常驻、与色彩模式无关）：选区底色保持全局 `::selection` 的 `bg_visual`（用户要求「勾选颜色各处都统一」），只把气泡内选中文字重新上色：浅色 `#2F3B33`（深松墨，对浅色选区带 7.09–8.33:1）、深色 `#FFFBEF`（奶油，对深梅色选区 8.91–10.49:1）；原字色在选区上不可读（浅色奶油字 1.36–1.38:1、深色气泡字 1.22–1.27:1）；气泡外仍 `color: inherit` 保留原色；6 档选中文字 ≥ 4.5:1、选区带对气泡底 ≥ 1.45:1（浅色，下限是 light·soft 的 1.47）/ ≥ 4.5:1（深色 4.61–5.42），6 档实测值见 §2k；
22. 发送 / 终止按钮图标（`src/tokens.js` 的 `--dsw-alias-label-on-color`，常驻、与色彩模式无关）：DSH 用它在饱和实底上画白墨（`ui-conversation` 的 `InputBar.module.css` 里 `.primary { color: var(--dsw-alias-label-on-color) }`，发送箭头与终止方块共用该圆钮），配 `--dsw-alias-button-info-fill`（主题的交互强调色 `statusline1`）及其 hover；DSH 原生就是「白字压饱和底」（2.00–2.40:1，靠色相而不是明度辨识），因此门槛固定为字面 `#FFFFFF` 且两种 scheme 对实底 / hover 都 ≥ 1.9:1；它此前是继承 token，亮度锚定把 `neutral-bluish-00` 解析成深色档的 `fg` `#D3C6AA`，图标变成 1.18:1 的土黄（2026-11-13 用户反馈「发送和终止的按钮里面的图标变色了」），6 档实测值见 §2l；
23. 问答回复卡的「问题墨」（`src/chat-bubble.js`，常驻、与色彩模式无关）：回复卡是一块强调色表面，问题行不再有单独的底色 —— 它只在墨色上退一档：`dt` 用的 `--dsw-alias-label-secondary` 在气泡子树内被重指向「气泡墨色向气泡底移动 6 L*」的取色（`chatBubbleQuestionInk()`，浅色三档 `#e9ecd1` / `#e6e7c5` / `#dbdcb5`，深色三档 `#343d3b` / `#3a4443` / `#404b4a`），回答行保持气泡墨色。这就是 DSH 自己的层次（`QuestionReplyView` 的 `dt` 是 `label-secondary`、`dd` 继承气泡墨色）；门槛同时卡住这一档的两端：L* 差 ≥ 4（否则两行还是一个声音）、≤ 8（再远就像禁用态）、问题必须比回答淡，并且仍可读 —— 浅色 ≥ 1.65:1（实测 1.70–1.99，light·soft 最紧）、深色 ≥ 4.4:1（AA，实测 4.52–5.59）；6 档实测值见 §2m；
24. 运行中会话标题（`src/running-title.js`，常驻、与色彩模式无关）：命中「行首有 `[data-state="ongoing"]` 且未选中」的会话行标题，静止色是合法 `#RRGGBB` 的**文字绿 `green`**（与工作区目录名同色），扫光带永远朝「背离侧栏画布」的方向走——浅色档把绿压深（`#8DA101` → `#667401`，2.35–2.68 → 4.17–4.76:1），深色档把绿提亮（`#A7C080` → `#D3E0C0`，5.00–6.17 → 7.24–8.94:1）；门槛除两档静止 / 光带下限（2.3 / 4.1、4.5 / 7.0）外，还钉住「光带在 CIE L* 上比静止绿离侧栏更远」与「hover 叠加底上的光带不低于静止绿」两条方向不变量——第一版在浅色档刷的是白光（1.29–1.46:1），被用户退回「白光会让文字看不清楚」，6 档实测值见 §2n；
25. 运行中会话 spinner（`src/running-spinner.js`，常驻、与色彩模式无关）：同一批「行首有 `[data-state="ongoing"]` 且未选中」的行，行首那圈 `StateDot` 从 DSH 的 `label-tertiary` 灰改成合法 `#RRGGBB` 的**文字绿 `green`**（与标题 / 目录名同色），只写 `color`，环宽 / 虚线 / 动画仍归 DSH；门槛除沿用该绿的实测下限（浅色 2.3、深色 4.5，实测 2.35–2.68 / 5.00–6.17）外，还钉住「不得比它替换掉的中性灰更弱」（静止与 hover 叠加底上各比一次，容差 0.02）——浅色档实测 2.35–2.68 对中性灰 2.33–2.65，是同对比度下的换色而非可读性取舍；选中行不参与（实色强调底 + 画布墨由 G17 负责），语义状态点也不参与，6 档实测值见 §2o；

报告项（不 exit 1，仅低于 1.5 视为映射损坏）：上游 Everforest 的 muted 色对比度有意偏低（Enchanted 亦如此），下表给出数值与 native DSH 参考值对照。

## 2. 硬门槛明细（6 档）

| 变体 | label-primary / bg-base | / bg-layer-1 | / bg-layer-2 | shiki fg / bg | 品牌前景 / 品牌底 | 结果 |
|---|---:|---:|---:|---:|---:|---|
| light-hard | 5.40 | 5.34 | 5.26 | 5.26 | 2.32 | ✅ |
| light-medium | 5.18 | 5.12 | 5.04 | 5.04 | 2.22 | ✅ |
| light-soft | 4.66 | 4.61 | 4.53 | 4.53 | 2.00 | ✅ |
| dark-hard | 8.15 | 7.11 | 6.20 | 9.39 | 6.88 | ✅ |
| dark-medium | 7.38 | 6.40 | 5.57 | 8.62 | 6.23 | ✅ |
| dark-soft | 6.65 | 5.75 | 4.99 | 7.83 | 5.62 | ✅ |

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

DSH 用 `--dsw-specific-bubble` 画用户消息气泡（`MessageItem.module.css`：`.bubble { background: var(--dsw-specific-bubble) }`），文字继承 `label-primary`。旧映射取 `surface(p, 1)`，light 下得到 `#FDFAEE` 对画布 `#FFFBEF` 只有 1.02:1，与背景融为一体（2026-10-19 走查）。2026-11-08 气泡配色评审（六方案 demo，用户选 light「苔纸」/ dark「只换字色」）后，light 改为 palette `bg_green` 向 `bg5` 22% 的**苔纸**，并按 `label-primary` 4.5:1 守卫：hard 保持 `#e7ead0`（4.54:1）、medium 微提亮到 `#e7e9cd`（4.50:1）；light·soft 的画布已无正文余量，走「抬起」方向——白 → 同一苔纸 40% 的淡苔纸（`#f1f2e5`，文字 4.94:1，对画布 1.06:1，阈值仍为 1.05，由苔绿 vs 暖奶油的色相差异承担）。气泡字色另由常驻样式表改成派生墨（`src/chat-bubble.js`，见 §6.8），token 回落的 `label-primary` 仍满足 AA。2026-11-10 用户要求气泡直接沿用侧栏选中行的绿底，先深色、随后浅色（原话：深色「试试直接改成侧边栏选中那种绿色和文字颜色」/ 浅色「浅色气泡的也和侧边栏颜色保持一致」）。该绿底不进 token 层（浅色奶油墨回落在 `#93B259` 上只有约 2.0:1，深色淡鼠尾草回落在 `#A7C080` 上也只有约 2.0:1），而由同一张常驻样式表绘制 `statusline1` 底 + 画布墨 `bg0`（深色 6.88 / 6.23 / 5.62:1；浅色 2.32 / 2.22 / 2.00:1，见 §2i / §6.8）。2026-11-10 曾把浅色字改成派生深墨 `#2F3B33`（4.88:1）又按用户要求换回奶油白（「文字还是换回白色吧」）；2026-11-15：DSH 的问答回复卡（`QuestionReplyView`）在同一个 `UserMessageBubble` 图元外面套自己的 `row` / `bubbleWidth`，并不在 `_userStack` 里，因此原来的锚点漏掉了它，卡片仍显示 token 的苔纸底——用户走查「回答问题过后的聊天气泡，颜色为什么是这样」。常驻样式表改为三条锚点（用户消息行 / 问答复卡 / `/goal` 命令回显）各带一次作用域，并把卡内问题行的 `label-secondary` 一并重新上色（见 §35、§6.8）；2026-11-15 同日第二次走查又补了一处：锚点排除复卡的 `_bubbleWidth` 包装盒（否则绿底画在方角外盒上、20px 圆角消失）；复卡的问题行先试深色底带（`rgba(0,0,0,.1)`），再改「纸条」，随后用户判「不好看」、要求回到单块表面，于是纸条与底带一起撤掉，问题行改用「向气泡底移动 6 L* 的问题墨」（浅色 1.70–1.99:1、深色 4.52–5.59:1，见 §2m）；token 仍保留苔纸 / 被守卫的 `bg1` 作为样式表失效时的可读回落；下表继续测 token 值。本门槛确保它不会退回画布：

| 变体 | bubble | bg-base | 边界对比度 | 阈值 | 结果 |
|---|---|---|---:|---:|---|
| light-hard | `#e7ead0` | `#FFFBEF` | 1.19 | 1.1 | ✅ |
| light-medium | `#e7e9cd` | `#FDF6E3` | 1.15 | 1.1 | ✅ |
| light-soft | `#f1f2e5` | `#F3EAD3` | 1.06 | 1.05 | ✅ |
| dark-hard | `#2E383C` | `#272E33` | 1.15 | 1.1 | ✅ |
| dark-medium | `#343F44` | `#2D353B` | 1.15 | 1.1 | ✅ |
| dark-soft | `#3A464C` | `#333C43` | 1.16 | 1.1 | ✅ |

对照：native light 气泡 `static-deepseek-50 #edf3fe` on `#fff` ≈ 1.08；本实现 light·hard / medium 为 1.19 / 1.15，light·soft 为 1.06（低于 native 的明度差，由苔绿 vs 暖奶油的色相差异承担，阈值相应降到 1.05），dark 1.15–1.16。气泡文本对比度见 §3 的 `--dsw-specific-bubble` 行。

## 2e. FileDiff 行底文本（硬门槛）

DSH `FileDiff` 用 `--dsw-alias-file-diff-added/deleted-bg` 画行底、代码文字继承 `label-primary`，所以两者同属文本承载表面。默认门槛 4.5:1；**light·soft 例外**：该档代码画布本身已卡在 4.5:1，4.5:1 的行底与画布几乎同色（用户走查「浅色档绿色背景看不出」），因此允许行底文字降到 4.1:1 换取可辨识的绿 / 红条（2026-10-21 用户确认取舍，见 §6.3）。

| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---:|---:|---:|---:|---:|---:|
| `--dsw-alias-file-diff-added-bg` | 4.57 ✅ | 4.56 ✅ | 4.17 ✅ | 6.55 ✅ | 5.89 ✅ | 5.23 ✅ |
| `--dsw-alias-file-diff-deleted-bg` | 4.61 ✅ | 4.54 ✅ | 4.11 ✅ | 6.99 ✅ | 6.34 ✅ | 5.74 ✅ |

light·hard / medium / soft 的 added 行底对代码画布明度差约 1.15 / 1.10 / 1.09，deleted 1.14 / 1.11 / 1.10：浅色档现在能看出绿 / 红条；dark 行底向画布收 40% 后文字 ≥5.23:1。

## 2f. 色彩模式（中彩）角色色值（硬门槛 G9–G16）

`src/color-mode.js` 在 token 层之上派生一套「中彩」内容角色色，自 2026-10-24 起作为默认功能始终生效（设置页开关已移除）。映射参考 Obsidian **Everforest Enchanted** 的 markdown 配色，按 DSH 渲染器实际存在的元素落地：标题 h1–h6 依次 red → orange → yellow → green → blue → purple；strong / em 紫；行内 code 蓝（落在 DSH 的蓝底 chip 上）；内部文件链接 aqua（外链继续用官方 link token）；删除线与已完成任务淡化；引用块绿色淡底（与引用条同色系）；表格表头绿色带 / 斑马纹 / 行 hover；复选框绿（2026-11-15 起深浅档一致，此前为浅色 aqua / 深色蓝）；列表 marker / 引用条 / 分隔线统一取主题绿（2026-11-15 由 aqua 改，见 §43）；表格列宽提示线取 `headerAqua`（§18 的 2px 装饰线，不参与 G9–G16 文本门槛，由 `tests/color-mode.test.mjs` 钉住对表头色带 ≥ 2.5:1）；会话行保持 0.4.0 的整行实色底，2026-10-24 重制版把行底换成 Everforest palette1 的 `bg_yellow`（待确认 / 待审批；用户反馈红色像报错，当日后续由 `bg_red` 改黄）与 `bg_blue`（已完成；2026-11-08 由 `bg_green` 改回蓝色，绿色让给当前会话行，见 §2g；light·soft 的奶油侧栏没有明度余量，2026-11-15 起改取 `fg.blue` 混入白锚的淡染，同日再按要求加深一档到 `#d4e7f2` / hover `#cee4f1`（4.39 / 4.25:1，该档自己的 4.2 下限，见 §35）），浅色档的黄色再向 `fg.yellow` 加深到 3.5 L* 或 4.5:1 门槛为止（light·soft 的黄色和奶油侧栏同色系、没有色相可用，2026-11-15 起改为沿 `bg_yellow` → `fg.yellow` 加深到该档自己的 4.2 / 4.1 下限，落点 `#f0dfb5` / hover `#efdcad`，见 §37）；深色档因为 palette 的 `bg_yellow` 在浅色墨水下只能读作橄榄灰，改为「亮琥珀底 + 深色对比墨」（`--dsw-alias-label-primary-inverted`，标题 / 尾标 / 状态点一起继承，2026-10-24 第二轮反馈「深色档再亮/更黄一点」）。hover 向对应 `fg` 强调色混 16% 后重新守卫；完成行状态点随之改为蓝色（`fg.blue` 守卫到 3:1）。全部由当前变体的 `bg-base` / `sidebar-fill` / `label-primary` / `label-tertiary` / 行内 code chip / 代码块表面和 `fg` 强调色算出：大号标题（h1–h4）与装饰朝 ink 混合到对 `bg-base` 3:1；强调文字对每个可能落到的 markdown 表面 3:1（见门槛 16）；彩色表面把强调色混入底色、权重由 `label-primary` 4.5:1 反推；状态点同时满足 `bg-base` 与 `sidebar-fill` 3:1。元素规则一律以 `html[data-everforest-color-mode="on"]` 开头——该属性恒为 `on`，只作作用域锚点；token 层零差异（与基线一致）。

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
| inline-code 文字 | `#3A94C5` | `#3c91c0` | `#3A94C5` | `#7FBBB3` | `#7FBBB3` | `#7FBBB3` |
| 内部文件链接 | `#579478` | `#589077` | `#588f77` | `#569D79` | `#5b9f7b` | `#6ea582` |
| faint（删除线/已完成任务） | `#909b92` | `#909b92` | `#909b92` | `#959887` | `#959887` | `#959887` |
| marker | `#889b0d` | `#849715` | `#7d8f25` | `#A7C080` | `#A7C080` | `#A7C080` |
| quote | `#889b0d` | `#849715` | `#7d8f25` | `#A7C080` | `#A7C080` | `#A7C080` |
| hr | `#889b0d` | `#849715` | `#7d8f25` | `#A7C080` | `#A7C080` | `#A7C080` |
| 列宽提示线（table-handle） | `#569D79` | `#569D79` | `#569D79` | `#569D79` | `#569D79` | `#569D79` |
| check | `#7e9024` | `#7b8d2a` | `#7a8c2c` | `#A7C080` | `#A7C080` | `#A7C080` |
| band | `#efeece` | `#edeac3` | `#efe7cb` | `#39423e` | `#3e4845` | `#434e4c` |
| zebra | `#f8f6e1` | `#f6f1d5` | `#efe7cb` | `#2f3738` | `#343d3f` | `#3a4447` |
| table-hover | `#f4f2d7` | `#f2eecc` | `#efe7cb` | `#343d3b` | `#394342` | `#3f4949` |
| quote-bg | `#f6f4dc` | `#f4efd1` | `#efe7cb` | `#313a39` | `#374041` | `#3c4748` |
| row-warn | `#fbeac0` | `#f8e6bb` | `#f0dfb5` | `#b19a6b` | `#b39c6d` | `#b49d6f` |
| row-warn-hover | `#f9e6b5` | `#f8e6b9` | `#efdcad` | `#b89f6e` | `#b9a170` | `#baa272` |
| row-done | `#dcece9` | `#ddeae6` | `#d4e7f2` | `#384B55` | `#3A515D` | `#3f5764` |
| row-done-hover | `#dceae8` | `#e0e9e2` | `#cee4f1` | `#40575e` | `#3f575f` | `#415760` |
| dot-warn | `#d07838` | `#c7773d` | `#b67545` | `#E69875` | `#E69875` | `#E69875` |
| dot-done | `#3A94C5` | `#3b93c3` | `#408cb6` | `#7FBBB3` | `#7FBBB3` | `#7FBBB3` |

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
| inline-code / inline-code 底色 | 3 | 3.03 ✅ | 3.02 ✅ | 3.09 ✅ | 7.02 ✅ | 6.42 ✅ | 5.82 ✅ | ✅ |
| marker / bg-base | 3 | 3.01 ✅ | 3.03 ✅ | 3.01 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| quote / bg-base | 3 | 3.01 ✅ | 3.03 ✅ | 3.01 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| hr / bg-base | 3 | 3.01 ✅ | 3.03 ✅ | 3.01 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| check / bg-base | 3 | 3.44 ✅ | 3.42 ✅ | 3.12 ✅ | 6.88 ✅ | 6.23 ✅ | 5.62 ✅ | ✅ |
| band / label-primary | 4.5 | 4.73 ✅ | 4.56 ✅ | 4.51 ✅ | 6.14 ✅ | 5.60 ✅ | 5.11 ✅ | ✅ |
| zebra / label-primary | 4.5 | 5.12 ✅ | 4.91 ✅ | 4.51 ✅ | 7.21 ✅ | 6.59 ✅ | 5.92 ✅ | ✅ |
| table-hover / label-primary | 4.5 | 4.93 ✅ | 4.76 ✅ | 4.51 ✅ | 6.62 ✅ | 6.05 ✅ | 5.50 ✅ | ✅ |
| quote-bg / label-primary | 4.5 | 5.03 ✅ | 4.82 ✅ | 4.51 ✅ | 6.92 ✅ | 6.30 ✅ | 5.68 ✅ | ✅ |
| row-warn / 行文字色（light label-primary，dark inverted；light·soft 4.1） | 4.5 / 4.1 | 4.69 ✅ | 4.53 ✅ | 4.24 ✅ | 5.82 ✅ | 5.47 ✅ | 5.04 ✅ | ✅ |
| row-warn-hover / 行文字色（light label-primary，dark inverted；light·soft 4.1） | 4.5 / 4.1 | 4.53 ✅ | 4.52 ✅ | 4.13 ✅ | 6.21 ✅ | 5.82 ✅ | 5.36 ✅ | ✅ |
| row-done / label-primary（light·soft 4.2） | 4.5 / 4.2 | 4.58 ✅ | 4.52 ✅ | 4.39 ✅ | 5.39 ✅ | 4.94 ✅ | 4.51 ✅ | ✅ |
| row-done-hover / label-primary（light·soft 4.2） | 4.5 / 4.2 | 4.52 ✅ | 4.50 ✅ | 4.25 ✅ | 4.53 ✅ | 4.54 ✅ | 4.51 ✅ | ✅ |
| dot-warn / bg-base | 3 | 3.16 ✅ | 3.17 ✅ | 3.12 ✅ | 5.98 ✅ | 5.41 ✅ | 4.88 ✅ | ✅ |
| dot-warn / sidebar-fill | 3 | 3.01 ✅ | 3.02 ✅ | 3.02 ✅ | 5.36 ✅ | 4.83 ✅ | 4.34 ✅ | ✅ |
| dot-done / bg-base | 3 | 3.26 ✅ | 3.17 ✅ | 3.10 ✅ | 6.34 ✅ | 5.74 ✅ | 5.17 ✅ | ✅ |
| dot-done / sidebar-fill | 3 | 3.11 ✅ | 3.01 ✅ | 3.00 ✅ | 5.68 ✅ | 5.12 ✅ | 4.60 ✅ | ✅ |

G15：以上 6 档 × 26 个角色色值全部是合法 `#RRGGBB`。取值公式与期望值来自 2026-10-23 的中彩样张（`.tmp/color-mode-preview`，不入库）、Enchanted 的 markdown 角色映射与 2026-10-24 的状态行重制（行底取 palette1 的 `bg_yellow` / `bg_blue`，浅色档黄色按可见性下限加深，hover 重新守卫；light·soft 的完成行 2026-11-15 起改取 `fg.blue` 的淡染，见 §34），由 `tests/color-mode.test.mjs` 逐值锁定、本报告逐档把关；色彩模式自 2026-10-24 起默认提供、没有设置开关（0.4.x 的开关已随设置页区块移除）；`html` 上的 `data-everforest-color-mode` 恒为 `on`，仅作作用域锚点，只改 `data-everforest-*` 属性、不写任何 token。faint 直接取该档 `label-tertiary`，是刻意的弱化色（删除线 / 已完成任务），不参与门槛。

## 2g. 工作区当前会话行（active-session，硬门槛 G17）

DSH 把「当前打开的会话」和 hover 画成同一条规则（`ui-workspace` 的 `Rows` 模块：`.wnFoaW_sessionRow:hover,.wnFoaW_sessionRow.wnFoaW_selected{background:var(--dsw-alias-interactive-bg-hover)}`），而该 token 是半透明叠层（旧版 `bg5` 16%，2026-11-08 A7 起改为 `bg4` 50%）—— 在 Everforest 的压缩 ramp 里对侧栏只有约 2.6 L*，深 / 浅两档都很难找到当前会话（2026-10-24 用户反馈）。上游没有独立的「选中行」token，`src/active-session.js` 因此用一行常驻规则（`[role="treeitem"][data-row-key^="session:"][aria-selected="true"]`）把选中行画成交互强调色 `statusline1` 的**实色**底、文字取方案画布 `bg0`（2026-11-08：按用户要求「不要左边框、不要透明度」；同日第三轮用户贴出上游活动 tab 的浅色裁图（底色正是 `statusline1` `#93B259`）并要求「绿色应该是浅绿色」，于是选中行与发送按钮统一改用 `statusline1`（下拉选中项同样取它作背景）；目录名称取文字绿 `green`（§2h）：选中块深色 `#A7C080`、浅色 `#93B259`。行内自己的 tertiary 灰（状态槽、时间、pin、hover 操作按钮）在实色绿底上只剩 1.2–1.6:1，因此规则把这些子元素**显式**写成画布墨色；其中时间嵌在 `rowResting` 单元格内、pin / 操作按钮在 `rowActions` 内，父级自带 `label-tertiary`，`color: inherit` 会被那一层截断。2026-11-08 的第一次实现还有一个选择器拼接 bug：每条选择器都被重复拼了作用域前缀（`row row [class*="time"]`），实际只有 `> span` 生效，所以时间 / pin / 图标仍不可见（用户反馈「还是看不清楚」）—— 现已改为单一前缀 + 显式墨色，并由 `tests/active-session.test.mjs` 断言「每条选择器只出现一次行锚点」。状态点保留语义色（它是独立图形，不是绿底上的文字）；例外是运行中的加载 spinner —— `StateDot(state="ongoing")` 是 `<svg data-state="ongoing">` 的中性灰环（`label-tertiary`，对绿底仅 1.22–1.39:1），2026-11-08 第四轮用户反馈「整块高亮的时候，前面这个转圈的图标显示不明显」，墨色选择器因此追加 `[data-state="ongoing"]`、与文字同取画布墨色；`done` / `warning` / `error` 状态点不受影响。色彩模式自 2026-11-08 起把「已完成未读」行改回蓝色（§2f，`bg_blue`），绿色专属于「当前会话」；其中浅色 soft 档 2026-11-15 起改取 `fg.blue` 混入白锚的淡染，并在同日按要求加深一档（`bg_blue` 在奶油侧栏上会被正文门槛压成近白，见 §34 / §35）；该样式常驻、与色彩模式无关（导航可见性，不是内容着色；色彩模式自 2026-10-24 起也没有开关）。

深色三档的「绿底 + 画布墨」是 WCAG AA 配对（5.62–6.88:1）；浅色三档是上游参考 tab 的同一配对：浅色调色板里最亮的墨色是画布 `bg0`，与 `statusline1` 只有 2.00–2.32:1，因此 G17 只在深色档要求 ≥ 4.5:1，浅色档保留已记录的 1.95 下限（design §15 / §23）。

| 变体 | active fill（statusline1） | ink（bg0） | sidebar-fill | L* 步长 | 墨色对比度 | 阈值 | 结果 |
|---|---|---|---|---:|---:|---:|---|
| light-hard | `#93B259` | `#FFFBEF` | `#f9f6e6` | 28.14 | 2.32 | 1.95 | ✅ |
| light-medium | `#93B259` | `#FDF6E3` | `#f6f1db` | 26.42 | 2.22 | 1.95 | ✅ |
| light-soft | `#93B259` | `#F3EAD3` | `#eee7ce` | 23.01 | 2.00 | 1.95 | ✅ |
| dark-hard | `#A7C080` | `#272E33` | `#2d363a` | 52.54 | 6.88 | 4.5 | ✅ |
| dark-medium | `#A7C080` | `#2D353B` | `#333d42` | 49.43 | 6.23 | 4.5 | ✅ |
| dark-soft | `#A7C080` | `#333C43` | `#39444a` | 46.38 | 5.62 | 4.5 | ✅ |

## 2h. 工作区目录名称（workspace-labels，硬门槛 G18）

DSH 把工作区（项目）行的标题画成 `label-primary`（`ui-workspace` 的 `.projectRow { color: var(--dsw-alias-label-primary) }`，只有活动目录的图标拿到 business 强调色）。2026-11-08 用户要求「工作区的每个目录名称也用绿色显示」，`src/workspace-labels.js` 因此用一条常驻规则把 `[data-row-key^="workspace:"] [class*="projectText"]` 画成该档 **文字绿 `green`**；同日第三轮用户曾指出「浅色模式的绿色不对…绿色应该是浅绿色」，当时把文字绿换成了背景绿 `statusline1` `#93B259`；同日复核（用户对照上游配色）确认 Everforest 的文字绿与选中块绿本是两种：文字取 `green`（浅色 `#8DA101`，更深）、选中块背景取 `statusline1`（浅色 `#93B259`）；深色档两者同为 `#A7C080`，故只有浅色档变化。上游符合性评估（A7）曾把目录名撤回 `label-primary`，复核时用户再次要求绿色，于是恢复并**不做对比度守卫**：浅色档侧栏 2.35–2.68:1、hover 叠加底最弱 2.13:1；深色档静止行 5.00–6.17:1，但 A7 把 hover 叠加层从 `bg5` 16% 换成 `bg4` 50%，hover 行降到 4.01–4.98:1。2026-11-13 用户追加两项：「帮我把文字加粗吧，如果是选中的打开了工作区下的对话，那么这个工作区的图标也变成全绿色」——目录名规则加 `font-weight: 600`（14px/20px 标题，行高与 34px 行不变），并为 DSH 标记的 `[class*="folderActive"]` 增加一条规则：该图标改用同一文字绿（DSH 原生 `.folderActive` 取 business 强调色，浅色档是更浅的 `statusline1` `#93B259`；深色档两者同为 `#A7C080`，无可见变化），让「加粗名称 + 文件夹图标」合成同一种绿。图标是装饰性标记（信息由文字承担），不单独设对比度门槛，沿用下面的文字实测值。G18 因此按 scheme + 表面分阈值：深色静止行 ≥4.5:1（AA；静止行掉到 4.5 以下不是 hover 的已记录取舍）、深色 hover 行 ≥4.0:1；浅色静止行 ≥2.3、hover 行固定 2.1 的已记录下限（调色板文字绿的实测下限，hover 叠加底最弱）。

| 变体 | 目录名称颜色 | 侧栏底 | 侧栏对比度 | hover 叠加底 | hover 对比度 | 阈值（侧栏 / hover） | 结果 |
|---|---|---|---:|---|---:|---:|---|
| light-hard | `#8DA101` | `#f9f6e6` | 2.68 | `#f0eddd` | 2.47 | 2.3 / 2.1 | ✅ |
| light-medium | `#8DA101` | `#f6f1db` | 2.56 | `#ebe6d1` | 2.32 | 2.3 / 2.1 | ✅ |
| light-soft | `#8DA101` | `#eee7ce` | 2.35 | `#e3ddc4` | 2.13 | 2.3 / 2.1 | ✅ |
| dark-hard | `#A7C080` | `#2d363a` | 6.17 | `#3b4448` | 4.98 | 4.5 / 4 | ✅ |
| dark-medium | `#A7C080` | `#333d42` | 5.56 | `#414b50` | 4.47 | 4.5 / 4 | ✅ |
| dark-soft | `#A7C080` | `#39444a` | 5.00 | `#475258` | 4.01 | 4.5 / 4 | ✅ |

## 2i. 下拉选中项（ui-accents，硬门槛 G19）

2026-11-08 用户要求「模型选择、推理强度、权限等下拉选项打开后，选中的内容文字和勾勾也改为绿色」。被命中的表面 DSH 原生是 `label-primary`：下拉选中项是 `[role="menu"]` 里的 `menuitem`（Menu 的 check 选择模式）或 `menuitemradio[aria-checked="true"]`（模型 / 推理强度列表），勾勾是它们的 `check` 子元素。`src/ui-accents.js` 用 ARIA 角色 / `aria-checked` 选中这个表面，并按上游「`statusline1` = Menu Selection Background」的语义（A7）改成 `statusline1`（浅色 `#93B259`）**实底** + 方案画布 `bg0` 文字与勾勾。同日后续反馈「第一个图中 icon 颜色不对，第二个图中文字的颜色不对」：选中项内的前导图标（`_itemIcon_`，取 `--dsw-alias-menu-icon`）、模式选项的标题与说明（`_itemName_` / `_itemDesc_`，取 `label-primary` / `label-caption`）、工作区路径后缀（`pathSuffix`，取 `label-secondary`）各自写死颜色 token、不吃父级 `color`，因此在实色绿底上仍留在中性灰；规则改为把这些 token 在选中项子树内一并指向画布墨色（`MENU_INK_TOKENS`），对比度数值不变（同一墨色），只是原先漏掉的部件也落到同一配对。会话标题（`crumbCurrent`，`ui-conversation` 头部）2026-11-08 曾同样取文字绿 `green`（A7 撤回、复核加回）；2026-11-09 用户要求「标题不需要绿色显示了」，该规则已删除，标题回到 DSH 原生 `label-primary`（即本主题的 `fg`）——G19 因此只剩选中项一张表（见 design.md §27）。

下拉选中项：`statusline1` 实底 + 方案画布 `bg0` 墨色（勾勾、前导图标与选项内的次要文字同墨），并检查实底带相对菜单卡不会被压平。

| 变体 | 选中底（statusline1） | 墨色（bg0） | 菜单卡表面 | 墨色对比度 | L* 步长 | 墨色阈值 | 结果 |
|---|---|---|---|---:|---:|---:|---|
| light-hard | `#93B259` | `#FFFBEF` | `#fcf8eb` | 2.32 | 28.98 | 1.95 | ✅ |
| light-medium | `#93B259` | `#FDF6E3` | `#faf3df` | 2.22 | 27.31 | 1.95 | ✅ |
| light-soft | `#93B259` | `#F3EAD3` | `#f0e7d0` | 2.00 | 23.21 | 1.95 | ✅ |
| dark-hard | `#A7C080` | `#272E33` | `#364044` | 6.88 | 48.13 | 4.5 | ✅ |
| dark-medium | `#A7C080` | `#2D353B` | `#3c474c` | 6.23 | 45.11 | 4.5 | ✅ |
| dark-soft | `#A7C080` | `#333C43` | `#424e54` | 5.62 | 42.13 | 4.5 | ✅ |

墨色在 `statusline1` 上：深色档是 WCAG AA（取画布 `bg0`，5.62–6.88:1），浅色档同取画布 `bg0`（2.00–2.32:1，门槛 1.95 —— 与选中行 / 气泡 / 发送键同一配对）。G19 因此两档都按 4.5 阈值，并对菜单卡要求 ≥ 0.02 的 L* 步长（实色绿带不会消失在菜单材质里）。会话标题不再参与本门槛：它已回到 DSH 的 `label-primary`，对比度由门槛 1 的 `label-primary` 规则覆盖。

## 2j. 插件更新弹窗（plugin-update，硬门槛 G20）

2026-11-08 用户反馈「更新 dsh-ops」弹窗：步骤文字是蓝色而不是绿色，打勾图标颜色太淡。DSH 把步骤行渲染成 `[data-plugin-update] [data-state]`（每行一个 20px 圆点 + 文字），完成态圆点只有 12% 成功绿淡底，步骤文字也不跟随成功色；`src/plugin-update.js` 因此把完成步骤的文字改成交互强调色 `statusline1`、失败步骤改成语义红，并把完成圆点与结果大图标改成「`statusline1` 实底 + 画布 `bg0` 墨色」——勾选从淡色细线变成高对比徽标。同日追加反馈：浅色模式要用 `#93B259`（与弹窗「完成」按钮同色），因此浅色档从语义绿 `#8DA101` 换成 `statusline1`；深色档两值同为 `#A7C080`，观感不变。深色档 `statusline1` 在步骤面板（`bg-module-platform`）上 4.22–5.24:1、实底徽标 5.62–6.88:1；浅色档徽标 2.00–2.32:1（画布 `bg0`，门槛 1.95），绿色步骤文字是 1.95–2.26:1（`#93B259` 绿字压奶油面板），G20 因此按角色分阈值。失败步骤的语义红不设门槛（与其余语义色同一政策，仅报告）：实测 2.66–3.82:1。

| 变体 | 完成文字绿 | 失败文字红 | 失败文字对比度（仅报告） | 步骤面板 | 文字对比度 | 徽标墨色 | 徽标对比度 | 文字阈值 | 徽标阈值 | 结果 |
|---|---|---|---:|---|---:|---|---:|---:|---:|---|
| light-hard | `#93B259` | `#F85552` | 3.08 | `#fcf8eb` | 2.26 | `#FFFBEF` | 2.32 | 1.9 | 1.95 | ✅ |
| light-medium | `#93B259` | `#F85552` | 2.96 | `#faf3df` | 2.17 | `#FDF6E3` | 2.22 | 1.9 | 1.95 | ✅ |
| light-soft | `#93B259` | `#F85552` | 2.66 | `#f0e7d0` | 1.95 | `#F3EAD3` | 2.00 | 1.9 | 1.95 | ✅ |
| dark-hard | `#A7C080` | `#E67E80` | 3.82 | `#374145` | 5.24 | `#272E33` | 6.88 | 4 | 4.5 | ✅ |
| dark-medium | `#A7C080` | `#E67E80` | 3.43 | `#3D484D` | 4.70 | `#2D353B` | 6.23 | 4 | 4.5 | ✅ |
| dark-soft | `#A7C080` | `#E67E80` | 3.08 | `#434F55` | 4.22 | `#333C43` | 5.62 | 4 | 4.5 | ✅ |

## 2k. 聊天气泡文字选区（chat-bubble，硬门槛 G21）

2026-11-13 用户报告「浅色状态下选中文字是浅灰色，在绿色气泡中白字和浅灰不容易区分」：全局 `src/selection.js` 用各档 `bg_visual` 画选区（浅色三档 `#DED8DB` / `#D9D4D6` / `#CFC9CC`、深色 `#4C3743` / `#543A48` / `#5C3F4F`），这套底色是为「深字压浅米」的画布设计的；气泡是反过来的「浅字压中绿」，同一底色配原来的字色就失效了——浅色奶油字在浅色选区带上只有 1.36–1.38:1，深色气泡字在深梅色选区上只有 1.22–1.27:1。第一版给气泡单独换了一套选区底色；同日用户要求「保持勾选颜色各处都统一」，于是改为**只改选中文字颜色**（方案 C 的墨色），选区底色仍是全局 `bg_visual`：浅色选中文字 `#2F3B33`（深松墨，对浅色选区带 7.09–8.33:1）、深色选中文字 `#FFFBEF`（奶油，对深梅色选区 8.91–10.49:1）。规则是气泡作用域的 `::selection`，只覆盖 `color`；画布 / 代码块 / 侧栏仍由全局表的 `color: inherit` 保留各自原色。

| 变体 | 选区底色（全局 bg_visual） | 选中文字 | 气泡底 | 文字对比度 | 选区 vs 气泡底 | 文字阈值 | 结果 |
|---|---|---|---|---:|---:|---:|---|
| light-hard | `#DED8DB` | `#2F3B33` | `#93B259` | 8.33 | 1.71 | 4.5 | ✅ |
| light-medium | `#D9D4D6` | `#2F3B33` | `#93B259` | 7.99 | 1.64 | 4.5 | ✅ |
| light-soft | `#CFC9CC` | `#2F3B33` | `#93B259` | 7.18 | 1.47 | 4.5 | ✅ |
| dark-hard | `#4C3743` | `#FFFBEF` | `#A7C080` | 10.49 | 5.42 | 4.5 | ✅ |
| dark-medium | `#543A48` | `#FFFBEF` | `#A7C080` | 9.78 | 5.06 | 4.5 | ✅ |
| dark-soft | `#5C3F4F` | `#FFFBEF` | `#A7C080` | 8.91 | 4.61 | 4.5 | ✅ |

浅色档全局选区带对绿气泡只有 1.47–1.71:1（light·soft 最深、为下限）—— 这是「各处同色」的既有代价，用户明确选择保留；可读性由深松墨 7.09–8.33:1 承担（原来的奶油字只有 1.36–1.38:1）。深色档选区带对气泡 4.61–5.42:1，奶油字 8.91–10.49:1。G21 因此要求：选中文字 ≥4.5:1、选区带对气泡底 ≥1.45:1（浅色，带没有消失）/ ≥4.5:1（深色）。气泡之外的选区文字颜色不变（`color: inherit`）。

## 2l. 发送 / 终止按钮图标（composer on-color，硬门槛 G22）

2026-11-13 用户反馈「黑夜模式…发送和终止的按钮里面的图标变色了，帮我还是改成白色」；截图取色实测图标是 `#D3C6AA`（深色档的 `label-primary` / `fg`），对绿底 `#A7C080` 只有 1.18:1 —— 几乎看不见。成因在上游 token 契约：DSH 0.2.2-rc.2 把 composer 主按钮（发送箭头与终止方块共用同一圆钮）的图标色改成 `--dsw-alias-label-on-color`，`ui-conversation` 的 `InputBar.module.css` 注释写明「the arrow stays white on the blue fill in both themes」，上游声明值为 `var(--dsw-static-neutral-bluish-00)`。本层原先把这条归入「继承」，但 static 层的亮度锚定会把 `neutral-bluish-00`（白端）映射到各 scheme 的最亮墨：light 是画布 `bg0`、深色档是 `fg` `#D3C6AA`，于是图标跟着主题字色变成土黄。修法：`--dsw-alias-label-on-color` 改为显式 token，两种 scheme 都取 DSH 的字面白 `#FFFFFF`，并从 `INHERITED_TOKEN_NAMES` 移除（继承 19 → 18、显式 225 → 226）。它不进调色板、不随档位变化 —— 「饱和实底上的白墨」是 DSH 的语义常量（与遮罩色同样保留字面值），不是背景 / 前景色阶的一档。白字对强调绿只有 2.00–2.40:1，低于 3:1 的图形门槛，但这是 DSH 原生配对（native 白字压品牌蓝同样约 2:1，按钮靠实底色块与留白辨识），也是用户明确要求的颜色；G22 只钉「字面白 + ≥ 1.9」以防图标再次退回主题色。

| 变体 | 图标墨色 | 发送底（button-info-fill） | 对实底对比度 | hover 底 | 对 hover 对比度 | 阈值 | 结果 |
|---|---|---|---:|---|---:|---:|---|
| light-hard | `#FFFFFF` | `#93B259` | 2.40 | `#a6bf74` | 2.03 | 1.9 | ✅ |
| light-medium | `#FFFFFF` | `#93B259` | 2.40 | `#a6be72` | 2.05 | 1.9 | ✅ |
| light-soft | `#FFFFFF` | `#93B259` | 2.40 | `#a4bc6f` | 2.10 | 1.9 | ✅ |
| dark-hard | `#FFFFFF` | `#A7C080` | 2.00 | `#afc188` | 1.94 | 1.9 | ✅ |
| dark-medium | `#FFFFFF` | `#A7C080` | 2.00 | `#afc188` | 1.94 | 1.9 | ✅ |
| dark-soft | `#FFFFFF` | `#A7C080` | 2.00 | `#afc188` | 1.94 | 1.9 | ✅ |

light 实底 2.40 / hover 2.03–2.10；dark 实底 2.00 / hover 1.94（hover 把强调色向亮端提 18%，两种 scheme 都略降）。图标在输入为空 / 发送中时还会叠加 DSH 自己的 `opacity: 0.4`（禁用态），那是上游行为，不在本门槛覆盖范围内。

## 2m. 问答回复卡的问题墨（chat-bubble question ink，硬门槛 G23）

DSH 的问答回复卡（`QuestionReplyView`）把一次 `ask_user_question` 的所有问答放在同一个用户气泡里：`dl > div×N`，每对 `dt`（问题）+ `dd`（回答）。2026-11-15 用户先是要求「给问题和回答分成两个颜色」，四轮之后落成「问题块压一块浅色纸条」；随后用户回看裁图判「不好看」，原话「不想要两个不同颜色的块来做显示，参考默认主题」，问题改用浅一点的文字弱化。所以纸条（浅色 `bg_green`、深色提亮橄榄 `#5D6E56`）连同它的几何一起撤掉，卡片回到一块强调色表面，层次改由墨色承担：气泡子树内的 `--dsw-alias-label-secondary` 重指向 `chatBubbleQuestionInk()` —— 气泡墨色向气泡底移动 6 L*（浅色变深、深色变亮，方向永远是「更软」），回答行保持气泡墨色，与 DSH 原生卡片（`dt` = `label-secondary`、`dd` = 气泡墨色）同一套层次。为什么不按对比度定档：浅色三档在 `statusline1` 上只有 2.00–2.32:1 这点余量，按比例压会直接糊进绿底，按亮度差才既看得见又不抢回答。

| 变体 | 问题墨色 | 回答墨色 | 气泡底（statusline1） | 问题 / 气泡底 | 回答 / 气泡底 | L* 差 | 阈值（L* / 对比度） | 结果 |
|---|---|---|---|---:|---:|---:|---:|---|
| light-hard | `#e9ecd1` | `#FFFBEF` | `#93B259` | 1.99 | 2.32 | 6.1 | 4–8 / 1.65 | ✅ |
| light-medium | `#e6e7c5` | `#FDF6E3` | `#93B259` | 1.90 | 2.22 | 6.2 | 4–8 / 1.65 | ✅ |
| light-soft | `#dbdcb5` | `#F3EAD3` | `#93B259` | 1.70 | 2.00 | 6.0 | 4–8 / 1.65 | ✅ |
| dark-hard | `#343d3b` | `#272E33` | `#A7C080` | 5.59 | 6.88 | 6.4 | 4–8 / 4.4 | ✅ |
| dark-medium | `#3a4443` | `#2D353B` | `#A7C080` | 5.03 | 6.23 | 6.3 | 4–8 / 4.4 | ✅ |
| dark-soft | `#404b4a` | `#333C43` | `#A7C080` | 4.52 | 5.62 | 6.2 | 4–8 / 4.4 | ✅ |

浅色三档 1.99 / 1.90 / 1.70:1、深色三档 5.59 / 5.03 / 4.52:1；六档的亮度差都是 6.0–6.4 L*（取色按 1% 步进走，落在 6 以上的第一格）。浅色档这一组整体偏低是这套调色板的已记录上限（原文 2.00–2.32:1，§2i / §6.8）：问题只是比回答再软一档，light·soft 的 1.70 是本轮最紧的一对，也在门槛之内 —— 这是用户明确要的「浅一点的文字」，不是漏检。深色档仍全部满足 AA（≥ 4.52），所以深色一侧既分得出层次、又不牺牲可读性。

## 2n. 运行中会话标题（running-title，硬门槛 G24）

DSH 的侧栏会话行在「运行中」时行首渲染 `StateDot(state="ongoing")`（`<svg data-state="ongoing">` 的灰色转圈），标题本身只是 `label-primary`。2026-11-15 用户要求「给正在进行中的对话的左侧工作区里面的对话标题增加一下样式，文字颜色改为主题绿，并且带有光影动画」，先出 A–F 六档对比 demo（常亮 / 单道扫光 / 宽光呼吸 / 明暗呼吸 / 双道流光 / 反方向），用户选了 B 并补一句「浅色模式的需要调整一下，白光会让文字看不清楚」。最终规则：标题取与目录名相同的文字绿 `green`，叠一条 260% 宽的绿色渐变、用 `background-clip: text` 裁进字形，光带在一轮 2.4s 里用 45%（约 1.08s）从左扫到右、其余时间停在视野外；选中行不参与（它已是 `statusline1` 实底 + 画布墨，绿字压上去看不见）。

| 变体 | 静止绿 | 光带 | 侧栏底 | 静止 / 侧栏 | 光带 / 侧栏 | 光带 / hover | 阈值（静止 / 光带） | 结果 |
|---|---|---|---:|---:|---:|---:|---:|---|
| light-hard | `#8DA101` | `#667401` | `#f9f6e6` | 2.68 | 4.76 | 4.40 | 2.3 / 4.1 | ✅ |
| light-medium | `#8DA101` | `#667401` | `#f6f1db` | 2.56 | 4.56 | 4.13 | 2.3 / 4.1 | ✅ |
| light-soft | `#8DA101` | `#667401` | `#eee7ce` | 2.35 | 4.17 | 3.79 | 2.3 / 4.1 | ✅ |
| dark-hard | `#A7C080` | `#d3e0c0` | `#2d363a` | 6.17 | 8.94 | 7.21 | 4.5 / 7 | ✅ |
| dark-medium | `#A7C080` | `#d3e0c0` | `#333d42` | 5.56 | 8.05 | 6.47 | 4.5 / 7 | ✅ |
| dark-soft | `#A7C080` | `#d3e0c0` | `#39444a` | 5.00 | 7.24 | 5.81 | 4.5 / 7 | ✅ |

光带方向是这道门槛的重点：浅色档把绿压深（影带）、深色档把绿提亮（亮带），两个方向都让局部**比静止时更清楚**；第一版浅色档刷的是白光（绿提亮到近白，峰值 1.29–1.46:1），字被打掉，用户原话「白光会让文字看不清楚」。hover 叠加底上光带仍不低于静止绿本身，所以行被悬停时也不会掉档；`text-shadow` 辉光方案被排除——会话标题是 20px 高、`overflow: hidden` 的裁切盒，阴影上下会被切掉一截，光影因此做在字形内部（`background-clip: text`）。

## 2o. 运行中会话 spinner（running-spinner，硬门槛 G25）

同一批「运行中、未选中」的会话行，行首那圈环是 ui-primitives 的 `StateDot(state="ongoing")`（`<svg data-state="ongoing">`，两个 `circle` 都用 `stroke: currentColor`，轨道 `opacity: .25`、圆弧是走动的虚线），DSH 在 `<svg>` 上只写了一句 `color: var(--dsw-alias-label-tertiary)`。2026-11-18 用户裁图要求「没有选中，正在进行的对话，前面的转圈的 icon，帮我改成主题绿色试试，dark 和 light 都改」——标题已是文字绿 + 扫光（§2n），行首这圈灰是整行最后一块中性色。

实现只写 `color`：环色取与标题相同的**文字绿 `green`**（环宽 / 虚线 / 1.5s 动画仍归 DSH，样式表不碰 stroke 与几何）。为什么不是更亮的 `statusline1`：那是选中 / 强调**表面**的角色（§2g / §23），浅色档 `#93B259` 在奶油侧栏上只有 1.94–2.21:1，比文字绿更弱；文字绿则与标题、目录名同色，一行读起来是一支绿。选中行不参与（实色强调底上的整槽已由 G17 改成画布墨），语义状态点（`warning` / `done` / `error`）也不参与。

| 变体 | 环色 | 替换前中性灰 | 侧栏底 | 环 / 侧栏 | 中性灰 / 侧栏 | hover 上环 / 中性灰 | 阈值 | 结果 |
|---|---|---|---:|---:|---:|---:|---:|---|
| light-hard | `#8DA101` | `#909b92` | `#f9f6e6` | 2.68 | 2.65 | 2.47 / 2.45 | 2.3 | ✅ |
| light-medium | `#8DA101` | `#909b92` | `#f6f1db` | 2.56 | 2.54 | 2.32 / 2.30 | 2.3 | ✅ |
| light-soft | `#8DA101` | `#909b92` | `#eee7ce` | 2.35 | 2.33 | 2.13 / 2.11 | 2.3 | ✅ |
| dark-hard | `#A7C080` | `#959887` | `#2d363a` | 6.17 | 4.19 | 4.98 / 3.38 | 4.5 | ✅ |
| dark-medium | `#A7C080` | `#959887` | `#333d42` | 5.56 | 3.77 | 4.47 / 3.03 | 4.5 | ✅ |
| dark-soft | `#A7C080` | `#959887` | `#39444a` | 5.00 | 3.39 | 4.01 / 2.72 | 4.5 | ✅ |

关键是这道门槛不只卡「环要够清楚」，还卡「不能比它替换掉的中性灰更弱」：浅色三档新环 2.68 / 2.56 / 2.35:1，对旧灰 2.65 / 2.54 / 2.33:1 是**同对比度下的换色**（差 0.01–0.03，容差 0.02）；深色三档 6.17 / 5.56 / 5.00:1 比旧灰 4.19 / 3.77 / 3.39:1 明显更亮。所以这一步没有拿可读性换颜色 —— 浅色档仍然停在调色板上限（与目录名、运行中标题同一档，2.35–2.68 的已记录取舍），只是把「中性」换成了这支绿。hover 叠加底上的两组数值同时成立，行被悬停时也不会掉档。

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
| `--dsw-alias-markdown-inline-code` | 5.01 ✅ | 4.82 ✅ | 5.12 ✅ | 9.04 ✅ | 8.26 ✅ | 7.49 ✅ |
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
| `--dsw-specific-bubble` | 4.54 ✅ | 4.50 ✅ | 4.94 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-bubble-highlight` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-input-major` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-login-input` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
| `--dsw-specific-selector` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-tip` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-specific-sidebar-nav-item-active` | 5.26 ✅ | 5.04 ✅ | 4.53 ✅ | 6.20 ✅ | 5.57 ✅ | 4.99 ✅ |
| `--dsw-alias-onboarding-card-fill` | 5.30 ✅ | 5.09 ✅ | 4.58 ✅ | 6.58 ✅ | 5.91 ✅ | 5.30 ✅ |
| `--dsw-alias-onboarding-secondary-fill` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |

## 4. 语义色 / 次要文本报告（不 exit 1）

| 用途 | token | 背景 | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---|---|---:|---:|---:|---:|---:|---:|
| label-secondary | `--dsw-alias-label-secondary` | `--dsw-alias-bg-base` | 3.25 | 3.12 | 2.80 | 5.25 | 4.75 | 4.28 |
| label-secondary / layer-1 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-1` | 3.21 | 3.08 | 2.77 | 4.58 | 4.12 | 3.70 |
| label-secondary / layer-2 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-2` | 3.16 | 3.03 | 2.73 | 3.99 | 3.58 | 3.22 |
| label-secondary / layer-3 | `--dsw-alias-label-secondary` | `--dsw-alias-bg-layer-3` | 3.14 | 2.97 | 2.72 | 3.41 | 3.06 | 2.92 |
| label-tertiary | `--dsw-alias-label-tertiary` | `--dsw-alias-bg-base` | 2.78 | 2.67 | 2.40 | 4.67 | 4.23 | 3.81 |
| link | `--dsw-alias-link` | `--dsw-alias-bg-base` | 3.26 | 3.13 | 2.82 | 6.34 | 5.74 | 5.17 |
| state-success | `--dsw-alias-state-success-primary` | `--dsw-alias-bg-base` | 2.81 | 2.69 | 2.42 | 6.88 | 6.23 | 5.62 |
| state-warn | `--dsw-alias-state-warn-primary` | `--dsw-alias-bg-base` | 2.21 | 2.12 | 1.91 | 7.55 | 6.84 | 6.16 |
| state-error | `--dsw-alias-state-error-primary` | `--dsw-alias-bg-base` | 3.17 | 3.04 | 2.73 | 5.02 | 4.55 | 4.10 |
| state-business | `--dsw-alias-state-business-primary` | `--dsw-alias-bg-base` | 2.32 | 2.22 | 2.00 | 6.88 | 6.23 | 5.62 |
| state-warn-label | `--dsw-alias-state-warn-label` | `--dsw-alias-bg-base` | 3.02 | 2.90 | 2.61 | 7.77 | 7.04 | 6.34 |
| diff-added-marker | `--dsw-alias-file-diff-added-marker` | `--dsw-alias-file-diff-added-bg` | 2.38 | 2.37 | 2.17 | 5.53 | 4.97 | 4.41 |
| diff-deleted-marker | `--dsw-alias-file-diff-deleted-marker` | `--dsw-alias-file-diff-deleted-bg` | 2.70 | 2.66 | 2.41 | 4.31 | 3.91 | 3.54 |
| diff-added-number | `--dsw-alias-file-diff-added-marker` | `--dsw-alias-file-diff-added-gutter` | 2.53 | 2.48 | 2.26 | 6.30 | 5.69 | 5.11 |
| diff-deleted-number | `--dsw-alias-file-diff-deleted-marker` | `--dsw-alias-file-diff-deleted-gutter` | 2.85 | 2.79 | 2.52 | 4.83 | 4.36 | 3.97 |
| toast-label (inverted) | `--dsw-alias-toast-label` | `--dsw-alias-toast-bg` | 5.40 | 5.18 | 4.66 | 9.39 | 8.62 | 7.83 |
| primary-foreground (brand) | `--dsw-alias-label-primary-foreground` | `--dsw-alias-brand-primary` | 2.32 | 2.22 | 2.00 | 6.88 | 6.23 | 5.62 |

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
- **做法**：light scheme 的文本表面（`bg-layer-1/2/3`、`bg-overlay`、`bg-document-preview`、`markdown-code-block` / `--shiki-background`、输入框 / 菜单 / settings 卡片 / diff 底色等）以 `mix(bg0, bgN, 0.25)` 提亮（diff 为 0.45），再由 `readableSurface` 按实际对比度向 `bg0` 微调直到 `label-primary` ≥ 4.5:1；实际值见 §3。聊天气泡不在这族里：它按 2026-10-19 走查单独处理（§6.8）。inline code 芯片同理不在 bgN 表面族内：DSH 把它当 `background-color` 用，映射浅色取调色板 `bg_blue`、深色取 `bg_dim` 向 `bg0` 提亮 30%（见 `src/tokens.js`），同样经 `readableSurface` 守卫；light·soft 例外（2026-11-15）：该档 `bg_blue` 会被守卫压成 `#e6e8da`（对画布 1.036:1，且 label 4.50 / code 3.00 两对都卡在门槛上，无法再加深），改从白锚向 `fg.blue` 抬 8% 的 `#eff6fa`（对画布 1.098:1，label 5.12、code 3.09，见 §35）。
- **影响 token**：见 §3 全表（light 三档）；dark scheme 保持 design 原值（原生 bg1/bg2 已 ≥4.99，`bg-layer-3` 在 dark·soft 下 4.27 也由 `readableSurface` 微调到达标）。
- **依据**：DSH 原生 light 主题的 `bg-layer-1/2/3` 全部是 `#fff`（`static-neutral-bluish-00`），层次靠边框/阴影；Everforest Enchanted 也是平铺风格（`palette.md` §5「主背景 bg0 平铺」）。因此 light 表面趋近 bg0 并不破坏 DSH 结构语义，只是修正 `fg` 在较暗浅色底上的可读性。

### 6.2 static 色阶插值的端点解释

- design 写「最暗 = bg5、最亮 = bg0」。对 dark scheme 而言 `bg5` 比 `bg0` **更亮**，按字面会得到反向亮度（statics 无法作为浅色文本色）。
- 实现按「绝对亮度锚定」解释：DSH static 是双 scheme 相同的绝对色阶（00 = 白 … 1000 = 黑），映射到各 scheme 的最亮锚点 → `bg5` → 最暗锚点：
  - light：`bg0` → `bg5` → `fg`；dark：`fg` → `bg5` → `bgDim`；色相族为「浅 tint → fg 色相 → 深 tint」。
- 该解释让所有 `var(--dsw-static-*)` 引用在两个 scheme 下都保持方向正确（design 对 static 层的目标），且不改变 226 个 token 的显式覆盖。

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

字体 / 圆角 / 阴影 / 焦点环 / 菜单模糊 / `--dsh-*` 终端几何等保持 DSH 原生值，清单见 `src/tokens.js` 顶部与 `TOKEN_COVERAGE.uncovered`。焦点环颜色通过 `--dsw-alias-state-business-primary` 自动跟随 Everforest 的交互强调色 `statusline1`。

### 6.7 侧栏与内容卡的边界（视觉走查修正）

- **问题**：0.1.1 把 `--dsw-specific-sidebar-fill` 和 `--dsw-alias-bg-base` 都映射为 `bg0`（Enchanted 平铺风格），但 DSH 的 Windows 外壳用前者画侧栏列 / 标题栏条 / 内容卡背后的 frame，用后者画带 16px 左上圆角的内容卡；同色后整条边界消失，窗口看上去是一个平面（用户走查：「Everforest 全部用的同一个颜色，没法区分边界线」）。
- **做法**：侧栏取 `mix(bg0, bg1, 80%)` 并经 `readableSurface` 守卫（light 更深、dark 更浅，方向与 native 侧栏 `#f9fafb`/`#fff`、`#1b1b1c`/`#151517` 一致）。light·soft 的正文 4.5:1 上限把步长压到 `#eee7ce`（边界 1.03），其余档 1.05–1.12；native 为 1.045 / 1.060，观感同级。数值见 §2c。
- **连带影响**：`--dsw-specific-sidebar-fill` 同时是 DSH 桌面端 Windows 原生标题栏（DWM caption）的取色来源（`preload-app.cjs` 探针），标题栏会随侧栏一起变色，与自绘标题栏条保持一致；`settings-general` 的设置导航（`sidebar-nav-item-*`）位于内容区 `bg-base` 上，不受影响。

### 6.8 聊天气泡（2026-10-19 / 2026-10-21 / 2026-11-08 / 2026-11-10 / 2026-11-15 走查修正）

- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射取 `surface(p, 1)`；light 下 `mix(bg0, bg1, 0.25)` = `#FDFAEE`，与画布 `#FFFBEF` 仅 1.02:1，用户报告「聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡并不是中性色阶，而是 `static-deepseek-50` 的淡蓝色 tint（on `#fff` ≈ 1.08），靠色相 + 轻微明度区分。2026-10-21 二次走查：light·soft 的近白「抬起卡片」被用户描述为「聊天气泡框变成白色的了」，与暖色画布不像一家人。2026-11-10 三次走查：深色气泡仍只有 1.15–1.16:1，用户觉得「有点淡」，要求气泡直接沿用它旁边选中会话行的绿底 + 文字色；随后要求浅色气泡与侧栏保持一致。
- **做法（底色）**：2026-11-08 定稿（用户从六方案 demo 里选了 light「苔纸」/ dark「只换字色」）：light 的 token 改为 `bg_green` → `bg5` 22% 的苔纸，并按 `label-primary` 4.5:1 守卫——hard `#e7ead0`（4.54:1）、medium `#e7e9cd`（4.50:1）；light·soft 的 `bg0` 仍只有 4.66:1 余量，继续走抬起方向，但改为白 → 同一苔纸 40% 的淡苔纸 `#f1f2e5`（文字 4.94:1，对画布 1.06:1，门槛 1.05）。dark 的 token 保持 `bg1`（边界 1.15–1.16，官方 `label-primary` ≥5.7:1）。2026-11-10 两个 scheme 的实际绘制都改为交互强调色 `statusline1` 实底（深色 `#A7C080`、浅色 `#93B259`，与选中会话行 / 选中导航项 / 发送键同一底色）；但只写在 `src/chat-bubble.js` 的作用域样式表里，token 仍是苔纸 / 被守卫的 `bg1`：气泡回落文字是 `label-primary`，奶油墨在 `#93B259` 上、淡鼠尾草在 `#A7C080` 上都只有约 2.0:1，若把绿底放进 token 层、样式表一旦失效就会变成不可读的色块；保留 token 则失效时回到浅色苔纸 / 深色 `bg1` + `label-primary` 的可读组合。
- **字色（accent 墨）**：DSH 把气泡文字写死为 `label-primary`，token 层不能只给气泡换字色，因此 `src/chat-bubble.js` 用一张常驻作用域样式表覆盖（按 scheme × strength 各一条规则）：墨色取该 variant 的画布 `bg0`——深色 `#272E33` / `#2D353B` / `#333C43`（5.62–6.88:1，AA），浅色 `#FFFBEF` / `#FDF6E3` / `#F3EAD3`（2.32 / 2.22 / 2.00:1，已记录的奶油上限）。选择器按聊天包的类名片段 `[class*="_userStack"] [class*="_bubble"]` 匹配（`userStack` 祖先排除 tooltip 的 `_bubble_44yfq_1`），并把 `--dsw-alias-state-business-primary` 重指向带墨色（气泡内的会话引用 chip 自己声明这个 token）。该表失效时回到 token 表面 + 官方 `label-primary`，两个 scheme 都满足 AA。
- **门槛**：新增硬门槛 §2d（气泡 vs `bg-base` ≥ 1.10:1，light·soft 1.05:1）+ §3 的文本承载表面检查（气泡文字 ≥ 4.5:1，测的是 token 表面 + 官方墨）。`--dsw-specific-bubble-highlight` 当前 chat 未使用，保持 `surface(p, 2)`。
- **影响范围**：light 三档 `--dsw-specific-bubble` + 常驻样式表 `dsh-everforest/chat-bubble`；2026-11-10 只改该样式表（两个 scheme 改为 accent 绘制；浅色长文本曾试派生深墨，随后换回奶油白），全部 token 不变；2026-11-13 同一张表再加各档一条气泡作用域的 `::selection`（见 §2k），token 仍不变。
- **回复卡与命令回显（2026-11-15）**：同一套绿底原先只锚在 `[class*="_userStack"]` 上，而 DSH 的问答回复卡（`QuestionReplyView`：`row > bubbleWidth > UserMessageBubble`）与 `/goal` 命令回显都不在 `_userStack` 里，卡片仍显示 token 的苔纸底。样式表改为三条锚点各带一次作用域；复卡锚点还要排除 `_bubbleWidth` 包装盒，否则绿底画在方角外盒上、20px 圆角消失。卡内问题行由气泡子树内的 `--dsw-alias-label-secondary` 承担：2026-11-15 曾重指向气泡墨色并另压一块纸条（浅色 `bg_green`、深色 `#5D6E56`），随后用户判「不好看」、要求「不想要两个不同颜色的块…问题用浅一点的文字稍微弱化」，纸条撤掉，该 token 改指「气泡墨色向气泡底移动 6 L*」的问题墨（浅色 1.70–1.99:1、深色 4.52–5.59:1，门槛见 §2m）。
- **文字选区（2026-11-13）**：全局 `src/selection.js` 的 `bg_visual` 配气泡原字色不可读（浅色奶油字 1.36–1.38:1、深色气泡字 1.22–1.27:1）。第一版给气泡单独换选区底色，用户随即要求「勾选颜色各处都统一」，于是改为只重指选中文字颜色：浅色 `#2F3B33`（7.09–8.33:1）、深色 `#FFFBEF`（8.91–10.49:1）；选区底色保持全局 `bg_visual`，画布 / 代码块 / 侧栏不变。2026-11-18 起浅色三档换成同色相的三档梯度（`#DED8DB` / `#D9D4D6` / `#CFC9CC`，对各自 `bg0` 同为 1.36:1），见 `docs/reference/palette.md` §3。门槛见 §2k（G21）。

## 7. 复现

```bash
node scripts/check-contrast.mjs
node --test tests/color.test.mjs tests/tokens.test.mjs tests/color-mode.test.mjs
```
