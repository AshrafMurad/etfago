#!/usr/bin/env bash
# Invoke with cron once per minute from the repository root on the VPS.
set -euo pipefail
# Keep the bearer secret off the host process argument list.
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T app node -e '
fetch("http://127.0.0.1:3000/api/cron/reminders", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  signal: AbortSignal.timeout(250000)
}).then(async r => {
  if (!r.ok) process.exit(1);
  const report = await r.json();
  console.log(JSON.stringify(report));
}).catch(() => process.exit(1));'
