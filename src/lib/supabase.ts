import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://olzurdulkygiboklqapz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9senVyZHVsa3lnaWJva2xxYXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2OTgyMDUsImV4cCI6MjA3NzI3NDIwNX0.sXAEUHMgSidiUCOChUKFICDrYhnWpfb8WiMy0sT-g5I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Profile {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  bio?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  updated_at?: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  author_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: number;
  created_at: string;
}

export interface PostWithAuthor extends Post {
  author_username?: string;
  user_vote?: number;
}
