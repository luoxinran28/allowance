# 用户与权限管理功能需求说明

**20251205新增**
 - 组织老板(Boss)角色org_boss，拥有组织级的最高权限，可管理组织内所有团队和成员，分担系统管理员的部分职责。
 - 组织老板的权限低于系统管理员，但高于团队负责人。
 - 组织老板是在免费用户注册后，由系统管理员分配角色获得。
 - 一个组织有多个老板，一个老板只属于一个组织。
 - 组织老板可创建和管理团队，分配团队配额，查看组织内所有成员的许可证使用情况。
 - 用户新建的时候，Organization, Team均表示为Not Assigned状态，用户注册后由系统管理员分配组织和团队。
 - 如果组织老板删除了一个团队，团队内的成员会被移除该团队，且如果成员不属于其他团队，则降级为free用户，标记为Not Assigned状态。

**20251205产品逻辑修改**
1. 用户列表与筛选功能
   - 用户应能查看用户列表及其所属团队/组织
   - 在用户仪表盘页面提供下拉筛选功能
   - 团队负责人可查看本团队成员
   - 可通过侧边栏菜单轻松访问

2. 系统管理员功能
   - 在产品仪表盘创建产品
     - 20251205修改为：产品创建应该有单独的页面；
   - 为组织分配产品，生成组织级许可证池（指定总名额. 过期时间）
   - 为团队分配产品配额（从组织池划分，受严格约束）
   - 可调整组织总名额和团队配额
   - 创建和管理团队（只有管理员能创建）
   - 在团队详情页指定团队领导（一个团队只能有一个leader）
   - 20251205新增：
    * 系统管理员拥有Allowance系统的最高Admin权限，可以解锁所有的功能。产品在需求迭代的时候，以系统管理员的权限为基准迭代，其他用户角色在系统管理员拥有的权限范围内进行权限划分。
    * 系统管理员权限高于老板，可查看和管理所有组织. 团队. 用户. 产品和许可证

3. 许可证管理
   - 组织级：org_product_licenses（许可证池，记录总名额. 已分配. 剩余）
   - 团队级：team_product_quotas（团队配额，从组织池划分）
   - 用户级：team_member_license_assignments（个人许可证JWT）
   - 系统管理员可调整组织总名额和团队配额
   - 配额约束：所有团队配额总和 ≤ 组织总名额

4. 团队管理功能
   - 系统管理员可创建团队并指定团队领导
   - 系统管理员可看到所有团队及其团队领导
   - 团队领导可将同组织用户添加到团队
   - 团队领导添加成员时：
     * 必须主动选择要分配的产品（支持多选）
     * 默认选中用户注册UPID对应的产品
     * 若用户无注册UPID，则必须手动选择
     * 若团队无注册UPID产品的配额，则阻止添加
   - 每分配一个产品，team_product_quotas.used_count +1
   - 移除成员时自动释放所有已分配产品配额，若不再属于任何团队则降级为free
   - 20251205新增：
    - 团队领导可由组织老板指定，系统管理员也可指定；
    - 团队领导可查看和管理其所属团队的成员和许可证使用情况，但无法创建团队或老板级设置。
    - 一个团队领导可以被多个Team指定为负责人，但只能管理其所属团队的成员。
    - 一个团队只能有一个团队领导。

5. 产品管理
    - 系统管理员可创建和管理产品
    - 产品与组织关联以生成许可证
    - 产品列表页显示所有产品及其详情，但不需要显示关联的组织信息，因为产品可以被多个组织使用。
    - 20251205修改：
      - 当前产品等级为：
        * 'free' (免费)：free_user，新注册用户. 未分配或者过期许可证的用户默认等级；
        * 'standard' (付费普通)：standard_employee，team_leader，分配了所在组织和团队后，自动获取许可证的用户；
        * 'premium' (付费高级)：admin系统管理员
      - 当前产品等级为：
        * 'free' (免费)：free_user，新注册用户. 未分配或者过期许可证的用户默认等级，可获取。一般可使用限制性的产品特性；
        * 'standard' (普通)：standard_employee，team_leader，分配了所在组织和团队后，自动获取许可证的用户，可获取。一般增加了产品应有的功能特性；
        * 'premium' (高级)：org_boss，组织老板，系统管理员授权产品给组织时，添加用户成为组织老板，可获取。一般增加了管理功能；
        * 'allstar' (全功能)：admin，系统管理员，一般可获取所有授权. 管理等功能，可以全局监控和管理产品和用户。

6. 组织管理
    - 系统管理员可创建和管理组织
      - 20251205新增：
        * 创建组织时可指定一个或多个组织老板，从注册用户中选择，赋予其组织管理权限；如果注册用户已经是系统管理员，则无需重复赋予权限；如果注册用户已经是其他组织的老板，则禁止重复赋予权限。
        * 创建组织时，需要默认创建一个默认团队，团队名称为"Default Team"，并将组织老板指定为该团队的团队负责人。默认团队不能够被删除。
        * 组织老板如果移除了某个团队，需要询问是解散团队成员为免费用户，还是移动成员到其他团队。
    - 组织详情页显示：
      * 关联的产品和许可证池信息（总名额/已分配/剩余）
      * 各团队的配额分配情况
    - 系统管理员可查看产品许可证证书：
      * 组织级：许可证池状态（总数/已用/剩余）
      * 成员级：点击查看用户获得的JWT许可证字符串（可复制）
    - 可调整组织产品总名额和过期时间
    - 20251205新增：
      * 组织老板可查看和管理其所属组织的团队. 成员和许可证使用情况，但无法创建组织或管理系统级设置。
      * 组织详情页显示关联的产品和许可证池信息
      * 组织老板可查看和管理其所属组织的团队. 成员和许可证使用情况
      * 组织老板无法创建组织. 产品或管理系统级设置

权限控制要求：
- 普通用户：隐藏侧边栏"用户"导航项
- 团队负责人：仅查看直接团队成员（多团队负责人可查看所有关联团队成员）
- 系统管理员：可查看所有用户

开发要求：
- 请在前后端同时进行相应修改
- 完成修改后进行验证测试
- 确保用户只能查看其权限范围内的用户列表

这些功能需要在前端界面和后端逻辑中同步实现，以确保系统功能的完整性和权限控制的准确性。

**20251205界面优化**
前端SideBar的逻辑优化，需要按照用户的权限隐藏和禁用相关的导航项。

当前前端的SideBar及页面结构如下：
  - Main Navigation
    - Users, Teams, Organizations, Products, Billing
  - License Management 
    - My Licenses, Assign Licenses
  - Batch Operations
    - Generate Licenses, Revoke Licenses, Export Licenses
  - Admin Section
    - Manage Products, Manage Users, Team Quotas
  - Help Section
    - Support, Documentation

需要调整为：
  - Main Navigation ("free", "standard", "premium", "allstar" tier users can see the menu)
    - "Profile"：added, it shows the current user info, id, license validity, belonging organization and teams, product tier, etc.
    - "Users" needs to be moved to Admin Section
    - "Teams" removed from Main Navigation. The logic is handled in "Team Management" section.
    - "Organizations" needs to be moved to Admin Section
    - "Products" needs to be moved to Admin Section
    - Billing 

  - Admin Section ("allstar" tier users can see the menu)
    - "Dashboard" from Main Navigation moved here, includes:
      * Overview of Products, Organizations, Teams, Users, licenses.
    - Products: It shows all products in the system with their product details. It has a detailes page for each product to show associated organizations and license pools.
      * List shows attributes: upid, name, description, created_at
    - Organizations: It shows all organizations in the system with their details, including associated products and license pools. It has detailes page for each organization to show teams and license quota assignments. The "allstar" tier users can assign a boss to the organization in the details page.
      * List shows attributes: first boss account (email), teams amount, members amount, products amount.
      * Detail page shows: List of product name, license pools, total quota, used quota, remaining quota, expiration date; List of org bosses.
    - Users: It shows all registered users in the system with their roles and organizations with filtering options. It has a detailes page for each user to show their assigned organization and team memberships. The "allstar" tier users can change the user role in the details page, and assign the user to an organization and team.
      * List shows attributes: account, email, role, organization, team(s), license status.
    - "Generate Licenses": from "Batch Operations" moved here, the "allstar" tier users can generate licenses for any organization.
    - "Revoke Licenses": from "Batch Operations" moved here, the "allstar" tier users can revoke licenses for any organization.
    - "Export Licenses": from "Batch Operations" moved here, the "allstar" tier users can export licenses for any organization.

  - "License Management" changes to "Organization & License" ("allstar", "premium" tier users can see the menu)
    - Products & Licenses: "allstar", "premium" tier users can see all products assigned to the organization, license pool status (total, used, remaining), and license expiration.
    - Assign Licenses: "allstar", "premium" tier users can assign licenses to the team within the organization. The assigned licenses should reflect the team quotas and organization license pool. The assigned team member become the team leader if they are assigned as such.

  - "Team Management" added as new  ("allstar", "premium", "standard" tier users can see the menu)
    -" Team & Quotas": "allstar", "premium" tier users can see. It shows all teams list and their quota usage belonging to the organization. In the same organization, the different boses can see all teams. In the same organzation, the different team leaders can only see their own teams. The sys admin, and org boss has the right to create new teams and assign team leaders. The team leader cannot create teams.
    - "Team Members": "allstar", "premium", "standard" tier users can see. It shows all team members list belonging to the teams. In the same organization, the different boses can see all members. In the same organzation, the different team leaders can only see their own team members. The sys admin, org boss, and team leader can add or remove members from their own teams, and move the memeber to other teams within the same organization.

  - "Batch Operations" removed
  - "Help Section" Keeps unchanged
    - Support
    - Documentation


**20251205 AI问题细节补充回答**
1. 四层角色体系的权限划分
同一个用户能既是某组织的Org Boss，又是其他组织的Team Leader
同一个用户，只能是一家organization的boss，但这个用户可以既是Org Boss又是另一个System Admin。System Admin权限最高，拥有系统的全部权限。

只有 System Admin + Org Boss 能创建团队，Team Leader 则不能。 System Admin + Org Boss 具体职责如下：
 - 可以删除团队，删除组织内的用户
 - 可以修改组织信息
Team Leader 不能删除团队和组织内的用户，只能管理自己团队的成员。
 - 可以修改组织信息

Org Boss 不能看到其他组织的信息吗？不能把用户从一个组织移到另一个组织，只能移除自己的组织，由另一个组织来添加。但System Admin可以把用户从一个组织移到另一个组织，在Admin Section中查看用户详情的时候做到。

2. Sidebar 导航重构的逻辑
  - "Organization & License" 菜单中的权限差异
    - Admin 看到：所有组织的所有产品和许可证
    - Org Boss 看到：仅自己所属组织的信息
    - 这两种用户的 UI 是共用同一页面的，他们看到的都是list列表，只是数据不同而已。
  - "Team Management" 中 Org Boss 的权限
    - 需求说 Org Boss 能"创建新团队和指定团队负责人"
    - Org Boss 可以删除团队，可以编辑团队名称，可以移除不属于该组织的成员（设计上系统应该不会有这种情况存在）。
  - "Dashboard" 页面的数据展示
    - Admin 的 Dashboard 显示：全系统的产品/组织/团队/用户/许可证总览
    - Org Boss 的 Dashboard 应该显示所属组织的产品/团队/用户/许可证总览数据
  - "Users" 页面的权限控制
    - Admin 看所有用户，Team Leader 只看自己团队的用户，Org Boss 看整个组织内的所有用户，这些UI都是同样的list列表页面，只是展示数据不同。

3. 组织老板（Org Boss）的具体权限清单
  - 不能创建新产品
  - 不能为组织添加新的产品许可证，因为组织老板要在线下向系统管理员购买了产品后，系统管理员才能为组织添加新的产品许可证。
  - 能修改已分配的团队配额
  - 能删除团队
  - 能移除/禁用组织内的用户
  - 不能修改其他 Org Boss 的权限
  - 能看到组织内用户的邮箱（即账号）信息，但不能密码等敏感信息。

4. 数据模型与 RBAC 系统的关系
  - Org Boss 如何在 RBAC 中需要新增角色 org_boss
  - Org Boss 的权限需要资源作用域
  - Admin 自动拥有 Org Boss 的所有权限， Org Boss 自动拥有 Team Leader 的所有权限

5. 创建组织时指定 Org Boss 的工作流
  - Admin 作为 Org Boss 时，使用 Admin 权限 权限访问该组织？
  - Admin 自动拥有所有 Org Boss 权限
  - 不允许一个用户是 2 个不同组织的 Org Boss
  - 指定 Org Boss 的时机有三种：
    * 在创建组织时指定指定 Org Boss；
    * Admin也可以在用户列表中的用户详情页里面指定该用户为某一个组织的老板
    * 在组织详情页添加，移除，修改 Org Boss，当一个组织只有一个Org Boss时，不能移除该Org Boss。

6. 前端页面重构的实施顺序
  - 暂时不需要图标及可视化
  - 列表视图. 详情页内容已补充
  - 现有 /dashboard/licenses/assign 的关系是分开的
  - Team & Quotas + Team Members 不能用同一个详情页

7. 配额管理的细节
  - Admin 和 Org Boss 都能调整团队配额
  - 如果将配额从 100 改为 50，但已使用 60，配额将成为负数，表示超额使用，系统应该提示用户不允许分配，直到使用量降到 50 以下。
  - 不支持"从其他团队挪用配额"的操作
  - 许可证过期后，已分配的成员不能用，分配的成员自动使用免费用户的权限。
  - 暂时不需要"许可证续期"流程，由线下联系系统管理员后，重新由系统管理员分配新的许可证给组织续期。

8. 免费用户注册后的自动处理
  - 步骤1：用户自助注册 → 成为免费用户
  - 步骤2：Admin 后台分配该用户为 Org Boss
  - 这个过程中用户不知道，不需要邮件通知，之后会实现相关逻辑。
  - 用户从"免费用户"转为"Org Boss"时，tier 从 free

9. User Tier 与 Role 的关系
  - Role 与 权限 是一对一的。
    * 'free_user'：免费用户
    * 'standard_employee': 团队成员
    * 'team_leader': 团队领导
    * 'org_boss'：组织老板 （新增）
    * 'admin'：系统管理员
  - 产品Tier与用户Role的对应关系如下：
    * 'free'：free_user
    * 'standard'：standard_employee，team_leader
    * 'premium'：org_boss （修改）
    * 'allstar'：admin （修改）
  - 前端SideBar导航权限是根据产品Tier来决定的

10. Tier 变更时的自动化处理
需求中提到几个 Tier 转变场景：

  - 免费用户 → 分配到团队，Tier 应该自动从 free → standard
  - 标准用户 → 指定为 Org Boss，Tier 应该自动从 standard → premium
  - 用户从所有团队移除，Tier 应该自动从 standard → free


11. Tier 与 Role 的分离设计
  - Organization/Team 是数据域（这个用户属于哪个组织/团队）
  - Tier 是权限域（这个用户能用什么功能）
  - 两个域相对独立
只用 Tier，完全废除 Role，Tier 既用来决定Sidebar权限，也用来决定资源操作权限，Role 不再存储，而是实时计算出来
  - 删除存储的 Role 字段
    - 不存储 user_roles 表，改为实时计算
    - 前端从 Tier 推导出 Role（只是显示用）），权限检查只看 Tier
  - 后端权限检查函数简化为：can_user(tier, action)
    - 不再同时检查 role + organization_id + team_ids
  - 明确 Organization/Team 信息的含义
    - organization_id：用户的主组织（Tier 变化时保留）
    - team_ids：用户在这个组织中的团队列表

12. 用户从所有团队移除后，team_ids 应该清空吗？
  - 是的，team_ids 应该清空
  - 用户的 organization_id 保持不变，表示用户仍然属于该组织，但没有团队归属
13. 许可证过期时，team_ids 应该怎么处理？
  - 许可证过期时，team_ids 保持不变
  - 用户的 tier 应该自动降级为 free，但 organization_id 和 team_ids 保持不变，表示用户仍然属于该组织和团队，但没有有效许可证
14. 未来是否需要支持用户属于多个组织？
  - 目前不需要支持用户属于多个组织
  - 用户只能属于一个组织，但可以属于多个团队（前提是这些团队都属于同一个组织）

15. organization_id 什么时候被赋值？
  - 用户注册时，organization_id 默认为 null，表示 Not Assigned 状态
  - 系统管理员分配用户到某个组织时，赋值 organization_id
  - 仅分配到组织，不分配到团队时，tier 应该是 free，分配到团队后 tier 自动升级到 standard，并且quota分配逻辑生效
16. Org Boss 和 Team Leader 的 Tier 差异
  - Org Boss 必须分配到某个团队，默认是该组织的 Default Team
  - 如果 Org Boss 不应该从所有团队移除，因为默认Team不能删除
  - Org Boss 的 tier 是 premium，不会降级为 standard 或 free

17. 当前代码中的 user_roles 表要做什么？
  - user_roles 表可以废除
  - 所有权限检查逻辑改为基于 tier 和 organization/team 信息
  - 前端显示用户角色时，根据 tier 推导出角色名称（仅用于显示）

18. Frontend Role 已经不需要显示角色Role了，只需要显示产品Tier
  - 前端用户详情页显示用户的产品 Tier，而不是角色 Role
  - 例如：
    * free_user → free
    * standard_employee/team_leader → standard
    * org_boss → premium
    * admin → allstar
19. Org Boss 首次创建和后续修改的工作流，确认逻辑：
  - 创建组织时：
    * Step1: Admin 输入组织基本信息 + 选择 Org Boss 用户
    * Step2: 系统自动创建 Default Team
    * Step3: 系统自动将选中的用户分配到 Default Team
    * Step4: 系统自动将这些用户的 tier 升级为 premium
    * Step5: 完成
  - 后续修改 Org Boss，在组织详情页中：
    * 添加新的 Org Boss：选择用户 → tier升级为premium → 分配到Default Team
    * 移除 Org Boss：如果只有1个，不允许移除；如果有多个，允许移除 → free

