# 진로 상담 웹앱 프로토타입 설계 (단순화 버전)

## 🎯 프로토타입 목표

**"키워드 기반 직업 검색 기능만 구현"**

```
사용자 입력 (예: "개발자") 
  ↓
키워드 매칭
  ↓
CareerNet API 호출
  ↓
직업 목록 반환
  ↓
DB에 저장
```

**제거된 것들:**
- ❌ GPT 의도 분석 (1차, 2차 호출)
- ❌ 복잡한 프롬프트 엔지니어링
- ❌ 고급 분석 기능

**유지되는 것:**
- ✅ Supabase DB (세션, 메시지, 추천 저장)
- ✅ 간단한 Next.js 채팅 UI
- ✅ CareerNet API 호출
- ✅ 기본 검색 기능

---

## 📊 단순화된 DB 스키마

### 필수 테이블 (3개만)

```sql
-- 1. profiles (사용자 정보)
create table profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  school text,
  grade integer,
  created_at timestamp default now()
);

-- 2. career_sessions (상담 세션)
create table career_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text default '새로운 상담',
  created_at timestamp default now()
);

-- 3. search_logs (검색 기록 - 나중에 분석용)
create table search_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id) on delete cascade,
  keyword text not null,
  results_count integer,
  created_at timestamp default now()
);

-- 4. job_recommendations (추천된 직업)
create table job_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id) on delete cascade,
  job_code text not null,
  job_name text not null,
  job_category text,
  description text,
  average_salary text,
  created_at timestamp default now()
);

-- 간단한 인덱스
create index idx_sessions_user on career_sessions(user_id);
create index idx_search_logs_session on search_logs(session_id);
create index idx_recommendations_session on job_recommendations(session_id);
```

### RLS (간단히)

```sql
-- profiles
alter table profiles enable row level security;
create policy "Users can view own profile"
on profiles for select using (auth.uid() = id);

-- career_sessions
alter table career_sessions enable row level security;
create policy "Users can view own sessions"
on career_sessions for select using (auth.uid() = user_id);

create policy "Users can create session"
on career_sessions for insert with check (auth.uid() = user_id);

-- search_logs
alter table search_logs enable row level security;
create policy "Users can view own search logs"
on search_logs for select using (
  exists (
    select 1 from career_sessions
    where id = search_logs.session_id
    and user_id = auth.uid()
  )
);

-- job_recommendations
alter table job_recommendations enable row level security;
create policy "Users can view own recommendations"
on job_recommendations for select using (
  exists (
    select 1 from career_sessions
    where id = job_recommendations.session_id
    and user_id = auth.uid()
  )
);
```

---

## 🔧 백엔드 API 설계

### 단순화된 `/api/search` 엔드포인트

```typescript
// pages/api/search.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

interface SearchResponse {
  jobs: JobData[];
  error?: string;
  count: number;
}

interface JobData {
  job_code: string;
  job_name: string;
  job_category: string;
  description: string;
  average_salary: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ jobs: [], count: 0, error: 'Method not allowed' });
  }

  try {
    const { keyword, sessionId, userId } = req.body;

    // 입력값 검증
    if (!keyword?.trim()) {
      return res.status(400).json({
        jobs: [],
        count: 0,
        error: '검색어를 입력해주세요.'
      });
    }

    // 1. CareerNet API 호출
    const jobs = await searchCareerNetJobs(keyword);

    // 2. 검색 기록 저장
    if (sessionId) {
      await saveSearchLog(sessionId, keyword, jobs.length);
    }

    // 3. 추천 직업 저장
    if (sessionId) {
      for (const job of jobs.slice(0, 5)) {
        await saveJobRecommendation(sessionId, job);
      }
    }

    res.status(200).json({
      jobs: jobs.slice(0, 10),  // 상위 10개만
      count: jobs.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      jobs: [],
      count: 0,
      error: '검색 중 오류가 발생했습니다.'
    });
  }
}

/**
 * CareerNet API에서 직업 검색
 * 실제 API는 문서를 보고 조정 필요
 */
async function searchCareerNetJobs(keyword: string): Promise<JobData[]> {
  try {
    const url = new URL('https://www.career.go.kr/cnet/front/openapi/job/search');
    url.searchParams.set('job_nm', keyword);
    url.searchParams.set('svc_type', 'api');
    url.searchParams.set('svc_code', 'job');
    url.searchParams.set('api_key', process.env.CAREERNET_API_KEY || '');

    const response = await axios.get(url.toString(), {
      timeout: 5000
    });

    // CareerNet 응답 구조에 맞게 파싱
    const results = response.data.dataSearch?.content || [];

    return results.map((item: any) => ({
      job_code: item.job_cd || '',
      job_name: item.job_nm || '',
      job_category: item.job_ct_nm || '',
      description: item.job_description || '',
      average_salary: item.sal_avg || '정보 없음'
    }));
  } catch (error) {
    console.error('CareerNet API error:', error);
    return [];  // 오류 시 빈 배열 반환
  }
}

/**
 * 검색 기록 저장
 */
async function saveSearchLog(
  sessionId: string,
  keyword: string,
  resultsCount: number
): Promise<void> {
  try {
    await supabase
      .from('search_logs')
      .insert([
        {
          session_id: sessionId,
          keyword,
          results_count: resultsCount
        }
      ]);
  } catch (error) {
    console.error('Failed to save search log:', error);
  }
}

/**
 * 추천 직업 저장
 */
async function saveJobRecommendation(
  sessionId: string,
  job: JobData
): Promise<void> {
  try {
    await supabase
      .from('job_recommendations')
      .insert([
        {
          session_id: sessionId,
          job_code: job.job_code,
          job_name: job.job_name,
          job_category: job.job_category,
          description: job.description,
          average_salary: job.average_salary
        }
      ]);
  } catch (error) {
    console.error('Failed to save job recommendation:', error);
  }
}
```

---

## 🎨 프론트엔드 (간단한 UI)

### 페이지 구조

```
/
├── /login           (로그인)
├── /search          (메인 검색 페이지)
└── /history         (검색 기록)
```

### `/search` 페이지

```typescript
// pages/search.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

interface Job {
  job_code: string;
  job_name: string;
  job_category: string;
  description: string;
  average_salary: string;
}

export default function SearchPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchCount, setSearchCount] = useState(0);

  // 초기화: 사용자 인증 및 세션 생성
  useEffect(() => {
    const init = async () => {
      // 1. 사용자 확인
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        window.location.href = '/login';
        return;
      }

      const uid = data.session.user.id;
      setUserId(uid);

      // 2. 새 세션 생성
      const { data: newSession } = await supabase
        .from('career_sessions')
        .insert([{ user_id: uid, title: '키워드 검색' }])
        .select()
        .single();

      if (newSession) {
        setSessionId(newSession.id);
      }
    };

    init();
  }, []);

  // 검색 핸들러
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/search', {
        keyword: keyword.trim(),
        sessionId,
        userId
      });

      if (response.data.error) {
        setError(response.data.error);
        setJobs([]);
      } else {
        setJobs(response.data.jobs);
        setSearchCount(response.data.count);
      }
    } catch (err: any) {
      setError('검색 실패: ' + (err.response?.data?.error || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* 헤더 */}
      <h1>진로 직업 검색</h1>
      <p>관심 있는 직업을 검색해보세요</p>

      {/* 검색창 */}
      <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="예: 개발자, 디자이너, 의사..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => (e.target.style.borderColor = '#007bff')}
            onBlur={(e) => (e.target.style.borderColor = '#ddd')}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s'
            }}
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 검색 결과 */}
      {jobs.length > 0 && (
        <div>
          <h2>검색 결과 ({searchCount}개)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {jobs.map((job, index) => (
              <div
                key={`${job.job_code}-${index}`}
                style={{
                  padding: '20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                {/* 직업명 */}
                <h3 style={{ margin: '0 0 8px 0', color: '#007bff' }}>
                  {job.job_name}
                </h3>

                {/* 카테고리 */}
                <div style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  backgroundColor: '#e7f3ff',
                  color: '#0056b3',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}>
                  {job.job_category}
                </div>

                {/* 설명 */}
                <p style={{
                  margin: '12px 0',
                  fontSize: '14px',
                  color: '#555',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {job.description || '설명 없음'}
                </p>

                {/* 평균 급여 */}
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #eee',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  💰 평균 급여: {job.average_salary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색 전 */}
      {jobs.length === 0 && !loading && keyword === '' && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999'
        }}>
          <p style={{ fontSize: '18px' }}>관심 있는 직업을 검색해보세요</p>
          <p style={{ fontSize: '14px' }}>예: 개발자, 디자이너, 의사, 엔지니어...</p>
        </div>
      )}

      {/* 검색 후 결과 없음 */}
      {jobs.length === 0 && !loading && keyword !== '' && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#999'
        }}>
          <p>"{keyword}"에 대한 검색 결과가 없습니다.</p>
          <p style={{ fontSize: '14px' }}>다른 키워드로 검색해보세요.</p>
        </div>
      )}
    </div>
  );
}
```

### `/login` 페이지 (간단함)

```typescript
// pages/login.tsx

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('✅ 회원가입 성공! 로그인해주세요.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/search');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
          {isSignUp ? '회원가입' : '로그인'}
        </h2>

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '처리 중...' : isSignUp ? '가입' : '로그인'}
        </button>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {isSignUp ? '로그인으로 돌아가기' : '회원가입하기'}
        </button>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📦 프로젝트 구조

```
proj01/
├── plan.md                          # 원래 계획
├── DEVELOPMENT_GUIDE.md             # 개발 프로세스
├── SUPABASE_DESIGN.md               # DB 설계 (상세)
├── PROTOTYPE_DESIGN.md              # 👈 이 파일 (프로토타입)
│
├── .env.local                       # 환경변수
├── package.json
│
├── pages/
│   ├── _app.tsx                     # Next.js 앱
│   ├── login.tsx                    # 로그인/회원가입
│   ├── search.tsx                   # 메인 검색 페이지
│   └── api/
│       └── search.ts                # 검색 API
│
├── lib/
│   ├── supabase.ts                  # Supabase 클라이언트
│   └── careernet.ts                 # CareerNet 함수 (선택)
│
├── styles/
│   └── globals.css                  # 전역 스타일
│
└── public/                          # 정적 파일
```

---

## ⚡ 프로토타입 개발 단계 (1주일)

| 일차 | 작업 | 소요시간 |
|------|------|---------|
| 1일차 | Supabase 프로젝트 + 테이블 생성 | 2시간 |
| 2일차 | Next.js 프로젝트 설정 + 로그인 페이지 | 4시간 |
| 3일차 | `/api/search` 구현 | 4시간 |
| 4일차 | 검색 페이지 UI 작성 | 4시간 |
| 5일차 | 통합 테스트 + 버그 수정 | 4시간 |
| **총** | | **~18시간** |

---

## 🧪 테스트 플로우

```
1. 회원가입
   ↓
2. 로그인
   ↓
3. 검색 페이지 진입 → 자동으로 세션 생성
   ↓
4. "개발자" 검색
   ↓
5. CareerNet API에서 결과 가져오기
   ↓
6. DB에 저장 (search_logs, job_recommendations)
   ↓
7. UI에 결과 표시
```

---

## 🚀 MVP 체크리스트

### Phase 1: 기초 인프라 (완료)
- [x] Supabase DB 설계
- [x] 테이블 생성 SQL 준비

### Phase 2: 백엔드 (구현 필요)
- [ ] Supabase 클라이언트 설정
- [ ] CareerNet API 래퍼 (검색만)
- [ ] `/api/search` 엔드포인트 구현
- [ ] 데이터 저장 로직

### Phase 3: 프론트엔드 (구현 필요)
- [ ] 로그인 페이지
- [ ] 검색 페이지
- [ ] 결과 카드 표시
- [ ] 로딩/에러 상태 처리

### Phase 4: 테스트 & 배포
- [ ] 수동 테스트
- [ ] Vercel 배포
- [ ] 실제 사용자 테스트

---

## 💡 프로토타입 장점

✅ **빠른 개발** - AI 없으니까 간단함  
✅ **명확한 요구사항** - 키워드만 검색하면 됨  
✅ **낮은 비용** - API 비용 절감 (GPT 없음)  
✅ **쉬운 확장** - 나중에 GPT 추가하기 쉬움  
✅ **학습 효과** - 프로토타입 만들고 나서 개선할 방향 보임

---

## 🔄 나중에 AI 추가하는 방법

현재 프로토타입에서 나중에 GPT를 추가하려면:

```typescript
// 1. 기존: 키워드만
const jobs = await searchCareerNetJobs(keyword);

// 2. 나중에: GPT 의도 분석 추가
const intent = await analyzeIntent(userMessage);  // 추가
const jobs = await searchCareerNetJobs(intent.keywords);  // 개선

// 3. 최종: 2단계 호출
const jobs = await searchCareerNetJobs(intent.keywords);
const advice = await generateAdvice(userMessage, jobs);  // 추가
```

---

## 📋 환경변수 설정

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
CAREERNET_API_KEY=xxxxx
```

---

## 🎯 결론

**프로토타입 전략:**
1. **먼저 키워드 검색 기능으로 MVP 만들기** (1주일)
2. **실제 사용자 피드백 받기**
3. **그 다음에 GPT 추가하기** (2주일)

→ **총 3주일에 완성된 서비스 런칭 가능**

이게 맞는 방향 같나요? 아니면 수정할 부분 있으면 말씀해주세요! 🚀
