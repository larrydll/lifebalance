import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Check if we have valid Supabase configuration
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const hasValidConfig = isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key';

let configErrorReason = '';
if (!isValidUrl(supabaseUrl)) configErrorReason += `URL无效(${supabaseUrl ? '格式误' : '缺失'});`;
if (!supabaseAnonKey) configErrorReason += 'Key缺失;';
else if (supabaseAnonKey === 'your-supabase-anon-key') configErrorReason += 'Key为默认值;';

if (configErrorReason) {
  console.warn('⚠️ Supabase credentials check failed:', configErrorReason);
  console.warn('Current VITE_SUPABASE_URL:', supabaseUrl ? 'Set (Hidden)' : 'Not Set');
  console.warn('Current VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set (Hidden)' : 'Not Set');
}

// Create a mock client for demo mode that returns empty results
const createMockClient = (): any => {
  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => ({ data: { user: null }, error: { message: `Supabase未配置: ${configErrorReason} (请检查Vercel环境变量)` } }),
    signInWithPassword: async () => ({ data: { user: null }, error: { message: `Supabase未配置: ${configErrorReason}` } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
  };

  const mockQuery = () => ({
    select: () => mockQuery(),
    insert: () => mockQuery(),
    update: () => mockQuery(),
    delete: () => mockQuery(),
    upsert: () => mockQuery(),
    eq: () => mockQuery(),
    gte: () => mockQuery(),
    lte: () => mockQuery(),
    order: () => mockQuery(),
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  });

  return {
    auth: mockAuth,
    from: () => mockQuery(),
  };
};

// Export either real or mock client
export const supabase: SupabaseClient | ReturnType<typeof createMockClient> = hasValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

export const isSupabaseConfigured = hasValidConfig;

// Database types for TypeScript
export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

export interface DbAssessment {
  id: string;
  user_id: string;
  dimension_id: string;
  dimension_name: string;
  current_score: number;
  target_score: number;
  assessed_at: string;
}

export interface DbActionPlan {
  id: string;
  user_id: string;
  category: string;
  title: string;
  priority: number;
  gap: number;
  status: string;
  tasks: string[];
  image_url: string | null;
  created_at: string;
}

export interface DbHabit {
  id: string;
  user_id: string;
  plan_id: string | null;
  title: string;
  subtitle: string | null;
  icon: string | null;
  category: string;
  color_class: string | null;
  created_at: string;
}

export interface DbHabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
}

export interface DbSupportRequest {
  id: string;
  user_id: string | null;
  contact: string | null;
  message: string;
  created_at: string;
}
