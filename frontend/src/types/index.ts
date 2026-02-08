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
  available_contexts: CompanyProfile[];
}

// --- NEW: Read Model (The Instance) ---
export interface EventInstance {
  id: number;           // This is the Instance ID
  master_id: number;    // Reference to the Rule
  title: string;
  start_time: string;   // ISO String
  end_time: string;     // ISO String
  is_all_day: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  company_id: number;
  department_id?: number;
}

// --- NEW: Write Model (The Master) ---
export interface EventCreatePayload {
  title: string;
  description?: string;
  goal?: string;
  target_audience?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence_rule?: string | null; // e.g., "FREQ=WEEKLY"
  company_id: number;
  department_id?: number;
}

export interface Department {
  id: number;
  name: string;
  color: string;
  parent_id?: number;
}