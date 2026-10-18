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

  'intro': 'DeepSeek Harness still decides whether the interface is light or dark. Pick a strength for each side below — your choice applies immediately.',

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

  'hint.scheme': 'Picking a card in the other group also switches DeepSeek Harness Appearance and saves it as the global appearance preference shared by every signed-in browser, so “Follow system” becomes a fixed light or dark choice.',
  'hint.storage': 'Strength is saved per browser or app window: the Desktop app keeps it across restarts, while a browser tab only keeps it for its current address (the dev server picks a new port on each start).',

  'aria.card': '{scheme} {strength} palette',
  'aria.group': '{scheme} palettes',
}

/** Simplified Chinese dictionary, complete against the English key set. */
export const ZH = {
  'nav.title': 'Everforest',

  'intro': '界面用深色还是浅色仍由 DeepSeek Harness 的外观设置决定。请在下面分别为深色、浅色选择强度，选中后立即生效。',

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

  'hint.scheme': '点击另一深浅色组中的色卡时，会同时切换 DeepSeek Harness 的外观，并把结果保存为全局外观偏好（所有已登录浏览器共享），因此「跟随系统」会变成固定的浅色或深色。',
  'hint.storage': '强度按浏览器 / 应用窗口保存：Desktop 窗口重启后仍然保留；用浏览器打开时只对当前地址生效（每次启动端口可能不同）。',

  'aria.card': '{scheme} {strength} 配色',
  'aria.group': '{scheme}配色',
}
