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
- 收件箱待办 / 备忘的快速记录
- 项目列表与独立二级详情页；详情内管理任务、每日计划和项目统计
- 项目与任务的创建、编辑、完成、归档和删除
- 独立或关联项目 / 任务的日程，以及每日、每周、每月重复
- 基于共享状态机的番茄钟、后台完成通知和专注统计
- AsyncStorage 主数据 + 备份的本地持久化，启动时自动迁移与校验
- 与桌面端兼容的 JSON 导入 / 导出
- Material Design 3 颜色与组件层级，支持浅色、深色和跟随系统三种主题

Obsidian Vault 集成不在当前移动端 MVP 范围内。

## 数据与通知

- 数据只保存在设备本地；导入前会将现有数据保存为备份。
- Android / iOS 首次开始番茄钟时会请求通知权限。
- Web 可完整体验业务流程，但不提供系统级番茄钟通知。
