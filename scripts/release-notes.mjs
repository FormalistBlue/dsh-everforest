#!/usr/bin/env node
/**
 * Extract one version's CHANGELOG.md section as the GitHub Release body.
 *
 * Why this exists: dsh-market's "更新内容" dialog shows the latest GitHub
 * Release *body* — it never reads CHANGELOG.md (the body travels through the
 * catalog's daily probe, `dsh-plugin-updates`). `gh release create
 * --generate-notes` only summarizes merged PRs; for a repo that commits
 * straight to main it emits a bare "**Full Changelog**" link, so the market
 * had nothing to show. The changelog is the document the release notes are
 * actually written in, so the body is derived from it here instead.
 *
 * The section starts at `## [<version>]` (bracketless `## v<version> - …` and
 * a trailing link both read too) and ends at the next level-2 heading. The
 * version match is exact: a prerelease section never answers its release line.
 *
 * Usage:
 *   node scripts/release-notes.mjs [--version <x.y.z>] [--file <CHANGELOG.md>]
 *                                  [--out <path>] [--check]
 *
 *   --version  version to extract (default: package.json#version)
 *   --file     changelog to read (default: CHANGELOG.md beside package.json)
 *   --out      write the body to a file (`gh release create --notes-file`)
 *   --check    only verify the section exists and is non-empty; no stdout body
 *
 * Missing or empty sections exit 1 — that is the failure mode this script
 * exists to prevent, and publish.yml runs it before `npm publish`. Without
 * --out the body goes to stdout (safe to redirect).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_FILE = join(ROOT, 'CHANGELOG.md')

/**
 * dsh-market previews the first 4 KB of a release body (the catalog probe caps
 * it there); the full section still lives on the GitHub Release page. Warn
 * rather than trim: the release body is not the place to lose history.
 */
const MARKET_PREVIEW_BYTES = 4 * 1024

/** A CLI misuse — distinct from a changelog problem (exit 2 vs 1). */
class UsageError extends Error {}

const USAGE = `Usage: node scripts/release-notes.mjs [options]

  --version <x.y.z>      version to extract (default: package.json#version)
  --file <path>          changelog to read (default: CHANGELOG.md)
  --out <path>           write the release body to this file
  --check                only verify the section exists (publish.yml gate)
  --help                 show this help`

/** Escape a literal for use inside a RegExp source. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The body of one version's section, without the heading.
 *
 * @param markdown - CHANGELOG.md content (CRLF or LF).
 * @param version - exact version string, e.g. `0.4.0` or `0.5.0-rc.1`.
 * @returns the trimmed body, `''` when the heading exists but the section is
 *   empty, or `null` when no heading names this version.
 */
export function extractReleaseNotes(markdown, version) {
  if (typeof markdown !== 'string' || typeof version !== 'string' || version === '') return null
  const lines = markdown.split(/\r?\n/)
  const heading = new RegExp(`^##\\s+v?\\[?${escapeRegExp(version)}\\]?(?=[\\s(]|$)`)
  let start = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (heading.test(lines[i])) {
      start = i
      break
    }
  }
  if (start === -1) return null
  // The section ends at the next level-2 heading (`###` subsections stay in).
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i
      break
    }
  }
  return lines.slice(start + 1, end).join('\n').trim()
}

/** The version of the package at `root` (default: this checkout). */
export function readPackageVersion(root = ROOT) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (typeof pkg.version !== 'string' || pkg.version === '') {
    throw new Error(`${join(root, 'package.json')} carries no version`)
  }
  return pkg.version
}

/** Parse argv into options; throws UsageError on anything unrecognized. */
function parseArgs(argv) {
  const options = { version: null, file: DEFAULT_FILE, out: null, check: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--check') {
      options.check = true
      continue
    }
    const match = /^--(version|file|out)(?:=(.*))?$/.exec(arg)
    if (match === null) throw new UsageError(`unknown argument: ${arg}`)
    const value = match[2] ?? argv[++i]
    if (value === undefined || value === '') throw new UsageError(`--${match[1]} needs a value`)
    options[match[1]] = value
  }
  return options
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.help) {
      console.log(USAGE)
      return
    }
    const version = options.version ?? readPackageVersion()
    const file = resolve(options.file)
    const markdown = readFileSync(file, 'utf8')
    const notes = extractReleaseNotes(markdown, version)
    if (notes === null) {
      throw new Error(`${file} has no "## [${version}]" section — add one before tagging (docs/releasing.md §4)`)
    }
    if (notes === '') {
      throw new Error(`the ${version} section in ${file} is empty — write down what changed before tagging`)
    }
    const body = `${notes}\n`
    const bytes = Buffer.byteLength(body)
    if (options.out !== null) {
      writeFileSync(resolve(options.out), body)
      if (!options.check) console.error(`release-notes: wrote ${bytes} bytes for ${version} to ${options.out}`)
    } else if (!options.check) {
      process.stdout.write(body)
    }
    if (options.check) {
      console.error(`release-notes: ${file} has ${bytes} bytes of notes for ${version}`)
    }
    if (bytes > MARKET_PREVIEW_BYTES) {
      console.error(
        `release-notes: note: dsh-market previews the first ${MARKET_PREVIEW_BYTES} bytes of a release body; `
        + `the full section stays on the GitHub Release`,
      )
    }
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`release-notes: ${error.message}\n\n${USAGE}`)
      process.exit(2)
    }
    console.error(`release-notes: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// Run only when invoked as a script; importing the extractor must not exit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
