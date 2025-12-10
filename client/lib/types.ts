export interface User {
  id: number;
  uid: string;
  email: string;
  tier: 'free' | 'standard' | 'premium' | 'allstar';
  status: 'active' | 'inactive' | 'suspended';
  licenseStatus?: 'valid' | 'expired' | 'not_assigned';
  organizationId?: number | null;
  teamIds?: number[];
  source_upid?: string;
  roles?: string[];
  created_at: string;
  updated_at?: string;
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
  upid: string;
  name: string;
  description?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}

export interface Team {
  id: number;
  team_id: string;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  team_id: string;
  role: 'admin' | 'leader' | 'member';
  joined_at: string;
}

export interface Organization {
  id: number;
  org_id: string;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
}

export interface ApprovalRequest {
  id: number;
  user_id: number;
  request_type: string;
  request_data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}
