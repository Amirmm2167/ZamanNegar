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

export interface CalendarEvent {
  id: number;
  master_id: number; 
  proposer_id: number;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  
  is_locked?: boolean;
  rejection_reason?: string;
  description?: string;
  goal?: string;
  target_audience?: string;
  organizer?: string;
  recurrence_rule?: string | null;
  
  // UI Hints
  recurrence_ui_mode?: 'count' | 'date' | null;
  recurrence_ui_count?: number | null;
  
  company_id: number;
  department_id?: number;
  
  // Virtual / Read-Time helpers
  is_virtual?: boolean;
  instance_date?: string;
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
  
  // New UI Hints for Creation
  recurrence_ui_mode?: string | null;
  recurrence_ui_count?: number | null;
  
  company_id: number;
  department_id?: number;
}

export interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number;
}