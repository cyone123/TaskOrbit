# Repository Guidelines

## 项目结构与模块组织

- `src/` 是 React + TypeScript 前端：`views/` 放页面级视图，`components/` 放可复用组件，`store/` 管理应用状态、种子数据和持久化，`utils/` 放日期与 ID 工具，`theme/` 放主题逻辑和样式。
- `src-tauri/` 是 Tauri 2/Rust 桌面层；`src-tauri/src/state.rs` 负责通过命令读写应用数据，`tauri.conf.json` 管理窗口和打包配置。
- `scripts/` 放辅助脚本（如图标生成）；根目录的 `app-icon.png` 与 `src-tauri/icons/` 是应用资源。`dist/`、`src-tauri/target/` 为生成目录，不要手工编辑或提交。

## 构建、测试与开发命令

先执行 `pnpm install` 安装依赖。

- `pnpm dev`：启动 Vite 开发服务器，默认地址为 `http://localhost:1420`。
- `pnpm tauri dev`：启动带桌面壳的开发应用。
- `pnpm build`：先运行 TypeScript 检查，再生成 Vite 生产构建到 `dist/`。
- `pnpm tauri build`：构建并打包桌面应用；修改 Rust 后也可运行 `cargo check --manifest-path src-tauri/Cargo.toml`。
- `pnpm preview`：本地预览已生成的前端构建。

## 编码风格与命名约定

TypeScript 使用严格模式、2 空格缩进、双引号、分号和尾随逗号，延续现有写法。组件和视图使用 PascalCase（如 `CalendarView.tsx`），函数、变量和文件工具名使用 camelCase，类型和接口使用 PascalCase，常量使用全大写下划线（如 `STATE_VERSION`）。Rust 代码使用 `rustfmt` 和 snake_case。当前未配置 ESLint 或 Prettier；提交前应保持邻近代码风格，并避免无关格式化。

## 测试指南

当前 `package.json` 未配置测试框架、测试脚本或覆盖率门槛。提交前至少运行 `pnpm build`，并手动检查项目、日历、番茄钟、统计页面及刷新后的数据持久化。新增测试时使用 `*.test.ts` 或 `*.test.tsx` 命名，并同时补充可执行的 package script；涉及 Rust 状态命令时运行 `cargo check`。

## 提交与 Pull Request 规范

Git 历史目前只有 `first commit`，尚未形成既有约定。建议提交信息使用简短祈使句和类型前缀，例如 `feat: add weekly calendar view`、`fix: preserve task state`、`docs: update contributor guide`。PR 应说明目的、主要改动、验证命令和潜在影响；界面变更附截图或录屏，关联对应 issue，并注明是否影响 Tauri 打包或平台行为。保持 PR 聚焦，避免提交构建产物和本地数据。

## 架构与数据注意事项

`StoreProvider` 是前端状态的单一入口，状态结构由 `src/types.ts` 定义并通过 Tauri 命令保存为应用数据目录中的 `data.json`。修改状态结构时同步更新 `STATE_VERSION`、归一化逻辑和兼容迁移；不要把用户数据、密钥或平台生成文件写入仓库。
