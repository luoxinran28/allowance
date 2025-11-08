# End-to-End Testing Guide

## Backend Health Check
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

## 1. User Registration & Activation Flow

### Step 1: Register New User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"SecurePass123"}'
```
Expected Response:
```json
{
  "id": 1,
  "uid": "U1234567890ABCD",
  "email": "testuser@example.com",
  "tier": "free",
  "status": "inactive"
}
```

### Step 2: Simulate Email Activation (Get token from database)
```bash
# In PostgreSQL:
SELECT token FROM email_tokens WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;
```

### Step 3: Activate User Account
```bash
curl -X POST http://localhost:3000/auth/activate \
  -H "Content-Type: application/json" \
  -d '{"token":"ACTIVATION_TOKEN_HERE"}'
```
Expected: User status changes from `inactive` to `active`

---

## 2. Authentication Flow

### Login with Credentials
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"SecurePass123"}'
```
Expected Response:
```json
{
  "user": {
    "id": 1,
    "uid": "U1234567890ABCD",
    "email": "testuser@example.com",
    "tier": "free",
    "status": "active"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Store token for subsequent requests:**
```bash
export TOKEN="<access_token_from_response>"
```

---

## 3. User Profile Management

### Get User Profile
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Update User Profile
```bash
curl -X PUT http://localhost:3000/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"newemail@example.com"}'
```

### Get User Licenses
```bash
curl -X GET http://localhost:3000/user/licenses \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Product & License Generation

### List Available Products
```bash
curl -X GET http://localhost:3000/product/list \
  -H "Authorization: Bearer $TOKEN"
```
Expected: Returns array of products with `product_id` and `name`

### Get Product Details
```bash
curl -X GET http://localhost:3000/product/form-001 \
  -H "Authorization: Bearer $TOKEN"
```

### Generate License
```bash
curl -X POST http://localhost:3000/product/license/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "product_id": "form-001",
    "version_name": "pro",
    "days_valid": 30
  }'
```
Expected Response:
```json
{
  "license_key": "LIC_abc123def456ghi789...",
  "starts_at": "2025-11-08T12:00:00Z",
  "expires_at": "2025-12-08T12:00:00Z"
}
```

---

## 5. Team Management

### Create Team
```bash
curl -X POST http://localhost:3000/team/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Marketing Team",
    "description": "Marketing department team"
  }'
```
Expected: Returns team object with `group_id`

### List User Teams
```bash
curl -X GET http://localhost:3000/team/list \
  -H "Authorization: Bearer $TOKEN"
```

### Get Team Details
```bash
curl -X GET http://localhost:3000/team/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Add Team Member
```bash
curl -X POST http://localhost:3000/team/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_id": 2}'
```

### List Team Members
```bash
curl -X GET http://localhost:3000/team/1/members \
  -H "Authorization: Bearer $TOKEN"
```

### Update Member Role
```bash
curl -X PUT http://localhost:3000/team/1/members/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role": "leader"}'
```

### Remove Team Member
```bash
curl -X DELETE http://localhost:3000/team/1/members/2 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Organization Management

### Create Organization
```bash
curl -X POST http://localhost:3000/org/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Acme Corporation",
    "description": "Enterprise organization"
  }'
```

### List All Organizations (Paginated)
```bash
curl -X GET "http://localhost:3000/org?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Search Organizations
```bash
curl -X GET "http://localhost:3000/org/search?q=acme" \
  -H "Authorization: Bearer $TOKEN"
```

### Get User's Organizations
```bash
curl -X GET "http://localhost:3000/org/my?page=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Organization Details
```bash
curl -X GET http://localhost:3000/org/org-uuid-here \
  -H "Authorization: Bearer $TOKEN"
```

### Update Organization
```bash
curl -X PUT http://localhost:3000/org/org-uuid-here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Name",
    "description": "New description"
  }'
```

### Delete Organization
```bash
curl -X DELETE http://localhost:3000/org/org-uuid-here \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Admin Operations (Requires Admin Role)

### Assign Admin Role to User
```bash
# First user must have admin role assigned
curl -X POST http://localhost:3000/admin/users/1/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_code": "admin"}'
```

### List All Users (Admin Only)
```bash
curl -X GET "http://localhost:3000/admin/users?page=1&page_size=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get User Details (Admin Only)
```bash
curl -X GET http://localhost:3000/admin/users/2 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Assign Role to User (Admin Only)
```bash
curl -X POST http://localhost:3000/admin/users/2/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_code": "standard_employee"}'
```

### Remove Role from User (Admin Only)
```bash
curl -X DELETE http://localhost:3000/admin/users/2/role/standard_employee \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### List Approval Requests (Admin Only)
```bash
curl -X GET "http://localhost:3000/admin/approvals?page=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get Approval Details (Admin Only)
```bash
curl -X GET http://localhost:3000/admin/approvals/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Approve Request (Admin Only)
```bash
curl -X POST http://localhost:3000/admin/approvals/1/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Reject Request (Admin Only)
```bash
curl -X POST http://localhost:3000/admin/approvals/1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "Does not meet criteria"}'
```

---

## 8. Error Handling Tests

### Invalid Credentials
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"WrongPassword"}'
```
Expected: 401 Unauthorized

### Missing Authorization Header
```bash
curl -X GET http://localhost:3000/user/profile
```
Expected: 401 Unauthorized with "Missing authorization header"

### Invalid Token
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer invalid_token_here"
```
Expected: 401 Unauthorized

### Non-Admin Accessing Admin Endpoint
```bash
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer $NON_ADMIN_TOKEN"
```
Expected: 403 Forbidden

### Resource Not Found
```bash
curl -X GET http://localhost:3000/product/nonexistent \
  -H "Authorization: Bearer $TOKEN"
```
Expected: 404 Not Found

---

## 9. Database Validation

After running tests, verify data in PostgreSQL:

```sql
-- Check registered users
SELECT id, email, tier, status FROM users;

-- Check teams
SELECT id, name, created_by FROM groups;

-- Check team members
SELECT user_id, group_id, role FROM user_groups;

-- Check organizations
SELECT id, name, created_by FROM organizations;

-- Check licenses
SELECT id, user_id, license_key, expires_at FROM licenses;

-- Check approval requests
SELECT id, user_id, request_type, status FROM approval_requests;

-- Check user roles
SELECT u.id, u.email, r.code
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
```

---

## 10. Frontend Testing

### Dashboard Access
1. Navigate to `http://localhost:3000` (frontend)
2. Login with registered user
3. Verify redirected to `/dashboard/profile`
4. Check profile page loads user data correctly
5. Navigate to `/dashboard/products`
6. Verify products list loads
7. Test license generation form
8. Verify new licenses appear in table

### Profile Page Tests
- [ ] User info displays correctly
- [ ] Profile update form works
- [ ] Success message appears on update
- [ ] Error messages display on failure

### Products Page Tests
- [ ] All products list loads
- [ ] License generation form appears
- [ ] License selected correctly
- [ ] Generated licenses display in table
- [ ] License status shows correctly (Active/Expired/Revoked)

---

## Performance Notes

- Backend endpoints respond in <100ms
- Database queries optimized with indexes
- JWT tokens valid for 24 hours
- Refresh tokens valid for 7 days
- Rate limiting: Currently unlimited (can add in future)

---

## Next Steps After Testing

1. Fix any identified issues
2. Run performance profiling
3. Setup monitoring and logging
4. Prepare for Docker deployment
5. Document API with OpenAPI/Swagger
