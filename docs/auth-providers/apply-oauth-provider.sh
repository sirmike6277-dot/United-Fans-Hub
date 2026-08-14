#!/usr/bin/env bash
# Enable a social sign-in provider (Google or Apple) directly via Supabase's
# Management API, same secure pattern as docs/email-templates/apply-via-api.sh:
# the access token AND the OAuth client id/secret all stay in your own local
# .env.supabase-admin.local file, never pasted into chat.
#
# Why this exists: SocialAuthButtons.tsx already calls the real
# supabase.auth.signInWithOAuth() correctly - "Google/Apple sign-in isn't set
# up yet" is not a code bug, it's that external_google_enabled and
# external_apple_enabled are both false with no client_id/secret set (confirmed
# via a live read of this project's own Auth config, not assumed). Fixing
# that requires real OAuth credentials from Google/Apple's own developer
# consoles - this script only handles getting those credentials INTO
# Supabase once you have them; see docs/auth-providers/README.md for how to
# actually generate them.
#
# Usage:
#   Fill in the values yourself (own editor/terminal, never in chat) at
#   ../../.env.supabase-admin.local - this script auto-loads it below.
#
#   ./docs/auth-providers/apply-oauth-provider.sh google check
#   ./docs/auth-providers/apply-oauth-provider.sh google apply
#   ./docs/auth-providers/apply-oauth-provider.sh apple check
#   ./docs/auth-providers/apply-oauth-provider.sh apple apply

set -euo pipefail

PROJECT_REF="bprrrycjqpqiegkakjsm"
ADMIN_ENV_FILE="$(dirname "$0")/../../.env.supabase-admin.local"

PROVIDER="${1:-}"
ACTION="${2:-}"

case "$PROVIDER" in
  google) ID_VAR="GOOGLE_OAUTH_CLIENT_ID"; SECRET_VAR="GOOGLE_OAUTH_CLIENT_SECRET" ;;
  apple)  ID_VAR="APPLE_OAUTH_SERVICES_ID"; SECRET_VAR="APPLE_OAUTH_CLIENT_SECRET" ;;
  *)
    echo "Usage: $0 {google|apple} {check|apply}" >&2
    exit 1
    ;;
esac

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "$ADMIN_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ADMIN_ENV_FILE"; set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN is not set." >&2
  echo "Fill it in at $ADMIN_ENV_FILE (get a token from https://supabase.com/dashboard/account/tokens)." >&2
  exit 1
fi

case "$ACTION" in
  check)
    echo "Fetching current '$PROVIDER' provider status for project $PROJECT_REF ..."
    curl -sS "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "User-Agent: united-fans-hub-admin-script/1.0" \
      | python3 -c "
import json, sys
provider = '$PROVIDER'
cfg = json.load(sys.stdin)
enabled = cfg.get(f'external_{provider}_enabled')
client_id = cfg.get(f'external_{provider}_client_id')
secret = cfg.get(f'external_{provider}_secret')
print('Enabled:', enabled)
print('Client ID set:', bool(client_id), f'(value: {client_id})' if client_id else '')
print('Secret set:', bool(secret), f'(length: {len(secret)})' if secret else '')
"
    ;;
  apply)
    if [ -z "${!ID_VAR:-}" ] || [ -z "${!SECRET_VAR:-}" ]; then
      echo "Fill in $ID_VAR and $SECRET_VAR in $ADMIN_ENV_FILE first." >&2
      exit 1
    fi
    echo "Enabling '$PROVIDER' for project $PROJECT_REF ..."
    python3 -c "
import json, os, sys, urllib.request

provider = sys.argv[1]
client_id = os.environ[sys.argv[2]]
secret = os.environ[sys.argv[3]]
project_ref = sys.argv[4]
token = os.environ['SUPABASE_ACCESS_TOKEN']

payload = json.dumps({
    f'external_{provider}_enabled': True,
    f'external_{provider}_client_id': client_id,
    f'external_{provider}_secret': secret,
}).encode('utf-8')

req = urllib.request.Request(
    f'https://api.supabase.com/v1/projects/{project_ref}/config/auth',
    data=payload,
    method='PATCH',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'united-fans-hub-admin-script/1.0',
    },
)
with urllib.request.urlopen(req) as resp:
    print('HTTP', resp.status)
    result = json.load(resp)
    print('Server confirms enabled:', result.get(f'external_{provider}_enabled'))
    print('Server confirms client_id:', result.get(f'external_{provider}_client_id'))
" "$PROVIDER" "$ID_VAR" "$SECRET_VAR" "$PROJECT_REF"
    ;;
  *)
    echo "Usage: $0 {google|apple} {check|apply}" >&2
    exit 1
    ;;
esac
