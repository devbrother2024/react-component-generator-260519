# AGENTS.md

## Operational Commands

```bash
bun run dev       # 프론트(5173) + API 서버(3002) 동시 실행
bun run server    # API 서버 단독 실행 (watch 모드)
bun run build     # TypeScript 컴파일 + Vite 번들
bun run lint      # ESLint 전체 검사
bun run preview   # 프로덕션 빌드 미리보기
```

패키지 매니저: **bun 고정** — npm, yarn, pnpm 사용 금지.

포트: 프론트 `5173`, API 서버 `3002`. Vite가 `/api/*`를 `3002`로 프록시.

## Golden Rules

**절대 금지:**
- API 키를 소스코드에 하드코딩하지 않는다. 반드시 `.env` 또는 런타임 입력을 사용한다.
- AI가 생성하는 컴포넌트 코드에 `import` 문을 포함시키지 않는다. react-live 런타임은 React를 전역으로 제공한다.
- `server/index.ts` 외부에서 AI API(Anthropic, Google)를 직접 호출하지 않는다. 모든 AI 호출은 서버를 통해서만 한다.
- 상태 영속성 로직(localStorage, DB 등)을 추가하지 않는다. 메모리 한정 설계가 의도적이다.

**항상 준수:**
- 생성된 컴포넌트 코드는 반드시 `render(<ComponentName />)` 호출로 끝나야 한다. `ensureRenderCall()`이 처리하나, AI 프롬프트도 이를 강제한다.
- 스타일은 인라인 스타일(`style={{}}`)만 허용한다. CSS 파일, CSS 모듈, Tailwind 사용 금지.
- TypeScript 타입 구문은 생성된 컴포넌트 코드에 포함되지 않는다. 순수 JavaScript만 허용.
- API 에러는 서버에서 잡아 `{error: string}` 형태로 반환한다. 프론트는 이를 에러 배너에 표시한다.

## Project Context

자연어 프롬프트로 React 컴포넌트를 생성하고 실시간으로 미리보는 웹 도구.

Tech Stack: React 19, TypeScript, Vite, Bun, react-live, Anthropic API, Google Generative AI API

## Standards & References

- 커밋 메시지: Conventional Commits 형식 (`feat:`, `fix:`, `chore:` 등)
- TypeScript strict 모드 사용 (`tsconfig.app.json` 기준)
- 컴포넌트 파일명: PascalCase (`ComponentCard.tsx`)
- 훅 파일명: camelCase with `use` prefix (`useComponentGenerator.ts`)
- 이 파일과 코드 사이에 괴리가 생기면 업데이트를 제안하라.

## Context Map

- **[프론트엔드 컴포넌트/훅 작업](./src/AGENTS.md)** — React 컴포넌트, 훅, 타입, App.tsx 수정 시.
- **[API 서버/AI 통합 작업](./server/AGENTS.md)** — Bun 서버, AI API 호출, 엔드포인트 수정 시.
- **[TDD 규칙](./.claude/rules/tdd.md)** — 비즈니스 로직, API, 유틸리티, 커스텀 훅 개발 시 RED-GREEN-REFACTOR 사이클.
