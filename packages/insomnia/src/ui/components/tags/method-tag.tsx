import type { GrpcRequest, McpRequest, Request, SocketIORequest, WebSocketRequest } from 'insomnia-data';
import { models } from 'insomnia-data';
import React, { type FC, memo } from 'react';

import { CONTENT_TYPE_GRAPHQL, METHOD_DELETE, METHOD_OPTIONS } from '../../../common/constants';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-(--color-font-fix)',
  GQL: 'text-(--color-font-fix)',
  POST: 'text-(--color-font-success)',
  PATCH: 'text-(--color-font-notice)',
  PUT: 'text-(--color-font-warning)',
  DELETE: 'text-(--color-font-danger)',
  DEL: 'text-(--color-font-danger)',
  OPTIONS: 'text-(--color-font-info)',
  OPT: 'text-(--color-font-info)',
  HEAD: 'text-(--color-font-info)',
};

const { isEventStreamRequest, isRequest } = models.request;

interface Props {
  method: string;
  override?: string | null;
  fullNames?: boolean;
}

function removeVowels(str: string) {
  return str.replace(/[aeiouyAEIOUY]/g, '');
}

const requestBadgeClassNames: Record<string, string> = {
  GET: 'bg-(--color-fix) text-(--color-font-fix)',
  POST: 'bg-(--color-success) text-(--color-font-success)',
  HEAD: 'bg-(--color-info) text-(--color-font-info)',
  OPTIONS: 'bg-(--color-info) text-(--color-font-info)',
  DELETE: 'bg-(--color-danger) text-(--color-font-danger)',
  PUT: 'bg-(--color-warning) text-(--color-font-warning)',
  PATCH: 'bg-(--color-notice) text-(--color-font-notice)',
  WS: 'bg-(--color-notice) text-(--color-font-notice)',
  IO: 'bg-(--color-notice) text-(--color-font-notice)',
  gRPC: 'bg-(--color-info) text-(--color-font-info)',
  MCP: 'bg-(--color-info) text-(--color-font-info)',
};

export const getRequestBadgeClassName = (badge: string) => {
  return requestBadgeClassNames[badge] || 'bg-(--hl-md) text-(--color-font)';
};

export const getMethodShortHand = (doc: Request) => {
  if (isEventStreamRequest(doc)) {
    return 'SSE';
  }
  const isGraphQL = doc.body?.mimeType === CONTENT_TYPE_GRAPHQL;
  if (isGraphQL) {
    return 'GQL';
  }
  return formatMethodName(doc.method);
};
export function formatMethodName(method: string) {
  let methodName = method || '';

  if (method === METHOD_DELETE || method === METHOD_OPTIONS) {
    methodName = method.slice(0, 3);
  } else if (method.length > 4) {
    methodName = removeVowels(method).slice(0, 4);
  }

  return methodName;
}

export const getRequestMethodShortHand = (
  doc?: Request | WebSocketRequest | GrpcRequest | SocketIORequest | McpRequest,
) => {
  if (!doc) {
    return '';
  }
  if (isRequest(doc)) {
    return getMethodShortHand(doc);
  }

  if (models.webSocketRequest.isWebSocketRequest(doc)) {
    return 'WS';
  }

  if (models.grpcRequest.isGrpcRequest(doc)) {
    return 'gRPC';
  }

  if (models.socketIORequest.isSocketIORequest(doc)) {
    return 'IO';
  }

  if (models.mcpRequest.isMcpRequest(doc)) {
    return 'MCP';
  }

  return '';
};

export const MethodTag: FC<Props> = memo(({ method, override, fullNames }) => {
  let methodName = method;
  let overrideName = override;

  if (!fullNames) {
    methodName = formatMethodName(method);
    overrideName = override ? formatMethodName(override) : override;
  }

  const activeMethod = overrideName ? override : method;
  const colorClass = METHOD_COLORS[activeMethod ?? ''] ?? 'text-(--color-font)';

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      {overrideName && (
        <div className={'tag tag--no-bg tag--superscript ' + (METHOD_COLORS[method] ?? 'text-(--color-font)')}>
          <span>{methodName}</span>
        </div>
      )}
      <div className={'tag tag--no-bg tag--small ' + colorClass}>
        <span className="tag__inner">{overrideName || methodName}</span>
      </div>
    </div>
  );
});

MethodTag.displayName = 'MethodTag';
