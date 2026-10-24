/**
 * Client-side locale dictionaries for the Everforest Settings page.
 *
 * Registered through the Client locale service as namespace
 * `settings.everforest` under the built-in locale ids `zh` and `en`
 * (`zh-CN` is only the document language mapping, not a registration key).
 * English is the key-set source of truth: `EN` and `ZH` must always expose the
 * same keys (checked by `tests/settings-page.test.mjs`).
 *
 * The 18 keys cover the Appearance control, the two strength groups, the
 * current-choice row and the restore-defaults action. Color mode has no copy:
 * it ships as a default feature with no switch since 2026-10-24 (the five
 * `colorMode.*` keys of 0.4.x were removed with the control).
 *
 * Placeholders use the DSH locale syntax `{name}`; the Settings page expands
 * them itself so a fallback translator that only returns plain strings still
 * renders readable copy.
 */

/** Locale namespace owned by this plugin. */
export const NS = 'settings.everforest'

/** English dictionary — the key-set source of truth. */
export const EN = {
  'nav.title': 'Everforest',

  'appearance.title': 'Appearance',
  'appearance.label': 'Appearance preference',
  'appearance.system': 'Follow system',
  'appearance.dark': 'Dark',
  'appearance.light': 'Light',

  'group.dark': 'Dark',
  'group.light': 'Light',

  'strength.hard': 'Hard',
  'strength.medium': 'Medium',
  'strength.soft': 'Soft',

  'current.label': 'Current choice',
  'current.summary': 'Current: {dark} · {light}',
  'current.active': 'Active appearance',
  'current.system': 'following system',

  'reset': 'Restore defaults',

  'aria.card': '{scheme} {strength} palette',
  'aria.group': '{scheme} palettes',
}

/** Simplified Chinese dictionary, complete against the English key set. */
export const ZH = {
  'nav.title': 'Everforest',

  'appearance.title': '外观',
  'appearance.label': '外观偏好',
  'appearance.system': '跟随系统',
  'appearance.dark': '深色',
  'appearance.light': '浅色',

  'group.dark': '深色',
  'group.light': '浅色',

  'strength.hard': 'Hard',
  'strength.medium': 'Medium',
  'strength.soft': 'Soft',

  'current.label': '当前选择',
  'current.summary': '当前：{dark} · {light}',
  'current.active': '实际界面',
  'current.system': '跟随系统',

  'reset': '恢复默认',

  'aria.card': '{scheme} {strength} 配色',
  'aria.group': '{scheme}配色',
}
