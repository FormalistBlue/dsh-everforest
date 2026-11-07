# Third-Party Notices

`dsh-everforest` 的配色数据来自 Everforest 配色方案及其 Obsidian 端口 Everforest Enchanted，两者均为 MIT 许可。插件本身不包含上游代码；若后续直接引用上游的脚本或配色文件，将在此列出文件与条款。

## Everforest

- Project: https://github.com/sainnhe/everforest
- Author: Sainnhe Park
- License: MIT
- 使用内容：`palette.md` 中的 6 套背景色阶（dark/light × hard/medium/soft）与前景/强调色。

```text
MIT License

Copyright (c) 2019 sainnhe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Everforest Enchanted

- Project: https://github.com/FireIsGood/obsidian-everforest-enchanted
- Author: FireIsGood
- License: MIT
- 使用内容：默认强度配对（Dark = 官方 soft / Light = 官方 hard）、`header-*` 自定义色、UI 语义映射（链接 / 代码 / 表格 / 选中 / 高亮）、light 选中色修正 `#DED8DB`。

```text
MIT License

Copyright (c) 2023 FireIsGood

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## DeepSeek Harness（宿主提供，不随本包分发）

- 0.3.0 起 Host 半部通过 `import '@deepseek-ai/schemastery'` 使用 DeepSeek Harness 安装自带的 schema 库
  （MIT License，Copyright (c) 2021-present Shigma）。该包由宿主在运行时解析，不进入本包 tarball，
  本仓库也不 vendor 其代码；本包仅以 devDependency 形式钉住同一版本供 `node --test` 使用。
- 插件使用的 cordis 上下文/服务接口同样来自宿主，不在本包内重新分发。
