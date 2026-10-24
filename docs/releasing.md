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
| 0.2.1 | 2026-10-21 | GitHub Actions + Trusted Publishing（tag `v0.2.1`，run `39557780421`） | `latest` | `7538200c1e13a6a37a76e9cb446e63cc8f511fb1` | 有（SLSA v1） |
| 0.3.0 | 2026-10-22 | GitHub Actions + Trusted Publishing（tag `v0.3.0`，run `39721766551`） | `latest` | `e08fe50add7f16c479cc766973e1e8e92b747cce` | 有（SLSA v1） |
| 0.4.0 | 2026-10-23 | GitHub Actions + Trusted Publishing（tag `v0.4.0`，run `39910070876`） | `latest` | `96fbeac4516ad0baf63ac43141c8da239a1d1bcf` | 有（SLSA v1） |
| 1.0.0 | 2026-10-25 | GitHub Actions + Trusted Publishing（tag `v1.0.0`，run `40116912287`） | `latest` | `162d8c5946e862b809b6c473bcc28f68fc97686f` | 有（SLSA v1） |

- 新包名首次发布会进入 npm 的 **staged publishing** 队列：registry 先出现占位版本 `0.0.0-stage`（description = `Temporary package placeholder for staged publishing`），约 1 分钟后 `0.1.0` 生效并接管 `latest`。看到占位版本不要重复发布。
- 发布后安装验证要使用**空缓存**，否则发布前缓存的 404 packument 会导致 `ETARGET`：`npm install dsh-everforest@0.2.0 --registry=https://registry.npmjs.org --cache <fresh-dir>`。本机 npm 默认 registry 是 `registry.npmmirror.com`（镜像同步有延迟），验证时务必显式指定 npmjs.org。
- **发布后 registry 有分层传播**（0.2.0 实测）：版本元数据先出现（`https://registry.npmjs.org/dsh-everforest/0.2.0` 200），npm 命令在约 2 分钟内仍可能对 tarball 返回 404；直接 `GET .../-/dsh-everforest-0.2.0.tgz` 成功后再用空缓存安装即可。workflow 里的 `npm view` 校验步骤同理可能仍显示上一版，以 run 日志里的 `+ dsh-everforest@x.y.z` 为准。
- **Trusted Publishing 已配置**（2026-10-18，`id 177c86cc-8d54-450d-b06f-d38d6b18bde3`：GitHub Actions / `FormalistBlue/dsh-everforest` / `publish.yml`，permissions = publish + stage publish）。**0.1.1 / 0.1.2 / 0.2.0 / 0.3.0 / 0.4.0 / 1.0.0 均已由 CI 成功发布**（无 2FA、带 provenance）；此后按 §3 的 tag 流程发布即可。**不要补推 `v0.1.0` tag**——0.1.0 已由本地发布，tag 会触发 CI 重复发布并得到 `EPUBLISHCONFLICT`。

> **0.3.0 发布注意**（首个把强度偏好迁到 Host 配置的版本）
>
> - **升级后必须重启 DSH**：0.3.0 的 Host 半部新增 `Config`（`src/host-config.js`）并改写首帧 boot 脚本，这些在 Host 启动时装载；只刷新页面不会重载 `index.js`。重启后设置页的强度写入才落当前 profile 的 `cordis.patch.yml`。发布说明与市场条目要写清这一点（0.3.0 首次启动之后，运行时改强度不需要再重启）。
> - **迁移窗口**：0.2.1 用户升级后首次启动时，若 localStorage 有非默认强度且 Host 无用户层，会一次性播种到 Host；验收时先把旧版本留着测一次，确认重启后 Host 值已是用户此前的选择。
> - **市场冷静期**：npm 发布后 24 小时内 pnpm 的 `minimumReleaseAge` 会让市场静默装到上一个成熟版本（§8.6）；市场侧验收 / 上架条目更新要等冷静期过，别把「市场仍装 0.2.1」当成发布失败。
> - **2026-10-22 已发布**：tag `v0.3.0`（commit `d042e49`）→ publish run `39721766551` → npm `latest` = `0.3.0`（`dist.shasum` `e08fe50add7f16c479cc766973e1e8e92b747cce`，带 SLSA provenance），GitHub Release `v0.3.0` 已由 workflow 自动创建；registry 元数据传播约 1 分钟后可在 `https://registry.npmjs.org/dsh-everforest/0.3.0` 复核。

> **0.4.0 发布注意（已发布，2026-10-23）**
>
> - **升级后必须重启 DSH**：0.4.0 的 Host `Config` 增加第三个 volatile 字段 `colorMode`；Host 半部在启动时装载，刷新页面不会重载 `index.js`。重启后设置页的色彩模式开关才写进当前 profile 的 `cordis.patch.yml`。未重启时新 Client 退回 localStorage-only（开关仍生效、只是暂不写 Host）。
> - **回滚必须先清理配置**：0.4.0 → 0.3.0 前从 profile patch 删除 `everforest` 行的 `colorMode` 字段，否则 0.3.0 的 schema 校验失败、entry 不激活（无主题）。0.2.1 无 `Config`，不受影响。
> - **真机验收**：2026-10-23 用户在本机 DSH（重启后）目检设置页、色彩模式开关与 6 套配色下的聊天富文本 / 会话行，确认「这次调整没什么问题了」并要求发布；release 前最后一次自动化门禁为 `node --test` 170/170 + `npm run check` 全绿。
> - **实验性口径**：市场条目文案按 2026-10-22 定稿的短文案，不随本功能追加（见 §8.6 / 仓库约定「插件功能迭代后不追加市场描述」）；CHANGELOG / design 已注明实验性、默认开启可关闭、DSH 升级需回归。README 按用户要求保持发布版原文案不动。
> - **2026-10-23 已发布**：tag `v0.4.0`（commit `af4ec47`）→ publish run `39910070876` → npm `latest` = `0.3.0` 传播中 / 最终 `0.4.0`（`dist.shasum` `96fbeac4516ad0baf63ac43141c8da239a1d1bcf`，带 SLSA provenance，transparency log index `3412457040`），GitHub Release `v0.4.0` 已由 workflow 自动创建（2026-10-23T06:12:33Z）。registry 传播期以 `+ dsh-everforest@0.4.0` 与 tarball URL 为准。
>
> **2026-10-24 起的兼容说明（色彩模式改为默认提供、无设置开关；版本号仍记 0.4.0、尚未发布）**
>
> - 新版本的 Host `Config` 回到 `light` / `dark` 两个 volatile 字段，设置页不再有色彩模式开关；旧 profile patch 里由 0.4.0 发布版残留的 `colorMode` 键会被 schema **容忍并忽略**（schemastery 忽略未知键：校验照常通过、值不生效），**不需要手动删除**，插件也不会主动 unset；0.4.x 浏览器缓存里残留的 `colorMode` 字段同样被忽略、下次写入自然丢弃。
> - Host 半部的 schema 变化仍在 DSH 启动时装载，但旧键兼容——**不存在「为了兼容必须重启」的用例**，也不需要为这次变更改任何 patch。刷新页面即可看到新设置页；Host 侧新 schema 在下一次 DSH 启动后生效，两种状态下功能与主题都正常。

> **1.0.0 发布注意（已发布，2026-10-25）**
>
> - **升级 0.4.0 → 1.0.0 需要重启一次 DSH**：Host `Config` 从三个 volatile 字段（`light` / `dark` / `colorMode`）回到 `light` / `dark`，Host 半部在 DSH 启动时装载；只刷新页面时新 Client 立即生效（主题、设置页、6 档都正常），Host 侧新 schema 在下次启动后接管。旧 profile patch 里 0.4.0 残留的 `colorMode` 键被 schemastery 忽略，**不需要手改 patch**。
> - **回滚不需要清理 patch**：1.0.0 只写 `light` / `dark`，回滚到 0.4.0 / 0.3.0 时旧 schema 不会遇到未知键，无需按「0.4.0 → 0.3.0」那套步骤手动删 `colorMode`。
> - **首个稳定版口径**：1.0.0 把 0.4.0 之后未发布的改动（色彩模式改为默认提供、工作区当前会话行、原生文本选区、深浅切换聚光灯、开发调试面板，以及 README / 市场截图 / 插件图标重做）作为稳定行为发布；`engines.dsh` 仍为 `>=0.2.1-rc.2 <0.3.0-0`，目标 DSH 0.2.1-rc.3 不变。
> - **2026-10-25 已发布**：tag `v1.0.0`（commit `aa3781f`）→ publish run `40116912287` → npm `latest` = `1.0.0`（`dist.shasum` `162d8c5946e862b809b6c473bcc28f68fc97686f`，SLSA provenance，由 GitHub Actions trusted publishing 完成），GitHub Release `v1.0.0` 已由 workflow 自动创建；发布前门禁 `node --test` 220/220 + `npm run check` 全绿。
> - **市场冷静期**：npm 发布后 24 小时内市场仍可能装到 0.4.0（§8.6），不要当成发布失败。

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

# 测试用 devDependency（运行时零依赖；Host 的 @deepseek-ai/schemastery 由 DSH 自带，
# 只有 node --test 需要从 node_modules 解析它）。不写 lockfile，也不跑依赖的安装脚本。
& "$node\npm.cmd" install --no-package-lock --ignore-scripts --no-audit --no-fund

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
- 仓库里已有 [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)，它用 `permissions: id-token: write` + `npm publish --provenance`，不需要任何 npm token；发布前会先安装 devDependency（`npm install --no-package-lock --ignore-scripts --no-audit --no-fund`，只有 `@deepseek-ai/schemastery`，运行时零依赖）再跑 `node --test` 与 `npm run check`（与 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) 相同），任一失败即中止；`workflow_dispatch` 手动发布只允许在 `v<version>` 标签对应的提交上运行（`fetch-depth: 0` + `git tag --points-at HEAD` 校验）；
- 之后发布：改版本 → 提交 → 在 `CHANGELOG.md` 写当前版本的小节 `## [X.Y.Z]` → 打 tag `vX.Y.Z` → `git push origin main --tags`，CI 自动发布并生成 provenance；发布前会先跑 `node scripts/release-notes.mjs --version X.Y.Z --check`，该版本小节缺失或为空即中止（此时 npm 尚未发布）；发布成功后按 tag 自动创建 GitHub Release，正文就是该小节（`gh release create --notes-file`，预发布版本自动加 `--prerelease`，已存在的 Release 会跳过）。市场「更新内容」读的正是这个正文，所以小节要写成能独立阅读的版本说明（见 §5）。

以 [npm Trusted publishing 文档](https://docs.npmjs.com/trusted-publishers) 为准。

## 4. 发布前检查清单（本仓库专属）

`package.json` 至少包含：`name` / `version` / `description` / `type: module` / `license` / `author` / `repository` / `homepage` / `bugs` / `keywords` / `icon` / `engines.dsh` / `exports` / `files` / `dsh.bundle.patch` / `dsh.client` / `publishConfig.access: "public"`。

`files` 白名单必须覆盖运行时文件：

- `index.js`（Host 半部：bundle 行 + `Config` 注册 + 首帧调色板注入）
- `client.js`（Browser 半部构建产物）
- `src/palette.js` / `src/color.js` / `src/tokens.js` / `src/state.js` / `src/host-config.js`（Host 半部运行时
  import；缺一个 Host 半部会加载失败，首帧注入与插件行一起消失）
- `cordis.patch.yml`（bundle patch；entry id `everforest` 同时是 Client `ctx.configForms.get('everforest')` 的键）
- `locale/*.json`（插件管理页标题/描述，`meta.title` / `meta.description`）
- `icon.svg`、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`

> `@deepseek-ai/schemastery` 只写在 `devDependencies`：Host 半部在 DSH 进程里 import 时由宿主从自己的安装解析，
> 若写进 `dependencies` 会装出第二份实例；它进不了 tarball（`files` 白名单不含 `node_modules`），测试前用
> `npm install --no-package-lock --ignore-scripts --no-audit --no-fund` 安装即可。

> 客户端入口是 `src/client-entry.js`，**不要改回 `src/index.js`**：npm 11 的 packlist 在根 `main` 为 `index.js` 且 `files` 含嵌套文件时会把嵌套的 `src/index.js` 误打进 tarball（2026-10-19 实测）；改名后 `npm pack` 与白名单一致。

检查：

```powershell
& "$node\npm.cmd" pack --dry-run
```

要看到上述文件，且**不**包含 `src/`、`scripts/`、`docs/`、`.github/`、`node_modules/` 等开发文件（由 `files` 控制）。重点确认 `client.js` 在清单里——缺它插件能装上但 Client 半部加载失败。

另外核对：

- `engines.dsh` = `>=0.2.1-rc.2 <0.3.0-0`（安装前与装载 profile 时都会校验；2026-10-24 复核 0.2.1-rc.3 满足该区间，未抬高下限）；
- 版本号与 git tag 一致（`v0.1.0` ↔ `0.1.0`）；预发布版本只能发到非 `latest` 的 dist-tag（例如 `--tag next`）；
- `CHANGELOG.md` 有当前版本对应的 `## [<version>]` 小节且非空（`node scripts/release-notes.mjs --check`；`node --test` 与 publish 都会拦）。它是 GitHub Release 正文、也就是市场「更新内容」的唯一来源，不要再依赖 `--generate-notes` 从 commit/PR 自动生成；
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
- Releases 页应出现 `v<version>`，正文取自 `CHANGELOG.md` 的对应小节（`--notes-file`，不再是 `--generate-notes`）。若 `Create GitHub Release` 一步失败，npm 包其实已经发布成功，本地补一条即可，不用重跑发布：

```powershell
# 已发布但 Release 缺失：用同一份 CHANGELOG 小节补建（tag 换成实际版本）
node scripts/release-notes.mjs --version 0.4.0 --out notes.md
gh release create v0.4.0 --verify-tag --notes-file notes.md
# Release 已存在、只是正文不对（例如 0.4.0 的旧 --generate-notes 产物）：
# gh release edit v0.4.0 --notes-file notes.md
```

> **市场「更新内容」的链路**（dsh-market 1.66.x）：市场不读 `CHANGELOG.md`、也不读 README。awesome-dsh-plugin 每天探测一次每个仓库**最新一个正式 Release 的正文**（跳过 draft / prerelease），发布成 npm 包 `dsh-plugin-updates` 与 <https://awesome-dsh-plugin.com/updates.json>；dsh-market 拉取后显示在更新行的「更新内容」弹窗里，**最多渲染前 4 KB**。没有 Release 才退到最近 5 条 commit 的首行，纯 npm 安装退到版本发布时间。所以：小节要写成能独立阅读的版本说明，最重要的改动放开头；标题用 `###`（Release 正文不含 `##` 标题）；改完 Release 后市场最多约 1 天（探测每日 + 市场缓存 1 小时）才刷新。

DSH 侧（本机 profile = `desktop`）：

1. 插件管理页搜 `dsh-everforest` 安装，或由 Agent 调用 `plugin_manager` 的 `install_bundle`（target 为 `dsh-everforest` / `dsh-everforest@0.3.0`）；
2. 期望：`application: applied`；插件列表出现标题/描述/图标（来自 `locale/*.json` 与 `icon.svg`）；
3. `cordis_inspect_query`（Client `Theme.listTokens`）出现覆盖 token；`Slots.listSubTree` 根 `settings.section` 出现 `id: everforest`；
4. Settings → Everforest 可见，切换即时生效。**0.3.0 起强度写进当前 profile 的 `cordis.patch.yml`（`everforest` 行的 `config.light` / `config.dark`），同一 profile 换浏览器 / 重启 DSH 后仍在**；清掉本浏览器 localStorage 也不影响强度（localStorage 只是首帧缓存）。
5. **升级 / 回滚后必须重启 DSH**：Host 半部（`index.js` / `src/host-config.js`）在 Host 启动时装载，刷新页面不会重载。只更新 npm 包但没重启时，新 Client 会退回 localStorage-only（选择仍生效、只是暂不写 Host），重启 DSH 后第一次加载会把本地缓存一次性播种到 Host。0.2.1 → 0.3.0 的首次启动会自动把旧 localStorage 的非默认强度一次性播种到 Host（前提是 Host 尚无用户配置），升级验收请用旧版本留下非默认强度后重启确认。
6. **写入被拒时回读 Host**：home patch / `--patch` 覆盖等场景以 `mutate` 返回 `false`（`response.ok=false`）表现——settings 服务回读，Client 以 Host 值为准并 warn 一次，设置页不弹错；旧宿主（无 settings 服务 / schemastery 无 `volatile()`）下表单不出现，强度退回 localStorage（按 origin），设置页不报错。正常 profile 不应出现该降级。
7. 停用插件后 `body` 内联 `--dsw-*` 消失，回到原生配色；profile patch 里的 `everforest` 行 `config` 会随卸载/停用保留（下次启用继续用）。
8. 首帧：Web 刷新 / 新开标签时 loading 页（含 spinner 环与进度弧）即为当前配色（本浏览器缓存优先、Host 值兜底，见 `design.md` §5）；Desktop 完全退出后重启，原生色最多 1 帧。**Host 半部（`index.js`）改动必须重启 Host 进程**——Web 每次 index 渲染都会重新收集首帧 row（运行中改强度对新打开的页面即时生效），Desktop 则只在 Host ready 时采集一次、之后窗口重载沿用冻结副本（靠 localStorage 缓存兜底）；单纯刷新页面不会重载 `index.js`，只换 `client.js` 也不会更新它。

> **2026-10-22 真机目检**：0.3.0 已按本节清单由用户确认通过（导航与设置页、跨浏览器共享 / 重启保持、0.2.1 迁移播种、首帧、停用清理与「升级需重启 Host」）；未逐项留存截图，细节以本节为准。

## 6. 撤销与回滚

- npm 24 小时内可 `npm unpublish dsh-everforest@版本`（**不能重发同版本号**，要改版本重发）；超过 24 小时用 `npm deprecate dsh-everforest@版本 "message"` 标记。
- 发布内容错误优先“发新补丁版本 + deprecate 旧版本”，不要依赖 unpublish。
- 回滚到 Host 半部不同的版本（0.2.1 ↔ 0.3.0）**同样需要重启 DSH** 才生效；0.3.0 写入 profile patch 的
  `config` 对 0.2.1 无害（0.2.1 没有 `Config` 导出、`apply` 不读第二个参数），但会被忽略、强度退回 localStorage；
  需要时可手动删除该行 `config`。
- **2026-10-24 起（色彩模式已无设置开关）**：本版本不再声明 `colorMode`，profile patch 里残留的旧键无需处理
  （schema 容忍并忽略，见上方「0.4.0 发布注意」的兼容说明）；只有回滚到 0.3.0 时才需要按 0.4.0 发布时的历史
  口径先清理该字段。
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
| DSH 提示不兼容 | `engines.dsh` 与运行时版本不匹配（本机 0.2.1-rc.3；兼容区间自 rc.2 起） |
| 发布后本地仍装旧版 | 插件管理器安装会锁定版本；升级用 `plugin_manager` update/重装，替换已运行的包需重启 |
| 升级后强度只在当前浏览器生效、patch 里没有 `config` | 只更新了 npm 包但没重启 DSH：Host 半部仍是旧版，新 Client 退回 localStorage-only；重启 DSH 后首启会把本地缓存一次性播种到 Host |
| 手改 profile patch 成非法强度 | 运行中：volatile-only 更新解析失败被捕获 → Host warning、entry 保持 ACTIVE（旧配色不丢），改回合法值热恢复；冷启动 / 重挂：entry 不激活（无主题），改回合法值或删除 `config` 后重启恢复 |
| publish 停在 `Prepare release notes from CHANGELOG.md` | `CHANGELOG.md` 缺当前版本 `## [X.Y.Z]` 小节，或小节为空；补写后重新提交再发。tag 已推时：`git tag -f vX.Y.Z` + `git push --force origin vX.Y.Z` 重跑——该检查在 `npm publish` 之前，此时还没发版，不会撞版本号 |
| 市场「更新内容」只有一条 `Full Changelog` 链接 / 显示「该插件未提供更新说明」 | 该 Release 是旧的 `--generate-notes` 产物（0.4.0 及更早）；用 §5 的 `gh release edit --notes-file` 回填；市场每日探测，约 1 天内生效（弹窗只显示前 4 KB） |

## 8. DSH 生态上架：awesome-dsh-plugin 目录（dshmarket.com 的数据源）

npm 发布只解决“可安装”。[dshmarket.com](https://dshmarket.com/)、[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/)、dsh-market 插件市场的 **Themes Tab**，以及 dsh 0.2.1+ 的 **Plugins → Discover** 索引，读的都是同一个策展目录 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。**上架 = 向该仓库提一个只新增一个 YAML 文件的 PR**；`dsh-market` 仓库只收市场 App 代码，不收插件条目（见其 README 的 “Submit your plugin”）。

### 8.1 一次 PR 覆盖的入口

- `data/plugins/<owner>__<repo>.yml` → 自动生成两个 README（**禁止手改**）→ 站点构建 → `plugins.json`；
- 站点：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/) 与 [dshmarket.com](https://dshmarket.com/)；
- npm 包 `dsh-plugin-catalog`（每日 CI 发布）：dsh 0.2.1+ Discover 索引 / `plugin_market` 工具；
- dsh-market App：`category: theme` 的条目自动进入 **Themes Tab**（一键安装 / 切换 / 卸载）。

### 8.2 条目文件（2026-10-18 起草；2026-10-22 起描述文案由用户固定，此后不随功能更新）

路径 `data/plugins/FormalistBlue__dsh-everforest.yml`（文件名 = owner__repo）：

```yaml
url: https://github.com/FormalistBlue/dsh-everforest
name: FormalistBlue/dsh-everforest
category: theme
description:
  en: 'Everforest color themes for DeepSeek Harness Web/Desktop: six schemes (dark and light, each in hard, medium and soft).'
  zh: '为 DeepSeek Harness Web/Desktop 提供 Everforest 配色。深色 / 浅色各硬 / 中 / 软共 6 套。'
```

> **描述文案已冻结（2026-10-22 用户指定）**：市场条目一律使用上面这段文案；除非用户明确要求修改，否则插件
> 功能迭代（Host 持久化、accent 等）之后**不要**更新或追加描述内容，也不要顺手把它改回长版。英文槽位是中文
> 文案的同义直译。改动代码/README 时不需要同步这段文案。

字段白名单只有 `url` / `name` / `category` / `description`（可选 `tarball`）；多写 `npm:` / `author:` / `screenshots:` 会被校验直接拒。`description.en` 必须、单行、以句号结尾、**必须与代码相符**（评审会数描述里的数字与 API 名），`zh` 可选。描述里含 `: ` 时必须加引号。

### 8.3 现状与前置条件

| 条件 | 状态 |
|---|---|
| `package.json#dsh.bundle` + 根 `cordis.patch.yml`（只声明 `dsh.client` 是第一大被拒原因） | 已有 |
| 仓库公开、LICENSE | MIT，public |
| 仓库创建满 1 天（CI 自动检查） | 创建于 `2026-10-18 07:07 UTC` → **最早 2026-10-19 15:07（HK）提 PR** |
| GitHub topic `dsh-plugin` | **需在仓库 Settings 添加**（当前 topics 为空） |
| `screenshots.json` | 已加（仓库根，见 §8.4） |
| npm 映射（市场快速安装 / 下载量） | 自动：读仓库 HEAD 的 `package.json#name`，并要求已发布包的 `repository` 指回本仓库；`dsh-everforest@0.3.0` 已发布（2026-10-22），满足，**不要**在 yml 里写包名 |

### 8.4 截图（仓库根 `screenshots.json`）

市场优先读插件仓库根的 `screenshots.json`：1–8 张，路径相对该文件、不能跳出插件目录，或 GitHub 托管的 https 绝对地址（第三方图床被拒）；仓库没有声明时才回退到 README 里的图片。当前 2 张（真机完整窗口截图，默认深色 Soft / 浅色 Hard）：

```json
[
  ".github/assets/everforest-dark-soft.png",
  ".github/assets/everforest-light-hard.png"
]
```

换图推本仓库即可，下一轮构建生效，不用回目录仓库改。`screenshots.json` 不进 npm `files` 白名单（市场从仓库读，不随包安装）。

### 8.5 提交步骤

1. PR 前：给仓库加 `dsh-plugin` topic；`git status` 干净；先 `npm install --no-package-lock --ignore-scripts --no-audit --no-fund`，再跑 `node --test` 与 `npm run check` 全绿（sandbox 下 `node --test` 会因 `spawn EPERM` 失败，需在普通终端跑）。
2. 提交：fork 与分支已在 2026-10-18 预置——`FormalistBlue/awesome-dsh-plugin` 的分支 `add-dsh-everforest` 已包含该条目文件（相对上游 `main` 只新增 1 个文件）。仓库满 1 天后打开 <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...FormalistBlue:add-dsh-everforest?expand=1> 点 **Create pull request**（标题 `Add FormalistBlue/dsh-everforest`）。需要重做时：fork → 只新增 `data/plugins/FormalistBlue__dsh-everforest.yml` → 开 PR。一个 PR 最多 3 条、别动别人的条目、别手改两个 README。
3. CI 顺序检查：条目数 ≤3 → 仓库 HEAD 的 `package.json#dsh.bundle` → 仓库年龄 ≥1 天 → `awesome-lint` + README 重生成。
4. 合并后站点自动重建；`dsh-plugin-catalog` 每日发 npm；市场 App 下次打开即拉到最新目录（通常 1 天内出现）。
5. 以后更新条目只改这一个 yml。

### 8.6 常见打回 / 注意

- 描述夸大（数字、命令名、API 名会被逐条核对）是“本来合格却被拒”的首要原因——只写能力；
- 缺 `dsh.bundle`、仓库年龄不足、缺 `dsh-plugin` topic、占位/空壳仓库；
- 收录不等于安全审查；
- 刚发 npm 版本 24 小时内，pnpm 的 `minimumReleaseAge` 会让市场静默装到上一个成熟版本——上架前先发最终版并过一个冷静期；
- 市场更新弹窗的「更新内容」= **最新 GitHub Release 的正文**（每日探测、前 4 KB、跳过 prerelease），也就是 `CHANGELOG.md` 对应小节；发版时漏写小节会先被 publish 门禁拦下（§4 / §5）；
- `engines.dsh`（当前 `>=0.2.1-rc.2 <0.3.0-0`）决定市场卡片的“宿主要求”与兼容过滤：低于它的用户可能被隐藏，放宽前需在旧宿主验证 token 覆盖；0.2.1-rc.3 已满足该区间（2026-10-24 复核），不抬高下限以免隐藏仍用 rc.2 的用户。
