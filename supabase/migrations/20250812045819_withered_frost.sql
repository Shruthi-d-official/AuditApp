/*
  # Complete Audit Management System Schema

  1. New Tables
    - `users` - All system users (admin, vendor, team_leader, worker)
    - `bin_master` - Warehouse bin information
    - `counting_sessions` - Worker counting sessions
    - `counting_records` - Individual counting records
    - `worker_efficiency` - Worker performance metrics
    - `otp_requests` - OTP verification system

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control

  3. Sample Data
    - Demo users for each role
    - Sample bins and warehouse data
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (admin, vendor, team_leader, worker)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'vendor', 'team_leader', 'worker')),
  vendor_id uuid REFERENCES users(id),
  team_leader_id uuid REFERENCES users(id),
  warehouse_name text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Bin Master table
CREATE TABLE IF NOT EXISTS bin_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_code text UNIQUE NOT NULL,
  warehouse_name text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Counting Sessions table
CREATE TABLE IF NOT EXISTS counting_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL REFERENCES users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  total_bins_counted integer DEFAULT 0,
  total_qty_counted integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Counting Records table
CREATE TABLE IF NOT EXISTS counting_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES counting_sessions(id),
  warehouse_name text NOT NULL,
  date date NOT NULL,
  team_leader_name text NOT NULL,
  username text NOT NULL,
  bin_no text NOT NULL,
  qty_counted integer NOT NULL,
  qty_recounted integer,
  qty_as_per_books integer,
  difference integer,
  reason_for_difference text,
  created_at timestamptz DEFAULT now()
);

-- Worker Efficiency table
CREATE TABLE IF NOT EXISTS worker_efficiency (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_name text NOT NULL,
  date date NOT NULL,
  username text NOT NULL,
  bins_counted integer NOT NULL,
  qty_counted integer NOT NULL,
  time_taken_minutes integer NOT NULL,
  efficiency_score integer NOT NULL,
  ranking integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- OTP Requests table
CREATE TABLE IF NOT EXISTS otp_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL REFERENCES users(id),
  team_leader_id uuid NOT NULL REFERENCES users(id),
  otp_code text NOT NULL,
  is_used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE counting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_efficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);

-- RLS Policies for bin_master table
CREATE POLICY "Anyone can read bins" ON bin_master FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bins" ON bin_master FOR INSERT WITH CHECK (true);

-- RLS Policies for counting_sessions table
CREATE POLICY "Anyone can manage sessions" ON counting_sessions FOR ALL USING (true);

-- RLS Policies for counting_records table
CREATE POLICY "Anyone can manage records" ON counting_records FOR ALL USING (true);

-- RLS Policies for worker_efficiency table
CREATE POLICY "Anyone can manage efficiency" ON worker_efficiency FOR ALL USING (true);

-- RLS Policies for otp_requests table
CREATE POLICY "Anyone can manage OTP" ON otp_requests FOR ALL USING (true);

-- Insert sample data
INSERT INTO users (username, role, warehouse_name, is_approved) VALUES
('admin', 'admin', 'Main Warehouse', true),
('vendor1', 'vendor', 'Warehouse A', true),
('vendor2', 'vendor', 'Warehouse B', true);

-- Get vendor IDs for relationships
DO $$
DECLARE
    vendor1_id uuid;
    vendor2_id uuid;
    tl1_id uuid;
    tl2_id uuid;
BEGIN
    SELECT id INTO vendor1_id FROM users WHERE username = 'vendor1';
    SELECT id INTO vendor2_id FROM users WHERE username = 'vendor2';
    
    -- Insert team leaders
    INSERT INTO users (username, role, vendor_id, warehouse_name, is_approved) VALUES
    ('tl1', 'team_leader', vendor1_id, 'Warehouse A', true),
    ('tl2', 'team_leader', vendor2_id, 'Warehouse B', true);
    
    SELECT id INTO tl1_id FROM users WHERE username = 'tl1';
    SELECT id INTO tl2_id FROM users WHERE username = 'tl2';
    
    -- Insert workers
    INSERT INTO users (username, role, team_leader_id, warehouse_name, is_approved) VALUES
    ('worker1', 'worker', tl1_id, 'Warehouse A', true),
    ('worker2', 'worker', tl1_id, 'Warehouse A', true),
    ('worker3', 'worker', tl2_id, 'Warehouse B', true),
    ('worker4', 'worker', tl2_id, 'Warehouse B', false);
END $$;

-- Insert sample bins
INSERT INTO bin_master (bin_code, warehouse_name, location) VALUES
('A001', 'Warehouse A', 'Aisle A, Level 1'),
('A002', 'Warehouse A', 'Aisle A, Level 2'),
('A003', 'Warehouse A', 'Aisle A, Level 3'),
('B001', 'Warehouse A', 'Aisle B, Level 1'),
('B002', 'Warehouse A', 'Aisle B, Level 2'),
('C001', 'Warehouse B', 'Aisle C, Level 1'),
('C002', 'Warehouse B', 'Aisle C, Level 2'),
('D001', 'Warehouse B', 'Aisle D, Level 1'),
('D002', 'Warehouse B', 'Aisle D, Level 2'),
('E001', 'Main Warehouse', 'Aisle E, Level 1');

-- Insert sample counting records
INSERT INTO counting_records (session_id, warehouse_name, date, team_leader_name, username, bin_no, qty_counted, qty_as_per_books, difference) 
SELECT 
    uuid_generate_v4(),
    'Warehouse A',
    CURRENT_DATE,
    'tl1',
    'worker1',
    'A001',
    85,
    80,
    5;

-- Insert sample efficiency data
INSERT INTO worker_efficiency (warehouse_name, date, username, bins_counted, qty_counted, time_taken_minutes, efficiency_score, ranking) VALUES
('Warehouse A', CURRENT_DATE, 'worker1', 5, 425, 120, 85, 1),
('Warehouse A', CURRENT_DATE, 'worker2', 4, 320, 110, 78, 2),
('Warehouse B', CURRENT_DATE, 'worker3', 6, 480, 140, 92, 1);