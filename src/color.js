// Pure colour helpers for the Everforest token layer.
//
// No palette data lives here: this module only converts between `#hex` strings
// and channels, blends colours, interpolates ramps and computes WCAG contrast.
// `src/tokens.js` owns all mapping decisions; `scripts/check-contrast.mjs` and
// the unit tests consume the math below.
//
// Conventions: every colour input is a CSS hex string (`#rgb`, `#rgba`,
// `#rrggbb` or `#rrggbbaa`, case-insensitive). Missing alpha is treated as 1.

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 * Channels `r`/`g`/`b` are 0-255 integers, `a` is a 0-1 number.
 */

/**
 * True for a syntactically valid CSS hex colour (`#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa`, case-insensitive).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHex (value) {
  return typeof value === 'string' && HEX_RE.test(value)
}

/**
 * Expand a hex colour string into channels.
 * @param {string} hex
 * @returns {Rgba}
 */
export function hexToRgb (hex) {
  if (!isHex(hex)) throw new TypeError(`hexToRgb: not a hex colour: ${String(hex)}`)
  let digits = hex.slice(1)
  if (digits.length === 3 || digits.length === 4) {
    digits = digits
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const r = parseInt(digits.slice(0, 2), 16)
  const g = parseInt(digits.slice(2, 4), 16)
  const b = parseInt(digits.slice(4, 6), 16)
  const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

/**
 * Serialize channels to a lowercase hex string; `#rrggbb` for opaque colours and
 * `#rrggbbaa` when the alpha channel is not fully opaque.
 * @param {Rgba} rgba
 * @returns {string}
 */
export function rgbToHex (rgba) {
  const channel = (value, max) => Math.max(0, Math.min(max, Math.round(value)))
  const hex = (value) => channel(value, 255).toString(16).padStart(2, '0')
  const a = channel(rgba.a * 255, 255)
  return `#${hex(rgba.r)}${hex(rgba.g)}${hex(rgba.b)}${a === 255 ? '' : hex(a)}`
}

/**
 * Replace a colour's alpha channel (0 = transparent, 1 = opaque).
 * Always returns an 8-digit hex string, as required for the four alpha static
 * tokens and every translucent border / overlay token.
 * @param {string} hex
 * @param {number} ratio alpha in 0-1
 * @returns {string}
 */
export function alpha (hex, ratio) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) {
    throw new TypeError(`alpha: ratio must be a number, got ${String(ratio)}`)
  }
  const { r, g, b } = hexToRgb(hex)
  const channel = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  const a = Math.round(Math.max(0, Math.min(1, ratio)) * 255)
  return `#${channel(r)}${channel(g)}${channel(b)}${channel(a)}`
}

/**
 * Blend two colours: `t = 0` returns `a`, `t = 1` returns `b`.
 * Interpolation is per-channel in sRGB (the same model as CSS `color-mix` in
 * sRGB), including the alpha channel; the result drops the alpha segment when
 * both inputs are opaque.
 * @param {string} a
 * @param {string} b
 * @param {number} t
 * @returns {string}
 */
export function mix (a, b, t) {
  if (typeof t !== 'number' || Number.isNaN(t)) {
    throw new TypeError(`mix: t must be a number, got ${String(t)}`)
  }
  const from = hexToRgb(a)
  const to = hexToRgb(b)
  const ratio = Math.max(0, Math.min(1, t))
  const channel = (x, y) => Math.round(x + (y - x) * ratio)
  return rgbToHex({
    r: channel(from.r, to.r),
    g: channel(from.g, to.g),
    b: channel(from.b, to.b),
    a: from.a + (to.a - from.a) * ratio
  })
}

/**
 * Piecewise-linear interpolation over ramp stops.
 * `stops` must be an array of `{ t, color }` sorted by ascending `t` (0-1).
 * Values below the first / above the last stop clamp to the endpoint colours.
 * @param {Array<{ t: number, color: string }>} stops
 * @param {number} t position on the ramp, 0-1
 * @returns {string}
 */
export function interpolateRamp (stops, t) {
  if (!Array.isArray(stops) || stops.length === 0) {
    throw new TypeError('interpolateRamp: stops must be a non-empty array')
  }
  if (typeof t !== 'number' || Number.isNaN(t)) {
    throw new TypeError(`interpolateRamp: t must be a number, got ${String(t)}`)
  }
  const sorted = stops
  if (t <= sorted[0].t) return rgbToHex(hexToRgb(sorted[0].color))
  if (t >= sorted[sorted.length - 1].t) return rgbToHex(hexToRgb(sorted[sorted.length - 1].color))
  for (let i = 1; i < sorted.length; i++) {
    const right = sorted[i]
    if (t > right.t) continue
    const left = sorted[i - 1]
    const span = right.t - left.t
    if (span === 0) return rgbToHex(hexToRgb(right.color))
    return mix(left.color, right.color, (t - left.t) / span)
  }
  return rgbToHex(hexToRgb(sorted[sorted.length - 1].color))
}

/**
 * WCAG 2.x relative luminance of a colour (alpha ignored; translucent colours
 * should be composited before measuring contrast).
 * @param {string} color hex
 * @returns {number} 0-1
 */
export function relativeLuminance (color) {
  const { r, g, b } = hexToRgb(color)
  const linear = (value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/**
 * WCAG 2.x contrast ratio between two opaque colours (1-21).
 * @param {string} foreground hex
 * @param {string} background hex
 * @returns {number}
 */
export function contrastRatio (foreground, background) {
  const one = relativeLuminance(foreground)
  const two = relativeLuminance(background)
  const lighter = Math.max(one, two)
  const darker = Math.min(one, two)
  return (lighter + 0.05) / (darker + 0.05)
}
