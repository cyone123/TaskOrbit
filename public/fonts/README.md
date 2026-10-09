# 本地图标字体

`material-symbols-rounded.woff2` 为桌面端实际使用的 Material Symbols Rounded 子集，
通过本地 `@font-face` 加载，随 Vite / Tauri 构建打包，不依赖 Google Fonts 网络请求。
保留 FILL 0–1 与 opsz 20–48；固定 wght 500、GRAD 0，匹配 `Icon` 组件。

来源、固定上游版本、图标清单及 SHA-256 见 `material-symbols-rounded.json`。
字体遵循 Apache-2.0，原始许可见同目录 `LICENSE`。

## 更新图标

1. 安装生成工具（仅重新生成时需要）：`python -m pip install "fonttools[woff]==4.63.0"`。
2. 修改桌面端图标引用后运行 `pnpm generate:icons`，需要连接 GitHub 下载固定版本的源字体。
3. 提交更新后的 WOFF2、JSON 清单及许可证。

扫描器读取 JSX 图标属性、条件分支、`icon` 配置属性、搜索框默认图标与 Snackbar 默认图标。
若新增通过其他函数、外部数据或计算字符串提供的图标，请将其加入
`scripts/generate-icon-font.mjs` 中的 `extraIcons`。
生成器会验证所有图标名称、连字映射及可变轴。

`pnpm check:icons` 和 `pnpm build` 进行离线一致性校验；常规构建不需要 Python 或网络。
