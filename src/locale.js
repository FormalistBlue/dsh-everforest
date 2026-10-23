/**
 * Client-side locale dictionaries for the Everforest Settings page.
 *
 * Registered through the Client locale service as namespace
 * `settings.everforest` under the built-in locale ids `zh` and `en`
 * (`zh-CN` is only the document language mapping, not a registration key).
 * English is the key-set source of truth: `EN` and `ZH` must always expose the
 * same keys (checked by `tests/settings-page.test.mjs`).
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

  'colorMode.title': 'Color mode',
  'colorMode.desc': 'Color mode tints chat Markdown content and session-record status rows with the Everforest accents: headings, list markers, quotes, table bands, checkboxes and status dots/rows. Everything else keeps the normal palette.',
  'colorMode.on': 'on',
  'colorMode.off': 'off',
  'colorMode.switch': 'Color mode, currently {state}',

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

  'colorMode.title': '色彩模式',
  'colorMode.desc': '色彩模式会为聊天 Markdown 内容与会话记录的状态行加上 Everforest 强调色：标题、列表标记、引用、表格色带、复选框以及状态点和状态行；其他界面仍使用常规配色。',
  'colorMode.on': '已开启',
  'colorMode.off': '已关闭',
  'colorMode.switch': '色彩模式，当前{state}',

  'reset': '恢复默认',

  'aria.card': '{scheme} {strength} 配色',
  'aria.group': '{scheme}配色',
}
