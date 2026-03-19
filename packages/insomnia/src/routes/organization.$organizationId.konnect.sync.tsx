import { href } from 'react-router';

import { database } from '~/common/database';
import * as models from '~/models';
import { type Environment,getKVPairFromData } from '~/models/environment';
import { type Project } from '~/models/project';
import type { Workspace } from '~/models/workspace';
import { showToast } from '~/ui/components/toast-notification';
import {
  buildBaseUrl,
  buildBaseUrlFromService,
  detectGatewayType,
  getControlPlane,
  type KonnectGatewayType,
  type KonnectRegion,
  listControlPlanes,
  listRoutes,
  listServices,
} from '~/ui/konnect/konnect-api';
import { invariant } from '~/utils/invariant';
import { createFetcherSubmitHook } from '~/utils/router';

const CONTROL_PLANE_PREFIX = 'proj_konnect_';
const WORKSPACE_PREFIX = 'wrk_konnect_';
const ENV_WORKSPACE_PREFIX = 'wrk_konnect_env_';
const FOLDER_PREFIX = 'fld_konnect_';
const REQUEST_PREFIX = 'req_konnect_';

const normalizeId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_');
const controlPlaneProjectId = (controlPlaneId: string) => `${CONTROL_PLANE_PREFIX}${normalizeId(controlPlaneId)}`;
const controlPlaneWorkspaceId = (controlPlaneId: string) => `${WORKSPACE_PREFIX}${normalizeId(controlPlaneId)}`;
const controlPlaneEnvironmentWorkspaceId = (controlPlaneId: string) => `${ENV_WORKSPACE_PREFIX}${normalizeId(controlPlaneId)}`;
const serviceFolderId = (controlPlaneId: string, serviceId: string) =>
  `${FOLDER_PREFIX}${normalizeId(controlPlaneId)}_${normalizeId(serviceId)}`;
const noServiceFolderId = (controlPlaneId: string) => `${FOLDER_PREFIX}${normalizeId(controlPlaneId)}_noservice`;
const routeRequestId = (controlPlaneId: string, routeId: string) =>
  `${REQUEST_PREFIX}${normalizeId(controlPlaneId)}_${normalizeId(routeId)}`;

const isKonnectProject = (project: Project) => project.konnect?.source === 'konnect';
const isKonnectAuthError = (message: string) => /^401\b|^403\b/.test(message.trim());

function cleanRoutePath(path: string) {
  let next = path.startsWith('~') ? path.slice(1) : path;
  next = next.replace(/^\^/, '').replace(/\$$/, '');
  return next || '/';
}

function defaultRouteName({
  routeName,
  method,
  path,
}: {
  routeName?: string;
  method: string;
  path: string;
}) {
  if (routeName) {
    return routeName;
  }

  return `${method.toUpperCase()} ${path}`;
}

async function upsertBaseEnvironment({
  workspaceId,
  baseUrl,
}: {
  workspaceId: string;
  baseUrl: string;
}) {
  const baseEnvironment = await models.environment.getOrCreateForParentId(workspaceId);
  const nextData: Record<string, any> = {
    ...baseEnvironment.data,
    base_url: baseUrl,
  };
  delete nextData.baseUrl;
  const nextKvPairData = getKVPairFromData(nextData, null);
  await models.environment.update(baseEnvironment as Environment, {
    data: nextData,
    dataPropertyOrder: null,
    kvPairData: nextKvPairData,
  });
  return baseEnvironment;
}

async function migrateLegacyBaseUrlReferences({
  controlPlaneId,
}: {
  controlPlaneId: string;
}) {
  const normalized = normalizeId(controlPlaneId);
  const existingRequests = (await models.request.all()).filter(request =>
    request._id.startsWith(`${REQUEST_PREFIX}${normalized}_`),
  );

  await Promise.all(
    existingRequests
      .filter(request => typeof request.url === 'string' && request.url.includes('baseUrl'))
      .map(request =>
        models.request.update(request, {
          url: request.url.replace(/\{\{\s*baseUrl\s*\}\}/g, '{{ base_url }}'),
        }),
      ),
  );
}

async function isEnvironmentDescendantOf({
  environmentId,
  ancestorId,
}: {
  environmentId: string;
  ancestorId: string;
}) {
  let current = await models.environment.getById(environmentId);

  for (let i = 0; i < 10 && current; i++) {
    if (current._id === ancestorId || current.parentId === ancestorId) {
      return true;
    }
    current = await models.environment.getById(current.parentId);
  }

  return false;
}

async function ensureWorkspaceUsesKonnectProjectEnvironment({
  workspaceId,
  konnectBaseEnvironmentId,
}: {
  workspaceId: string;
  konnectBaseEnvironmentId: string;
}) {
  const workspaceMeta = await models.workspaceMeta.getOrCreateByParentId(workspaceId);
  const activeGlobalEnvironmentId = workspaceMeta.activeGlobalEnvironmentId;

  if (!activeGlobalEnvironmentId) {
    await models.workspaceMeta.update(workspaceMeta, {
      activeGlobalEnvironmentId: konnectBaseEnvironmentId,
    });
    return;
  }

  const inheritsFromKonnectBase = await isEnvironmentDescendantOf({
    environmentId: activeGlobalEnvironmentId,
    ancestorId: konnectBaseEnvironmentId,
  });

  if (!inheritsFromKonnectBase) {
    await models.workspaceMeta.update(workspaceMeta, {
      activeGlobalEnvironmentId: konnectBaseEnvironmentId,
    });
  }
}

async function upsertProjectEnvironmentWorkspace({
  projectId,
  controlPlaneId,
  controlPlaneName,
}: {
  projectId: string;
  controlPlaneId: string;
  controlPlaneName: string;
}) {
  const workspaceId = controlPlaneEnvironmentWorkspaceId(controlPlaneId);
  const workspaceName = `${controlPlaneName} Environment`;
  const existingWorkspace = await models.workspace.getById(workspaceId);

  if (!existingWorkspace) {
    return models.workspace.create({
      _id: workspaceId,
      parentId: projectId,
      scope: 'environment',
      name: workspaceName,
      description: 'Managed by Konnect (prototype)',
    });
  }

  await models.workspace.update(existingWorkspace as Workspace, {
    parentId: projectId,
    scope: 'environment',
    name: workspaceName,
  });
  return existingWorkspace;
}

async function upsertKonnectProject({
  organizationId,
  controlPlaneId,
  controlPlaneName,
  region,
  gatewayType,
}: {
  organizationId: string;
  controlPlaneId: string;
  controlPlaneName: string;
  region: KonnectRegion;
  gatewayType?: KonnectGatewayType;
}) {
  const projectId = controlPlaneProjectId(controlPlaneId);
  const existingProject = await models.project.getById(projectId);
  const patch = {
    name: controlPlaneName,
    parentId: organizationId,
    remoteId: null,
    gitRepositoryId: null,
    konnect: {
      source: 'konnect' as const,
      controlPlaneId,
      region,
      gatewayType: gatewayType || existingProject?.konnect?.gatewayType,
      connected: true,
      syncStatus: 'success' as const,
      lastSyncedAt: Date.now(),
    },
  };

  if (!existingProject) {
    return models.project.create({
      _id: projectId,
      ...patch,
    });
  }

  return models.project.update(existingProject, patch);
}

async function upsertCollectionWorkspace({
  projectId,
  controlPlaneId,
  controlPlaneName,
}: {
  projectId: string;
  controlPlaneId: string;
  controlPlaneName: string;
}) {
  const workspaceId = controlPlaneWorkspaceId(controlPlaneId);
  const workspaceName = `${controlPlaneName} Routes`;
  const existingWorkspace = await models.workspace.getById(workspaceId);

  if (!existingWorkspace) {
    const created = await models.workspace.create({
      _id: workspaceId,
      parentId: projectId,
      scope: 'collection',
      name: workspaceName,
      description: 'Managed by Konnect (prototype)',
    });
    await models.environment.getOrCreateForParentId(created._id);
    await models.cookieJar.getOrCreateForParentId(created._id);
    await models.workspaceMeta.getOrCreateByParentId(created._id);
    return created;
  }

  await models.workspace.update(existingWorkspace as Workspace, {
    parentId: projectId,
    scope: 'collection',
    name: workspaceName,
  });
  await models.environment.getOrCreateForParentId(existingWorkspace._id);
  await models.cookieJar.getOrCreateForParentId(existingWorkspace._id);
  await models.workspaceMeta.getOrCreateByParentId(existingWorkspace._id);
  return existingWorkspace;
}

async function upsertServiceFolder({
  folderId,
  parentId,
  name,
  order,
}: {
  folderId: string;
  parentId: string;
  name: string;
  order: number;
}) {
  const existingFolder = await models.requestGroup.getById(folderId);
  const patch = {
    parentId,
    name,
    metaSortKey: -1 * (Date.now() + order),
    description: 'Managed by Konnect (prototype)',
  };

  if (!existingFolder) {
    return models.requestGroup.create({
      _id: folderId,
      ...patch,
    });
  }

  return models.requestGroup.update(existingFolder, patch);
}

async function upsertRouteRequest({
  requestId,
  parentId,
  name,
  method,
  url,
  order,
}: {
  requestId: string;
  parentId: string;
  name: string;
  method: string;
  url: string;
  order: number;
}) {
  const existingRequest = await models.request.getById(requestId);
  const patch = {
    parentId,
    name,
    method,
    url,
    headers: [],
    parameters: [],
    body: {},
    authentication: { type: 'none' as const },
    metaSortKey: -1 * (Date.now() + order),
    description: 'Managed by Konnect (prototype)',
  };

  if (!existingRequest) {
    return models.request.create({
      _id: requestId,
      ...patch,
    });
  }

  return models.request.update(existingRequest, patch);
}

async function cleanupStaleKonnectData({
  controlPlaneId,
  expectedFolderIds,
  expectedRequestIds,
}: {
  controlPlaneId: string;
  expectedFolderIds: Set<string>;
  expectedRequestIds: Set<string>;
}) {
  const normalized = normalizeId(controlPlaneId);
  const existingRequests = (await models.request.all()).filter(request =>
    request._id.startsWith(`${REQUEST_PREFIX}${normalized}_`),
  );
  const existingFolders = (await models.requestGroup.all()).filter(folder =>
    folder._id.startsWith(`${FOLDER_PREFIX}${normalized}_`),
  );

  for (const request of existingRequests) {
    if (!expectedRequestIds.has(request._id)) {
      await models.request.remove(request);
    }
  }

  for (const folder of existingFolders) {
    if (!expectedFolderIds.has(folder._id)) {
      await models.requestGroup.remove(folder);
    }
  }
}

export async function clientAction({ request, params }: any) {
  const { organizationId } = params;
  invariant(typeof organizationId === 'string', 'Organization ID is required');

  const body = await request.json();
  const action = body?.action;

  if (action === 'disconnect') {
    const projects = await database.find<Project>(models.project.type, { parentId: organizationId });
    await Promise.all(
      projects.filter(isKonnectProject).map(project =>
        models.project.update(project, {
          konnect: {
            source: 'konnect',
            controlPlaneId: project.konnect!.controlPlaneId,
            region: project.konnect!.region,
            gatewayType: project.konnect?.gatewayType,
            connected: false,
            syncStatus: 'idle',
            lastSyncedAt: project.konnect?.lastSyncedAt,
          },
        }),
      ),
    );

    return {
      ok: true,
      action: 'disconnect',
    };
  }

  const pat = body?.pat as string;
  const region = body?.region as KonnectRegion;

  invariant(typeof pat === 'string' && pat.trim().length > 0, 'PAT is required');
  invariant(region === 'global' || region === 'us' || region === 'eu' || region === 'au', 'Region is required');

  try {
    const controlPlanes = await listControlPlanes({ pat, region });
    const expectedControlPlaneProjectIds = new Set<string>();

    let syncedProjects = 0;
    let syncedFolders = 0;
    let syncedRequests = 0;

    for (const controlPlane of controlPlanes) {
      const controlPlaneDetails = await getControlPlane({
        pat,
        region,
        controlPlaneId: controlPlane.id,
      }).catch(() => controlPlane);

      expectedControlPlaneProjectIds.add(controlPlaneProjectId(controlPlane.id));

      const project = await upsertKonnectProject({
        organizationId,
        controlPlaneId: controlPlane.id,
        controlPlaneName: controlPlane.name,
        region,
        gatewayType: detectGatewayType(controlPlaneDetails) || detectGatewayType(controlPlane),
      });

      const workspace = await upsertCollectionWorkspace({
        projectId: project._id,
        controlPlaneId: controlPlane.id,
        controlPlaneName: controlPlane.name,
      });
      const projectEnvironmentWorkspace = await upsertProjectEnvironmentWorkspace({
        projectId: project._id,
        controlPlaneId: controlPlane.id,
        controlPlaneName: controlPlane.name,
      });

      const [services, routes] = await Promise.all([
        listServices({ pat, region, controlPlaneId: controlPlane.id }),
        listRoutes({ pat, region, controlPlaneId: controlPlane.id }),
      ]);
      const baseUrl = buildBaseUrl(controlPlaneDetails) || buildBaseUrlFromService(services[0]);
      await migrateLegacyBaseUrlReferences({
        controlPlaneId: controlPlane.id,
      });

      await upsertBaseEnvironment({
        workspaceId: workspace._id,
        baseUrl,
      });
      const projectBaseEnvironment = await upsertBaseEnvironment({
        workspaceId: projectEnvironmentWorkspace._id,
        baseUrl,
      });
      await ensureWorkspaceUsesKonnectProjectEnvironment({
        workspaceId: workspace._id,
        konnectBaseEnvironmentId: projectBaseEnvironment._id,
      });

      const serviceById = new Map(services.map(service => [service.id, service]));
      const routesByService = new Map<string, typeof routes>();

      for (const route of routes) {
        const serviceId = route.service?.id || '__noservice__';
        const current = routesByService.get(serviceId) || [];
        current.push(route);
        routesByService.set(serviceId, current);
      }

      const expectedFolderIds = new Set<string>();
      const expectedRequestIds = new Set<string>();
      let folderIndex = 0;
      let requestIndex = 0;

      for (const [serviceId, serviceRoutes] of routesByService.entries()) {
        const folderId = serviceId === '__noservice__' ? noServiceFolderId(controlPlane.id) : serviceFolderId(controlPlane.id, serviceId);
        expectedFolderIds.add(folderId);

        const folderName =
          serviceId === '__noservice__'
            ? '(No Service)'
            : serviceById.get(serviceId)?.name || '(Unnamed Service)';

        await upsertServiceFolder({
          folderId,
          parentId: workspace._id,
          name: folderName,
          order: folderIndex++,
        });

        for (const route of serviceRoutes) {
          const method = (route.methods?.[0] || 'GET').toUpperCase();
          const path = cleanRoutePath(route.paths?.[0] || '/');
          const requestId = routeRequestId(controlPlane.id, route.id);
          expectedRequestIds.add(requestId);

          await upsertRouteRequest({
            requestId,
            parentId: folderId,
            name: defaultRouteName({
              routeName: route.name,
              method,
              path,
            }),
            method,
            url: `{{ base_url }}${path}`,
            order: requestIndex++,
          });
        }
      }

      await cleanupStaleKonnectData({
        controlPlaneId: controlPlane.id,
        expectedFolderIds,
        expectedRequestIds,
      });

      syncedProjects += 1;
      syncedFolders += expectedFolderIds.size;
      syncedRequests += expectedRequestIds.size;
    }

    if (controlPlanes.length > 0) {
      const allOrganizationProjects = await database.find<Project>(models.project.type, { parentId: organizationId });
      await Promise.all(
        allOrganizationProjects
          .filter(isKonnectProject)
          .filter(project => !expectedControlPlaneProjectIds.has(project._id))
          .map(project =>
            models.project.update(project, {
              konnect: {
                source: 'konnect',
                controlPlaneId: project.konnect!.controlPlaneId,
                region: project.konnect!.region,
                gatewayType: project.konnect?.gatewayType,
                connected: false,
                syncStatus: 'success',
                lastSyncedAt: Date.now(),
              },
            }),
          ),
      );
    }

    return {
      ok: true,
      action: 'sync',
      summary: {
        projects: syncedProjects,
        folders: syncedFolders,
        requests: syncedRequests,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Konnect sync failed';

    if (isKonnectAuthError(errorMessage)) {
      const projects = await database.find<Project>(models.project.type, { parentId: organizationId });
      await Promise.all(
        projects.filter(isKonnectProject).map(project =>
          models.project.update(project, {
            konnect: {
              source: 'konnect',
              controlPlaneId: project.konnect!.controlPlaneId,
              region: project.konnect!.region,
              gatewayType: project.konnect?.gatewayType,
              connected: false,
              syncStatus: 'error',
              lastSyncedAt: project.konnect?.lastSyncedAt,
            },
          }),
        ),
      );
    }

    return {
      ok: false,
      action: 'sync',
      error: errorMessage,
    };
  }
}

export const useKonnectSyncActionFetcher = createFetcherSubmitHook(
  submit =>
    ({
      organizationId,
      action = 'sync',
      pat,
      region,
    }: {
      organizationId: string;
      action?: 'sync' | 'disconnect';
      pat?: string;
      region?: KonnectRegion;
    }) => {
      const payload =
        action === 'disconnect'
          ? { action: 'disconnect' }
          : { action: 'sync', pat, region };

      return submit(JSON.stringify(payload), {
        method: 'POST',
        action: href('/organization/:organizationId/konnect/sync', {
          organizationId,
        }),
        encType: 'application/json',
      });
    },
  clientAction,
);

export function showKonnectSyncResultToast(fetcherData: any) {
  if (fetcherData?.ok && fetcherData?.action === 'sync' && fetcherData?.summary) {
    showToast({
      status: 'success',
      icon: 'cloud',
      title: 'Konnect sync completed',
      description: `${fetcherData.summary.projects} projects, ${fetcherData.summary.folders} folders, ${fetcherData.summary.requests} requests`,
    });
  }
}
