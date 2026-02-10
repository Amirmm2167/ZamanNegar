// --- VIEW DEFINITIONS ---
export type ViewMode = 'day' | '3day' | 'week' | 'mobile-week' | 'month' | 'year' | 'agenda';

// --- ROLES & USERS ---
export type Role = 'viewer' | 'proposer' | 'evaluator' | 'manager' | 'superadmin';

export interface User {
  id: number;
  username: string;
  display_name: string;
  is_superadmin: boolean;
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
  is_superadmin: boolean;
  available_contexts: CompanyProfile[];
}

// --- EVENTS ---
export interface EventInstance {
  id: number;
  master_id: number;
  proposer_id: number; // Added
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  // God Mode Fields
  is_locked?: boolean;
  rejection_reason?: string;
  description?: string; // Optional for list views
  goal?: string;
  
  company_id: number;
  department_id?: number;
}

export interface EventCreatePayload {
  title: string;
  description?: string;
  goal?: string;
  target_audience?: string;
  organizer?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence_rule?: string | null;
  company_id: number;
  department_id?: number;
}

export interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number;
}