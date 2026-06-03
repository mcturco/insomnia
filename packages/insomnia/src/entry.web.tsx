// Web research prototype entry point.
// Replaces the Electron preload bridge with in-memory stubs so the app
// renders in a plain browser without any Electron or Node.js dependencies.

// renderer-listeners.ts is intentionally omitted: it registers window.main.on()
// handlers for Electron IPC events (toggle-preferences, reload-plugins, etc.)
// that never fire in a plain browser environment.
import './ui/log';

import { configureFetch } from 'insomnia-api';
import { initDatabase, initServices } from 'insomnia-data';
// Resolved by Vite alias to node-src/services/index.ts (skips the NeDB import)
import { servicesNodeImpl } from 'insomnia-data/node';
import { startTransition, StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

import { insomniaFetch } from '~/common/insomnia-fetch';
import { database as clientDatabase } from '~/ui/database.client';

import { applyColorScheme } from './plugins/misc';
import { HtmlElementWrapper } from './ui/components/html-element-wrapper';
import { showModal } from './ui/components/modals';
import { AlertModal } from './ui/components/modals/alert-modal';
import { PromptModal } from './ui/components/modals/prompt-modal';
import { WrapperModal } from './ui/components/modals/wrapper-modal';
import { initializeSentry } from './ui/sentry';
import { getInitialEntry } from './utils/router';
import { createInMemoryDatabase } from './web-shim/database-memory';
import { MOCK_ACCOUNT_ID, MOCK_ORG_ID, seedMockData } from './web-shim/mock-data';
import { PasscodeGate } from './web-shim/passcode-gate';
import {
  appShim,
  clipboardShim,
  dialogShim,
  envShim,
  mainShim,
  pathShim,
  shellShim,
  webUtilsShim,
} from './web-shim/window-main';

// ─── 0. Passcode gate ─────────────────────────────────────────────────────────
// Rendered in its own React root before the app bootstrap. Skipped when:
//   a) VITE_PASSCODE_HASH is not set (local dev without the env var), or
//   b) sessionStorage already holds a valid auth flag for this session.
const PASSCODE_HASH = import.meta.env.VITE_PASSCODE_HASH as string | undefined;
if (PASSCODE_HASH && sessionStorage.getItem('prototype-authed') !== 'true') {
  const gateEl = document.createElement('div');
  document.body.appendChild(gateEl);
  await new Promise<void>(resolve => {
    const gateRoot = createRoot(gateEl);
    gateRoot.render(
      <PasscodeGate
        expectedHash={PASSCODE_HASH}
        onAuthed={() => {
          sessionStorage.setItem('prototype-authed', 'true');
          gateRoot.unmount();
          gateEl.remove();
          resolve();
        }}
      />,
    );
  });
}

// ─── 1. Inject window globals before anything else runs ───────────────────────
// The renderer code accesses window.main/dialog/app etc. at module load time
// in some places, so these must be set synchronously before any other imports
// fire side effects.
window.main = mainShim as any;
window.dialog = dialogShim as any;
window.app = appShim as any;
window.shell = shellShim as any;
window.clipboard = clipboardShim as any;
window.webUtils = webUtilsShim as any;
window.path = pathShim;
window.env = envShim;

// ─── 2. Initialize in-memory database ────────────────────────────────────────
// Create a fresh in-memory store. The clientDatabase proxy (database.client.ts)
// already routes calls through window.database.invoke(). Instead, for the web
// build we wire the IDatabase singleton directly to our memory impl so the
// client proxy (and all routes/services) works without any IPC.
const memDb = createInMemoryDatabase();

// Override window.database so that database.client.ts's invoke() calls hit
// our in-memory implementation directly instead of going through IPC.
window.database = {
  invoke: async <T,>(fnName: string, ...args: unknown[]): Promise<T> => {
    const fn = (memDb as any)[fnName];
    if (typeof fn !== 'function') {
      throw new Error(`[web-db] Unknown database method: ${fnName}`);
    }
    return fn.apply(memDb, args) as T;
  },
};

// ─── 3. Initialize the insomnia-data singleton ────────────────────────────────
// clientDatabase.init() is a no-op (renderer bridge impl), but initDatabase()
// sets the shared `database` export that services and routes import.
await initDatabase(clientDatabase);

// ─── 4. Initialize services ───────────────────────────────────────────────────
// Use the real node services with organization stubbed out: the real impl calls
// the Insomnia cloud API which requires auth we don't have in the prototype.
// Instead, read from the localStorage values we seed below.
initServices({
  ...servicesNodeImpl,
  organization: {
    list: async () => {
      return JSON.parse(window.localStorage.getItem(`${MOCK_ACCOUNT_ID}:organizations`) ?? '[]');
    },
    get: async (id: string) => {
      const orgs = JSON.parse(window.localStorage.getItem(`${MOCK_ACCOUNT_ID}:organizations`) ?? '[]');
      return orgs.find((o: { id: string }) => o.id === id);
    },
  },
} as typeof servicesNodeImpl);

// ─── 5. Seed mock data ────────────────────────────────────────────────────────
await seedMockData(memDb);

// ─── 6. Skip onboarding; seed localStorage for the logged-in org experience ──
// getInitialEntry() reads these keys synchronously, so they must be set first.
if (!window.localStorage.getItem('hasSeenOnboardingV12')) {
  window.localStorage.setItem('hasSeenOnboardingV12', 'true');
}

// Fake org/user/plan in localStorage — the organization route loader reads these
// instead of calling the real API. syncOrganizations() will try to overwrite them
// on mount but will fail (no real auth) and catch the error silently, leaving our
// seeded values intact.
const mockOrg = {
  id: MOCK_ORG_ID,
  name: 'mock-org',
  display_name: 'My Organization',
  metadata: {
    organizationType: 'personal',
    ownerAccountId: MOCK_ACCOUNT_ID,
  },
};
const mockUser = {
  id: MOCK_ACCOUNT_ID,
  first_name: 'Proto',
  last_name: 'User',
  email: 'prototype@example.com',
  emails: [],
  is_externally_provisioned: false,
  encryption_enabled: false,
  created_at: new Date().toISOString(),
};
const mockPlan = {
  isActive: true,
  period: 'month',
  planId: 'mock-plan',
  price: 0,
  quantity: 1,
  type: 'individual',
  planName: 'Individual',
  status: 'active',
  trialingEnd: '',
};

if (!window.localStorage.getItem(`${MOCK_ACCOUNT_ID}:organizations`)) {
  window.localStorage.setItem(`${MOCK_ACCOUNT_ID}:organizations`, JSON.stringify([mockOrg]));
}
if (!window.localStorage.getItem(`${MOCK_ACCOUNT_ID}:user`)) {
  window.localStorage.setItem(`${MOCK_ACCOUNT_ID}:user`, JSON.stringify(mockUser));
}
if (!window.localStorage.getItem(`${MOCK_ACCOUNT_ID}:currentPlan`)) {
  window.localStorage.setItem(`${MOCK_ACCOUNT_ID}:currentPlan`, JSON.stringify(mockPlan));
}

// ─── 7. Rest of the app bootstrap (mirrors entry.client.tsx) ─────────────────
initializeSentry();

configureFetch(options => insomniaFetch({ ...options, onDeepLink: (uri: string) => window.main.openDeepLink(uri) }));

try {
  window.showAlert = options => showModal(AlertModal, options);
  window.showPrompt = options =>
    showModal(PromptModal, {
      ...options,
      title: options?.title || '',
    });
  window.showWrapper = options =>
    showModal(WrapperModal, {
      ...options,
      title: options?.title || '',
      body: <HtmlElementWrapper el={options?.body} onUnmount={options?.onHide} />,
    });
} catch (e) {
  console.log('[web] Failed to register modal helpers', e);
}

// Apply color scheme from settings (settings were seeded above)
try {
  const { services } = await import('insomnia-data');
  const appSettings = await services.settings.getOrCreate();
  applyColorScheme(appSettings);
} catch (e) {
  console.warn('[web] Could not apply color scheme', e);
}

const initialEntry = await getInitialEntry();

if (typeof initialEntry === 'string' && window.location.pathname !== initialEntry) {
  console.log('[entry.web] Initial entry:', initialEntry);
  window.location.pathname = initialEntry;
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
