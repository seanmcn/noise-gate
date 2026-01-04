import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '::',
    port: 3000,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.amplify/**',
        '**/dist/**',
        '**/.vite/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@noise-gate/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
