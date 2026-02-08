export type Role = 'viewer' | 'proposer' | 'evaluator' | 'manager' | 'superadmin';

export interface User {
  id: number;
  username: string;
  display_name: string;
  is_superadmin: boolean;
  // Email removed as requested
}

export interface CompanyProfile {
  company_id: number;
  company_name: string;
  role: Role;
  department_id: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  session_id: string;
  username: string;
  available_contexts: CompanyProfile[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  goal?: string; // Hidden for Viewers
  target_audience?: string;
  organizer?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence_rule?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  company_id: number;
  department_id?: number;
  proposer_id: number;
  is_locked?: boolean; // New field for Locking Logic
}

export interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number;
}