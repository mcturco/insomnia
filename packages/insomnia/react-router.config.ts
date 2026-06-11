import { type Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  ssr: false,
  // Allow the web prototype build to redirect output without touching this file.
  // Default 'build' keeps the existing Electron build path unchanged.
  buildDirectory: process.env.REACT_ROUTER_BUILD_DIR || 'build',
  serverModuleFormat: 'cjs',
  future: {
    v8_middleware: true,
  },
} satisfies Config;
