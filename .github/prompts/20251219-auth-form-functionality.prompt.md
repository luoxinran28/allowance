# Auth Form Security & Validation Implementation Guide

**Version**: 1.1  
**Date**: December 19, 2025  
**Status**: ✅ Implemented  
**Last Updated**: January 21, 2026  
**Purpose**: Reusable prompt for implementing secure auth forms with OWASP Top 10 compliance

## Implementation Status

| Component | Status |
|-----------|--------|
| `sanitizeInput()` | ✅ Implemented |
| `validateEmail()` | ✅ Implemented |
| `validatePassword()` | ✅ Implemented |
| `checkForSQLInjection()` | ✅ Implemented |
| `validateAndSanitizeInput()` | ✅ Implemented |
| AuthForm visual indicators | ✅ Implemented |
| Password requirements display | ✅ Implemented |

**Implementation file**: `client/lib/validation.ts` (282 lines)

## Overview

This document provides a complete framework for building secure authentication forms with real-time input validation and protection against common web attacks (XSS, SQL injection, etc.).

## Requirements

### 1. Security Requirements (OWASP Top 10)

**A. Cross-Site Scripting (XSS) Prevention**
- Sanitize all user inputs to escape HTML special characters
- Remove control characters and null bytes that could enable script injection
- Validate input format before processing
- Never trust client-side validation alone; validate on backend

**B. SQL Injection Prevention**
- Detect and reject inputs containing SQL keywords (SELECT, INSERT, UPDATE, DELETE, UNION, etc.)
- Flag SQL comments (--) and stored procedure calls (xp_, sp_)
- Use parameterized queries on backend (never string concatenation)
- Validate email and password formats strictly

**C. Input Validation**
- Implement whitelist-based validation (allow only expected characters)
- Check input length constraints
- Validate format according to standards (RFC 5322 for emails)
- Reject consecutive special characters and unusual patterns

## Implementation Components

### 1. Validation Utilities Module (`lib/validation.ts`)

Create a comprehensive validation library with these functions:

#### `sanitizeInput(input: string): string`
- Removes null characters and control characters (0x00-0x1F, 0x7F)
- Escapes HTML special characters: `&`, `<`, `>`, `"`, `'`, `/`
- Returns safe string for storage/display

**Used by**: Both email and password validation, before submission

#### `validateEmail(email: string): { isValid: boolean; message: string }`
Requirements:
- Length: 3-254 characters (RFC 5322)
- Format: `local@domain.ext` (simplified regex: `/^[^\s@][^\s@]*@[^\s@]+\.[^\s@]+$/`)
- Local part: Cannot start/end with dot, no consecutive dots
- Domain: At least 4 chars, one dot, TLD 2+ letters
- No control characters or spaces

Return helpful messages:
- "Email is required"
- "Email is too short/long"
- "Please enter a valid email address (e.g., user@example.com)"
- "Email contains invalid consecutive dots"
- "Invalid top-level domain"

#### `validatePassword(password: string): { isValid: boolean; message: string; requirements: {...} }`
Requirements:
- **Minimum length**: 6 characters
- **Character types allowed**: 
  - Uppercase: A-Z
  - Lowercase: a-z
  - Numbers: 0-9
  - Special chars: `!@#$%^&*()_+-=[]{}|;:,.<>?`
- **Restrictions**:
  - No spaces
  - No control characters or null bytes
- **Regex**: `/^[a-zA-Z0-9!@#$%^&*()_\+\-=\[\]{}|;:,.<>?]{6,}$/`

Return object with:
- `isValid`: Boolean
- `message`: Specific error message if invalid
- `requirements`: Object tracking each requirement
  - `minLength`: boolean
  - `hasNumber`: boolean
  - `hasUpperCase`: boolean
  - `hasLowerCase`: boolean
  - `allowedCharacters`: boolean

Error messages:
- "Password must be at least 6 characters (currently X)"
- "Password contains invalid characters. Allowed: letters, numbers, and !@#$%^&*()_+-=[]{}|;:,.<>?"
- "Password cannot contain spaces"
- "Password contains invalid characters"

#### `checkForSQLInjection(input: string): boolean`
Detect patterns:
- SQL keywords: SELECT, INSERT, UPDATE, DELETE, DROP, UNION, EXEC, EXECUTE, SCRIPT, JAVASCRIPT (case-insensitive)
- SQL comments: `--`, `/*`, `*/`
- Stored procedures: `xp_`, `sp_`
- Comment injection: `'; --` patterns
- UNION injection: `'; UNION SELECT` patterns

Return `true` if suspicious patterns found (reject the input)

#### `validateAndSanitizeInput(input: string, type: 'email' | 'password'): string`
Master function that:
1. Checks for SQL injection patterns
2. Sanitizes the input
3. Validates based on type
4. Throws error with message if fails
5. Returns sanitized string if passes

**Usage**: Final validation step before API submission

### 2. Auth Form Component Updates (`components/auth/AuthForm.tsx`)

#### State Management
Add new state variables:
```typescript
const [showPassword, setShowPassword] = useState(false);
const [validationState, setValidationState] = useState<ValidationState>({
  email: { isValid: false, message: '' },
  password: { 
    isValid: false, 
    message: '', 
    requirements: { /* 5 booleans */ }
  },
});
const [touched, setTouched] = useState({ email: false, password: false });
```

#### Real-Time Validation Handlers

**`handleEmailChange()`**:
1. Check for SQL injection patterns
2. If detected, show error and clear input
3. Update email state
4. If field touched, validate and update validation state

**`handleEmailBlur()`**:
1. Mark email as touched
2. Run full email validation
3. Update validation state

**`handlePasswordChange()`**:
1. Check for SQL injection patterns
2. If detected, show error and clear input
3. Update password state
4. If touched or in register mode, validate and update validation state

**`handlePasswordBlur()`**:
1. Mark password as touched
2. Run full password validation
3. Update validation state

#### Form Submission Handler
Before submission:
1. Validate both email and password
2. If invalid, show error message and return
3. Check for SQL injection in both fields
4. Sanitize both inputs
5. Send to API

#### UI/UX Enhancements

**Email Input Field**:
- Visual indicators: Green border when valid, red when invalid (after touch)
- Icons: Check mark (✓) when valid, X when invalid
- Error message below field: Red text
- Success message below field: Green text
- Only show validation feedback after user interacts with field

**Password Input Field**:
- Toggle visibility button (Eye icon)
- Visual indicators: Same as email
- Real-time requirement checklist (register mode):
  - "At least 6 characters" with checkmark/X
  - "Contains at least one number"
  - "Contains uppercase letters"
  - "Contains lowercase letters"
  - "Only valid characters allowed"
  - Show live character count: "6/6 entered"
- Color-coded requirements: Green for met, gray for unmet
- Error message below field: Red text
- Success message (login mode): Green text

**Submit Button**:
- Disabled until both fields valid
- Show loading state during submission
- Text changes based on mode: "Sign In" vs "Create Account"

### 3. Visual Design Guidelines

#### Color Coding
- **Valid**: `text-green-600`, `border-green-500`
- **Invalid**: `text-red-500`, `border-red-500`
- **Untouched/Neutral**: `text-muted-foreground`

#### Icon Usage
- ✓ Check (valid): `<Check className="h-4 w-4 text-green-600" />`
- ✗ X (invalid): `<X className="h-4 w-4 text-red-500" />`
- Eye/Eye-off (password toggle): lucide-react icons

#### Layout
- Requirements box: Border, muted background, padding
- Error messages: Below input, small text, red color
- Success messages: Below input, small text, green color

## Security Best Practices Implemented

1. **Defense in Depth**: Multiple validation layers (client + server)
2. **Input Sanitization**: Remove dangerous characters before processing
3. **Whitelisting**: Allow only known-good characters/patterns
4. **Real-time Feedback**: Catch issues before submission
5. **User Education**: Clear error messages help users provide valid input
6. **No Hardcoded Secrets**: Use environment variables for config
7. **HTTPS Only**: Always send credentials over secure connections (backend responsibility)

## Testing Checklist

- [ ] Valid email accepted, invalid rejected with message
- [ ] Valid password accepted, invalid rejected with message
- [ ] SQL injection patterns detected and blocked
- [ ] XSS patterns (script tags, etc.) blocked
- [ ] Email with consecutive dots rejected
- [ ] Email without @ symbol rejected
- [ ] Email with invalid TLD rejected
- [ ] Password less than 6 chars rejected
- [ ] Password without uppercase rejected (register mode)
- [ ] Password without lowercase rejected (register mode)
- [ ] Password without number rejected (register mode)
- [ ] Password with spaces rejected
- [ ] Password with invalid special chars rejected
- [ ] Visual indicators update correctly
- [ ] Requirements checklist accurate (register mode)
- [ ] Form disabled until valid
- [ ] Submit button shows loading state
- [ ] Error/success messages display correctly
- [ ] Password visibility toggle works
- [ ] No validation errors on page load (before touch)
- [ ] Backend receives sanitized input

## Integration Points

### Backend Requirements
1. Validate received email/password again (never trust client)
2. Use parameterized queries for database operations
3. Hash passwords with Argon2 or bcrypt
4. Return helpful error messages without leaking system details

### Middleware Requirements
- Add CSRF token validation (X-Nonce, X-Sign headers)
- Rate limiting on auth endpoints (prevent brute force)
- Log suspicious patterns for security monitoring

## File Structure

```
client/
├── lib/
│   ├── validation.ts          ← Core validation utilities
│   ├── types.ts               ← ValidationState, error types
│   └── ...
├── components/
│   └── auth/
│       └── AuthForm.tsx       ← Enhanced form component
└── app/
    └── auth/
        ├── login/
        │   └── page.tsx
        └── register/
            └── page.tsx
```

## Code Examples

### Example 1: Email Validation in Action
```
User types: "user@example.c"
→ handleEmailChange() → validateEmail()
→ "Invalid top-level domain" message shown
→ Submit button disabled

User types: "user@example.com"
→ handleEmailChange() → validateEmail()
→ Green checkmark shown
→ Submit button enabled (if password also valid)
```

### Example 2: SQL Injection Detection
```
User types: "user'; DROP TABLE users; --"
→ handleEmailChange() → checkForSQLInjection()
→ Pattern match found
→ Error: "Suspicious content detected"
→ Input cleared
```

### Example 3: Password Requirements (Register Mode)
```
User types: "abc"
Requirements shown:
- ✗ At least 6 characters (3/6 entered)
- ✗ Contains at least one number
- ✗ Contains uppercase letters
- ✗ Contains lowercase letters
- ✓ Only valid characters allowed

User adds "Def1"  (now "abcDef1")
Requirements shown:
- ✓ At least 6 characters (7/7 entered)
- ✓ Contains at least one number
- ✓ Contains uppercase letters
- ✓ Contains lowercase letters
- ✓ Only valid characters allowed
→ Submit button enabled
```

## Customization Points

1. **Password Requirements**: Modify regex and requirements checks
2. **Email Rules**: Adjust length, domain validation
3. **Special Characters**: Add/remove allowed special characters
4. **Error Messages**: Customize for your brand/language
5. **UI Colors**: Adjust Tailwind classes for theme
6. **Validation Timing**: Change from onChange to onBlur if preferred

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- RFC 5322 (Email Format): https://tools.ietf.org/html/rfc5322
- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- Password Guidelines: https://pages.nist.gov/800-63-3/sp800-63b.html

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Initial implementation with email, password validation and SQL injection detection |

## Questions?

This prompt is designed to be self-contained and production-ready. Refer to specific validation function implementations for detailed regex patterns and error handling.
