/**
 * Input Validation & Security Utilities
 * Implements OWASP Top 10 security practices:
 * - XSS Prevention: Input sanitization
 * - Injection Prevention: Strict input validation
 * - Format Validation: Email and password requirements
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Escapes special characters that could be used for script injection
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove null characters and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escape HTML special characters to prevent XSS
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  sanitized = sanitized.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
  
  return sanitized;
}

/**
 * Validates email format according to RFC 5322 simplified rules
 * Returns object with validation status and error message
 */
export function validateEmail(email: string): {
  isValid: boolean;
  message: string;
} {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      message: 'Email is required',
    };
  }

  const trimmedEmail = email.trim();

  // Check length constraints
  if (trimmedEmail.length < 3) {
    return {
      isValid: false,
      message: 'Email is too short',
    };
  }

  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      message: 'Email is too long',
    };
  }

  // RFC 5322 simplified regex for email validation
  // Prevents common injection patterns
  const emailRegex = /^[^\s@][^\s@]*@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address (e.g., user@example.com)',
    };
  }

  // Additional check: no consecutive dots, no leading/trailing dots in local part
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    return {
      isValid: false,
      message: 'Invalid email format',
    };
  }

  // Check for consecutive dots (common injection pattern)
  if (localPart.includes('..') || domain.includes('..')) {
    return {
      isValid: false,
      message: 'Email contains invalid consecutive dots',
    };
  }

  // Check for leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      message: 'Email local part cannot start or end with a dot',
    };
  }

  // Check domain has at least one dot and valid characters
  if (domain.length < 4 || !domain.includes('.')) {
    return {
      isValid: false,
      message: 'Please enter a valid domain (e.g., example.com)',
    };
  }

  // Ensure domain ends with valid TLD (at least 2 characters after last dot)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return {
      isValid: false,
      message: 'Invalid top-level domain',
    };
  }

  return {
    isValid: true,
    message: '',
  };
}

/**
 * Validates password format
 * Requirements:
 * - Minimum 6 characters
 * - Can contain: numbers, uppercase letters, lowercase letters, limited special chars
 * - Special chars allowed: !@#$%^&*()_+-=[]{}|;:,.<>?
 * - No spaces
 * - No control characters or null bytes
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
  requirements: {
    minLength: boolean;
    hasNumber: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    allowedCharacters: boolean;
  };
} {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required',
      requirements: {
        minLength: false,
        hasNumber: false,
        hasUpperCase: false,
        hasLowerCase: false,
        allowedCharacters: false,
      },
    };
  }

  const requirements = {
    minLength: password.length >= 6,
    hasNumber: /\d/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    allowedCharacters: true, // Will be checked below
  };

  // Check for null characters and control characters (injection prevention)
  if (/[\x00-\x1F\x7F]/.test(password)) {
    return {
      isValid: false,
      message: 'Password contains invalid characters',
      requirements,
    };
  }

  // Check for spaces (common injection attempt)
  if (/\s/.test(password)) {
    return {
      isValid: false,
      message: 'Password cannot contain spaces',
      requirements,
    };
  }

  // Allowed special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
  const validPasswordRegex = /^[a-zA-Z0-9!@#$%^&*()_\+\-=\[\]{}|;:,.<>?]{6,}$/;

  if (!validPasswordRegex.test(password)) {
    requirements.allowedCharacters = false;
    
    // Provide specific error message based on violation
    if (password.length < 6) {
      return {
        isValid: false,
        message: `Password must be at least 6 characters (currently ${password.length})`,
        requirements,
      };
    }

    // Check what's wrong
    const hasInvalidChars = !/^[a-zA-Z0-9!@#$%^&*()_\+\-=\[\]{}|;:,.<>?]*$/.test(password);
    if (hasInvalidChars) {
      return {
        isValid: false,
        message: 'Password contains invalid characters. Allowed: letters, numbers, and !@#$%^&*()_+-=[]{}|;:,.<>?',
        requirements,
      };
    }
  }

  return {
    isValid: requirements.minLength,
    message: '',
    requirements,
  };
}

/**
 * Checks if input contains potential SQL injection patterns
 * Additional layer of protection against injection attacks
 */
export function checkForSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false;

  // Common SQL injection patterns to detect
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(-{2}|\/\*|\*\/|xp_|sp_)/gi, // SQL comments and stored procedures
    /(['\"](\s|;)*--)/gi, // SQL comment injection
    /(;|'|")\s*(UNION|SELECT|INSERT|UPDATE|DELETE)/gi, // UNION-based injection
  ];

  return sqlInjectionPatterns.some((pattern) => pattern.test(input));
}

/**
 * CSRF token generation (for future use with nonce middleware)
 * Generates a cryptographically secure random token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') return '';
  
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates and sanitizes input with all security checks
 * Returns sanitized input if valid, throws error if suspicious
 */
export function validateAndSanitizeInput(
  input: string,
  type: 'email' | 'password'
): string {
  // Check for injection attempts
  if (checkForSQLInjection(input)) {
    throw new Error(`Suspicious content detected in ${type} field`);
  }

  // Sanitize the input
  const sanitized = sanitizeInput(input);

  // Type-specific validation
  if (type === 'email') {
    const validation = validateEmail(sanitized);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
  } else if (type === 'password') {
    const validation = validatePassword(sanitized);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
  }

  return sanitized;
}
