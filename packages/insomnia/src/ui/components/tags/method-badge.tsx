import type { GrpcRequest, McpRequest, Request, SocketIORequest, WebSocketRequest } from 'insomnia-data';
import { models } from 'insomnia-data';
import React from 'react';

import { getRequestBadgeClassName, getRequestMethodShortHand } from '~/ui/components/tags/method-tag';

type RequestLike = Request | WebSocketRequest | GrpcRequest | SocketIORequest | McpRequest;

// Shared layout for the solid method badge shown in the sidebar tree, command
// palette, tabs, request lists, etc. Colors come from `getRequestBadgeClassName`
// (the app-controlled `--method-color-*` tokens), so badges render at their
// exact defined color everywhere.
const BADGE_CLASS =
  'flex w-10 shrink-0 items-center justify-center rounded-xs border border-solid border-(--hl-sm) text-[0.65rem]';

const colorKeyForRequest = (doc: RequestLike): string => {
  if (models.webSocketRequest.isWebSocketRequest(doc)) {
    return 'WS';
  }
  if (models.socketIORequest.isSocketIORequest(doc)) {
    return 'IO';
  }
  if (models.grpcRequest.isGrpcRequest(doc)) {
    return 'gRPC';
  }
  if (models.mcpRequest.isMcpRequest(doc)) {
    return 'MCP';
  }
  return (doc as Request).method;
};

interface MethodBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Derive both color and label from a request-like document. */
  request?: RequestLike;
  /** Explicit color key (e.g. 'GET', 'WS', 'gRPC'); used when no `request` is given. */
  method?: string;
  /** Display text; defaults to the request short-hand or the `method`. */
  label?: React.ReactNode;
}

export const MethodBadge = ({ request, method, label, className = '', ...props }: MethodBadgeProps) => {
  const colorKey = method ?? (request ? colorKeyForRequest(request) : '');
  const content = label ?? (request ? getRequestMethodShortHand(request) : method);

  return (
    <span className={`${BADGE_CLASS} ${getRequestBadgeClassName(colorKey)} ${className}`} {...props}>
      {content}
    </span>
  );
};

MethodBadge.displayName = 'MethodBadge';
