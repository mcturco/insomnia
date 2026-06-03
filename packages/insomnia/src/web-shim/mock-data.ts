import type { IDatabase } from 'insomnia-data';
import { models } from 'insomnia-data';
import { CONTENT_TYPE_JSON } from 'insomnia-data/common';

// Seeds the in-memory database for the web prototype logged-in experience.
// A fake UserSession causes the router to treat the user as signed in, routing
// to the org/project view instead of the scratchpad.

const { SCRATCHPAD_PROJECT_ID } = models.project;
const { SCRATCHPAD_WORKSPACE_ID } = models.workspace;

export const MOCK_ACCOUNT_ID = 'mock-account-abc123';
export const MOCK_ORG_ID = 'mock-org-abc123';
export const MOCK_PROJECT_ID = 'mock-project-abc123';

export async function seedMockData(db: IDatabase): Promise<void> {
  const flushId = await db.bufferChangesIndefinitely();

  // Settings — app requires this to exist on startup
  await db.docCreate('Settings');

  // Stats — prevents missing doc errors
  await db.docCreate('Stats');

  // ── Fake user session — non-empty id makes the router treat the user as logged in ──
  // Crypto key fields are unused by the prototype so empty objects are fine.
  await db.docCreate('UserSession', {
    id: 'mock-session-token',
    accountId: MOCK_ACCOUNT_ID,
    email: 'prototype@example.com',
    firstName: 'Proto',
    lastName: 'User',
    symmetricKey: {},
    publicKey: {},
    encPrivateKey: { iv: '', t: '', d: '', ad: '' },
  } as any);

  // ── Scratchpad stubs — kept so code that looks up scratchpad IDs doesn't 404 ──
  await db.insert({
    _id: SCRATCHPAD_PROJECT_ID,
    type: 'Project' as const,
    parentId: '',
    name: 'Scratchpad',
    created: Date.now(),
    modified: Date.now(),
    isPrivate: false,
  } as any);

  await db.insert({
    _id: SCRATCHPAD_WORKSPACE_ID,
    type: 'Workspace' as const,
    parentId: SCRATCHPAD_PROJECT_ID,
    name: 'Scratchpad',
    description: '',
    scope: 'collection',
    created: Date.now(),
    modified: Date.now(),
    isPrivate: false,
  } as any);

  // ── Mock org project — parentId matches MOCK_ORG_ID so the project loader finds it ──
  await db.insert({
    _id: MOCK_PROJECT_ID,
    type: 'Project' as const,
    parentId: MOCK_ORG_ID,
    name: 'Demo Project',
    created: Date.now(),
    modified: Date.now(),
    isPrivate: false,
  } as any);

  // ── Demo collection workspace ──────────────────────────────────────────────
  const workspace = await db.docCreate('Workspace', {
    parentId: MOCK_PROJECT_ID,
    name: 'Demo Collection',
    description: '',
    scope: 'collection',
  } as any);

  // Base Environment
  const baseEnv = await db.docCreate('Environment', {
    parentId: workspace._id,
    name: 'Base Environment',
    data: { base_url: 'https://api.example.com' },
    dataPropertyOrder: null,
    metaIsSortable: false,
    isPrivate: false,
  } as any);

  // Sub-environment: Staging
  await db.docCreate('Environment', {
    parentId: baseEnv._id,
    name: 'Staging',
    data: { base_url: 'https://staging.api.example.com' },
    dataPropertyOrder: null,
    metaIsSortable: false,
    isPrivate: false,
  } as any);

  // Cookie Jar (required by some routes)
  await db.docCreate('CookieJar', {
    parentId: workspace._id,
    name: 'Default Jar',
    cookies: [],
  } as any);

  // WorkspaceMeta (tracks active environment etc.)
  await db.docCreate('WorkspaceMeta', {
    parentId: workspace._id,
    activeEnvironmentId: baseEnv._id,
    activeGitBranch: 'main',
    cachedGitRepositoryBranch: 'main',
    cachedGitLastAuthor: null,
    cachedGitLastCommitTime: null,
    gitSnapshotParents: {},
    gitRepositoryId: null,
    hasSeen: true,
  } as any);

  // ── Request Group: Users ──────────────────────────────────────────────────
  const usersGroup = await db.docCreate('RequestGroup', {
    parentId: workspace._id,
    name: 'Users',
    environment: {},
    environmentPropertyOrder: null,
    metaIsSortable: false,
  } as any);

  await makeRequest(db, {
    parentId: usersGroup._id,
    name: 'Get all users',
    method: 'GET',
    url: '{{ _.base_url }}/users',
  });

  await makeRequest(db, {
    parentId: usersGroup._id,
    name: 'Create user',
    method: 'POST',
    url: '{{ _.base_url }}/users',
    body: {
      mimeType: CONTENT_TYPE_JSON,
      text: JSON.stringify({ name: 'New User', email: 'user@example.com' }, null, 2),
    },
    headers: [{ name: 'Content-Type', value: CONTENT_TYPE_JSON }],
  });

  await makeRequest(db, {
    parentId: usersGroup._id,
    name: 'Delete user',
    method: 'DELETE',
    url: '{{ _.base_url }}/users/:id',
  });

  // ── Request Group: Auth ───────────────────────────────────────────────────
  const authGroup = await db.docCreate('RequestGroup', {
    parentId: workspace._id,
    name: 'Auth',
    environment: {},
    environmentPropertyOrder: null,
    metaIsSortable: false,
  } as any);

  await makeRequest(db, {
    parentId: authGroup._id,
    name: 'Login',
    method: 'POST',
    url: '{{ _.base_url }}/auth/login',
    body: {
      mimeType: CONTENT_TYPE_JSON,
      text: JSON.stringify({ email: 'user@example.com', password: 'secret' }, null, 2),
    },
    headers: [{ name: 'Content-Type', value: CONTENT_TYPE_JSON }],
  });

  await makeRequest(db, {
    parentId: authGroup._id,
    name: 'Refresh token',
    method: 'POST',
    url: '{{ _.base_url }}/auth/refresh',
    body: {
      mimeType: CONTENT_TYPE_JSON,
      text: JSON.stringify({ refresh_token: '{{ _.refresh_token }}' }, null, 2),
    },
    headers: [
      { name: 'Content-Type', value: CONTENT_TYPE_JSON },
      { name: 'Authorization', value: 'Bearer {{ _.access_token }}' },
    ],
  });

  await db.flushChanges(flushId);
}

async function makeRequest(
  db: IDatabase,
  fields: {
    parentId: string;
    name: string;
    method: string;
    url: string;
    body?: { mimeType: string; text: string };
    headers?: { name: string; value: string }[];
  },
) {
  const req = await db.docCreate('Request', {
    parentId: fields.parentId,
    name: fields.name,
    method: fields.method,
    url: fields.url,
    body: fields.body ?? { mimeType: '', text: '' },
    headers: fields.headers ?? [],
    parameters: [],
    authentication: {},
    metaSortKey: Date.now(),
    isPrivate: false,
  } as any);

  // RequestMeta is used to store UI state per request (e.g. active tab)
  await db.docCreate('RequestMeta', {
    parentId: req._id,
    previewMode: 'friendly',
    responseFilter: '',
    responseFilterHistory: [],
    activeResponseId: null,
    savedRequestBody: {},
    pinned: false,
    lastActive: 0,
    downloadPath: null,
    expandedAccordionKeys: {},
  } as any);

  return req;
}
