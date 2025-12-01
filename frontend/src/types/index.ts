export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'user';
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: any;
  ip_address?: string;
  created_at: string;
  email?: string;
  full_name?: string;
}
