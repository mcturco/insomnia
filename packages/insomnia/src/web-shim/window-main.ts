// Stub implementations of all Electron/IPC APIs for the web research prototype.
// Every method returns a safe, no-op result so the UI renders without crashing.

import builtInThemes from '../plugins/themes';

const noop = () => {};
const noopAsync = async () => {};
const noopUnsubscribe = () => noop;

// ─── In-memory secret storage ────────────────────────────────────────────────
const secretMap = new Map<string, string>();
const secretStorage = {
  setSecret: async (_key: string, secret: string) => { secretMap.set(_key, secret); },
  getSecret: async (key: string) => secretMap.get(key) ?? null,
  deleteSecret: async (key: string) => { secretMap.delete(key); },
  encryptString: async (raw: string) => raw,
  decryptString: async (cipherText: string) => cipherText,
};

// ─── In-memory electron storage (fallback localStorage wrapper) ───────────────
const electronStorage = {
  getItem: async (key: string) => window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => { window.localStorage.setItem(key, value); },
};

// ─── Network stubs ────────────────────────────────────────────────────────────
const webSocket = {
  open: noopAsync,
  close: noop,
  closeAll: noop,
  readyState: { getCurrent: async () => null },
  event: { findMany: async () => [], send: noopAsync },
};

const socketIO = {
  open: noopAsync,
  close: noop,
  closeAll: noop,
  readyState: { getCurrent: async () => null },
  event: { findMany: async () => [], send: noopAsync, on: noop, off: noop },
};

const curl = {
  open: noopAsync,
  close: noop,
  closeAll: noop,
  readyState: { getCurrent: async () => null },
  event: { findMany: async () => [] },
};

const grpc = {
  start: noop,
  sendMessage: noop,
  commit: noop,
  cancel: noop,
  closeAll: noop,
  loadMethods: async () => [],
  loadMethodsFromReflection: async () => [],
  writeProtoFile: noopAsync,
};

const mcp = {
  connect: noopAsync,
  close: noopAsync,
  closeAll: noop,
  authConfirmation: noop,
  primitive: {
    listTools: async () => [],
    callTool: noopAsync,
    listResources: async () => [],
    listResourceTemplates: async () => [],
    readResource: noopAsync,
    subscribeResource: noopAsync,
    unsubscribeResource: noopAsync,
    listPrompts: async () => [],
    getPrompt: noopAsync,
  },
  notification: { rootListChange: noopAsync },
  readyState: { getCurrent: async () => null },
  client: {
    responseElicitationRequest: noop,
    responseSamplingRequest: noop,
    hasRequestResponded: async () => false,
    cancelRequest: noopAsync,
  },
  event: {
    findMany: async () => [],
    findNotifications: async () => [],
    findPendingEvents: async () => [],
  },
};

// ─── Git stub ─────────────────────────────────────────────────────────────────
const git = {
  loadGitRepository: async () => { throw new Error('Git not available in web prototype'); },
  getGitBranches: async () => ({ branches: [], current: null }),
  fetchGitRemoteBranches: async () => [],
  getProjectGitFileIssues: async () => [],
  validateGitRepositoryCredentials: async () => ({ valid: false }),
  initGitRepository: noopAsync,
  cloneGitRepository: async () => { throw new Error('Git not available in web prototype'); },
  getGitLog: async () => [],
  commitGitChanges: async () => { throw new Error('Git not available in web prototype'); },
  pushGitChanges: async () => { throw new Error('Git not available in web prototype'); },
  pullGitChanges: async () => { throw new Error('Git not available in web prototype'); },
  gitFetch: async () => { throw new Error('Git not available in web prototype'); },
  checkoutGitBranch: async () => { throw new Error('Git not available in web prototype'); },
  mergeGitBranch: async () => { throw new Error('Git not available in web prototype'); },
  createGitBranch: async () => { throw new Error('Git not available in web prototype'); },
  deleteGitBranch: async () => { throw new Error('Git not available in web prototype'); },
  deleteGitRemoteBranch: async () => { throw new Error('Git not available in web prototype'); },
  getGitRollbackChanges: async () => [],
  rollbackGitChanges: async () => { throw new Error('Git not available in web prototype'); },
  discardGitChanges: async () => { throw new Error('Git not available in web prototype'); },
  getGitCanPush: async () => false,
  getGitRemoteChanges: async () => ({ behind: 0, ahead: 0 }),
  continueGitMerge: async () => { throw new Error('Git not available in web prototype'); },
  abortGitMerge: async () => { throw new Error('Git not available in web prototype'); },
  getGitStageStatus: async () => ({ staged: [], unstaged: [], untracked: [] }),
  stageGitFiles: async () => { throw new Error('Git not available in web prototype'); },
  unstageGitFiles: async () => { throw new Error('Git not available in web prototype'); },
};

// ─── Sync stub ────────────────────────────────────────────────────────────────
const sync = {
  archiveProject: noopAsync,
  checkout: noopAsync,
  compareRemoteBranch: async () => ({ ahead: 0, behind: 0 }),
  fork: noopAsync,
  getActiveBackendProject: async () => null,
  getBranchNames: async () => [],
  getCurrentBranchName: async () => 'main',
  getHistory: async () => [],
  getHistoryCount: async () => 0,
  getRemoteBranchNames: async () => [],
  getVersion: async () => null,
  hasBackendProject: async () => false,
  localBackendProjects: async () => [],
  merge: noopAsync,
  pull: noopAsync,
  pullRemoteBackendProject: noopAsync,
  push: noopAsync,
  remoteBackendProjects: async () => [],
  remoteBackendProjectsOfTeam: async () => [],
  removeBackendProjectsForRoot: noopAsync,
  removeBranch: noopAsync,
  removeRemoteBranch: noopAsync,
  rollback: noopAsync,
  rollbackToLatest: noopAsync,
  resolveConflict: noop,
  cancelConflict: noop,
  stage: noopAsync,
  status: async () => ({ stage: {}, unstaged: {} }),
  switchAndCreateBackendProjectIfNotExist: noopAsync,
  takeSnapshot: noopAsync,
  unstage: noopAsync,
  on: (_channel: string, _listener: any) => noopUnsubscribe(),
};

// ─── LLM stub ─────────────────────────────────────────────────────────────────
const llm = {
  getActiveBackend: async () => null,
  getConfig: async () => null,
  updateBackendConfig: noopAsync,
  getAvailableModels: async () => [],
};

// ─── Plugin stubs ─────────────────────────────────────────────────────────────
const plugins = {
  applyRequestHooks: async () => ({ request: null }),
  applyResponseHooks: async () => ({ request: null }),
  executeAction: noopAsync,
  executePluginMainAction: noopAsync,
  executeMainAction: noopAsync,
  runTemplateTagAction: async () => '',
  reloadPlugins: noopAsync,
  reload: noopAsync,
  getThemes: async () => builtInThemes.map(theme => ({
    plugin: { name: theme.name, description: 'Built-in themes', version: '0.0.0', directory: '', config: { disabled: false } },
    theme,
  })),
  getPlugins: async () => [],
  getActivePlugins: async () => [],
  getBundlePlugins: async () => [],
  getRequestActions: async () => [],
  getRequestGroupActions: async () => [],
  getWorkspaceActions: async () => [],
  getDocumentActions: async () => [],
  getTemplateTags: async () => [],
  hasRequestHooks: async () => false,
  hasResponseHooks: async () => false,
  getBridgeMetrics: async () => ({ calls: 0 }),
  getCustomSchemas: async () => [],
};

// ─── Hidden browser window stub ───────────────────────────────────────────────
const hiddenBrowserWindow = {
  httpRequest: async () => ({ status: 0, body: '', headers: {} }),
};

// ─── Main bridge ──────────────────────────────────────────────────────────────
export const mainShim = {
  loginStateChange: noop,
  openInBrowser: (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); },
  restart: noop,
  halfSecondAfterAppStart: noop,
  openDeepLink: noop,
  manualUpdateCheck: noop,
  backup: noopAsync,
  restoreBackup: noopAsync,
  authorizeUserInWindow: async () => null,
  authorizeUserInDefaultBrowser: noopAsync,
  onDefaultBrowserOAuthRedirect: noopAsync,
  cancelAuthorizationInDefaultBrowser: noop,
  setMenuBarVisibility: noop,
  installPlugin: noopAsync,
  initializeWorkspaceBackendProject: noopAsync,
  parseImport: async () => null,
  multipartBufferToArray: async () => [],
  writeFile: async () => '',
  deleteRulesetFile: noopAsync,
  writeResponseBodyToFile: async () => '',
  getAuthHeader: async () => undefined,
  getOAuth2Token: async () => undefined,
  secureReadFile: async () => '',
  insecureReadFile: async () => '',
  insecureReadFileWithEncoding: async () => ({ content: '', encoding: 'utf8', error: undefined }),
  readDir: async () => [],
  readOrCreateDataDir: async () => [],
  cancelCurlRequest: noop,
  curlRequest: noopAsync,
  on: (_channel: string, _listener: any) => noopUnsubscribe(),
  webSocket,
  socketIO,
  mcp,
  grpc,
  curl,
  git,
  llm,
  secretStorage,
  electronStorage,
  sync,
  trackAnalyticsEvent: noop,
  trackPageView: noop,
  setCurrentOrganizationId: noop,
  showNunjucksContextMenu: noop,
  showContextMenu: noop,
  lintSpec: async () => ({ diagnostics: [] }),
  bundleSpectralRuleset: async () => ({ content: undefined, error: 'Not available in web prototype' }),
  createPlugin: noopAsync,
  database: {
    caCertificate: {
      create: async () => '',
    },
  },
  hiddenBrowserWindow,
  getExecution: async () => [],
  addExecutionStep: noop,
  startExecution: noop,
  completeExecutionStep: noop,
  updateLatestStepName: noop,
  extractJsonFileFromPostmanDataDumpArchive: async () => ({}),
  getLocalStorageDataFromFileOrigin: async () => ({}),
  generateMockRouteDataFromSpec: async () => ({ error: '', routes: [] }),
  generateCodeSnippet: async () => '',
  getCodeSnippetTargets: async () => [],
  generateCommitsFromDiff: async () => ({ commits: undefined, error: 'Not available in web prototype' }),
  generateMcpSamplingResponse: async () => ({ response: undefined, error: 'Not available in web prototype' }),
  syncNewWorkspaceIfNeeded: noopAsync,
  plugins,
  notifyPluginPromptResult: noop,
  vault: {
    encryptSecretValue: async (raw: string, _key: JsonWebKey) => raw,
    decryptSecretValue: async (encrypted: string, _key: JsonWebKey) => encrypted,
  },
  sealedBox: {
    keyPair: async () => ({ publicKey: new Uint8Array(), secretKey: new Uint8Array() }),
    open: async () => null,
  },
  timeline: {
    getPath: async (_responseId: string) => '',
    appendToFile: noopAsync,
  },
};

// ─── Window-level globals (injected once by entry.web.tsx) ────────────────────

export const dialogShim = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
};

export const appShim = {
  getPath: (_name: string) => '/',
  getAppPath: () => '/',
  process: {
    platform: 'web' as NodeJS.Platform,
  },
};

export const shellShim = {
  showItemInFolder: noop,
  openPath: async () => '',
};

export const clipboardShim = {
  readText: () => '',
  writeText: (text: string) => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
  },
  clear: noop,
};

export const webUtilsShim = {
  getPathForFile: (_file: File) => '',
};

export const pathShim = {
  resolve: (...parts: string[]) => parts.join('/').replace(/\/+/g, '/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
  basename: (p: string) => p.split('/').pop() ?? '',
  join: (...parts: string[]) => parts.join('/').replace(/\/+/g, '/'),
};

export const envShim: Window['env'] = {
  INSOMNIA_GITLAB_REDIRECT_URI: undefined,
  INSOMNIA_GITLAB_CLIENT_ID: undefined,
  INSOMNIA_GITLAB_API_URL: undefined,
  PLAYWRIGHT_TEST: undefined,
  INSOMNIA_SKIP_ONBOARDING: undefined,
  INSOMNIA_SESSION: undefined,
  INSOMNIA_SECRET_KEY: undefined,
  INSOMNIA_PUBLIC_KEY: undefined,
  INSOMNIA_VAULT_SALT: undefined,
  INSOMNIA_VAULT_KEY: undefined,
  INSOMNIA_VAULT_SRP_SECRET: undefined,
  INSOMNIA_ENV: 'web',
  BUILD_DATE: new Date().toISOString(),
  PORTABLE_EXECUTABLE_DIR: undefined,
  OAUTH_REDIRECT_URL: undefined,
  OAUTH_RELAY_URL: undefined,
  INSOMNIA_API_URL: undefined,
  INSOMNIA_MOCK_API_URL: undefined,
  INSOMNIA_AI_URL: undefined,
  KONNECT_API_URL: undefined,
  INSOMNIA_APP_WEBSITE_URL: undefined,
  INSOMNIA_GITHUB_REST_API_URL: undefined,
  INSOMNIA_GITHUB_API_URL: undefined,
};
