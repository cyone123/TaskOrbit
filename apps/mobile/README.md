# Task Orbit Mobile

Task Orbit 的独立 Expo / React Native 客户端，使用 Expo Router，并通过 pnpm workspace 复用 `@task-orbit/core`。

## 开发

在仓库根目录执行：

```bash
pnpm install
pnpm mobile
pnpm mobile:android
pnpm mobile:ios
```

## 当前范围

- Expo SDK 57
- Expo Router 文件路由
- 收件箱、项目、日历、番茄钟、统计五个底部 Tab
- 共享 Task Orbit 数据模型与领域逻辑

本阶段只建立移动端应用骨架，持久化和具体业务交互将在后续阶段接入。
