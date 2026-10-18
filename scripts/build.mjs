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
 * module syntax fails the build instead of being silently mis-bundled.
 *
 * Usage:
 *   node scripts/build.mjs            write client.js
 *   node scripts/build.mjs --check    fail when client.js is stale (no write)
 *   node scripts/build.mjs --quiet    write without the success line
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'client.js')
const PACKAGE_ID = 'dsh-everforest'

/** Dependency order: a module may only import modules earlier in this list. */
const SOURCES = [
  'palette.js',
  'color.js',
  'tokens.js',
  'state.js',
  'locale.js',
  'settings-page.js',
  'client-entry.js',
]

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check') || args.has('-C')
const quiet = args.has('--quiet') || args.has('-q')

function fail(message) {
  console.error(`build: ${message}`)
  process.exit(1)
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
 * @param {number} order - index of this module in SOURCES.
 */
function parseModule(name, source, order) {
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
    const dependencyOrder = SOURCES.indexOf(dependency)
    if (dependencyOrder === -1) {
      fail(`src/${name}: import of ${dependency} is not a bundled source`)
    }
    if (dependencyOrder >= order) {
      fail(`src/${name}: import of ${dependency} must come from an earlier source (build order is ${SOURCES.join(', ')})`)
    }
  }
  return { importedModules, exportedNames, body: body.join('\n').replace(/\s+$/, '') }
}

/** Stable, collision-free IIFE variable name for one module. */
function moduleVariable(order, name) {
  return `__mod_${order}_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`
}

function build() {
  const modules = SOURCES.map((name, order) => ({
    name,
    order,
    ...parseModule(name, readFileSync(join(ROOT, 'src', name), 'utf8'), order),
  }))

  const chunks = []
  for (const module of modules) {
    const variable = moduleVariable(module.order, module.name)
    const lines = [
      `// ---------------------------------------------------------------- src/${module.name}`,
      `const ${variable} = (() => {`,
    ]
    for (const { dependency, names } of module.importedModules) {
      const dependencyModule = modules[SOURCES.indexOf(dependency)]
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

  if (checkOnly) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
    if (current !== output) {
      fail('client.js is stale or missing; run `node scripts/build.mjs` and commit the result')
    }
    if (!quiet) console.log('build: client.js is up to date')
    return
  }

  writeFileSync(OUT, output)
  if (!quiet) {
    console.log(`build: wrote client.js (${output.split('\n').length} lines, ${Buffer.byteLength(output)} bytes)`)
  }
}

build()
