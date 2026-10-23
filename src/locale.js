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

  'intro': 'DeepSeek Harness decides whether the interface is light or dark. Follow the system or fix a side below, then pick a strength for each side — your choice applies immediately.',

  'appearance.title': 'Appearance',
  'appearance.label': 'Appearance preference',
  'appearance.system': 'Follow system',
  'appearance.dark': 'Dark',
  'appearance.light': 'Light',
  'appearance.systemActive': 'Following the system appearance; the active side is {scheme}.',
  'appearance.fixed': 'Appearance is fixed to {scheme}; it no longer follows the system.',

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
  'colorMode.experimental': 'Experimental and off by default: it relies on DeepSeek Harness chat and session markup, so a DSH upgrade may break it.',

  'reset': 'Restore defaults',

  'hint.scheme': 'Picking a card in the other group also switches DeepSeek Harness Appearance so you can preview it, and saves that as the global appearance preference shared by every signed-in browser. Choose “Follow system” above to restore automatic switching.',
  'hint.storage': 'Strength and the color-mode switch are saved in the Host configuration of the current profile, so every browser on that profile shares them; this browser keeps a localStorage copy only as a first-frame cache. Restart DeepSeek Harness after updating the Host half of the plugin.',

  'aria.card': '{scheme} {strength} palette',
  'aria.group': '{scheme} palettes',
}

/** Simplified Chinese dictionary, complete against the English key set. */
export const ZH = {
  'nav.title': 'Everforest',

  'intro': '界面用深色还是浅色由 DeepSeek Harness 的外观决定。下面可以跟随系统，或固定为深色 / 浅色；再分别为这两种外观选择强度，选中后立即生效。',

  'appearance.title': '外观',
  'appearance.label': '外观偏好',
  'appearance.system': '跟随系统',
  'appearance.dark': '深色',
  'appearance.light': '浅色',
  'appearance.systemActive': '正在跟随系统外观，当前生效的是{scheme}。',
  'appearance.fixed': '外观已固定为{scheme}，不再跟随系统。',

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
  'colorMode.experimental': '实验性功能，默认关闭：它依赖 DeepSeek Harness 的聊天与会话结构，DSH 升级后可能失效。',

  'reset': '恢复默认',

  'hint.scheme': '点击另一深浅色组中的色卡会同时切换 DeepSeek Harness 外观以便立即预览，并把结果保存为全局外观偏好（所有已登录浏览器共享）；可用上面的「跟随系统」恢复自动跟随。',
  'hint.storage': '强度与色彩模式开关保存在当前 profile 的 Host 配置中，同一 profile 的所有浏览器共享；本浏览器的 localStorage 只作为首帧缓存。更新插件的 Host 半部后需重启 DeepSeek Harness。',

  'aria.card': '{scheme} {strength} 配色',
  'aria.group': '{scheme}配色',
}
