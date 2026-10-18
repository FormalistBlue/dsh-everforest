# dsh-everforest

Everforest 配色主题插件，用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的 Web / Desktop 界面。

> 状态：**WIP** —— 仓库刚初始化，插件代码尚未落地。

## 目标

- 把 [Everforest](https://github.com/sainnhe/everforest) 配色完整接入 DSH 界面（聊天区、侧栏、设置、代码块、diff、终端、菜单/浮层等）。
- 覆盖 `Dark Hard / Medium / Soft` 与 `Light Hard / Medium / Soft` 变体。
- 以 **design token 覆盖** 的方式实现，不改组件 CSS，尽量不随 DSH 小版本升级而碎。

## 技术路线（v1）

DSH 的主题由一组 `--dsw-*` CSS 变量驱动（静态色阶 `--dsw-static-*`、语义别名 `--dsw-alias-*`、特定表面 `--dsw-specific-*`），定义在 `body` 和 `body[data-ds-dark-theme]` 上。

插件形态：**host-only bundle，无需客户端打包 / React**。

```
everforest-dsh/            # 本仓库即插件包
├── package.json           # "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
├── cordis.patch.yml       # 向 profile 插入插件行
├── index.js               # apply(ctx) → webserver/index-inject 注入 <style>
├── theme/*.css            # 各变体的 token 覆盖
└── README.md
```

安装：在 DSH 侧栏 **Plugins → Add plugin → Install a third-party plugin** 选择本地目录
（或发布后 `dsh plugin --profile <name> add dsh-everforest`），然后重启 DSH。

## 路线图

- [ ] 0.1.0 — 插件骨架 + Dark Medium 映射（可安装、整站生效）
- [ ] 0.2.0 — Hard / Soft / Light 变体 + 配置项
- [ ] 0.3.0 — npm 发布 + 截图 + `engines.dsh` 兼容范围
- [ ] 1.0.0 —（可选）客户端插件，在"外观"设置里提供 Everforest 选项

## 参考

- 插件开发：`docs/user/develop/basic/index.zh.md`（DSH 仓库）
- 打包安装：`docs/user/develop/basic/publish.zh.md`
- Web 样式规范：`docs/web-styling.zh.md`
- token 清单：`packages/client/ui-theme/src/styles/design-platform.css`

## License

MIT
