---
name: new-requirement
description: '**WORKFLOW SKILL** — Handle new Allowance application requirements end-to-end. USE FOR: receiving new feature requests; creating requirement docs under .github/prompts/; producing phased implementation plans; updating related prompt files; beginning implementation. TRIGGERS: when user describes a new feature, new requirement, architecture change, or says "新需求".'
argument-hint: 'Describe the new requirement in one sentence'
---

# 新需求处理流程 (New Requirement Workflow)

收到新需求后，按以下流程完成从设计到实现的全过程。

## 适用场景

- 用户提出新功能需求
- 需要添加新的 API 端点、页面、或系统能力
- 架构调整或重构需求

## 流程

### Step 1: 扫描现有架构
- 读取 `.github/copilot-instructions.md` 了解当前技术栈和约束
- 扫描 `.github/prompts/` 下所有需求文档，理解已有功能和架构决策
- 确认新需求与现有架构的兼容性

### Step 2: 创建需求文档
- 目录：`.github/prompts/{YYYYMMDD}-{requirement-description}/`
- 文件名：`{YYYYMMDD}-{requirement-description}.prompt.md` 或按功能模块拆分为多个文件
- 设计必须对齐当前架构（Rust/Axum + Next.js 14 + PostgreSQL + Redis）
- 仅在必要时向用户确认，否则直接提出最专业的方案

### Step 3: 更新关联文档
- 检查是否有受影响的已有需求文档，添加时间戳更新说明
- 保留迭代历史记录

### Step 4: 生成实施计划
- 将需求转化为分阶段的 TODO 任务和里程碑
- 遵循实现顺序：Database migration → Models → Service → Handler → Frontend → Tests
- 每个阶段应有明确的交付物

### Step 5: 执行实施
- 按计划逐阶段实现
- 业务逻辑放在 Service 层，Handler 只做路由分发
- 所有函数返回 `AppResult<T>`，使用 `AppError` 变体
- 数据库查询使用 `.bind()` 参数化，禁止字符串拼接
- 每个阶段完成后提交用户审阅

### Step 6: 文档整理
- 使用 `/docs-cleanup` 整理受影响的需求文档
- 清理冗余/过时的 prompt 文件，保留必要记录

## 需求文档格式

```
# 功能名称

**状态**: 📋 待实现

## 概述
一段话说明功能目标和解决的问题。

## 架构设计
- 关键设计决策（文字描述，无代码）
- 涉及的核心组件/服务/表

## 实施计划
| 阶段 | 内容 | 交付物 |
|------|------|--------|
| Phase 1 | ... | ... |

## 约束与规则
- 关键业务规则
- 边界条件
```

## 行为准则

- **主动专业**：推荐最佳实践方案，不等待用户逐步指示
- **最小提问**：仅在关键歧义时确认，否则直接设计
- **向后兼容**：更新必须兼容现有功能，或包含迁移方案
- **数据库优先**：涉及数据变更时先设计 migration
- **显式操作优于隐式自动化**：每个 API 做且仅做一件事
