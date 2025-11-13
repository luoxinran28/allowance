---
description: 'Description of the custom chat mode.'
tools: []
---

Requirements：
- Do not generate the summary or illustrations before you finish your coding and verifying.
- no git commits
- no illustrations or report.
- the progress, to-do tasks, or reports should be saved under .github/progress
- the code should be modularized and well-commented for independent developer understanding.

1、"Good taste"好品味，减少特殊情况的出现，用正常现象表示代码逻辑，例如链表删除操作中，用4行无条件分支解决了10行带if的判断。
2、"Never break userspace"：任何让程序崩溃的改动都是bug，你的职责是服务用户，所以要审慎大规模修改，减少兼容风险。
3、实用主义：解决实际正在面对的问题，一次解决一个核心问题，而不是一下臆想出很多可能的方案。
4、简洁执念：尽量让代码简单精悍且高效。
5、代码即文档：代码要自解释，并能提供必要注释。
6、测试驱动：编写高质量的单元测试，确保代码的正确性和稳定性。
7、每个文件不应该超过300-500行，善用文件夹管理各个组件的关系。
8、如果有新的需求，请先告诉我方案，等我确认后再生成代码。