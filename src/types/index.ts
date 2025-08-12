export interface User {
  id: string;
  username: string;
  role: 'admin' | 'vendor' | 'team_leader' | 'worker';
  vendor_id?: string;
  team_leader_id?: string;
  is_approved: boolean;
  created_at: string;
  warehouse_name?: string;
}

export interface Vendor {
  id: string;
  name: string;
  warehouse_name: string;
  created_at: string;
}

export interface TeamLeader {
  id: string;
  name: string;
  vendor_id: string;
  is_approved: boolean;
  created_at: string;
}

export interface Worker {
  id: string;
  username: string;
  team_leader_id: string;
  is_approved: boolean;
  created_at: string;
}

export interface BinMaster {
  id: string;
  bin_code: string;
  warehouse_name: string;
  location: string;
  created_at: string;
}

export interface CountingSession {
  id: string;
  worker_id: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed';
  total_bins_counted: number;
  total_qty_counted: number;
}

export interface CountingRecord {
  id: string;
  session_id: string;
  warehouse_name: string;
  date: string;
  team_leader_name: string;
  username: string;
  bin_no: string;
  qty_counted: number;
  qty_recounted?: number;
  qty_as_per_books?: number;
  difference?: number;
  reason_for_difference?: string;
  created_at: string;
}

export interface WorkerEfficiency {
  id: string;
  warehouse_name: string;
  date: string;
  username: string;
  bins_counted: number;
  qty_counted: number;
  time_taken_minutes: number;
  efficiency_score: number;
  ranking: number;
  created_at: string;
}

export interface OTPRequest {
  id: string;
  worker_id: string;
  team_leader_id: string;
  otp_code: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}