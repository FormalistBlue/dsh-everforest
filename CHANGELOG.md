# Changelog

`dsh-everforest` 的版本变更记录，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：补丁版本只做配色修正、工程与文档修复，不改变 token/API 契约。

这里只写「改了什么、能感知到什么效果」；实现方式、原因与实测数据见
[`docs/design.md`](docs/design.md)、[`docs/assessment.md`](docs/assessment.md) 或 git 历史。

## [Unreleased]

### Added

- **跟随系统时也有切换动画**：外观设为「跟随系统」后，系统自己翻深 / 翻浅不再瞬间换色，而是从屏幕中心圆形扩张揭示；其余入口的动画、软 / 中 / 硬强度切换的瞬切行为不变。

### Changed

- **README**：重写「特性」文案并新增「功能实现」清单（含待实现项，中英两版同步）。

### Notes

- 只改了 Client 半部，重新加载页面即可生效，无需重启 DSH。

## [1.0.0] - 2026-10-25

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

## [0.4.0] - 2026-10-23

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

## [0.3.0] - 2026-10-22

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

## [0.2.1] - 2026-10-21

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

## [0.2.0] - 2026-10-19

首帧注入：DSH 启动时的 loading 页在客户端加载前就是 Everforest 配色。

### Added

- **首帧注入**：Web 端 loading 页与首帧即当前配色，Desktop 冷启动最多 1 帧原生色。
- 英文 README、六档预览图与市场素材。

### Fixed

- **浅色聊天气泡与画布几乎同色**：气泡改为可见的鼠尾草 / 近白卡片，边界与正文对比度达标。

### Changed

- 客户端入口改名并收敛 npm 包内容：`files` 与运行时文件一一对应，修复 npm 11 误打包。

## [0.1.2] - 2026-10-18

### Fixed

- **侧栏与内容区糊成一整块**：侧栏改为略深 / 略亮的面板，与内容卡分开，并纳入对比度门槛。

## [0.1.1] - 2026-10-18

### Changed

- 发布链路改为 GitHub Actions + npm Trusted Publishing，产物带 SLSA provenance；代码与 0.1.0 相同。

## [0.1.0] - 2026-10-18

首个发布：6 档 Everforest 配色（Dark / Light × Hard / Medium / Soft）覆盖 DSH 的颜色 token，附带设置页与对比度守卫。

### Added

- **6 档配色**：深 / 浅各硬 / 中 / 软，默认深色 Soft、浅色 Hard。
- **颜色 token 覆盖**：跟随 DSH 自身的深色 / 浅色 / 跟随系统开关，字体、圆角、阴影等保持原生。
- **Settings → Everforest**：6 张色卡、中英文案、恢复默认与外观控制。
- **对比度守卫**：正文在各级表面上的 WCAG AA 门槛自动校验。

[1.0.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/FormalistBlue/dsh-everforest/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FormalistBlue/dsh-everforest/releases/tag/v0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-everforest/v/0.1.0
