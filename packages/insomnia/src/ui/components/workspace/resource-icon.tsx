import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { models } from 'insomnia-data';

import { Icon } from '~/basic-components/icon';
import { MethodBadge } from '~/ui/components/tags/method-badge';

export function ResourceIcon({ resource }: { resource: any }) {
  const isProject = models.project.isProject(resource);
  let icon: IconProp | null = null;
  if (isProject) {
    icon = models.project.isRemoteProject(resource)
      ? 'globe-americas'
      : models.project.isGitProject(resource)
        ? ['fab', 'git-alt']
        : 'laptop';
  }
  const isWorkspace = models.workspace.isWorkspace(resource);
  if (isWorkspace) {
    icon =
      ({
        'design': 'file',
        'collection': 'bars',
        'mock-server': 'server',
        'environment': 'code',
        'mcp': ['fac', 'mcp'],
      }[resource.scope] as IconProp) || null;
  }

  if (models.requestGroup.isRequestGroup(resource)) {
    icon = 'folder';
  }

  if (icon) {
    return <Icon icon={icon} className="w-3 shrink-0" />;
  }

  const isMethodResource =
    models.request.isRequest(resource) ||
    models.webSocketRequest.isWebSocketRequest(resource) ||
    models.socketIORequest.isSocketIORequest(resource) ||
    models.grpcRequest.isGrpcRequest(resource);

  return isMethodResource ? <MethodBadge request={resource} /> : null;
}
