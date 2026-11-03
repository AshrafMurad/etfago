# 11 — Deployment, environments and operations

## Supported topology (V1)
A single Ubuntu Linux VPS running an HTTPS reverse proxy, one Next.js application instance, PostgreSQL, and a **persistent local attachment volume**. Docker/Coolify acceptable as orchestration, provided the bind mount survives redeployment and app container replacement. No managed S3/object-storage dependency.

## Configuration (.env.example to be created by implementation)
```dotenv
NODE_ENV=production
APP_URL=https://example.com
DATABASE_URL=postgresql://USER:PASSWORD@db:5432/etfago
AUTH_SECRET=replace-with-secret
# AUTH_TRUST_HOST=true     # only if required by reverse proxy/auth setup
RESEND_API_KEY=replace-with-secret
EMAIL_FROM=no-reply@example.com
STORAGE_ROOT=/data/etfago/private-files
MAX_UPLOAD_BYTES=10485760
MAX_WORKSPACE_STORAGE_BYTES=209715200
LOG_LEVEL=info
```
Never commit real credentials. `APP_URL` must match HTTPS hostname; use secret management and rotate leaked keys. Each environment has separate database, storage path and email behavior.

## VPS folder and persistence plan
```text
/srv/etfago/
  compose/                      # infra definitions and config (secured)
  private-files/                # persistent attachment bytes (0700)
  backups/                      # temporary local staging only; copy off-host
```
Recommended DB persistence uses dedicated Docker volume; file persistence uses explicit bind mount. Ensure ownership matches non-root app container UID and directory permissions. The public reverse proxy may access the app HTTP port but must NEVER serve the private-files path.

## Deployment checklist
1. Configure DNS + HTTPS certificate; redirect HTTP → HTTPS; secure cookies.
2. Create dedicated service user and private directory before starting app.
3. Provision PostgreSQL with limited DB user; migrations via `prisma migrate deploy` during controlled release.
4. Apply environment secrets; restrict service network, database exposure and firewall.
5. Configure reverse proxy upload/request size and timeouts consistent with app limits.
6. Verify app startup fails cleanly if storage path is unavailable/unwritable.
7. Create first account and send verification email via configured Resend sender.
8. Invite second account, approve a test version, upload an image and download it.
9. Replace/recreate app container and repeat file download.
10. Configure monitoring/backup/restore, and validate retention and privacy policy.

## Backup policy (minimum operational standard)
- Database: regular consistent dump/snapshot; verify restore with matching migration schema.
- Files: back up complete `STORAGE_ROOT`; use independent off-host encrypted destination.
- Schedule: start with daily backups and more frequent DB snapshots if actual usage requires; document actual RPO/RTO after testing, do not claim guarantees.
- Consistency: choose either a maintenance window for synchronized DB + file copy or filesystem snapshot + DB transaction cutover/reconciliation.
- Retention: propose 7 daily + 4 weekly encrypted backups; final retention policy must reflect user privacy and applicable regulations.
- Restore test: in staging, restore both DB and attachments, inspect permissions, verify a real download and SHA-256; record date/result.

## Observability
- Structured logs: request ID, safe actor ID, agreement ID, action, status and duration. **No tokens, raw invitations, file contents, sensitive terms, passwords, private file paths**.
- Monitor API 5xx, DB health, failed jobs, invitation delivery failures, disk capacity/inodes, missing files, backups age, security denial counts and spikes.
- Set disk-space alert well before volume fills; reserve enough space for temp uploads and backup staging.
- Error reports must redact agreement text and personally identifying attachments by default.

## Email failure behavior
Email delivery is external even when files are local. A failed email must not create a false claim that the recipient received an invitation. Persist invitation status; allow retry/resend, revoke old token, and record safe event. Retry/outbox semantics are defined in `05`.

## Data retention and deletion
- Users must be informed that agreements may contain personal/business sensitive information.
- Archive ≠ delete. A deletion request can conflict with records shared by other parties; define product retention rules and privacy/legal review before external launch.
- Maintain backup expiry and deletion propagation policy. Do not promise instant erasure from immutable backups.
- Version decisions are user-action records, not legally certified evidence.

## Threat and reliability assumptions
- Host admin can access DB and file bytes (not end-to-end encrypted).
- Local file store is a single-host failure domain; backups mitigate but don't create high availability.
- Local storage is **not** supported on ephemeral hosting (e.g., stateless deployments) and not shared across multiple app nodes.
- Public Internet threats include credential abuse, invite-token leakage, IDOR, forged file uploads, storage exhaustion, CSRF and stored XSS.

## Migration path if scaling later
Do not silently substitute S3. If multi-server requirements arise: produce an RFC describing migration to shared storage or distributed filesystem, authorization, data transfer, monitoring, backup changes, and rollback. Explicit approval required before changing storage architecture.
