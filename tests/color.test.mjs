import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  alpha,
  contrastRatio,
  hexToRgb,
  interpolateRamp,
  isHex,
  mix,
  relativeLuminance,
  rgbToHex
} from '../src/color.js'

test('isHex accepts the four CSS hex forms and rejects everything else', () => {
  for (const value of ['#fff', '#ffff', '#ffffff', '#ffffffff', '#AbC', '#12345678']) {
    assert.equal(isHex(value), true, value)
  }
  for (const value of ['fff', '#ggg', '#12345', '#1234567', 'rgb(0,0,0)', '', null, undefined, 123]) {
    assert.equal(isHex(value), false, String(value))
  }
})

test('hexToRgb expands short forms, parses alpha and throws on invalid input', () => {
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255, a: 1 })
  assert.deepEqual(hexToRgb('#0000'), { r: 0, g: 0, b: 0, a: 0 })
  assert.deepEqual(hexToRgb('#1E2326'), { r: 30, g: 35, b: 38, a: 1 })
  assert.deepEqual(hexToRgb('#22c55e14'), { r: 0x22, g: 0xc5, b: 0x5e, a: 0x14 / 255 })
  assert.throws(() => hexToRgb('nope'), TypeError)
  assert.throws(() => hexToRgb('#12'), TypeError)
})

test('rgbToHex emits 6 digits when opaque and 8 digits when translucent', () => {
  assert.equal(rgbToHex({ r: 255, g: 255, b: 255, a: 1 }), '#ffffff')
  assert.equal(rgbToHex({ r: 34, g: 197, b: 94, a: 1 }), '#22c55e')
  assert.equal(rgbToHex({ r: 34, g: 197, b: 94, a: 20 / 255 }), '#22c55e14')
  assert.equal(rgbToHex({ r: 300, g: -20, b: 12.6, a: 2 }), '#ff000d')
  // Round trip for every form.
  for (const value of ['#1e2326', '#22c55e14', '#ffffff', '#00000080']) {
    const rgba = hexToRgb(value)
    const opaque = value.length === 7
    assert.equal(rgbToHex(opaque ? { ...rgba, a: 1 } : rgba), value)
  }
})

test('alpha always returns an 8-digit hex and clamps the ratio', () => {
  assert.equal(alpha('#22c55e', 0.08), '#22c55e14')
  assert.equal(alpha('#22c55e', 0.12), '#22c55e1f')
  assert.equal(alpha('#ff0000', 0), '#ff000000')
  assert.equal(alpha('#ff0000', 1), '#ff0000ff')
  assert.equal(alpha('#ff0000', 3), '#ff0000ff')
  assert.equal(alpha('#ff0000', -1), '#ff000000')
  // The alpha segment is replaced, not multiplied.
  assert.equal(alpha('#22c55e80', 0.08), '#22c55e14')
  assert.throws(() => alpha('#fff', Number.NaN), TypeError)
})

test('mix interpolates channels and clamps t', () => {
  assert.equal(mix('#000000', '#ffffff', 0), '#000000')
  assert.equal(mix('#000000', '#ffffff', 1), '#ffffff')
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080')
  assert.equal(mix('#ff0000', '#0000ff', 0.25), '#bf0040')
  assert.equal(mix('#000000', '#ffffff', -1), '#000000')
  assert.equal(mix('#000000', '#ffffff', 2), '#ffffff')
  // Alpha interpolates as well; opaque mixes keep 6 digits.
  assert.equal(mix('#22c55e', '#22c55e', 0.5).length, 7)
  assert.equal(mix('#22c55e14', '#22c55e', 0.5).length, 9)
  assert.throws(() => mix('#000', '#fff', Number.NaN), TypeError)
})

test('interpolateRamp clamps at the ends and interpolates between stops', () => {
  const stops = [
    { t: 0, color: '#000000' },
    { t: 0.5, color: '#ffffff' },
    { t: 1, color: '#ff0000' }
  ]
  assert.equal(interpolateRamp(stops, -1), '#000000')
  assert.equal(interpolateRamp(stops, 0), '#000000')
  assert.equal(interpolateRamp(stops, 0.5), '#ffffff')
  assert.equal(interpolateRamp(stops, 2), '#ff0000')
  assert.equal(interpolateRamp(stops, 0.25), '#808080')
  assert.equal(interpolateRamp(stops, 0.75), '#ff8080')
  assert.throws(() => interpolateRamp([], 0.5), TypeError)
  assert.throws(() => interpolateRamp(stops, Number.NaN), TypeError)
})

test('relativeLuminance matches the WCAG anchors', () => {
  assert.equal(relativeLuminance('#ffffff'), 1)
  assert.equal(relativeLuminance('#000000'), 0)
  assert.equal(relativeLuminance('#ff0000'), 0.2126)
  assert.equal(relativeLuminance('#00ff00'), 0.7152)
  assert.equal(relativeLuminance('#0000ff'), 0.0722)
  assert.equal(relativeLuminance('#fff'), 1)
  assert.ok(relativeLuminance('#777777') < relativeLuminance('#888888'))
})

test('contrastRatio returns WCAG ratios, 21 for black on white, 1 for equal colours', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21)
  assert.equal(contrastRatio('#ffffff', '#000000'), 21)
  assert.equal(contrastRatio('#123456', '#123456'), 1)
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1)
  assert.equal(contrastRatio('#767676', '#ffffff').toFixed(2), '4.54')
  assert.equal(contrastRatio('#777777', '#ffffff').toFixed(2), '4.48')
  // Symmetric and always within [1, 21].
  for (const [a, b] of [['#1E2326', '#D3C6AA'], ['#FFFBEF', '#5C6A72'], ['#BEC5B2', '#333C43']]) {
    const forward = contrastRatio(a, b)
    assert.equal(forward, contrastRatio(b, a))
    assert.ok(forward >= 1 && forward <= 21)
  }
})
