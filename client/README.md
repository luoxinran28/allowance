# Allowance Client

NextJS + better-auth frontend for the allowance authorization management system.

## Project Structure

```
app/
├── auth/
│   ├── login/page.tsx              # Unified login/register
│   ├── activate/[token]/page.tsx   # Email activation
│   └── reset-password/page.tsx     # Password reset
│
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard home
│   ├── profile/page.tsx            # User profile
│   ├── teams/page.tsx              # My teams
│   ├── products/page.tsx           # My products/licenses
│   └── organization/page.tsx       # Organization management
│
├── admin/
│   ├── layout.tsx
│   ├── users/page.tsx              # User management
│   ├── approvals/page.tsx          # Approval queue
│   ├── teams/page.tsx              # Team management
│   └── settings/page.tsx           # System settings
│
├── layout.tsx                      # Root layout
├── page.tsx                        # Landing page
└── globals.css

components/
├── auth/
│   └── AuthForm.tsx                # Login/Register form
├── dashboard/
│   └── UserCard.tsx                # User info display
└── common/
    ├── Header.tsx
    ├── Sidebar.tsx
    └── Layout.tsx

lib/
├── auth-client.ts                  # better-auth configuration
├── api-client.ts                   # HTTP client
├── types.ts                        # TypeScript types
├── hooks/
│   ├── useAuth.ts                  # Auth hook
│   └── usePermission.ts            # Permission check hook
└── utils/
    ├── license.ts                  # License verification
    └── validators.ts               # Form validators

public/
└── [static assets]
```

## Setup & Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Install

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Development Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code
npm run format
```

## Environment Variables

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4040
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3030

# Auth
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3030/dashboard
```

## Key Features

### Authentication Flow
1. User visits login page
2. Enters email
3. If unregistered, prompts to create account
4. Email activation link sent
5. User clicks link to activate
6. Becomes free tier user

### License Verification
- Offline JWT verification for license tokens
- Client-side validation before API calls
- License status display in dashboard

### RBAC Display
- Show user's roles and permissions
- Hide/show UI elements based on permissions
- API calls protected by role checks on backend

## Key Pages

### `/auth/login`
- Email/password form
- Registration prompt for new emails
- Password reset link

### `/dashboard`
- User profile overview
- License status
- Team membership

### `/dashboard/products`
- List available products
- Show current licenses
- Generate new license button

### `/admin/approvals`
- Pending approval requests
- Approve/reject buttons
- Audit trail

## Libraries Used

- **better-auth**: Authentication library
- **axios**: HTTP client
- **zustand**: State management
- **swr**: Data fetching
- **tailwindcss**: Styling
- **next-auth**: Session management (optional)

## Testing

See `__tests__` directory for unit tests:
- API client tests
- Hook tests
- Component tests

```bash
npm run test
```

## Performance Tips

- Use dynamic imports for large components
- Implement infinite scroll for lists
- Cache API responses with SWR
- Use image optimization

## Security Notes

- Never store tokens in localStorage (use httpOnly cookies)
- Validate license offline using JWT signature
- CSRF protection via better-auth
- XSS prevention via Next.js escaping
