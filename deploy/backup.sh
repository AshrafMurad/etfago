#!/usr/bin/env bash
# Run from the repository root on the VPS during a maintenance window.
set -euo pipefail
umask 077
: "${BACKUP_DIR:?Set an absolute backup staging directory outside private-files}"
[[ "$BACKUP_DIR" = /* ]] || exit 1
compose=(docker compose --env-file .env.production -f docker-compose.prod.yml)
dest="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$dest"
# Stop all writers, including any separately scheduled notification workers.
"${compose[@]}" stop app
trap '"${compose[@]}" start app' EXIT
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dest/database.dump"
"${compose[@]}" run --rm --no-deps --entrypoint sh app \
  -c 'tar -C /data/etfago/private-files -czf - .' > "$dest/private-files.tar.gz"
(cd "$dest" && sha256sum database.dump private-files.tar.gz > SHA256SUMS)
printf '%s\n' "Backup staged at $dest. Encrypt and copy off-host; verify restoration in staging."
