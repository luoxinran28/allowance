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
  mode?: 'login' | 'register' | 'change-password';
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

export function AuthForm({ mode: initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register' | 'change-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [productSlug, setProductSlug] = useState('');
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

  // Read product slug from meta tag on component mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const slugMeta = document.querySelector('meta[name="allowance-product-slug"]') as HTMLMetaElement;
      if (slugMeta?.content) {
        setProductSlug(slugMeta.content);
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

      if (mode === 'change-password') {
        // Validate new password
        const newPwValidation = validatePassword(newPassword);
        if (!newPwValidation.isValid) {
          setError(newPwValidation.message);
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match.');
          setLoading(false);
          return;
        }
        if (password === newPassword) {
          setError('New password must be different from current password.');
          setLoading(false);
          return;
        }
        const sanitizedNewPassword = sanitizeInput(newPassword);
        await apiClient.changePassword(sanitizedEmail, sanitizedPassword, sanitizedNewPassword);
        setSuccess('Password changed successfully! You can now sign in with your new password.');
        setNewPassword('');
        setConfirmPassword('');
        setPassword('');
        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 3000);
      } else if (mode === 'register') {
        // Use product slug from meta tag or default to 'allowance'
        const slug = productSlug || process.env.NEXT_PUBLIC_PRODUCT_SLUG || 'allowance';
        await apiClient.register(sanitizedEmail, sanitizedPassword, slug);
        setSuccess('Registration successful! You can now sign in.');
        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 2000);
      } else {
        // Login without product_slug - it's only required when accessing a specific product
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
      const serverError = err.response?.data?.error as string | undefined;
      if (
        err.response?.status === 403 &&
        serverError?.toLowerCase().includes('deactivated')
      ) {
        setError('您的账户已因长期未登录而被停用，请联系系统管理员重新激活。');
      } else {
        setError(serverError || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : mode === 'register'
              ? 'Register for a new account to get started'
              : 'Verify your current password and set a new one'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Mode Toggle Tabs */}
          <div className="flex mb-6 bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode('change-password'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'change-password'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Change PW
            </button>
          </div>

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

          {productSlug && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Product:</span> {productSlug}
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
              <Label htmlFor="password">{mode === 'change-password' ? 'Current Password' : 'Password'}</Label>
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

            {/* New Password + Confirm for change-password mode */}
            {mode === 'change-password' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  {newPassword && (() => {
                    const v = validatePassword(newPassword);
                    return (
                      <div className="mt-2 p-3 rounded-lg border border-border bg-muted">
                        <p className="text-xs font-semibold mb-2">New password requirements:</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {v.requirements.minLength ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                            <span className={`text-xs ${v.requirements.minLength ? 'text-green-600' : 'text-gray-600'}`}>At least 6 characters ({newPassword.length} entered)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.requirements.hasNumber ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                            <span className={`text-xs ${v.requirements.hasNumber ? 'text-green-600' : 'text-gray-600'}`}>Contains at least one number (0-9)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.requirements.hasUpperCase ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                            <span className={`text-xs ${v.requirements.hasUpperCase ? 'text-green-600' : 'text-gray-600'}`}>Contains uppercase letters (A-Z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.requirements.hasLowerCase ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                            <span className={`text-xs ${v.requirements.hasLowerCase ? 'text-green-600' : 'text-gray-600'}`}>Contains lowercase letters (a-z)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.requirements.allowedCharacters ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                            <span className={`text-xs ${v.requirements.allowedCharacters ? 'text-green-600' : 'text-gray-600'}`}>Only valid characters allowed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className={`${
                      confirmPassword
                        ? confirmPassword === newPassword
                          ? 'border-green-500'
                          : 'border-red-500'
                        : ''
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-xs text-green-600 mt-1">Passwords match</p>
                  )}
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={
                loading ||
                !validationState.email.isValid ||
                (mode !== 'change-password' && !validationState.password.isValid) ||
                (mode === 'change-password' && (!password || !newPassword || !confirmPassword || newPassword !== confirmPassword || !validatePassword(newPassword).isValid))
              }
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading
                ? 'Loading...'
                : mode === 'register'
                ? 'Create Account'
                : mode === 'change-password'
                ? 'Change Password'
                : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {mode === 'login' && (
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/auth/reset-password" className="text-primary hover:underline font-medium">
                  Forgot your password?
                </Link>
              </p>
            )}
            {mode === 'register' && (
              <p className="text-center text-sm text-muted-foreground">
                By creating an account, you agree to our terms of service.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
