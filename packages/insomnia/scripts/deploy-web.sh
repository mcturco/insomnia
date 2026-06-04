#!/usr/bin/env bash
#
# Deploy the web prototype to Vercel from the CLI.
#
# Builds the web prototype locally (baking in VITE_PASSCODE_HASH), assembles a
# Vercel "prebuilt" output, and deploys it. Nothing is built on Vercel's side,
# so the Electron monorepo install never runs remotely.
#
# Usage:
#   npm run deploy:web            # preview deploy
#   npm run deploy:web:prod       # production deploy
#
# Required env (put them in packages/insomnia/.env.deploy.local — gitignored):
#   VITE_PASSCODE_HASH   passcode gate hash baked into the build
#   VERCEL_TOKEN         Vercel access token (or run `npx vercel login` once)
#   VERCEL_ORG_ID        Vercel org/team id   (or run `npx vercel link` once)
#   VERCEL_PROJECT_ID    Vercel project id    (or run `npx vercel link` once)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PKG_DIR"

# Load local secrets if present.
if [ -f .env.deploy.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.deploy.local
  set +a
fi

PROD=""
case "${1:-}" in
  --prod|prod|production) PROD="--prod" ;;
esac

: "${VITE_PASSCODE_HASH:?Set VITE_PASSCODE_HASH (e.g. in packages/insomnia/.env.deploy.local)}"

echo "▶ Building web prototype…"
NODE_ENV=production npm run build:web

echo "▶ Assembling Vercel prebuilt output…"
rm -rf .vercel/output
mkdir -p .vercel/output/static
cp -R dist-web/. .vercel/output/static/
cat > .vercel/output/config.json <<'JSON'
{
  "version": 3,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
JSON

echo "▶ Deploying to Vercel ${PROD:+production}${PROD:-(preview)}…"
TOKEN_ARG=()
[ -n "${VERCEL_TOKEN:-}" ] && TOKEN_ARG=(--token="$VERCEL_TOKEN")
npx vercel deploy --prebuilt --yes ${PROD:+$PROD} "${TOKEN_ARG[@]}"
