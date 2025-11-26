import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040';
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '';

class ApiClient {
  private client: AxiosInstance;
  private apiSecret: string;

  constructor() {
    this.apiSecret = API_SECRET;
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use(async (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Auto-add Nonce to POST/PUT/DELETE requests EXCEPT for auth endpoints
        const isAuthEndpoint = config.url?.includes('/auth/');
        if (
          ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '') &&
          !isAuthEndpoint &&
          !config.headers['X-Nonce'] &&
          this.apiSecret
        ) {
          const body = config.data || {};
          try {
            const { timestamp, nonce, sign } = await this.generateNonce(body);
            config.headers['X-Timestamp'] = timestamp;
            config.headers['X-Nonce'] = nonce;
            config.headers['X-Sign'] = sign;
          } catch (err) {
            // Log error but don't fail the request
            console.error('Failed to generate Nonce headers:', err);
          }
        }
      }
      return config;
    });
  }

  // ============= Nonce & Sign Generation =============

  private async hashBody(body: any): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(body));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generateNonce(body: any): Promise<{
    timestamp: string;
    nonce: string;
    sign: string;
  }> {
    if (!this.apiSecret) {
      throw new Error('API_SECRET is not configured. Cannot generate secure nonce.');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
    const bodyHash = await this.hashBody(body);

    const message = `${timestamp}${nonce}${bodyHash}`;
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const secretBuffer = encoder.encode(this.apiSecret);

    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, messageBuffer);
    const sign = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return { timestamp, nonce, sign };
  }

  // ============= Auth Endpoints =============

  async register(email: string, password: string) {
    return this.client.post('/auth/register', { email, password });
  }

  async login(email: string, password: string, upid?: string) {
    const body = upid ? { email, password, upid } : { email, password };
    return this.client.post('/auth/login', body);
  }

  async activate(token: string) {
    return this.client.post('/auth/activate', { token });
  }

  async requestPasswordReset(email: string) {
    return this.client.post('/auth/request-password-reset', { email });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.client.post('/auth/reset-password', { token, new_password: newPassword });
  }

  // ============= User Endpoints =============

  async getUserProfile() {
    return this.client.get('/user/profile');
  }

  async updateProfile(data: any) {
    return this.client.put('/user/profile', data);
  }

  // ============= Product & License Endpoints =============

  /// List all products (including UPID info)
  async listProducts() {
    return this.client.get('/products');
  }

  /// Get product by UPID
  async getProductByUpid(upid: string) {
    return this.client.get(`/products/${upid}`);
  }

  /// Get user's assigned licenses
  async getUserLicenses() {
    return this.client.get('/licenses/mine');
  }

  /// Get user's teams and organizations
  async getUserAssociations() {
    return this.client.get('/user/associations');
  }

  /// Employee requests license access (requires Nonce)
  async requestLicense(licenseId: number) {
    const body = { license_id: licenseId };
    const { timestamp, nonce, sign } = await this.generateNonce(body);
    
    return this.client.post('/licenses/request', body, {
      headers: {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Sign': sign,
      }
    });
  }

  /// Team leader assigns license to employee (requires Nonce)
  async assignLicense(userId: number, licenseId: number) {
    const body = { user_id: userId, license_id: licenseId };
    const { timestamp, nonce, sign } = await this.generateNonce(body);
    
    return this.client.post('/licenses/assign', body, {
      headers: {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Sign': sign,
      }
    });
  }

  /// Team leader revokes employee license (requires Nonce)
  async revokeLicense(userLicenseId: number) {
    const { timestamp, nonce, sign } = await this.generateNonce({});
    
    return this.client.delete(`/licenses/revoke/${userLicenseId}`, {
      headers: {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Sign': sign,
      }
    });
  }

  /// Team leader gets pending license approval requests
  async getPendingApprovals(teamId: number) {
    return this.client.get(`/approvals?team_id=${teamId}`);
  }

  /// Team leader approves or rejects license request (requires Nonce)
  async reviewLicenseRequest(approvalId: number, status: 'approved' | 'rejected', remarks?: string) {
    const body = { status, remarks };
    const { timestamp, nonce, sign } = await this.generateNonce(body);
    
    return this.client.post(`/approvals/${approvalId}/review`, body, {
      headers: {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Sign': sign,
      }
    });
  }

  // ============= Team Endpoints =============

  async createTeam(name: string, description?: string) {
    return this.client.post('/team/create', { name, description });
  }

  async listTeams() {
    return this.client.get('/team/list');
  }

  async getTeam(teamId: number) {
    return this.client.get(`/team/${teamId}`);
  }

  async addTeamMember(teamId: number, userId: number) {
    return this.client.post(`/team/${teamId}/members`, { user_id: userId });
  }

  async listTeamMembers(teamId: number) {
    return this.client.get(`/team/${teamId}/members`);
  }

  async removeTeamMember(teamId: number, userId: number) {
    return this.client.delete(`/team/${teamId}/members/${userId}`);
  }

  async updateTeamMemberRole(teamId: number, userId: number, role: string) {
    return this.client.put(`/team/${teamId}/members/${userId}`, { role });
  }

  // ============= Organization Endpoints =============

  async createOrganization(name: string, description?: string) {
    return this.client.post('/org/create', { name, description });
  }

  async listOrganizations(page?: number, pageSize?: number) {
    return this.client.get('/org', { params: { page, page_size: pageSize } });
  }

  async searchOrganizations(query: string, page?: number, pageSize?: number) {
    return this.client.get('/org/search', { params: { q: query, page, page_size: pageSize } });
  }

  async getUserOrganizations(page?: number, pageSize?: number) {
    return this.client.get('/org/my', { params: { page, page_size: pageSize } });
  }

  async getOrganization(orgId: string) {
    return this.client.get(`/org/${orgId}`);
  }

  async updateOrganization(orgId: string, data: any) {
    return this.client.put(`/org/${orgId}`, data);
  }

  async deleteOrganization(orgId: string) {
    return this.client.delete(`/org/${orgId}`);
  }

  // Admin endpoints
  async listUsers(page?: number, pageSize?: number) {
    return this.client.get('/admin/users', { params: { page, page_size: pageSize } });
  }

  async getUser(userId: number) {
    return this.client.get(`/admin/users/${userId}`);
  }

  async assignRole(userId: number, roleCode: string) {
    return this.client.post(`/admin/users/${userId}/role`, { role_code: roleCode });
  }

  async removeRole(userId: number, roleCode: string) {
    return this.client.delete(`/admin/users/${userId}/role/${roleCode}`);
  }

  async listApprovals(page?: number, pageSize?: number) {
    return this.client.get('/admin/approvals', { params: { page, page_size: pageSize } });
  }

  async getApproval(approvalId: number) {
    return this.client.get(`/admin/approvals/${approvalId}`);
  }

  async approveRequest(approvalId: number) {
    return this.client.post(`/admin/approvals/${approvalId}/approve`);
  }

  async rejectRequest(approvalId: number, reason: string) {
    return this.client.post(`/admin/approvals/${approvalId}/reject`, { reason });
  }

  // Payment endpoints
  async createPaymentIntent(tier: string, billingPeriodMonths: number) {
    return this.client.post('/payment/create-intent', {
      tier,
      billing_period_months: billingPeriodMonths,
    });
  }

  async confirmPayment(intentId: string) {
    return this.client.post('/payment/confirm', { intent_id: intentId });
  }

  async getCurrentSubscription() {
    return this.client.get('/subscription/current');
  }

  async upgradeTier(newTier: string) {
    return this.client.post('/subscription/upgrade', { new_tier: newTier });
  }

  async downgradeTier(newTier: string) {
    return this.client.post('/subscription/downgrade', { new_tier: newTier });
  }

  async cancelSubscription() {
    return this.client.post('/subscription/cancel', {});
  }

  async toggleAutoRenew(autoRenew: boolean) {
    return this.client.post('/subscription/auto-renew', { auto_renew: autoRenew });
  }

  async getPricing() {
    return this.client.get('/pricing');
  }

  // Batch License endpoints
  async generateBatchLicenses(productId: string, version: string, quantity: number, expirationDays: number) {
    return this.client.post('/licenses/batch/generate', {
      product_id: productId,
      version_name: version,
      quantity,
      expiration_days: expirationDays,
    });
  }

  async revokeBatchLicenses(licenseKeys: string[], reason?: string) {
    return this.client.post('/licenses/batch/revoke', {
      license_keys: licenseKeys,
      reason,
    });
  }

  async revokeBatchById(batchId: string, reason?: string) {
    return this.client.post(`/licenses/batch/${batchId}/revoke`, {
      reason,
    });
  }

  async getLicenses(page: number = 1, pageSize: number = 50, filters?: any) {
    return this.client.get('/licenses', {
      params: { page, page_size: pageSize, ...filters },
    });
  }

  async getProducts() {
    return this.client.get('/products');
  }

  // ============= Admin Product & License Endpoints (NEW) =============

  async createProduct(name: string, productSlug: string, description?: string) {
    return this.client.post('/admin/products', {
      name,
      product_slug: productSlug,
      description,
    });
  }

  async generateOrgLicenses(productId: number, organizationId: number, count: number, expiresInDays: number) {
    return this.client.post('/admin/licenses', {
      product_id: productId,
      organization_id: organizationId,
      count,
      expires_in_days: expiresInDays,
    });
  }

  async updateOrgLicense(licenseId: number, totalCount?: number, availableCount?: number) {
    return this.client.put(`/admin/licenses/${licenseId}`, {
      total_count: totalCount,
      available_count: availableCount,
    });
  }

  async getOrgLicenses(page?: number, pageSize?: number) {
    return this.client.get('/admin/org-licenses', {
      params: { page, page_size: pageSize },
    });
  }

  // ============= Batch Org License Endpoints (NEW) =============

  async generateBatchOrgLicenses(productId: string, organizationId: number, version: string, quantity: number, expirationDays: number) {
    return this.client.post('/licenses/batch/generate-org', {
      product_id: productId,
      organization_id: organizationId,
      version_name: version,
      quantity,
      expiration_days: expirationDays,
    });
  }

  // ============= Team Lead License Endpoints (NEW) =============

  async getTeamLicenses(teamId: number) {
    return this.client.get(`/team/${teamId}/licenses`);
  }

  async assignLicenseToTeamMember(teamId: number, orgLicenseId: number, userId: number) {
    return this.client.post(`/team/${teamId}/licenses/assign`, {
      org_license_id: orgLicenseId,
      user_id: userId,
    });
  }

  async revokeLicenseFromTeamMember(teamId: number, assignmentId: number) {
    return this.client.post(`/team/${teamId}/licenses/${assignmentId}/revoke`, {});
  }

  // ============= Team Lead Promotion Endpoints (NEW) =============

  async promoteTeamMemberToLead(teamId: number, userId: number) {
    return this.client.post(`/team/${teamId}/members/${userId}/promote`, {});
  }

  async demoteTeamLead(teamId: number, userId: number) {
    return this.client.post(`/team/${teamId}/members/${userId}/demote`, {});
  }
}

export const apiClient = new ApiClient();
