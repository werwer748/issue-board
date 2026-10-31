import { spawn } from 'node:child_process';
// API 서버(PORT)와 Vite 프록시(API_PORT)가 같은 포트를 쓰도록 한 값으로 맞춘다.
const apiPort = process.env.API_PORT ?? process.env.PORT ?? '4174';
const env = { ...process.env, PORT: apiPort, API_PORT: apiPort };
const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit', env }),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
// 시그널로 죽은 경우(code=null)는 실패로 본다.
for (const child of children) child.on('exit', (code, signal) => {
  if (!closing) stop(signal ? 1 : code ?? 0);
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
