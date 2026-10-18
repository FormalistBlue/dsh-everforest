# npm 发布与 DSH 安装验证

> 适用版本：0.1.0 起 · 目标包名：`dsh-everforest`（unscoped）· 目标仓库：<https://github.com/FormalistBlue/dsh-everforest>

npm 只是 **分发渠道**；DSH 用户通过插件管理器按包名安装。首次发布前请先完成 `docs/design.md` §9 的安装/覆盖/设置页验证，不建议发布未在本机验证过的版本。

## 发布记录

| 版本 | 日期 | 方式 | dist-tag | shasum | provenance |
|---|---|---|---|---|---|
| 0.1.0 | 2026-10-18 | 本地 `npm publish` + Web-OTP（账号 `shandawang`） | `latest` | `77459d903532a9618f04ba562bbea5aa6c12399d` | 无（本地发布） |
| 0.1.1 | 2026-10-18 | GitHub Actions + Trusted Publishing（tag `v0.1.1`，run `39134686583`） | `latest` | `c88740ea3be8f19e888bba9f4370dbb2d98e7af8` | 有（SLSA v1） |

- 新包名首次发布会进入 npm 的 **staged publishing** 队列：registry 先出现占位版本 `0.0.0-stage`（description = `Temporary package placeholder for staged publishing`），约 1 分钟后 `0.1.0` 生效并接管 `latest`。看到占位版本不要重复发布。
- 发布后安装验证要使用**空缓存**，否则发布前缓存的 404 packument 会导致 `ETARGET`：`npm install dsh-everforest@0.1.1 --registry=https://registry.npmjs.org --cache <fresh-dir>`。
- **Trusted Publishing 已配置**（2026-10-18，`id 177c86cc-8d54-450d-b06f-d38d6b18bde3`：GitHub Actions / `FormalistBlue/dsh-everforest` / `publish.yml`，permissions = publish + stage publish）。**0.1.1 已由 CI 成功发布**（无 2FA、带 provenance）；此后按 §3 的 tag 流程发布即可。**不要补推 `v0.1.0` tag**——0.1.0 已由本地发布，tag 会触发 CI 重复发布并得到 `EPUBLISHCONFLICT`。

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

# 构建 + 检查包内容（prepack 会自动重跑 build，若 package.json 配了该脚本）
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
- 仓库里已有 [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)，它用 `permissions: id-token: write` + `npm publish --provenance`，不需要任何 npm token；
- 之后发布：改版本 → 提交 → 打 tag `vX.Y.Z` → `git push origin main --tags`，CI 自动发布并生成 provenance。

以 [npm Trusted publishing 文档](https://docs.npmjs.com/trusted-publishers) 为准。

## 4. 发布前检查清单（本仓库专属）

`package.json` 至少包含：`name` / `version` / `description` / `type: module` / `license` / `author` / `repository` / `homepage` / `bugs` / `keywords` / `icon` / `engines.dsh` / `exports` / `files` / `dsh.bundle.patch` / `dsh.client` / `publishConfig.access: "public"`。

`files` 白名单必须覆盖运行时文件：

- `index.js`（Host 半部）、`client.js`（Browser 半部构建产物）
- `cordis.patch.yml`（bundle patch）
- `locale/*.json`（插件管理页标题/描述，`meta.title` / `meta.description`）
- `icon.svg`、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`

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

DSH 侧（本机 profile = `desktop`）：

1. 插件管理页搜 `dsh-everforest` 安装，或由 Agent 调用 `plugin_manager` 的 `install_bundle`（target 为 `dsh-everforest` / `dsh-everforest@0.1.0`）；
2. 期望：`application: applied`；插件列表出现标题/描述/图标（来自 `locale/*.json` 与 `icon.svg`）；
3. `cordis_inspect_query`（Client `Theme.listTokens`）出现覆盖 token；`Slots.listSubTree` 根 `settings.section` 出现 `id: everforest`；
4. Settings → Everforest 可见，切换即时生效；退出应用重启后强度保持；
5. 停用插件后 `body` 内联 `--dsw-*` 消失，回到原生配色。

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

## 8. DSH 生态上架（可选，非 npm 步骤）

npm 发布只解决“可安装”。要在 **DSH Market / Awesome DSH Plugin / dshbase 目录**里被搜到，需要按各目录的 PR/登记流程单独提交（通常读取 npm 包元数据与 `dsh` 清单，或维护一个 registry JSON）。这是 0.2.0 的独立事项，不影响 `plugin_manager` 按名安装。
