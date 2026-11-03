# 07 — Private server filesystem storage (NO S3)

**Confirmed architecture decision:** store uploaded attachment **bytes in a private persistent directory on the VPS**. PostgreSQL stores **metadata only**. This supersedes any prior recommendation for S3, R2, Cloudinary, or cloud object storage.

## Deployment topology and filesystem
Example (adjust user/group and path to actual VPS):
```text
Host VPS:       /srv/etfago/private-files/     (persistent, owner app UID, 0700)
Docker mount:   /data/etfago/private-files/    (app process writable)
Environment:    STORAGE_ROOT=/data/etfago/private-files
Private key:    ab/ab12...random...               (no extensions from user filename)
```
- Root must be **outside** app's `public/`, Next static assets, and the reverse proxy web root.
- Use a Docker **bind mount or named persistent volume**; document chosen host mount and backup location. A container writable layer alone is NOT persistent storage.
- Run app as non-root. Directory 0700, files 0600, dedicated UID/GID. No symlink mounts or `STORAGE_ROOT` from a request.
- Refuse startup when `STORAGE_ROOT` is unset, unwritable, or points inside public/static directories.
- Single persistent VPS only in V1. Deploying to a platform with an ephemeral filesystem or scaling to multiple nodes **requires explicit storage redesign**.

## Storage key scheme
- Generate 32 cryptographically random bytes per file; encode as opaque safe hex/base64url key.
- Derive subdirectory from first two chars of key to avoid huge directories.
- Save only key in DB (`Attachment.storageKey`); never use client-supplied filename in on-disk path.
- For filesystem operations, join only validated `[a-zA-Z0-9_-]+` keys / derived prefix to fixed root; use `realpath`/path containment and no-follow/open-exclusive controls to defend against symlink/path traversal.
- `originalFilename` is untrusted display metadata: strip path components, controls, invalid Unicode; escape in UI and safe-download header.

## File-type policy (initial)
| Type | MIME | Extension |
|---|---|---|
| PDF | `application/pdf` | `.pdf` |
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` |
| PNG | `image/png` | `.png` |
| WebP | `image/webp` | `.webp` |

Reject SVG, HTML, JS, ZIP, executable and Office files in V1. `Content-Type` header and extension are **not trusted**. Check file signatures/structure with a maintained parser; signature checks alone do not guarantee a file is harmless. No inline rendering in app V1. For public rollout, use antivirus scanning or suitable file scanning controls and quarantine suspicious files; if scanning is not implemented, document this limitation and keep files download-only with strict access.

## Upload protocol
1. User POSTs multipart to `/api/agreements/:id/attachments` with authenticated session; server authorizes upload role and checks agreement active (not archived).
2. Enforce max request payload at reverse proxy/app layer, max **10 MiB per file**, at most **20 files/agreement**, **200 MiB/workspace**; check quotas inside DB transaction/serialized accounting to avoid races.
3. Rate limit endpoint by user, IP, and workspace; timeout slow transfers.
4. Stream request into a randomly named `.tmp` file inside storage root; open atomically exclusive (`wx`) and cap bytes while streaming; reject on overflow and remove temp file.
5. Detect actual file type and validate allowed MIME/signature, sanitize original name, compute SHA-256 of bytes, scan if configured.
6. Write staged metadata (`PENDING`); atomically rename temp to final opaque key in same filesystem; set metadata `READY`. On failure, remove orphan and set `FAILED`, or schedule reconciler.
7. Append `FILE_UPLOADED` activity event and optional notification only after file reaches READY.
8. Respond with opaque attachment ID and display metadata; **never return physical storage path**.

Database + filesystem cannot be atomic together. Implement an **orphan reconciler**: removes stale temp files, marks missing READY entries failed, and deletes detached old files after retention. Do not delete a file still referenced by a READY row.

## Download protocol
1. User GETs `/api/attachments/:id/download`.
2. Server authenticates, loads attachment+agreement, re-checks current agreement access even if metadata was already fetched; confirm state READY.
3. Server constructs a path **only from validated storageKey**, opens securely, and streams bytes with bounded memory usage.
4. Set `Content-Disposition: attachment` with RFC5987-safe encoded display filename; `Content-Type: application/octet-stream`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. Avoid inline PDF/SVG rendering and public caching.
5. Return safe `404`/`403` for unauthorized requests. Support stream abort and missing-file handling without leaking internal paths.

## Deletion
- Only organizer or authorized uploader (policy choice; default organizer) may delete attachment from agreement, and only when it doesn't belong to a required immutable evidence/locked version.
- Soft-delete metadata, log event, and asynchronously remove bytes after configured retention. For version-attached evidence in submitted/approved versions, **do not allow silent hard delete**; flag as unavailable under retention/privacy request policy and preserve event history.
- User account deletion and legal retention need explicit product/legal policy before launch.

## Privacy and security requirements
- Access-control checks on every operation; do not expose CDN, `public/uploads`, signed storage URL, or filesystem path.
- Avoid logging filenames with sensitive content where possible; never log bytes, invite secrets, or paths in client errors.
- Enforce HTTPS, strict cookie/session settings, CSRF/origin checks on writes, malware precautions, input limits and download headers.
- At rest, disk/volume encryption is recommended when VPS/provider supports it. Host administrators with root can access files; do not claim end-to-end encryption.
- Use separate staging and production volumes; no test files or customer data in Git.

## Backups and recovery
- PostgreSQL dump/backup **plus corresponding private-files directory** are both essential. A database-only backup loses attachment contents.
- On single VPS, back up to an **independent protected destination** (not only another directory on same disk); encrypt backups and control retention/access.
- Ensure backup consistency: maintenance-window snapshot (pause file writes), or snapshot + manifest + post-backup reconciliation; document exact method and recovery point.
- Test restore on a separate environment: create agreement and upload file → backup → restore DB + volume → re-authenticate → verify authorized download and check file SHA-256.
- Monitor free disk bytes/inodes, failed uploads, missing physical files, backup age, orphan temp volume growth.

## Docker Compose mount example (illustrative)
```yaml
services:
  app:
    # image/build configuration omitted
    environment:
      STORAGE_ROOT: /data/etfago/private-files
    volumes:
      - /srv/etfago/private-files:/data/etfago/private-files
    # run as dedicated non-root UID with matching ownership
  db:
    image: postgres:17
    volumes:
      - etfago_pgdata:/var/lib/postgresql/data
volumes:
  etfago_pgdata:
```
Version/image tags are examples, not pinned production builds; choose supported versions and pin tested tags when deploying.

## Security acceptance tests
- Anonymous GET, unrelated workspace member GET, and removed invitee GET return denied.
- Tricky `../`, `%2e%2e`, Windows slash, symlink, exotic Unicode filename cannot escape storage root.
- Oversize/wrong content-type/polyglot-like files rejected without READY metadata/orphan.
- Delete during download handles error cleanly and logs no private path.
- App redeploy with replaced container retains volume files.
- Full DB+volume restore yields same checksums and permissions.
