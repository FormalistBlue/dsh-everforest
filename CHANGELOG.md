# Changelog

`dsh-everforest` 的版本变更记录，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：补丁版本只做配色修正、工程与文档修复，不改变 token/API 契约。

每个版本先列中文、再列英文（`**中文**` / `**English**` 两段），两段逐条对应；发布说明取整段，
所以 GitHub Release 与市场「更新内容」里两种语言都会显示。

这里只写「改了什么、能感知到什么效果」；实现方式、原因与实测数据见
[`docs/design.md`](docs/design.md)、[`docs/assessment.md`](docs/assessment.md) 或 git 历史。

## [Unreleased]

**中文**

### Changed

- 会话标题不再显示为绿色
- 新会话首屏鲸鱼与标题改为绿色
- 宽表横向滚动条下方补上边框
- 工作步骤文字改为略浅于正文
- 浅色与深色聊天气泡改为侧栏选中绿底
- 工作区名称加粗，当前工作区的文件夹图标改为同一文字绿
- 轨迹视图与 JSON 树改用主题配色
- 附件上传进度槽改用主题色
- 首页跃出的鲸鱼动画改为文字绿、更明显
- 聊天气泡内选中文字改为高对比字色
- **DSH 0.2.2-rc.2 适配**：配色与其它交互不变。

### Fixed

- 修复设置弹窗左侧导航选中项没有高亮
- 侧栏插件导航选中项改为绿底
- 修复深色模式发送 / 终止按钮图标偏色

---

**English**

### Changed

- Session titles are no longer green
- The whale and title on the new-session screen are now green
- Wide tables now have a border under the horizontal scrollbar
- Work-step text is now slightly lighter than body text
- Chat bubbles in both light and dark now use the selected-row green
- Workspace names are bold, and the active workspace's folder icon uses the same green as the text
- The trace view and JSON tree now follow the theme
- The attachment upload progress track now uses theme colors
- The leaping whale on the home screen is now text green and more prominent
- Selected text inside chat bubbles now uses a high-contrast color
- **DSH 0.2.2-rc.2 support**: colors and other interactions are unchanged.

### Fixed

- The selected item in the settings dialog sidebar is highlighted again
- The selected plugin item in the sidebar now has a green fill
- Send and stop button icons no longer look off-color in dark mode

## [1.5.0] - 2026-11-08

**中文**

交互强调色统一改用 Everforest 上游绿：选中会话行、发送键、下拉选中项变为绿底，目录名与会话标题改用文字绿；聊天气泡换成苔纸底，插件图标改为透明底鲸鱼，并修复选中行文字 / 图标可见性等问题。

### Changed

- 浅色聊天气泡改用苔纸底与深松文字
- 深色聊天气泡文字改为浅鼠尾草色
- 插件图标改为透明底的绿色鲸鱼
- 去掉插件卡片图标的外框
- 发送键、活动项与预览角标改用森林绿
- 侧边栏选中会话行改为实色绿底
- 「已完成未读」会话行改回蓝色
- 浅色交互绿改用 Everforest 浅绿
- 修复选中会话行时间与图标看不清
- 修复选中会话行操作按钮悬停灰块
- 修复选中会话行转圈图标看不清
- 插件更新弹窗步骤文字改为绿色
- 插件更新弹窗勾选图标改为实底绿
- 下拉选中项改为绿底深色文字
- 修复下拉选中项的图标与说明文字颜色
- 会话标题与目录名改为绿色
- 行号与弱化文字改用更淡的灰
- 悬停底色改为中性灰，不再偏绿

---

**English**

Interaction accents now use Everforest's upstream green: selected session rows, the send button and dropdown selections get green fills, while directory names and session titles use the green text color; chat bubbles move to a moss-paper background, the plugin icon becomes a transparent whale, and several selected-row text/icon visibility issues are fixed.

### Changed

- Light chat bubbles now use a moss-paper background with deep pine text
- Dark chat bubble text is now light sage
- The plugin icon is now a green whale on a transparent background
- Removed the frame around plugin card icons
- The send button, active items and preview badges now use forest green
- The selected session row in the sidebar now has a solid green fill
- The "done, unread" session row is blue again
- The light-theme interaction green now uses Everforest's light green
- Fixed unreadable time and icons on the selected session row
- Fixed gray hover blocks on selected-row action buttons
- Fixed the hard-to-see spinner on the selected session row
- Step text in the plugin update dialog is now green
- The check icon in the plugin update dialog is now solid green
- Dropdown selections now use a green fill with dark text
- Fixed icon and caption colors in dropdown selections
- Session titles and directory names are now green
- Line numbers and dimmed text use a fainter gray
- Hover backgrounds are neutral gray instead of green-tinted

## [1.4.0] - 2026-11-07

**中文**

聊天表格的列宽现在会记住：刷新页面、切换会话再回来仍是调好的宽度；同时适配 DSH 0.2.2-rc.1，设置导航图标不再重复、自动化任务页空态插图跟随主题配色。

### Added

- 刷新或切换会话后记住表格列宽

### Changed

- 表格最小列宽从 100px 降到 64px
- 修复设置导航图标与默认齿轮重复显示
- 自动化任务页空态插图跟随主题配色
- **DSH 0.2.2-rc.1 适配**：配色与其它交互不变。

---

**English**

Chat table column widths are now remembered: after a reload or after coming back to a session they are still the widths you set; the plugin also adapts to DSH 0.2.2-rc.1, with no duplicated settings nav icon and theme-aware empty-state art on the automation page.

### Added

- Table column widths are remembered after a reload or a session switch

### Changed

- The minimum table column width drops from 100px to 64px
- Fixed a duplicate settings nav icon next to the default gear
- Automation-page empty-state art now follows the theme
- **DSH 0.2.2-rc.1 support**: colors and other interactions are unchanged.

## [1.3.0] - 2026-10-30

**中文**

设置导航里有了 Everforest 自己的松树图标，第三方插件页面也会跟着主题配色；任务列表复选框、表格列宽提示线等细节换了更合适的颜色。

### Changed

- 优化表格横向滚动条样式
- 调小表格单元格左内边距
- 引用块上下加 2px 内边距
- 表头文字加大并加粗
- 列宽把手加长、颜色更柔和
- 任务列表复选框改为带色样式
- 第三方插件页面跟随主题配色
- 设置导航里 Everforest 有了自己的松树图标
- **DSH 0.2.1-rc.5 适配**：复核无破坏性变更，配色与交互不变。

### Notes

- 重新加载页面即可生效，无需重启 DSH。

---

**English**

The settings nav now has Everforest's own pine-tree icon and third-party plugin pages follow the theme; task-list checkboxes, the table resize guideline and other details use better-fitting colors.

### Changed

- Refined the table horizontal scrollbar style
- Reduced the left padding of table cells
- Blockquotes get 2px of vertical padding
- Table headers are larger and bold
- The column resize handle is longer with a softer color
- Task-list checkboxes now come in a colored style
- Third-party plugin pages now follow the theme
- Everforest has its own pine-tree icon in the settings nav
- **DSH 0.2.1-rc.5 support**: reviewed with no breaking changes; colors and interactions are unchanged.

### Notes

- Reload the page to apply; no DSH restart needed.

## [1.2.0] - 2026-10-28

**中文**

聊天表格有了细边框与可拖动的列宽：拖动表头边缘即可调整列宽，宽表按 Element 表格式滚动，最后一列也能拖窄；双击边缘恢复自动列宽。

### Added

- **表格边框**：聊天 Markdown 表格加了中性色阶的外框与列分隔细线（外框比内线高一档，深 / 浅色自动适配），补回首 / 末列内边距、去掉与外框叠加的最后一行下边框；表头色带 / 斑马纹 / 行 hover 不变。
- **拖动表头调列宽**：鼠标移到表头单元格右边缘（6px 命中区）会出现列宽提示线，按住拖动即可调列宽（单列最小 64px）；双击边缘恢复 DSH 的自动列宽，拖动中按 Esc 取消。fill 表（<4 列）在相邻两列之间重新分配宽度、表格总宽不变；宽表（≥4 列）按 Element 表格式拖动：拖哪列只改哪列、表格总宽跟着列宽之和变，最后一列的右边缘（表格自身右边框）也是拖动柄，可以一路把表格拖窄到放进正文列。宽表列宽保持自然长度，比正文列宽时在表格底部出横向滚动条（容器固定在正文列内、内容左右滚动，不换行也不越界）。

### Fixed

- **宽表最后一列拖不窄、想把所有列都调小也调不小**：之前每列只能通过相邻两列的分界线拖动，表格总宽恒定，最后一列没有自己的右边缘手柄——调窄其他列时宽度只会被一路推给最后一列，而最后一列本身无法变窄。现在宽表改为每列独立改宽、表格总宽跟随列宽之和，最后一列的右边缘（表格自身右边框）也是拖动柄，可以把整张表一路拖窄直到放进正文列（横向滚动条随之消失），也可以拖宽。
- **宽表右侧越出正文列 / 被裁 / 被迫换行**：DSH 让宽表按内容自然宽度排版并伸进聊天区右侧留白（真机实测比正文列右缘多出 90px），超宽时最后几列还会被裁掉；中间的修法一度把列内容压成换行。现在按 Element 表格的方式：容器固定在正文列内（右缘与正文右缘对齐），列宽保持自然长度，放不下时表格底部出现横向滚动条，可以左右滚动查看所有列。
- **宽表的横向滚动条出现在表格左边外面**：宽表包装层原本横跨整个聊天滚动区，鼠标悬停时弹出的横向滚动条会从表格左缘左侧一百多像素处开始；现在宽表包装层从表格自己的左缘开始，滚动条正好落在表格宽度内，不会再伸到表格左边外面。
- **4 列以上的宽表错位、右侧列被裁**：宽表包装层有 DSH 自带的「出血」布局（负外边距 + 等量左内边距，让表格横跨聊天区但内容仍与正文对齐），之前覆盖了它的宽度导致包装层被挤窄、表格被左移并裁掉最后一列；现在不再改动 DSH 的布局，宽表的外框改画在表格自身，4 列完整显示且与正文对齐。
- **锁定列宽后出现一条滚不动的横向滚动条**：列宽按半像素取整时可能比容器内容宽多半像素（如 747.5px vs 747.44px），固定布局把表格撑大、浏览器把 `scrollWidth` 进位，出现一条只能滚 0.06px 的滚动条；现在列宽之和向下取整到容器可用宽，滚动条不再出现。

### Notes

- 只改了 Client 半部，重新加载页面即可生效，无需重启 DSH。
- 列宽只在当前页面会话内有效：刷新页面或重新挂载表格后回到自动列宽；触摸端不启用拖动。

---

**English**

Chat tables now have thin borders and draggable column widths: drag a header edge to resize, wide tables scroll Element-style, and even the last column can be narrowed; double-click an edge to restore automatic widths.

### Added

- **Table borders**: chat Markdown tables get a neutral-scale outer frame and thin column dividers (the frame is one step stronger than the inner lines and adapts to dark/light), with first/last column padding restored and the duplicate bottom border under the last row removed; header banding, zebra stripes and row hover are unchanged.
- **Drag header edges to resize columns**: hovering the right edge of a header cell (6px hit area) shows a guideline; drag to resize (64px minimum per column). Double-clicking the edge restores DSH's automatic widths, and Esc cancels a drag in progress. Fill tables (fewer than 4 columns) redistribute width between the two neighbours and keep the total width; wide tables (4+ columns) resize Element-style — only the dragged column changes and the total follows the sum, with the last column's right edge (the table's own border) also a handle, so the whole table can be narrowed into the content column. Wide tables keep natural column lengths; when wider than the content column, a horizontal scrollbar appears under the table (the container stays inside the content column, content scrolls left/right, no wrapping and no overflow).

### Fixed

- **The last column of a wide table could not be narrowed, and not every column could be shrunk**: each column used to resize only from the divider with its neighbour, so the table's total width was fixed and the last column had no right-edge handle — narrowing other columns just pushed width onto it, and it could not shrink itself. Wide tables now resize each column independently with the total following the sum, and the last column's right edge (the table's own border) is a handle too, so the whole table can be narrowed until it fits the content column (the horizontal scrollbar then disappears) or widened again.
- **Wide tables overflowed to the right of the content column / were clipped / forced to wrap**: DSH lays wide tables out at their natural content width and lets them extend into the right-hand whitespace (a real-device measurement showed 90px past the content column's right edge), and the last columns were clipped when too wide; an intermediate fix wrapped cell content instead. Wide tables now follow Element's model: the container stays inside the content column (right edges aligned), column widths keep natural lengths, and a horizontal scrollbar appears under the table when it does not fit, so every column can be scrolled into view.
- **The wide-table horizontal scrollbar appeared outside the table's left edge**: the wrapper used to span the whole chat scroll area, so the scrollbar that appears on hover started more than a hundred pixels left of the table; the wrapper now starts at the table's own left edge and the scrollbar lands within the table's width.
- **Wide tables with 4+ columns were misaligned and right columns clipped**: the wrapper carries DSH's "bleed" layout (negative margin plus matching left padding so the table spans the chat area while its content stays aligned), and overriding its width squeezed the wrapper, shifted the table left and clipped the last column; the layout is now left alone and the wide table's frame is drawn on the table itself, so 4 columns display fully and align with body text.
- **A horizontal scrollbar that could not scroll appeared after fixing column widths**: widths rounded to half pixels could exceed the container's content width by half a pixel (e.g. 747.5px vs 747.44px), so fixed layout grew the table and the browser rounded up `scrollWidth`, producing a scrollbar with 0.06px of travel; width sums now floor to the container's available width and the scrollbar disappears.

### Notes

- Only the Client half changed; reload the page, no DSH restart needed.
- Column widths last only for the current page session: after a reload or a remount, tables return to automatic widths; dragging is disabled on touch devices.

## [1.1.0] - 2026-10-27

**中文**

跟随系统时切换深 / 浅色也有了聚光灯动画，不再瞬间换色；README 重写并新增「功能实现」清单。

### Added

- **跟随系统时也有切换动画**：外观设为「跟随系统」后，系统自己翻深 / 翻浅不再瞬间换色，而是从屏幕中心圆形扩张揭示；其余入口的动画、软 / 中 / 硬强度切换的瞬切行为不变。

### Changed

- **README**：重写「特性」文案并新增「功能实现」清单（含待实现项，中英两版同步）。

### Notes

- 只改了 Client 半部，重新加载页面即可生效，无需重启 DSH。

---

**English**

Switching light/dark while following the system now has the spotlight animation instead of an instant flip; the README was rewritten with a new "feature implementation" list.

### Added

- **System-follow mode gets the switch animation too**: with appearance set to "follow system", the OS flipping dark/light no longer changes instantly but expands as a circle from the screen center; other entry points and the instant soft/medium/hard changes are unchanged.

### Changed

- **README**: rewritten features copy plus a new "feature implementation" list (including pending items, kept in sync in Chinese and English).

### Notes

- Only the Client half changed; reload the page, no DSH restart needed.

## [1.0.0] - 2026-10-25

**中文**

首个稳定版：色彩模式改为默认提供，新增工作区当前会话行高亮、文本选区配色、聚光灯式深浅切换与开发调试面板；README、市场截图与插件图标全部重做。

### Added

- **工作区「当前会话」行高亮**：正在打开的会话在侧栏里一眼可辨，不再和 hover、待确认 / 已完成行混淆；六档配色的正文对比度仍达标。
- **文本选区配色**：选中文字改为 Everforest 的选区底色，并保留文字自身颜色（代码语法色、链接色不会被统一成同一种墨色）。
- **聚光灯式深浅切换**：切换主题时从点击位置圆形扩张揭示，不再整页发灰或闪白；同深浅色内的软 / 中 / 硬切换为瞬切，系统开启「减少动态效果」时全部瞬切。
- **开发调试面板（仅开发构建）**：可直接切换外观与强度，发布产物不含。

### Changed

- **色彩模式改为默认提供**：设置页不再有开关，装好即按 Everforest 强调色着色标题、表格、行内代码、内部链接与会话状态行；不想着色只能停用插件（会同时失去配色主题）。
- **会话行配色**：底色改用 Everforest 调色板原色；「待确认 / 待审批」由红改黄（红色容易被读成报错），深色档改用亮琥珀底 + 深色文字，hover 图标保持可读。
- **界面强调色**：品牌、主按钮、链接等改用 Everforest 官方强调色，观感更统一。
- **深色模式可见度**：设置页边框、行内代码底色不再和背景融在一起；设置页边框宽度统一。
- **插件图标与 README**：图标改为跃起的鲸鱼 + 森林山脊松树；README / 市场预览改为深色 Soft 与浅色 Hard 两张真机截图。
- **DSH 0.2.1-rc.3 适配**：复核无破坏性变更，默认配色不变。

### Fixed

- **调试面板折叠后消失**：折叠成圆钮后不再跑到左上角、点不到。

---

**English**

First stable release: color mode now ships enabled by default, with current-session row highlighting, text-selection colors, the spotlight light/dark switch and a dev panel; the README, market screenshots and plugin icon were all redone.

### Added

- **Current-session row highlight in the workspace**: the open session is recognizable at a glance and no longer confused with hover or pending/done rows; body-text contrast still passes in all six schemes.
- **Text-selection colors**: selected text uses Everforest's selection background while keeping its own color (syntax colors and link colors are not flattened to one ink).
- **Spotlight light/dark switch**: switching themes reveals from the click point instead of flashing the whole page gray or white; soft/medium/hard changes within the same mode stay instant, and everything is instant when "reduce motion" is on.
- **Dev panel (development builds only)**: switch appearance and strength directly; not in the published artifact.

### Changed

- **Color mode now ships enabled**: no switch in settings — once installed, titles, tables, inline code, internal links and session status rows are colored with Everforest accents; to turn it off you must disable the plugin (which also loses the color themes).
- **Session row colors**: fills use Everforest palette colors; "needs confirmation / approval" moved from red to yellow (red read as an error), dark mode uses a bright amber fill with dark text, and hover icons stay readable.
- **UI accents**: brand, primary buttons and links use Everforest's official accent colors for a more consistent look.
- **Dark-mode visibility**: settings borders and inline-code backgrounds no longer blend into the background; settings border widths are unified.
- **Plugin icon and README**: the icon is now a leaping whale with forest ridges and pines; README and market previews use two real-device screenshots (dark Soft and light Hard).
- **DSH 0.2.1-rc.3 support**: reviewed with no breaking changes; default colors unchanged.

### Fixed

- **Dev panel disappearing when collapsed**: the collapsed round button no longer jumps to the top-left corner out of reach.

## [0.4.0] - 2026-10-23

**中文**

新增实验性「色彩模式」：把 Everforest 的强调色用到聊天 Markdown 内容与会话状态行（默认开启，设置页可关）；关闭时与 0.3.0 完全一致。

### Added

- **富文本着色**：h1–h6 六色标题、加粗 / 斜体、行内代码、内部文件链接、引用块、表格表头与斑马纹、复选框各用不同颜色。
- **会话行着色**：「待确认 / 待审批」淡橙底 + 橙色状态点，「已完成未查看」淡绿底 + 绿色状态点。
- **色彩模式开关**：设置页可切换，选择写入当前 profile，同一 profile 的所有浏览器共享。

### Changed

- **色彩模式默认开启**；设置页文案精简，外观控件与 DSH 自带 Appearance 行一致。

### Notes

- 实验性：依赖 DSH 的 Markdown 与会话行结构，DSH 升级后可能失效（配色主题本身不受影响），升级后需回归。
- 浅色档的彩色贴近可读性下限，个别档位颜色较淡（light·soft 的会话行底会接近侧栏底色）。
- 升级到 0.4.0 后需重启 DSH 才能在设置页看到新选项。

---

**English**

Adds the experimental "color mode": Everforest accents on chat Markdown content and session status rows (on by default, switchable off in settings); with it off, 0.4.0 behaves exactly like 0.3.0.

### Added

- **Rich-text coloring**: h1–h6 headings in six colors, bold/italic, inline code, internal file links, blockquotes, table headers and zebra stripes, and checkboxes each use a different color.
- **Session row coloring**: "needs confirmation / approval" gets a pale orange fill with an orange dot; "done, not viewed" a pale green fill with a green dot.
- **Color mode switch**: toggled in settings; the choice is written to the current profile and shared by every browser on it.

### Changed

- **Color mode is on by default**; settings copy was trimmed and the appearance control matches DSH's own Appearance row.

### Notes

- Experimental: depends on DSH's Markdown and session-row structure, so a DSH upgrade may break it (the color themes themselves are unaffected); re-test after upgrades.
- Light schemes sit close to the readability floor and some tones are pale (light·soft session-row fills can approach the sidebar background).
- Restart DSH after upgrading to 0.4.0 to see the new option in settings.

## [0.3.0] - 2026-10-22

**中文**

强度偏好改为写进当前 profile 的 Host 配置：同一 profile 的所有浏览器共享同一份选择，localStorage 降为首帧缓存。

### Added

- **Host 持久化**：换浏览器、换端口、清缓存都不再丢强度；新打开窗口的首帧直接用 Host 里的值。
- **旧版本迁移**：从 0.2.1 升级后第一次启动会把本地选择自动写入 Host，之后清掉浏览器缓存也不影响。

### Changed

- 首帧强度改为「本机缓存 → Host → 默认」三级兜底。
- 设置页说明改为 profile 级共享、Host 半部更新需重启 DSH。

### Fixed

- **「恢复默认」偶发失效**：强度写入还在进行时点「恢复默认」不再被覆盖（此前需要点两次）。

### Notes

- 升级到 0.3.0 后需重启 DSH 一次；强度按 profile 隔离，不同 profile 各存各的。

---

**English**

Strength preferences are now written to the current profile's Host config: every browser on that profile shares one choice, and localStorage is demoted to a first-frame cache.

### Added

- **Host persistence**: changing browsers, changing ports or clearing cache no longer loses the strength; a newly opened window uses the Host value on its first frame.
- **Migration from older versions**: the first launch after upgrading from 0.2.1 writes the local choice to the Host, so clearing browser storage afterwards does not matter.

### Changed

- First-frame strength now falls back in three steps: local cache → Host → default.
- Settings copy now says the choice is shared per profile and that Host updates need a DSH restart.

### Fixed

- **"Restore defaults" occasionally not applying**: clicking it while a strength write is still in flight is no longer overwritten (previously it took two clicks).

### Notes

- Restart DSH once after upgrading to 0.3.0; strengths are stored per profile, so different profiles keep their own.

## [0.2.1] - 2026-10-21

**中文**

补丁版本：修可见性问题，并补齐 CI、发布门禁与自动 GitHub Release。

### Added

- **跨窗口同步**：同一地址的多个标签页 / 窗口改强度后保持一致，不再互相覆盖。
- **loading 页着色更完整**：spinner 环与进度弧也跟随 Everforest 配色。
- **自动化门禁**：PR / 推送跑六格 CI；发布前跑同一组测试与检查，失败不发布；tag 自动创建 GitHub Release。

### Fixed

- **light·soft 聊天气泡变成白色**：改回淡鼠尾草纸色，与暖奶油画布区分开。
- **diff 行底色看不清 / 看不出**：深色档的 added / deleted 行与行号、浅色档的行底都重新取值，浅色 soft 档保留可读性取舍。
- **启动自检误报**：不再把 focus ring token 误判为「被改名」。
- **设置页注册失败后整段会话缺失**：注册失败会重试，不再永久没有设置页。
- **设置页「当前选择」行读屏读不到**：补齐无障碍命名。
- **构建器静默丢导出**：一条语句里的多个导出不会再只保留第一个。

### Changed

- **npm 页面上的文档链接**：改用 GitHub 绝对 URL（此前相对链接 404）。
- **Windows 下 clone**：工作区统一 LF，不再因 CRLF 导致检查失败。

---

**English**

Patch release: visibility fixes, plus CI, release gates and automatic GitHub Releases.

### Added

- **Cross-window sync**: tabs/windows on the same address keep the same strength instead of overwriting each other.
- **More complete loading-page coloring**: the spinner ring and progress arc follow Everforest too.
- **Automated gates**: six-cell CI on PRs and pushes; the same tests and checks run before publishing, so a failure blocks the release; tags create GitHub Releases automatically.

### Fixed

- **light·soft chat bubbles turned white**: back to a pale sage paper tone that separates from the warm cream canvas.
- **diff line backgrounds were hard to see / invisible**: dark added/deleted rows and line numbers, and the light row backgrounds, were re-tuned; light soft keeps a readability trade-off.
- **Startup self-check false positive**: the focus-ring token is no longer reported as renamed.
- **A failed settings-page registration dropped the whole session**: registration retries instead of permanently removing the settings page.
- **Screen readers could not read the "current selection" row**: accessible names were added.
- **Builder silently dropped exports**: multiple exports in one statement are no longer reduced to the first.

### Changed

- **Doc links on the npm page**: absolute GitHub URLs (relative links returned 404).
- **Cloning on Windows**: the workspace is LF-only, so CRLF no longer fails checks.

## [0.2.0] - 2026-10-19

**中文**

首帧注入：DSH 启动时的 loading 页在客户端加载前就是 Everforest 配色。

### Added

- **首帧注入**：Web 端 loading 页与首帧即当前配色，Desktop 冷启动最多 1 帧原生色。
- 英文 README、六档预览图与市场素材。

### Fixed

- **浅色聊天气泡与画布几乎同色**：气泡改为可见的鼠尾草 / 近白卡片，边界与正文对比度达标。

### Changed

- 客户端入口改名并收敛 npm 包内容：`files` 与运行时文件一一对应，修复 npm 11 误打包。

---

**English**

First-frame injection: the loading page DSH shows before the client loads is already in Everforest colors.

### Added

- **First-frame injection**: on Web the loading page and first frame are already in the current scheme; Desktop shows native colors for at most one frame on a cold start.
- English README, six scheme previews and market assets.

### Fixed

- **Light chat bubbles almost the same color as the canvas**: bubbles are now visible sage / near-white cards whose contrast against body text clears the gate.

### Changed

- Renamed the client entry and tightened the npm package contents: `files` now matches the runtime files one-to-one, fixing npm 11 mis-packaging.

## [0.1.2] - 2026-10-18

**中文**

### Fixed

- **侧栏与内容区糊成一整块**：侧栏改为略深 / 略亮的面板，与内容卡分开，并纳入对比度门槛。

---

**English**

### Fixed

- **Sidebar and content area bleeding together**: the sidebar is now a slightly darker/lighter panel separated from the content card, and is covered by the contrast gate.

## [0.1.1] - 2026-10-18

**中文**

### Changed

- 发布链路改为 GitHub Actions + npm Trusted Publishing，产物带 SLSA provenance；代码与 0.1.0 相同。

---

**English**

### Changed

- The release pipeline moved to GitHub Actions + npm Trusted Publishing with SLSA provenance on the artifacts; code is identical to 0.1.0.

## [0.1.0] - 2026-10-18

**中文**

首个发布：6 档 Everforest 配色（Dark / Light × Hard / Medium / Soft）覆盖 DSH 的颜色 token，附带设置页与对比度守卫。

### Added

- **6 档配色**：深 / 浅各硬 / 中 / 软，默认深色 Soft、浅色 Hard。
- **颜色 token 覆盖**：跟随 DSH 自身的深色 / 浅色 / 跟随系统开关，字体、圆角、阴影等保持原生。
- **Settings → Everforest**：6 张色卡、中英文案、恢复默认与外观控制。
- **对比度守卫**：正文在各级表面上的 WCAG AA 门槛自动校验。

---

**English**

First release: six Everforest schemes (Dark / Light × Hard / Medium / Soft) covering DSH's color tokens, with a settings page and a contrast guard.

### Added

- **Six schemes**: dark and light, each Hard / Medium / Soft; defaults are dark Soft and light Hard.
- **Color token overrides**: follows DSH's own dark / light / follow-system switch; fonts, radii and shadows stay native.
- **Settings → Everforest**: six swatches, Chinese/English copy, restore defaults and appearance controls.
- **Contrast guard**: automatic WCAG AA checks for body text on every surface level.

[1.0.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FormalistBlue/dsh-everforest/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-everforest/v/0.1.0
