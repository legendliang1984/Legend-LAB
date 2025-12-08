import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    server: {
      proxy: {
        '/api/jimeng': {
          target: 'https://visual.volcengineapi.com',
          changeOrigin: true,
          // 确保重写规则与 Netlify 的 behavior 一致
          // 本地请求 /api/jimeng?Action=... -> 目标 https://visual.volcengineapi.com?Action=...
          rewrite: (path) => path.replace(/^\/api\/jimeng/, ''),
        }
      }
    }
  };
});