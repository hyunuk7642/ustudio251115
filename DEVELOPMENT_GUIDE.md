# 진로 상담 웹앱 개발 프로세스

## 📋 전체 개발 단계 (총 5단계)

```
Phase 1: 기초 인프라 설정
    ↓
Phase 2: 백엔드 API 개발
    ↓
Phase 3: 프론트엔드 개발
    ↓
Phase 4: 통합 테스트 & 개선
    ↓
Phase 5: 배포 & 모니터링
```

---

## Phase 1️⃣: 기초 인프라 설정 (1-2일)

개발 환경과 서비스 계정을 먼저 세팅합니다.

### 1-1. 개발 환경 구성

```bash
# Node.js 프로젝트 초기화
mkdir career-advisor && cd career-advisor
npm init -y

# Next.js 설치
npm install next react react-dom

# 필수 라이브러리
npm install axios dotenv cors

# 개발용
npm install -D typescript @types/node @types/react
```

### 1-2. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 계정 생성
2. 새 프로젝트 생성
3. SQL 에디터에서 아래 테이블 생성:

```sql
-- 1. profiles 테이블
create table profiles (
  id uuid primary key references auth.users(id),
  name text not null,
  school text,
  grade integer,
  created_at timestamp default now()
);

-- 2. career_sessions 테이블
create table career_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  title text,
  started_at timestamp default now(),
  created_at timestamp default now()
);

-- 3. career_messages 테이블
create table career_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id),
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamp default now()
);

-- 4. career_recommendations 테이블
create table career_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references career_sessions(id),
  job_code text,
  job_name text,
  description text,
  created_at timestamp default now()
);

-- 인덱스 추가 (성능 최적화)
create index career_messages_session_id_idx
  on career_messages(session_id, created_at);

create index career_sessions_user_id_idx
  on career_sessions(user_id, created_at);
```

4. RLS 정책 설정:

```sql
-- profiles 테이블 RLS
alter table profiles enable row level security;

create policy "사용자는 자신의 프로필만 조회"
on profiles
for select using (auth.uid() = id);

-- career_sessions 테이블 RLS
alter table career_sessions enable row level security;

create policy "사용자는 자신의 세션만 조회"
on career_sessions
for select using (auth.uid() = user_id);

-- career_messages 테이블 RLS
alter table career_messages enable row level security;

create policy "사용자는 자신의 세션 메시지만 조회"
on career_messages
for select using (
  exists (
    select 1 from career_sessions
    where id = career_messages.session_id
    and user_id = auth.uid()
  )
);
```

### 1-3. API 키 설정

```bash
# .env.local 파일 생성
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-...

# CareerNet API
CAREERNET_API_KEY=your-careernet-key
EOF
```

### ✅ Phase 1 체크리스트
- [ ] Node.js 환경 설정
- [ ] Supabase 프로젝트 생성 및 테이블 설계
- [ ] RLS 정책 적용
- [ ] 환경변수 설정

---

## Phase 2️⃣: 백엔드 API 개발 (3-4일)

### 2-1. CareerNet API 래퍼 생성

**파일: `lib/careernet.ts`**

```typescript
import axios from 'axios';

const CAREERNET_BASE = "https://www.career.go.kr/cnet/front/openapi";

interface JobData {
  job_code: string;
  job_name: string;
  description: string;
  future_outlook: string;
  average_salary: string;
}

export async function searchJobsByName(jobName: string): Promise<JobData[]> {
  try {
    const url = new URL(`${CAREERNET_BASE}/job/search`);
    url.searchParams.set("job_nm", jobName);
    url.searchParams.set("svc_type", "api");
    url.searchParams.set("svc_code", "job");
    url.searchParams.set("api_key", process.env.CAREERNET_API_KEY || "");

    const response = await axios.get(url.toString());
    
    // CareerNet 응답 구조 파싱
    const jobs = response.data.dataSearch?.content || [];
    
    return jobs.map((job: any) => ({
      job_code: job.job_cd,
      job_name: job.job_nm,
      description: job.job_description || "",
      future_outlook: job.future || "",
      average_salary: job.sal_avg || ""
    }));
  } catch (error) {
    console.error("CareerNet API 호출 실패:", error);
    return [];
  }
}

export async function getJobDetailByCode(jobCode: string): Promise<JobData | null> {
  try {
    const url = new URL(`${CAREERNET_BASE}/job/detail`);
    url.searchParams.set("job_cd", jobCode);
    url.searchParams.set("api_key", process.env.CAREERNET_API_KEY || "");

    const response = await axios.get(url.toString());
    const job = response.data.dataSearch?.content[0];

    if (!job) return null;

    return {
      job_code: job.job_cd,
      job_name: job.job_nm,
      description: job.job_description || "",
      future_outlook: job.future || "",
      average_salary: job.sal_avg || ""
    };
  } catch (error) {
    console.error("CareerNet 상세정보 조회 실패:", error);
    return null;
  }
}
```

### 2-2. Supabase 클라이언트 설정

**파일: `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 세션 관리
export async function createSession(userId: string, title: string = "새로운 상담") {
  const { data, error } = await supabase
    .from('career_sessions')
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSessionMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('career_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { data, error } = await supabase
    .from('career_messages')
    .insert([{ session_id: sessionId, role, content }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 추천 기록 저장
export async function saveRecommendation(
  sessionId: string,
  jobCode: string,
  jobName: string,
  description: string
) {
  const { data, error } = await supabase
    .from('career_recommendations')
    .insert([{ session_id: sessionId, job_code: jobCode, job_name: jobName, description }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2-3. GPT 오케스트레이션 로직

**파일: `lib/gpt.ts`**

```typescript
import axios from 'axios';
import { JobData } from './careernet';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface Intent {
  keywords: string[];
  job_search: boolean;
  emotional: boolean;
  clarification_needed: boolean;
}

export async function analyzeUserIntent(message: string): Promise<Intent> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `너는 사용자의 진로 상담 메시지를 분석하는 전문가야.
사용자 메시지에서 의도를 파악하고 JSON으로만 반환해.
설명이나 다른 텍스트는 절대 추가하지 마.

응답 형식:
{
  "keywords": ["직업명1", "직업명2"],
  "job_search": true/false,
  "emotional": true/false,
  "clarification_needed": true/false
}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    
    // JSON 파싱 안정성 개선
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Fallback
      return {
        keywords: [],
        job_search: false,
        emotional: false,
        clarification_needed: false
      };
    }
  } catch (error) {
    console.error('의도 분석 실패:', error);
    return {
      keywords: [],
      job_search: false,
      emotional: false,
      clarification_needed: false
    };
  }
}

export async function generateCareerAdvice(
  userMessage: string,
  jobsData: JobData[],
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const systemPrompt = `너는 대한민국 중·고등학생 대상 진로 상담 교사야.

📌 원칙:
- 학생의 선택을 존중하며 강요하지 않는다.
- 특정 직업을 과도하게 이상화하거나, 소득만으로 좋고 나쁨을 판단하지 않는다.
- 상담 결과는 참고용이며, 중요한 진로 결정은 담임교사·보호자와 함께 상의하라고 안내한다.
- 학생이 불안, 우울, 자해 등 위험 신호를 보이면 신뢰할 수 있는 어른(담임선생님, 부모님, 학교 상담교사)에게 도움을 요청하라고 권한다.

[직업데이터]
다음은 커리어넷 데이터베이스의 직업 정보야. 이 정보만 사용해서 답변하기:
${JSON.stringify(jobsData).slice(0, 6000)}
[/직업데이터]

상담을 진행해.`;

    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('GPT 조언 생성 실패:', error);
    return "죄송합니다. 잠시 후 다시 시도해주세요.";
  }
}
```

### 2-4. `/api/chat` 라우트 구현

**파일: `pages/api/chat.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeUserIntent, generateCareerAdvice } from '@/lib/gpt';
import { searchJobsByName } from '@/lib/careernet';
import { addMessage, getSessionMessages, saveRecommendation } from '@/lib/supabase';

interface ChatRequest {
  message: string;
  sessionId: string;
  userId: string;
}

interface ChatResponse {
  answer: string;
  recommendations?: Array<{ job_name: string; job_code: string }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ answer: '', error: 'Method not allowed' });
  }

  try {
    const { message, sessionId, userId } = req.body as ChatRequest;

    // 입력값 검증
    if (!message?.trim()) {
      return res.status(400).json({
        answer: '',
        error: '메시지를 입력해주세요.'
      });
    }

    if (!sessionId || !userId) {
      return res.status(400).json({
        answer: '',
        error: '세션 정보가 필요합니다.'
      });
    }

    // 1. 사용자 메시지 저장
    await addMessage(sessionId, 'user', message);

    // 2. 의도 분석
    const intent = await analyzeUserIntent(message);

    // 3. 커리어넷 데이터 수집
    let jobsData = [];
    let recommendations = [];

    if (intent.job_search && intent.keywords.length > 0) {
      for (const keyword of intent.keywords.slice(0, 3)) {
        const jobs = await searchJobsByName(keyword);
        jobsData = [...jobsData, ...jobs];
      }
      recommendations = jobsData.map(job => ({
        job_name: job.job_name,
        job_code: job.job_code
      }));
    }

    // 4. 대화 히스토리 로드
    const messages = await getSessionMessages(sessionId);
    const conversationHistory = messages
      .slice(-10) // 최근 10개 메시지만
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // 5. GPT 조언 생성
    const answer = await generateCareerAdvice(
      message,
      jobsData,
      conversationHistory
    );

    // 6. AI 응답 저장
    await addMessage(sessionId, 'assistant', answer);

    // 7. 추천 직업 저장
    for (const rec of recommendations) {
      await saveRecommendation(
        sessionId,
        rec.job_code,
        rec.job_name,
        answer.substring(0, 500)
      );
    }

    res.status(200).json({
      answer,
      recommendations: recommendations.slice(0, 5)
    });
  } catch (error) {
    console.error('Chat API 에러:', error);
    res.status(500).json({
      answer: '',
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
}
```

### ✅ Phase 2 체크리스트
- [ ] CareerNet API 래퍼 구현
- [ ] Supabase 클라이언트 설정
- [ ] GPT 오케스트레이션 로직 구현
- [ ] `/api/chat` 라우트 완성
- [ ] Postman/curl로 API 테스트

---

## Phase 3️⃣: 프론트엔드 개발 (3-4일)

### 3-1. 레이아웃 구성

**파일: `pages/index.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChatWindow from '@/components/ChatWindow';
import SessionList from '@/components/SessionList';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 사용자 인증 확인
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      } else {
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div>로딩 중...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 좌측: 세션 목록 */}
      <SessionList userId={userId!} onSelectSession={setSessionId} />

      {/* 우측: 채팅창 */}
      {sessionId && userId ? (
        <ChatWindow sessionId={sessionId} userId={userId} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>세션을 선택하거나 새로운 상담을 시작하세요.</p>
        </div>
      )}
    </div>
  );
}
```

### 3-2. 채팅 컴포넌트

**파일: `components/ChatWindow.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatWindowProps {
  sessionId: string;
  userId: string;
}

export default function ChatWindow({ sessionId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await axios.get(`/api/messages?sessionId=${sessionId}`);
        setMessages(response.data);
      } catch (err) {
        console.error('메시지 로드 실패:', err);
      }
    };

    loadMessages();
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setError('');
    const userMessage = input;
    setInput('');

    // 사용자 메시지 UI에 추가
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        message: userMessage,
        sessionId,
        userId
      });

      if (response.data.error) {
        setError(response.data.error);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.answer,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '메시지 전송 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: '12px',
              textAlign: msg.role === 'user' ? 'right' : 'left'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                maxWidth: '70%',
                padding: '10px 15px',
                borderRadius: '8px',
                backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef',
                color: msg.role === 'user' ? 'white' : 'black'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ textAlign: 'left', color: '#999', fontSize: '14px' }}>
            상담선생님이 답변 중입니다...
          </div>
        )}
        {error && (
          <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: '20px', borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="질문을 입력하세요..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3-3. 세션 목록 컴포넌트

**파일: `components/SessionList.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface SessionListProps {
  userId: string;
  onSelectSession: (sessionId: string) => void;
}

export default function SessionList({ userId, onSelectSession }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('career_sessions')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setSessions(data || []);
    } catch (error) {
      console.error('세션 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post('/api/sessions', { userId });
      const newSession = response.data;
      setSessions(prev => [newSession, ...prev]);
      onSelectSession(newSession.id);
    } catch (error) {
      console.error('세션 생성 실패:', error);
    }
  };

  return (
    <div style={{ width: '250px', borderRight: '1px solid #ddd', padding: '20px', overflowY: 'auto' }}>
      <h3>상담 내역</h3>
      
      <button
        onClick={createNewSession}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        + 새 상담 시작
      </button>

      {loading ? (
        <p>로딩 중...</p>
      ) : sessions.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>상담 내역이 없습니다.</p>
      ) : (
        <div>
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{session.title}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {new Date(session.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3-4. 로그인 페이지

**파일: `pages/login.tsx`**

```typescript
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
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setError('이메일 인증 링크를 확인하세요.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || '인증 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h2>{isSignUp ? '회원가입' : '로그인'}</h2>
      
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
      />
      
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
      />

      <button
        onClick={handleAuth}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {loading ? '처리 중...' : isSignUp ? '가입' : '로그인'}
      </button>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        style={{ width: '100%', padding: '10px', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isSignUp ? '로그인으로 돌아가기' : '회원가입하기'}
      </button>

      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
}
```

### ✅ Phase 3 체크리스트
- [ ] 레이아웃 구성 완료
- [ ] ChatWindow 컴포넌트 구현
- [ ] SessionList 컴포넌트 구현
- [ ] 로그인/회원가입 페이지 구현
- [ ] 반응형 UI 테스트

---

## Phase 4️⃣: 통합 테스트 & 개선 (2-3일)

### 4-1. 테스트 시나리오

```markdown
✅ 기능 테스트
- [ ] 사용자 회원가입 및 로그인
- [ ] 새 상담 세션 생성
- [ ] 메시지 전송 및 응답 수신
- [ ] 이전 상담 내역 불러오기
- [ ] 직업 추천 기능

🔍 엣지 케이스
- [ ] 빈 메시지 전송 시 오류 처리
- [ ] CareerNet API 타임아웃 시 폴백
- [ ] GPT API 오류 시 사용자 메시지 표시
- [ ] 동시 다중 요청 처리
- [ ] 매우 긴 메시지 입력

⚡ 성능 테스트
- [ ] API 응답 시간 (목표: < 5초)
- [ ] 메시지 로드 속도
- [ ] 동시 사용자 10명 부하 테스트
```

### 4-2. 에러 처리 개선

```typescript
// lib/errorHandler.ts
export class CareerAdvisorError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export const errorMessages: Record<string, string> = {
  'CAREERNET_TIMEOUT': '커리어넷 서비스에 일시적 문제가 있습니다.',
  'GPT_TIMEOUT': 'AI 상담에 일시적 문제가 있습니다.',
  'INVALID_SESSION': '유효하지 않은 세션입니다.',
  'UNAUTHORIZED': '로그인이 필요합니다.',
  'INTERNAL_ERROR': '서버 오류가 발생했습니다. 관리자에게 문의하세요.'
};
```

### 4-3. 성능 모니터링

```typescript
// lib/monitoring.ts
export async function logPerformance(
  operation: string,
  duration: number,
  success: boolean
) {
  console.log(`[${operation}] ${duration}ms - ${success ? '✓' : '✗'}`);
  
  // 나중에 외부 모니터링 서비스로 전송
  // await fetch('/api/analytics', { 
  //   method: 'POST',
  //   body: JSON.stringify({ operation, duration, success })
  // });
}
```

### ✅ Phase 4 체크리스트
- [ ] 모든 시나리오 수동 테스트
- [ ] 에러 메시지 개선
- [ ] 성능 최적화
- [ ] 사용자 피드백 수집
- [ ] 보안 감사

---

## Phase 5️⃣: 배포 & 모니터링 (1-2일)

### 5-1. Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel
```

**vercel.json 설정:**

```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "CAREERNET_API_KEY": "@careernet_api_key"
  },
  "functions": {
    "pages/api/**": {
      "maxDuration": 30
    }
  }
}
```

### 5-2. 모니터링 설정

```bash
npm install sentry-sdk @sentry/nextjs
```

**sentry.config.js:**

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "your-sentry-dsn",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 5-3. 배포 체크리스트

```markdown
✅ 프로덕션 배포 전
- [ ] 모든 환경변수 설정
- [ ] HTTPS 적용
- [ ] 데이터베이스 백업 설정
- [ ] 로깅 설정
- [ ] 에러 트래킹 설정
- [ ] CDN 캐싱 설정
- [ ] API 레이트 리미팅 설정
- [ ] 모니터링 대시보드 구성

📊 배포 후 모니터링
- [ ] 일일 사용자 통계
- [ ] API 응답 시간 추적
- [ ] 에러율 모니터링
- [ ] 사용자 세션 분석
```

### ✅ Phase 5 체크리스트
- [ ] Vercel 배포 완료
- [ ] 프로덕션 URL 테스트
- [ ] 모니터링 대시보드 설정
- [ ] 사용자 문서 작성
- [ ] Go-live 완료

---

## 📅 개발 일정 예시

| 주 | Phase | 주요 작업 | 예상 일수 |
|----|-------|---------|---------|
| 1주차 | 1 | 인프라 설정 (Supabase, 환경변수) | 1-2일 |
| 1-2주차 | 2 | 백엔드 개발 (API, GPT, CareerNet) | 3-4일 |
| 2-3주차 | 3 | 프론트엔드 개발 (UI/UX) | 3-4일 |
| 3주차 | 4 | 테스트 및 개선 | 2-3일 |
| 4주차 | 5 | 배포 및 모니터링 | 1-2일 |

**총 소요 기간: 약 3-4주**

---

## 🚀 빠르게 시작하기 (Rapid Start)

만약 더 빠르게 진행하고 싶다면:

1. **Phase 1 단축**: 기본 테이블만 생성하고 RLS는 나중에
2. **Phase 2 병렬 진행**: 더미 CareerNet API 사용 (응답을 하드코딩)
3. **Phase 3 단순화**: Bootstrap이나 Tailwind CSS 활용해서 빠른 UI 구성
4. **Phase 4-5 결합**: 배포하면서 테스트

→ **이 경우 1.5-2주로 MVP 완성 가능**

---

## 💡 개발 중 팁

### 로컬 개발 환경

```bash
# 터미널 1: Next.js 개발 서버
npm run dev

# 터널 2: Supabase 로컬 (선택사항)
supabase start
```

### 디버깅

```typescript
// .env.local에 디버그 모드 추가
DEBUG=career-advisor:*

// 코드에서 사용
import debug from 'debug';
const log = debug('career-advisor:chat');
log('User message:', message);
```

### API 테스트

```bash
# Postman에서 또는 curl로
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "개발자가 되고 싶어",
    "sessionId": "test-session-id",
    "userId": "test-user-id"
  }'
```

---

## 📞 문제 해결

| 문제 | 해결방법 |
|------|---------|
| CareerNet API 404 | 최신 엔드포인트 문서 확인, API 키 갱신 |
| GPT 응답 시간 초과 | 타임아웃 값 증가, 메시지 길이 제한 |
| Supabase 연결 오류 | 환경변수 재확인, 프로젝트 상태 확인 |
| CORS 오류 | next.config.js의 CORS 설정 확인 |

---

**질문 있으신 가요? 각 Phase 진행 시 필요한 코드나 설정을 다시 설명해드릴게요!**
