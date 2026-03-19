import type { KonnectConnection } from './storage';

export type KonnectSidebarState = 'connected' | 'auth_invalid' | 'no_pat' | 'pending_initial_sync';

export const isKonnectAuthErrorMessage = (message: string) => /\b(401|403)\b/.test(message);

export const getKonnectSidebarState = (connection: KonnectConnection | null): KonnectSidebarState => {
  if (!connection?.pat) {
    return 'no_pat';
  }

  if (connection.lastSyncStatus === 'error' && isKonnectAuthErrorMessage(connection.lastSyncError || '')) {
    return 'auth_invalid';
  }

  if (connection.lastSyncStatus === 'idle' && connection.lastSyncAt === null) {
    return 'pending_initial_sync';
  }

  return 'connected';
};
