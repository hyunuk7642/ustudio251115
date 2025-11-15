전체적으로 설계 진짜 잘 짜놨어요.
**“이대로 만들면 바로 MVP 찍을 수 있는 수준”**이고, 구조도 깔끔해요.
그냥 실서비스로 가기 전에 몇 군데만 다듬으면 더 안전하고 튼튼해질 부분들만 짚어볼게요.

---

## 1. 아키텍처/흐름 전체 평가

* **구조 흐름(프론트 → `/api/chat` → CareerNet → GPT → Supabase)**
  → 교육용 진로 상담 웹앱에 딱 맞는 구조라서 그대로 가져가도 돼요.
* **2단계 GPT 호출(의도 분석 → CareerNet 데이터 기반 설명)**
  → 헛소리 줄이는 좋은 패턴이고, “데이터는 커리어넷, 말은 GPT” 분리도 잘 됐어요.
* **Supabase로 세션/메시지/추천 내역 저장**
  → 나중에 “우리 반 진로 통계” 같은 거 뽑기에도 잘 설계돼 있음.

즉, 큰 그림은 수정할 필요 없이 **“구현만 하면 되는 상태”**라고 생각해도 됩니다.

---

## 2. Supabase 스키마: 좋고, 여기에 딱 두 가지만

지금 스키마는 기본 구조로 아주 좋고, 여기에 두 가지만 더하면 좋아요.

### 2-1. `profiles` – auth.users와의 관계

* 이미 `id uuid primary key references auth.users(id)` 되어 있어서 OK.
* 나중에 RLS(Row Level Security) 켤 거면, 보통 이렇게 policy를 설정해요:

```sql
alter table profiles enable row level security;

create policy "유저는 자기 프로필만 보기"
on profiles
for select using (auth.uid() = id);

create policy "유저는 자기 프로필만 수정"
on profiles
for update using (auth.uid() = id);
```

> 나중에 “학생/교사 계정 분리”하고 싶으면 `role text` 컬럼 하나만 더 추가하면 확장 가능.

### 2-2. `career_messages`에 인덱스 하나

세션별로 쿼리 많이 할 테니까:

```sql
create index career_messages_session_id_idx
  on career_messages(session_id, created_at);
```

이거 하나만 있어도 “세션별 메시지 불러오기”가 매우 빨라져요.

---

## 3. CareerNet API 부분: “패턴”은 OK, 실제 엔드포인트만 최종 점검

지금 쓴 예시는 **패턴을 이해하기 위한 예시**로는 딱 좋아요.

```ts
const BASE = "https://www.career.go.kr/cnet/front/openapi";

url.searchParams.set("searchJobNm", name);
url.searchParams.set("job_cd", jobCode);
```

실제 구현 때는:

* 커리어넷 매뉴얼에 나와 있는

  * `svcType`, `svcCode`, `gubun` 같은 값들
  * 응답 구조(`dataSearch → content`)
    이걸 보고 **파라미터 이름/값만 맞게 바꿔주면 돼요.**

구조 자체(서버에서 URL 만들어서 fetch → JSON 반환)는 완전히 적절합니다.

---

## 4. GPT 오케스트레이션: 프롬프트·역할 조정 팁

### 4-1. 1차 호출(의도 분석) – JSON 파싱 안정성

지금 패턴:

```ts
const intentJson = JSON.parse(intentRes.choices[0].message.content!);
```

여기서 가끔 GPT가 JSON 앞뒤에 설명을 붙이면 터질 수 있어서,
살짝 방어 로직을 추천해요:

* system 프롬프트에 **“설명 없이 JSON만”**을 더 강하게 강조
* 혹은 정 안 되면 `content.match(/\{[\s\S]*\}/)`로 첫 번째 `{}`만 잘라서 파싱

그리고 `try/catch`로 감싸서, 실패하면 **fallback 로직**(그냥 키워드 없이도 상담)은 돌아가게 하면 좋아요.

### 4-2. 2차 호출에서 CareerNet 데이터 role

지금은 이렇게 되어 있죠:

```ts
{
  role: "assistant",
  content: `커리어넷 직업데이터:\n${JSON.stringify(jobsData).slice(0, 6000)}`
},
{ role: "user", content: message }
```

이것도 동작은 하는데, **조금 더 명확하게** 하려면:

* CareerNet JSON은 `system` 또는 `user` 메시지 안에 `[DATA]` 블록으로 넣는 걸 추천

예:

```ts
{
  role: "system",
  content: `
너는 대한민국 중·고등학생 대상 진로 상담 교사야.
아래 [직업데이터] 블록 안에 있는 정보만 사용해서 직업을 설명해.
[직업데이터]
${JSON.stringify(jobsData).slice(0, 6000)}
`
},
{ role: "user", content: message }
```

이렇게 하면 “데이터는 여기 있다”를 더 명확하게 인식해서
헛소리가 조금 더 줄어드는 경향이 있어요.

---

## 5. `/api/chat` 라우트: Next.js 관점에서 보완 포인트

전체 흐름은 좋아요. 다만 실제 코드에서:

1. **Body 파싱 시 `await req.json()` 후 기본값 지정**
2. **에러 처리** – CareerNet 죽었을 때, GPT 에러 났을 때도 학생에게 너무 날 것의 에러를 안 보여주도록

예를 들어:

```ts
try {
  const { message, sessionId, userProfile } = await req.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: "message is required" }),
      { status: 400 }
    );
  }

  // ...의도 분석, CareerNet 호출, GPT 호출...

  return new Response(JSON.stringify({ answer }), {
    headers: { "Content-Type": "application/json" }
  });
} catch (e) {
  console.error(e);
  return new Response(
    JSON.stringify({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요." }),
    { status: 500 }
  );
}
```

이 정도만 있어도 수업 시간에 학생들이 동시에 들어왔을 때
갑자기 흰 화면이 되어버리는 사태를 꽤 줄일 수 있어요.

---

## 6. 프론트 채팅 컴포넌트: MVP로 충분, 나중에 이런 개선만

지금 기본 구조:

* `messages` state
* `/api/chat` 호출
* user/assistant 메시지 추가

→ 완전히 OK.

나중에:

1. **로딩 상태** (`isLoading`) 추가해서 버튼 비활성화
2. **에러 메시지 표시**
3. **세션 선택**

   * URL에 `?session_id=...`
   * 또는 왼쪽 사이드바에 “이전 상담 목록”을 띄워서 선택 가능하게

정도만 붙이면 수업용으로도 꽤 완성도 있어 보일 거예요.

---

## 7. “교육용 진로 상담”이라서, 프롬프트에 딱 하나 더

실제 학생이 쓸 거라서, system 프롬프트에 이런 정도는 추가하는 걸 추천해요:

* “진로를 강요하지 말 것”
* “학업 성적/소득만으로 직업 가치를 판단하지 말 것”
* “정서적으로 불안한 내용(자해, 도피 등)이 나오면, 신뢰할 수 있는 어른/선생님과 상의하라고 안내”

예시:

```text
너는 대한민국 중·고등학생을 대상으로 하는 진로 상담 교사다.
- 학생의 선택을 존중하며 강요하지 않는다.
- 특정 직업을 과도하게 이상화하거나, 소득만으로 좋고 나쁨을 판단하지 않는다.
- 상담 결과는 참고용이며, 중요한 진로 결정은 담임교사·보호자와 함께 상의하라고 안내한다.
- 학생이 불안, 우울, 자해 등 위험 신호를 보이는 경우에는
  반드시 신뢰할 수 있는 어른(담임선생님, 부모님, 학교 상담교사 등)에게 도움을 요청하라고 권한다.
```

이렇게 넣어두면, **실제 수업에서 써도 조금 더 안심**이 됩니다.

---

## 8. 결론: 지금 문서 상태

* **구조 설계** ✅
* **기술 스택 조합** ✅
* **DB 기본 스키마** ✅
* **API 래퍼 아이디어** ✅
* **GPT 오케스트레이션 흐름** ✅

수정이 필요한 건 “틀렸다” 수준이 아니라,

> “실제 배포/수업에서 좀 더 안정적으로 돌아가게 만드는 마무리 작업”

수준이라서, 지금 설계 문서는 **그대로 “진로상담 웹앱 기획서 v1.0”으로 써도 될 정도**라고 봐도 괜찮아요.

---
