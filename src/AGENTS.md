# src/AGENTS.md — 프론트엔드 규칙

## Module Context

React 19 + TypeScript 프론트엔드. `useComponentGenerator` 훅이 생성 상태를 관리하며, react-live가 생성된 컴포넌트를 런타임에 실행한다.

## react-live 제약 (가장 중요)

react-live로 실행되는 코드(AI가 생성한 컴포넌트)는 샌드박스 환경이다:

- `React`, `render` 함수는 전역으로 주입됨 — `import` 절대 사용 불가
- 훅 사용 시: `useState` 대신 `React.useState`, `React.useEffect` 형식
- 마지막 줄은 반드시 `render(<ComponentName />)` 이어야 함
- TypeScript 문법 불허 (타입 어노테이션, 인터페이스, 제네릭, `as` 캐스팅)
- 스타일: 인라인 스타일만 허용

이 제약은 `SYSTEM_PROMPT`(server/index.ts)와 `LivePreview.tsx`가 공동으로 강제한다.

## 상태 관리 패턴

새 상태나 비동기 로직이 필요하면 `App.tsx`에 직접 추가하지 말고 `useComponentGenerator` 훅을 확장한다.

`GeneratedComponent` 타입에 필드를 추가하려면 `src/types/index.ts`를 먼저 수정한다.

## 상태 영속성 전략

- **저장소**: localStorage (`generated-components` 키)
- **저장 방식**: 
  - 컴포넌트 목록이 변경될 때마다 `useEffect`로 자동 저장
  - `Date` 객체는 ISO 문자열로 직렬화
- **복원**:
  - 초기 상태를 lazy initializer로 로드
  - 런타임 타입 검증(`isValidComponentArray`)으로 손상된 데이터 감지
  - 검증 실패 시 경고 로그 후 빈 배열로 fallback
- **테스트**: `src/hooks/useComponentGenerator.test.ts` 참조

이 전략으로 새로고침 후에도 생성된 컴포넌트 목록이 유지된다.

## 컴포넌트 작업 패턴

- `ComponentCard`: 단일 생성 결과 표시. 탭(미리보기/코드) 전환 포함.
- `LivePreview`: react-live `LiveProvider` + `LivePreview` 래퍼. 에러 경계 내장.
- `CodeView`: 코드 표시 전용. 문법 하이라이팅 담당.
- `PromptInput`: 폼 제출 전용. 유효성 검사 없음 — 빈 프롬프트는 서버가 거부.

새 UI 기능은 기존 컴포넌트를 확장하거나, 위 패턴에 맞는 새 파일을 `src/components/`에 추가한다.

## Local Golden Rules

**금지:**
- `App.tsx`에 비즈니스 로직을 직접 추가하지 않는다. 훅으로 분리한다.
- `Provider` 타입에 `'anthropic' | 'google'` 외 값을 추가할 때 `server/index.ts`의 `ENV_KEYS`도 반드시 함께 수정한다.
- react-live 에러를 `console.error`로만 처리하지 않는다. `LivePreview` 에러 경계가 UI에 표시한다.

**준수:**
- API 호출은 `useComponentGenerator` 내 `fetch('/api/generate')`만 사용한다.
- 컴포넌트 ID는 `${Date.now()}-${randomString}` 패턴을 유지한다 (서버 상태 없이 고유성 보장).
