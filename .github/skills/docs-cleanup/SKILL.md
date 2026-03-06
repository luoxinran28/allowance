---
name: docs-cleanup
description: '**POST-TASK SKILL** — Clean up and consolidate .github markdown requirement documents after completing a coding task. USE FOR: removing code examples from requirement docs; condensing completed requirements to reflect current state only; resolving conflicting or outdated requirement descriptions; updating copilot-instructions.md to match implementation. TRIGGERS: after finishing any implementation task, after completing a feature, when asked to tidy/organize/clean docs.'
---

# 需求文档整理 (Post-Task Docs Cleanup)

任务完成后，按以下流程整理 `.github` 文件夹下的 markdown 需求文档。

## 适用场景

- 完成一个功能实现后
- 需求发生变更，代码已按最新需求实现后
- 需要减少文档信息量、消除歧义时

## 整理原则（四条铁律）

### 原则一：去除代码示例
- 需求文档只保留**设计意图和架构决策**，不保留代码片段
- 代码示例属于 `copilot-instructions.md`（编码规范）或源代码本身
- 如果代码示例体现了关键架构模式，将其**转化为文字描述**而非保留代码块

### 原则二：已完成需求 → 只反映当前状态
- 移除实现过程描述（"先做A，再做B，最后做C"）
- 移除阶段性记录（"Phase 1 完成...Phase 2 进行中..."）→ 只保留最终结果
- 状态标记统一为 `✅ 已完成`，不需要详细的完成日期和过程
- 保留：当前系统**是什么**；移除：系统**怎么变成这样的**

### 原则三：需求变更 → 以最新为准
- 如果同一功能有多个版本的描述，只保留最终版本
- 移除被推翻的设计方案和已废弃的替代方案
- 如果旧文件的需求已被新文件完全覆盖，将旧文件归档或删除
- `copilot-instructions.md` 中的描述必须与最新需求一致

### 原则四：不确定/未实现 → 以最新描述为准
- 对于项目中尚未实现的需求，保留最新版本的设计描述
- 移除过时的设计方案草稿
- 未实现的需求明确标记为待实现状态

## 执行流程

### Step 1: 确定影响范围
- 识别当前完成的任务涉及哪些 `.github/` 下的需求文档
- 检查 `copilot-instructions.md` 是否需要同步更新
- 列出需要修改的文件清单

### Step 2: 逐文件审查和整理
对每个相关文件执行：

1. **扫描代码块**：移除所有 `` ```rust ```, `` ```typescript ```, `` ```sql `` 等代码示例
   - 保留必要的配置示例（如 `.env` 变量名列表）
   - 将关键代码模式转化为一句话描述
2. **压缩已完成内容**：将过程描述压缩为结果陈述
   - ❌ "我们首先创建了migration，然后添加了service层，最后..."
   - ✅ "系统包含 X 表、Y 服务、Z 端点"
3. **解决冲突描述**：如果发现同一功能的不同版本描述，只保留最新版
4. **标记状态**：确保每个需求有明确的完成/未完成标记

### Step 3: 同步 copilot-instructions.md
- 确保项目状态描述（Phase、完成百分比等）与实际一致
- 文件引用表（File Quick Reference）反映当前代码结构
- 移除已不存在的文件引用

### Step 4: 清理冗余文件
- 如果某个需求文件的内容已完全合并到其他文件，归档到 `archive/` 或删除
- 空目录清理
- `progress/` 下的完成报告：如果信息已反映在主文档中，可归档

## 文档格式规范

整理后的需求文档应遵循：

```
# 功能名称

**状态**: ✅ 已完成 | ⚠️ 进行中 | 📋 待实现

## 概述
一段话说明这个功能是什么、解决什么问题。

## 架构设计
- 关键设计决策（文字描述，无代码）
- 涉及的核心组件/服务/表

## 当前实现
- 实现了哪些能力（列表形式）
- 关键约束和业务规则

## 相关文件
- 列出关键实现文件路径（供 AI 快速定位）
```

## 注意事项

- **不要修改 `workflows/` 下的 CI/CD 配置文件**——那些不是需求文档
- **不要修改 `.chatmode.md` 文件**——那些是聊天模式配置
- **保持文件命名约定**（`YYYYMMDD-description.prompt.md`）不变
- 如果不确定某个描述是否过时，**读取相关源代码验证**后再决定
- 整理完成后，简要告知用户修改了哪些文件
