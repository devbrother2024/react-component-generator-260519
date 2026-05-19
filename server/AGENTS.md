# server/AGENTS.md — Bun API 서버 규칙

## Module Context

단일 파일 Bun HTTP 서버(`server/index.ts`). AI API 호출, 응답 정제, CORS 처리를 담당한다. 외부 라이브러리 없이 `fetch` + `Bun.serve` 사용.

## 엔드포인트 규칙

현재 엔드포인트:
- `GET /api/config` — 환경변수 키 존재 여부만 반환. 키 값 자체는 절대 노출하지 않는다.
- `POST /api/generate` — `{prompt, apiKey?, provider}` 수신 → AI 호출 → `{code}` 반환.

새 엔드포인트 추가 시 `CORS_HEADERS`를 모든 응답에 포함해야 한다.

## AI API 통합 패턴

**Anthropic (`callAnthropic`):**
- 모델: `claude-haiku-4-5-20251001`
- 헤더: `x-api-key`, `anthropic-version: 2023-06-01`
- `max_tokens: 4096`

**Google (`callGoogle`):**
- 모델: `gemini-2.5-flash`
- `generationConfig.maxOutputTokens: 8192`
- `finishReason === 'MAX_TOKENS'` 일 때 명시적 에러 처리 필수

공통: 두 함수 모두 `SYSTEM_PROMPT`를 시스템 인스트럭션으로 전달한다.

## SYSTEM_PROMPT 수정 규칙

`SYSTEM_PROMPT`는 react-live 런타임 제약을 강제하는 핵심이다. 수정 시 반드시 검증:
1. `import` 문 금지 조항 유지
2. `render(<ComponentName />)` 호출 강제 조항 유지
3. TypeScript 문법 금지 조항 유지
4. 인라인 스타일 전용 조항 유지

## 코드 정제 함수

- `stripCodeFences(text)` — AI가 마크다운 코드 블록으로 감싸는 경우 제거
- `ensureRenderCall(code)` — `render()` 누락 시 컴포넌트 이름 추출해 자동 추가

두 함수는 AI 출력의 공통 결함을 보정한다. 모델 변경 시 새로운 결함 패턴이 생기면 여기에 추가한다.

## 에러 처리 패턴

HTTP 상태코드별 처리:
- `429` — 요청 과다 메시지 반환
- `503` — 서버 과부하 메시지 반환
- 그 외 — `err.message` 그대로 반환

모든 에러는 `{error: string}` 형태로 반환한다. 에러 상세를 클라이언트에 과다 노출하지 않는다.

## Local Golden Rules

**금지:**
- `resolveApiKey()`를 우회해 `process.env`에 직접 접근하지 않는다.
- `server/index.ts`를 분리하거나 라우터 라이브러리를 도입하지 않는다. 단일 파일 구조가 의도적이다.
- 새 Provider 추가 시 `ENV_KEYS` 레코드와 `callXxx()` 함수를 반드시 쌍으로 추가한다.

**준수:**
- API 키 존재 여부는 `!!ENV_KEYS[provider]` 패턴으로 Boolean화해서만 클라이언트에 전달한다.
- 서버는 stateless — 요청 간 상태를 저장하지 않는다.
