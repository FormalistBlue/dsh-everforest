#!/usr/bin/env node
/**
 * Build `client.js` from the plain-ESM sources in `src/`, with no dependencies
 * and no toolchain.
 *
 * The Client module loader expects exactly one entry point:
 *
 *     window.__ModuleLoader__.load({ id: '<package name>', factory(require) { ... } })
 *
 * The sources are authored as ordinary ES modules so `node --test` can import
 * them directly. This script removes the single-line relative imports and the
 * `export` keywords, wraps every source in its own IIFE (so top-level names
 * never collide across files, exactly like real modules), destructures each
 * module's imports from the earlier module object, and returns the entry
 * module's exports from the factory. Anything outside that tiny subset of
 * module syntax fails the build instead of being silently mis-bundled. In
 * particular a multi-declarator `export const a = 1, b = 2` is rejected: the
 * module table can carry only one name per declaration, so bundling it would
 * silently drop `b` from the module's exports.
 *
 * Usage:
 *   node scripts/build.mjs            write client.js (production bundle)
 *   node scripts/build.mjs --dev      write client.js with the dev panel
 *   node scripts/build.mjs --check    fail when client.js is stale (no write)
 *   node scripts/build.mjs --quiet    write without the success line
 *
 * The development bundle is not a separate file: `--dev` adds
 * `src/dev-panel.js` to the module list and keeps the `// @dev-only:` blocks
 * that the production build strips out of `src/client-entry.js`. Everything
 * else is byte-identical, so `--check` (and therefore CI / `prepack`) always
 * verifies the production artifact and refuses a checked-in dev build.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'client.js')
const PACKAGE_ID = 'dsh-everforest'

/** Dependency order: a module may only import modules earlier in this list. */
const SOURCES = [
  'palette.js',
  'color.js',
  'tokens.js',
  'color-mode.js',
  'selection.js',
  'active-session.js',
  'state.js',
  'durable.js',
  'locale.js',
  'settings-page.js',
  'theme-spotlight.js',
  'client-entry.js',
]

/**
 * Development bundle module order: `src/dev-panel.js` is inserted directly
 * before the entry, so it obeys the same "dependencies come earlier" rule as
 * every other module. The production bundle leaves it out entirely.
 */
const DEV_SOURCES = [
  ...SOURCES.slice(0, -1),
  'dev-panel.js',
  'client-entry.js',
]

/** Lines that delimit code existing only in the development bundle. */
const DEV_BLOCK_START = /^\s*\/\/ @dev-only:start\s*$/
const DEV_BLOCK_END = /^\s*\/\/ @dev-only:end\s*$/

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check') || args.has('-C')
const dev = args.has('--dev') || args.has('-D')
const quiet = args.has('--quiet') || args.has('-q')

/** A bundling rule violation; the CLI turns it into `build: <message>` + exit 1. */
export class BuildError extends Error {}

export function fail(message) {
  throw new BuildError(message)
}

/**
 * True when the rest of an `export const/let` line declares another binding.
 *
 * Only the part after the first name is scanned. Parentheses / brackets /
 * braces and strings are skipped, so commas inside initializers
 * (`f(a, b)`, `['x', 'y']`, `'a,b'`) do not count; a top-level comma means the
 * statement has a second declarator that the one-name bundle export would drop.
 *
 * @param {string} rest - the statement text after the exported name.
 * @returns {boolean}
 */
function hasSecondDeclarator(rest) {
  let depth = 0
  let quote = null
  for (let index = 0; index < rest.length; index += 1) {
    const char = rest[index]
    if (quote !== null) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1
      continue
    }
    if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (char === '/' && rest[index + 1] === '/') return false
    if (depth === 0 && char === ',') return true
  }
  return false
}

/**
 * Apply the `// @dev-only:start` / `// @dev-only:end` markers of one module.
 *
 * With `dev: true` the block content is kept and only the marker lines are
 * dropped (the development bundle needs the code); otherwise both the markers
 * and the content are removed (the production bundle must not carry it). An
 * unbalanced pair is a build error, so a typo can neither ship development-only
 * code nor silently drop it from the dev bundle.
 *
 * @param {string} name - file name under src/, used in diagnostics.
 * @param {string} source - module text.
 * @param {{ dev?: boolean }} [options]
 * @returns {string}
 */
export function stripDevBlocks(name, source, options = {}) {
  const keepDevBlocks = options.dev === true
  const lines = source.split('\n')
  const kept = []
  let inside = false
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const where = `src/${name}:${index + 1}`
    if (DEV_BLOCK_START.test(line)) {
      if (inside) fail(`${where}: nested "// @dev-only:start" block`)
      inside = true
      continue
    }
    if (DEV_BLOCK_END.test(line)) {
      if (!inside) fail(`${where}: "// @dev-only:end" without a matching start`)
      inside = false
      continue
    }
    if (keepDevBlocks || !inside) kept.push(line)
  }
  if (inside) fail(`src/${name}: unterminated "// @dev-only:start" block`)
  return kept.join('\n')
}

function readVersion() {
  try {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const IMPORT_LINE = /^import\s*\{([\s\S]+?)\}\s*from\s*'\.\/([A-Za-z0-9._-]+\.js)'\s*;?$/
const EXPORT_DECL = /^export\s+(const|let|class|function|async\s+function)\s+([A-Za-z_$][\w$]*)/

/**
 * Split one source module into imports, exported names, and factory-body lines.
 * @param {string} name - file name under src/, used in diagnostics.
 * @param {string} source - module text.
 * @param {number} order - index of this module in the build's module list.
 * @param {string[]} [sources] - the build's module order; defaults to `SOURCES`
 *   (the production order). `composeBundle` passes the dev order instead.
 * @returns {{ importedModules: Array<{dependency: string, names: string[]}>, exportedNames: string[], body: string }}
 */
export function parseModule(name, source, order, sources = SOURCES) {
  const lines = source.split('\n')
  const body = []
  const importedModules = []
  const exportedNames = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const where = `src/${name}:${index + 1}`
    if (/^\s*import\b/.test(line)) {
      // Catch a bare package import on the statement's first line early: the
      // module table's require() is the only runtime import mechanism.
      const inlineSpecifier = line.match(/from\s*['"]([^'"]+)['"]/)
      if (inlineSpecifier && !inlineSpecifier[1].startsWith('./')) {
        fail(`${where}: bare package import '${inlineSpecifier[1]}' is not bundled; use require('${inlineSpecifier[1]}') at runtime instead`)
      }
      // Imports are the only multi-line construct we support: gather until the
      // `from './x.js'` tail so both one-line and wrapped named imports work.
      let statement = line
      while (!/from\s*'\.\/[A-Za-z0-9._-]+\.js'\s*;?\s*$/.test(statement)) {
        index += 1
        if (index >= lines.length) fail(`${where}: unterminated import statement`)
        statement += `\n${lines[index]}`
      }
      const match = statement.match(IMPORT_LINE)
      if (!match) {
        const specifier = statement.match(/from\s*['"]([^'"]+)['"]/)
        if (specifier && !specifier[1].startsWith('./')) {
          fail(`${where}: bare package import '${specifier[1]}' is not bundled; use require('${specifier[1]}') at runtime instead`)
        }
        fail(`${where}: unsupported import; only named imports from './module.js' are bundled`)
      }
      const dependency = match[2]
      const names = match[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      for (const imported of names) {
        // `a as b` is not used in this repo; reject it explicitly.
        if (!/^[A-Za-z_$][\w$]*$/.test(imported)) {
          fail(`${where}: unsupported import binding '${imported}'; use plain named imports`)
        }
      }
      importedModules.push({ dependency, names })
      continue
    }
    if (/^(export\s+default|export\s*\*|export\s*\{)/.test(line)) {
      fail(`${where}: unsupported export form; only "export const/function/class/let" is bundled`)
    }
    const declaration = line.match(EXPORT_DECL)
    if (declaration) {
      // `export const a = 1, b = 2` is legal JS, but the module table below can
      // only return one name per declaration — the extra binding would vanish
      // from the bundle's exports. Reject it instead of silently dropping it.
      if ((declaration[1] === 'const' || declaration[1] === 'let') && hasSecondDeclarator(line.slice(declaration[0].length))) {
        fail(`${where}: one export per declaration; split "export ${declaration[1]} ${declaration[2]} = …, …" into separate exports`)
      }
      exportedNames.push(declaration[2])
      body.push(line.replace(/^export\s+/, ''))
      continue
    }
    if (/^\s*export\b/.test(line)) {
      fail(`${where}: export keyword must start a declaration at column 0`)
    }
    body.push(line)
  }
  for (const { dependency } of importedModules) {
    const dependencyOrder = sources.indexOf(dependency)
    if (dependencyOrder === -1) {
      fail(`src/${name}: import of ${dependency} is not a bundled source`)
    }
    if (dependencyOrder >= order) {
      fail(`src/${name}: import of ${dependency} must come from an earlier source (build order is ${sources.join(', ')})`)
    }
  }
  return { importedModules, exportedNames, body: body.join('\n').replace(/\s+$/, '') }
}

/** Stable, collision-free IIFE variable name for one module. */
function moduleVariable(order, name) {
  return `__mod_${order}_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`
}

/**
 * Compose the Client bundle in memory without touching the disk.
 *
 * The production build (`dev: false`) is the only artifact that may be
 * committed or published: it excludes `src/dev-panel.js` and strips every
 * `// @dev-only:` block. `dev: true` keeps the panel for local debugging.
 *
 * @param {{ dev?: boolean }} [options]
 * @returns {string}
 */
export function composeBundle(options = {}) {
  const useDev = options.dev === true
  const sources = useDev ? DEV_SOURCES : SOURCES
  const modules = sources.map((name, order) => ({
    name,
    order,
    ...parseModule(
      name,
      stripDevBlocks(name, readFileSync(join(ROOT, 'src', name), 'utf8'), { dev: useDev }),
      order,
      sources,
    ),
  }))

  const chunks = []
  for (const module of modules) {
    const variable = moduleVariable(module.order, module.name)
    const lines = [
      `// ---------------------------------------------------------------- src/${module.name}`,
      `const ${variable} = (() => {`,
    ]
    for (const { dependency, names } of module.importedModules) {
      const dependencyModule = modules[sources.indexOf(dependency)]
      lines.push(`  const { ${names.join(', ')} } = ${moduleVariable(dependencyModule.order, dependencyModule.name)}`)
    }
    if (module.importedModules.length > 0) lines.push('')
    lines.push(module.body)
    lines.push('', `  return { ${module.exportedNames.join(', ')} }`, '})()', '')
    chunks.push(lines.join('\n'))
  }

  const entry = modules[modules.length - 1]
  const version = readVersion()
  const header = [
    `/* dsh-everforest v${version} — generated by scripts/build.mjs from src/; do not edit. */`,
    ...(useDev
      ? ['/* DEVELOPMENT BUILD: contains the src/dev-panel.js debug overlay. Run `npm run build` to restore the production bundle before committing or publishing. */']
      : []),
    'window.__ModuleLoader__.load({',
    `  id: '${PACKAGE_ID}',`,
    '  factory(require) {',
    "    'use strict'",
    '',
  ].join('\n')
  const footer = [
    '',
    `    return ${moduleVariable(entry.order, entry.name)}`,
    '  },',
    '})',
    '',
  ].join('\n')
  const output = `${header}${chunks.join('\n')}${footer}`
  return output
}

/**
 * Build (or with `--check`, verify) `client.js`.
 *
 * `--check` always compares against the production composition, so a checked-in
 * development bundle — and with it an accidental publish — fails with a message
 * naming the actual problem.
 *
 * @param {{ dev?: boolean }} [options]
 */
export function build(options = {}) {
  const useDev = options.dev === true
  const output = composeBundle({ dev: useDev })

  if (checkOnly) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
    if (current !== output) {
      // A dev bundle already on disk is a distinct, actionable case: the fix is
      // to restore the production build, not to regenerate a "stale" one.
      if (current !== null && current === composeBundle({ dev: true })) {
        fail('client.js is a development build (it contains the dev panel); run `npm run build` to restore the production bundle before committing or publishing')
      }
      fail('client.js is stale or missing; run `node scripts/build.mjs` and commit the result')
    }
    if (!quiet) console.log('build: client.js is up to date')
    return
  }

  writeFileSync(OUT, output)
  if (!quiet) {
    if (useDev) {
      console.log(`build: wrote client.js (${output.split('\n').length} lines, ${Buffer.byteLength(output)} bytes) as a DEVELOPMENT bundle with the dev panel`)
      console.warn('build: run `npm run build` before committing or publishing; --check, CI and prepack reject this development bundle')
    } else {
      console.log(`build: wrote client.js (${output.split('\n').length} lines, ${Buffer.byteLength(output)} bytes)`)
    }
  }
}

function main() {
  try {
    if (checkOnly && dev) fail('--check always verifies the production bundle; drop --dev (use `npm run build:dev` to write the development bundle)')
    build({ dev })
  } catch (error) {
    if (error instanceof BuildError) {
      console.error(`build: ${error.message}`)
      process.exit(1)
    }
    throw error
  }
}

// Run only when invoked as a script (`node scripts/build.mjs`, `npm run build`,
// or the tests spawning it). Importing the module for its parser must not build
// or exit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
