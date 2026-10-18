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
7. 聊天气泡 `--dsw-specific-bubble` 与 `bg-base` 的边界对比度 ≥ 1.10:1（6 档），且气泡上的 `label-primary` ≥ 4.5:1（文本承载表面，见 §3）：气泡画在聊天画布上，同色时用户消息和背景融为一体（2026-10-19 走查，见 §2d / §6.8）；

报告项（不 exit 1，仅低于 1.5 视为映射损坏）：上游 Everforest 的 muted 色对比度有意偏低（Enchanted 亦如此），下表给出数值与 native DSH 参考值对照。

## 2. 硬门槛明细（6 档）

| 变体 | label-primary / bg-base | / bg-layer-1 | / bg-layer-2 | shiki fg / bg | 品牌前景 / 品牌底 | 结果 |
|---|---:|---:|---:|---:|---:|---|
| light-hard | 5.40 | 5.34 | 5.26 | 5.26 | 3.13 | ✅ |
| light-medium | 5.18 | 5.12 | 5.04 | 5.04 | 3.00 | ✅ |
| light-soft | 4.66 | 4.61 | 4.53 | 4.53 | 2.70 | ✅ |
| dark-hard | 8.15 | 7.11 | 6.20 | 9.39 | 4.26 | ✅ |
| dark-medium | 7.38 | 6.40 | 5.57 | 8.62 | 3.86 | ✅ |
| dark-soft | 6.65 | 5.75 | 4.99 | 7.83 | 3.48 | ✅ |

## 2b. 反色前景真实配对（硬门槛）

`--dsw-alias-label-primary-inverted` 在 DSH 0.2.1-rc.2 中不是 toast/tooltip 深色底的文字色，而是与 `label-primary` / `button-contrast-fill` 配对的「对比墨色」（安装包 CSS：侧栏 build 徽标、附件删除按钮、brand wordmark 在当前 ink 上的反色镂空）。实现按真实配对硬门槛：

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

DSH 用 `--dsw-specific-bubble` 画用户消息气泡（`MessageItem.module.css`：`.bubble { background: var(--dsw-specific-bubble) }`），文字继承 `label-primary`。旧映射取 `surface(p, 1)`，light 下得到 `#FDFAEE` 对画布 `#FFFBEF` 只有 1.02:1，与背景融为一体（2026-10-19 走查）。现在改为 sage tint（`bg0` → `header-aqua` 16%）并经**向白**守卫；light·soft 因 `bg0` 已只有 4.66:1 文本余量、无法再压暗，改用近白冷调「抬起卡片」方向，取两方向中与画布分离更大者（见 §6.8）。本门槛确保它不会退回画布：

| 变体 | bubble | bg-base | 边界对比度 | 阈值 | 结果 |
|---|---|---|---:|---:|---|
| light-hard | `#e4ecdc` | `#FFFBEF` | 1.17 | 1.1 | ✅ |
| light-medium | `#e4ead6` | `#FDF6E3` | 1.14 | 1.1 | ✅ |
| light-soft | `#f8fbfa` | `#F3EAD3` | 1.15 | 1.1 | ✅ |
| dark-hard | `#2E383C` | `#272E33` | 1.15 | 1.1 | ✅ |
| dark-medium | `#343F44` | `#2D353B` | 1.15 | 1.1 | ✅ |
| dark-soft | `#3A464C` | `#333C43` | 1.16 | 1.1 | ✅ |

对照：native light 气泡 `static-deepseek-50 #edf3fe` on `#fff` ≈ 1.08；本实现 light 1.14–1.17（light·soft 用近白方向 1.15），dark 1.15–1.16，均 ≥ native 观感。气泡文本对比度见 §3 的 `--dsw-specific-bubble` 行。

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
| `--dsw-alias-markdown-inline-code` | 5.01 ✅ | 4.82 ✅ | 4.50 ✅ | 5.39 ✅ | 4.94 ✅ | 4.51 ✅ |
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
| `--dsw-specific-bubble` | 4.61 ✅ | 4.53 ✅ | 5.37 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
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
| link | `--dsw-alias-link` | `--dsw-alias-bg-base` | 3.31 | 3.18 | 2.86 | 4.02 | 3.64 | 3.28 |
| state-success | `--dsw-alias-state-success-primary` | `--dsw-alias-bg-base` | 2.81 | 2.69 | 2.42 | 6.88 | 6.23 | 5.62 |
| state-warn | `--dsw-alias-state-warn-primary` | `--dsw-alias-bg-base` | 2.21 | 2.12 | 1.91 | 7.55 | 6.84 | 6.16 |
| state-error | `--dsw-alias-state-error-primary` | `--dsw-alias-bg-base` | 3.17 | 3.04 | 2.73 | 5.02 | 4.55 | 4.10 |
| state-business | `--dsw-alias-state-business-primary` | `--dsw-alias-bg-base` | 3.26 | 3.13 | 2.82 | 6.34 | 5.74 | 5.17 |
| state-warn-label | `--dsw-alias-state-warn-label` | `--dsw-alias-bg-base` | 3.02 | 2.90 | 2.61 | 7.77 | 7.04 | 6.34 |
| diff-added-marker | `--dsw-alias-file-diff-added-marker` | `--dsw-alias-file-diff-added-bg` | 2.71 | 2.62 | 2.35 | 4.78 | 4.25 | 3.82 |
| diff-deleted-marker | `--dsw-alias-file-diff-deleted-marker` | `--dsw-alias-file-diff-deleted-bg` | 2.98 | 2.86 | 2.64 | 3.86 | 3.53 | 3.19 |
| toast-label (inverted) | `--dsw-alias-toast-label` | `--dsw-alias-toast-bg` | 5.40 | 5.18 | 4.66 | 9.39 | 8.62 | 7.83 |
| primary-foreground (brand) | `--dsw-alias-label-primary-foreground` | `--dsw-alias-brand-primary` | 3.13 | 3.00 | 2.70 | 4.26 | 3.86 | 3.48 |

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

- `file-diff-added/deleted-bg` 在 light 下由 `bg_green` / `bg_red` 向 `bg0` 混合 45%（并经过 `readableSurface` 保证代码文本 ≥4.5），dark 保持 `bg_green` / `bg_red` 原值；gutter 在底色基础上向亮端 `lift` 35%。

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

### 6.8 聊天气泡（2026-10-19 走查修正）

- **问题**：用户消息气泡 `--dsw-specific-bubble` 旧映射取 `surface(p, 1)`；light 下 `mix(bg0, bg1, 0.25)` = `#FDFAEE`，与画布 `#FFFBEF` 仅 1.02:1，用户报告「聊天气泡和背景融为一体，区分不出来」。DSH native light 气泡并不是中性色阶，而是 `static-deepseek-50` 的淡蓝色 tint（on `#fff` ≈ 1.08），靠色相 + 轻微明度区分。
- **做法**：light 下取 `bg0` → `header-aqua` 16% 的 sage tint，经 `readableToward(..., #ffffff)`（**向白**而非向暖色画布）守卫到 4.5:1。light·hard / medium 的 tint 能保持 ~1.17 / 1.14:1 边界、气泡文字 4.6 / 4.5:1；light·soft 的 `bg0` 已是 4.66:1 文本余量，任何再压暗都会跌破 4.5，因此改用近白冷调「抬起卡片」（`#ffffff` + 4% `header-aqua`），边界反而达到 ~1.15:1。两个方向由代码按实际边界对比度自动择大，避免以后 palette 微调又把气泡粘回背景。dark 保持 `bg1`（边界 1.14–1.16，文字 ≥5.7:1）。
- **门槛**：新增硬门槛 §2d（气泡 vs `bg-base` ≥ 1.10:1，6 档）+ §3 的文本承载表面检查（气泡文字 ≥ 4.5:1）。`--dsw-specific-bubble-highlight` 当前 chat 未使用，保持 `surface(p, 2)`。
- **影响 token**：仅 `--dsw-specific-bubble`；其余表面与文字色不变。

## 7. 复现

```bash
node scripts/check-contrast.mjs
node --test tests/color.test.mjs tests/tokens.test.mjs
```
