# Deployment runbook

## Runtime and release preparation

Supported: one Ubuntu VPS, Docker Compose, host HTTPS reverse proxy, PostgreSQL 17,
and the `private_files` Docker volume on persistent server disk. The app listens only on the host
loopback interface. Use `docker-compose.prod.yml` by itself; do not merge the
development Compose file into it.
Local development/CI uses Node 22.12+ (or supported Node 24/26+) and the committed npm lockfile.

1. Point the public domain at the VPS. A verified Resend sending domain is optional
   during DEC-023 side-project mode.
2. Copy `.env.production.example` to `.env.production`, restrict it to mode 0600,
   and replace every required placeholder. Generate independent AUTH_SECRET, CRON_SECRET,
   and POSTGRES_PASSWORD values with `openssl rand -hex 32`. Use a URL-safe database
   password. Do not reuse development secrets or copy the development `.env`.
3. Confirm that the Compose resource preserves the `private_files` named volume
   across redeployments. Do not delete it when recreating the application resource.

4. Install and configure nginx using `deploy/nginx.conf.example`, substituting the
   hostname and certificate paths. Configure valid certificates before enabling
   the TLS server. Permit only SSH and HTTP(S) in the firewall. Do not publish
   PostgreSQL or expose the private-files directory through nginx. Overwrite
   forwarded host/IP headers as in the example: the app trusts this proxy.
5. Check configuration and launch from the repository root:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   docker compose --env-file .env.production -f docker-compose.prod.yml ps -a
   curl --fail http://127.0.0.1:3000/api/health
   ```

   The one-shot `migrate` service applies all Prisma migrations before the app
   starts. Schema rollout failure blocks app startup. Production startup rejects
   placeholder secrets, partially configured email settings, non-HTTPS APP_URL, and
   unusable storage. Resend settings may both be omitted during DEC-023. The image
   excludes `.env`, local uploads, Git, and development packages.
   Do not run `compose config` without `--quiet` in shared logs: it expands secrets.

   The production volume is project-scoped `production_pgdata`, deliberately
   separate from the development volume. **For an existing installation, first
   identify and back up its database volume; migrate/restore it intentionally.**
   Changing a volume name does not move existing data. Never use `down -v` on a
   live installation.

## Sign-in behavior and upgrades

- During DEC-023, new accounts register and sign in with email and a password of at
  least 12 characters. Passwords are stored only as Argon2id hashes. New password
  accounts are temporarily marked verified without proving mailbox control; this is
  disclosed in the UI and must be removed before public launch.
- Existing email-link verification remains in the code for the future provider-backed
  flow. Its tokens remain 15-minute, hashed, and single-use, but password login does
  not depend on outbound email during DEC-023.
- All sessions created before this authentication change are rejected by the
  session-version guard. Rotate AUTH_SECRET at rollout.
- Persistent database rate limits cover sign-in requests and credential callbacks.
  The nginx example adds perimeter protection. An outbox delivery marked SENT means
  the provider accepted the message, not proof that it arrived in the inbox.
- A failed initial sign-in/invitation email returns an error and is retained for
  bounded retry; the user can request another link/resend. Normal review and
  commitment notices are queued for the scheduled dispatcher.

## Notification schedule

Install a host cron entry, adapting the repository path:

```cron
* * * * * cd /srv/etfago/app && flock -n /run/lock/etfago-notifications.lock bash deploy/notification-cron.sh >> /var/log/etfago-notifications.log 2>&1
```

Only run one dispatcher/scheduler for this single-node deployment. Use `flock`
for manual dispatch too. The cron endpoint fails closed without CRON_SECRET.
Do not start additional standalone workers alongside this schedule. Restrict
notification log permissions, rotate logs, and alert on command failures and
terminal FAILED outbox entries. Expired rate-limit rows can be removed daily:

```sql
DELETE FROM "AuthRateLimit" WHERE "resetAt" < NOW() - INTERVAL '1 day';
```

## Consistent backups and a real restore rehearsal

`scripts/backup-rehearsal.ts` is an **integrity checker**, not a database backup or
restore. A passing checksum check does not replace the following rehearsal.

1. Disable notification cron/other writers for the maintenance window. Run
   `BACKUP_DIR=/srv/etfago/backups bash deploy/backup.sh`. It stops the app, takes a
   custom-format PostgreSQL dump and a matching private-files archive, then restarts
   the app even on failure. Re-enable cron after the backup.
2. Encrypt both artifacts and send them, with their checksums, to an independent
   off-host destination. Restrict staging permissions. Record retention, encryption
   key handling, backup schedule, and owner. Alert on backups older than 24 hours.
3. Restore **on a separate staging VPS**, with a new database/volume, new secrets,
   staging hostname, and isolated email delivery. Validate checksums before restore.
   Start only the database with the staging production Compose environment, then:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
     sh -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database.dump
   docker compose --env-file .env.production -f docker-compose.prod.yml run --rm \
     --no-deps --entrypoint sh -T app \
     -c 'tar -C /data/etfago/private-files -xzf -' < private-files.tar.gz
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d
   ```

   Restore into an empty database. Keep cron disabled and outbound email isolated
   until any restored pending outbox has been reviewed; restored invites and login
   URLs may contain the original hostname. Never rehearse on live data volumes.
4. Sign in with an authorized test account, download a known attachment, compare
   SHA-256 with the pre-backup file and restored metadata, and verify a third account
   is denied. Recreate the app container and repeat the download. Record date,
   result, backup identifier, and measured recovery time in the release record.

## Final host acceptance before enabling users

- HTTPS and secure session cookies work on the real hostname, including AR/EN
  password registration and sign-in. Wrong passwords do not issue sessions.
- When outbound email is later enabled, test real delivery to two controlled
  mailboxes and remove DEC-023 automatic verification before public traffic.
- Two accounts invite, join, approve V1, amend, request changes, and approve a fresh
  version; a third account cannot read the agreement or its attachments.
- Upload/download succeeds; bytes survive container replacement and the documented
  database + file restore rehearsal. Missing/unwritable storage makes health fail.
- Cron runs, queued notices are delivered, and provider failures remain retryable.
- Monitor health/5xx, disk free space/inodes, backup age, and failed notifications.
- Confirm launch-domain privacy, retention, and sender settings. Record actual
  host checks separately from automated local tests.

For upgrades, take a consistent backup first, build the release, stop the app for
the controlled migration window, run the migration service, and start the new app.
If a schema change is incompatible, restore the matching database **and** files
from the maintenance backup with the prior image; do not blindly downgrade code
against a changed schema.

## Local verification record (2026-11-25)

- Production Next.js build succeeded with `DISABLE_BUILD_CACHE=1` after the local
  Windows disk filled. This flag disables webpack's build cache only.
- TypeScript, ESLint, all 256 unit/integration tests, the actual production-server HTTP
  auth smoke test, and full `npm audit` passed. The HTTP check covers AR/EN routes,
  health, cron denial, secure cookies, email-only denial, real token login,
  non-consuming GET previews, and replay denial.
- Prisma validated and migration `20261125000000_auth_rate_limits` was applied to
  the configured local database. Production Compose syntax and shell-script syntax
  checks passed.
- A local Docker build attempt timed out without output; the image and Linux
  container startup have **not** been verified locally. CI includes the Docker build.
- No real Resend delivery, VPS HTTPS/cookie check, volume-replacement test, or actual
  database + file restore was performed. Complete the host acceptance section above
  before treating this release as production-signed-off.
