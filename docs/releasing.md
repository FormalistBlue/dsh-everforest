# npm 发布与 DSH 安装验证

> 适用版本：0.1.0 起 · 目标包名：`dsh-everforest`（unscoped）· 目标仓库：<https://github.com/FormalistBlue/dsh-everforest>

npm 只是 **分发渠道**；DSH 用户通过插件管理器按包名安装。首次发布前请先完成 `docs/design.md` §9 的安装/覆盖/设置页验证，不建议发布未在本机验证过的版本。

## 发布记录

| 版本 | 日期 | 方式 | dist-tag | shasum | provenance |
|---|---|---|---|---|---|
| 0.1.0 | 2026-10-18 | 本地 `npm publish` + Web-OTP（账号 `shandawang`） | `latest` | `77459d903532a9618f04ba562bbea5aa6c12399d` | 无（本地发布） |
| 0.1.1 | 2026-10-18 | GitHub Actions + Trusted Publishing（tag `v0.1.1`，run `39134686583`） | `latest` | `c88740ea3be8f19e888bba9f4370dbb2d98e7af8` | 有（SLSA v1） |
| 0.1.2 | 2026-10-18 | GitHub Actions + Trusted Publishing（tag `v0.1.2`，run `39138160540`） | `latest` | `aebc8d78948f8c1bc14a52d06e4d0dddcc1a315f` | 有（SLSA v1） |
| 0.2.0 | 2026-10-19 | GitHub Actions + Trusted Publishing（tag `v0.2.0`，run `39144602213`） | `latest` | `e817afe82e57d0279c4eb7eeefcb9b281f6095b3` | 有（SLSA v1） |

- 新包名首次发布会进入 npm 的 **staged publishing** 队列：registry 先出现占位版本 `0.0.0-stage`（description = `Temporary package placeholder for staged publishing`），约 1 分钟后 `0.1.0` 生效并接管 `latest`。看到占位版本不要重复发布。
- 发布后安装验证要使用**空缓存**，否则发布前缓存的 404 packument 会导致 `ETARGET`：`npm install dsh-everforest@0.2.0 --registry=https://registry.npmjs.org --cache <fresh-dir>`。本机 npm 默认 registry 是 `registry.npmmirror.com`（镜像同步有延迟），验证时务必显式指定 npmjs.org。
- **发布后 registry 有分层传播**（0.2.0 实测）：版本元数据先出现（`https://registry.npmjs.org/dsh-everforest/0.2.0` 200），npm 命令在约 2 分钟内仍可能对 tarball 返回 404；直接 `GET .../-/dsh-everforest-0.2.0.tgz` 成功后再用空缓存安装即可。workflow 里的 `npm view` 校验步骤同理可能仍显示上一版，以 run 日志里的 `+ dsh-everforest@x.y.z` 为准。
- **Trusted Publishing 已配置**（2026-10-18，`id 177c86cc-8d54-450d-b06f-d38d6b18bde3`：GitHub Actions / `FormalistBlue/dsh-everforest` / `publish.yml`，permissions = publish + stage publish）。**0.1.1 / 0.1.2 / 0.2.0 均已由 CI 成功发布**（无 2FA、带 provenance）；此后按 §3 的 tag 流程发布即可。**不要补推 `v0.1.0` tag**——0.1.0 已由本地发布，tag 会触发 CI 重复发布并得到 `EPUBLISHCONFLICT`。

## 0. 发布前必须确认

- npm 账号已注册并**验证邮箱**；为账号启用 **2FA**（发布时要求 OTP 或使用自动化 token）。
- 包名：**首次发布前**确认 `npm view dsh-everforest version` 返回 404（本仓库 0.1.0 已占用，后续版本跳过此项）。包名 **发布后不能改名**，且必须与 Client 模块 id 一致（`window.__ModuleLoader__.load({ id: 'dsh-everforest', … })`），所以先定死。
- `package.json` 存在且字段完整（见 §4），`client.js` 已构建并入库。
- 本机没有全局 node/npm，可用以下任一 Node（都自带 npm）：
  - fnm 安装的 Node：`C:\Users\formalistBlue\AppData\Roaming\fnm\node-versions\v24.17.0\installation`（node v24.17.0 / npm 11.13.0）；
  - DSH Desktop 自带运行时：`C:\Users\formalistBlue\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`（该发行版**不含 npm**，只能跑脚本，不能 publish；publish 用上一项的 npm 或 `pnpm`）。

## 1. 首次发布：两条路线（0.1.0 已完成，保留供新包参考）

npm 的 **Trusted Publishing（OIDC）要求包在 registry 上已经存在**，所以新包第一次发布必须先走 token/OTP，之后才能交给 CI。

### 路线 A：本地发布 0.1.0（推荐，最快）

在仓库目录，用 fnm 的 npm：

```powershell
$node = 'C:\Users\formalistBlue\AppData\Roaming\fnm\node-versions\v24.17.0\installation'
& "$node\npm.cmd" login            # 浏览器完成登录，之后 publish 会要 OTP
& "$node\npm.cmd" whoami

# 构建 + 检查包内容（prepack 只做 `build.mjs -C` 新鲜度校验，不会重新生成产物）
& "$node\npm.cmd" run build
& "$node\npm.cmd" pack --dry-run    # 核对打印出的文件清单（见 §4）

# 发布（unscoped 默认 public；显式写 --access public 更稳）
& "$node\npm.cmd" publish --access public
```

发布成功后立刻做 §5 的 npm 侧验证，然后按 §3 配置 Trusted Publishing，后续用 CI 发布。

> 如果不想用 fnm 的 npm，也可用本机 pnpm 11.28.5 发布（同样支持 `--otp` / `--access public` / `--tag`）：
> `node C:\Users\formalistBlue\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.cjs publish --access public`。
> pnpm 不生成 npm 的 provenance 证明；provenance 交给 §3 的 CI。

### 路线 B：先发 0.0.0 stub 占名，再全程 OIDC（可选）

如果担心包名在开发期间被占用，可以先发一个最小 stub，然后配置 trusted publishing，0.1.0 直接由 CI 发布：

```powershell
pnpm dlx setup-trusted-publishing --access public
```

该工具会发布 `0.0.0` stub（只含 package.json/index.js/README）并在 npm 上建好包页面；随后到 npmjs.com 配置 §3，0.1.0 用 CI 覆盖为正式版本。注意 stub 会短暂占据 `latest`，正式版发布后自动前移。

## 2. 用 token / OTP 发布（备用）

- **交互式**：`npm login` 后用 OTP 发布（上面路线 A）。
- **CI 用 token**：npmjs.com → Access Tokens → 生成 **Granular Access Token**（限定 `dsh-everforest`、读写、勾选 bypass 2FA 的自动化用途），在 GitHub 仓库 Secrets 里存为 `NPM_TOKEN`，workflow 里用 `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`。token 不要提交进仓库，也不要写进 `.npmrc`。

## 3. 配置 Trusted Publishing（已完成，后续免 token / 免 2FA）

前提：包已在 npm 上存在（首次发布完成后）且 GitHub 仓库**公开**（私有仓库请继续用 token）。

**当前已配置（2026-10-18）**，可用 `npm trust list dsh-everforest` 复核：

```text
type: github
id: 177c86cc-8d54-450d-b06f-d38d6b18bde3
file: publish.yml
repository: FormalistBlue/dsh-everforest
permissions: publish, stage publish
```

配置方式（CLI，需 npm >= 11.15；本机用 npm 12.2.0 的 `npm trust` 完成）：

```powershell
npm trust github dsh-everforest `
  --file publish.yml `
  --repository FormalistBlue/dsh-everforest `
  --allow-publish `
  --registry=https://registry.npmjs.org
```

- 旧版 npm（<= 11.14.x）的 `npm trust` 不发送 permissions 字段，registry 会返回无 body 的 `400 Bad Request`；npm 11.15+ 要求显式 `--allow-publish`（允许正式发布）或 `--allow-stage-publish`（允许 staged 发布）。
- 网页等价路径：`https://www.npmjs.com/package/dsh-everforest/access` → Trusted publishers → Add a publisher（GitHub Actions；Workflow filename 只写 `publish.yml`；Environment 留空）。
- 仓库里已有 [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)，它用 `permissions: id-token: write` + `npm publish --provenance`，不需要任何 npm token；发布前会先跑 `node --test` 与 `npm run check`（与 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) 相同），任一失败即中止；`workflow_dispatch` 手动发布只允许在 `v<version>` 标签对应的提交上运行（`fetch-depth: 0` + `git tag --points-at HEAD` 校验）；
- 之后发布：改版本 → 提交 → 打 tag `vX.Y.Z` → `git push origin main --tags`，CI 自动发布并生成 provenance；发布成功后还会按 tag 自动创建 GitHub Release（`gh release create --generate-notes`，预发布版本自动加 `--prerelease`，已存在的 Release 会跳过）。

以 [npm Trusted publishing 文档](https://docs.npmjs.com/trusted-publishers) 为准。

## 4. 发布前检查清单（本仓库专属）

`package.json` 至少包含：`name` / `version` / `description` / `type: module` / `license` / `author` / `repository` / `homepage` / `bugs` / `keywords` / `icon` / `engines.dsh` / `exports` / `files` / `dsh.bundle.patch` / `dsh.client` / `publishConfig.access: "public"`。

`files` 白名单必须覆盖运行时文件：

- `index.js`（Host 半部：bundle 行 + 首帧调色板注入）
- `client.js`（Browser 半部构建产物）
- `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js`（Host 半部运行时 import；缺一个 Host 半部会加载失败，首帧注入与插件行一起消失）
- `cordis.patch.yml`（bundle patch）
- `locale/*.json`（插件管理页标题/描述，`meta.title` / `meta.description`）
- `icon.svg`、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`

> 客户端入口是 `src/client-entry.js`，**不要改回 `src/index.js`**：npm 11 的 packlist 在根 `main` 为 `index.js` 且 `files` 含嵌套文件时会把嵌套的 `src/index.js` 误打进 tarball（2026-10-19 实测）；改名后 `npm pack` 与白名单一致。

检查：

```powershell
& "$node\npm.cmd" pack --dry-run
```

要看到上述文件，且**不**包含 `src/`、`scripts/`、`docs/`、`.github/`、`node_modules/` 等开发文件（由 `files` 控制）。重点确认 `client.js` 在清单里——缺它插件能装上但 Client 半部加载失败。

另外核对：

- `engines.dsh` = `>=0.2.1-rc.2 <0.3.0-0`（安装前与装载 profile 时都会校验）；
- 版本号与 git tag 一致（`v0.1.0` ↔ `0.1.0`）；预发布版本只能发到非 `latest` 的 dist-tag（例如 `--tag next`）；
- `npm publish` 前工作区干净（`git status` 无输出），发布 commit 已推送。

## 5. 发布后验证

npm 侧：

```powershell
& "$node\npm.cmd" view dsh-everforest version
& "$node\npm.cmd" view dsh-everforest dist-tags
& "$node\npm.cmd" view dsh-everforest dist.attestations   # 走 trusted publishing 时应有 provenance
```

> 刚发布后 `npm view` 可能短时命中 CDN 旧缓存（仍显示上一版）。用 `https://registry.npmjs.org/dsh-everforest/<version>` 或 packument 的 `?write=true` 直接复核；0.1.1 发布时就遇到过约 1 分钟的缓存滞后。

GitHub / CI 侧：

- `verify` workflow 在 `main` 的最近推送与 PR 上应全绿（6 格矩阵：Ubuntu / Windows × Node 20 / 22 / 24）；
- Releases 页应出现 `v<version>`，notes 由 CI 生成（`--generate-notes`）。若 `Create GitHub Release` 一步失败，npm 包其实已经发布成功，本地补一条 `gh release create v<version> --verify-tag --generate-notes` 即可，不用重跑发布。

DSH 侧（本机 profile = `desktop`）：

1. 插件管理页搜 `dsh-everforest` 安装，或由 Agent 调用 `plugin_manager` 的 `install_bundle`（target 为 `dsh-everforest` / `dsh-everforest@0.2.0`）；
2. 期望：`application: applied`；插件列表出现标题/描述/图标（来自 `locale/*.json` 与 `icon.svg`）；
3. `cordis_inspect_query`（Client `Theme.listTokens`）出现覆盖 token；`Slots.listSubTree` 根 `settings.section` 出现 `id: everforest`；
4. Settings → Everforest 可见，切换即时生效；退出应用重启后强度保持；
5. 停用插件后 `body` 内联 `--dsw-*` 消失，回到原生配色；
6. 首帧：Web 刷新 / 新开标签时 loading 页（含 spinner 环与进度弧）即为当前配色；Desktop 完全退出后重启，原生色最多 1 帧。**Host 半部（`index.js`）改动必须重启 Host 进程**——首帧 row 在 Host ready 时收集，单纯刷新页面或只换 `client.js` 都不会更新它。

## 6. 撤销与回滚

- npm 24 小时内可 `npm unpublish dsh-everforest@版本`（**不能重发同版本号**，要改版本重发）；超过 24 小时用 `npm deprecate dsh-everforest@版本 "message"` 标记。
- 发布内容错误优先“发新补丁版本 + deprecate 旧版本”，不要依赖 unpublish。
- CI 失败时先看 npm 的错误码：`EPUBLISHCONFLICT`（版本已存在）、`404 PUT`（trusted publisher 配置与 workflow/仓库不匹配）、`OTP required`（账号 2FA 但未用 OIDC/automation token）。

## 7. 常见坑

| 现象 | 原因 / 处理 |
|---|---|
| `E404` 首次配置 trusted publisher 找不到包 | 新包必须先发布一次（路线 A 或 B），之后才能配置 |
| `npm trust github` 返回无 body 的 `400 Bad Request` | npm <= 11.14.x 不发送 trusted-publishing permissions 字段；升级到 npm >= 11.15（本机用 12.2.0）并加 `--allow-publish`（或 `--allow-stage-publish`） |
| `404 PUT` / `is not in this registry` | trusted publisher 的 owner/repo/workflow 文件名与运行时 OIDC claims 不一致；workflow 只写 basename |
| `404 PUT` / `is not in this registry` | trusted publisher 的 owner/repo/workflow 文件名与运行时 OIDC claims 不一致；workflow 只写 basename |
| `OTP required` | 账号开了 2FA 但没用 OIDC 或 automation token；本地交互发布需要 OTP |
| 包名冲突 | 发布前 `npm view dsh-everforest version`；发布后不能改名，只能新包名 + 同步改 `dsh.client` id |
| 安装后主题不生效 | tarball 里缺 `client.js`、`exports["./client"]` 错误，或 `dsh.client.platform` 不是 `web` |
| DSH 提示不兼容 | `engines.dsh` 与运行时版本不匹配（本机 0.2.1-rc.2） |
| 发布后本地仍装旧版 | 插件管理器安装会锁定版本；升级用 `plugin_manager` update/重装，替换已运行的包需重启 |

## 8. DSH 生态上架：awesome-dsh-plugin 目录（dshmarket.com 的数据源）

npm 发布只解决“可安装”。[dshmarket.com](https://dshmarket.com/)、[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/)、dsh-market 插件市场的 **Themes Tab**，以及 dsh 0.2.1+ 的 **Plugins → Discover** 索引，读的都是同一个策展目录 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。**上架 = 向该仓库提一个只新增一个 YAML 文件的 PR**；`dsh-market` 仓库只收市场 App 代码，不收插件条目（见其 README 的 “Submit your plugin”）。

### 8.1 一次 PR 覆盖的入口

- `data/plugins/<owner>__<repo>.yml` → 自动生成两个 README（**禁止手改**）→ 站点构建 → `plugins.json`；
- 站点：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/) 与 [dshmarket.com](https://dshmarket.com/)；
- npm 包 `dsh-plugin-catalog`（每日 CI 发布）：dsh 0.2.1+ Discover 索引 / `plugin_market` 工具；
- dsh-market App：`category: theme` 的条目自动进入 **Themes Tab**（一键安装 / 切换 / 卸载）。

### 8.2 条目文件（2026-10-18 起草，2026-10-19 补「首帧」；PR 时原样提交）

路径 `data/plugins/FormalistBlue__dsh-everforest.yml`（文件名 = owner__repo）：

```yaml
url: https://github.com/FormalistBlue/dsh-everforest
name: FormalistBlue/dsh-everforest
category: theme
description:
  en: 'Everforest palettes for the DeepSeek Harness Web/Desktop UI: six schemes (dark and light, each in hard, medium or soft) applied as token-level overrides, with the Host half painting the boot palette so the Web loading screen and first frame are already Everforest; a Settings page picks the scheme and can follow the system appearance.'
  zh: '为 DeepSeek Harness Web/Desktop 提供 Everforest 配色：深色 / 浅色各硬 / 中 / 软共 6 套，以 token 覆盖层生效；Host 半部在 Client 加载前注入 boot 调色板，Web 的 loading 页与首帧即为 Everforest；设置页可选择色板与跟随系统外观。'
```

字段白名单只有 `url` / `name` / `category` / `description`（可选 `tarball`）；多写 `npm:` / `author:` / `screenshots:` 会被校验直接拒。`description.en` 必须、单行、以句号结尾、**必须与代码相符**（评审会数描述里的数字与 API 名），`zh` 可选。描述里含 `: ` 时必须加引号。

### 8.3 现状与前置条件

| 条件 | 状态 |
|---|---|
| `package.json#dsh.bundle` + 根 `cordis.patch.yml`（只声明 `dsh.client` 是第一大被拒原因） | 已有 |
| 仓库公开、LICENSE | MIT，public |
| 仓库创建满 1 天（CI 自动检查） | 创建于 `2026-10-18 07:07 UTC` → **最早 2026-10-19 15:07（HK）提 PR** |
| GitHub topic `dsh-plugin` | **需在仓库 Settings 添加**（当前 topics 为空） |
| `screenshots.json` | 已加（仓库根，见 §8.4） |
| npm 映射（市场快速安装 / 下载量） | 自动：读仓库 HEAD 的 `package.json#name`，并要求已发布包的 `repository` 指回本仓库；当前 `dsh-everforest@0.2.0` 满足，**不要**在 yml 里写包名 |

### 8.4 截图（仓库根 `screenshots.json`）

市场优先读插件仓库根的 `screenshots.json`：1–8 张，路径相对该文件、不能跳出插件目录，或 GitHub 托管的 https 绝对地址（第三方图床被拒）；仓库没有声明时才回退到 README 里的图片。当前 6 张：

```json
[
  ".github/assets/everforest-dark-soft.png",
  ".github/assets/everforest-light-hard.png",
  ".github/assets/everforest-dark-hard.png",
  ".github/assets/everforest-dark-medium.png",
  ".github/assets/everforest-light-medium.png",
  ".github/assets/everforest-light-soft.png"
]
```

换图推本仓库即可，下一轮构建生效，不用回目录仓库改。`screenshots.json` 不进 npm `files` 白名单（市场从仓库读，不随包安装）。

### 8.5 提交步骤

1. PR 前：给仓库加 `dsh-plugin` topic；`git status` 干净；`node --test` 与 `npm run check` 全绿（sandbox 下 `node --test` 会因 `spawn EPERM` 失败，需在普通终端跑）。
2. 提交：fork 与分支已在 2026-10-18 预置——`FormalistBlue/awesome-dsh-plugin` 的分支 `add-dsh-everforest` 已包含该条目文件（相对上游 `main` 只新增 1 个文件）。仓库满 1 天后打开 <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...FormalistBlue:add-dsh-everforest?expand=1> 点 **Create pull request**（标题 `Add FormalistBlue/dsh-everforest`）。需要重做时：fork → 只新增 `data/plugins/FormalistBlue__dsh-everforest.yml` → 开 PR。一个 PR 最多 3 条、别动别人的条目、别手改两个 README。
3. CI 顺序检查：条目数 ≤3 → 仓库 HEAD 的 `package.json#dsh.bundle` → 仓库年龄 ≥1 天 → `awesome-lint` + README 重生成。
4. 合并后站点自动重建；`dsh-plugin-catalog` 每日发 npm；市场 App 下次打开即拉到最新目录（通常 1 天内出现）。
5. 以后更新条目只改这一个 yml。

### 8.6 常见打回 / 注意

- 描述夸大（数字、命令名、API 名会被逐条核对）是“本来合格却被拒”的首要原因——只写能力；
- 缺 `dsh.bundle`、仓库年龄不足、缺 `dsh-plugin` topic、占位/空壳仓库；
- 收录不等于安全审查；
- 刚发 npm 版本 24 小时内，pnpm 的 `minimumReleaseAge` 会让市场静默装到上一个成熟版本——上架前先发最终版并过一个冷静期；
- `engines.dsh`（当前 `>=0.2.1-rc.2 <0.3.0-0`）决定市场卡片的“宿主要求”与兼容过滤：低于它的用户可能被隐藏，放宽前需在旧宿主验证 token 覆盖。
