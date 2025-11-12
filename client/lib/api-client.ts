import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.client.post('/auth/register', { email, password });
  }

  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
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

  // User endpoints
  async getUserProfile() {
    return this.client.get('/user/profile');
  }

  async updateProfile(data: any) {
    return this.client.put('/user/profile', data);
  }

  async getUserLicenses() {
    return this.client.get('/user/licenses');
  }

  // Product endpoints
  async listProducts() {
    return this.client.get('/product/list');
  }

  async generateLicense(productId: string, versionName: string, daysValid: number) {
    return this.client.post('/product/license/generate', {
      product_id: productId,
      version_name: versionName,
      days_valid: daysValid,
    });
  }

  // Team endpoints
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

  // Organization endpoints
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
    return this.client.post('/batch/generate', {
      product_id: productId,
      version_name: version,
      quantity,
      expiration_days: expirationDays,
    });
  }

  async revokeBatchLicenses(licenseKeys: string[], reason?: string) {
    return this.client.post('/batch/revoke', {
      license_keys: licenseKeys,
      reason,
    });
  }

  async revokeBatchById(batchId: string, reason?: string) {
    return this.client.post(`/batch/${batchId}/revoke`, {
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
}

export const apiClient = new ApiClient();
