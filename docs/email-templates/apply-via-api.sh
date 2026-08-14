#!/usr/bin/env bash
# Read + set a Supabase Auth email template directly via Supabase's
# Management API, bypassing the Dashboard UI entirely.
#
# Why this exists: three separate dashboard paste-and-save attempts for the
# original "Confirm signup" template all resulted in the OLD template still
# being used for real sends (confirmed by inspecting the raw source of
# actually-received emails each time) despite the dashboard editor
# appearing to accept the paste. This script proves definitively what's
# saved server-side, and sets it in a way that doesn't depend on any
# dashboard UI behavior. Originally hardcoded to "confirmation" only;
# generalized here to cover all five templates this app now ships, since
# the Management API's field-naming pattern (mailer_subjects_<kind> /
# mailer_templates_<kind>_content) is identical across all of them.
#
# Usage:
#   Fill in the token yourself (in your own editor/terminal, never in chat)
#   at ../../.env.supabase-admin.local - this script auto-loads it below.
#   Get a token from: https://supabase.com/dashboard/account/tokens
#
#   ./docs/email-templates/apply-via-api.sh <kind> check   # GET current saved template
#   ./docs/email-templates/apply-via-api.sh <kind> apply   # PATCH with the local .html file
#   ./docs/email-templates/apply-via-api.sh <kind> check   # GET again to confirm it changed
#
# <kind> is one of: confirmation | invite | recovery | email_change | reauthentication

set -euo pipefail

PROJECT_REF="bprrrycjqpqiegkakjsm"
ADMIN_ENV_FILE="$(dirname "$0")/../../.env.supabase-admin.local"

KIND="${1:-}"
ACTION="${2:-}"

case "$KIND" in
  confirmation)
    TEMPLATE_FILE="$(dirname "$0")/confirm-signup.html"
    SUBJECT="Confirm your email - United Fans Hub"
    ;;
  invite)
    TEMPLATE_FILE="$(dirname "$0")/invite.html"
    SUBJECT="You're invited to United Fans Hub"
    ;;
  recovery)
    TEMPLATE_FILE="$(dirname "$0")/recovery.html"
    SUBJECT="Reset your password - United Fans Hub"
    ;;
  email_change)
    TEMPLATE_FILE="$(dirname "$0")/email-change.html"
    SUBJECT="Confirm your new email address - United Fans Hub"
    ;;
  reauthentication)
    TEMPLATE_FILE="$(dirname "$0")/reauthentication.html"
    SUBJECT="{{ .Token }} is your United Fans Hub verification code"
    ;;
  *)
    echo "Usage: $0 {confirmation|invite|recovery|email_change|reauthentication} {check|apply}" >&2
    exit 1
    ;;
esac

# Auto-load SUPABASE_ACCESS_TOKEN from the dedicated admin-only env file if
# present and not already set in the current shell (an explicit `export` in
# your own session still takes precedence).
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "$ADMIN_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ADMIN_ENV_FILE"; set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN is not set." >&2
  echo "Fill it in at $ADMIN_ENV_FILE (get a token from https://supabase.com/dashboard/account/tokens)," >&2
  echo "or export SUPABASE_ACCESS_TOKEN=... directly in this shell session." >&2
  exit 1
fi

case "$ACTION" in
  check)
    echo "Fetching current saved '$KIND' template for project $PROJECT_REF ..."
    curl -sS "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "User-Agent: united-fans-hub-admin-script/1.0" \
      | python3 -c "
import json, sys
kind = '$KIND'
cfg = json.load(sys.stdin)
subj = cfg.get(f'mailer_subjects_{kind}', '(not set)')
body = cfg.get(f'mailer_templates_{kind}_content', '')
print('Subject:', subj)
print('Body length:', len(body), 'chars')
print('Contains base64 data URI:', 'data:image/png;base64' in body)
print('Contains hosted PNG URL:', 'manchester-united-emblem.png' in body and 'data:' not in body.split('manchester-united-emblem.png')[0][-50:] if 'manchester-united-emblem.png' in body else False)
print()
print('First 300 chars of body:')
print(body[:300])
print()
print('Last 300 chars of body:')
print(body[-300:])
"
    ;;
  apply)
    if [ ! -f "$TEMPLATE_FILE" ]; then
      echo "Template file not found: $TEMPLATE_FILE" >&2
      exit 1
    fi
    echo "Applying $TEMPLATE_FILE ($(wc -c < "$TEMPLATE_FILE") bytes) as '$KIND' template ..."
    python3 -c "
import json, os, sys, urllib.request

kind = sys.argv[1]
template_file = sys.argv[2]
subject = sys.argv[3]
project_ref = sys.argv[4]
token = os.environ['SUPABASE_ACCESS_TOKEN']

with open(template_file, 'r', encoding='utf-8') as f:
    body = f.read()

payload = json.dumps({
    f'mailer_subjects_{kind}': subject,
    f'mailer_templates_{kind}_content': body,
}).encode('utf-8')

req = urllib.request.Request(
    f'https://api.supabase.com/v1/projects/{project_ref}/config/auth',
    data=payload,
    method='PATCH',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        # Cloudflare (fronting api.supabase.com) blocks the default Python
        # urllib User-Agent as a bot signature (Cloudflare error 1010) -
        # a real UA string is required for the request to reach Supabase at
        # all, independent of the token or permissions being correct.
        'User-Agent': 'united-fans-hub-admin-script/1.0',
    },
)
with urllib.request.urlopen(req) as resp:
    print('HTTP', resp.status)
    result = json.load(resp)
    saved_body = result.get(f'mailer_templates_{kind}_content', '')
    print('Server confirms saved body length:', len(saved_body), 'chars')
    print('Server-confirmed body contains hosted PNG URL (not base64):',
          'manchester-united-emblem.png' in saved_body and 'data:image/png;base64' not in saved_body)
" "$KIND" "$TEMPLATE_FILE" "$SUBJECT" "$PROJECT_REF"
    ;;
  *)
    echo "Usage: $0 {confirmation|invite|recovery|email_change|reauthentication} {check|apply}" >&2
    exit 1
    ;;
esac
