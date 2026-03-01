import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/vmstat/',
    server: {
        port: 3000,
        proxy: {
            '/vmstat/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/vmstat\/api/, '/vmstat/api'); },
            },
        },
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});
