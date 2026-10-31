# API 계약 v1

데이터는 data/snapshot.json의 26개 실제 공개 이슈를 사용한다. 

GET /api/dashboard?source=snapshot&query=&state=all&label=all
- source: snapshot 또는 live. live 실패 시 기존 snapshot-fallback·warning 유지.
- query: 앞뒤 공백 제거, 대소문자 무시, 맨 앞 # 제거 후 제목 또는 이슈 번호 부분 일치.
- state: all/open/closed. 다른 값은 HTTP 400, JSON {"error":"..."}.
- label: all/실제 라벨명/__unlabelled__. 알 수 없는 라벨은 정상 빈 결과.
- query/state/label은 AND. 생략하면 위 기본값. POST 등은 405·Allow: GET.
- 응답: 기존 repository/capturedAt/source/scope/warning/releases를 유지한다.
- issues: 서버에서 필터한 배열. total: 필터 전 전체 이슈 수. filtered: 결과 수.
- labels: 전체 데이터의 고유 라벨 이름 배열, 정렬. labelCounts: 전체 데이터 기준 [{name,count}], 한 이슈의 중복 라벨은 1회. 라벨 없는 이슈는 name="라벨 없음". count 내림차순, 동률은 이름 정렬.
- 빈 결과: 200·issues=[]·filtered=0. total/labels/labelCounts는 필터로 줄지 않는다.
- 로딩 중 오래된 응답이 최신 입력을 덮어쓰지 않아야 한다. 서버 오류는 UI에서 오류·다시 시도, 빈 검색은 조건 초기화.

프런트는 filterIssues/labelCounts로 다시 계산하지 않는다. fixture-default.json은 UI 단독 개발의 고정 응답 예이며 실제 API 검증을 대체하지 않는다. 최종 결과에서는 fixture를 사용하지 않는다.

작업 나누기: 화면 작업은 src/만, API 작업은 server/와 tests/만 고친다. contract/·data/·package*·acceptance/는 바꾸지 않는다.
