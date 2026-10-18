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
5. `--dsw-alias-label-primary-inverted` 的真实配对（DSH 把它用作对比墨色）：对 `label-primary`（侧栏 build 徽标 + brand wordmark 的反色镂空）与 `button-contrast-fill`（附件删除按钮）≥ 4.5:1。

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

## 3. 文本承载表面（label-primary 对比度）

`docs/design.md` §4 要求这些表面上的主文本可读；`src/tokens.js` 的 `readableSurface` 会在不达标时向方案背景色 `bg0` 微调（light 提亮、dark 压暗，bg0 始终是该 scheme 下与 `fg` 对比最高的背景），实际值如下。

| token | light-hard | light-medium | light-soft | dark-hard | dark-medium | dark-soft |
|---|---:|---:|---:|---:|---:|---:|
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
| `--dsw-specific-bubble` | 5.34 ✅ | 5.12 ✅ | 4.61 ✅ | 7.11 ✅ | 6.40 ✅ | 5.75 ✅ |
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
- **做法**：light scheme 的文本表面（`bg-layer-1/2/3`、`bg-overlay`、`bg-document-preview`、`markdown-code-block` / `--shiki-background`、输入框 / 气泡 / 菜单 / settings 卡片 / diff 底色等）以 `mix(bg0, bgN, 0.25)` 提亮（diff 为 0.45），再由 `readableSurface` 按实际对比度向 `bg0` 微调直到 `label-primary` ≥ 4.5:1；实际值见 §3。inline code 芯片不在 bgN 表面族内：DSH 把它当 `background-color` 用，映射取调色板 `bg_blue`（见 `src/tokens.js`），同样经 `readableSurface` 守卫。
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

## 7. 复现

```bash
node scripts/check-contrast.mjs
node --test tests/color.test.mjs tests/tokens.test.mjs
```
