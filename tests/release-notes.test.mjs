/**
 * Tests for `scripts/release-notes.mjs` — the CHANGELOG section extractor that
 * feeds the GitHub Release body, and therefore dsh-market's "更新内容" dialog
 * (see docs/releasing.md §5).
 *
 * The contract publish.yml depends on: a section starts at `## [<version>]`
 * (bracketless and link-suffixed headings read too), ends at the next level-2
 * heading, matches the version exactly (a prerelease never answers its release
 * line), and exists non-empty for the version this checkout declares.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extractReleaseNotes, readPackageVersion } from '../scripts/release-notes.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = join(ROOT, 'CHANGELOG.md')

const SAMPLE = `# Changelog

Intro line that belongs to no version.

## [Unreleased]

### Changed

- work in progress

## [1.3.0-rc.1] - 2026-02-02

### Added

- prerelease note

## [1.2.0] - 2026-02-01

### Added

- a new thing

### Fixed

- a bug

## [1.1.0] - 2026-01-01

- older note
`

test('extracts exactly one version, heading excluded and the next section cut', () => {
  assert.equal(extractReleaseNotes(SAMPLE, '1.2.0'), '### Added\n\n- a new thing\n\n### Fixed\n\n- a bug')
})

test('unknown versions have no section', () => {
  assert.equal(extractReleaseNotes(SAMPLE, '9.9.9'), null)
  assert.equal(extractReleaseNotes(SAMPLE, '1.2'), null)
})

test('the version match is exact: a prerelease does not answer its release line', () => {
  assert.equal(extractReleaseNotes(SAMPLE, '1.3.0-rc.1'), '### Added\n\n- prerelease note')
  assert.equal(extractReleaseNotes(SAMPLE, '1.3.0'), null)
  // And the release section above it does not inherit the prerelease content.
  assert.ok(!extractReleaseNotes(SAMPLE, '1.2.0').includes('prerelease'))
})

test('an empty section extracts as the empty string, not as a hit', () => {
  const markdown = '## [1.2.0] - 2026-02-01\n\n## [1.1.0] - 2026-01-01\n\n- older\n'
  assert.equal(extractReleaseNotes(markdown, '1.2.0'), '')
})

test('bracketless and link-suffixed headings are accepted', () => {
  assert.equal(extractReleaseNotes('## v2.0.0 - 2026-03-01\n\n- note\n', '2.0.0'), '- note')
  assert.equal(extractReleaseNotes('## [2.0.0](https://example.com/cmp) - 2026-03-01\n\n- note\n', '2.0.0'), '- note')
})

test('CRLF changelogs normalize to LF and trim surrounding blank lines', () => {
  const markdown = '## [1.0.0] - 2026-01-01\r\n\r\n- note one\r\n- note two\r\n\r\n## [0.9.0] - 2025-12-01\r\n\r\n- old\r\n'
  assert.equal(extractReleaseNotes(markdown, '1.0.0'), '- note one\n- note two')
})

test('this checkout declares a version whose section exists', () => {
  const version = readPackageVersion(ROOT)
  const notes = extractReleaseNotes(readFileSync(CHANGELOG, 'utf8'), version)
  assert.notEqual(notes, null, `CHANGELOG.md has no section for ${version} (package.json)`)
  assert.notEqual(notes, '', `CHANGELOG.md section for ${version} is empty`)
})

test('every released version heading in the real CHANGELOG round-trips', () => {
  const markdown = readFileSync(CHANGELOG, 'utf8')
  const versions = [...markdown.matchAll(/^##\s+\[?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?/gm)].map((m) => m[1])
  assert.ok(versions.length > 0, 'CHANGELOG.md has no version headings')
  for (const version of versions) {
    const notes = extractReleaseNotes(markdown, version)
    assert.ok(notes !== null && notes !== '', `CHANGELOG.md section for ${version} failed to extract`)
  }
})
