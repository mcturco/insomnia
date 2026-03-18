import type { KonnectRegion } from './konnect-api';

const keyForOrganization = (organizationId: string) => `konnect:connection:${organizationId}`;

export interface KonnectConnection {
  pat: string;
  region: KonnectRegion;
  lastSyncAt: number | null;
  lastSyncStatus: 'idle' | 'success' | 'error';
  lastSyncError?: string;
}

export function loadKonnectConnection(organizationId: string): KonnectConnection | null {
  try {
    const serialized = window.localStorage.getItem(keyForOrganization(organizationId));
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as KonnectConnection;
    if (!parsed?.pat || !parsed.region) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveKonnectConnection(organizationId: string, next: KonnectConnection) {
  window.localStorage.setItem(keyForOrganization(organizationId), JSON.stringify(next));
}

export function clearKonnectConnection(organizationId: string) {
  window.localStorage.removeItem(keyForOrganization(organizationId));
}

export function maskPat(pat: string) {
  if (!pat) {
    return '';
  }

  if (pat.length <= 10) {
    return `${pat.slice(0, 2)}...${pat.slice(-2)}`;
  }

  return `${pat.slice(0, 6)}...${pat.slice(-4)}`;
}
