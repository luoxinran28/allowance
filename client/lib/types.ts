export interface User {
  id: number;
  uid: string;
  email: string;
  tier: 'free' | 'standard' | 'premium';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface UserLicense {
  id: number;
  user_id: number;
  product_version_id: number;
  license_key: string;
  starts_at: string;
  expires_at: string;
  daily_usage: number;
  monthly_usage: number;
  last_used_at?: string;
  revoked_at?: string;
}

export interface Product {
  id: number;
  product_id: string;
  name: string;
  description?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}
