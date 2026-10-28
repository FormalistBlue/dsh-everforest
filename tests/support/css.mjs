/**
 * Shared helpers for the generated-stylesheet tests. Both `color-mode.test.mjs`
 * and `table-resize.test.mjs` inspect flat CSS strings produced by the plugin, so
 * the tiny parser lives here instead of being copied into each test file.
 */

/**
 * Split a stylesheet into `{ selector, body }` rules (the generated sheets have
 * no nesting, at-rules or comments).
 * @param {string} css
 * @returns {Array<{ selector: string, body: string }>}
 */
export function styleRules (css) {
  const rules = []
  for (const match of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    rules.push({ selector: match[1].trim(), body: match[2].trim() })
  }
  return rules
}

/**
 * Parse one rule body into a `name → value` map.
 * @param {string} body
 * @returns {Map<string, string>}
 */
export function declarationsOf (body) {
  const declarations = new Map()
  for (const part of body.split(';')) {
    const declaration = part.trim()
    if (declaration === '') continue
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim())
  }
  return declarations
}
