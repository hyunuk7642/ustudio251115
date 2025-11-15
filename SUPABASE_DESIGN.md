# Supabase 데이터베이스 설계

## 1. 전체 ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
│  ├─ id (uuid)   │ ← Primary Key
│  ├─ email       │
│  └─ password    │
│        │
│        │ 1:1
│        ↓
├─────────────────────┐
│    profiles         │
│  ├─ id (uuid) [FK]  │
│  ├─ name            │
│  ├─ school          │
│  ├─ grade           │
│  ├─ role            │
│  └─ created_at      │
│        │
│        │ 1:N
│        ↓
├──────────────────────────────┐
│   career_sessions            │
│  ├─ id (uuid)                │ ← Primary Key
│  ├─ user_id (uuid) [FK]      │
│  ├─ title                    │
│  ├─ status                   │
│  ├─ started_at               │
│  ├─ ended_at                 │
│  └─ created_at               │
│        │
│        │ 1:N (각 세션마다 여러 메시지)
│        ↓
├──────────────────────────────┐
│   career_messages            │
│  ├─ id (uuid)                │ ← Primary Key
│  ├─ session_id (uuid) [FK]   │
│  ├─ role                     │ ('user' | 'assistant')
│  ├─ content                  │
│  ├─ intent_analysis          │ (JSON - 의도 분석 결과)
│  ├─ created_at               │
│  └─ updated_at               │
│
├──────────────────────────────┐
│   career_recommendations     │
│  ├─ id (uuid)                │ ← Primary Key
│  ├─ session_id (uuid) [FK]   │
│  ├─ job_code                 │ (CareerNet에서)
│  ├─ job_name                 │
│  ├─ job_category             │
│  ├─ description              │
│  ├─ match_score              │ (0-100)
│  ├─ created_at               │
│  └─ metadata                 │ (JSON - 추가 정보)
│
├──────────────────────────────┐
│   session_analytics          │
│  ├─ id (uuid)                │ ← Primary Key
│  ├─ session_id (uuid) [FK]   │
│  ├─ total_messages           │
│  ├─ avg_response_time        │
│  ├─ recommended_jobs_count   │
│  ├─ user_satisfaction        │ (1-5 rating)
│  ├─ created_at               │
│  └─ updated_at               │
```

---

## 2. 테이블 상세 설계

### 2-1. `profiles` 테이블
**목적**: 사용자 기본 정보 관리

```sql
create table profiles (
  -- 기본키
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- 사용자 정보
  name text not null,
  school text,  -- 예: "서울고등학교"
  grade integer,  -- 예: 1, 2, 3
  role text default 'student',  -- 'student', 'teacher', 'admin'
  
  -- 프로필 상태
  bio text,  -- 간단한 자기소개
  interests text[],  -- 관심 분야 배열: ['개발', '디자인']
  
  -- 메타데이터
  avatar_url text,  -- 프로필 사진
  is_active boolean default true,
  
  -- 타임스탬프
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 인덱스
create index idx_profiles_role on profiles(role);
create index idx_profiles_school on profiles(school);

-- 코멘트 (문서화)
comment on table profiles is '사용자 프로필 정보';
comment on column profiles.role is '역할: student(학생), teacher(교사), admin(관리자)';
```

---

### 2-2. `career_sessions` 테이블
**목적**: 진로 상담 세션 기록

```sql
create table career_sessions (
  -- 기본키
  id uuid primary key default gen_random_uuid(),
  
  -- 외래키
  user_id uuid not null references profiles(id) on delete cascade,
  
  -- 세션 정보
  title text not null default '새로운 상담',
  description text,
  status text default 'active',  -- 'active', 'completed', 'paused'
  
  -- 상담 카테고리
  main_topic text,  -- 예: '직업 선택', '진로 고민', '학과 선택'
  
  -- 타임스탬프
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- 제약
  constraint check_status check (status in ('active', 'completed', 'paused'))
);

-- 인덱스 (자주 쿼리되는 컬럼)
create index idx_career_sessions_user_id on career_sessions(user_id);
create index idx_career_sessions_created_at on career_sessions(created_at desc);
create index idx_career_sessions_status on career_sessions(status);
create index idx_career_sessions_user_created on career_sessions(user_id, created_at desc);

-- 자동 업데이트 트리거 (updated_at)
create or replace function update_career_sessions_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_career_sessions_updated_at
before update on career_sessions
for each row
execute function update_career_sessions_timestamp();
```

---

### 2-3. `career_messages` 테이블
**목적**: 상담 대화 메시지 저장

```sql
create table career_messages (
  -- 기본키
  id uuid primary key default gen_random_uuid(),
  
  -- 외래키
  session_id uuid not null references career_sessions(id) on delete cascade,
  
  -- 메시지 내용
  role text not null,  -- 'user', 'assistant'
  content text not null,
  
  -- GPT 의도 분석 결과 (1차 호출 결과)
  intent_analysis jsonb,  -- {
                         --   "keywords": ["개발자", "프로그래머"],
                         --   "job_search": true,
                         --   "emotional": false,
                         --   "clarification_needed": false
                         -- }
  
  -- 응답 관련 정보
  response_time_ms integer,  -- API 응답 시간 (밀리초)
  tokens_used integer,  -- GPT 사용한 토큰 수
  
  -- 메타데이터
  metadata jsonb,  -- 추가 데이터 (향후 확장용)
  
  -- 타임스탬프
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- 제약
  constraint check_role check (role in ('user', 'assistant'))
);

-- 인덱스 (매우 중요 - 세션별 메시지 조회 빈도 높음)
create index idx_career_messages_session_id on career_messages(session_id);
create index idx_career_messages_session_created on career_messages(session_id, created_at);
create index idx_career_messages_created_at on career_messages(created_at desc);
create index idx_career_messages_role on career_messages(role);

-- JSONB 인덱스 (의도 분석 검색용)
create index idx_career_messages_intent_search on career_messages using gin(intent_analysis);

-- 자동 업데이트 트리거
create or replace function update_career_messages_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_career_messages_updated_at
before update on career_messages
for each row
execute function update_career_messages_timestamp();
```

---

### 2-4. `career_recommendations` 테이블
**목적**: 사용자에게 추천된 직업 기록

```sql
create table career_recommendations (
  -- 기본키
  id uuid primary key default gen_random_uuid(),
  
  -- 외래키
  session_id uuid not null references career_sessions(id) on delete cascade,
  
  -- 직업 정보 (CareerNet에서 제공)
  job_code text not null,  -- 예: "2111"
  job_name text not null,  -- 예: "소프트웨어 개발자"
  job_category text,  -- 예: "정보통신 및 컴퓨터"
  
  -- 추천 상세정보
  description text,  -- 직업 설명
  required_skills text[],  -- 필요 기술: ['Python', 'JavaScript']
  average_salary text,  -- 평균 급여
  employment_outlook text,  -- 고용 전망
  
  -- 매칭 스코어
  match_score integer default 0,  -- 0-100 점수
  match_reason text,  -- 왜 추천했는지 이유
  
  -- 추가 메타데이터
  metadata jsonb,  -- {
                  --   "future_outlook": "증가",
                  --   "difficulty": "high",
                  --   "related_majors": ["컴공", "정보통신"],
                  --   "careernet_url": "https://..."
                  -- }
  
  -- 타임스탬프
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- 제약
  constraint check_match_score check (match_score >= 0 and match_score <= 100)
);

-- 인덱스
create index idx_career_recommendations_session_id on career_recommendations(session_id);
create index idx_career_recommendations_job_code on career_recommendations(job_code);
create index idx_career_recommendations_match_score on career_recommendations(match_score desc);
create index idx_career_recommendations_created_at on career_recommendations(created_at desc);

-- 자동 업데이트 트리거
create or replace function update_career_recommendations_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_career_recommendations_updated_at
before update on career_recommendations
for each row
execute function update_career_recommendations_timestamp();
```

---

### 2-5. `session_analytics` 테이블
**목적**: 세션별 분석 데이터 (교육용 통계)

```sql
create table session_analytics (
  -- 기본키
  id uuid primary key default gen_random_uuid(),
  
  -- 외래키
  session_id uuid not null unique references career_sessions(id) on delete cascade,
  
  -- 세션 통계
  total_messages integer default 0,  -- 사용자 + AI 메시지 총 개수
  user_message_count integer default 0,  -- 사용자 메시지 수
  assistant_message_count integer default 0,  -- AI 응답 수
  
  -- 성능 지표
  avg_response_time_ms integer,  -- 평균 응답 시간
  total_duration_seconds integer,  -- 전체 상담 소요 시간
  
  -- 추천 관련
  recommended_jobs_count integer default 0,  -- 추천 직업 수
  top_recommended_job text,  -- 가장 많이 추천된 직업
  
  -- 사용자 평가
  user_satisfaction integer,  -- 1-5 만족도
  feedback_text text,  -- 사용자 피드백
  
  -- 의도 분석 결과
  keywords_found text[],  -- 추출된 모든 키워드
  emotional_support_needed boolean default false,
  
  -- 타임스탬프
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 인덱스
create index idx_session_analytics_session_id on session_analytics(session_id);
create index idx_session_analytics_user_satisfaction on session_analytics(user_satisfaction);
create index idx_session_analytics_created_at on session_analytics(created_at desc);
```

---

## 3. Row Level Security (RLS) 정책

### 3-1. `profiles` RLS

```sql
-- RLS 활성화
alter table profiles enable row level security;

-- 정책 1: 사용자는 자신의 프로필만 조회
create policy "Users can view own profile"
on profiles
for select
using (auth.uid() = id);

-- 정책 2: 사용자는 자신의 프로필만 수정
create policy "Users can update own profile"
on profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 정책 3: 관리자는 모든 프로필 조회
create policy "Admins can view all profiles"
on profiles
for select
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- 정책 4: 신규 유저는 프로필 생성 가능
create policy "Users can create profile on signup"
on profiles
for insert
with check (auth.uid() = id);
```

### 3-2. `career_sessions` RLS

```sql
-- RLS 활성화
alter table career_sessions enable row level security;

-- 정책 1: 사용자는 자신의 세션만 조회
create policy "Users can view own sessions"
on career_sessions
for select
using (auth.uid() = user_id);

-- 정책 2: 사용자는 자신의 세션만 생성
create policy "Users can create own session"
on career_sessions
for insert
with check (auth.uid() = user_id);

-- 정책 3: 사용자는 자신의 세션만 수정
create policy "Users can update own session"
on career_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 정책 4: 사용자는 자신의 세션만 삭제
create policy "Users can delete own session"
on career_sessions
for delete
using (auth.uid() = user_id);

-- 정책 5: 교사는 학생의 모든 세션 조회
create policy "Teachers can view student sessions"
on career_sessions
for select
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'teacher'
  )
);
```

### 3-3. `career_messages` RLS

```sql
-- RLS 활성화
alter table career_messages enable row level security;

-- 정책 1: 사용자는 자신의 세션 메시지만 조회
create policy "Users can view own session messages"
on career_messages
for select
using (
  exists (
    select 1 from career_sessions
    where id = career_messages.session_id
    and user_id = auth.uid()
  )
);

-- 정책 2: 사용자는 자신의 세션에만 메시지 추가
create policy "Users can insert messages in own session"
on career_messages
for insert
with check (
  exists (
    select 1 from career_sessions
    where id = career_messages.session_id
    and user_id = auth.uid()
  )
);
```

### 3-4. `career_recommendations` RLS

```sql
-- RLS 활성화
alter table career_recommendations enable row level security;

-- 정책 1: 사용자는 자신의 세션 추천만 조회
create policy "Users can view own recommendations"
on career_recommendations
for select
using (
  exists (
    select 1 from career_sessions
    where id = career_recommendations.session_id
    and user_id = auth.uid()
  )
);
```

---

## 4. 뷰 (Views) - 자주 사용되는 쿼리

### 4-1. 최근 세션 목록

```sql
create or replace view user_recent_sessions as
select 
  cs.id,
  cs.user_id,
  cs.title,
  cs.status,
  cs.started_at,
  cs.ended_at,
  count(cm.id) as message_count,
  max(cm.created_at) as last_message_at
from career_sessions cs
left join career_messages cm on cs.id = cm.session_id
group by cs.id, cs.user_id
order by cs.created_at desc;
```

### 4-2. 세션 상세 정보

```sql
create or replace view session_details as
select 
  cs.id,
  cs.user_id,
  cs.title,
  cs.status,
  p.name as user_name,
  p.school,
  p.grade,
  count(cm.id) as total_messages,
  count(case when cm.role = 'user' then 1 end) as user_messages,
  count(case when cm.role = 'assistant' then 1 end) as assistant_messages,
  count(distinct cr.id) as recommended_jobs_count,
  cs.created_at,
  cs.updated_at
from career_sessions cs
join profiles p on cs.user_id = p.id
left join career_messages cm on cs.id = cm.session_id
left join career_recommendations cr on cs.id = cr.session_id
group by cs.id, cs.user_id, p.id;
```

### 4-3. 인기 있는 직업 추천 순위

```sql
create or replace view popular_job_recommendations as
select 
  cr.job_code,
  cr.job_name,
  cr.job_category,
  count(*) as recommendation_count,
  round(avg(cr.match_score)) as avg_match_score,
  count(distinct cr.session_id) as unique_users
from career_recommendations cr
group by cr.job_code, cr.job_name, cr.job_category
order by recommendation_count desc
limit 100;
```

---

## 5. 저장 프로시저 (Functions)

### 5-1. 새 세션 생성

```sql
create or replace function create_career_session(
  p_user_id uuid,
  p_title text default '새로운 상담'
)
returns uuid as $$
declare
  v_session_id uuid;
begin
  insert into career_sessions (user_id, title)
  values (p_user_id, p_title)
  returning id into v_session_id;
  
  -- analytics 테이블도 동시에 생성
  insert into session_analytics (session_id)
  values (v_session_id);
  
  return v_session_id;
end;
$$ language plpgsql;
```

### 5-2. 메시지 추가 + 의도 분석 저장

```sql
create or replace function add_career_message(
  p_session_id uuid,
  p_role text,
  p_content text,
  p_intent_analysis jsonb default null,
  p_response_time_ms integer default null
)
returns uuid as $$
declare
  v_message_id uuid;
begin
  insert into career_messages (
    session_id,
    role,
    content,
    intent_analysis,
    response_time_ms
  )
  values (
    p_session_id,
    p_role,
    p_content,
    p_intent_analysis,
    p_response_time_ms
  )
  returning id into v_message_id;
  
  -- analytics 업데이트
  update session_analytics
  set 
    total_messages = total_messages + 1,
    user_message_count = case when p_role = 'user' then user_message_count + 1 else user_message_count end,
    assistant_message_count = case when p_role = 'assistant' then assistant_message_count + 1 else assistant_message_count end,
    updated_at = now()
  where session_id = p_session_id;
  
  return v_message_id;
end;
$$ language plpgsql;
```

### 5-3. 세션 종료

```sql
create or replace function complete_career_session(p_session_id uuid)
returns void as $$
begin
  update career_sessions
  set 
    status = 'completed',
    ended_at = now(),
    updated_at = now()
  where id = p_session_id;
  
  -- analytics 마무리
  update session_analytics
  set 
    total_duration_seconds = extract(epoch from (
      select ended_at - started_at
      from career_sessions
      where id = p_session_id
    ))::integer,
    updated_at = now()
  where session_id = p_session_id;
end;
$$ language plpgsql;
```

---

## 6. 초기 마이그레이션 SQL 스크립트

```sql
-- 모든 테이블 생성 한 번에 실행하는 스크립트
-- Supabase SQL Editor에서 복사-붙여넣기

-- 1. profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  school text,
  grade integer,
  role text default 'student',
  bio text,
  interests text[],
  avatar_url text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_school on profiles(school);

-- 2. career_sessions
create table career_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default '새로운 상담',
  description text,
  status text default 'active',
  main_topic text,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint check_status check (status in ('active', 'completed', 'paused'))
);

create index idx_career_sessions_user_id on career_sessions(user_id);
create index idx_career_sessions_created_at on career_sessions(created_at desc);
create index idx_career_sessions_status on career_sessions(status);
create index idx_career_sessions_user_created on career_sessions(user_id, created_at desc);

-- 3. career_messages
create table career_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  intent_analysis jsonb,
  response_time_ms integer,
  tokens_used integer,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint check_role check (role in ('user', 'assistant'))
);

create index idx_career_messages_session_id on career_messages(session_id);
create index idx_career_messages_session_created on career_messages(session_id, created_at);
create index idx_career_messages_created_at on career_messages(created_at desc);
create index idx_career_messages_role on career_messages(role);
create index idx_career_messages_intent_search on career_messages using gin(intent_analysis);

-- 4. career_recommendations
create table career_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id) on delete cascade,
  job_code text not null,
  job_name text not null,
  job_category text,
  description text,
  required_skills text[],
  average_salary text,
  employment_outlook text,
  match_score integer default 0,
  match_reason text,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint check_match_score check (match_score >= 0 and match_score <= 100)
);

create index idx_career_recommendations_session_id on career_recommendations(session_id);
create index idx_career_recommendations_job_code on career_recommendations(job_code);
create index idx_career_recommendations_match_score on career_recommendations(match_score desc);
create index idx_career_recommendations_created_at on career_recommendations(created_at desc);

-- 5. session_analytics
create table session_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references career_sessions(id) on delete cascade,
  total_messages integer default 0,
  user_message_count integer default 0,
  assistant_message_count integer default 0,
  avg_response_time_ms integer,
  total_duration_seconds integer,
  recommended_jobs_count integer default 0,
  top_recommended_job text,
  user_satisfaction integer,
  feedback_text text,
  keywords_found text[],
  emotional_support_needed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_session_analytics_session_id on session_analytics(session_id);
create index idx_session_analytics_user_satisfaction on session_analytics(user_satisfaction);
create index idx_session_analytics_created_at on session_analytics(created_at desc);

-- RLS 활성화 및 정책 설정은 다음 단계에서 진행
```

---

## 7. 마이그레이션 체크리스트

### 설계 단계
- [x] ERD 설계 완료
- [x] 테이블 구조 정의
- [x] 인덱스 전략 수립
- [x] RLS 정책 수립

### 구현 단계 (실제 Supabase 생성 시)
- [ ] Supabase 프로젝트 생성
- [ ] SQL 스크립트 실행 (섹션 6)
- [ ] 트리거 함수 생성
- [ ] 뷰(Views) 생성
- [ ] RLS 정책 활성화
- [ ] 샘플 데이터 입력

### 검증 단계
- [ ] 각 테이블에 쿼리 가능 확인
- [ ] 인덱스 성능 테스트
- [ ] RLS 정책 동작 확인
- [ ] 뷰 쿼리 검증

---

## 8. 테스트 쿼리

### 8-1. 신규 사용자 생성 시뮬레이션

```sql
-- 테스트용 프로필 생성 (실제로는 Auth에서 생성됨)
insert into profiles (id, name, school, grade, role)
values (
  'test-user-id-uuid',
  '김철수',
  '서울고등학교',
  2,
  'student'
);

-- 새 세션 생성
select create_career_session('test-user-id-uuid', '프로그래머 진로 상담');

-- 메시지 추가
select add_career_message(
  'session-id-uuid',
  'user',
  '개발자가 되고 싶어요',
  '{"keywords": ["개발자"], "job_search": true, "emotional": false, "clarification_needed": false}'::jsonb
);
```

### 8-2. 세션 조회

```sql
-- 사용자의 모든 세션 조회
select * from user_recent_sessions
where user_id = 'test-user-id-uuid';

-- 특정 세션의 모든 메시지 조회
select * from career_messages
where session_id = 'session-id-uuid'
order by created_at;

-- 세션의 상세 정보
select * from session_details
where id = 'session-id-uuid';
```

### 8-3. 분석 쿼리

```sql
-- 가장 추천 많이 된 직업
select * from popular_job_recommendations
limit 10;

-- 사용자별 상담 통계
select 
  p.name,
  p.school,
  count(distinct cs.id) as total_sessions,
  sum(sa.total_messages) as total_messages,
  avg(sa.user_satisfaction) as avg_satisfaction
from profiles p
left join career_sessions cs on p.id = cs.user_id
left join session_analytics sa on cs.id = sa.session_id
group by p.id, p.name, p.school
order by total_sessions desc;
```

---

## 9. 백업 및 복구 전략

```sql
-- 백업 전략 (주기적 실행)
-- 1. 모든 세션 데이터 내보내기
select * from career_sessions
where created_at >= now() - interval '7 days';

-- 2. 추천 데이터 내보내기
select * from career_recommendations
where created_at >= now() - interval '7 days';

-- 복구 시 (삭제된 데이터 복구)
-- Supabase 대시보드의 "Backup" 탭에서 자동 백업 관리
```

---

## 10. 향후 확장 가능성

```markdown
### 추가 테이블 (나중에)
1. **curriculum_tags** - 학생이 선택한 과목/커리큘럼
2. **career_preferences** - 선호 직업군
3. **student_surveys** - 진로 적성 검사 결과
4. **teacher_feedback** - 교사의 학생 피드백
5. **notifications** - 푸시 알림 로그

### RLS 정책 확장
- 학부모/보호자 역할 추가
- 더 세분화된 역할 권한 (head_teacher, counselor 등)

### 성능 최적화
- 파티셔닝 (created_at 기준)
- 읽기 레플리카 추가
- 캐싱 전략 (Redis)

### 보안 강화
- 암호화된 민감 정보
- 감사 로그 (Audit Log)
- IP 화이트리스트 (교실 환경용)
```

---

## 요약

이 설계는 다음을 고려합니다:

✅ **성능**: 적절한 인덱싱과 파티셔닝  
✅ **보안**: RLS 정책으로 사용자 데이터 보호  
✅ **확장성**: 향후 기능 추가를 위한 유연성  
✅ **유지보수**: 명확한 스키마와 문서화  
✅ **분석**: 뷰와 함수로 통계 추출 용이  

**다음 단계**: Supabase 프로젝트 생성 후 SQL 스크립트 실행
