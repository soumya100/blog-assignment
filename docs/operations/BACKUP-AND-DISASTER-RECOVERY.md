# Backup and Disaster Recovery Runbook

**Status: NOT VERIFIED — do not represent backups or recovery as configured until an actual restore has been completed.**

## Current deployment facts and risks

- The application uses MongoDB through `MONGODB_URI`; production startup correctly refuses an in-memory database fallback.
- The Render production API service is on the free web-service plan. Treat its local filesystem as ephemeral. Do not store user uploads, database dumps, or durable application state there.
- Image storage uses Cloudinary. MongoDB backups do not back up Cloudinary assets; those require a separate provider-side export/recovery plan.
- No evidence in the repository proves that Atlas automated backups, point-in-time recovery, Cloudinary asset recovery, or a tested restore schedule are enabled. Confirm the actual provider plan and dashboard settings.

## Required decisions before production

1. Confirm the MongoDB provider, cluster tier, region, retention options, and whether automated backups / point-in-time recovery are available on the current plan.
2. **Recovery objectives:** the requested target RTO is **1 hour**, but it is not yet approved or demonstrated. Do not advertise it as achieved until a timed restore-and-cutover exercise proves it. RPO has not been specified; obtain explicit approval for an acceptable data-loss window before enabling a schedule.
3. Enable provider-managed backups where supported. If the current tier does not support them, select an approved alternative and document the operational owner.
4. Confirm Cloudinary retention, deletion recovery, and asset export options separately.
5. Store backup credentials in a dedicated secret manager; never commit credentials or dumps to GitHub, Render environment variables beyond the minimum required, or public artifacts.
6. Restrict backup access to named operators and encrypt exported dumps at rest and in transit.

## Safe MongoDB backup procedure

Run from a trusted operator workstation or secured backup runner with an approved backup-capable database credential. Never run this against an unapproved URI.

```bash
# Prerequisites: mongodump, mongorestore, age, and sha256sum installed.
# Keep MONGODB_URI in a secret manager / protected shell environment.
# BACKUP_AGE_RECIPIENT is the age public recipient; never expose the private identity.
: "${MONGODB_URI:?Set MONGODB_URI from your secret manager}"
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to the approved age public recipient}"
export BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
umask 077
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN="$BACKUP_DIR/devlog-$STAMP.archive.gz"
ENCRYPTED="$PLAIN.age"

cleanup() { rm -f "$PLAIN"; }
trap cleanup EXIT

mongodump --uri="$MONGODB_URI" --archive="$PLAIN" --gzip
age --recipient "$BACKUP_AGE_RECIPIENT" --output "$ENCRYPTED" "$PLAIN"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$ENCRYPTED")" > "$(basename "$ENCRYPTED").sha256")
rm -f "$PLAIN"

printf 'Encrypted backup ready: %s\n' "$ENCRYPTED"
printf 'Checksum: %s\n' "$ENCRYPTED.sha256"
```

Upload only the `.age` archive and its checksum to a private, access-controlled off-provider destination with retention and lifecycle policies. The recipient public key is not secret; protect the corresponding private identity separately, restrict access to named recovery operators, and maintain a tested offline copy. Do not upload production dumps, decrypted archives, or private keys to GitHub Actions artifacts or source control.

## Restore drill (isolated target only)

1. Provision a temporary isolated MongoDB database/cluster. It must not be the production database.
2. Retrieve the encrypted archive and checksum from the approved private backup destination.
3. Verify the encrypted archive checksum before decryption.
4. Restore using a dedicated URI for the isolated target:

```bash
: "${RESTORE_MONGODB_URI:?Set the isolated restore URI from the secret manager}"
: "${BACKUP_AGE_IDENTITY_FILE:?Set the path to the separately protected age private identity}"
: "${ENCRYPTED_BACKUP_FILE:?Set the path to the retrieved .age archive}"
(cd "$(dirname "$ENCRYPTED_BACKUP_FILE")" && sha256sum -c "$(basename "$ENCRYPTED_BACKUP_FILE").sha256")
RESTORE_ARCHIVE="$(mktemp)"
trap 'rm -f "$RESTORE_ARCHIVE"' EXIT
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" \
  --output "$RESTORE_ARCHIVE" "$ENCRYPTED_BACKUP_FILE"
mongorestore --uri="$RESTORE_MONGODB_URI" \
  --archive="$RESTORE_ARCHIVE" --gzip --drop
```

The example uses `--drop` only against the disposable isolated restore target. Confirm the URI and target project independently before running it. Never use production credentials.

5. Run integrity checks: expected collections, document counts, indexes, representative user/post/comment relationships, refresh-token expiry behavior, and application startup.
6. Validate Cloudinary assets independently; confirm representative stored image URLs resolve and ownership metadata matches the restored records.
7. Record restore start/end time, archive timestamp, data loss window, errors, and operator. Delete the temporary restore environment securely after sign-off.

## Incident recovery sequence

1. Declare incident and freeze risky writes if data integrity is in doubt.
2. Preserve logs and identify the last known-good database snapshot.
3. Restore to an isolated environment first; validate data and application compatibility.
4. Approve cutover, update the database connection through the provider's secure secret mechanism, and restart/redeploy the backend.
5. Verify login, read/write flows, uploads, realtime features, and health checks.
6. Monitor error rates and database metrics; retain the original database snapshot until incident closure.
7. Document root cause, timeline, recovery point/time, customer impact, and follow-up actions.

## Evidence required to close this item

- Provider backup configuration screenshot/export (redact identifiers and secrets).
- Backup timestamp, retention policy, encryption and access-control evidence.
- Successful isolated restore log and integrity-check results.
- Cloudinary asset recovery evidence.
- Approved RPO, timed evidence for the requested 1-hour RTO (or formally revised target), and named operational owner.
