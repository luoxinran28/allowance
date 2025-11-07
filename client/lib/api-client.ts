import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  // Admin endpoints
  async listUsers(page?: number, pageSize?: number) {
    return this.client.get('/admin/users', { params: { page, page_size: pageSize } });
  }

  async assignRole(userId: number, roleCode: string) {
    return this.client.post(`/admin/users/${userId}/role`, { role_code: roleCode });
  }

  async listApprovals() {
    return this.client.get('/admin/approvals');
  }

  async approveRequest(requestId: number) {
    return this.client.post(`/admin/approvals/${requestId}/approve`);
  }

  async rejectRequest(requestId: number, reason: string) {
    return this.client.post(`/admin/approvals/${requestId}/reject`, { reason });
  }
}

export const apiClient = new ApiClient();
