-- database/seed_data.sql
-- 四层权限系统测试数据

-- 1. 创建测试用户（不同 Tier 级别）
INSERT INTO users (email, uid, password_hash, tier, organization_id, team_ids, license_status, source_product_slug, status, created_at, updated_at)
VALUES
  -- Free User - 无组织，无团队
  ('free_user@test.com', 'UFR1E2E3E4E5E6E7',
   '$argon2id$v=19$m=19456,t=2,p=1$2NtODaH4T0wmOnsuNCg3ew$/zOMOnWbc1kK723Cbc4PzujaLKrqo0q4vCjFakA3Llg',
   'free', NULL, NULL, 'valid', 'allowance', 'active', NOW(), NOW()),

  -- Standard User - 有组织，有团队（Team Member）
  ('standard_user@test.com', 'US7T8A9N10D11A12',
   '$argon2id$v=19$m=19456,t=2,p=1$2NtODaH4T0wmOnsuNCg3ew$/zOMOnWbc1kK723Cbc4PzujaLKrqo0q4vCjFakA3Llg',
   'standard', 1, '[1, 2]', 'valid', 'allowance', 'active', NOW(), NOW()),

  -- Premium User - 有组织，有团队（Org Boss）
  ('premium_user@test.com', 'UP11R12E13M14I15',
   '$argon2id$v=19$m=19456,t=2,p=1$2NtODaH4T0wmOnsuNCg3ew$/zOMOnWbc1kK723Cbc4PzujaLKrqo0q4vCjFakA3Llg',
   'premium', 1, '[1, 2, 3]', 'valid', 'allowance', 'active', NOW(), NOW()),

  -- Allstar User - Admin
  ('admin_user@test.com', 'UA11D12M13I14N15',
   '$argon2id$v=19$m=19456,t=2,p=1$2NtODaH4T0wmOnsuNCg3ew$/zOMOnWbc1kK723Cbc4PzujaLKrqo0q4vCjFakA3Llg',
   'allstar', NULL, NULL, 'valid', 'allowance', 'active', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  tier = EXCLUDED.tier,
  organization_id = EXCLUDED.organization_id,
  team_ids = EXCLUDED.team_ids,
  updated_at = NOW();

-- 2. 创建测试组织
INSERT INTO organizations (name, created_by, status, created_at, updated_at)
VALUES
  ('Test Organization', 2, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. 创建测试团队
INSERT INTO teams (name, organization_id, created_by, status, created_at, updated_at)
VALUES
  ('Development Team', 1, 3, 'active', NOW(), NOW()),
  ('Marketing Team', 1, 3, 'active', NOW(), NOW()),
  ('Sales Team', 1, 3, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 测试权限矩阵
-- ┌─────────────┬──────────┬──────────┬──────────┬──────────┐
-- │ 操作        │ Free     │ Standard │ Premium  │ Allstar  │
-- ├─────────────┼──────────┼──────────┼──────────┼──────────┤
-- │ 创建Team    │ ✗        │ ✗        │ ✓        │ ✓        │
-- │ 删除Team    │ ✗        │ ✗        │ ✓        │ ✓        │
-- │ 添加成员    │ ✗        │ ✓*       │ ✓        │ ✓        │
-- │ 管理员操作  │ ✗        │ ✗        │ ✗        │ ✓        │
-- └─────────────┴──────────┴──────────┴──────────┴──────────┘
-- *: Standard 仅可添加到自己的团队

-- 验证查询
-- SELECT id, email, tier, organization_id, team_ids FROM users WHERE email LIKE '%@test.com' ORDER BY id;
