# Todo App

## 기술 스택
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Express.js + TypeScript
- DB: SQLite (better-sqlite3)
- 테스트: Vitest
- 패키지 매니저: npm

## 프로젝트 구조
todo-app/
├── client/          # React 프론트엔드
│   └── src/
├── server/          # Express 백엔드
│   └── src/
├── package.json     # 루트 (워크스페이스)
└── CLAUDE.md

## 코딩 규칙
- TypeScript strict mode
- 함수형 컴포넌트 + hooks
- API 응답: { data, error } 형식
- 커밋 메시지: Conventional Commits (feat:, fix: 등)

## API 엔드포인트 (설계 예정)
- GET    /api/todos      - 전체 조회
- POST   /api/todos      - 생성
- PATCH  /api/todos/:id  - 수정 (완료 토글 등)
- DELETE /api/todos/:id  - 삭제
