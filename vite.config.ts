import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: false, // ускоряет сборку
        }),
        react(),
        tailwindcss(),
    ],

    // МЕГА-ВАЖНО: отключаем проблемные пакеты, вызывающие зависание
    optimizeDeps: {
        exclude: [
            '@react-aria/utils',
            '@react-aria/interactions',
            '@react-aria/focus',
            '@react-aria/ssr',
            '@react-stately/utils',
            '@react-stately/overlays',
        ],
    },

    // Уменьшаем нагрузку на сервер → сборка быстрее
    build: {
        sourcemap: false, // очень ускоряет
        target: 'esnext',
        minify: 'esbuild', // быстрее, чем terser
        commonjsOptions: {
            include: [],
        },
    },

    esbuild: {
        jsx: 'automatic',
        legalComments: 'none',
    },

    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
});
