# Dashboard API

Node.js 22 이상에서 별도 의존성 없이 실행합니다.

```sh
node server/index.mjs
```

기본 포트는 `3001`이며 `PORT`로 변경할 수 있습니다. 기본 데이터는
프로젝트 루트의 `data/snapshot.json`입니다. 데이터가 별도 작업 트리에
있다면 `SNAPSHOT_PATH`에 해당 파일 경로를 지정합니다.

```sh
SNAPSHOT_PATH=/path/to/data/snapshot.json node server/index.mjs
SNAPSHOT_PATH=/path/to/data/snapshot.json node --test tests/*.test.mjs
```

`GET /api/dashboard`는 `source=snapshot`, `query=`, `state=all`,
`label=all`을 기본값으로 사용합니다. `source=live`는 GitHub 이슈와
릴리스를 조회하며, 5초 제한 또는 조회 실패 시 snapshot과 warning을
반환합니다. 검색 결과와 무관하게 `total`, `labels`, `labelCounts`는
선택된 데이터 전체를 기준으로 계산합니다.

기존 HTTP 서버에는 `createHandler()`를 연결하거나 `createApiServer()`로
별도 서버를 생성할 수 있습니다. 두 함수는 `server/index.mjs`에서 내보냅니다.
테스트에서는 `snapshotPath`, `fetchImpl`, `liveTimeoutMs` 옵션으로 실제
스냅샷과 결정적인 live 응답을 사용합니다. UI용 fixture는 사용하지 않습니다.
