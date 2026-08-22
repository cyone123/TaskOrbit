## 结论

当前桌面端已经有合格的 MD3 技术基础，但页面设计仍更像“传统桌面仪表盘 + Material 控件”。不建议推倒重写；应先统一设计系统，再改应用框架和高频页面。

我实际以 1440×900 检查了收集箱、项目、日历、番茄钟和统计页面，并审阅了主题、组件封装及主要视图代码。整体可评为：

- MD3 基础设施：7/10
- 页面视觉一致性：5/10
- 动效与交互状态：4/10
- 当前综合 MD3 完成度：约 5.5/10

## 已经做得好的部分

- 已使用 `@material/web` 2.5.0，而且目前它就是最新发布版本，不需要靠升级组件库解决问题。[官方发布记录](https://github.com/material-components/material-web/releases)
- 已建立较完整的浅色/深色 MD3 色彩角色和 surface-container 层级，[theme.css](/D:/CS/TaskOrbit/src/theme/theme.css:5)。
- 按钮、文本框、Dialog、卡片、Checkbox、Segmented Button 等已经封装成 React 组件，[material.tsx](/D:/CS/TaskOrbit/src/components/material.tsx:1)。
- 项目页已经采用合适的 list-detail 双栏结构，这与 MD3 的大屏典型布局方向一致。[MD3 Canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- 已支持 `prefers-reduced-motion`，[theme.css](/D:/CS/TaskOrbit/src/theme/theme.css:1540)，这点应保留。
- 番茄钟页面的主次关系最清晰，是当前最接近完整 Material 产品体验的页面。

## 主要问题

| 优先级 | 问题 | 当前表现 | 建议 |
|---|---|---|---|
| P0 | 设计 token 只完成了颜色和圆角 | 动效、排版、间距和交互状态仍散落在 CSS/JSX 中 | 建立 typography、spacing、motion、state-layer、elevation token |
| P0 | 页面层级依赖描边 | 深色模式中大量近黑矩形、1px 描边、相似圆角，视觉比较扁 | 用 surface container 色阶承担层级，描边只保留给 outlined 语义 |
| P0 | 自定义控件没有统一状态模型 | hover 较多，focus/pressed/selected 不统一 | 为所有可交互 surface 提供 hover、focus、pressed、disabled、selected 状态层 |
| P1 | Navigation Rail 不是标准 MD3 表达 | 选中项同时出现大矩形背景、图标选择态和左侧竖线 | 改成图标后的圆角 pill indicator，整个导航项可点击，去掉左侧竖条 |
| P1 | 字体体系名义上是 MD3，实际未随应用提供 | CSS 声明 Google Sans/Roboto，但 HTML 只加载 Material Symbols，[index.html](/D:/CS/TaskOrbit/index.html:7) | 明确采用可离线打包的中文字体方案，并完整定义 MD3 typescale |
| P1 | 动效只有零散 transition | 目前约 4 个 keyframe；所有页面统一 `translateY + fade`，图表单独使用 520ms | 用语义化 motion token，并区分导航、容器展开、Dialog、列表增删和数值变化 |
| P1 | 点击区域偏小 | 实测每页约有 7–16 个控件小于 48×48；导航按钮为 40×40，筛选器高 32px，“管理”仅约 28×18 | 主要交互目标按至少 48×48 设计；紧凑桌面控件也应有扩展点击区域。[Google 触控目标建议](https://support.google.com/accessibility/android/answer/7101858) |
| P2 | 页面内样式过度定制 | 约 57 处 JSX 内联样式、26 个原生 `<button>`、大量自定义 chip/list/tab | 扩充 Material 封装：Chip、Tabs、List Item、Menu、Divider、Ripple、Focus Ring |
| P2 | 部分硬编码语义色不适配主题 | 项目统计蓝/绿/橙容器直接写死浅色值，[theme.css](/D:/CS/TaskOrbit/src/theme/theme.css:2052) | 为成功、提醒、信息及项目颜色生成浅/深配对角色，并校验对比度 |

Material Web 推荐通过 reference → system → component 三层 token 组织主题；项目目前主要完成了 system color 到部分 component token 的映射。[Material Web Theming](https://material-web.dev/theming/material-theming/)、[颜色角色](https://material-web.dev/theming/color/)

## 各页面建议

### 应用框架

Navigation Rail 改为更标准的 MD3 rail：

- 80px 左右宽度，选中指示器仅包裹图标。
- 标签位于图标下方，整个目的地均为点击区域。
- 数据管理、主题设置固定在底部，不因当前页面不同而改变位置。
- Top App Bar 去掉持续描边，滚动后才切换 surface 色调或 elevation。
- 窗口较窄时切换为 compact rail，而不是只压缩内容。MD3 推荐按照窗口宽度动态选择 compact、medium、expanded 等布局，而非只做零散媒体查询。[窗口尺寸分类](https://developer.android.google.cn/develop/adaptive-apps/guides/use-window-size-classes?hl=en)

### 收集箱

现有信息架构不错，但应该把“快速收集”做成主操作 surface：

- 左侧使用 filled/tonal container，右侧列表使用较低层 surface。
- “待办/备忘”使用 Filter Chip 或统一 segmented control。
- 空状态减少大面积描边矩形，增加一项明确 CTA。
- 新增、完成、删除应有列表插入/退出和容器高度动画。

### 项目

这是最值得优先精修的页面：

- 保留 list-detail 布局，但让项目列表与详情形成明确 pane 层级。
- 搜索改用 MD3 Search Bar，项目条目改用统一 List Item。
- 详情页不要把所有内容都装进相同 outlined card；概览数据使用 tonal card，任务列表使用低层 surface。
- 任务展开每日计划时使用 container transform/高度动画。
- 目前多个 28–32px 图标按钮应扩大交互区域，[theme.css](/D:/CS/TaskOrbit/src/theme/theme.css:2212)。

### 日历

当前工具栏控件过多、权重相同：

- 第一层只保留日期导航、今天、添加计划。
- 月/周/日作为主视图切换；甘特/每日计划放入周视图内部 toolbar。
- Calendar cell、事件和选中日期统一 state layer。
- 甘特日期当前存在使用 `div onClick` 的情况，[CalendarView.tsx](/D:/CS/TaskOrbit/src/views/CalendarView.tsx:450)，应改为键盘可达按钮。
- 事件颜色不要直接用高饱和项目色铺满，可用项目色生成 container/on-container 配对。

### 番茄钟

保留现有圆形主体，但加强状态感：

- 专注、短休、长休使用不同但协调的色彩角色。
- 开始时让环形进度、主按钮和背景 surface 发生柔和状态过渡。
- 运行中减少次要设置控件的视觉权重。
- 计时变化保持线性，但模式切换和按钮状态使用 MD3 emphasized easing。

### 统计

当前是最“后台仪表盘化”的页面：

- KPI 不必四张同样的矩形卡片，可用 1 个主要指标 + 3 个次要指标。
- 图表增加基准线、数值提示、空状态示例和选中状态。
- 用 primary/secondary/tertiary container 区分指标，不靠大量边框。
- 图表 520ms 单次生长动画应纳入统一 motion token。

## 推荐实施计划

### 第一阶段：设计系统底座，1–2 天

- 用 Material Theme Builder 或 `material-color-utilities` 从 Task Orbit 品牌种子生成完整浅/深配色，而不是继续使用 MD3 示例紫色。
- 建立 `--sys-type-*`、`--sys-space-*`、`--sys-motion-*`、`--sys-state-*`、`--sys-elevation-*`。
- 补充 Chip、Tabs、List、Menu、Ripple、Focus Ring 等 React 封装。
- 把高频内联样式收敛成页面组件和 token。

### 第二阶段：Shell 与导航，1–2 天

- 重做 Navigation Rail、Top App Bar、滚动 elevation。
- 统一页面最大宽度、边距和 pane 规则。
- 按窗口宽度建立 compact/medium/expanded 三种布局。

### 第三阶段：页面视觉重构，3–5 天

建议顺序：

1. 项目
2. 收集箱
3. 日历
4. 统计
5. 番茄钟微调

### 第四阶段：动效与状态，2–3 天

建立统一 motion scheme。官方 MD3 motion 使用标准、进入、退出、emphasized 等 easing，并提供 50–1000ms 的 duration scale；动画区域和移动距离越大，持续时间才越长。[Material motion tokens](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)

建议应用映射：

- hover/press：100–150ms
- chip、按钮、selection indicator：150–200ms
- 列表增删、展开折叠：200–300ms
- Dialog、pane、页面转换：250–400ms
- 番茄钟进度：250ms linear
- `prefers-reduced-motion`：继续全部降至近零

MD3 也要求交互状态具有至少两种视觉信号，并在组件间保持一致。[MD3 States](https://m3.material.io/foundations/interaction/states/overview)

### 第五阶段：视觉与可访问性验收，1–2 天

- 浅色/深色分别检查 600、840、1200、1440px 宽度。
- 所有可交互项键盘可达，并有统一 `:focus-visible`。
- 主要点击区域至少 48×48。
- 对比度自动检查，尤其是项目自定义颜色。
- 增加一个开发态 `/design-system` 展示页，集中展示 token、控件状态和动效。
- 为五个主页面添加视觉回归截图测试。

整体预计单人约 8–12 个开发日。第一阶段和 Shell 完成后，即使暂时不重构全部页面，整体的 MD3 观感也会出现最明显的提升。