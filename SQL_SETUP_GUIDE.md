# Supabase SQL 데이터베이스 설정 가이드

## 📋 개요

이 가이드는 **SETUP.sql** 스크립트를 사용하여 Supabase에 진로 상담 웹앱의 모든 필요한 테이블, 인덱스, RLS 정책을 설정하는 방법을 설명합니다.

---

## 🚀 빠른 시작 (3분)

### 1단계: Supabase 프로젝트에 접속

1. [supabase.com](https://supabase.com) 에서 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: 새로운 쿼리 작성

1. **"New Query"** 버튼 클릭
2. **SETUP.sql** 파일의 전체 내용 복사
3. SQL Editor에 붙여넣기

### 3단계: 실행

```
Control/Cmd + Enter
또는
"▶ Run" 버튼 클릭
```

### ✅ 확인

모든 명령이 성공적으로 완료되면 아래 메시지를 볼 수 있습니다:
```
Query executed successfully
```

---

## 📊 생성되는 테이블 설명

### 1️⃣ `profiles` - 사용자 정보
```sql
id          → Supabase 인증 사용자 ID
name        → 사용자 이름
school      → 학교명
grade       → 학년
role        → 역할 (학생/교사)
created_at  → 생성 시간
updated_at  → 수정 시간
```

**용도:** 사용자 기본 정보 저장, 인증 시스템과 연동

---

### 2️⃣ `career_sessions` - 상담 세션
```sql
id          → 세션 고유 ID
user_id     → 세션을 생성한 사용자
title       → 세션 제목
description → 세션 설명
status      → 상태 (활성/보관)
created_at  → 생성 시간
updated_at  → 수정 시간
```

**용도:** 각 사용자의 상담 세션 관리 (한 명이 여러 세션 가능)

---

### 3️⃣ `search_logs` - 검색 기록
```sql
id          → 기록 고유 ID
session_id  → 검색이 실행된 세션
keyword     → 검색 키워드
results_count → 검색된 결과 수
search_type → 검색 유형
created_at  → 검색 시간
```

**용도:** 사용자의 검색 행동 추적 (나중에 통계 분석용)

---

### 4️⃣ `job_recommendations` - 검색된 직업
```sql
id              → 추천 ID
session_id      → 세션 ID
search_log_id   → 어느 검색에서 나온 결과인지
job_code        → CareerNet 직업 코드
job_name        → 직업명
job_category    → 카테고리
job_description → 설명
average_salary  → 평균 연봉
employment_rate → 취업률
main_tasks      → 주요 업무
required_skills → 필요 기술
career_path     → 경력 경로
created_at      → 저장 시간
```

**용도:** CareerNet API에서 받은 직업 정보 저장 및 조회

---

### 5️⃣ `session_messages` - 채팅 메시지
```sql
id          → 메시지 ID
session_id  → 세션 ID
role        → 발신자 (user/assistant)
content     → 메시지 내용
message_type → 메시지 타입
metadata    → 추가 정보 (JSON)
created_at  → 시간
```

**용도:** 세션 내 채팅 기록 저장

---

## 🔐 보안 설정 (RLS - Row Level Security)

**모든 테이블에 RLS가 활성화됩니다.**

### RLS의 작동 원리

```
사용자 요청 → Supabase Auth 확인 → auth.uid() 추출
     ↓
RLS 정책 확인
     ↓
"이 사용자가 이 데이터에 접근할 권한이 있는가?"
     ↓
권한 있음 → 데이터 반환
권한 없음 → 거부
```

### 예시 정책

**profiles 테이블:**
```sql
-- 사용자는 자신의 프로필만 볼 수 있음
create policy "profiles_select_own"
on profiles for select
using (auth.uid() = id);
```

**career_sessions 테이블:**
```sql
-- 사용자는 자신의 세션만 볼 수 있음
create policy "career_sessions_select_own"
on career_sessions for select
using (auth.uid() = user_id);
```

---

## 📈 인덱스 (성능 최적화)

생성되는 주요 인덱스:

```
idx_profiles_role
    → role 컬럼으로 사용자 필터링 시 빠른 조회

idx_career_sessions_user_id
    → 특정 사용자의 세션 조회 시 빠름

idx_search_logs_session_id
    → 특정 세션의 검색 기록 조회 시 빠름

idx_job_recommendations_session_id
    → 특정 세션의 추천 직업 조회 시 빠름

idx_session_messages_session_id_created_at
    → 세션의 메시지를 시간순으로 빠르게 정렬
```

---

## 🔄 자동 업데이트 트리거

`profiles`와 `career_sessions` 테이블의 `updated_at` 컬럼은 자동으로 현재 시간으로 업데이트됩니다.

```sql
create trigger profiles_update_timestamp
  before update on profiles
  for each row
  execute function update_updated_at_column();
```

---

## ✅ 설정 확인 방법

### 방법 1: Supabase UI에서 확인

1. **Table Editor** 탭으로 이동
2. 왼쪽 사이드바에서 테이블 목록 확인:
   - ✅ profiles
   - ✅ career_sessions
   - ✅ search_logs
   - ✅ job_recommendations
   - ✅ session_messages

### 방법 2: SQL로 확인

SETUP.sql 파일의 끝에 있는 검증 쿼리를 실행합니다:

```sql
-- 모든 테이블 확인
select table_name from information_schema.tables 
where table_schema = 'public' 
order by table_name;

-- RLS 정책 확인
select tablename, policyname, cmd, permissive 
from pg_policies 
where schemaname = 'public'
order by tablename;

-- 인덱스 확인
select indexname from pg_indexes 
where schemaname = 'public' 
order by indexname;
```

---

## 🛑 문제 해결

### 문제: "Permission denied"

**원인:** RLS 정책이 너무 엄격하게 설정됨

**해결:**
1. **Authentication** → **Policies** 탭으로 이동
2. 문제가 되는 정책 확인
3. 필요시 정책 비활성화 또는 수정

### 문제: "Relation already exists"

**원인:** 테이블이 이미 존재함

**해결:**
```sql
-- 기존 테이블 삭제 후 다시 실행
drop table if exists profiles cascade;
drop table if exists career_sessions cascade;
drop table if exists search_logs cascade;
drop table if exists job_recommendations cascade;
drop table if exists session_messages cascade;
```

### 문제: "Foreign key constraint failed"

**원인:** 참조 무결성 위반 (삭제된 사용자의 세션이 남아있음)

**해결:**
```sql
-- 모든 테이블 cascade 삭제가 설정됨
-- 사용자 삭제 시 모든 관련 데이터도 자동 삭제됨
```

---

## 🧪 테스트 데이터 삽입 (선택사항)

**주의:** 프로덕션 환경에서는 하지 마세요!

```sql
-- 테스트 사용자 프로필 추가 (수동 ID 사용)
-- Supabase Auth에서 실제 사용자 생성 후 그 ID로 프로필 추가

insert into profiles (id, name, school, grade, role)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test Student',
  'Seoul High School',
  12,
  'student'
);

-- 테스트 세션 생성
insert into career_sessions (user_id, title, description)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test Session',
  'This is a test session'
);

-- 테스트 검색 기록
insert into search_logs (session_id, keyword, results_count, search_type)
values (
  (select id from career_sessions limit 1),
  'Developer',
  5,
  'keyword'
);
```

---

## 📚 다음 단계

1. ✅ SETUP.sql 실행
2. ✅ 테이블 생성 확인
3. → `.env.local` 설정 (Supabase 키 입력)
4. → Next.js 앱 개발 시작
5. → 테스트 데이터로 앱 테스트
6. → 프로덕션 배포

---

## 🔗 참고 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor 사용법](https://supabase.com/docs/guides/database/sql-editor)

---

## ❓ 추가 질문

모든 과정이 정상적으로 완료되었다면, 다음을 확인하세요:

- [ ] 모든 5개 테이블이 생성됨
- [ ] 각 테이블에 RLS가 활성화됨
- [ ] 인덱스가 생성됨
- [ ] 트리거가 작동함
- [ ] `.env.local`에 Supabase 키가 입력됨

**완료하면 Next.js 앱 개발을 시작할 준비가 됩니다!** 🎉
