import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 모드에서 /api 요청을 API 서버로 넘긴다. 포트는 API_PORT로 바꿀 수 있다.
const apiPort = process.env.API_PORT || 4174;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
});
