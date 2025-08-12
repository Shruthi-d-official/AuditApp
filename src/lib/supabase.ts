import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication
export const signIn = async (username: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    throw new Error('Invalid credentials');
  }

  // In a real app, you'd hash and compare passwords
  if (password !== 'admin123' && password !== 'password123') {
    throw new Error('Invalid credentials');
  }

  return data;
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOTPRequest = async (workerId: string, teamLeaderId: string) => {
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { data, error } = await supabase
    .from('otp_requests')
    .insert({
      worker_id: workerId,
      team_leader_id: teamLeaderId,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const verifyOTP = async (workerId: string, otpCode: string) => {
  const { data, error } = await supabase
    .from('otp_requests')
    .select('*')
    .eq('worker_id', workerId)
    .eq('otp_code', otpCode)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    throw new Error('Invalid or expired OTP');
  }

  // Mark OTP as used
  await supabase
    .from('otp_requests')
    .update({ is_used: true })
    .eq('id', data.id);

  return data;
};