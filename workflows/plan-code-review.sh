#!/usr/bin/env bash
# 부탁 하나를 계획(Codex) → 사람 승인 → 구현(Claude Code) → 리뷰(Codex) 순서로 돌린다.
# 사용: workflows/plan-code-review.sh "만들 기능"
set -euo pipefail
TASK="$1"

# 지금 패널 옆에 새 패널을 만들고, 그 안에 에이전트를 띄운다
start() {
  local name=$1 kind=$2 dir=$3; shift 3
  local pane
  pane=$(herdr pane split --current --direction "$dir" --cwd "$PWD" --no-focus | jq -r .result.pane.pane_id)
  herdr agent start "$name" --kind "$kind" --pane "$pane" -- "$@" > /dev/null
}

# Codex 화면에서 마지막 답변만 남긴다(표준 입력 → 표준 출력).
# 화면 아래쪽에는 빈 줄, 입력창(› Ask Codex …), 상태 줄이 깔려 있으므로
# 빈 줄을 빼고, 마지막 › 줄(입력창)부터 끝까지 잘라 낸 뒤,
# 그 앞의 마지막 사용자 메시지(›)나 작업 시간 구분선(─ Worked for …) 다음의 첫 • 줄부터 남긴다.
last_reply() {
  awk '
    { sub(/\r$/, "") }
    /^[[:space:]]*$/ { next }
    { line[++n] = $0 }
    END {
      for (i = n; i >= 1; i--) if (line[i] ~ /^[[:space:]]*› /) { n = i - 1; break }
      start = 1
      for (i = n; i >= 1; i--) if (line[i] ~ /^[[:space:]]*› / || line[i] ~ /─ Worked for /) { start = i + 1; break }
      for (i = start; i <= n; i++) if (line[i] ~ /^[[:space:]]*• /) { start = i; break }
      for (i = start; i <= n; i++) print line[i]
    }
  '
}

# planner의 마지막 답변을 읽는다. 아래쪽 빈 줄이 읽을 줄 수를 다 채우지 않도록 넉넉히 읽고 걸러 낸다.
read_reply() {
  herdr agent read planner --source recent-unwrapped --lines 200 | last_reply
}

# 1. 계획: Codex가 코드는 고치지 않고 계획만 쓴다
start planner codex right
herdr agent prompt planner "코드는 고치지 말고, 다음 일을 어떻게 할지 다섯 줄 이내 계획만 써 줘: $TASK" --wait > /dev/null
PLAN=$(read_reply)
[ -n "$PLAN" ] || { echo "계획을 읽지 못해 멈췄습니다. planner 패널을 확인하세요." >&2; exit 1; }

# 2. 승인: 사람이 계획을 읽고 y를 눌러야 다음으로 간다
printf '%s\n' "$PLAN"
read -r -p "이 계획대로 진행할까요? [y/N] " ok
[ "$ok" = "y" ] || { echo "멈췄습니다."; exit 1; }

# 3. 구현: Claude Code가 계획대로 고친다(파일 수정과 테스트·빌드는 묻지 않고 진행)
start coder claude down --permission-mode acceptEdits --allowedTools "Bash(npm test:*)" "Bash(npm run build:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(ls:*)"
herdr agent prompt coder "다음 계획대로 구현하고 npm test를 돌려 줘. 커밋은 하지 마. 계획: $PLAN" --wait --timeout 900000 > /dev/null
# 허락을 기다리며 멈추면 알림을 띄우고, 사람이 답할 때까지 기다린다
while [ "$(herdr agent get coder | jq -r .result.agent.agent_status)" = blocked ]; do
  herdr notification show "coder가 허락을 기다려요" --sound request > /dev/null
  herdr agent wait coder --until idle --until done --timeout 900000 > /dev/null || true
done

# 4. 리뷰: 다른 모델(Codex)이 바뀐 코드를 검토한다
herdr agent prompt planner "방금 바뀐 코드(git diff)를 리뷰하고, 문제만 세 줄 이내로 알려 줘" --wait > /dev/null
REVIEW=$(read_reply)
if [ -n "$REVIEW" ]; then
  printf '%s\n' "$REVIEW"
else
  echo "리뷰 결과를 읽지 못했습니다. planner 패널을 확인하세요." >&2
fi
echo "끝. 바뀐 코드는 git diff로 확인하세요."
