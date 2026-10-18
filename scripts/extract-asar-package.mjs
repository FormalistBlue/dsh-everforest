#!/usr/bin/env node
/**
 * Extract one directory out of an Electron `asar` archive, with no dependencies.
 *
 * The DSH Desktop install ships its implementation inside
 * `resources/app.asar`; shell tools cannot read paths inside it, but a Node
 * script can parse the archive container. This is the helper referenced by the
 * token-inventory workflow (`scripts/extract-theme-tokens.mjs`).
 *
 * Usage:
 *   node scripts/extract-asar-package.mjs \
 *     --asar "<DSH>/resources/app.asar" \
 *     --path dsh/node_modules/@deepseek-ai/dsh-client-ui-theme \
 *     --out "$env:TEMP/dsh-ui-theme"
 *
 * `--path` is the path inside the archive, with forward slashes (scoped package
 * names work as-is). The container layout observed in Electron's `app.asar`:
 *   uint32LE @0  size of the leading pickle header (4)
 *   uint32LE @4  header region size; the JSON file table ends at 8 + this value
 *   JSON table   starts at the first `{` after offset 8 (a small length prefix
 *                precedes it); file contents start where the table ends.
 *   each file entry has `offset` (relative to the data start) and `size`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

function usage(error) {
  console.error(`error: ${error}\n`)
  console.error(
    'Usage: node scripts/extract-asar-package.mjs --asar <app.asar> --path <inside/asar/dir> --out <dir>\n'
    + '  --asar  path to the Electron asar archive\n'
    + '  --path  directory inside the archive (forward slashes)\n'
    + '  --out   destination directory (created if missing)'
  )
  process.exit(2)
}

function parseArgs(argv) {
  const options = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--asar' || flag === '--path' || flag === '--out') {
      if (!value) usage(`${flag} requires a value`)
      options[flag.slice(2)] = value
      i++
    } else if (flag === '--help' || flag === '-h') {
      usage('help requested')
    } else {
      usage(`unknown argument: ${flag}`)
    }
  }
  for (const required of ['asar', 'path', 'out']) {
    if (!options[required]) usage(`missing --${required}`)
  }
  return options
}

function readArchive(path) {
  let buffer
  try {
    buffer = readFileSync(path)
  } catch (error) {
    usage(`cannot read ${path}: ${error.message}`)
  }
  if (buffer.length < 16) usage('archive is too small to be an asar file')
  const headerSize = buffer.readUInt32LE(4)
  const dataOffset = 8 + headerSize
  const jsonStart = buffer.indexOf(0x7b /* '{' */, 8)
  if (jsonStart === -1 || jsonStart >= dataOffset) usage('cannot locate the asar header JSON')
  let header
  try {
    header = JSON.parse(buffer.subarray(jsonStart, dataOffset).toString('utf8'))
  } catch {
    usage(`cannot parse the asar header in ${path} (not an asar archive?)`)
  }
  if (!header || typeof header.files !== 'object' || header.files === null) {
    usage('asar header has no file table')
  }
  if (dataOffset > buffer.length) usage('asar header size exceeds the archive length')
  return { buffer, header, dataOffset }
}

/** Resolve `a/b/c` inside the archive header file table. */
function lookup(header, archivePath) {
  const parts = archivePath.split('/').filter((part) => part !== '')
  let node = header
  for (const part of parts) {
    if (part === '..') usage('--path must not contain ".."')
    const next = node.files && node.files[part]
    if (!next) usage(`path not found in archive: ${parts.join('/')}`)
    node = next
  }
  return node
}

function extract({ buffer, header, dataOffset }, archivePath, outDir) {
  const root = lookup(header, archivePath)
  const stats = { files: 0, bytes: 0, skipped: 0 }

  function writeNode(node, relativePath) {
    if (node.files) {
      mkdirSync(join(outDir, relativePath), { recursive: true })
      for (const [name, child] of Object.entries(node.files)) {
        if (name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
          usage(`invalid entry name in the archive file table: ${JSON.stringify(name)}`)
        }
        writeNode(child, relativePath ? `${relativePath}/${name}` : name)
      }
      return
    }
    if (node.link !== undefined || node.unpacked) {
      console.warn(`skipping unsupported entry (link/unpacked): ${relativePath}`)
      stats.skipped++
      return
    }
    // asar stores offsets/sizes as strings in this Electron version.
    const offset = Number(node.offset)
    const size = Number(node.size)
    const start = dataOffset + offset
    const end = start + size
    if (!Number.isInteger(offset) || !Number.isInteger(size) || start < 0 || end > buffer.length) {
      usage(`corrupt file entry for ${relativePath}`)
    }
    const target = join(outDir, relativePath.split('/').join(sep))
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, buffer.subarray(start, end))
    stats.files++
    stats.bytes += size
  }

  writeNode(root, '')
  return stats
}

const options = parseArgs(process.argv.slice(2))
const archive = readArchive(resolve(options.asar))
const stats = extract(archive, options.path, resolve(options.out))
console.log(
  `extracted ${stats.files} files (${stats.bytes} bytes) from ${options.path} into ${resolve(options.out)}`
)
if (stats.skipped > 0) console.warn(`${stats.skipped} unsupported entries were skipped`)
