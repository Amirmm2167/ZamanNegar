export interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  department_id?: number;
  company_id?: number;
}

export interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  goal?: string; // New
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence_rule?: string; // New
  status: 'pending' | 'approved' | 'rejected';
  department_id?: number; // New
  proposer_id?: number;
  // Visual helper for grid
  color?: string; 
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
}