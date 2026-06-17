// Vite config for the web research prototype.
// Forks vite.config.ts but:
//   - Replaces the Electron-specific entry (entry.client.tsx → entry.web.tsx)
//   - Stubs out Node.js / Electron modules that the browser can't load
//   - Outputs to dist-web/ so the regular Electron build is unaffected
//   - Skips the electronNodeRequire plugin

import fs from 'node:fs';
import path from 'node:path';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const webEntryPath = path.resolve(__dirname, './src/entry.web.tsx');
const electronEntryPath = path.resolve(__dirname, './src/entry.client.tsx');

// Packages that are genuinely impossible to bundle for the browser.
// NOTE: only list packages that use Node.js built-ins (fs, path, os, crypto…)
// and have no browser build. Don't list packages here just because they were
// in Electron's externalDependencies — those were external only because
// Electron's require() handled them at runtime. In the browser, Vite can
// bundle browser-compatible packages (tough-cookie, mocha, swagger-parser)
// directly instead.
const STUB_MODULES = [
  // NeDB uses Node.js fs, path, os — stub so tree-shaking can drop createNedbDatabase
  '@seald-io/nedb',
  // Electron — should never appear in renderer code but just in case
  'electron',
  // Native curl binding — definitely Node.js native addon
  '@getinsomnia/node-libcurl',
  // jshint — has its own named-export stub below (src/web-shim/stubs/jshint.ts)
];

export default defineConfig(({ mode }) => {
  const __DEV__ = mode !== 'production';

  return {
    define: {
      '__DEV__': JSON.stringify(__DEV__),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.INSOMNIA_ENV': JSON.stringify('web'),
      // Browser-safe shim for the bare `process` global. The specific
      // `process.env.*` / `process.type` defines below take precedence (esbuild
      // matches the longest dotted path), so this only catches everything else:
      //   - dynamic access like `process[ENV]` in common/constants.ts, which
      //     runs at module-load — before entry.web.tsx sets window.env — and
      //     would otherwise throw "process is not defined".
      //   - stray `process.platform` / `process.versions.node` reads in deps.
      // Giving it `env`/`versions` objects means those reads return undefined
      // instead of crashing on property access of undefined.
      'process': JSON.stringify({ env: {}, platform: 'browser', type: 'renderer', versions: {} }),
      // Node.js packages reference `global`; browsers only have `globalThis`.
      'global': 'globalThis',
      // Override so Electron-conditional branches (process.type === 'renderer')
      // still behave, while 'web' lets us add our own guards later.
      ...(!__DEV__ ? { 'process.type': JSON.stringify('renderer') } : {}),
    },

    // Isolated cache so the web build's optimized dep hashes never collide
    // with the Electron build's cache in node_modules/.vite
    cacheDir: 'node_modules/.vite-web',

    // Web-specific static assets (includes _redirects for Cloudflare Pages SPA routing).
    // Keeps this separate from the Electron build's public/ folder.
    publicDir: 'public-web',

    server: {
      port: 3335, // different port to avoid clashing with the Electron dev server
    },

    build: {
      outDir: 'dist-web',
      target: 'esnext',
      sourcemap: false,
      rollupOptions: {
        // Nothing is truly external for the browser build — we want everything bundled.
      },
    },

    optimizeDeps: {
      // Only exclude the truly un-bundleable packages (the stub targets).
      // tough-cookie, mocha, swagger-parser are browser-compatible and should
      // be pre-bundled normally.
      exclude: [...STUB_MODULES],
      // Do NOT use force:true — it regenerates dep hashes on every server start,
      // which causes the browser to always get 504 "Outdated Optimize Dep" responses.
      include: ['codemirror-graphql/utils/SchemaReference', '@stoplight/spectral-core', 'isomorphic-git'],
    },

    resolve: {
      alias: {
        // ── Adapter overrides (must come before the '~' catch-all) ──────────
        '~/network/network-adapter': path.resolve(__dirname, './src/network/network-adapter.renderer'),
        '~/templating/render-adapter': path.resolve(__dirname, './src/templating/render-adapter.renderer'),
        '~': path.resolve(__dirname, './src'),

        // ── Stub Node.js / Electron packages ────────────────────────────────
        // Generic empty stub for packages that are never called in browser paths.
        ...Object.fromEntries(
          STUB_MODULES.map(mod => [mod, path.resolve(__dirname, './src/web-shim/module-stub.ts')]),
        ),

        // ── Node.js built-in polyfills ────────────────────────────────────────
        // Vite externalizes Node.js built-ins by default (making them empty stubs
        // that throw on any property access). Alias them to browser polyfills so
        // transitive deps (mocha, jshint, tough-cookie…) don't crash at import time.
        'node:util': path.resolve(__dirname, './src/web-shim/polyfills/node-util.ts'),
        'util': path.resolve(__dirname, './src/web-shim/polyfills/node-util.ts'),

        // ── Package-specific stubs (named exports required) ──────────────────
        // Use dedicated stubs when the consumer does named imports that the
        // generic empty-default stub can't satisfy.
        'jshint': path.resolve(__dirname, './src/web-shim/stubs/jshint.ts'),
        // insomnia-testing pulls in mocha → node:util → crash. Stub the whole
        // package; test-suite routes will fail gracefully at runtime only.
        'insomnia-testing': path.resolve(__dirname, './src/web-shim/stubs/insomnia-testing.ts'),

        // ── insomnia-data/node: skip the NeDB export, use only services ─────
        // The default export of insomnia-data/node also re-exports createNedbDatabase
        // which pulls in @seald-io/nedb.  Point this path directly at the
        // services barrel so tree-shaking doesn't have to deal with it.
        // __dirname = packages/insomnia/, so ../insomnia-data = packages/insomnia-data/
        'insomnia-data/node': path.resolve(
          __dirname,
          '../insomnia-data/node-src/services/index.ts',
        ),

        // ── path shim (carry over from main config) ──────────────────────────
        'path': path.resolve(__dirname, './src/path-shim.ts'),
      },
    },

    plugins: [
      // Swap entry.client.tsx's *source* for entry.web.tsx's, while keeping the
      // module identity as entry.client.tsx.
      //
      // We use load() (not resolveId()) deliberately. A resolveId() redirect
      // changes the module's id to entry.web.tsx, so the emitted chunk's
      // facadeModuleId becomes entry.web.tsx. React Router's SPA build then runs
      // an SSR/manifest pass that looks up the client-entry chunk by its
      // configured path (entry.client.tsx) and throws "Chunk not found:
      // …/entry.client.tsx", so no index.html is ever emitted.
      //
      // load() keeps the id as entry.client.tsx (RR's lookup succeeds) but
      // returns entry.web.tsx's contents. Both files live in src/, so the
      // relative imports inside entry.web.tsx (./ui/log, ./web-shim/…) resolve
      // identically from either location.
      {
        name: 'web-entry-override',
        enforce: 'pre',
        load(id: string): string | null {
          const clean = id.split('?')[0];
          if (clean === electronEntryPath || clean.endsWith('/entry.client.tsx')) {
            return fs.readFileSync(webEntryPath, 'utf-8');
          }
          return null;
        },
      },

      // Inject the window.main/dialog/app stubs before the route graph evaluates.
      //
      // React Router's client bootstrap STATICALLY imports root.tsx (as route0)
      // and only then DYNAMICALLY imports the entry. Static imports are hoisted
      // and evaluated first, so root.tsx → auth-session-provider.client.ts runs
      // its module-load access of window.main.sealedBox BEFORE entry.web.tsx's
      // body (where the stubs would otherwise be injected). Prepending the
      // inject-globals side-effect import as root.tsx's FIRST import guarantees
      // the globals exist before anything in the eager route graph touches them.
      {
        name: 'web-inject-globals-first',
        enforce: 'pre',
        transform(code: string, id: string): string | null {
          const clean = id.split('?')[0];
          if (clean.endsWith('/src/root.tsx')) {
            return `import '~/web-shim/inject-globals';\n${code}`;
          }
          return null;
        },
      },

      reactRouter(),

      tailwindcss(),
    ],

    worker: {
      format: 'es',
    },
  };
});
