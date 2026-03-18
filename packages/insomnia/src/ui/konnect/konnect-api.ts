export type KonnectRegion = 'global' | 'us' | 'eu' | 'au';

export interface KonnectProxyUrl {
  host?: string;
  port?: number;
  protocol?: string;
  url?: string;
}

export interface KonnectControlPlane {
  id: string;
  name: string;
  config?: {
    proxy_urls?: (KonnectProxyUrl | string)[];
    proxy_url?: string;
  };
}

function extractControlPlane(payload: any): KonnectControlPlane {
  if (payload && typeof payload === 'object') {
    if (payload.id && payload.name) {
      return payload as KonnectControlPlane;
    }
    if (payload.data && payload.data.id && payload.data.name) {
      return payload.data as KonnectControlPlane;
    }
    if (payload.control_plane && payload.control_plane.id && payload.control_plane.name) {
      return payload.control_plane as KonnectControlPlane;
    }
  }
  return payload as KonnectControlPlane;
}

export interface KonnectService {
  id: string;
  name: string;
  host?: string;
  port?: number;
  protocol?: string;
  path?: string;
}

export interface KonnectRoute {
  id: string;
  name?: string;
  methods?: string[] | null;
  paths?: string[] | null;
  service?: {
    id: string;
  } | null;
}

const REGION_BASES: Record<KonnectRegion, string> = {
  global: 'https://global.api.konghq.com',
  us: 'https://us.api.konghq.com',
  eu: 'https://eu.api.konghq.com',
  au: 'https://au.api.konghq.com',
};

function getBase(region: KonnectRegion) {
  return REGION_BASES[region] || REGION_BASES.global;
}

async function konnectGet<T>({
  pat,
  region,
  path,
  params,
}: {
  pat: string;
  region: KonnectRegion;
  path: string;
  params?: Record<string, string>;
}): Promise<T> {
  const url = new URL(`${getBase(region)}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}${errorBody ? `: ${errorBody}` : ''}`);
  }

  return response.json() as Promise<T>;
}

export function buildBaseUrl(controlPlane: KonnectControlPlane): string {
  const normalize = (value: string) => value.trim().replace(/\/+$/, '');
  const config = controlPlane.config;
  if (!config) {
    return '';
  }

  if (typeof config.proxy_url === 'string' && config.proxy_url.trim()) {
    return normalize(config.proxy_url);
  }

  const firstProxy = config.proxy_urls?.[0];
  if (!firstProxy) {
    return '';
  }

  if (typeof firstProxy === 'string') {
    return normalize(firstProxy);
  }

  if (typeof firstProxy.url === 'string' && firstProxy.url.trim()) {
    return normalize(firstProxy.url);
  }

  if (!firstProxy.protocol || !firstProxy.host) {
    return '';
  }

  const isDefaultPort =
    (firstProxy.protocol === 'https' && firstProxy.port === 443) ||
    (firstProxy.protocol === 'http' && firstProxy.port === 80);

  if (!firstProxy.port || isDefaultPort) {
    return `${firstProxy.protocol}://${firstProxy.host}`;
  }

  return `${firstProxy.protocol}://${firstProxy.host}:${firstProxy.port}`;
}

export function buildBaseUrlFromService(service?: KonnectService): string {
  if (!service?.host) {
    return '';
  }

  const protocol = service.protocol || 'http';
  const isDefaultPort = (protocol === 'https' && service.port === 443) || (protocol === 'http' && service.port === 80);
  if (!service.port || isDefaultPort) {
    return `${protocol}://${service.host}`;
  }

  return `${protocol}://${service.host}:${service.port}`;
}

export async function listControlPlanes({
  pat,
  region,
}: {
  pat: string;
  region: KonnectRegion;
}): Promise<KonnectControlPlane[]> {
  const all: KonnectControlPlane[] = [];
  let pageAfter: string | undefined;

  do {
    const params: Record<string, string> = {
      pageSize: '100',
    };

    if (pageAfter) {
      params.pageAfter = pageAfter;
    }

    const page = await konnectGet<{
      data?: KonnectControlPlane[];
      meta?: {
        next?: {
          cursor?: string;
        };
      };
    }>({
      pat,
      region,
      path: '/v2/control-planes',
      params,
    });

    all.push(...(page.data || []));
    pageAfter = page.meta?.next?.cursor;
  } while (pageAfter);

  return all;
}

export async function getControlPlane({
  pat,
  region,
  controlPlaneId,
}: {
  pat: string;
  region: KonnectRegion;
  controlPlaneId: string;
}): Promise<KonnectControlPlane> {
  const response = await konnectGet<any>({
    pat,
    region,
    path: `/v2/control-planes/${controlPlaneId}`,
  });
  return extractControlPlane(response);
}

export async function listServices({
  pat,
  region,
  controlPlaneId,
}: {
  pat: string;
  region: KonnectRegion;
  controlPlaneId: string;
}): Promise<KonnectService[]> {
  const all: KonnectService[] = [];
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      size: '1000',
    };

    if (offset) {
      params.offset = offset;
    }

    const page = await konnectGet<{
      data?: KonnectService[];
      offset?: string;
    }>({
      pat,
      region,
      path: `/v2/control-planes/${controlPlaneId}/core-entities/services`,
      params,
    });

    all.push(...(page.data || []));
    offset = page.offset;
  } while (offset);

  return all;
}

export async function listRoutes({
  pat,
  region,
  controlPlaneId,
}: {
  pat: string;
  region: KonnectRegion;
  controlPlaneId: string;
}): Promise<KonnectRoute[]> {
  const all: KonnectRoute[] = [];
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      size: '1000',
    };

    if (offset) {
      params.offset = offset;
    }

    const page = await konnectGet<{
      data?: KonnectRoute[];
      offset?: string;
    }>({
      pat,
      region,
      path: `/v2/control-planes/${controlPlaneId}/core-entities/routes`,
      params,
    });

    all.push(...(page.data || []));
    offset = page.offset;
  } while (offset);

  return all;
}
