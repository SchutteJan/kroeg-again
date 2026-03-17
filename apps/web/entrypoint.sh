#!/bin/sh
set -eu

./node_modules/.bin/drizzle-kit migrate

exec node .output/server/index.mjs
