# AGENTS.md

## 项目概述

Task Orbit 是一个个人任务与日程管理项目，包含 Tauri 2 桌面端（React 18 + TypeScript + Vite / Rust）和 Expo SDK 57 移动端（React Native + Expo Router）。包管理器使用 pnpm workspace。UI 文案为中文。

## 常用命令

```bash
pnpm install                # 安装依赖
pnpm dev                    # 仅启动 Vite 开发服务器（浏览器模式，http://localhost:1420，端口固定）
pnpm tauri dev              # 启动带桌面壳的完整应用
pnpm build                  # core + 移动端 + 桌面端类型检查及桌面生产构建
pnpm tauri build            # 构建并打包桌面应用
pnpm test                   # 运行全部前端测试（vitest run，单次执行）
pnpm mobile                 # 启动 Expo 开发服务器
pnpm mobile:android         # 在 Android 模拟器或设备中打开移动端
pnpm mobile:ios             # 在 iOS 模拟器中打开移动端（本地构建需 macOS）
pnpm mobile:check           # 移动端 TypeScript 检查
pnpm vitest run packages/core/src/timer.test.ts # 运行单个测试文件
pnpm vitest run -t "名称片段"                   # 按测试名过滤
pnpm vitest                 # watch 模式

cargo check --manifest-path src-tauri/Cargo.toml   # 修改 Rust 代码后检查
cargo test --manifest-path src-tauri/Cargo.toml    # 运行 Rust 测试（如 state.rs 中的单元测试）
```

未配置 ESLint/Prettier。提交前至少运行 `pnpm build` 和 `pnpm test`。提交信息使用类型前缀的祈使句，如 `feat: add weekly calendar view`、`fix: preserve task state`。

## 架构

### 状态管理（核心）

单一 `AppState`（定义于 `packages/core/src/types.ts`）是全部应用数据，由 `src/store/store.tsx` 的 `StoreProvider` 管理。跨平台共享的纯 TypeScript 逻辑位于 `packages/core`，桌面端通过 `@task-orbit/core` workspace 包引用：

- **所有状态变更**都通过 store 内的 `mutate()` 走纯函数：`domain.ts` 导出 `xxxState` 系列纯函数（state → state），`timer.ts` 负责番茄钟计时逻辑，store.tsx 只做包装。UI 不直接改 state。
- **每次变更后都用 Zod 校验**：`mutate()` 调用 `schema.ts` 的 `validateAppState()`，同时校验记录形状和跨实体引用完整性（任务→项目、计划→任务/项目、计时器引用等）。校验失败的变更会被拒绝（console.error，state 保持不变），不会抛到 UI。新增实体字段时必须同步更新 `schema.ts`。
- **计时器对账**：store 每秒/获得焦点/页面可见时调用 `reconcileTimer`，将到期的番茄钟阶段转为 session 记录。注意：PomodoroView 的 250ms 显示 tick 不更新 AppState，因此不会触发磁盘写入——保持这一设计。

### 持久化（双后端）

`persistence.ts` 通过 `isTauri()` 检测运行环境：

- **桌面端**：invoke Tauri 命令（`src-tauri/src/state.rs`），数据存于应用数据目录的 `data.json`，写入采用 tmp → fsync → 备份轮换（`.bak`）→ 原子 rename 的流程，损坏的主文件保存为 `.corrupt` 并从备份恢复。
- **浏览器模式**（`pnpm dev`）：降级到 localStorage 双 key（主 + 备份），逻辑对齐 Rust 端。

保存经过 400ms 防抖 + 串行队列；`importSnapshot`/`resetAll` 会绕过防抖直接落盘。

### 数据版本与迁移

- `packages/core/src/version.ts` 的 `STATE_VERSION`（当前为 6）随持久化 JSON 存储。**修改状态结构时必须递增它并在 `packages/core/src/migrations.ts` 添加对应迁移**，`packages/core/src/schema.ts` 的 `appStateSchema` 用 `z.literal(STATE_VERSION)` 严格锁定。
- 导入/导出走 `transfer.ts` 的 `task-orbit-export` 信封格式；导出会剔除 `activeTimer` 和机器相关的 vault 路径（`rootPath`/`vaultName`）。

### Obsidian Vault 集成

`src-tauri/src/vault.rs` 提供笔记命令（`scan_notes`、`read_note`、`write_note`、`delete_note` 等），用 YAML frontmatter 存储笔记元数据（id、projectId、taskIds 等）并做内容哈希乐观并发控制。前端封装在 `src/store/vault.ts`，仅在桌面环境可用（浏览器模式会抛错）。命令在 `src-tauri/src/lib.rs` 注册。

### UI 层

- Material Web Components 通过 `@lit/react` 的 `createComponent` 包装在 `src/components/material.tsx`——优先复用这里的包装组件而不是引入新组件库。
- 视图在 `src/views/`（项目、日历、番茄钟、统计四个页面），由 `App.tsx` 的 `Shell` 按 `ViewKey` 切换；`BootstrapGate` 处理加载/错误状态。
- 主题（含 Material design tokens）在 `src/theme/theme.css` 与 `theme.tsx`。

### 移动端

- 独立 Expo 应用位于 `apps/mobile`，通过 `@task-orbit/core` 复用数据结构、校验、迁移、领域函数和计时器逻辑。
- Expo Router 路由位于 `apps/mobile/src/app`；`(tabs)` 包含收件箱、项目、日历、番茄钟、统计五个底部 Tab。
- 项目二级详情路由为 `apps/mobile/src/app/project/[id].tsx`，包含任务、每日计划和项目统计；移动端笔记仍不在当前范围。
- 移动端日历与桌面端保持日 / 周 / 月三种主视图；周视图包含任务甘特与每日计划两个子视图，密集图表使用横向滚动适配小屏。
- `apps/mobile/src/store/app-store.tsx` 管理移动端 `AppState`；每次变更同样经过 core 的 Zod 校验。`persistence.ts` 使用 AsyncStorage 主 / 备份双 key，导入会立即替换数据并保留旧状态备份。
- 番茄钟通过 `expo-notifications` 安排本地完成提醒；Web 环境仅运行计时逻辑，不调度系统通知。移动端 MVP 暂不接入 Obsidian Vault。
- 移动端视觉遵循 Material Design 3 角色色与层级；`apps/mobile/src/constants/theme.ts` 提供浅色 / 深色令牌，主题偏好写入共享 `settings.theme`。
- Metro 在 SDK 52+ 会自动识别 pnpm monorepo，不要添加手工 `watchFolders` 或 `nodeModulesPaths` 配置。
- 根 `package.json` 临时将 `metro-config` 固定为 0.84.4，以避开 SDK 57 依赖树中已发布的 `metro-config@0.84.5` 对尚未发布的 `metro@0.84.5` 的引用。升级后应运行 Expo Doctor 和三平台导出再移除此 override。

### 测试

前端测试为 `*.test.ts`（vitest，与源码同目录），重点覆盖 domain/timer/recurrence/schema/transfer/persistence/markdown 的纯函数逻辑。Rust 侧测试内联在源文件（`#[cfg(test)]`）。

## 其他约定

- TypeScript 严格模式，2 空格缩进、双引号、分号、尾随逗号；组件/视图 PascalCase，函数/变量 camelCase，常量全大写下划线（如 `STATE_VERSION`）；Rust 遵循 rustfmt。
- `dist/`、`src-tauri/target/`、`src-tauri/gen/` 为生成目录，不要手工编辑或提交。
- 不要把用户数据、密钥或平台生成文件写入仓库。
