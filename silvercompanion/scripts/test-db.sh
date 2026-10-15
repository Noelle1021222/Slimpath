#!/usr/bin/env bash
# Spins up a throw-away PostgreSQL cluster, loads a minimal Supabase shim,
# applies every migration plus the seed, and runs tests/db/*.test.sql.
#
#   npm run test:db
#
# Needs PostgreSQL 15+ server binaries (initdb, pg_ctl, postgres) and psql.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || true)}"
if [[ -z "$PGBIN" || ! -x "$PGBIN/initdb" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
if [[ -z "$PGBIN" || ! -x "$PGBIN/initdb" ]]; then
  echo "PostgreSQL server binaries not found. Set PGBIN=/path/to/postgres/bin" >&2
  exit 1
fi

WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN=()
if [[ "$(id -u)" == "0" ]]; then
  # initdb refuses to run as root; borrow the postgres system user.
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  "${RUN[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -l "$WORK/log" -w \
  -o "-k $WORK -p $PORT -c listen_addresses='' -c timezone=UTC -c wal_level=logical" start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

echo "• Supabase shim"
"${PSQL[@]}" -f "$ROOT/tests/db/supabase-shim.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "• migration $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done

echo "• seed"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"

status=0
for test in "$ROOT"/tests/db/*.test.sql; do
  echo "• $(basename "$test")"
  "${PSQL[@]}" -t -f "$test" || status=1
done
exit $status
