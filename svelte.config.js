import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'index.html',
            precompress: false,
            strict: true
        }),
        alias: {
            "@/*": "./src/*",
            "$lib/*": "./src/lib/*"
        },
        // [NUEVO]: Apagamos la validación de origen estricta porque el CF Worker reescribe el Host.
        // La seguridad real está en las sesiones cifradas de Supabase, no en la URL.
        csrf: {
            checkOrigin: false
        }
    }
};

export default config;
