# ⚠️ Supabase에서 안전하게 SETUP.sql 실행하기

## 문제 분석

**Supabase SQL Editor의 경고:**
```
⚠️ Ensure that these are intentional before executing this query
```

이 경고는 다음 명령어들 때문에 나타납니다:
- ✅ `CREATE TABLE IF NOT EXISTS`
- ✅ `ALTER TABLE`
- ✅ `CREATE POLICY IF NOT EXISTS`
- ✅ `DROP TRIGGER IF EXISTS`
- ✅ `BEGIN; ... COMMIT;`

**이것은 정상입니다.** Supabase가 데이터베이스를 변경할 수 있는 명령어들인지 확인하는 안전 장치입니다.

---

## ✅ 안전하게 실행하는 방법

### Step 1: 확인

SETUP.sql 파일의 최상단 주석을 읽으세요:

```sql
-- Career Counseling Web App - Supabase Database Setup
-- This SQL script creates all necessary tables, indexes, and policies
-- Execute this in the Supabase SQL Editor
-- ⚠️ WARNING: This script will create tables. Make sure you want to proceed!

BEGIN;
-- ...테이블 생성 코드...
COMMIT;
```

### Step 2: 의도 확인

다음이 맞는지 확인하세요:

```
✅ 5개 테이블을 새로 만들고 싶은가?
   ├─ profiles
   ├─ career_sessions
   ├─ search_logs
   ├─ job_recommendations
   └─ session_messages

✅ RLS (보안) 정책을 설정하고 싶은가?
✅ 인덱스를 생성하고 싶은가?
✅ 트리거를 설정하고 싶은가?
```

모두 YES라면 → 계속 진행하세요!

### Step 3: 실행

Supabase SQL Editor에서:

```
1. SETUP.sql 전체 복사 (Cmd/Ctrl + A → Cmd/Ctrl + C)
2. Supabase SQL Editor에 붙여넣기
3. 경고 메시지 읽기: "Ensure that these are intentional..."
4. [▶ Run] 버튼 클릭 또는 Cmd/Ctrl + Enter
5. ✅ 완료!
```

---

## 🛡️ 왜 이 경고가 나올까?

Supabase는 **의도하지 않은 데이터 손실을 방지**하기 위해 이 경고를 표시합니다.

| 명령어 | 용도 | 경고 여부 |
|--------|------|---------|
| SELECT | 데이터 조회 | ❌ 없음 |
| INSERT | 데이터 추가 | ❌ 없음 |
| UPDATE | 데이터 수정 | ❌ 없음 |
| CREATE TABLE | 테이블 생성 | ⚠️ 경고 |
| ALTER TABLE | 테이블 수정 | ⚠️ 경고 |
| DROP TABLE | 테이블 삭제 | ⚠️⚠️ 경고 |
| CREATE POLICY | 보안 정책 | ⚠️ 경고 |

**우리의 SETUP.sql은 안전합니다:**
- ❌ 데이터를 삭제하지 않음
- ✅ 새로운 테이블만 생성
- ✅ 기존 테이블을 보호

---

## 📋 SETUP.sql의 구조

```sql
BEGIN;                    -- 트랜잭션 시작
                          -- 한 번에 모두 성공하거나 모두 실패

-- 1단계: 테이블 생성
CREATE TABLE IF NOT EXISTS profiles { ... }
CREATE TABLE IF NOT EXISTS career_sessions { ... }
...

-- 2단계: RLS 정책 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" { ... }
...

-- 3단계: 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_role { ... }
...

-- 4단계: 트리거 설정
CREATE TRIGGER profiles_update_timestamp { ... }
...

COMMIT;                   -- 트랜잭션 완료
                          -- 모든 변경 사항 저장
```

---

## ✨ 안전한 이유

### 1️⃣ `IF NOT EXISTS` 사용
```sql
-- 같은 테이블을 여러 번 만들려고 해도 에러 없이 무시됨
CREATE TABLE IF NOT EXISTS profiles { ... }

-- 같은 정책을 여러 번 만들려고 해도 무시됨
CREATE POLICY IF NOT EXISTS "profiles_select_own" { ... }
```

### 2️⃣ 트랜잭션 (BEGIN; COMMIT;)
```sql
BEGIN;
  -- 여러 명령어 실행
  CREATE TABLE...
  ALTER TABLE...
  CREATE POLICY...
COMMIT;  -- 모두 성공하면 저장, 하나라도 실패하면 모두 취소
```

### 3️⃣ 기존 데이터 보호
- ❌ `DROP TABLE` 없음 (기존 테이블 삭제 안 함)
- ❌ `DELETE` 없음 (기존 데이터 삭제 안 함)
- ✅ `CREATE TABLE IF NOT EXISTS` (새 테이블만 생성)

---

## 🚀 실행 후 확인

### 확인 1: 테이블 생성됨

```sql
-- Supabase SQL Editor에서 실행
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 예상 결과:
-- career_sessions
-- job_recommendations
-- profiles
-- search_logs
-- session_messages
```

### 확인 2: RLS 정책 설정됨

```sql
-- Supabase SQL Editor에서 실행
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 예상 결과: 각 테이블에 여러 정책들이 있음
```

### 확인 3: UI에서 확인

Supabase 대시보드:
```
Table Editor → 왼쪽 사이드바
  ✅ profiles
  ✅ career_sessions
  ✅ search_logs
  ✅ job_recommendations
  ✅ session_messages
```

---

## ⚠️ 만약 실수로 잘못 실행했다면?

### 상황 1: 같은 스크립트를 여러 번 실행했어요

**결과:** ✅ 문제 없음!

이유:
- `IF NOT EXISTS`를 사용하므로 중복 생성 안 됨
- 기존 테이블/정책은 유지됨
- 그냥 "이미 있음"으로 무시됨

### 상황 2: 실수로 중간에 취소했어요

**결과:** ✅ 문제 없음!

이유:
- `BEGIN; ... COMMIT;` 트랜잭션 사용
- 중간 취소 → 모든 변경 자동 취소
- 데이터베이스는 원래대로 돌아감

### 상황 3: 정말 테이블을 삭제하고 싶어요

```sql
-- 경고! 다음 명령어들만 사용하세요:

DROP TABLE IF EXISTS session_messages CASCADE;
DROP TABLE IF EXISTS job_recommendations CASCADE;
DROP TABLE IF EXISTS search_logs CASCADE;
DROP TABLE IF EXISTS career_sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 그 후 SETUP.sql을 다시 실행
```

---

## 📚 요약

| 항목 | 설명 |
|------|------|
| **경고 이유** | 데이터베이스 변경 작업이므로 |
| **안전한가?** | ✅ YES - 기존 데이터 안전 |
| **실행해도 되나?** | ✅ YES - 언제든지 |
| **여러 번 실행해도?** | ✅ YES - 중복 생성 안 됨 |
| **중간에 취소하면?** | ✅ OK - 모든 변경 자동 취소 |

---

## 🎯 지금 할 일

1. ✅ 이 페이지 읽기 (완료!)
2. ✅ SETUP.sql 최상단 확인
3. ✅ Supabase SQL Editor에 복사 & 붙여넣기
4. ✅ [▶ Run] 버튼 클릭
5. ✅ 완료 메시지 확인

**행운을 빕니다!** 🚀

---

## 📞 추가 도움말

### Q: 정말로 테이블이 생성되나요?
A: 네, 완전히 생성됩니다. 확인하려면 위의 "확인" 섹션을 참고하세요.

### Q: 다른 테이블을 망가뜨리지 않나요?
A: 아니요, 새 테이블만 생성합니다. 기존 테이블은 건드리지 않습니다.

### Q: 비용이 들나요?
A: 아니요, Supabase의 프리 티어에서 무료입니다.

### Q: 실패하면 어떻게 되나요?
A: 트랜잭션이 자동으로 취소되어 모든 변경이 롤백됩니다.

---

**완벽하게 준비되었습니다! 실행해보세요!** ✨
