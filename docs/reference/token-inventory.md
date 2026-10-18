# DSH token inventory

> 由 `node scripts/extract-theme-tokens.mjs --from <ui-theme/lib/client.js>` 生成，请勿手改。
> 对应：DSH 0.2.1-rc.2 的 `@deepseek-ai/dsh-client-ui-theme` 8 张内置样式表（`docs/design.md` §4 的 2026-10-18 审计口径）。

来源：`@deepseek-ai/dsh-client-ui-theme lib/client.js (8 inlined sheets)`；提取内容 SHA-256 `882ea20f5d851965c1d68386a569cc26c64abb14cd2ae2cd55c0c1483fa6f506`。
该指纹与 `--from` 的绝对路径无关，因此任意路径下的同版本文件都可复现 `--check`。

## 1. 统计口径

| 项 | 数量 |
|---|---:|
| `--dsw-*` 唯一名（8 张 sheet 合计，含非颜色） | 403 |
| 颜色 token：static | 77 |
| 颜色 token：alias | 107 |
| 颜色 token：specific | 11 |
| 颜色 token 小计 | 195 |
| shiki（9 个 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background`） | 11 |
| **覆盖清单合计** | **206** |

sheets：`base.css`、`corner-shape.css`、`design-platform.css`、`focus.css`、`onboarding.css`、`scrollbar.css`、`gradient-shadow-text.css`、`shiki.css`

### 1.1 声明值形态（全部 206 个颜色 token 的 light 声明）

| 形态 | 数量 | 说明 |
|---|---:|---|
| literal | 115 | 字面量（hex/rgb），必须显式给值 |
| var-static | 76 | 直接引用 `--dsw-static-*`，可随 static 映射自动跟随 |
| color-mix | 7 | color-mix 表达式，多半引用 static |
| alias-ref | 8 | 引用其它 alias / 浮层材质 token |

dark 侧重定义：literal 115、alias-ref 5、var-static 75、color-mix 6、missing 5。
`missing` 表示该 token 没有 `body[data-ds-dark-theme]` 覆盖，按级联沿用 light 声明；插件仍然为两种 scheme 都显式给值。

### 1.2 light 侧 alias/specific 声明按 sheet 拆分

| sheet | literal | var-static | color-mix | alias-ref | 合计 |
|---|---:|---:|---:|---:|---:|
| base.css | 0 | 0 | 0 | 2 | 2 |
| design-platform.css | 28 | 75 | 5 | 4 | 112 |
| onboarding.css | 1 | 1 | 2 | 0 | 4 |

`design-platform.css` 承载 light 侧 112 条 alias/specific 声明（101 alias + 11 specific）。按值形态提取为：

- var-static 75 + color-mix 5 + literal 28 + alias-ref 4 = 112；
- `docs/design.md` §4 写作「74 条 var-static + 5 条 color-mix + 28 字面量 + 5 条 alias 间引用」，与提取结果相差 1 条分类边界（`--dsw-alias-tooltip-key-bg` 的 `color-mix()` 内引用的是 alias 而非 static；`--dsw-specific-menu` 引用的是非 static/alias 的 `--dsw-menu-surface-fill`）。总数 112 一致，**不改变覆盖结论**：插件对所有 206 个 token 都显式给值，不依赖自动跟随。

### 1.3 显式处理清单（light 侧 literal + alias-ref，全部 206 个 token 均显式映射）

共 123 条，必须由 `src/tokens.js` 显式映射：

- `--dsw-alias-bg-mask-1`（literal）= `#0000003d`
- `--dsw-alias-bg-mask-2`（literal）= `#0000001f`
- `--dsw-alias-bg-mask-3`（literal）= `#0000007a`
- `--dsw-alias-bg-mask-drop`（literal）= `#ffffffb3`
- `--dsw-alias-bg-mask-photo`（literal）= `#000000e0`
- `--dsw-alias-bg-skeleton`（literal）= `#0000000a`
- `--dsw-alias-border-inverted`（literal）= `#0000`
- `--dsw-alias-border-inverted2`（literal）= `#0000`
- `--dsw-alias-border-l1`（literal）= `#0000000a`
- `--dsw-alias-border-l2`（literal）= `#0000001a`
- `--dsw-alias-border-l2-darkmode-thin`（literal）= `#0000001a`
- `--dsw-alias-border-l3`（literal）= `#0000001f`
- `--dsw-alias-border-l4`（literal）= `#00000029`
- `--dsw-alias-brand-primary-new-colorprimary-new-color`（literal）= `#4176e6`
- `--dsw-alias-button-primary-fill`（alias-ref）= `var(--dsw-alias-brand-primary)`
- `--dsw-alias-button-tool-bar-fill`（literal）= `#54555780`
- `--dsw-alias-button-tool-bar-fill-invisible`（literal）= `#1f1f1f5c`
- `--dsw-alias-button-tool-bar-hover`（literal）= `#54555799`
- `--dsw-alias-file-diff-added-bg`（literal）= `#e6f4e7`
- `--dsw-alias-file-diff-added-gutter`（literal）= `#edf7ed`
- `--dsw-alias-file-diff-added-marker`（literal）= `#01a241`
- `--dsw-alias-file-diff-deleted-bg`（literal）= `#fce6e2`
- `--dsw-alias-file-diff-deleted-gutter`（literal）= `#fdece9`
- `--dsw-alias-file-diff-deleted-marker`（literal）= `#ba2723`
- `--dsw-alias-interactive-bg-active`（literal）= `#2631481a`
- `--dsw-alias-interactive-bg-hover`（literal）= `#2631480f`
- `--dsw-alias-interactive-bg-hover-accent`（literal）= `#26314824`
- `--dsw-alias-interactive-bg-hover-danger`（literal）= `#ec13130d`
- `--dsw-alias-menu-group-header-fill`（literal）= `#f8f9faf0`
- `--dsw-alias-onboarding-accent`（literal）= `#3964fe`
- `--dsw-alias-settings-card-fill`（alias-ref）= `var(--dsw-alias-bg-layer-2)`
- `--dsw-alias-settings-card-stroke`（alias-ref）= `var(--dsw-alias-border-l4)`
- `--dsw-alias-turn-trigger-bg`（alias-ref）= `var(--dsw-alias-markdown-code-block)`
- `--dsw-alias-turn-trigger-bg-hover`（alias-ref）= `var(--dsw-alias-interactive-bg-hover)`
- `--dsw-specific-menu`（alias-ref）= `var(--dsw-menu-surface-fill)`
- `--dsw-static-amber-100`（literal）= `#fef5e7`
- `--dsw-static-amber-400`（literal）= `#f7ad31`
- `--dsw-static-amber-500`（literal）= `#f59e0b`
- `--dsw-static-amber-600`（literal）= `#dd8629`
- `--dsw-static-amber-900`（literal）= `#27241f`
- `--dsw-static-blue-100`（literal）= `#dbeafe`
- `--dsw-static-blue-300`（literal）= `#93c5fd`
- `--dsw-static-blue-400`（literal）= `#60a5fa`
- `--dsw-static-blue-450`（literal）= `#4d93f8`
- `--dsw-static-blue-50`（literal）= `#eff6ff`
- `--dsw-static-blue-500`（literal）= `#3b82f6`
- `--dsw-static-blue-50p`（literal）= `#eaf3ff`
- `--dsw-static-blue-600`（literal）= `#2563eb`
- `--dsw-static-blue-75`（literal）= `#e5f0ff`
- `--dsw-static-blue-800`（literal）= `#1e40af`
- `--dsw-static-blue-900`（literal）= `#0e3074`
- `--dsw-static-blue-950`（literal）= `#172554`
- `--dsw-static-deepseek-100`（literal）= `#e4edfd`
- `--dsw-static-deepseek-200`（literal）= `#d3e2ff`
- `--dsw-static-deepseek-300`（literal）= `#b7c8fe`
- `--dsw-static-deepseek-400`（literal）= `#7aaaff`
- `--dsw-static-deepseek-450`（literal）= `#5686fe`
- `--dsw-static-deepseek-50`（literal）= `#edf3fe`
- `--dsw-static-deepseek-500`（literal）= `#4176e6`
- `--dsw-static-deepseek-600`（literal）= `#4868b2`
- `--dsw-static-deepseek-700-delete`（literal）= `#2f4c8f`
- `--dsw-static-deepseek-800`（literal）= `#34415b`
- `--dsw-static-deepseek-900`（literal）= `#283142`
- `--dsw-static-green-100`（literal）= `#e6faed`
- `--dsw-static-green-400`（literal）= `#4ed17e`
- `--dsw-static-green-500`（literal）= `#22c55e`
- `--dsw-static-green-500-a08`（literal）= `#22c55e14`
- `--dsw-static-green-500-a12`（literal）= `#22c55e1f`
- `--dsw-static-green-900`（literal）= `#233c2c`
- `--dsw-static-neutral-00`（literal）= `#fff`
- `--dsw-static-neutral-100`（literal）= `#f5f5f5`
- `--dsw-static-neutral-1000`（literal）= `#000`
- `--dsw-static-neutral-150`（literal）= `#ededed`
- `--dsw-static-neutral-200`（literal）= `#e5e5e5`
- `--dsw-static-neutral-250`（literal）= `#dcdcdc`
- `--dsw-static-neutral-300`（literal）= `#d4d4d4`
- `--dsw-static-neutral-400`（literal）= `#a2a4a6`
- `--dsw-static-neutral-50`（literal）= `#fafafa`
- `--dsw-static-neutral-500`（literal）= `#7f8287`
- `--dsw-static-neutral-550`（literal）= `#65676b`
- `--dsw-static-neutral-600`（literal）= `#545557`
- `--dsw-static-neutral-700`（literal）= `#3c3c3d`
- `--dsw-static-neutral-800`（literal）= `#292929`
- `--dsw-static-neutral-850`（literal）= `#212123`
- `--dsw-static-neutral-900`（literal）= `#0f0f0f`
- `--dsw-static-neutral-bluish-00`（literal）= `#fff`
- `--dsw-static-neutral-bluish-100`（literal）= `#ebeef2`
- `--dsw-static-neutral-bluish-1000`（literal）= `#0f1115`
- `--dsw-static-neutral-bluish-150`（literal）= `#e9ecf2`
- `--dsw-static-neutral-bluish-200`（literal）= `#e1e5ee`
- `--dsw-static-neutral-bluish-300`（literal）= `#cfd3d6`
- `--dsw-static-neutral-bluish-400`（literal）= `#adb2b8`
- `--dsw-static-neutral-bluish-50`（literal）= `#f9fafb`
- `--dsw-static-neutral-bluish-500`（literal）= `#979da6`
- `--dsw-static-neutral-bluish-60`（literal）= `#f5f6f7`
- `--dsw-static-neutral-bluish-600`（literal）= `#81858c`
- `--dsw-static-neutral-bluish-700`（literal）= `#61666b`
- `--dsw-static-neutral-bluish-75`（literal）= `#f1f3f5`
- `--dsw-static-neutral-bluish-750`（literal）= `#43454a`
- `--dsw-static-neutral-bluish-800`（literal）= `#353638`
- `--dsw-static-neutral-bluish-850`（literal）= `#2c2c2e`
- `--dsw-static-neutral-bluish-875`（literal）= `#232324`
- `--dsw-static-neutral-bluish-900`（literal）= `#1b1b1c`
- `--dsw-static-neutral-bluish-950`（literal）= `#151517`
- `--dsw-static-red-100`（literal）= `#fee2e2`
- `--dsw-static-red-400`（literal）= `#f25a5a`
- `--dsw-static-red-400-a12`（literal）= `#f25a5a1f`
- `--dsw-static-red-50`（literal）= `#fef2f2`
- `--dsw-static-red-500`（literal）= `#ef4444`
- `--dsw-static-red-600`（literal）= `#ec1313`
- `--dsw-static-red-600-a08`（literal）= `#ec131314`
- `--dsw-static-red-900`（literal）= `#570c0c`
- `--shiki-background`（alias-ref）= `var(--dsw-alias-markdown-code-block)`
- `--shiki-foreground`（alias-ref）= `var(--dsw-alias-label-primary)`
- `--shiki-token-comment`（literal）= `#868e96`
- `--shiki-token-constant`（literal）= `#1c7ed6`
- `--shiki-token-function`（literal）= `#6741d9`
- `--shiki-token-keyword`（literal）= `#d6336c`
- `--shiki-token-link`（literal）= `#1971c2`
- `--shiki-token-parameter`（literal）= `#e8590c`
- `--shiki-token-punctuation`（literal）= `#495057`
- `--shiki-token-string`（literal）= `#2f9e44`
- `--shiki-token-string-expression`（literal）= `#2b8a3e`

### 1.4 无 dark 覆盖的 token

共 5 条（插件仍为两种 scheme 显式给值）：

- `--dsw-alias-onboarding-accent`
- `--dsw-alias-settings-card-fill`
- `--dsw-alias-settings-card-stroke`
- `--shiki-background`
- `--shiki-foreground`

## 2. token 表

### 2.1 static（77）

| token | light | lightKind | dark | darkKind |
|---|---|---|---|---|
| `--dsw-static-amber-100` | `#fef5e7` | literal | `#fef5e7` | literal |
| `--dsw-static-amber-400` | `#f7ad31` | literal | `#f7ad31` | literal |
| `--dsw-static-amber-500` | `#f59e0b` | literal | `#f59e0b` | literal |
| `--dsw-static-amber-600` | `#dd8629` | literal | `#dd8629` | literal |
| `--dsw-static-amber-900` | `#27241f` | literal | `#27241f` | literal |
| `--dsw-static-blue-100` | `#dbeafe` | literal | `#dbeafe` | literal |
| `--dsw-static-blue-300` | `#93c5fd` | literal | `#93c5fd` | literal |
| `--dsw-static-blue-400` | `#60a5fa` | literal | `#60a5fa` | literal |
| `--dsw-static-blue-450` | `#4d93f8` | literal | `#4d93f8` | literal |
| `--dsw-static-blue-50` | `#eff6ff` | literal | `#eff6ff` | literal |
| `--dsw-static-blue-500` | `#3b82f6` | literal | `#3b82f6` | literal |
| `--dsw-static-blue-50p` | `#eaf3ff` | literal | `#eaf3ff` | literal |
| `--dsw-static-blue-600` | `#2563eb` | literal | `#2563eb` | literal |
| `--dsw-static-blue-75` | `#e5f0ff` | literal | `#e5f0ff` | literal |
| `--dsw-static-blue-800` | `#1e40af` | literal | `#1e40af` | literal |
| `--dsw-static-blue-900` | `#0e3074` | literal | `#0e3074` | literal |
| `--dsw-static-blue-950` | `#172554` | literal | `#172554` | literal |
| `--dsw-static-deepseek-100` | `#e4edfd` | literal | `#e4edfd` | literal |
| `--dsw-static-deepseek-200` | `#d3e2ff` | literal | `#d3e2ff` | literal |
| `--dsw-static-deepseek-300` | `#b7c8fe` | literal | `#b7c8fe` | literal |
| `--dsw-static-deepseek-400` | `#7aaaff` | literal | `#7aaaff` | literal |
| `--dsw-static-deepseek-450` | `#5686fe` | literal | `#5686fe` | literal |
| `--dsw-static-deepseek-50` | `#edf3fe` | literal | `#edf3fe` | literal |
| `--dsw-static-deepseek-500` | `#4176e6` | literal | `#4176e6` | literal |
| `--dsw-static-deepseek-600` | `#4868b2` | literal | `#4868b2` | literal |
| `--dsw-static-deepseek-700-delete` | `#2f4c8f` | literal | `#2f4c8f` | literal |
| `--dsw-static-deepseek-800` | `#34415b` | literal | `#34415b` | literal |
| `--dsw-static-deepseek-900` | `#283142` | literal | `#283142` | literal |
| `--dsw-static-green-100` | `#e6faed` | literal | `#e6faed` | literal |
| `--dsw-static-green-400` | `#4ed17e` | literal | `#4ed17e` | literal |
| `--dsw-static-green-500` | `#22c55e` | literal | `#22c55e` | literal |
| `--dsw-static-green-500-a08` | `#22c55e14` | literal | `#22c55e14` | literal |
| `--dsw-static-green-500-a12` | `#22c55e1f` | literal | `#22c55e1f` | literal |
| `--dsw-static-green-900` | `#233c2c` | literal | `#233c2c` | literal |
| `--dsw-static-neutral-00` | `#fff` | literal | `#fff` | literal |
| `--dsw-static-neutral-100` | `#f5f5f5` | literal | `#f5f5f5` | literal |
| `--dsw-static-neutral-1000` | `#000` | literal | `#000` | literal |
| `--dsw-static-neutral-150` | `#ededed` | literal | `#ededed` | literal |
| `--dsw-static-neutral-200` | `#e5e5e5` | literal | `#e5e5e5` | literal |
| `--dsw-static-neutral-250` | `#dcdcdc` | literal | `#dcdcdc` | literal |
| `--dsw-static-neutral-300` | `#d4d4d4` | literal | `#d4d4d4` | literal |
| `--dsw-static-neutral-400` | `#a2a4a6` | literal | `#a2a4a6` | literal |
| `--dsw-static-neutral-50` | `#fafafa` | literal | `#fafafa` | literal |
| `--dsw-static-neutral-500` | `#7f8287` | literal | `#7f8287` | literal |
| `--dsw-static-neutral-550` | `#65676b` | literal | `#65676b` | literal |
| `--dsw-static-neutral-600` | `#545557` | literal | `#545557` | literal |
| `--dsw-static-neutral-700` | `#3c3c3d` | literal | `#3c3c3d` | literal |
| `--dsw-static-neutral-800` | `#292929` | literal | `#292929` | literal |
| `--dsw-static-neutral-850` | `#212123` | literal | `#212123` | literal |
| `--dsw-static-neutral-900` | `#0f0f0f` | literal | `#0f0f0f` | literal |
| `--dsw-static-neutral-bluish-00` | `#fff` | literal | `#fff` | literal |
| `--dsw-static-neutral-bluish-100` | `#ebeef2` | literal | `#ebeef2` | literal |
| `--dsw-static-neutral-bluish-1000` | `#0f1115` | literal | `#0f1115` | literal |
| `--dsw-static-neutral-bluish-150` | `#e9ecf2` | literal | `#e9ecf2` | literal |
| `--dsw-static-neutral-bluish-200` | `#e1e5ee` | literal | `#e1e5ee` | literal |
| `--dsw-static-neutral-bluish-300` | `#cfd3d6` | literal | `#cfd3d6` | literal |
| `--dsw-static-neutral-bluish-400` | `#adb2b8` | literal | `#adb2b8` | literal |
| `--dsw-static-neutral-bluish-50` | `#f9fafb` | literal | `#f9fafb` | literal |
| `--dsw-static-neutral-bluish-500` | `#979da6` | literal | `#979da6` | literal |
| `--dsw-static-neutral-bluish-60` | `#f5f6f7` | literal | `#f9fafb` | literal |
| `--dsw-static-neutral-bluish-600` | `#81858c` | literal | `#81858c` | literal |
| `--dsw-static-neutral-bluish-700` | `#61666b` | literal | `#61666b` | literal |
| `--dsw-static-neutral-bluish-75` | `#f1f3f5` | literal | `#f1f3f5` | literal |
| `--dsw-static-neutral-bluish-750` | `#43454a` | literal | `#43454a` | literal |
| `--dsw-static-neutral-bluish-800` | `#353638` | literal | `#353638` | literal |
| `--dsw-static-neutral-bluish-850` | `#2c2c2e` | literal | `#2c2c2e` | literal |
| `--dsw-static-neutral-bluish-875` | `#232324` | literal | `#232324` | literal |
| `--dsw-static-neutral-bluish-900` | `#1b1b1c` | literal | `#1b1b1c` | literal |
| `--dsw-static-neutral-bluish-950` | `#151517` | literal | `#151517` | literal |
| `--dsw-static-red-100` | `#fee2e2` | literal | `#fee2e2` | literal |
| `--dsw-static-red-400` | `#f25a5a` | literal | `#f25a5a` | literal |
| `--dsw-static-red-400-a12` | `#f25a5a1f` | literal | `#f25a5a1f` | literal |
| `--dsw-static-red-50` | `#fef2f2` | literal | `#fef2f2` | literal |
| `--dsw-static-red-500` | `#ef4444` | literal | `#ef4444` | literal |
| `--dsw-static-red-600` | `#ec1313` | literal | `#ec1313` | literal |
| `--dsw-static-red-600-a08` | `#ec131314` | literal | `#ec131314` | literal |
| `--dsw-static-red-900` | `#570c0c` | literal | `#570c0c` | literal |

### 2.2 alias（107）

| token | light | lightKind | dark | darkKind |
|---|---|---|---|---|
| `--dsw-alias-bg-base` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-950)` | var-static |
| `--dsw-alias-bg-document-preview` | `var(--dsw-static-neutral-bluish-100)` | var-static | `var(--dsw-static-neutral-bluish-950)` | var-static |
| `--dsw-alias-bg-document-selection` | `color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)` | color-mix | `color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)` | color-mix |
| `--dsw-alias-bg-layer-1` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-875)` | var-static |
| `--dsw-alias-bg-layer-2` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-alias-bg-layer-3` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-bg-mask-1` | `#0000003d` | literal | `#00000080` | literal |
| `--dsw-alias-bg-mask-2` | `#0000001f` | literal | `#0003` | literal |
| `--dsw-alias-bg-mask-3` | `#0000007a` | literal | `#0000007a` | literal |
| `--dsw-alias-bg-mask-drop` | `#ffffffb3` | literal | `#272730b3` | literal |
| `--dsw-alias-bg-mask-photo` | `#000000e0` | literal | `#000000e0` | literal |
| `--dsw-alias-bg-module-platform` | `var(--dsw-static-neutral-bluish-60)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-bg-multi-select` | `var(--dsw-static-neutral-bluish-60)` | var-static | `var(--dsw-static-neutral-850)` | var-static |
| `--dsw-alias-bg-overlay` | `var(--dsw-static-neutral-bluish-150)` | var-static | `var(--dsw-static-neutral-bluish-700)` | var-static |
| `--dsw-alias-bg-skeleton` | `#0000000a` | literal | `#ffffff14` | literal |
| `--dsw-alias-border-inverted` | `#0000` | literal | `#ffffff0f` | literal |
| `--dsw-alias-border-inverted2` | `#0000` | literal | `#ffffff14` | literal |
| `--dsw-alias-border-l1` | `#0000000a` | literal | `#ffffff0f` | literal |
| `--dsw-alias-border-l2` | `#0000001a` | literal | `#ffffff1f` | literal |
| `--dsw-alias-border-l2-darkmode-thin` | `#0000001a` | literal | `#ffffff0f` | literal |
| `--dsw-alias-border-l3` | `#0000001f` | literal | `#ffffff29` | literal |
| `--dsw-alias-border-l4` | `#00000029` | literal | `#fff3` | literal |
| `--dsw-alias-brand-primary` | `var(--dsw-static-neutral-bluish-1000)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-brand-primary-invert` | `var(--dsw-static-neutral-bluish-1000)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-brand-primary-new-colorprimary-new-color` | `#4176e6` | literal | `var(--dsw-static-deepseek-450)` | var-static |
| `--dsw-alias-brand-text` | `var(--dsw-static-neutral-bluish-1000)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-button-contrast-fill` | `var(--dsw-static-neutral-bluish-700)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-button-elevated-fill` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-button-floating-fill` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-alias-button-floating-hover` | `var(--dsw-static-neutral-bluish-75)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-button-ghost-active-border` | `var(--dsw-static-neutral-bluish-500)` | var-static | `var(--dsw-static-neutral-bluish-600)` | var-static |
| `--dsw-alias-button-ghost-active-fill` | `var(--dsw-static-neutral-bluish-100)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-button-ghost-active-hover` | `var(--dsw-static-neutral-bluish-150)` | var-static | `var(--dsw-static-neutral-bluish-700)` | var-static |
| `--dsw-alias-button-info-fill` | `var(--dsw-static-deepseek-500)` | var-static | `var(--dsw-static-deepseek-400)` | var-static |
| `--dsw-alias-button-info-hover` | `var(--dsw-static-deepseek-400)` | var-static | `var(--dsw-static-deepseek-500)` | var-static |
| `--dsw-alias-button-primary-dimmed` | `var(--dsw-static-neutral-bluish-100)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-button-primary-fill` | `var(--dsw-alias-brand-primary)` | alias-ref | `var(--dsw-alias-brand-primary)` | alias-ref |
| `--dsw-alias-button-primary-hover` | `var(--dsw-static-neutral-bluish-750)` | var-static | `var(--dsw-static-neutral-bluish-100)` | var-static |
| `--dsw-alias-button-tool-bar-fill` | `#54555780` | literal | `#54555780` | literal |
| `--dsw-alias-button-tool-bar-fill-invisible` | `#1f1f1f5c` | literal | `#1f1f1f5c` | literal |
| `--dsw-alias-button-tool-bar-hover` | `#54555799` | literal | `#54555799` | literal |
| `--dsw-alias-code-diff-added` | `var(--dsw-static-green-500-a08)` | var-static | `var(--dsw-static-green-500-a12)` | var-static |
| `--dsw-alias-code-diff-deleted` | `var(--dsw-static-red-600-a08)` | var-static | `var(--dsw-static-red-400-a12)` | var-static |
| `--dsw-alias-file-diff-added-bg` | `#e6f4e7` | literal | `#1f3124` | literal |
| `--dsw-alias-file-diff-added-gutter` | `#edf7ed` | literal | `#132016` | literal |
| `--dsw-alias-file-diff-added-marker` | `#01a241` | literal | `#41c977` | literal |
| `--dsw-alias-file-diff-deleted-bg` | `#fce6e2` | literal | `#3c1f1b` | literal |
| `--dsw-alias-file-diff-deleted-gutter` | `#fdece9` | literal | `#28130e` | literal |
| `--dsw-alias-file-diff-deleted-marker` | `#ba2723` | literal | `#fa423e` | literal |
| `--dsw-alias-interactive-bg-active` | `#2631481a` | literal | `#ffffff24` | literal |
| `--dsw-alias-interactive-bg-hover` | `#2631480f` | literal | `#ffffff14` | literal |
| `--dsw-alias-interactive-bg-hover-accent` | `#26314824` | literal | `#ffffff3d` | literal |
| `--dsw-alias-interactive-bg-hover-danger` | `#ec13130d` | literal | `#f25a5a26` | literal |
| `--dsw-alias-interactive-bg-hover-solid` | `var(--dsw-static-neutral-bluish-75)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-label-caption` | `var(--dsw-static-neutral-bluish-400)` | var-static | `var(--dsw-static-neutral-bluish-600)` | var-static |
| `--dsw-alias-label-deep-diving` | `color-mix(in srgb, var(--dsw-static-deepseek-500) 70%, var(--dsw-static-blue-950))` | color-mix | `color-mix(in srgb, var(--dsw-static-deepseek-450) 55%, var(--dsw-static-neutral-bluish-400))` | color-mix |
| `--dsw-alias-label-deep-diving-shimmer` | `color-mix(in srgb, var(--dsw-static-deepseek-500) 30%, var(--dsw-static-blue-950))` | color-mix | `color-mix(in srgb, var(--dsw-static-blue-300) 65%, var(--dsw-static-deepseek-400))` | color-mix |
| `--dsw-alias-label-dimmed` | `var(--dsw-static-neutral-bluish-200)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-label-document-preview` | `var(--dsw-static-neutral-bluish-700)` | var-static | `var(--dsw-static-neutral-bluish-300)` | var-static |
| `--dsw-alias-label-primary` | `var(--dsw-static-neutral-bluish-1000)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-label-primary-bluish` | `var(--dsw-static-blue-900)` | var-static | `var(--dsw-static-neutral-bluish-50)` | var-static |
| `--dsw-alias-label-primary-dimmed` | `var(--dsw-static-neutral-bluish-950)` | var-static | `var(--dsw-static-neutral-bluish-100)` | var-static |
| `--dsw-alias-label-primary-foreground` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-1000)` | var-static |
| `--dsw-alias-label-primary-inverted` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-label-secondary` | `var(--dsw-static-neutral-bluish-700)` | var-static | `var(--dsw-static-neutral-bluish-300)` | var-static |
| `--dsw-alias-label-shimmer` | `color-mix(in srgb, var(--dsw-static-neutral-1000) 30%, transparent)` | color-mix | `color-mix(in srgb, var(--dsw-static-neutral-00) 45%, transparent)` | color-mix |
| `--dsw-alias-label-tertiary` | `var(--dsw-static-neutral-bluish-600)` | var-static | `var(--dsw-static-neutral-bluish-400)` | var-static |
| `--dsw-alias-link` | `var(--dsw-static-deepseek-500)` | var-static | `var(--dsw-static-deepseek-400)` | var-static |
| `--dsw-alias-markdown-citation` | `var(--dsw-static-neutral-bluish-100)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-markdown-code-block` | `var(--dsw-static-neutral-bluish-50)` | var-static | `var(--dsw-static-neutral-bluish-900)` | var-static |
| `--dsw-alias-markdown-code-block-banner` | `var(--dsw-static-neutral-bluish-50)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-alias-markdown-code-segment-selected` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-alias-markdown-code-segment-unselected` | `var(--dsw-static-neutral-bluish-75)` | var-static | `var(--dsw-static-neutral-bluish-900)` | var-static |
| `--dsw-alias-markdown-inline-code` | `var(--dsw-static-neutral-50)` | var-static | `var(--dsw-static-neutral-800)` | var-static |
| `--dsw-alias-markdown-placeholder` | `var(--dsw-static-neutral-bluish-60)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-alias-markdown-tag` | `var(--dsw-static-neutral-bluish-75)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-alias-menu-group-header-fill` | `#f8f9faf0` | literal | `#303136f0` | literal |
| `--dsw-alias-menu-icon` | `var(--dsw-static-neutral-bluish-800)` | var-static | `var(--dsw-alias-label-primary-dimmed)` | alias-ref |
| `--dsw-alias-onboarding-accent` | `#3964fe` | literal | — | missing |
| `--dsw-alias-onboarding-card-fill` | `color-mix(in srgb, var(--dsw-static-neutral-bluish-00) 80%, transparent)` | color-mix | `color-mix(in srgb, var(--dsw-static-neutral-bluish-850) 80%, transparent)` | color-mix |
| `--dsw-alias-onboarding-checkbox-border` | `color-mix(in srgb, var(--dsw-static-neutral-bluish-1000) 20%, transparent)` | color-mix | `var(--dsw-alias-border-l2)` | alias-ref |
| `--dsw-alias-onboarding-secondary-fill` | `var(--dsw-static-neutral-bluish-00)` | var-static | `#48494c` | literal |
| `--dsw-alias-scrollbar-bg-l1` | `var(--dsw-static-neutral-200)` | var-static | `var(--dsw-static-neutral-700)` | var-static |
| `--dsw-alias-scrollbar-bg-l2` | `var(--dsw-static-neutral-200)` | var-static | `var(--dsw-static-neutral-600)` | var-static |
| `--dsw-alias-scrollbar-hover-l1` | `var(--dsw-static-neutral-300)` | var-static | `var(--dsw-static-neutral-600)` | var-static |
| `--dsw-alias-scrollbar-hover-l2` | `var(--dsw-static-neutral-300)` | var-static | `var(--dsw-static-neutral-550)` | var-static |
| `--dsw-alias-settings-card-fill` | `var(--dsw-alias-bg-layer-2)` | alias-ref | — | missing |
| `--dsw-alias-settings-card-stroke` | `var(--dsw-alias-border-l4)` | alias-ref | — | missing |
| `--dsw-alias-state-business-primary` | `var(--dsw-static-deepseek-500)` | var-static | `var(--dsw-static-deepseek-400)` | var-static |
| `--dsw-alias-state-business-tertiary` | `var(--dsw-static-deepseek-100)` | var-static | `var(--dsw-static-deepseek-800)` | var-static |
| `--dsw-alias-state-error-primary` | `var(--dsw-static-red-600)` | var-static | `var(--dsw-static-red-400)` | var-static |
| `--dsw-alias-state-error-secondary` | `var(--dsw-static-red-400)` | var-static | `var(--dsw-static-red-400)` | var-static |
| `--dsw-alias-state-idle-primary` | `var(--dsw-static-neutral-300)` | var-static | `var(--dsw-static-neutral-600)` | var-static |
| `--dsw-alias-state-success-primary` | `var(--dsw-static-green-500)` | var-static | `var(--dsw-static-green-500)` | var-static |
| `--dsw-alias-state-success-secondary` | `var(--dsw-static-green-400)` | var-static | `var(--dsw-static-green-400)` | var-static |
| `--dsw-alias-state-success-tertiary` | `var(--dsw-static-green-100)` | var-static | `var(--dsw-static-green-900)` | var-static |
| `--dsw-alias-state-warn-label` | `var(--dsw-static-amber-600)` | var-static | `var(--dsw-static-amber-600)` | var-static |
| `--dsw-alias-state-warn-primary` | `var(--dsw-static-amber-500)` | var-static | `var(--dsw-static-amber-500)` | var-static |
| `--dsw-alias-state-warn-secondary` | `var(--dsw-static-amber-400)` | var-static | `var(--dsw-static-amber-400)` | var-static |
| `--dsw-alias-state-warn-tertiary` | `var(--dsw-static-amber-100)` | var-static | `var(--dsw-static-amber-900)` | var-static |
| `--dsw-alias-switch-thumb` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-400)` | var-static |
| `--dsw-alias-toast-bg` | `var(--dsw-static-neutral-bluish-800)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-toast-label` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-00)` | var-static |
| `--dsw-alias-tooltip-bg` | `var(--dsw-static-neutral-bluish-850)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-alias-tooltip-key-bg` | `color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)` | color-mix | `color-mix(in srgb, var(--dsw-alias-tooltip-bg), white 18%)` | color-mix |
| `--dsw-alias-turn-trigger-bg` | `var(--dsw-alias-markdown-code-block)` | alias-ref | `var(--dsw-alias-interactive-bg-hover)` | alias-ref |
| `--dsw-alias-turn-trigger-bg-hover` | `var(--dsw-alias-interactive-bg-hover)` | alias-ref | `var(--dsw-alias-interactive-bg-active)` | alias-ref |

### 2.3 specific（11）

| token | light | lightKind | dark | darkKind |
|---|---|---|---|---|
| `--dsw-specific-bubble` | `var(--dsw-static-deepseek-50)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-specific-bubble-highlight` | `var(--dsw-static-deepseek-200)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-specific-input-major` | `var(--dsw-static-neutral-bluish-00)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-specific-login-input` | `var(--dsw-static-neutral-bluish-50)` | var-static | `var(--dsw-static-neutral-bluish-900)` | var-static |
| `--dsw-specific-menu` | `var(--dsw-menu-surface-fill)` | alias-ref | `#303136f0` | literal |
| `--dsw-specific-selector` | `var(--dsw-static-neutral-bluish-60)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-specific-sidebar-fill` | `var(--dsw-static-neutral-bluish-50)` | var-static | `var(--dsw-static-neutral-bluish-900)` | var-static |
| `--dsw-specific-sidebar-nav-item-active` | `var(--dsw-static-neutral-bluish-100)` | var-static | `var(--dsw-static-neutral-bluish-750)` | var-static |
| `--dsw-specific-sidebar-nav-item-active-accent` | `var(--dsw-static-deepseek-100)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |
| `--dsw-specific-sidebar-nav-item-hover` | `var(--dsw-static-neutral-bluish-75)` | var-static | `var(--dsw-static-neutral-bluish-850)` | var-static |
| `--dsw-specific-tip` | `var(--dsw-static-neutral-bluish-60)` | var-static | `var(--dsw-static-neutral-bluish-800)` | var-static |

### 2.4 shiki（11）

| token | light | lightKind | dark | darkKind |
|---|---|---|---|---|
| `--shiki-background` | `var(--dsw-alias-markdown-code-block)` | alias-ref | — | missing |
| `--shiki-foreground` | `var(--dsw-alias-label-primary)` | alias-ref | — | missing |
| `--shiki-token-comment` | `#868e96` | literal | `#adb5bd` | literal |
| `--shiki-token-constant` | `#1c7ed6` | literal | `#4dabf7` | literal |
| `--shiki-token-function` | `#6741d9` | literal | `#b197fc` | literal |
| `--shiki-token-keyword` | `#d6336c` | literal | `#faa2c1` | literal |
| `--shiki-token-link` | `#1971c2` | literal | `#74c0fc` | literal |
| `--shiki-token-parameter` | `#e8590c` | literal | `#ffa94d` | literal |
| `--shiki-token-punctuation` | `#495057` | literal | `#ced4da` | literal |
| `--shiki-token-string` | `#2f9e44` | literal | `#69db7c` | literal |
| `--shiki-token-string-expression` | `#2b8a3e` | literal | `#8ce99a` | literal |

## 3. 非颜色 token 的处理

8 张 sheet 里另有 208 个非颜色 `--dsw-*` token（字体 / 圆角 / 阴影 / 渐变 / 遮罩模糊 / 焦点环 / 浮层材质等）。其中 **6 个**由覆盖层作为辅助 token 显式接管（`--dsw-gradient-onboarding-violet/blue/cyan-stops`、`--dsw-linear-gradient-think`、`--dsw-linear-think-select`、`--dsw-menu-surface-fill`）；其余 **202 个**按 design §4 的「明确不覆盖」清单保留 DSH 原生值：

- `--dsw-corner-*`：1 个
- `--dsw-elevation-*`：5 个
- `--dsw-focus-*`：2 个
- `--dsw-font-*`：182 个
- `--dsw-mask-*`：1 个
- `--dsw-menu-*`：1 个
- `--dsw-radius-*`：6 个
- `--dsw-shadow-*`：4 个

其中 docs/design.md §4 点名不覆盖（或无需覆盖，靠 alias 派生）的具体项：`--dsw-focus-ring-color`、`--dsw-focus-ring-width`、`--dsw-menu-backdrop-filter`、`--dsw-shadow-lv1/lv1-blur/lv2/lv3`、`--dsw-elevation-*`（含 `--dsw-elevation-stroke-color`，它引用 `--dsw-alias-border-l4` 会自动跟随）、`--dsw-mask-blur`、字体与圆角类。

## 4. 复现

```bash
node scripts/extract-theme-tokens.mjs --from <ui-theme/lib/client.js>
```

输出确定性：无时间戳、token 按名称排序（--check 可用于校验提交内容是否最新）。
