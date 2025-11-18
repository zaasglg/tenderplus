import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: false,
        }),
        react(),
        tailwindcss(),
    ],

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

    build: {
        sourcemap: false,
        target: 'esnext',
        minify: 'esbuild',
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
