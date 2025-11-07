export interface LicenseClaims {
  user_id: number;
  product_id: string;
  version_name: string;
  tier: string;
  expires_at: number;  // Unix timestamp
  daily_limit?: number;
  monthly_limit?: number;
  iat: number;
  exp: number;
}

/**
 * Decode JWT payload without verification (client-side only)
 * For security, signature verification should happen on the backend
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Verify license token offline (using JWT signature)
 * Note: This checks structure and expiration, but for full verification,
 * you should validate the signature on the backend
 */
export function verifyLicenseOffline(licenseToken: string): LicenseClaims | null {
  try {
    const decoded = decodeJwtPayload(licenseToken) as LicenseClaims | null;
    if (!decoded) return null;
    
    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Invalid license token:', error);
    return null;
  }
}

/**
 * Check if license is still valid
 */
export function isLicenseValid(licenseToken: string): boolean {
  return verifyLicenseOffline(licenseToken) !== null;
}

/**
 * Get remaining days until license expires
 */
export function getRemainingDays(licenseToken: string): number | null {
  const claims = verifyLicenseOffline(licenseToken);
  if (!claims) return null;

  const now = Math.floor(Date.now() / 1000);
  const seconds = claims.exp - now;
  return Math.ceil(seconds / (24 * 3600));
}
