# Allowance 系统 - 基础需求文档

**文档状态**: 📚 历史文档（项目初始需求）  
**创建日期**: 2025-11-08  
**最后更新**: 2026-01-21

---

## ⚠️ 重要说明

**本文档为项目初始需求文档，后续需求演进请参考以下文档**：

| 文档 | 内容 | 状态 |
|------|------|------|
| `20251205-four-tier-needs.prompt.md` | 四层权限需求 | ✅ 已实施 |
| `20251205-refactor-four-tier.prompt.md` | 四层权限技术方案 | ✅ 已完成 |
| `20251128-milestone-detailed-requirement.prompt.md` | 完整需求规格 | ✅ 核心已实施 |
| `copilot-instructions.md` | AI 编码指南 | ✅ 当前有效 |

---

## 项目当前状态（2026年1月）

**已实现功能**：
- ✅ 四层权限系统：free/standard/premium/allstar
- ✅ 前端路由重构：/user, /admin, /org-license, /team-management
- ✅ Sidebar 权限菜单：基于 tier 的菜单可见性
- ✅ Auth 表单验证：OWASP Top 10 合规
- ✅ 数据库四层迁移：PostgreSQL + SQLx
- ✅ JWT 认证 + Nonce 防重放

**技术栈**：
- 前端：Next.js 14 + TypeScript + Tailwind CSS
- 后端：Rust + Axum + SQLx + JWT + Redis
- 数据库：PostgreSQL
- 部署：Docker

---

## 原始需求（2025年11月8日）
用户User管理，由RBAC系统管理产品使用权限:
	用户登陆及授权，独立uid;
	支持发送邮件链接激活或者验证码，暂时使用我的个人邮箱发送: luoxinran28@gmail.com
	免费试用用户：
		注册时提供产品Slug（从网页meta标签自动获取，如：kwongfu）;
		软件基础功能，每天使用3次的限制;
		免费许可证永久有效;
		通过团队领导邀请加入团队后，自动升级为付费用户（tier=standard）。
	付费用户：
		普通员工：软件基础功能;
		小组领导：
			同时也是组织的一个普通员工，由系统管理员分配角色;
			可将免费用户添加到小组，使其升级为付费用户;
			可从团队配额中为成员分配产品授权（支持多产品同时分配）;
			可移除团队成员并释放产品配额;
			仅能查看和管理自己所负责团队的成员。
	系统管理员：
		系统全部的权限;
		可创建产品（定义UPID、tier等）;
		可为组织分配产品，生成组织级许可证池（指定总名额、过期时间）;
		可为团队分配产品配额（从组织池中划分，严格约束：团队配额总和≤组织总名额）;
		可创建和管理团队（只有管理员能创建团队）;
		可指定团队领导（一个团队只能有一个leader）。
产品Product管理:
	每个产品有唯一UPID标识（格式：UPID-{slug}-{tier}，如UPID-allowance-pro）;
	产品分为不同tier：free（免费版）、standard（标准版）、premium（高级版）;
	授权码采用JWT格式，包含：用户ID、产品ID、tier、有效期、使用限制等;
	免费用户只能获得free tier授权（无时间限制）;
	付费用户获得standard或premium tier授权（无限制）;
	授权码由后端自动生成，用户可在前端复制JWT字符串粘贴到产品配置文件中。
小组Team管理:
	三级授权体系：组织 → 团队 → 用户;
	组织购买产品获得许可证池（org_product_licenses表）;
	管理员为团队分配产品配额（team_product_quotas表），受严格约束;
	团队领导从团队配额中为成员分配产品（team_member_license_assignments表）;
	用户可同时在多个团队，获得不同产品授权;
	成员移除时自动释放配额，若不再属于任何团队则降级为免费用户。

2. 技术选型
前端：nextjs
后端： Rust + Axum + SQLx + JWT + Redis
数据库：postgres
部署：docker 容器化部署在阿里云ecs

3. 技术要求
权限管理逻辑
	等级关系，用户组，动态属性等
	支持统一的Access Control List
支持Single-Sign On: 
	支持作为身份提供者（IdP） 支持 OIDC/OAuth2/SAML 协议
今后可扩展支持集成支付系统，按月和年付费
会话策略与 token 存储: 无状态JWT
轻量日志打印
部署访问：
	中国大陆+全球访问，考虑试用阿里云、vercel等便宜的方案
代码生成要求：
	作为独立开发者，代码需要考虑模块化以及易读，尽量精简以及附加必要注释（特别是后端），能让我看懂。例如前端思考pages, components, utils, services等关系，后端思考compoenets, services, model的关系等，每个文件的代码量尽量不要超过300-500行
	目前只考虑完成基本业务功能
暂时不用实现：
	不支持分布式授权
	支付系统用模拟的方式，不真实集成
	评估日活100人，1年内日活不会超过1000人，不考虑并发
	不支持审计日志要求
	不支持多因素MFA认证