# 可行性评估与方案取舍

> 日期：2026-10-18 · 评估对象：DSH **0.2.1-rc.2**（Desktop，Windows）· 结论：**可行，采用路线 A**（见下）。

## 1. 结论

做一个 Everforest 主题插件是可行的，而且成本比最初 README 设想的「host-only + 注入 `<style>`」更低：

- **官方扩展点已经存在**：Client 的 `ctx.theme.overrideTokens(source, tokens)` 接受任意 CSS 变量名 → `{ light, dark }` 的映射，正好覆盖「6 套调色板 + 随深浅色切换」的需求。
- **不需要改 DSH 组件 CSS，也不需要构建工具链**：正文是一份普通 JS 的 Client 半部；Host 半部可以留空。
- **覆盖率高**：UI 几乎完全由 token 驱动（抽查最大的 `ui-chat` 包，除 mask 用的黑白外无硬编码颜色），覆盖 195 个颜色 token 即可整站改色，另有 11 个 `--shiki-token-*` 接管代码高亮。
- **配色数据已有权威来源**：官方 `palette.md` 提供 6 套背景色阶；**主参考选定 Everforest Enchanted**（Obsidian 端口）——它的背景值严格等于官方 dark-soft / light-hard，并给出 `header-*` 自定义色与完整的 UI 语义映射。因此默认配对采用「深色 soft / 浅色 hard」，与 Enchanted 观感一致，其余四档强度作为可选。
- **已知缺口**：终端 ANSI 16 色（xterm 内置默认盘）、brand mark 固定图、macOS 专用渐变、逐级标题彩色（DSH 无对应 token）。都不影响主体观感。

## 2. 调研方法（可复现）

1. **运行时检查**（权威、无侵入）：`cordis_inspect_query` 查询 Client `Service`（`theme` 契约）、`Theme.listTokens`、`Slots.listSubTree`（`settings.section` 拓扑）、Host `Config`（包名与 `packageDir`）。
2. **安装包解包**：DSH Desktop 的代码在 `resources/app.asar` 内，shell 工具无法直接读取。用零依赖 Node 脚本解析 asar 头（`uint32@4` = header pickle 大小，JSON 从 `{"files"` 起、数据区自 `8 + headerSize` 开始），导出 `@deepseek-ai/dsh-client-ui-theme`、`-ui-layout`、`-ui-chat`、`-ui-sidebar-terminal` 四个包后统计：
   - `--dsw-*` 变量声明：**403** 个（含字体 / 圆角 / 阴影），颜色类 **77 static + 107 alias + 11 specific = 195**，另有 **11** 个 `--shiki-token-*`；
   - light 侧 alias/specific 声明 **112** 条，其中 **79** 条是 `var(--dsw-static-*)` 引用、**33** 条是字面量或 `color-mix`（边框透明度、遮罩、菜单底、toolbar、diff 底色等）；
   - `body[data-ds-dark-theme]` 重定义 **77** 个 static + **105** 个 alias。
3. **第三方插件先例**：`dshmarket`、`dsh-cost-meter`、`dsh-context`（安装于本机 profile）的清单与客户端代码，用于确认 `dsh.client.inject`、`settings.section`、`engines.dsh`、`dsh.compatibility` 的写法。
4. **配色数据核对**（详见 [`reference/palette.md`](reference/palette.md)）：
   - 官方 [palette.md](https://github.com/sainnhe/everforest/blob/master/palette.md) @ `85a86eb`：6 套背景色阶（dark/light × hard/medium/soft）与两套前景/强调色；
   - [在线调色板](https://everforest.vercel.app/palette) 抓取比对：页面内 100 个唯一色值与 palette.md 完全一致（扣除 light 色阶中 `bg_dim == bg2` 的重复）；
   - [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted) `theme.css` @ `bdd7ac7`：默认配对（dark-soft / light-hard）、`header-*` 色、代码/链接/表格/选中/高亮的语义映射、light 选中色修正 `#DED8DB`。三者均 MIT。

## 3. 机制证据

| 事实 | 证据 |
|---|---|
| `overrideTokens(source, tokens)` 接受任意 CSS 变量名 | `theme` 服务契约；`validateOverrides` 只校验值为 `{ light, dark }` 两字符串，传裸字符串抛教学式错误 |
| 覆盖层以 **body 内联样式** 落地，优先级最高、自动按 scheme 取值 | `ui-layout` 的 `ThemePresenter.apply()`：`document.body.style.setProperty(name, value)`，apply 前先撤销上一批 |
| 卸载 / 停用自动还原 | `overrideTokens` 返回 disposer；插件 fiber 销毁时 effect 清理；presenter 存 `appliedTokens` 逐项 `removeProperty` |
| 注册第三方主题（`register`）**不能**持久化 | 设置 schema 仅 `light \| dark \| system`；README 明确「third-party theme ids remain an in-process extension and do not cross the built-in settings schema」 |
| 代码高亮是独立变量，可覆盖 | `ui-theme` 的 `shiki.css`：`:root{--shiki-token-constant:#1c7ed6; …}` + `body[data-ds-dark-theme]{…}` |
| 设置页插槽可用，且三方插件已在用 | `Slots.listSubTree` 根 `settings.section` 的 occupants 含 `dsh-market`、`cost-meter`；注册项 `{ id, order, label }`，owner props `{ close }` |
| 主题包由 Client 半部按包名加载 | `@deepseek-ai/dsh-client-modules`：`dsh.client.platform: 'web'` + `./client` 导出；`dsh.client.inject` 只决定激活顺序 |
| 第三方 Client 半部可直接用 `ctx.theme` / `theme/change` | `dshmarket` 的 `src/client/index.ts`：`inject = ['slots','locale','theme']`、`themeStore.getSnapshot: () => ctx.theme.getTheme()` |

## 4. 路线对比与决策

| 路线 | 说明 | 结论 |
|---|---|---|
| **A. Client 半部 + `overrideTokens`** | 官方扩展点；任意 CSS 变量；自动双 scheme；卸载还原；无构建依赖 | ✅ **采用** |
| B. Host-only + `webServer.tapIndex` 注入 `<style>` | 能做（token 样式表可被同优先级后置规则覆盖），但要自己写两套 `body` 规则、与内联变量博弈、卸载不干净、拿不到 `theme/change` | ❌ 放弃 |
| C. `register()` 注册主题 + Appearance 集成 | 设计上就不支持三方主题持久化，还要和内置 Appearance 行抢状态 | ❌ 放弃 |

补充：Host 半部仍保留（空 `apply`），因为 bundle 需要一个插件行来承载 `package.json` 的 `dsh.client` 声明与 Plugin Manager 中的显示信息（标题 / 描述 / 图标 / 启停）。

## 5. 决策记录

| 决策 | 结论 | 影响 |
|---|---|---|
| 变体数量 | **6 套**：Dark / Light × Hard / Medium / Soft | 深浅色两组各自保存强度；色卡分「深色 3 张 + 浅色 3 张」，点击即切到对应深浅色并应用该强度 |
| 配色数据源 | **主参考 Everforest Enchanted**（默认配对 dark-soft / light-hard、`header-*` 色、UI 语义映射）；6 套背景色阶取自官方 `palette.md` | 默认观感与 Enchanted 一致；另外四档强度来自官方色阶。数据表、commit 快照与偏差记录见 [`reference/palette.md`](reference/palette.md) |
| 配置入口 | **直接做设置页**（`settings.section`），不依赖 Appearance 改造 | 需要自建状态存储与组件；无法把偏好写进 DSH 设置文档（见下） |
| 偏好持久化 | **localStorage**（key 带版本号），设置页读写 | 逐浏览器生效；与 DSH「Host 偏好跨浏览器共享」不同，需在文档与设置页文案中说明。升级到 Host 侧持久化列入 0.3.0 |
| 发布目标 | **npm 发布** | 需 display 元数据（`meta.title` / `meta.description` + 图标）、`engines.dsh`、`files`/`exports` 白名单、LICENSE + THIRD_PARTY_NOTICES、README 截图 |
| 包名 | `dsh-everforest`（2026-10-18 查询 npm registry 未占用，发布前复核） | — |

> 关于持久化：DSH 的「设置文档」按插件 Config 条目服务，三方插件要写入需经 Typert remote 或自建 HTTP 路由 + Host 服务，成本高且都是内部接口。视觉偏好先用 localStorage 落地，接口稳定后再迁移，迁移点写在 `docs/design.md` 的 0.3.0 节。

## 6. 覆盖矩阵

| 区域 | 覆盖方式 | 状态 |
|---|---|---|
| 主背景 / 分层表面 / 浮层 | `--dsw-alias-bg-*`、`--dsw-static-neutral-bluish-*` | ✅ 设计覆盖 |
| 文字三级 / 弱化 / 反色 | `--dsw-alias-label-*` | ✅ |
| 边框 / 分隔 / 焦点环 | `--dsw-alias-border-l*`、`--dsw-alias-state-business-primary` | ✅（33 个字面量之一） |
| 品牌 / 主按钮 / 链接 | `--dsw-alias-brand-primary`（=`header-aqua`）、`--dsw-alias-link`（=`header-blue`） | ✅ |
| 状态色（成功 / 警告 / 错误 / 进行中） | `--dsw-alias-state-*`（`green` / `yellow` / `red` / `blue`） | ✅ |
| 侧栏 / 气泡 / 菜单 / 输入框 / selector | `--dsw-specific-*`（Enchanted 平铺风格，侧栏 = `bg0`） | ✅ |
| 滚动条 | `--dsw-alias-scrollbar-*`（引用 l1/l2，跟随即可） | ✅ |
| diff（代码差异） | `--dsw-alias-file-diff-*` / `code-diff-*`（`bg_green` / `bg_red` 底） | ✅ |
| 代码块语法高亮 | `--shiki-token-*`（11 个，映射对齐 Enchanted 的 `--code-*`） | ✅ |
| 逐级标题颜色 | Enchanted 的 h1–h6 各一色；DSH 无逐级颜色 token | ⚠️ 不覆盖（列入非目标） |
| 终端 | 底色 / 字色 / 光标来自主题 token；ANSI 16 色为 xterm 内置默认盘 | ⚠️ 部分 |
| brand mark / 图标 / 图片 | 固定资源 | ⚠️ 不覆盖 |
| macOS 侧栏 / 标题栏渐变 | `ui-layout` 内联硬编码（仅 darwin） | ⚠️ Windows 无影响 |

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 内部 token 名随 DSH 升级改名 | 部分区域退回原生蓝灰 | `engines.dsh` 限版本；启动自检（对比关键 token 计算值）；缺 token 不报错、只退化 |
| 对比度回归 | 文字 / 按钮可读性下降 | 建立对比度检查表（正文、二级、边框、brand 白字、diff、状态色），逐页走查 |
| 覆盖面「半官方」 | 可能被未来 DSH 版本收紧 | 只用 `ctx.theme` 公开服务 + 文档化 token 优先，内部 token 集中在 `src/tokens.js` 单文件便于替换 |
| 持久化只在单浏览器 | 换浏览器后回到默认强度 | 设置页提示；0.3.0 迁移 Host 侧偏好 |
| 设置页插槽属内部契约 | DSH 改版可能调整 `settings.section` | 与 `dshmarket`/`cost-meter` 相同的用法；注册失败时降级为「无设置页、默认配对（深色 Soft / 浅色 Hard）」，不影响主题生效 |
| 首屏闪动 | 极短暂显示默认强度 | `overrideTokens` 同步执行 + localStorage 同步读取；0.2.0 起评估 `tapIndex` 注入 |
| Enchanted 的平铺背景 | DSH 部分表面依赖明度差，平铺后可能层次不清 | 保持 `bg0` 主底，仅对必要的层级用 `bg1`/`bg2`；视觉走查确认，必要时按 `design.md` 开放问题 5 调整 |
| `header-*` 色不随强度变化 | 硬/软档的背景亮度差较大时，Enchanted 的常量 header 色对比度可能不足 | 6 档逐页对比度检查；不达标则按背景亮度小幅修正并回写 `reference/palette.md` |

## 8. 工作量

| 阶段 | 内容 | 估算 |
|---|---|---|
| 0.1.0 | 包骨架 / 构建脚本 / 6 套调色板 / token 映射表 / 覆盖层应用 / 设置页 / 持久化 / 本地安装验证 | **2–2.5 天** |
| 0.2.0 | 全页面对比度走查与修正 / shiki 调色 / 中英文案 / 图标 / README 截图 / npm 发布 / 兼容范围实测 | **1.5–2 天** |
| 0.3.0（可选） | Host 侧偏好持久化、首屏注入、系统跟随细节 | 0.5–1 天 |

## 9. 实现前待验证清单

1. `settings.section` 注册后导航项与页面实际渲染（对照 `dshmarket` 的注册方式，失败即降级）。
2. localStorage 在 Desktop（`file://` / 应用内 WebView）与 Web（`http://127.0.0.1`）两种载入方式下的可用性。
3. `ctx.theme.overrideTokens` 在动态安装包中 source 是否被钉为包名（文档如此描述，实测确认 inspect 输出）。
4. `engines.dsh` 在 0.2.1-rc.2 上的安装 / 激活判定（与 `dsh-context` 的 `engines.dsh` 写法对齐）。
5. `--shiki-token-*` 是否在聊天气泡、diff、工具输出三处共同生效。
6. 默认配对是否与 Enchanted 一致：深色 `bg0 = #333C43`、浅色 `bg0 = #FFFBEF`（body 计算值核对）。
7. 6 档强度 × 关键前景色（`fg`、`grey1`、`header-*`、状态色）的对比度检查记录。

## 10. 参考

- 配色数据：[sainnhe/everforest](https://github.com/sainnhe/everforest)（MIT）、[Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)（MIT，主参考）、[在线调色板](https://everforest.vercel.app/palette)（校色）
- 本项目整理的数据表：[`reference/palette.md`](reference/palette.md)
- 本机插件先例：`dshmarket`（`settings.section` + `ctx.theme` 用法）、`dsh-cost-meter`（`dsh.compatibility` 写法）、`dsh-context`（`engines.dsh` + 双半部结构）
- DSH 实现：`@deepseek-ai/dsh-client-ui-theme`（`ThemeRuntime`、token 样式表、shiki）、`@deepseek-ai/dsh-client-ui-layout`（`ThemePresenter`）
