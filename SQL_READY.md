# 🚀 SQL 설정 빠른 참조

## 5분 안에 시작하기

### 1️⃣ Supabase 접속
```
supabase.com → 로그인 → 프로젝트 선택 → SQL Editor
```

### 2️⃣ SETUP.sql 복사 & 붙여넣기
- 이 프로젝트의 `SETUP.sql` 파일 전체 복사
- Supabase SQL Editor에 붙여넣기

### 3️⃣ 실행
```
Cmd/Ctrl + Enter 
또는 
"Run" 버튼 클릭
```

### ✅ 확인
모든 테이블이 생성되었는지 확인:
```
Supabase UI → Table Editor 탭
다음 테이블들이 보이는지 확인:
✓ profiles
✓ career_sessions
✓ search_logs
✓ job_recommendations
✓ session_messages
```

---

## 📊 생성되는 것들

### 테이블 (5개)
- `profiles` - 사용자 정보
- `career_sessions` - 상담 세션
- `search_logs` - 검색 기록
- `job_recommendations` - 검색된 직업
- `session_messages` - 채팅 메시지

### 보안
- RLS(Row Level Security) 활성화 ✅
- 정책 자동 생성 ✅
- 사용자는 자신의 데이터만 접근 가능 ✅

### 성능
- 인덱스 자동 생성 ✅
- 빠른 검색/필터링 ✅

### 자동화
- `updated_at` 자동 업데이트 트리거 ✅
- Foreign Key 자동 삭제 (cascade) ✅

---

## 🔍 문제 발생 시

### 테이블이 안 만들어졌나요?
```sql
-- 확인해보세요
select table_name from information_schema.tables 
where table_schema = 'public';
```

### 다시 처음부터 하고 싶나요?
```sql
-- 기존 테이블 모두 삭제
drop table if exists session_messages cascade;
drop table if exists job_recommendations cascade;
drop table if exists search_logs cascade;
drop table if exists career_sessions cascade;
drop table if exists profiles cascade;

-- 그 다음 SETUP.sql 다시 실행
```

### 정책 문제?
```sql
-- RLS 정책 확인
select tablename, policyname 
from pg_policies 
where schemaname = 'public';
```

---

## ✨ 다음 단계

1. ✅ **SETUP.sql 실행** (방금 완료)
2. → **.env.local 설정** 
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```
3. → **Next.js 앱 개발 시작**
   ```bash
   cd my-app
   npm run dev
   ```

---

## 📚 파일 구조

```
proj01/
├── SETUP.sql                    ← 지금 실행해야 할 파일
├── SQL_SETUP_GUIDE.md          ← 자세한 설명 (이것)
├── SQL_READY.md                ← 전체 가이드
└── my-app/
    ├── .env.local              ← 다음: Supabase 키 입력
    ├── src/
    │   └── app/
    │       └── page.tsx        ← 메인 페이지
    └── package.json
```

---

## 💡 팁

1. **처음 사용자라면**
   - SQL_SETUP_GUIDE.md를 먼저 읽어보세요
   - SETUP.sql 주석을 읽어보세요

2. **문제 해결하려면**
   - SQL_READY.md에 문제 해결 섹션이 있습니다
   - Supabase 공식 문서: supabase.com/docs

3. **더 자세히 알고 싶으면**
   - SUPABASE_DESIGN.md - 전체 스키마 설명
   - PROTOTYPE_DESIGN.md - 프로토타입 설계

---

**준비됐나요? SETUP.sql을 실행하세요!** 🚀
