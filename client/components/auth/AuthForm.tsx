'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import {
  validateEmail,
  validatePassword,
  checkForSQLInjection,
  sanitizeInput,
} from '@/lib/validation';

interface AuthFormProps {
  mode: 'login' | 'register';
}

interface ValidationState {
  email: { isValid: boolean; message: string };
  password: {
    isValid: boolean;
    message: string;
    requirements: {
      minLength: boolean;
      hasNumber: boolean;
      hasUpperCase: boolean;
      hasLowerCase: boolean;
      allowedCharacters: boolean;
    };
  };
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upid, setUpid] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    email: { isValid: false, message: '' },
    password: {
      isValid: false,
      message: '',
      requirements: {
        minLength: false,
        hasNumber: false,
        hasUpperCase: false,
        hasLowerCase: false,
        allowedCharacters: false,
      },
    },
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Read UPID from meta tag on component mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const upidMeta = document.querySelector('meta[name="allowance-upid"]') as HTMLMetaElement;
      if (upidMeta?.content) {
        setUpid(upidMeta.content);
      }
    }
  }, []);

  // Validate email in real-time
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Security check: detect potential SQL injection
    if (checkForSQLInjection(value)) {
      setError('Suspicious content detected. Please use a valid email address.');
      setEmail('');
      return;
    }

    setEmail(value);

    if (touched.email) {
      const validation = validateEmail(value);
      setValidationState((prev) => ({
        ...prev,
        email: validation,
      }));
    }
  };

  // Validate password in real-time
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Security check: detect potential SQL injection
    if (checkForSQLInjection(value)) {
      setError('Suspicious content detected. Please use a valid password.');
      setPassword('');
      return;
    }

    setPassword(value);

    if (touched.password || mode === 'register') {
      const validation = validatePassword(value);
      setValidationState((prev) => ({
        ...prev,
        password: validation,
      }));
    }
  };

  // Handle field blur to validate
  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const validation = validateEmail(email);
    setValidationState((prev) => ({
      ...prev,
      email: validation,
    }));
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const validation = validatePassword(password);
    setValidationState((prev) => ({
      ...prev,
      password: validation,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Final validation before submission
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    // Additional SQL injection check before sending to server
    if (checkForSQLInjection(email) || checkForSQLInjection(password)) {
      setError('Invalid input detected. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // Sanitize inputs before sending to API
      const sanitizedEmail = sanitizeInput(email).trim();
      const sanitizedPassword = sanitizeInput(password);

      if (mode === 'register') {
        // Use UPID from meta tag or default
        const sourceUpid = upid || process.env.NEXT_PUBLIC_PRODUCT_UPID || 'UALLOWANCE0001';
        await apiClient.register(sanitizedEmail, sanitizedPassword, sourceUpid);
        setSuccess('Registration successful! Check your email to activate your account.');
        setTimeout(() => {
          router.push(`/auth/activate?email=${encodeURIComponent(sanitizedEmail)}`);
        }, 2000);
      } else {
        // Login without UPID - UPID is only required when accessing a specific product
        // not for initial authentication
        const response = await apiClient.login(sanitizedEmail, sanitizedPassword);
        const { user, token } = response.data;
        
        // Set auth state in Zustand FIRST (which also sets localStorage)
        setAuth(user, token);
        
        // Delay to ensure Zustand state is updated before navigation
        // This is critical for client-side route protection to work correctly
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to dashboard, which will redirect to /user/profile
        // The auth state should now be ready for the Layout checks
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : 'Register for a new account to get started'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {upid && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Product:</span> {upid}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={loading}
                  className={`${
                    touched.email
                      ? validationState.email.isValid
                        ? 'border-green-500'
                        : 'border-red-500'
                      : ''
                  }`}
                />
                {touched.email && (
                  <div className="absolute right-3 top-3">
                    {validationState.email.isValid ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touched.email && validationState.email.message && (
                <p className="text-xs text-red-500 mt-1">{validationState.email.message}</p>
              )}
              {touched.email && validationState.email.isValid && (
                <p className="text-xs text-green-600 mt-1">Email format is valid</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  required
                  minLength={6}
                  disabled={loading}
                  className={`${
                    touched.password
                      ? validationState.password.isValid
                        ? 'border-green-500'
                        : 'border-red-500'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password validation message */}
              {touched.password && validationState.password.message && (
                <p className="text-xs text-red-500 mt-1">{validationState.password.message}</p>
              )}

              {/* Password requirements for register mode */}
              {mode === 'register' && (password || touched.password) && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted">
                  <p className="text-xs font-semibold mb-2">Password requirements:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {validationState.password.requirements.minLength ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs ${
                          validationState.password.requirements.minLength
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        At least 6 characters ({password.length} entered)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validationState.password.requirements.hasNumber ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs ${
                          validationState.password.requirements.hasNumber
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        Contains at least one number (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validationState.password.requirements.hasUpperCase ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs ${
                          validationState.password.requirements.hasUpperCase
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        Contains uppercase letters (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validationState.password.requirements.hasLowerCase ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs ${
                          validationState.password.requirements.hasLowerCase
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        Contains lowercase letters (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {validationState.password.requirements.allowedCharacters ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs ${
                          validationState.password.requirements.allowedCharacters
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        Only valid characters allowed
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Password valid indicator for login mode */}
              {mode === 'login' && touched.password && validationState.password.isValid && (
                <p className="text-xs text-green-600 mt-1">Password format is valid</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !validationState.email.isValid || !validationState.password.isValid}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Loading...' : (mode === 'register' ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {mode === 'login' && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/auth/reset-password" className="text-primary hover:underline font-medium">
                    Forgot your password?
                  </Link>
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">or</span>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">
                    Create one
                  </Link>
                </p>
              </>
            )}
            {mode === 'register' && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
