# License 页面整合优化

**状态**: ✅ 已完成  
**完成日期**: 2026-01-24  
**最后更新**: 2026-03-06

---

## 优化结果

将 5 个分散的 License 页面整合为 2 个 Tab 页面，Sidebar 菜单项从 10 个减少到 7 个。

## 当前页面结构

### Admin License Management (`/admin/licenses`)
- **权限**: allstar only
- **Tab 1: Assign to Organization** — 为组织分配产品配额
- **Tab 2: Revoke Licenses** — 按 Key 或批次撤销许可证
- **Tab 3: Export & Reports** — 导出许可证列表和报告
- URL 参数保持 Tab 状态：`?tab=assign|revoke|export`

### Organization License Management (`/org-license`)
- **权限**: premium+
- **Tab 1: Products & Quotas** — 查看组织产品配额状态
- **Tab 2: Assign to Members** — 分配许可证给团队成员
- URL 参数保持 Tab 状态：`?tab=products|assign`

## 路由映射

| 旧路由 | 新路由 |
|--------|--------|
| `/admin/batch/generate` | `/admin/licenses?tab=assign` |
| `/admin/batch/revoke` | `/admin/licenses?tab=revoke` |
| `/admin/batch/export` | `/admin/licenses?tab=export` |
| `/org-license/products` | `/org-license?tab=products` |
| `/org-license/assign` | `/org-license?tab=assign` |
