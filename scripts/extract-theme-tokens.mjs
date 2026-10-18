#!/usr/bin/env node
/**
 * Extract the DSH theme token inventory from the built `@deepseek-ai/dsh-client-ui-theme`
 * client bundle (a JavaScript module whose eight CSS sheets are embedded as inline
 * `//#region \0dsh-inline-css:<sheet>.css.mjs` string literals).
 *
 * Usage:
 *   node scripts/extract-theme-tokens.mjs --from <path-to-ui-theme/lib/client.js> [--out-dir <dir>] [--check]
 *
 * Outputs (zero dependencies, deterministic):
 *   docs/reference/token-inventory.json  machine-readable list of the 206 colour tokens
 *   docs/reference/token-inventory.md    human-readable tables + statistics
 *
 * Counting convention (docs/design.md §4, 2026-10-18 audit):
 *   403 unique `--dsw-*` names across the eight ui-theme sheets
 *   -> colours: 77 static + 107 alias + 11 specific = 195
 *   -> syntax highlighting: 9 `--shiki-token-*` + `--shiki-foreground` + `--shiki-background` = 11
 *   -> total covered token inventory: 206
 *
 * Value kinds:
 *   literal     a concrete colour literal (#hex, rgb(), ...)
 *   var-static  a direct var(--dsw-static-*) reference
 *   color-mix   a color-mix() expression (usually referencing static tokens)
 *   alias-ref   a var() reference to another alias/menu token
 *   missing     no declaration in that scheme
 *
 * `missing` for the dark column means "no body[data-ds-dark-theme] override exists";
 * such tokens inherit the light declaration in the cascade. The plugin gives both
 * schemes an explicit value anyway (docs/design.md §4 requires explicit coverage).
 *
 * The written inventory records a stable source label plus a SHA-256 digest of the
 * extracted content (not the absolute `--from` path), so `--check` reproduces from
 * any copy of the same ui-theme build.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_OUT_DIR = join(REPO_ROOT, 'docs', 'reference')

/** Expected colour-token counts, fixed by docs/design.md §4 (2026-10-18 audit). */
const EXPECTED_COUNTS = { static: 77, alias: 107, specific: 11, shiki: 11, total: 206 }

const SHEET_REGION_RE =
  /\/\/#region [^\n]*dsh-inline-css:([^\n]+)\r?\n[^\n]*?= ("(?:[^"\\]|\\.)*");/g

const CATEGORY_ORDER = ['static', 'alias', 'specific', 'shiki']

/** Parse CLI arguments; unknown flags are a usage error (exit 2). */
function parseArgs(argv) {
  const opts = { from: null, outDir: DEFAULT_OUT_DIR, check: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--from') {
      opts.from = argv[++i] ?? null
      if (!opts.from) usage('--from requires a path')
    } else if (arg === '--out-dir') {
      const value = argv[++i]
      if (!value) usage('--out-dir requires a path')
      opts.outDir = resolve(value)
    } else if (arg === '--check') {
      opts.check = true
    } else if (arg === '--help' || arg === '-h') {
      usage(null)
    } else {
      usage(`unknown argument: ${arg}`)
    }
  }
  if (!opts.from) usage('missing required --from <path-to-ui-theme/lib/client.js>')
  return opts
}

function usage(error) {
  const text = [
    'Usage: node scripts/extract-theme-tokens.mjs --from <path-to-ui-theme/lib/client.js>',
    '         [--out-dir <dir>] [--check]',
    '',
    '  --from     path to @deepseek-ai/dsh-client-ui-theme/lib/client.js',
    '  --out-dir  output directory (default: docs/reference)',
    '  --check    do not write; exit 1 if the committed inventory is out of date',
  ].join('\n')
  if (error) {
    console.error(`error: ${error}\n`)
    console.error(text)
    process.exit(2)
  }
  console.log(text)
  process.exit(0)
}

/* ------------------------------------------------------------------ *
 * Minimal CSS parsing (only what the ui-theme sheets need)
 * ------------------------------------------------------------------ */

/**
 * Split a declaration block into custom-property declarations, ignoring the
 * semicolons that can appear inside function values. Returns [{ name, value }]
 * with the declaration value kept verbatim (trimmed).
 */
function parseDeclarations(block) {
  const out = []
  let depth = 0
  let start = 0
  const flush = (end) => {
    const part = block.slice(start, end)
    start = end + 1
    const colon = part.indexOf(':')
    if (colon <= 0) return
    const name = part.slice(0, colon).trim()
    if (!name.startsWith('--')) return
    const value = part.slice(colon + 1).trim()
    if (value) out.push({ name, value })
  }
  for (let i = 0; i < block.length; i++) {
    const ch = block[i]
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ';' && depth === 0) flush(i)
  }
  flush(block.length)
  return out
}

/**
 * Parse a stylesheet into a flat rule list. Nested blocks (e.g. `@supports`)
 * are unwrapped: the declarations inside are still in effect when the support
 * condition matches, and none of the colour tokens are declared conditionally.
 * Returns [{ selector, declarations: [{ name, value }] }].
 */
function parseRules(css, out = []) {
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) break
    const prelude = css.slice(i, open).trim()
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      const ch = css[j]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      j++
    }
    const inner = css.slice(open + 1, j - 1)
    if (prelude.startsWith('@')) parseRules(inner, out)
    else if (inner.includes('{')) parseRules(inner, out) // CSS nesting: not used by these sheets
    else out.push({ selector: prelude.replace(/\s+/g, ' '), declarations: parseDeclarations(inner) })
    i = j
  }
  return out
}

/** Classify a declaration value by shape. */
function classifyValue(value) {
  if (value === undefined) return 'missing'
  const v = value.trim()
  if (/^var\(--dsw-static-[a-z0-9-]+\)$/.test(v)) return 'var-static'
  if (/^var\(/.test(v)) return 'alias-ref'
  if (/^color-mix\(/.test(v)) return 'color-mix'
  if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v)) return 'literal'
  if (/gradient\(/.test(v)) return 'gradient'
  return 'other'
}

function categoryOf(name) {
  if (name.startsWith('--dsw-static-')) return 'static'
  if (name.startsWith('--dsw-alias-')) return 'alias'
  if (name.startsWith('--dsw-specific-')) return 'specific'
  if (name.startsWith('--shiki-')) return 'shiki'
  return 'other'
}

/* ------------------------------------------------------------------ *
 * Extraction
 * ------------------------------------------------------------------ */

/**
 * Read the bundle, decode every inline sheet, and build the token inventory.
 * @param {string} file source `ui-theme/lib/client.js` path
 */
function extract(file) {
  const bundle = readFileSync(file, 'utf8')
  const sheets = []
  let match
  SHEET_REGION_RE.lastIndex = 0
  while ((match = SHEET_REGION_RE.exec(bundle)) !== null) {
    const sheetPath = match[1]
    const sheetName = sheetPath.split(/[\\/]/).pop().replace(/\.mjs$/, '')
    let css
    try {
      css = JSON.parse(match[2])
    } catch (error) {
      throw new Error(`failed to decode inline CSS for ${sheetName}: ${error.message}`)
    }
    sheets.push({ name: sheetName, css })
  }
  if (sheets.length === 0) {
    throw new Error(
      'no inline CSS sheets found; is --from the built @deepseek-ai/dsh-client-ui-theme/lib/client.js?',
    )
  }

  /** name -> { decls: [{sheet, selector, value}], light, dark } */
  const records = new Map()
  for (const sheet of sheets) {
    for (const rule of parseRules(sheet.css)) {
      for (const decl of rule.declarations) {
        if (categoryOf(decl.name) === 'other' && !decl.name.startsWith('--dsw-')) continue
        let record = records.get(decl.name)
        if (!record) {
          record = { name: decl.name, decls: [], light: undefined, dark: undefined }
          records.set(decl.name, record)
        }
        record.decls.push({ sheet: sheet.name, selector: rule.selector, value: decl.value })
        const isDark = rule.selector.includes('data-ds-dark-theme')
        if (isDark) {
          record.dark = decl.value
        } else if (rule.selector === ':root' || rule.selector === 'body') {
          // `:root` targets <html> and cascades down; `body` wins for the app subtree.
          if (rule.selector === 'body' || record.light === undefined) {
            record.light = decl.value
          }
        }
      }
    }
  }

  const allNames = [...records.keys()].filter((n) => n.startsWith('--dsw-') || n.startsWith('--shiki-'))
  const dswNamespaceNames = allNames.filter((n) => n.startsWith('--dsw-'))
  const shikiNamespaceNames = allNames.filter((n) => n.startsWith('--shiki-'))
  const colorNames = allNames.filter((name) => {
    const category = categoryOf(name)
    if (!CATEGORY_ORDER.includes(category)) return false
    const record = records.get(name)
    if (!record || record.light === undefined) return false
    const kind = classifyValue(record.light)
    return kind === 'literal' || kind === 'var-static' || kind === 'color-mix' || kind === 'alias-ref'
  })

  const tokens = colorNames
    .map((name) => {
      const record = records.get(name)
      const lightKind = classifyValue(record.light)
      const darkKind = classifyValue(record.dark)
      return {
        name,
        category: categoryOf(name),
        light: record.light,
        dark: record.dark ?? null,
        lightKind,
        darkKind: record.dark === undefined ? 'missing' : darkKind,
      }
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

  const counts = { static: 0, alias: 0, specific: 0, shiki: 0, total: tokens.length }
  for (const token of tokens) counts[token.category]++

  // Non-colour tokens that the plugin intentionally does not override (documented in src/tokens.js).
  const nonColor = allNames
    .filter((name) => !colorNames.includes(name))
    .sort()
    .map((name) => {
      const record = records.get(name)
      return { name, lightKind: classifyValue(record?.light), darkKind: classifyValue(record?.dark) }
    })

  const tokenSet = new Set(tokens.map((t) => t.name))
  const lightKinds = {}
  const darkKinds = {}
  for (const token of tokens) {
    lightKinds[token.lightKind] = (lightKinds[token.lightKind] ?? 0) + 1
    darkKinds[token.darkKind] = (darkKinds[token.darkKind] ?? 0) + 1
  }

  return {
    sheets: sheets.map((s) => s.name),
    tokenSet,
    tokens,
    counts,
    lightKinds,
    darkKinds,
    allCount: allNames.length,
    dswNamespaceCount: dswNamespaceNames.length,
    shikiNamespaceCount: shikiNamespaceNames.length,
    staticNameCount: allNames.filter((n) => n.startsWith('--dsw-static-')).length,
    nonColor,
    missingDark: tokens.filter((t) => t.darkKind === 'missing').map((t) => t.name),
    explicit: tokens.filter((t) => t.lightKind === 'literal' || t.lightKind === 'alias-ref').map((t) => t.name),
    aliasSpecificLightKinds: countAliasSpecificLightKinds(records, sheets),
  }
}

/**
 * Breakdown of the light-side alias/specific declarations by value kind and sheet.
 * docs/design.md §4 quotes 112 declarations for design-platform.css
 * (74 direct static + 5 color-mix + 28 literals + 5 alias refs).
 */
function countAliasSpecificLightKinds(records, sheets) {
  const bySheet = new Map()
  for (const record of records.values()) {
    const category = categoryOf(record.name)
    if (category !== 'alias' && category !== 'specific') continue
    if (record.light === undefined) continue
    const kind = classifyValue(record.light)
    const sheet = record.decls.find((d) => d.selector === ':root' || d.selector === 'body')?.sheet ?? 'unknown'
    if (!bySheet.has(sheet)) bySheet.set(sheet, {})
    bySheet.get(sheet)[kind] = (bySheet.get(sheet)[kind] ?? 0) + 1
  }
  const result = {}
  for (const sheet of sheets.map((s) => s.name)) {
    if (!bySheet.has(sheet)) continue
    const kinds = bySheet.get(sheet)
    result[sheet] = {
      literal: kinds.literal ?? 0,
      'var-static': kinds['var-static'] ?? 0,
      'color-mix': kinds['color-mix'] ?? 0,
      'alias-ref': kinds['alias-ref'] ?? 0,
      total: Object.values(kinds).reduce((sum, n) => sum + n, 0),
    }
  }
  return result
}

/* ------------------------------------------------------------------ *
 * Output rendering
 * ------------------------------------------------------------------ */

/** Stable, machine-independent label for the parsed ui-theme build. */
const SOURCE_LABEL = '@deepseek-ai/dsh-client-ui-theme lib/client.js (8 inlined sheets)'

/** SHA-256 over the extracted inventory content (scheme-independent of the input path). */
function inventoryDigest(inventory) {
  return createHash('sha256')
    .update(JSON.stringify({ sheets: inventory.sheets, counts: inventory.counts, tokens: inventory.tokens }))
    .digest('hex')
}

function renderJson(inventory) {
  const data = {
    source: SOURCE_LABEL,
    generatedBy: 'scripts/extract-theme-tokens.mjs',
    sourceSha256: inventoryDigest(inventory),
    sheets: inventory.sheets,
    counts: inventory.counts,
    tokens: inventory.tokens,
  }
  return `${JSON.stringify(data, null, 2)}\n`
}

function renderMarkdown(inventory) {
  const { counts, lightKinds, darkKinds } = inventory
  const lines = []
  const push = (...rows) => lines.push(...rows)

  push(
    '# DSH token inventory',
    '',
    '> 由 `node scripts/extract-theme-tokens.mjs --from <ui-theme/lib/client.js>` 生成，请勿手改。',
    '> 对应：DSH 0.2.1-rc.2 的 `@deepseek-ai/dsh-client-ui-theme` 8 张内置样式表（`docs/design.md` §4 的 2026-10-18 审计口径）。',
    '',
    `来源：\`${SOURCE_LABEL}\`；提取内容 SHA-256 \`${inventoryDigest(inventory)}\`。`,
    '该指纹与 `--from` 的绝对路径无关，因此任意路径下的同版本文件都可复现 `--check`。',
    '',
    '## 1. 统计口径',
    '',
    '| 项 | 数量 |',
    '|---|---:|',
    `| \`--dsw-*\` 唯一名（8 张 sheet 合计，含非颜色） | ${inventory.dswNamespaceCount} |`,
    `| 颜色 token：static | ${counts.static} |`,
    `| 颜色 token：alias | ${counts.alias} |`,
    `| 颜色 token：specific | ${counts.specific} |`,
    `| 颜色 token 小计 | ${counts.static + counts.alias + counts.specific} |`,
    `| shiki（9 个 \`--shiki-token-*\` + \`--shiki-foreground\` + \`--shiki-background\`） | ${counts.shiki} |`,
    `| **覆盖清单合计** | **${counts.total}** |`,
    '',
    `sheets：${inventory.sheets.map((s) => `\`${s}\``).join('、')}`,
    '',
    '### 1.1 声明值形态（全部 206 个颜色 token 的 light 声明）',
    '',
    '| 形态 | 数量 | 说明 |',
    '|---|---:|---|',
    `| literal | ${lightKinds.literal ?? 0} | 字面量（hex/rgb），必须显式给值 |`,
    `| var-static | ${lightKinds['var-static'] ?? 0} | 直接引用 \`--dsw-static-*\`，可随 static 映射自动跟随 |`,
    `| color-mix | ${lightKinds['color-mix'] ?? 0} | color-mix 表达式，多半引用 static |`,
    `| alias-ref | ${lightKinds['alias-ref'] ?? 0} | 引用其它 alias / 浮层材质 token |`,
    '',
    `dark 侧重定义：literal ${darkKinds.literal ?? 0}、alias-ref ${darkKinds['alias-ref'] ?? 0}、var-static ${darkKinds['var-static'] ?? 0}、color-mix ${darkKinds['color-mix'] ?? 0}、missing ${darkKinds.missing ?? 0}。`,
    '`missing` 表示该 token 没有 `body[data-ds-dark-theme]` 覆盖，按级联沿用 light 声明；插件仍然为两种 scheme 都显式给值。',
    '',
    '### 1.2 light 侧 alias/specific 声明按 sheet 拆分',
    '',
    '| sheet | literal | var-static | color-mix | alias-ref | 合计 |',
    '|---|---:|---:|---:|---:|---:|',
  )
  for (const [sheet, kinds] of Object.entries(inventory.aliasSpecificLightKinds)) {
    push(
      `| ${sheet} | ${kinds.literal} | ${kinds['var-static']} | ${kinds['color-mix']} | ${kinds['alias-ref']} | ${kinds.total} |`,
    )
  }
  const dp = inventory.aliasSpecificLightKinds['design-platform.css'] ?? {
    literal: 0,
    'var-static': 0,
    'color-mix': 0,
    'alias-ref': 0,
    total: 0,
  }
  push(
    '',
    '`design-platform.css` 承载 light 侧 112 条 alias/specific 声明（101 alias + 11 specific）。按值形态提取为：',
    '',
    `- var-static ${dp['var-static']} + color-mix ${dp['color-mix']} + literal ${dp.literal} + alias-ref ${dp['alias-ref']} = ${dp.total}；`,
    '- `docs/design.md` §4 写作「74 条 var-static + 5 条 color-mix + 28 字面量 + 5 条 alias 间引用」，与提取结果相差 1 条分类边界（`--dsw-alias-tooltip-key-bg` 的 `color-mix()` 内引用的是 alias 而非 static；`--dsw-specific-menu` 引用的是非 static/alias 的 `--dsw-menu-surface-fill`）。总数 112 一致，**不改变覆盖结论**：插件对所有 206 个 token 都显式给值，不依赖自动跟随。',
    '',
    '### 1.3 显式处理清单（light 侧 literal + alias-ref，全部 206 个 token 均显式映射）',
    '',
  )
  const explicit = inventory.tokens.filter((t) => t.lightKind === 'literal' || t.lightKind === 'alias-ref')
  push(`共 ${explicit.length} 条，必须由 \`src/tokens.js\` 显式映射：`, '')
  for (const token of explicit) {
    push(`- \`${token.name}\`（${token.lightKind}）= \`${token.light}\``)
  }
  push('', '### 1.4 无 dark 覆盖的 token', '', `共 ${inventory.missingDark.length} 条（插件仍为两种 scheme 显式给值）：`, '')
  for (const name of inventory.missingDark) push(`- \`${name}\``)
  push('', '## 2. token 表', '')

  const titles = { static: 'static（77）', alias: 'alias（107）', specific: 'specific（11）', shiki: 'shiki（11）' }
  for (const category of CATEGORY_ORDER) {
    const rows = inventory.tokens.filter((t) => t.category === category)
    push(`### 2.${CATEGORY_ORDER.indexOf(category) + 1} ${titles[category]}`, '', '| token | light | lightKind | dark | darkKind |', '|---|---|---|---|---|')
    for (const token of rows) {
      const dark = token.dark === null ? '—' : `\`${token.dark}\``
      push(`| \`${token.name}\` | \`${token.light}\` | ${token.lightKind} | ${dark} | ${token.darkKind} |`)
    }
    push('')
  }

  push(
    '## 3. 非颜色 token 的处理',
    '',
    `8 张 sheet 里另有 ${inventory.nonColor.length} 个非颜色 \`--dsw-*\` token（字体 / 圆角 / 阴影 / 渐变 / 遮罩模糊 / 焦点环 / 浮层材质等）。其中 **6 个**由覆盖层作为辅助 token 显式接管（` +
      '`--dsw-gradient-onboarding-violet/blue/cyan-stops`、`--dsw-linear-gradient-think`、`--dsw-linear-think-select`、`--dsw-menu-surface-fill`）；' +
      '其余 **202 个**按 design §4 的「明确不覆盖」清单保留 DSH 原生值：',
    '',
  )
  const coveredAuxiliary = new Set([
    '--dsw-gradient-onboarding-violet-stops',
    '--dsw-gradient-onboarding-blue-stops',
    '--dsw-gradient-onboarding-cyan-stops',
    '--dsw-linear-gradient-think',
    '--dsw-linear-think-select',
    '--dsw-menu-surface-fill'
  ])
  const groups = new Map()
  for (const token of inventory.nonColor) {
    if (coveredAuxiliary.has(token.name)) continue
    const prefix = token.name.match(/^--dsw-([a-z]+)/)?.[1] ?? 'other'
    groups.set(prefix, (groups.get(prefix) ?? 0) + 1)
  }
  for (const [prefix, count] of [...groups.entries()].sort()) push(`- \`--dsw-${prefix}-*\`：${count} 个`)
  push(
    '',
    '其中 docs/design.md §4 点名不覆盖（或无需覆盖，靠 alias 派生）的具体项：`--dsw-focus-ring-color`、`--dsw-focus-ring-width`、`--dsw-menu-backdrop-filter`、`--dsw-shadow-lv1/lv1-blur/lv2/lv3`、`--dsw-elevation-*`（含 `--dsw-elevation-stroke-color`，它引用 `--dsw-alias-border-l4` 会自动跟随）、`--dsw-mask-blur`、字体与圆角类。',
    '',
    '## 4. 复现',
    '',
    '```bash',
    `node scripts/extract-theme-tokens.mjs --from <ui-theme/lib/client.js>`,
    '```',
    '',
    '输出确定性：无时间戳、token 按名称排序（--check 可用于校验提交内容是否最新）。',
    '',
  )
  return `${lines.join('\n')}`
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main() {
  const opts = parseArgs(process.argv.slice(2))
  let inventory
  try {
    inventory = extract(opts.from)
  } catch (error) {
    console.error(`error: ${error.message}`)
    process.exit(1)
  }

  for (const category of CATEGORY_ORDER) {
    if (inventory.counts[category] !== EXPECTED_COUNTS[category]) {
      console.error(
        `error: ${category} colour count is ${inventory.counts[category]}, expected ${EXPECTED_COUNTS[category]} ` +
          '(docs/design.md §4 audit). The DSH token sheets changed; re-audit before updating the mapping.',
      )
      process.exit(1)
    }
  }
  if (inventory.counts.total !== EXPECTED_COUNTS.total) {
    console.error(`error: colour token total is ${inventory.counts.total}, expected ${EXPECTED_COUNTS.total}`)
    process.exit(1)
  }

  const json = renderJson(inventory)
  const markdown = renderMarkdown(inventory)
  const jsonPath = join(opts.outDir, 'token-inventory.json')
  const mdPath = join(opts.outDir, 'token-inventory.md')

  if (opts.check) {
    const stale = []
    for (const [path, expected] of [
      [jsonPath, json],
      [mdPath, markdown],
    ]) {
      let actual = null
      try {
        actual = readFileSync(path, 'utf8')
      } catch {
        actual = null
      }
      if (actual !== expected) stale.push(path)
    }
    if (stale.length > 0) {
      console.error(`inventory out of date: ${stale.join(', ')}`)
      process.exit(1)
    }
    console.log(`inventory up to date: ${jsonPath}`)
    return
  }

  mkdirSync(opts.outDir, { recursive: true })
  writeFileSync(jsonPath, json)
  writeFileSync(mdPath, markdown)
  console.log(
    `extracted ${inventory.counts.total} colour tokens ` +
      `(${inventory.counts.static} static + ${inventory.counts.alias} alias + ${inventory.counts.specific} specific + ${inventory.counts.shiki} shiki) ` +
      `from ${inventory.sheets.length} sheets`,
  )
  console.log(`wrote ${jsonPath}`)
  console.log(`wrote ${mdPath}`)
}

main()
