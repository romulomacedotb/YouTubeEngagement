#!/bin/sh
set -e

mkdir -p /data

export SQLITE_DB_PATH="${SQLITE_DB_PATH:-/data/dev.db}"
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"
export LITESTREAM_REPLICA_PATH="${LITESTREAM_REPLICA_PATH:-litestream/dev.db}"

# Auto-detect S3 region for Cloudflare R2 or Backblaze B2 when omitted
if [ -z "${LITESTREAM_REPLICA_REGION}" ] && [ -n "${LITESTREAM_REPLICA_ENDPOINT}" ]; then
  case "${LITESTREAM_REPLICA_ENDPOINT}" in
    *r2.cloudflarestorage.com*)
      export LITESTREAM_REPLICA_REGION="auto"
      ;;
    *s3.*.backblazeb2.com*)
      B2_REGION=$(echo "${LITESTREAM_REPLICA_ENDPOINT}" | sed -E 's|^https?://||; s|^s3\.([^.]+)\.backblazeb2\.com.*|\1|')
      export LITESTREAM_REPLICA_REGION="${B2_REGION:-us-west-004}"
      ;;
    *)
      export LITESTREAM_REPLICA_REGION="us-east-1"
      ;;
  esac
fi

if [ -n "${LITESTREAM_REPLICA_BUCKET}" ] && [ -n "${LITESTREAM_REPLICA_ENDPOINT}" ] && [ -n "${LITESTREAM_ACCESS_KEY_ID}" ] && [ -n "${LITESTREAM_SECRET_ACCESS_KEY}" ]; then
  echo "[Entrypoint] Restaurando dev.db mais recente via Litestream (se existir réplica)..."
  litestream restore -if-replica-exists -config /app/litestream.yml "${SQLITE_DB_PATH}"

  if [ ! -f "${SQLITE_DB_PATH}" ]; then
    node /app/docker/download-seed.mjs
  fi

  echo "[Entrypoint] Aplicando migrations pendentes no dev.db..."
  prisma migrate deploy --schema=/app/prisma/schema.prisma

  echo "[Entrypoint] Iniciando servidor com replicação contínua do dev.db (Litestream)..."
  exec litestream replicate -config /app/litestream.yml -exec "node /app/apps/api/dist/main.js"
else
  echo "[Entrypoint] Aviso: Variáveis LITESTREAM_* não configuradas. Executando dev.db apenas em disco local."
  prisma migrate deploy --schema=/app/prisma/schema.prisma
  exec node /app/apps/api/dist/main.js
fi

