# 执行任务清单 (Task Plan): TaskOrbit AI Agent 任务助理

本任务规划遵循垂直切片（Vertical Slice）原则，将 AI Agent 功能拆解为 6 个端到端、可独立验证并递进交付的切片，链接 [prd.md](file:///d:/CS/TaskOrbit/docs/vibe-workflow/ai-agent/prd.md) 与 [spec.md](file:///d:/CS/TaskOrbit/docs/vibe-workflow/ai-agent/spec.md)。

---

## 切片概览 (Slice Overview)

| 切片 | 名称 | 目标与交付成果 | 依赖关系 |
| :--- | :--- | :--- | :--- |
| **Slice 1** | 数据模型升级与配置管理 | AppState 升至 v9，支持多供应商配置、连通性测试与导出脱敏 | 无 (独立起步) |
| **Slice 2** | 核心流式客户端与只读工具引擎 | 跨平台轻量 SSE 流式通信、5 项只读查询工具与单元测试 | 依赖 Slice 1 |
| **Slice 3** | 全局 AI 侧边栏与效能反思会话 | MD3 对话抽屉、流式打字机渲染、统计视图“AI 效能反思”联动 | 依赖 Slice 2 |
| **Slice 4** | 收集箱智能整理与变更确认卡片 | 收集箱“一键 AI 整理”、结构化 Diff 卡片、人机协同确认落盘 | 依赖 Slice 3 |
| **Slice 5** | 智能日程排期与动态时间块调整 | 日历“一键 AI 排期”、日程冲突识别与排期提案确认生效 | 依赖 Slice 3 |
| **Slice 6** | 端到端集成、容错打磨与验证 | 网络容错、无 Key 引导、全套单元测试与 `pnpm build` 校验 | 依赖 Slice 4, 5 |

---

## 详细切片规划 (Detailed Slices)

### Slice 1: 数据模型升级与 AI 配置管理 (Data Model v9 & Settings)

- **目标与可验证结果**：
  用户能够在应用内配置 AI 模型端点（预设 DeepSeek、SiliconFlow、OpenAI、Ollama 本地及自定义），可以保存配置并一键测试连通性；历史数据无缝迁移至 v9；导出备份自动抹除 API Key。
- **主要任务项**：
  1. `packages/core/src/types.ts`: 定义 `AiSettings`、`AiProviderKey`，并在 `AppState` 中引入 `aiSettings`。
  2. `packages/core/src/version.ts`: `STATE_VERSION` 递增至 `9`。
  3. `packages/core/src/schemaDefaults.ts` & `migrations.ts`: 提供 `DEFAULT_AI_SETTINGS`，编写 `migrateV8ToV9`。
  4. `packages/core/src/schema.ts`: 编写 `aiSettingsSchema`，严格校验 `version = 9`。
  5. `packages/core/src/transfer.ts`: 导出快照脱敏过滤 `apiKey`。
  6. `packages/core/src/domain.ts` & `src/store/store.tsx`: 导出 `updateAiSettingsState` 与 `updateAiSettings` 包装。
  7. `src/components/ai/AiSettingsDialog.tsx`: 实现 MD3 风格的配置弹窗，包含厂商下拉、Base URL、API Key、Model Name、Temperature 及【测试连接】按钮。
  8. `src/components/Layout.tsx`: 导航工具栏接入 AI 设置触发按钮。
- **验收标准 (Acceptance Criteria)**：
  - [ ] 现有测试（`migrations.test.ts`、`schema.test.ts`）更新并通过，旧版本数据能平滑升至 v9；
  - [ ] 打开 AI 设置弹窗，选择不同厂商预设会自动填充默认 Base URL 与模型名；
  - [ ] 输入 API Key 后点击【测试连接】，能够向指定端点发送验证并反馈连通性结果；
  - [ ] 导出应用数据，导出的 JSON 文件中 `apiKey` 为空串。
- **完成门禁 (Gate)**：所有核心 schema/migration 测试通过，配置能正常持久化至 `data.json`。

---

### Slice 2: 核心流式客户端与只读工具引擎 (Streaming Client & Read Tools)

- **目标与可验证结果**：
  在 `@task-orbit/core` 实现基于原生 fetch 的 SSE 流式客户端与 5 项只读查询工具，能针对内存 `AppState` 极速返回结构化数据，由单元测试严密覆盖。
- **主要任务项**：
  1. `packages/core/src/ai/types.ts`: 定义聊天消息结构（`AiMessage`、`ToolCall`、`ToolResult` 等）。
  2. `packages/core/src/ai/client.ts`: 编写 `streamChatCompletions` 函数，解析 SSE `data:` 行、聚合 `content` 与 `tool_calls`，支持 `AbortSignal`。
  3. `packages/core/src/ai/tools.ts`: 定义只读工具的 OpenAI Function Calling JSON Schema 元数据：
     - `get_workspace_summary`
     - `get_inbox_items`
     - `get_projects_and_tasks`
     - `get_daily_plans`
     - `get_pomodoro_stats`
  4. `packages/core/src/ai/executor.ts`: 实现只读工具执行器，基于当前 `AppState` 纯内存查询过滤并返回紧凑 JSON。
  5. `packages/core/src/ai/executor.test.ts` & `client.test.ts`: 编写单元测试验证各工具输出准确性与流式解析。
- **验收标准 (Acceptance Criteria)**：
  - [ ] 运行 `vitest`，只读工具针对 Mock AppState 查询出的任务列表、番茄钟统计与计划时间块准确无误；
  - [ ] 流式客户端能正确分块解析 SSE 数据，并能正确触发中止信号。
- **完成门禁 (Gate)**：所有核心 AI 测试用例 100% 通过。

---

### Slice 3: 全局 AI 侧边栏与效能反思会话 (Chat Drawer & Performance Review)

- **目标与可验证结果**：
  桌面端全局右侧 AI 侧边栏（Chat Drawer）可顺畅展开/折叠；支持多轮自然语言对话、流式打字机渲染、工具调用状态提示；在统计视图点击“AI 效能反思”能自动调用番茄钟统计工具完成时间复盘。
- **主要任务项**：
  1. `src/store/ai-chat-store.tsx`: 创建会话状态管理器，维护消息流、加载状态、中断控制器，对话持久化至 LocalStorage。
  2. `src/components/ai/AiChatDrawer.tsx`: 实现 MD3 侧边栏结构，支持顶部操作（模型信息、清空会话、设置、关闭）与底部输入条。
  3. `src/components/ai/AiMessageList.tsx`: 渲染消息气泡、流式文本、Markdown 格式化、工具调用胶囊（如“正在读取番茄钟记录...”）。
  4. `src/components/Layout.tsx`: 顶栏右侧增加 AI 助理展开按钮，支持快捷键（`Ctrl+J` / `Cmd+J`）。
  5. `src/views/StatsView.tsx`: 增加“AI 效能反思”快捷按钮，点击一键唤起侧边栏并自动发送分析指令。
- **验收标准 (Acceptance Criteria)**：
  - [ ] 点击顶栏图标或快捷键，抽屉平滑展开，再次点击收起；
  - [ ] 发送普通问题，Agent 能够流畅打字输出 Markdown 回复，点击【停止】可随时中断；
  - [ ] 在统计视图点击【AI 效能反思】，Agent 自动触发 `get_pomodoro_stats` 工具，结合实际专注时长与任务进度输出反思建议；
  - [ ] 刷新页面后历史会话依然保留，点击【清空】可开启新对话。
- **完成门禁 (Gate)**：效能反思场景端到端跑通，代码符合 MD3 规范与项目代码约定。

---

### Slice 4: 收集箱智能整理与变更确认卡片 (Inbox AI Organizer & Proposal Diff Card)

- **目标与可验证结果**：
  在收集箱提供“AI 智能整理”入口；Agent 提出整理方案并在对话中呈现 MD3 Diff 预览卡片；用户点击“确认应用”后，对应项目下新建任务/计划且收集箱状态更新，全程保证数据强一致性。
- **主要任务项**：
  1. `packages/core/src/ai/tools.ts`: 定义写操作工具 `plan_inbox_organization` 的 JSON Schema。
  2. `packages/core/src/ai/proposals.ts`: 实现提案解析与数据转换，生成格式化的 `InboxOrganizationProposal`。
  3. `packages/core/src/ai/commit.ts`: 编写 `commitInboxProposal(state, proposal)` 纯函数，原子批量创建任务/计划并更新原收集箱条目。
  4. `src/components/ai/AiProposalCard.tsx`: 实现 MD3 风格的 Diff 预览卡片（展示原待办文本、目标项目、建议优先级、起止时间等），配齐【确认应用】与【放弃】操作。
  5. `src/views/InboxView.tsx`: 顶部操作栏新增“AI 智能整理”按钮。
  6. 单元测试：`packages/core/src/ai/inbox-organizer.test.ts` 验证状态原子流转与 Zod 校验。
- **验收标准 (Acceptance Criteria)**：
  - [ ] 在收集箱存有未整理条目时点击“AI 智能整理”，Agent 正确输出包含条目转换建议的 `AiProposalCard`；
  - [ ] 点击卡片上的【确认应用】，系统调用 store 的 `mutate`，对应项目下出现新任务，收集箱条目被标记为已处理；
  - [ ] 若用户点击【放弃】，提案置为已取消，不发生任何实际数据修改。
- **完成门禁 (Gate)**：收集箱整理提案与落盘单元测试通过，桌面端端到端操作无阻碍。

---

### Slice 5: 智能日程排期与动态时间块调整 (Calendar AI Scheduling & Plan Reschedule)

- **目标与可验证结果**：
  在日历视图提供“AI 智能排期”入口；用户请求安排日程时，Agent 自动识别已有计划与空闲时间段，生成排期建议卡片；用户确认后日历时间块立即呈现。
- **主要任务项**：
  1. `packages/core/src/ai/tools.ts`: 定义 `plan_schedule_daily_plans` 工具元数据与 JSON Schema。
  2. `packages/core/src/ai/commit.ts`: 编写 `commitScheduleProposal(state, proposal)` 纯函数，支持批量创建 `DailyPlan` 或调整既有时间块。
  3. `src/components/ai/AiProposalCard.tsx`: 扩展支持日程排期 Diff 展示（原时间段 vs 新时间段、时长、冲突提示）。
  4. `src/views/CalendarView.tsx`: 顶部操作区接入“AI 智能排期”按钮，自动注入当前日历视图日期。
  5. 单元测试：`packages/core/src/ai/schedule.test.ts` 验证日程排期提案生成与状态落盘。
- **验收标准 (Acceptance Criteria)**：
  - [ ] 在日历视图点击“AI 智能排期”，Agent 正确检索今日已有计划与高优任务，输出时间块建议；
  - [ ] 点击【确认应用】，日历日视图/周视图即刻渲染出对应的新增或调整后的每日计划；
  - [ ] 调整计划经过 `assertPlanRelation` 与 Zod Schema 校验，数据关联无误。
- **完成门禁 (Gate)**：日历排期端到端跑通，时间块无非法越界与数据错乱。

---

### Slice 6: 端到端集成、容错打磨与验证 (Integration, Edge Cases & Polish)

- **目标与可验证结果**：
  全局异常与边缘场景全覆盖（无 Key 友好引导、网络超时重试、畸变 JSON 容错）；暗色/浅色模式视觉走查；无障碍（ARIA）完善；通过全部构建检查与自动化测试。
- **主要任务项**：
  1. 异常处理：API Key 未配置时展示引导卡片并一键直达设置；网络失败或超时展示重试操作。
  2. 视觉一致性走查：暗黑与浅色模式下抽屉、气泡、卡片色值必须严格使用 MD3 tokens，无生硬投影与未对齐边框。
  3. 无障碍（A11y）：所有图标按钮配齐 `aria-label` 与 `title`，键盘焦点移动合理。
  4. 最终测试与构建验证：运行 `pnpm test` 和 `pnpm build`，确保 core、desktop 类型检查与生产构建零错误。
- **验收标准 (Acceptance Criteria)**：
  - [ ] `pnpm test` 全部通过（包括所有新增的 AI 测试与旧有的核心测试）；
  - [ ] `pnpm build`（含 tsc 类型检查）构建成功；
  - [ ] [prd.md](file:///d:/CS/TaskOrbit/docs/vibe-workflow/ai-agent/prd.md) 中全部 6 项验收标准全部满足。
- **完成门禁 (Gate)**：全流程测试与构建完全绿灯。
