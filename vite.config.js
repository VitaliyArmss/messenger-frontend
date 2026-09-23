import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/messenger-frontend/',
    server: {
        proxy: {
            '/api': {
                target: 'https://localhost:7039',   // адрес вашего бэкенда
                changeOrigin: true,
                secure: false,                      // отключаем проверку SSL (для самоподписанных сертификатов)
                rewrite: (path) => path.replace(/^\/api/, '/api') // можно убрать, т.к. оставляем /api
            }
        }
    }
});