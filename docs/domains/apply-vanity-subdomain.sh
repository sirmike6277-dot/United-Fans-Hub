#!/usr/bin/env bash
# Claims a free Supabase "vanity subdomain" (e.g. manutdfanshub.supabase.co
# instead of the random bprrrycjqpqiegkakjsm.supabase.co) via the Management
# API. No extra cost beyond the org's existing Pro plan - unlike Custom
# Domains, this is not a paid add-on. Same secure pattern as the other
# scripts in docs/: the access token stays in .env.supabase-admin.local and
# is never printed.
#
# Usage:
#   ./docs/domains/apply-vanity-subdomain.sh <subdomain> check
#   ./docs/domains/apply-vanity-subdomain.sh <subdomain> activate
#   ./docs/domains/apply-vanity-subdomain.sh "" status
#   ./docs/domains/apply-vanity-subdomain.sh "" delete

set -euo pipefail

PROJECT_REF="bprrrycjqpqiegkakjsm"
ADMIN_ENV_FILE="$(dirname "$0")/../../.env.supabase-admin.local"

SUBDOMAIN="${1:-}"
ACTION="${2:-}"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "$ADMIN_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ADMIN_ENV_FILE"; set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN is not set." >&2
  echo "Fill it in at $ADMIN_ENV_FILE (get a token from https://supabase.com/dashboard/account/tokens)." >&2
  exit 1
fi

api() {
  local method="$1" path="$2" data="${3:-}"
  local args=(-sS -w "\n%{http_code}" -X "$method"
    "https://api.supabase.com/v1/projects/$PROJECT_REF/vanity-subdomain$path"
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
    -H "User-Agent: united-fans-hub-admin-script/1.0"
    -H "Content-Type: application/json")
  if [ -n "$data" ]; then args+=(-d "$data"); fi
  curl "${args[@]}"
}

case "$ACTION" in
  check)
    [ -n "$SUBDOMAIN" ] || { echo "Usage: $0 <subdomain> check" >&2; exit 1; }
    echo "Checking availability of '$SUBDOMAIN.supabase.co' ..."
    api POST "/check-availability" "{\"vanity_subdomain\":\"$SUBDOMAIN\"}"
    echo
    ;;
  activate)
    [ -n "$SUBDOMAIN" ] || { echo "Usage: $0 <subdomain> activate" >&2; exit 1; }
    echo "Activating '$SUBDOMAIN.supabase.co' for project $PROJECT_REF ..."
    api POST "/activate" "{\"vanity_subdomain\":\"$SUBDOMAIN\"}"
    echo
    ;;
  status)
    echo "Current vanity subdomain config for project $PROJECT_REF ..."
    api GET ""
    echo
    ;;
  delete)
    echo "Removing vanity subdomain from project $PROJECT_REF ..."
    api DELETE ""
    echo
    ;;
  *)
    echo "Usage: $0 <subdomain> {check|activate}" >&2
    echo "       $0 \"\" {status|delete}" >&2
    exit 1
    ;;
esac
