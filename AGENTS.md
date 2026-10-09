# AGENTS.md

## 项目概述

Task Orbit 是个人任务与日程管理应用，当前维护两个客户端：

- **桌面端**：Tauri 2 + React 18 + TypeScript + Vite / Rust，使用 pnpm workspace。
- **原生 Android 端**：`apps/android`，Kotlin + Jetpack Compose + Material 3 Expressive + 协程 / Flow。
- **旧 React Native（Expo）移动端已 deprecated（弃用）**：`apps/mobile` 仅保留历史代码，不再作为新功能开发目标。

本文件适用于 `main` 与 `android/main`，两分支保持同一份项目约定。UI 文案统一使用简洁、行动导向的中文。

## 常用命令与验证

桌面端在仓库根目录执行：

```powershell
pnpm install                # 安装依赖
pnpm dev                    # 浏览器开发模式，固定端口 http://localhost:1420
pnpm tauri dev              # 桌面开发模式
pnpm build                  # 当前 workspace 检查与桌面生产构建
pnpm tauri build            # 打包桌面应用
pnpm test                   # 全部前端单元测试（单次运行）
pnpm vitest run packages/core/src/timer.test.ts # 指定测试文件
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

原生 Android 端在 `apps/android` 执行（Unix-like 环境使用 `./gradlew`）：

```powershell
.\gradlew.bat assembleDebug          # 编译 Debug APK
.\gradlew.bat installDebug           # 安装到设备或模拟器
.\gradlew.bat compileDebugKotlin     # Kotlin 编译检查
.\gradlew.bat testDebugUnitTest      # 全部单元测试
.\gradlew.bat testDebugUnitTest --tests "com.taskorbit.domain.TimerEngineTest"
```

提交代码前验证所改客户端：桌面端运行 `pnpm build`、`pnpm test`；修改 Rust 时另运行 `cargo check`、`cargo test`；Android 端运行 `compileDebugKotlin`、`testDebugUnitTest`。提交信息使用类型前缀与祈使句，如 `feat: add weekly calendar view`。

## 状态与领域逻辑

两端均以不可变 `AppState` 为唯一应用状态，通过 `mutate()` 和纯函数更新；UI 不直接修改业务状态。领域逻辑覆盖收集箱、项目、任务、每日计划、日历排期、周期计划、番茄钟与统计，保持与界面解耦。

- **桌面端**：`packages/core` 提供 TypeScript 数据模型与领域逻辑，通过 `@task-orbit/core` 引用；`src/store/store.tsx` 的 `StoreProvider` 管理状态。`schema.ts` 用 Zod 校验数据形状与跨实体引用，失败时拒绝变更并保留原状态；新增字段须同步更新 schema。
- **Android 端**：模型位于 `com.taskorbit.domain.model.Models.kt`；`AppStateRepository` 通过只读 `StateFlow<AppState>` 暴露状态。`StateValidator` 校验任务、计划与计时器的引用完整性，失败时拦截更新。ViewModel 仅依赖 Repository，经协程提交业务变更。
- **Android 领域模块**：`InboxDomain`、`ProjectDomain`、`TaskDomain`、`DailyPlanDomain` 负责实体变更；`CalendarModel` 负责投影与吸附；`TimerEngine`、`RecurrenceEngine`、`StatsEngine` 负责计时、周期与聚合。

## 持久化、迁移与同步

- **原子保存**：桌面端由 `src-tauri/src/state.rs`、Android 端由 `AtomicFilePersistence` 管理私有数据目录的 `data.json`，采用 tmp → fsync → 备份轮换 → 原子 rename。损坏主文件保存为 `.corrupt`，从 `.bak` 恢复并提示用户。
- **保存调度**：普通更新采用 400ms 防抖并串行写入；导入、重置或同步恢复等需要即时落盘的路径绕过防抖。桌面浏览器模式由 `persistence.ts` 降级到 localStorage 主 / 备份双 key；Android 使用 Mutex 保证写入互斥。
- **版本迁移**：版本以各端源码为准。桌面端修改 `packages/core/src/version.ts` 的 `STATE_VERSION`，并更新 `migrations.ts`、`schema.ts`；Android 修改模型版本并在 `MigrationManager` 添加链式迁移。修改持久化结构必须递增版本，保障旧数据无损升级；跨端交换数据时核对 schema 与迁移兼容性。
- **备份传输**：桌面端使用 `transfer.ts` 的 `task-orbit-export` 信封，Android 使用 `TransferEngine`；导出剔除活跃计时器、AI 密钥及设备私有路径。
- **WebDAV 同步**：两端通过墓碑追踪删除、ETag 乐观并发与合并引擎处理冲突。桌面逻辑位于 `packages/core/src/sync`、`webdav`，由 `HttpTransport` 适配 Rust 原生请求；Android 使用 OkHttp `WebDavClient`、`SyncMergeEngine` 与 `SyncCoordinator`，支持手动及静默周期同步。

## 客户端特有能力

### 桌面端

- **专注计时**：store 每秒及窗口获得焦点 / 页面可见时调用 `reconcileTimer` 结转到期 session；`PomodoroView` 的显示 tick 不更新 AppState，避免频繁落盘。`PomodoroMiniView` 通过 Tauri 多窗口双向同步，支持置顶、透明度、缩放与系统通知。
- **Obsidian Vault**：`src-tauri/src/vault.rs` 提供笔记读写与扫描命令，在 `lib.rs` 注册，前端由 `src/store/vault.ts` 封装；仅桌面环境可用。元数据使用 YAML frontmatter，写入采用内容哈希乐观并发；`LiveMarkdownEditor` 支持实时预览、内联编辑与 GFM 表格。
- **AI 助理**：逻辑位于 `packages/core/src/ai`，界面与会话状态位于 `src/components/ai`、`src/store/ai-chat-store.tsx`；协议通过适配器扩展，支持流式响应与推理内容分离，配置存于 `AppState.aiSettings`。
- **AI 写入约束**：分析工具只读；整理收集箱、日程排期等写入必须先展示含 Diff 的 `AiProposalCard`，用户确认后经 store 纯函数原子应用。生成方案卡片后收敛会话。`AiChatDrawer` 支持快捷键、宽度持久化及推理 / 工具调用明细。

### 原生 Android 端

- **专注计时**：`TimerEngine` 管理专注 / 短休 / 长休轮转，`PomodoroForegroundService` 提供通知栏暂停、恢复与跳过；结合 WakeLock 与精准调度处理后台、锁屏阶段转换、提醒及 session 结转。
- **页面结构**：收集箱、项目、日历、专注、统计五个主页面；项目详情联动任务树、每日计划与耗时统计。日历包含日时间轴、周甘特 / 计划分布、月总览，支持冲突检测、拖拽吸附与密集图表横向滚动。

## UI 与交互规范

两端遵循 Material Design 3，优先复用已有组件；禁止硬编码色值、魔法尺寸及随意引入第三方 UI 库。使用语义色及对应前景 / 容器角色、五级 surface container、MD3 Typography 与统一形状令牌，以容器色阶表达层级，避免重度投影。

### 桌面端

- 消费 `--md-*`、`--color-*`、`--sys-type-*`、`--shape-*` 令牌；主题由 `src/theme/theme.tsx` 响应偏好与系统模式，模块化样式由 `src/theme/theme.css` 汇总。
- `src/views` 承载主页面，`App.tsx` 的 Shell 组织 Navigation Rail、Top Bar 与单一内容滚动区；`BootstrapGate` 处理启动与错误恢复。日历拖拽具备吸附与冲突处理。
- 基础控件复用 `src/components/material.tsx`（`@material/web` 包装），业务控件复用 `src/components/ui.tsx`，包括表单、确认、空状态与 Snackbar。
- 微交互使用既有 state layers、聚焦环与动效令牌；所有交互元素具备 hover / press / selection 反馈，图标按钮配置 `aria-label` / `title`。

### 原生 Android 端

- 消费 `MaterialTheme.colorScheme`、Typography、`TaskOrbitShapes` / `ShapeTokens`；Android 12+ 使用动态色彩，旧版本降级到应用明暗色方案。
- 全局使用 `MotionScheme.expressive()`；动效从 `MaterialTheme.motionScheme` 获取 spatial / effects 物理参数，不以固定时间补间替代弹簧交互。
- 点击优先使用 `bouncyClickable` / `bouncyPress`，提供按压缩放、弹簧回弹与触觉反馈；闲置状态避免多余 `graphicsLayer` 分配。
- 复用 `com.taskorbit.ui.components` 的导航、卡片、按钮、选择控件、空状态与进度组件；复杂编辑表单使用可下拉关闭的 `TaskOrbitBottomSheet`，禁止居中弹窗。
- `TaskOrbitFloatingAppBar` 以中心锚点同步伸缩；日历 / 专注保留动态波浪反馈，计划拖拽具备悬浮感及时间刻度吸附。
- 全圆角胶囊使用 `CircleShape` 或合理形状与留白，禁止 `RoundedCornerShape(9999.dp)` 配合重度阴影，避免 HWUI 阴影截断；优先容器色阶与 tonalElevation。
- 所有图标按钮配置明确的 `contentDescription`，保障无障碍。

## 代码与仓库约定

- TypeScript 使用严格模式、2 空格、双引号、分号与尾随逗号；组件 / 视图 PascalCase，函数 / 变量 camelCase，常量大写下划线。Rust 遵循 rustfmt，Kotlin 遵循官方风格与空安全。
- 测试重点覆盖领域纯函数、计时、周期、校验、迁移、传输、持久化与同步；桌面端使用同目录 `*.test.ts`（Vitest）及 Rust 内联测试，Android 使用 `app/src/test` 单元测试。
- 不手工编辑或提交 `dist/`、`src-tauri/target/`、`src-tauri/gen/`、Android build 等生成产物；不将用户数据、密钥或设备私有文件写入仓库。
