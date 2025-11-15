-- Career Counseling Web App - Supabase Database Setup
-- This SQL script creates all necessary tables, indexes, and policies
-- Execute this in the Supabase SQL Editor
-- ⚠️ WARNING: This script will create tables. Make sure you want to proceed!

BEGIN;

-- ============================================================================
-- 1. PROFILES TABLE - 사용자 기본 정보 저장
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  school text,
  grade integer,
  role text DEFAULT 'student',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE profiles IS '사용자 프로필 정보';
COMMENT ON COLUMN profiles.id IS 'Supabase Auth 사용자 ID (PK)';
COMMENT ON COLUMN profiles.name IS '사용자 이름';
COMMENT ON COLUMN profiles.school IS '학교명';
COMMENT ON COLUMN profiles.grade IS '학년';
COMMENT ON COLUMN profiles.role IS '역할 (student/teacher)';

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- RLS Policy: New users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- 2. CAREER_SESSIONS TABLE - 진로 상담 세션
-- ============================================================================
CREATE TABLE IF NOT EXISTS career_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text DEFAULT '새로운 상담',
  description text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE career_sessions IS '진로 상담 세션 저장';
COMMENT ON COLUMN career_sessions.user_id IS '세션을 생성한 사용자 ID';
COMMENT ON COLUMN career_sessions.title IS '세션 제목';
COMMENT ON COLUMN career_sessions.status IS '세션 상태';

ALTER TABLE career_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own sessions
DROP POLICY IF EXISTS "career_sessions_select_own" ON career_sessions;
CREATE POLICY "career_sessions_select_own"
ON career_sessions FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can create sessions
DROP POLICY IF EXISTS "career_sessions_insert_own" ON career_sessions;
CREATE POLICY "career_sessions_insert_own"
ON career_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own sessions
DROP POLICY IF EXISTS "career_sessions_update_own" ON career_sessions;
CREATE POLICY "career_sessions_update_own"
ON career_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_career_sessions_user_id ON career_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_sessions_status ON career_sessions(status);

-- ============================================================================
-- 3. SEARCH_LOGS TABLE - 검색 기록 추적
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES career_sessions(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  results_count integer DEFAULT 0,
  search_type text DEFAULT 'keyword',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE search_logs IS '직업 검색 기록';
COMMENT ON COLUMN search_logs.session_id IS '검색을 수행한 세션 ID';
COMMENT ON COLUMN search_logs.keyword IS '검색 키워드';
COMMENT ON COLUMN search_logs.results_count IS '검색 결과 수';
COMMENT ON COLUMN search_logs.search_type IS '검색 유형';

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own search logs
DROP POLICY IF EXISTS "search_logs_select_own" ON search_logs;
CREATE POLICY "search_logs_select_own"
ON search_logs FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- RLS Policy: Users can create search logs
DROP POLICY IF EXISTS "search_logs_insert_own" ON search_logs;
CREATE POLICY "search_logs_insert_own"
ON search_logs FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_search_logs_session_id ON search_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword ON search_logs(keyword);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);

-- ============================================================================
-- 4. JOB_RECOMMENDATIONS TABLE - 추천된 직업 정보
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES career_sessions(id) ON DELETE CASCADE,
  search_log_id uuid REFERENCES search_logs(id) ON DELETE SET NULL,
  job_code text NOT NULL,
  job_name text NOT NULL,
  job_category text,
  job_description text,
  average_salary text,
  employment_rate text,
  main_tasks text,
  required_skills text,
  career_path text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE job_recommendations IS 'CareerNet API에서 검색된 직업 정보';
COMMENT ON COLUMN job_recommendations.session_id IS '추천을 저장한 세션 ID';
COMMENT ON COLUMN job_recommendations.job_code IS 'CareerNet 직업 코드';
COMMENT ON COLUMN job_recommendations.job_name IS '직업명';
COMMENT ON COLUMN job_recommendations.job_category IS '직업 카테고리';
COMMENT ON COLUMN job_recommendations.average_salary IS '평균 연봉';
COMMENT ON COLUMN job_recommendations.employment_rate IS '취업률';

ALTER TABLE job_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view recommendations from their sessions
DROP POLICY IF EXISTS "job_recommendations_select_own" ON job_recommendations;
CREATE POLICY "job_recommendations_select_own"
ON job_recommendations FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- RLS Policy: Users can create recommendations in their sessions
DROP POLICY IF EXISTS "job_recommendations_insert_own" ON job_recommendations;
CREATE POLICY "job_recommendations_insert_own"
ON job_recommendations FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_recommendations_session_id ON job_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_job_code ON job_recommendations(job_code);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_created_at ON job_recommendations(created_at);

-- ============================================================================
-- 5. SESSION_MESSAGES TABLE (Optional) - 세션 내 메시지 저장
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES career_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  message_type text DEFAULT 'text',
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE session_messages IS '세션 내 채팅 메시지';
COMMENT ON COLUMN session_messages.role IS '메시지 발신자 (user/assistant)';
COMMENT ON COLUMN session_messages.message_type IS '메시지 타입';

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages from their sessions
DROP POLICY IF EXISTS "session_messages_select_own" ON session_messages;
CREATE POLICY "session_messages_select_own"
ON session_messages FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- RLS Policy: Users can create messages in their sessions
DROP POLICY IF EXISTS "session_messages_insert_own" ON session_messages;
CREATE POLICY "session_messages_insert_own"
ON session_messages FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM career_sessions WHERE id = session_id
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_session_messages_role ON session_messages(role);

-- ============================================================================
-- 6. AUTO-UPDATE TRIGGERS for updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS profiles_update_timestamp ON profiles;
CREATE TRIGGER profiles_update_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for career_sessions table
DROP TRIGGER IF EXISTS career_sessions_update_timestamp ON career_sessions;
CREATE TRIGGER career_sessions_update_timestamp
  BEFORE UPDATE ON career_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- 7. VERIFICATION QUERIES - Run these separately to verify setup
-- ============================================================================
-- 이 쿼리들은 별도로 실행해서 설정을 확인하세요.
-- Run these separately if you want to verify the setup.

/*
-- 모든 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- RLS 정책 확인
SELECT tablename, policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 인덱스 확인
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
*/
