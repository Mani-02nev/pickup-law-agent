import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Session types
export interface Session {
  id: string;
  user_id: string;
  category: string;
  answers: any;
  result: any;
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'agent';
  message: string;
  created_at?: string;
}

export const saveSession = async (sessionData: Partial<Session>) => {
  const { data, error } = await supabase
    .from('sessions')
    .upsert(sessionData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const saveMessage = async (messageData: ChatMessage) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData]);
  
  if (error) throw error;
  return data;
};

export const getSessionMessages = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
};
