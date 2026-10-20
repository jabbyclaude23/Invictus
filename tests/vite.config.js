import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtureFirebase = resolve(root, 'tests/fixtures/firebase.js');
const routes = new Set(['/', '/auth', '/workout', '/meals', '/trading', '/coach']);
export default defineConfig({
  root,
  plugins: [
    {
      name: 'local-fixture-services',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === 'firebase/auth' || source === 'firebase/firestore') return fixtureFirebase;
        if (source === 'virtual:pwa-register') return '\0fixture-pwa';
        if (importer && source.startsWith('.')) {
          const normalized = resolve(importer.split('?')[0], '..', source).replaceAll('\\', '/').replace(/\.js$/, '');
          if (normalized === resolve(root, 'src/firebase').replaceAll('\\', '/')) return fixtureFirebase;
        }
      },
      load(id) { if (id === '\0fixture-pwa') return 'export const registerSW = () => () => {};'; },
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url, 'http://localhost');
          if (routes.has(url.pathname) && (request.headers.accept || '').includes('text/html')) request.url = `/tests/preview.html${url.search}`;
          next();
        });
      },
    },
    react(),
  ],
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: { rollupOptions: { input: resolve(root, 'tests/preview.html') } },
});
