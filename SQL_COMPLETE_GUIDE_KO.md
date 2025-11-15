# 🎓 진로 상담 웹앱 - SQL 완전 가이드 (한국어)

**당신이 원한 것:** SQL로 데이터베이스를 설정하고 싶었어요. ✅

**우리가 준비한 것:** SQL 기반의 완전한 개발 환경입니다.

---

## 📋 매뉴얼 목차

1. [전체 흐름 이해](#전체-흐름-이해)
2. [SQL 데이터베이스 설정](#1-sql-데이터베이스-설정)
3. [환경 설정](#2-환경-설정)
4. [앱 시작](#3-앱-시작)
5. [기능 테스트](#4-기능-테스트)

---

## 전체 흐름 이해

### 이 프로젝트의 아키텍처

```
┌─────────────────────┐
│   사용자 브라우저   │
│  http://localhost   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────┐
│        Next.js 앱 (Frontend)        │
│  - 로그인 페이지                     │
│  - 검색 페이지                      │
│  - 결과 표시                        │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌──────────┐  ┌──────────────────┐
│ API 엔드 │  │  Supabase Auth   │
│포인트    │  │  (로그인 관리)   │
│/search   │  └──────────────────┘
└──────┬───┘
       │
       ↓
┌─────────────────────────────────────┐
│     CareerNet API (직업 검색)       │
│  keyword: "개발자"                 │
│  → 검색 결과 반환                   │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│   Supabase PostgreSQL (Database)    │
│                                     │
│  Tables:                            │
│  ├── profiles (사용자)              │
│  ├── career_sessions (세션)        │
│  ├── search_logs (검색 기록)       │
│  ├── job_recommendations (직업)    │
│  └── session_messages (메시지)     │
│                                     │
│  RLS: ✅ (보안 정책)                │
│  Indexes: ✅ (성능 최적화)         │
│  Triggers: ✅ (자동 업데이트)      │
└─────────────────────────────────────┘
```

### 데이터 흐름 예시

```
1단계: 사용자가 검색
  사용자 입력 → "개발자" 검색

2단계: API 호출
  /api/search?keyword=개발자

3단계: 직업 검색
  CareerNet API → 검색 결과

4단계: 데이터 저장
  Results → Supabase Database
  - search_logs: 검색 기록 저장
  - job_recommendations: 검색 결과 저장

5단계: 결과 표시
  Results → 사용자 화면에 표시
```

---

## 1️⃣ SQL 데이터베이스 설정

### 1-1. 준비 사항 확인

- ✅ [Supabase 계정](https://supabase.com) (무료 가입)
- ✅ 프로젝트 내 `SETUP.sql` 파일 확인
- ✅ 인터넷 브라우저 준비

### 1-2. Supabase 접속

1. https://supabase.com 접속
2. 이메일로 로그인 (또는 GitHub로 로그인)
3. 프로젝트 대시보드에서 프로젝트 선택

### 1-3. SQL Editor 열기

**Supabase 대시보드 메뉴:**

```
왼쪽 사이드바
  ├── Home
  ├── SQL Editor  ← 여기를 클릭!
  ├── Table Editor
  ├── Auth
  └── Settings
```

**SQL Editor 화면:**

```
┌─────────────────────────────────────┐
│ SQL Editor                          │
├─────────────────────────────────────┤
│ [New Query] [Templates] [History]   │
├─────────────────────────────────────┤
│                                     │
│  ↑ 여기에 SQL 코드를 붙여넣습니다   │
│                                     │
│  [▶ Run] [Cmd+Enter 또는 Ctrl+Enter]│
│                                     │
└─────────────────────────────────────┘
```

### 1-4. SETUP.sql 실행

**Step 1: SETUP.sql 파일 위치**

```bash
proj01/SETUP.sql     ← 이 파일
```

**Step 2: 파일 내용 복사**

```bash
# 터미널에서 (Mac/Linux)
cat proj01/SETUP.sql | pbcopy

# 또는 에디터에서 직접 열어서 모두 선택 (Cmd/Ctrl + A) → 복사 (Cmd/Ctrl + C)
```

**Step 3: SQL Editor에 붙여넣기**

1. Supabase SQL Editor 창 클릭
2. Cmd/Ctrl + V 눌러 붙여넣기
3. 전체 SQL 코드가 보이는지 확인

**Step 4: 실행**

```
방법 1: Cmd + Enter (Mac) / Ctrl + Enter (Windows/Linux)
방법 2: [▶ Run] 버튼 클릭
```

**Step 5: 완료 메시지 확인**

```
✅ "Query executed successfully"

또는 

✅ 각 테이블 생성 메시지
   - create table "profiles"
   - create table "career_sessions"
   - etc.
```

### 1-5. 생성된 테이블 확인

**SQL로 확인:**

```sql
-- SQL Editor에서 실행
select table_name 
from information_schema.tables 
where table_schema = 'public' 
order by table_name;

-- 예상 결과:
-- career_sessions
-- job_recommendations
-- profiles
-- search_logs
-- session_messages
```

**UI에서 확인:**

```
Supabase 대시보드
  → Table Editor 탭
  → 왼쪽 사이드바의 테이블 목록

다음 5개가 있는지 확인:
  ✅ profiles
  ✅ career_sessions
  ✅ search_logs
  ✅ job_recommendations
  ✅ session_messages
```

### 1-6. RLS(보안) 정책 확인

```sql
-- SQL Editor에서 실행
select tablename, policyname, cmd, roles 
from pg_policies 
where schemaname = 'public' 
order by tablename, policyname;

-- 각 테이블에 RLS 정책이 있어야 함
```

---

## 2️⃣ 환경 설정

### 2-1. 환경 변수 파일 위치

```
proj01/my-app/.env.local
```

### 2-2. 필요한 환경 변수

```bash
# Supabase 연결 (필수)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# ChatGPT API (선택사항 - 나중에 AI 기능 추가시)
CHATGPT_API_KEY=YOUR_API_KEY
CHATGPT_MODEL=gpt-4-turbo-preview
```

### 2-3. Supabase에서 키 얻기

**Supabase 대시보드:**

```
Settings (왼쪽 메뉴의 하단)
  → API
  
여기서 찾을 수 있는 항목들:
  
1. Project URL
   ├── 이것을: NEXT_PUBLIC_SUPABASE_URL
   └── 예: https://zgcfilwrhxgtvaetecsf.supabase.co

2. API Keys
   ├── anon public
   │  └── 이것을: NEXT_PUBLIC_SUPABASE_ANON_KEY
   └── service_role secret
      └── 이것을: SUPABASE_SERVICE_ROLE_KEY
```

**복사 방법:**

```
1. 각 항목 옆의 복사 아이콘 클릭
2. .env.local 파일에 붙여넣기
```

### 2-4. .env.local 파일 확인

```bash
# 터미널에서 확인 (Mac/Linux)
cat proj01/my-app/.env.local

# 또는 VS Code에서 열기
open proj01/my-app/.env.local
```

**확인 사항:**

```
✅ NEXT_PUBLIC_SUPABASE_URL이 설정되어 있는가?
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있는가?
✅ SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는가?
```

---

## 3️⃣ 앱 시작

### 3-1. 프로젝트 디렉토리로 이동

```bash
cd /Users/hyunuk/Python/VS\ Code/Ustudio/251115/proj01/my-app

# 또는 더 간단하게
cd ~/Python/VS\ Code/Ustudio/251115/proj01/my-app
```

### 3-2. 의존성 설치

```bash
npm install

# 또는
yarn install
```

**예상 출력:**

```
added XXX packages, and audited XXX packages in XXs
found 0 vulnerabilities
```

### 3-3. 개발 서버 실행

```bash
npm run dev
```

**예상 출력:**

```
> next dev

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.1s
```

### 3-4. 브라우저에서 확인

```
http://localhost:3000
```

**성공 표시:**

- 웹 페이지가 로드됨
- "Edit the page.tsx" 같은 기본 메시지 보임
- 콘솔 에러가 없음

### 3-5. 서버 중지

```bash
Ctrl + C
```

---

## 4️⃣ 기능 테스트

### 테스트 4-1: 검색 API 테스트

**새 터미널 탭을 열어서:**

```bash
# 개발 서버가 실행 중인 상태에서

# 1. 키워드 검색 테스트
curl "http://localhost:3000/api/search?keyword=개발자"

# 2. 카테고리 검색 테스트
curl "http://localhost:3000/api/search?category=IT"

# 3. POST 요청으로 테스트
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "디자이너"}'
```

**예상 응답:**

```json
{
  "success": true,
  "data": [
    {
      "code": "JOB001",
      "name": "소프트웨어 개발자",
      "category": "IT",
      "description": "컴퓨터 프로그래밍을 통해 소프트웨어를 개발하는 직업",
      "averageSalary": "3,500~5,000만원",
      "employmentRate": "85%",
      ...
    }
  ],
  "count": 3
}
```

### 테스트 4-2: Supabase 연결 테스트

**프로젝트 루트에서:**

```bash
# test-supabase.ts 파일 생성
cat > my-app/src/lib/test-supabase.ts << 'EOF'
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    // 간단한 쿼리 실행
    const { data, error } = await supabase
      .from('profiles')
      .select('COUNT(*)')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase 연결 성공!');
    console.log('응답:', data);
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error);
    return false;
  }
}
EOF

# 실행
npm run dev
```

---

## 📊 생성된 테이블 상세 설명

### 1. `profiles` - 사용자 정보

```sql
create table profiles (
  id uuid primary key,              -- Supabase 인증 사용자 ID
  name text not null,               -- 사용자 이름
  school text,                      -- 학교명
  grade integer,                    -- 학년
  role text default 'student',      -- 역할 (student/teacher)
  created_at timestamp,             -- 생성 시간
  updated_at timestamp              -- 수정 시간
);
```

**용도:** 사용자 기본 정보 저장 및 로그인 시스템 연동

**예시 데이터:**

```
id: 550e8400-e29b-41d4-a716-446655440000
name: "김철수"
school: "서울 고등학교"
grade: 12
role: "student"
```

---

### 2. `career_sessions` - 상담 세션

```sql
create table career_sessions (
  id uuid primary key,              -- 세션 고유 ID
  user_id uuid not null,            -- 세션을 생성한 사용자
  title text,                       -- 세션 제목
  description text,                -- 설명
  status text,                      -- 상태 (active/archived)
  created_at timestamp,             -- 생성 시간
  updated_at timestamp              -- 수정 시간
);
```

**용도:** 사용자의 진로 상담 세션 관리 (한 사용자가 여러 세션 가능)

**예시:**

```
session 1: "개발자 경로 탐색" (active)
session 2: "디자이너 경로 탐색" (archived)
```

---

### 3. `search_logs` - 검색 기록

```sql
create table search_logs (
  id uuid primary key,              -- 기록 ID
  session_id uuid not null,         -- 검색을 수행한 세션
  keyword text not null,            -- 검색 키워드
  results_count integer,            -- 검색된 결과 수
  search_type text,                 -- 검색 유형
  created_at timestamp              -- 검색 시간
);
```

**용도:** 사용자의 검색 행동 추적 (나중에 통계/분석에 사용)

**예시:**

```
session_id: xxx
keyword: "개발자"
results_count: 3
created_at: 2025-11-15 10:30:00
```

---

### 4. `job_recommendations` - 검색된 직업

```sql
create table job_recommendations (
  id uuid primary key,              -- 추천 ID
  session_id uuid not null,         -- 세션 ID
  search_log_id uuid,               -- 어느 검색에서 나온 결과
  job_code text not null,           -- CareerNet 직업 코드
  job_name text not null,           -- 직업명
  job_category text,                -- 카테고리
  job_description text,             -- 설명
  average_salary text,              -- 평균 연봉
  employment_rate text,             -- 취업률
  created_at timestamp              -- 저장 시간
);
```

**용도:** CareerNet API에서 받은 직업 정보 저장 및 조회

---

### 5. `session_messages` - 채팅 메시지

```sql
create table session_messages (
  id uuid primary key,              -- 메시지 ID
  session_id uuid not null,         -- 세션 ID
  role text,                        -- 발신자 (user/assistant)
  content text not null,            -- 메시지 내용
  message_type text,                -- 메시지 타입
  metadata jsonb,                   -- 추가 정보 (JSON)
  created_at timestamp              -- 시간
);
```

**용도:** 세션 내 채팅 기록 저장

---

## 🔐 RLS(Row Level Security) 설명

**RLS가 하는 일:**

```
사용자 요청 → "이 사용자가 이 데이터에 접근할 권한이 있는가?"
           → 있음: 데이터 반환
           → 없음: 거부
```

**예시:**

```
사용자 A가 사용자 B의 프로필을 조회하려고 함
  ↓
RLS 정책 확인: "자신의 프로필만 조회 가능"
  ↓
사용자 A의 ID ≠ 사용자 B의 ID
  ↓
❌ 거부 (Access Denied)
```

**SETUP.sql에서 설정된 정책:**

```sql
-- profiles 테이블
-- 사용자는 자신의 프로필만 조회 가능
create policy "profiles_select_own"
on profiles for select
using (auth.uid() = id);

-- career_sessions 테이블
-- 사용자는 자신의 세션만 조회 가능
create policy "career_sessions_select_own"
on career_sessions for select
using (auth.uid() = user_id);
```

---

## 📈 인덱스 (성능 최적화)

**생성되는 인덱스:**

```sql
-- profiles 테이블
create index idx_profiles_role on profiles(role);

-- career_sessions 테이블
create index idx_career_sessions_user_id on career_sessions(user_id);

-- search_logs 테이블
create index idx_search_logs_session_id on search_logs(session_id);

-- job_recommendations 테이블
create index idx_job_recommendations_session_id on job_recommendations(session_id);

-- session_messages 테이블
create index idx_session_messages_session_id_created_at on session_messages(session_id, created_at);
```

**성능 향상:**

```
쿼리 시간 비교:

인덱스 없음: 100ms
인덱스 있음: 1-2ms (약 50배 빠름!)
```

---

## 🔄 자동 업데이트 트리거

```sql
-- profiles와 career_sessions의 updated_at이 자동 업데이트됨
-- 레코드 수정 시 자동으로 현재 시간으로 업데이트

CREATE TRIGGER profiles_update_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🛑 문제 해결

### 문제 1: "SETUP.sql 실행이 안 됨"

**증상:**
```
SQL Editor에 코드를 붙여넣었는데 실행이 안 됨
```

**해결:**
```
1. 모든 SQL이 복사되었는지 확인
2. 주석(--로 시작하는 줄)도 함께 복사하기
3. Cmd/Ctrl + Enter 다시 누르기
4. 또는 [Run] 버튼 클릭
```

### 문제 2: "테이블이 생성되지 않음"

**확인 방법:**

```sql
-- SQL Editor에서 실행
select table_name from information_schema.tables 
where table_schema = 'public';
```

**해결:**

```sql
-- 기존 테이블 모두 삭제
drop table if exists session_messages cascade;
drop table if exists job_recommendations cascade;
drop table if exists search_logs cascade;
drop table if exists career_sessions cascade;
drop table if exists profiles cascade;

-- SETUP.sql을 다시 실행
```

### 문제 3: "API 요청이 실패함"

**확인 사항:**

```bash
# 1. 개발 서버가 실행 중인가?
npm run dev

# 2. URL이 맞는가?
http://localhost:3000/api/search?keyword=개발자

# 3. 콘솔 에러 확인
# 터미널에서 에러 메시지 확인
```

### 문제 4: ".env.local 파일을 못 찾겠어요"

```bash
# 파일 위치 확인
ls -la my-app/.env.local

# 또는 생성
touch my-app/.env.local

# 내용 확인
cat my-app/.env.local
```

### 문제 5: "Supabase 연결이 안 됨"

**확인:**

```bash
# .env.local의 변수들이 정확한지 확인
cat my-app/.env.local

# Supabase 대시보드에서 Settings → API 확인
# Project URL과 API Keys가 맞는지 확인
```

---

## ✅ 최종 체크리스트

### 데이터베이스 (SQL)
- [ ] Supabase 프로젝트 생성
- [ ] SQL Editor 열기
- [ ] SETUP.sql 실행
- [ ] 5개 테이블 생성 확인
- [ ] RLS 정책 적용 확인
- [ ] 인덱스 생성 확인

### 환경 설정
- [ ] .env.local 파일 확인
- [ ] NEXT_PUBLIC_SUPABASE_URL 설정
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY 설정
- [ ] SUPABASE_SERVICE_ROLE_KEY 설정

### 앱 실행
- [ ] npm install 완료
- [ ] npm run dev 실행
- [ ] http://localhost:3000 접속 확인
- [ ] 콘솔 에러 없음

### 기능 테스트
- [ ] API 검색 테스트 성공
- [ ] 키워드 검색 작동
- [ ] 카테고리 검색 작동
- [ ] JSON 응답 확인

---

## 📚 다음 단계

### Phase 1: 기본 설정 ✅ (지금 완료)
```
✅ SQL 데이터베이스 설정
✅ 환경 변수 구성
✅ 앱 시작
```

### Phase 2: 프론트엔드 개발
```
□ 회원가입/로그인 UI
□ 검색 페이지 UI
□ 결과 표시 페이지
□ 세션 관리 UI
```

### Phase 3: 백엔드 통합
```
□ Supabase Auth 연동
□ 프로필 관리 API
□ 세션 관리 API
□ 검색 기록 저장
```

### Phase 4: 테스트 & 배포
```
□ 전체 기능 테스트
□ 성능 최적화
□ Vercel 배포
□ 도메인 설정
```

---

## 🎉 축하합니다!

SQL 기반의 진로 상담 웹앱 개발을 시작했습니다!

**지금부터:**

```bash
# 1. 프로젝트 디렉토리로 이동
cd my-app

# 2. 앱 시작
npm run dev

# 3. 브라우저에서 확인
http://localhost:3000
```

**문제가 있으면:**

- 📖 이 문서의 "문제 해결" 섹션 참고
- 📖 `SQL_SETUP_GUIDE.md` 참고
- 📖 `ENVIRONMENT_SETUP.md` 참고

---

**행운을 빕니다! 🚀**
