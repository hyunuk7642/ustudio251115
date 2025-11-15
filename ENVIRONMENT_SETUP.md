# 📦 환경 설정 및 초기화 가이드

## 🎯 목표

이 가이드는 다음을 완료합니다:
1. ✅ Supabase 데이터베이스 테이블 생성
2. ✅ Next.js 프로젝트 설정
3. ✅ 환경 변수 구성
4. ✅ 앱 시작 준비

---

## 📋 체크리스트

### Phase 1: 데이터베이스 설정 (3분)

- [ ] **Step 1:** [supabase.com](https://supabase.com) 접속 및 로그인
- [ ] **Step 2:** 프로젝트 선택
- [ ] **Step 3:** SQL Editor 열기
- [ ] **Step 4:** 이 프로젝트의 `SETUP.sql` 파일 복사
- [ ] **Step 5:** SQL Editor에 붙여넣기
- [ ] **Step 6:** Cmd/Ctrl + Enter 또는 Run 버튼 클릭
- [ ] **Step 7:** 완료 메시지 확인

**확인 방법:**
```
Supabase UI → Table Editor
다음 테이블 확인:
✓ profiles
✓ career_sessions  
✓ search_logs
✓ job_recommendations
✓ session_messages
```

---

### Phase 2: 환경 변수 설정 (2분)

**`.env.local` 파일 확인:**

```bash
# 프로젝트 루트의 .env.local 파일
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CHATGPT_API_KEY=YOUR_API_KEY (선택사항)
```

**필수 변수 확인:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - 설정됨
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 설정됨
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - 설정됨

**얻는 방법:**

1. **Supabase URL & Keys 얻기:**
   - Supabase 대시보드 → Settings → API
   - `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` 복사 → `SUPABASE_SERVICE_ROLE_KEY`

2. **ChatGPT API Key (선택사항):**
   - [platform.openai.com](https://platform.openai.com/api-keys)
   - API Key 생성 및 복사
   - `CHATGPT_API_KEY`에 입력

---

### Phase 3: Node.js 의존성 설치 (3분)

```bash
# 프로젝트 경로로 이동
cd /Users/hyunuk/Python/VS\ Code/Ustudio/251115/proj01/my-app

# 의존성 설치
npm install

# 또는
yarn install
```

**설치되는 주요 패키지:**
- `next` - Next.js 프레임워크
- `react` & `react-dom` - React 라이브러리
- `@supabase/supabase-js` - Supabase 클라이언트
- `typescript` - TypeScript
- `tailwindcss` - CSS 프레임워크
- `axios` - HTTP 클라이언트

---

### Phase 4: Supabase 클라이언트 설정 (이미 완료)

**파일 위치:** `my-app/src/lib/supabase.ts`

**기능:**
```typescript
// Supabase 클라이언트 초기화
export const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 사용 예시
const { data, error } = await supabase
  .from('profiles')
  .select('*');
```

---

### Phase 5: 앱 시작 (1분)

```bash
# 개발 서버 시작
npm run dev

# 또는
yarn dev
```

**출력:**
```
> next dev

Local:        http://localhost:3000
External:     http://192.168.x.x:3000

✓ Ready in XXXms
```

**브라우저에서 확인:**
- http://localhost:3000 열기
- 앱이 로드되는지 확인

---

## 🔧 상세 설정 단계

### Step 1: Supabase 프로젝트 ID 확인

```bash
# Supabase 대시보드에서:
Settings → API → "Project ID"를 찾음

예시:
NEXT_PUBLIC_SUPABASE_URL=https://zgcfilwrhxgtvaetecsf.supabase.co
                              ^^^^^^^^^^^^^^^^^^^^^^^^
                              Project ID
```

### Step 2: API Keys 얻기

```bash
# Supabase 대시보드 → Settings → API

# 1. Anon Public Key (클라이언트 사이드 사용)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 2. Service Role Key (서버 사이드 사용)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# 3. JWT Secret (선택사항, 커스텀 토큰용)
SUPABASE_JWT_SECRET=your_jwt_secret
```

### Step 3: .env.local 파일 위치

```
proj01/
├── .env.local          ← 루트 .env.local
└── my-app/
    ├── .env.local      ← (옵션) app 루트 .env.local
    └── src/
```

**권장사항:** 앱 루트(`my-app/.env.local`)에 설정하는 것이 표준

---

## 🧪 설정 검증

### 1. Supabase 연결 테스트

```typescript
// my-app/src/lib/test-supabase.ts
import { supabase } from './supabase';

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('COUNT(*)')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 실패:', error);
    return false;
  }
}
```

### 2. 테이블 확인

```sql
-- Supabase SQL Editor에서 실행
select table_name from information_schema.tables 
where table_schema = 'public' 
order by table_name;

-- 예상 결과:
-- career_sessions
-- job_recommendations
-- profiles
-- search_logs
-- session_messages
```

### 3. RLS 정책 확인

```sql
-- Supabase SQL Editor에서 실행
select tablename, policyname, cmd 
from pg_policies 
where schemaname = 'public'
order by tablename;
```

---

## 🚨 일반적인 문제 해결

### 문제 1: "NEXT_PUBLIC_SUPABASE_URL is undefined"

**원인:** `.env.local` 파일이 없거나 변수가 설정되지 않음

**해결:**
```bash
# 1. 파일 확인
ls -la my-app/.env.local

# 2. 내용 확인
cat my-app/.env.local

# 3. 변수 이름 확인 (정확히 일치해야 함)
NEXT_PUBLIC_SUPABASE_URL=...
```

### 문제 2: "Connection refused"

**원인:** Supabase 서버가 응답하지 않거나 URL이 잘못됨

**해결:**
```bash
# 1. URL 확인
echo $NEXT_PUBLIC_SUPABASE_URL

# 2. Supabase 대시보드에서 상태 확인
# Status → All Systems Operational 확인

# 3. 개발 서버 재시작
npm run dev
```

### 문제 3: "RLS policy denied"

**원인:** Row Level Security 정책이 거부함

**해결:**
```sql
-- Supabase Dashboard → Authentication → Policies
-- 해당 테이블의 정책 확인 및 수정

-- 또는 임시로 RLS 비활성화 (테스트 목적)
alter table profiles disable row level security;
```

### 문제 4: "Table doesn't exist"

**원인:** SETUP.sql이 실행되지 않았거나 실행 중 오류 발생

**해결:**
```bash
# 1. SQL Editor에서 테이블 목록 확인
select * from information_schema.tables 
where table_schema = 'public';

# 2. 테이블이 없으면 SETUP.sql 다시 실행
# 3. 오류가 있으면 SQL_SETUP_GUIDE.md 참고
```

---

## 📚 다음 단계

### 1단계: 기본 설정 완료 ✅
- [ ] SETUP.sql 실행
- [ ] 환경 변수 설정
- [ ] npm install 완료
- [ ] npm run dev로 앱 시작

### 2단계: 앱 개발
- [ ] Supabase 클라이언트 사용법 학습
- [ ] Authentication 페이지 구현
- [ ] 검색 기능 구현
- [ ] 결과 저장 기능 구현

### 3단계: 테스트
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 검색 기능 테스트
- [ ] 데이터 저장 확인

### 4단계: 배포
- [ ] 환경 변수 설정
- [ ] 빌드 테스트
- [ ] Vercel/Heroku 배포

---

## 📖 참고 문서

- `SETUP.sql` - 데이터베이스 스크립트
- `SQL_SETUP_GUIDE.md` - SQL 상세 가이드
- `DEVELOPMENT_GUIDE.md` - 개발 프로세스 가이드
- `PROTOTYPE_DESIGN.md` - 프로토타입 설계
- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 공식 문서](https://nextjs.org/docs)

---

## ✨ 준비 완료!

모든 체크리스트를 완료했다면, 앱 개발을 시작할 준비가 된 것입니다! 🚀

**다음 명령어를 실행하세요:**
```bash
cd my-app
npm run dev
```

**그리고 http://localhost:3000 에 접속하세요!** 🎉
