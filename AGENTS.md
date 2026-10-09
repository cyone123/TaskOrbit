# AGENTS.md

## 项目概述

Task Orbit 原生 Android 端是一个基于现代化 Android 技术栈构建的个人任务与日程管理应用。当前分支（`android/main`）专注于原生 Android 端的持续开发与体验打磨。技术栈采用 Kotlin + Jetpack Compose + Material Design 3 Expressive + 协程/Flow。UI 文案统一为中文。

## 常用命令

在 `apps/android` 目录下执行 Gradle 命令（Windows 环境使用 `.\gradlew.bat`，Unix-like 环境使用 `./gradlew`）：

```powershell
# 编译与安装
.\gradlew.bat assembleDebug           # 编译 Debug APK
.\gradlew.bat installDebug            # 安装 Debug 版本至连接的设备或模拟器
.\gradlew.bat compileDebugKotlin      # 快速 Kotlin 语法与类型编译检查

# 测试
.\gradlew.bat testDebugUnitTest       # 运行全部 Android 单元测试
.\gradlew.bat testDebugUnitTest --tests "com.taskorbit.domain.TimerEngineTest" # 运行指定测试类

# 清理
.\gradlew.bat clean                   # 清除 Gradle 构建产物与缓存
```

提交代码前须确保 `.\gradlew.bat testDebugUnitTest` 与 `.\gradlew.bat compileDebugKotlin` 执行通过。提交信息使用类型前缀的祈使句，如 `feat: add expressive motion scheme to calendar`、`fix: eliminate floating app bar shadow clipping`。

## 架构

### 状态管理与 MVI 架构

- **单一不可变状态（Single Immutable State）**：
  全局应用状态由 `AppState`（定义于 `com.taskorbit.domain.model.Models.kt`）唯一定义，包含项目、任务、每日计划、收集箱、番茄钟会话、偏好设置与云同步配置。
  全局状态由 `AppStateRepository` 作为单一事实来源（Single Source of Truth），通过 `StateFlow<AppState>` 向外暴露只读流。
- **纯函数状态转换与领域引擎（Domain Engines）**：
  所有业务状态变更均通过 `AppStateRepository.mutate()` 执行，接收 `(AppState) -> AppState` 纯函数转化。领域逻辑按模块彻底解耦为独立纯函数单例对象：
  - `InboxDomain`：收集箱速记与待办项创建、切换完成状态、删除以及转为项目任务。
  - `ProjectDomain`：项目生命周期管理（创建、归档、修改名称与颜色）。
  - `TaskDomain`：任务状态推进、优先级设定、起止日期排期。
  - `DailyPlanDomain`：每日计划创建、时间块冲突计算、复发规则推导。
  - `CalendarModel`：日视图 24 小时排期网格对齐、吸附对齐物理算法、周甘特图投影。
  - `TimerEngine`：番茄钟状态机推进（Focus / ShortBreak / LongBreak）与自动轮转。
  - `RecurrenceEngine`：周期性计划（日/周/月）的跨周期实例化与事件流预测。
  - `StatsEngine`：专注时长分段聚合、项目耗时占比、完成率热力图计算。
- **状态强校验（State Validation）**：
  每次通过 `mutate()` 更新状态后，系统自动调用 `StateValidator.validate()` 进行引用完整性校验（校验任务→项目、每日计划→项目/任务、activeTimer 引用存在性与有效性）。若校验失败则立即拦截抛错并回滚，保证应用状态绝对一致与内存安全。

### 持久化与容灾机制

- **原子文件写入机制（Atomic File Persistence）**：
  由 `AtomicFilePersistence` 负责，本地数据存于应用私有存储目录的 `data.json`。
  写入流程严格采用 `tmp` -> `fsync` -> 备份轮换（`data.json.bak`） -> 原子文件重命名（Atomic Rename），杜绝断电或进程强退造成的数据损坏。
- **保存防抖与序列化调度**：
  普通状态修改经过 400ms 协程防抖合并；在数据导入、同步恢复时支持强行立即刷新磁盘。写入操作通过互斥锁（`Mutex`）保证串行安全。
- **自动容灾与损坏恢复**：
  应用启动初始化读取主数据文件；若读取或反序列化失败，自动将损坏文件备份至 `data.json.corrupt`，并从 `data.json.bak` 备份无缝恢复状态，且向上抛出友好提示通知。

### 数据版本与迁移

- `AppState.version` 当前为 `11`。
- 修改状态数据结构时，必须递增版本号并在 `com.taskorbit.data.migrations.MigrationManager` 中按版本链式添加迁移逻辑，确保用户升级时数据无损。
- 支持导入与导出备份（通过 `TransferEngine`），导出数据自动脱敏并剔除设备本地的活跃计时器和私有路径信息。

### 数据同步（WebDAV）

- **云端双向同步架构**：
  基于 `WebDavClient`（OkHttp 实现 WebDAV 核心 HTTP 协议：MKCOL、PUT、GET、HEAD、PROPFIND 等）实现多端跨平台云同步。
- **乐观并发与合并冲突控制**：
  - **墓碑机制（Tombstone）**：采用 `Tombstone(id, type, deletedAt)` 追踪并持久化删除动作，防止云端误覆盖已删数据。
  - **ETag 乐观并发**：通过远端资源的 `ETag` 判定云端变更状态，避免无谓网络传输和并发竞争。
  - **三路合并引擎（SyncMergeEngine）**：在本地变更与远端产生分叉时，根据修改时间戳（Last-Write-Wins）、实体更新状态与墓碑记录执行原子合并，输出确定性一致视图。
- **同步调度**：
  由 `SyncCoordinator` 协调，支持前台手动触发同步以及设置项控制的静默周期性自动同步。

### 专注计时引擎与前台服务

- **双模计时器架构**：
  `TimerEngine` 提供不可变的时钟状态流演进；结合 Android 原生前台服务 `PomodoroForegroundService`，在系统通知栏驻留常驻控制器（支持通知栏内直接暂停、恢复、跳过）。
- **锁屏与低功耗唤醒保活**：
  使用 `WakeLock` 与精准计时调度机制，在系统息屏或切后台时精确触发阶段转换震动、声音通知与 session 结转写入，杜绝 Android 进程冻结导致的计时漂移。

## UI 与动效规范（Material Design 3 & Material 3 Expressive）

全项目严格遵循 Material Design 3 (MD3) 与 Material 3 Expressive 规范。**禁止硬编码任何色值与魔法数值尺寸**。

### 设计令牌（Design Tokens）

- **色彩角色（Color Roles）**：
  - 严格消费 `MaterialTheme.colorScheme` 中的标准语义角色（`primary`, `secondary`, `tertiary`, `surface`, `error` 及其 `on-*` 和 `*-container` 配对）。
  - 在 Android 12+ (API 31+) 自动开启动态色彩（Monet Dynamic Color），其余设备平滑降级至 `TaskOrbitLightColorScheme` / `TaskOrbitDarkColorScheme`。
- **表面层级（Surface Hierarchy）**：
  - 以 MD3 五级表面容器（`surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest`）构建空间层次与卡片深度，摒弃生硬的高位投影。
- **排版与形状（Typescale & ShapeTokens）**：
  - 严格遵循 MD3 Typography 规范（Display / Headline / Title / Body / Label）。
  - 形状统一采用 `TaskOrbitShapes` 与 `ShapeTokens`（ExtraSmall 4.dp、Small 8.dp、Medium 12.dp、Large 16.dp、ExtraLarge 28.dp、Full/CircleShape）。

### 物理动效系统（Motion Physics & Expressive Motion）

- **Expressive 物理弹簧规范**：
  应用全局注入 `MaterialTheme(motionScheme = MotionScheme.expressive())`。动效必须通过 `MaterialTheme.motionScheme` 获取物理曲线与弹性参数（如 `fastSpatialSpec`, `defaultSpatialSpec`, `fastEffectsSpec`），彻底抛弃生硬的贝塞尔时间补间。
- **触觉与弹簧微交互（Micro-Interactions）**：
  - 可点击元素优先使用 `bouncyClickable` / `bouncyPress` 修饰符：按下时产生细腻的 `0.975x` 弹性缩放并激发系统震动触觉反馈（`HapticFeedbackType.TextHandleMove`），抬手时基于物理阻尼弹簧无缝回弹。
  - 为避免过度绘制与内存抖动，闲置状态（`scale == 1f`）自动跳过 `graphicsLayer` 冗余分配。
- **流体形态变换（Fluid Morphing）**：
  - **胶囊岛动态伸缩（Centered Pill Morphing）**：如 `TaskOrbitFloatingAppBar` 在页面滚动时以中心点为锚点自适应展开/收起，内外内容通过 `defaultSpatialSpec` 保持弹簧同步，严禁两端位移割裂。
  - **动态波浪时间指示线（Wave Cursor）**：在日历当前时间轴与番茄钟专注阶段，采用动态正弦波波浪路径与脉冲波纹渲染，展现流畅的呼吸感。
  - **日历计划拖拽与吸附对齐（Snap Physics）**：拖拽每日计划卡片时赋予物理悬浮放大感，松开后经由物理吸附算法快速平滑贴合至 15/30 分钟的时间刻度网格。
- **阴影与渲染陷阱防护**：
  - 对于全圆角浮动胶囊组件，严禁使用 `RoundedCornerShape(9999.dp)` 配合重度 shadow，必须使用 `CircleShape` 或精确容器内间距（padding），防止 Android HWUI 渲染管道产生边缘阴影截断；优先使用容器色阶对比配合 `tonalElevation` 代替重度光影。

## 屏幕与视图架构

- **收集箱（InboxScreen）**：
  支持待办（Todo）与备忘（Note）快速捕捉，支持勾选完成、滑动操作与快速提升为项目任务。
- **项目看板（ProjectsScreen & ProjectDetailScreen）**：
  多项目卡片流式展示，支持进度环、归档过滤、自定义颜色标签；二级详情页集成该项目专属的任务树、每日计划联动与项目时间投入统计。
- **动态日历（CalendarScreen）**：
  - **日视图（Day View）**：24 小时排期轴、时间块实时碰撞检测、支持长按拖拽重新排期、当前时刻动态 Expressive 波浪指示线。
  - **周视图（Week View）**：甘特图模式与周计划分布模式，密集日程支持平滑横向滚动。
  - **月视图（Month View）**：全局日期热力分布与月度日程总览。
  - **浮动控制岛（TaskOrbitFloatingAppBar）**：响应滚动自动变形吸附的多模式视图切换器。
- **专注计时（PomodoroScreen）**：
  沉浸式专注模式，集成正弦波动态波浪时间环、专注/短休/长休自动轮转、联动任务关联与前台服务跨应用保活。
- **统计看板（StatsScreen）**：
  多维度时间数据分析，包括番茄钟时长趋势、任务完成率分布、项目投入比重环形图等。

## 组件复用与代码规范

- **组件优先复用（Component Reuse）**：
  业务界面严禁散落未封装的低级控件，统一优先复用 `com.taskorbit.ui.components`：
  - `TaskOrbitTopAppBar` / `TaskOrbitFloatingAppBar` / `TaskOrbitNavigationBar`：导航顶栏、浮动胶囊岛与底栏
  - `TaskOrbitBottomSheet`：符合移动端单手操作规范的手势可下拉弹窗底板（严禁使用居中弹窗编辑复杂表单）
  - `TaskOrbitCard` / `TaskOrbitButton` / `TaskOrbitChip` / `TaskOrbitCheckbox`：具备 Expressive 触觉与物理按压反馈的基础构件
  - `TaskOrbitEmptyState` / `TaskOrbitLoadingIndicator` / `TaskOrbitProgressBar`：统一空状态与进度加载
- **代码与架构规范**：
  - 遵循 Kotlin 官方代码风格，严格开启空安全与类型检查。
  - ViewModel 仅依赖 Repository，状态通过不可变 `StateFlow` 暴露给 Compose UI，业务变更通过挂起函数或协程调度进入 Repository。
  - UI 文本一律使用自然流畅、行动导向的中文；所有图标按钮必须配置明确的 `contentDescription` 保障无障碍辅助（Accessibility）。
