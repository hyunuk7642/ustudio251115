# 🎯 진로 상담 웹앱 - SQL 기반 빠른 시작 가이드

> **당신은 SQL을 사용하고 싶다고 했습니다! 완벽해요.** ✅

---

## 📋 목차

1. [필수 준비물](#필수-준비물)
2. [Step 1: Supabase 데이터베이스 설정 (SQL)](#step-1-supabase-데이터베이스-설정-sql)
3. [Step 2: 환경 변수 확인](#step-2-환경-변수-확인)
4. [Step 3: 앱 시작](#step-3-앱-시작)
5. [테스트 방법](#테스트-방법)
6. [다음 단계](#다음-단계)

---

## 필수 준비물

- ✅ [Supabase 계정](https://supabase.com) (무료)
- ✅ 이 프로젝트 (이미 준비됨)
- ✅ Node.js 18+ 설치
- ✅ 선호하는 코드 에디터 (VS Code 추천)

---

## Step 1: Supabase 데이터베이스 설정 (SQL)

### 1-1. SETUP.sql 파일 위치

```
proj01/
└── SETUP.sql     ← 이 파일을 사용합니다
```

### 1-2. SQL 실행 방법

**5분 안에 완료되는 과정:**

1. **Supabase 대시보드 접속**
   ```
   https://supabase.com → 로그인 → 프로젝트 선택
   ```

2. **SQL Editor 열기**
   ```
   왼쪽 메뉴 → SQL Editor → "New Query"
   ```

3. **SETUP.sql 복사 & 붙여넣기**
   ```
   proj01/SETUP.sql 파일 전체 선택 & 복사
   → Supabase SQL Editor에 붙여넣기
   ```

4. **실행**
   ```
   Cmd + Enter (Mac) 또는 Ctrl + Enter (Windows/Linux)
   또는 "▶ Run" 버튼 클릭
   ```

5. **확인**
   ```
   "Query executed successfully" 메시지 확인
   ```

### 1-3. 생성되는 테이블 확인

**Supabase UI에서 확인:**

```
Supabase 대시보드 → Table Editor
다음 5개 테이블이 생성되는지 확인:

✅ profiles
✅ career_sessions
✅ search_logs
✅ job_recommendations
✅ session_messages
```

**SQL로 확인:**

```sql
-- SQL Editor에서 실행
select table_name 
from information_schema.tables 
where table_schema = 'public' 
order by table_name;
```

---

## Step 2: 환경 변수 확인

### 2-1. `.env.local` 파일 확인

**파일 위치:**
```
proj01/my-app/.env.local
```

**필수 내용:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### 2-2. Supabase에서 키 얻기

**Supabase 대시보드:**
```
Settings → API → 복사

- Project URL → NEXT_PUBLIC_SUPABASE_URL
- anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY  
- service_role secret → SUPABASE_SERVICE_ROLE_KEY
```

> ℹ️ 프로젝트에 이미 `.env.local`이 설정되어 있으면 그대로 사용하면 됩니다!

---

## Step 3: 앱 시작

### 3-1. 의존성 설치

```bash
cd my-app
npm install
```

### 3-2. 개발 서버 실행

```bash
npm run dev
```

**예상 출력:**
```
> next dev

Local:        http://localhost:3000
External:     http://192.168.x.x:3000

✓ Ready in 1234ms
```

### 3-3. 브라우저에서 확인

```
http://localhost:3000
```

앱이 로드되면 성공! 🎉

---

## 테스트 방법

### 테스트 1: API 검색 기능 테스트

```bash
# 1단계: 개발 서버 실행 (이미 했으면 생략)
npm run dev

# 2단계: 새 터미널 탭에서 실행
curl "http://localhost:3000/api/search?keyword=개발자"

# 3단계: 응답 확인
# 응답:
# {
#   "success": true,
#   "data": [
#     {
#       "code": "JOB001",
#       "name": "소프트웨어 개발자",
#       ...
#     }
#   ],
#   "count": 3
# }
```

### 테스트 2: POST 요청으로 검색

```bash
curl -X POST "http://localhost:3000/api/search" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "디자이너"}'
```

### 테스트 3: 카테고리로 검색

```bash
curl "http://localhost:3000/api/search?category=IT"
```

---

## 생성된 파일 구조

```
proj01/
├── SETUP.sql                          ← SQL 데이터베이스 스크립트 ✅
├── SQL_SETUP_GUIDE.md                 ← 상세 SQL 가이드
├── SQL_READY.md                       ← SQL 빠른 참조
├── ENVIRONMENT_SETUP.md               ← 환경 설정 가이드
├── DEVELOPMENT_GUIDE.md               ← 전체 개발 가이드
├── PROTOTYPE_DESIGN.md                ← 프로토타입 설계
└── my-app/
    ├── .env.local                     ← 환경 변수 (이미 설정됨) ✅
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx               ← 메인 페이지
        │   ├── globals.css
        │   └── api/
        │       └── search/
        │           └── route.ts       ← 검색 API ✅
        └── lib/
            ├── supabase.ts            ← Supabase 클라이언트 ✅
            └── careernet.ts           ← CareerNet API 래퍼 ✅
```

---

## 🚀 다음 단계

### Phase 1: 기본 설정 (지금) ✅
- [x] SETUP.sql 실행
- [x] 환경 변수 설정
- [x] npm install
- [x] npm run dev

### Phase 2: 프론트엔드 개발
- [ ] 로그인/회원가입 페이지 구현
- [ ] 검색 페이지 UI 개발
- [ ] 결과 표시 페이지

### Phase 3: 기능 통합
- [ ] Supabase Auth 연동
- [ ] 세션 관리
- [ ] 검색 결과 저장

### Phase 4: 테스트 & 배포
- [ ] 전체 기능 테스트
- [ ] 성능 최적화
- [ ] Vercel 배포

---

## 📚 주요 파일 설명

### `SETUP.sql` - 데이터베이스 설정
- 5개 테이블 생성
- RLS(보안) 정책 설정
- 인덱스 및 트리거 생성
- **꼭 Supabase SQL Editor에서 실행해야 합니다!**

### `src/lib/supabase.ts` - Supabase 클라이언트
```typescript
// 사용 예시
import { supabase, getUserProfile, createSession } from '@/lib/supabase';

const user = await getCurrentUser();
const profile = await getUserProfile(user.id);
const session = await createSession(user.id, '새 상담');
```

### `src/lib/careernet.ts` - 직업 검색 API
```typescript
// 사용 예시
import { searchJobs, searchJobsByCategory } from '@/lib/careernet';

const results = await searchJobs('개발자');
const itJobs = await searchJobsByCategory('IT');
```

### `src/app/api/search/route.ts` - 검색 엔드포인트
```
GET  /api/search?keyword=개발자
POST /api/search { keyword: '개발자' }
```

---

## 🛑 문제 해결

### 문제: "Cannot find module '@/lib/supabase'"

**해결:**
```bash
# 1. node_modules 삭제 및 재설치
rm -rf node_modules package-lock.json
npm install

# 2. TypeScript 캐시 삭제
rm -rf .next
npm run dev
```

### 문제: "NEXT_PUBLIC_SUPABASE_URL is undefined"

**해결:**
```bash
# 1. .env.local 파일 확인
cat my-app/.env.local

# 2. 변수 이름 정확히 확인
NEXT_PUBLIC_SUPABASE_URL=...

# 3. 개발 서버 재시작
npm run dev
```

### 문제: SQL 실행이 안 됨

**해결:**
```
1. Supabase 대시보드 로그인 확인
2. 프로젝트 선택 확인
3. SQL Editor 열기
4. SETUP.sql 전체 내용 복사 (주석 포함)
5. SQL Editor에 붙여넣기
6. Cmd/Ctrl + Enter로 실행
```

### 문제: 테이블이 안 만들어짐

**확인 방법:**
```sql
-- SQL Editor에서 실행
select table_name from information_schema.tables 
where table_schema = 'public';
```

**해결:**
```sql
-- 다시 처음부터 하려면
drop table if exists session_messages cascade;
drop table if exists job_recommendations cascade;
drop table if exists search_logs cascade;
drop table if exists career_sessions cascade;
drop table if exists profiles cascade;

-- 그 후 SETUP.sql 다시 실행
```

---

## ✨ 축하합니다!

SQL 기반으로 데이터베이스가 설정되었습니다! 🎉

**지금부터 할 일:**
1. ✅ SETUP.sql 실행 (Supabase SQL Editor)
2. ✅ 환경 변수 확인
3. ✅ `npm install && npm run dev`
4. ✅ http://localhost:3000 접속

**질문이 있으면:**
- 📖 `SQL_SETUP_GUIDE.md` 참고
- 📖 `ENVIRONMENT_SETUP.md` 참고
- 📖 `DEVELOPMENT_GUIDE.md` 참고

---

## 📞 지원

문제가 발생하면:

1. **가이드 문서 확인**
   - SQL_SETUP_GUIDE.md
   - ENVIRONMENT_SETUP.md
   - DEVELOPMENT_GUIDE.md

2. **로그 확인**
   ```bash
   # 개발 서버의 에러 메시지 확인
   npm run dev
   ```

3. **Supabase 상태 확인**
   ```
   supabase.com → Dashboard → 상태 페이지
   ```

---

**준비됐나요? 시작해봅시다!** 🚀
