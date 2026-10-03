#!/usr/bin/env bash
# Installs the packed package into a throwaway NestJS app and checks that it
# loads and instruments.
#
# Usage: compat/run.sh <full|minimal> <nest-major> [package.tgz]
#   full    - all optional peers installed, every instrumentation exercised
#   minimal - optional peers omitted, forRoot() defaults must still work
set -euo pipefail

PROFILE=$1
NEST=$2
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARBALL=${3:-$(ls "$ROOT"/amplication-opentelemetry-nestjs-*.tgz | head -n 1)}

case "$NEST" in
  10) GRAPHQL=12 EVENT_EMITTER=2 SCHEDULE=4 ;;
  11) GRAPHQL=13 EVENT_EMITTER=3 SCHEDULE=6 ;;
  12) GRAPHQL=14 EVENT_EMITTER=12 SCHEDULE=12 ;;
  *) echo "Unsupported NestJS major: $NEST" >&2; exit 1 ;;
esac

DEPS=(
  "@nestjs/common@$NEST"
  "@nestjs/core@$NEST"
  "@nestjs/platform-express@$NEST"
  "@nestjs/event-emitter@$EVENT_EMITTER"
  reflect-metadata
  rxjs
)
OPTIONAL=(@nestjs/graphql @nestjs/microservices @nestjs/schedule)
if [ "$PROFILE" = full ]; then
  DEPS+=(
    "@nestjs/microservices@$NEST"
    "@nestjs/graphql@$GRAPHQL"
    "@nestjs/schedule@$SCHEDULE"
    graphql
  )
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cp "$ROOT/compat/fixtures/$PROFILE.ts" "$WORK/app.ts"
cp "$ROOT/compat/tsconfig.json" "$WORK/tsconfig.json"
cd "$WORK"
echo '{ "name": "compat-fixture", "private": true }' > package.json

echo "Installing $(basename "$TARBALL") with NestJS $NEST ($PROFILE)"
npm install --no-audit --no-fund --loglevel=error "$TARBALL" "${DEPS[@]}"

if [ "$PROFILE" = minimal ]; then
  for pkg in "${OPTIONAL[@]}"; do
    if [ -d "node_modules/$pkg" ]; then
      echo "Optional peer $pkg was installed - it must not be auto-installed" >&2
      exit 1
    fi
  done
fi

"$ROOT/node_modules/.bin/tsc" -p .
node dist/app.js
