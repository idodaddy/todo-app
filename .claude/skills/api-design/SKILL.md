---
name: api-design
description: API 엔드포인트를 추가하거나 수정할 때 자동으로 참조됩니다.
---

# API 설계 규칙

## 응답 형식
모든 API는 다음 형식을 따릅니다:
```typescript
// 성공
{ "data": T, "error": null }

// 실패
{ "data": null, "error": { "code": string, "message": string } }
```

## 라우트 패턴
```typescript
// routes/resource.ts 예시
router.get('/', async (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items').all();
    res.json({ data: items, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: e.message } });
  }
});
```

## 체크리스트
새 엔드포인트를 만들 때 반드시:
- [ ] 입력 검증 (잘못된 값이 들어오면 400 반환)
- [ ] try-catch로 에러 핸들링
- [ ] 응답 형식 { data, error } 준수
- [ ] CLAUDE.md의 API 엔드포인트 목록 업데이트
