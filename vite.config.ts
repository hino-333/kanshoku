/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // public/assets（イラスト）と混ざらないよう、ビルドしたJS・CSSは別フォルダへ
  build: { assetsDir: '_app' },
  server: { host: true, port: 5173 },
  test: { environment: 'jsdom', include: ['src/test/**/*.test.ts'] },
});
