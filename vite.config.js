import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/* index.html is the home page: its sections are written into the HTML from public/data/*.csv, on every
   dev request and at build. app/index.html is the React app with the analytics pages.
   The renderer is loaded at request time, so editing it, the data date or the data needs no restart. */
const RENDER = './home/render.mjs';
const home = () => ({
  name: 'nacc-home',
  transformIndexHtml: {
    order: 'pre',
    async handler(html, { server }) {
      if (!html.includes('<!--home-->')) return html;
      let module;
      if (server) {
        // drop the dev server's copies of the renderer and of what it imports, so it is never stale
        for (const m of server.moduleGraph.idToModuleMap.values()) {
          if (m.ssrModule || m.ssrTransformResult) server.moduleGraph.invalidateModule(m);
        }
        module = await server.ssrLoadModule(RENDER.slice(1));
      } else {
        module = await import(/* @vite-ignore */ pathToFileURL(RENDER).href);
      }
      return html.replace('<!--home-->', () => module.renderHome());
    },
  },
  configureServer(server) {
    const root = server.config.root.split(sep).join('/');
    const sources = ['public/data/', 'home/', 'src/data-date.js', 'src/brand/', 'src/utils/'];
    server.watcher.on('all', (event, f) => {
      const file = f.split(sep).join('/').replace(`${root}/`, '');
      if (sources.some((s) => file.startsWith(s))) server.ws.send({ type: 'full-reload' });
    });
  },
});

/* The design kit's scripts are plain files in public/assets. Their tags are added after Vite has read the
   page: written in index.html, the dev server would try to transform them and log an error for each. */
const KIT_SCRIPTS = ['system.js', 'motion/motion.js', 'layout/layout.js'];
const kitScripts = () => {
  let base = '/';
  return {
    name: 'nacc-kit-scripts',
    configResolved(config) { base = config.base; },
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace(
        '<!--kit-scripts-->',
        () => KIT_SCRIPTS.map((s) => `<script type="module" src="${base}assets/${s}"></script>`).join('\n')
      ),
    },
  };
};

export default defineConfig({
  plugins: [react(), home(), kitScripts()],
  base: '/nacc-all-players/',
  server: {
    port: 5173,
    open: true,
    watch: { ignored: ['**/.taste-skill/**', '**/.claude/**'] },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { home: 'index.html', app: 'app/index.html' },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-gl': ['echarts-gl'],
        },
      },
    },
  },
});
