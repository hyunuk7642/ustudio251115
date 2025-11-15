/**
 * Supabase 클라이언트 초기화
 * 
 * 이 파일은 Supabase와의 모든 통신을 관리합니다.
 * 클라이언트 사이드에서만 사용되므로 NEXT_PUBLIC_ 환경변수를 사용합니다.
 */

import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API Key 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// URL과 Key가 없으면 에러 발생
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Supabase URL 또는 API Key가 설정되지 않았습니다.\n' +
    '.env.local 파일에 다음을 확인하세요:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase 클라이언트 인스턴스
 * 전체 앱에서 이 인스턴스를 사용하여 데이터베이스에 접근합니다.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 타입 정의
 */

// 사용자 프로필
export interface Profile {
  id: string;
  name: string;
  school?: string;
  grade?: number;
  role: 'student' | 'teacher';
  created_at: string;
  updated_at: string;
}

// 진로 상담 세션
export interface CareerSession {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// 검색 기록
export interface SearchLog {
  id: string;
  session_id: string;
  keyword: string;
  results_count: number;
  search_type: string;
  created_at: string;
}

// 직업 추천
export interface JobRecommendation {
  id: string;
  session_id: string;
  search_log_id?: string;
  job_code: string;
  job_name: string;
  job_category?: string;
  job_description?: string;
  average_salary?: string;
  employment_rate?: string;
  main_tasks?: string;
  required_skills?: string;
  career_path?: string;
  created_at: string;
}

// 세션 메시지
export interface SessionMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * 헬퍼 함수들
 */

/**
 * 현재 인증된 사용자 정보 가져오기
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * 사용자 프로필 가져오기
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * 사용자 프로필 생성 또는 업데이트
 */
export async function upsertProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert([profile], { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to upsert profile:', error);
    throw error;
  }
}

/**
 * 모든 세션 가져오기
 */
export async function getUserSessions(userId: string): Promise<CareerSession[]> {
  try {
    const { data, error } = await supabase
      .from('career_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
}

/**
 * 새 세션 생성
 */
export async function createSession(
  userId: string,
  title: string = '새로운 상담 세션'
): Promise<CareerSession | null> {
  try {
    const { data, error } = await supabase
      .from('career_sessions')
      .insert([{ user_id: userId, title }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

/**
 * 검색 기록 저장
 */
export async function logSearch(
  sessionId: string,
  keyword: string,
  resultsCount: number = 0
): Promise<SearchLog | null> {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .insert([
        {
          session_id: sessionId,
          keyword,
          results_count: resultsCount,
          search_type: 'keyword',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to log search:', error);
    throw error;
  }
}

/**
 * 직업 추천 저장
 */
export async function saveJobRecommendation(
  job: Omit<JobRecommendation, 'id' | 'created_at'>
): Promise<JobRecommendation | null> {
  try {
    const { data, error } = await supabase
      .from('job_recommendations')
      .insert([job])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to save job recommendation:', error);
    throw error;
  }
}

/**
 * 세션의 모든 직업 추천 가져오기
 */
export async function getSessionJobRecommendations(
  sessionId: string
): Promise<JobRecommendation[]> {
  try {
    const { data, error } = await supabase
      .from('job_recommendations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get job recommendations:', error);
    return [];
  }
}

/**
 * 세션의 검색 기록 가져오기
 */
export async function getSessionSearchLogs(sessionId: string): Promise<SearchLog[]> {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get search logs:', error);
    return [];
  }
}

/**
 * 세션 메시지 저장
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  messageType: string = 'text'
): Promise<SessionMessage | null> {
  try {
    const { data, error } = await supabase
      .from('session_messages')
      .insert([
        {
          session_id: sessionId,
          role,
          content,
          message_type: messageType,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to save message:', error);
    throw error;
  }
}

/**
 * 세션의 모든 메시지 가져오기
 */
export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  try {
    const { data, error } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get session messages:', error);
    return [];
  }
}

/**
 * 구독을 통한 실시간 업데이트 (선택사항)
 */
export function subscribeToMessages(
  sessionId: string,
  callback: (message: SessionMessage) => void
) {
  return supabase
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        callback(payload.new as SessionMessage);
      }
    )
    .subscribe();
}

export default supabase;
