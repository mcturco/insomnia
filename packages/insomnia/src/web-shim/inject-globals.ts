// Injects the Electron/IPC window globals for the web research prototype.
//
// This MUST be imported as the FIRST import in entry.web.tsx. ES module imports
// are evaluated depth-first in source order BEFORE the importing module's body
// runs, and some renderer modules (e.g. auth-session-provider.client.ts) access
// window.main at module-load time. Assigning these globals from entry.web.tsx's
// body is too late — the import graph has already run. Doing it in a
// first-position side-effecting import guarantees the globals exist before any
// other import subtree evaluates.
import {
  appShim,
  clipboardShim,
  dialogShim,
  envShim,
  mainShim,
  pathShim,
  shellShim,
  webUtilsShim,
} from './window-main';

// Guarded for SSR: React Router runs root.tsx (which imports this module first)
// through an SSR/prerender pass to emit the HTML shell. There is no `window`
// there, and the shell doesn't need these globals — so skip injection on the
// server and only run it in the browser, where the renderer actually uses them.
if (typeof window !== 'undefined') {
  window.main = mainShim as any;
  window.dialog = dialogShim as any;
  window.app = appShim as any;
  window.shell = shellShim as any;
  window.clipboard = clipboardShim as any;
  window.webUtils = webUtilsShim as any;
  window.path = pathShim;
  window.env = envShim;
}
