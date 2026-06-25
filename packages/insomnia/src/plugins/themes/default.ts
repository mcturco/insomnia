import { palette } from './palette';

const { gray, green, yellow, red, blue, insomniaPurple, white } = palette;

// Tier 2 — semantic roles assigned FROM primitives (concrete hex; these flow
// through `Color()` in `getThemeBlockCSS`, so they must be hex, not `var()`).
// Adjust a color by pointing a role at a different primitive in `palette.ts`.
const background = {
  default: gray['100'],
  success: green['40'],
  notice: yellow['40'],
  warning: yellow['30'],
  danger: red['30'],
  fix: green['70'],
  surprise: insomniaPurple['60'],
  info: blue['40'],
  cta: insomniaPurple['50'],
};

const foreground = {
  default: gray['30'],
  success: white,
  notice: white,
  warning: white,
  danger: white,
  fix: white,
  surprise: white,
  info: white,
  constant: white,
};

// Slightly elevated surface over the gray-90 base.
const surface = gray['80'];

// Tier 3 — app-controlled HTTP method + status colors, defined ONLY on the
// default theme via `rawCss` (so the other 17 built-in themes and plugin themes
// fall back to today's semantic vars — see the `var(--token, <fallback>)` usage
// in method-tag.tsx, command-palette.tsx and status-tag.tsx). rawCss is injected
// verbatim (not `Color()`-parsed), so it may reference `var(--primitive-*)`.
// Method/status badges render at their exact defined color (no opacity).
const appColorTokens = `:root {
\t/* HTTP method colors */
\t--method-color-bg-get: var(--primitive-green-70); --method-color-text-get: var(--primitive-green-30);
\t--method-color-bg-post: var(--primitive-blue-80); --method-color-text-post: var(--primitive-blue-30);
\t--method-color-bg-put: var(--primitive-yellow-80); --method-color-text-put: var(--primitive-yellow-30);
\t--method-color-bg-patch: var(--primitive-aqua-80); --method-color-text-patch: var(--primitive-aqua-30);
\t--method-color-bg-delete: var(--primitive-red-80); --method-color-text-delete: var(--primitive-red-30);
\t--method-color-bg-head: var(--primitive-gray-30); --method-color-text-head: var(--primitive-gray-70);
\t--method-color-bg-options: var(--primitive-gray-70); --method-color-text-options: var(--primitive-gray-30);
\t--method-color-bg-gql: var(--primitive-green-70); --method-color-text-gql: var(--primitive-green-30);
\t--method-color-bg-ws: var(--primitive-pink-80); --method-color-text-ws: var(--primitive-pink-30);
\t--method-color-bg-io: var(--primitive-pink-80); --method-color-text-io: var(--primitive-pink-30);
\t--method-color-bg-grpc: var(--primitive-purple-90); --method-color-text-grpc: var(--primitive-purple-40);
\t--method-color-bg-mcp: var(--primitive-purple-90); --method-color-text-mcp: var(--primitive-purple-40);

\t/* HTTP status colors */
\t--status-color-bg-1xx: var(--primitive-blue-80); --status-color-text-1xx: var(--primitive-blue-30);
\t--status-color-bg-2xx: var(--primitive-green-70); --status-color-text-2xx: var(--primitive-green-30);
\t--status-color-bg-3xx: var(--primitive-yellow-80); --status-color-text-3xx: var(--primitive-yellow-30);
\t--status-color-bg-4xx: var(--primitive-orange-80); --status-color-text-4xx: var(--primitive-orange-30);
\t--status-color-bg-5xx: var(--primitive-red-80); --status-color-text-5xx: var(--primitive-red-30);
}`;

export default {
  name: 'default',
  displayName: 'Default',
  theme: {
    background,
    foreground,
    rawCss: appColorTokens,
    styles: {
      transparentOverlay: {
        background: {
          default: 'rgba(13, 15, 13, 0.8)',
        },
        foreground: {
          default: gray['30'],
        },
      },
      dialog: {
        background: {
          default: surface,
        },
      },
      appHeader: {
        // not sure where this is assigned
        background: {
          default: surface,
        },
      },
      sidebar: {
        background: {
          ...background,
          default: gray['90'],
        },
        foreground: {
          default: gray['20'],
        },
        highlight: {
          default: gray['40'],
        },
      },
      sidebarHeader: {
        background: {
          default: insomniaPurple['60'],
        },
        foreground: {
          default: white,
        },
      },
      paneHeader: {
        // request URL box section
        foreground: {
          default: gray['30'],
        },
        background: {
          ...background,
          default: gray['90'],
        },
      },
      pane: {
        // global tabs, internal tabs, tables, no response, code editor line numbers, collection home screen (no request selected)
        background: {
          ...background,
          default: gray['100'],
        },
        foreground: {
          default: gray['20'],
        },
        highlight: {
          default: gray['40'],
        },
      },
    },
  },
};
