#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGSERVICE:?Set the approved PostgreSQL backup service name}"
: "${PGSERVICEFILE:?Set the protected pg_service.conf path}"
: "${BACKUP_DIR:?Set the protected backup directory on Russian infrastructure}"
: "${BACKUP_RECIPIENT:?Set the age public recipient key}"
command -v pg_dump >/dev/null
command -v age >/dev/null
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
backup_partial="$(mktemp "$BACKUP_DIR/database-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX.partial")"
trap 'rm -f "$backup_partial"' EXIT
pg_dump --format=custom --no-owner --no-acl | age --recipient "$BACKUP_RECIPIENT" > "$backup_partial"
test -s "$backup_partial"
mv "$backup_partial" "${backup_partial%.partial}.dump.age"
trap - EXIT
printf '%s\n' 'Encrypted backup completed.'
