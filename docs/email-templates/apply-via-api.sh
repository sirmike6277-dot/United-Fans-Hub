#!/usr/bin/env bash
# One-off helper: read + set the "Confirm signup" email template directly via
# Supabase's Management API, bypassing the Dashboard UI entirely.
#
# Why this exists: three separate dashboard paste-and-save attempts all
# resulted in the OLD template still being used for real sends (confirmed by
# inspecting the raw source of actually-received emails each time) despite
# the dashboard editor appearing to accept the paste. This script proves
# definitively what's saved server-side, and sets it in a way that doesn't
# depend on any dashboard UI behavior.
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # personal access token, from
#                                            # https://supabase.com/dashboard/account/tokens
#                                            # NEVER commit this, never paste it into chat -
#                                            # this script only reads it from your own shell env.
#   ./docs/email-templates/apply-via-api.sh check   # GET current saved template, show first/last 200 chars
#   ./docs/email-templates/apply-via-api.sh apply   # PATCH with the current confirm-signup.html
#   ./docs/email-templates/apply-via-api.sh check   # GET again to confirm it actually changed

set -euo pipefail

PROJECT_REF="bprrrycjqpqiegkakjsm"
TEMPLATE_FILE="$(dirname "$0")/confirm-signup.html"
SUBJECT="Confirm your email - United Fans Hub"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Set SUPABASE_ACCESS_TOKEN first (from https://supabase.com/dashboard/account/tokens)." >&2
  exit 1
fi

case "${1:-}" in
  check)
    echo "Fetching current saved auth config for project $PROJECT_REF ..."
    curl -sS "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      | python3 -c '
import json, sys
cfg = json.load(sys.stdin)
subj = cfg.get("mailer_subjects_confirmation", "(not set)")
body = cfg.get("mailer_templates_confirmation_content", "")
print("Subject:", subj)
print("Body length:", len(body), "chars")
print("Contains base64 data URI:", "data:image/png;base64" in body)
print("Contains hosted PNG URL:", "manchester-united-emblem.png" in body and "data:" not in body.split("manchester-united-emblem.png")[0][-50:])
print()
print("First 300 chars of body:")
print(body[:300])
print()
print("Last 300 chars of body:")
print(body[-300:])
'
    ;;
  apply)
    if [ ! -f "$TEMPLATE_FILE" ]; then
      echo "Template file not found: $TEMPLATE_FILE" >&2
      exit 1
    fi
    echo "Applying $TEMPLATE_FILE ($(wc -c < "$TEMPLATE_FILE") bytes) as Confirm signup template ..."
    python3 -c '
import json, os, sys, urllib.request

template_file = sys.argv[1]
subject = sys.argv[2]
project_ref = sys.argv[3]
token = os.environ["SUPABASE_ACCESS_TOKEN"]

with open(template_file, "r", encoding="utf-8") as f:
    body = f.read()

payload = json.dumps({
    "mailer_subjects_confirmation": subject,
    "mailer_templates_confirmation_content": body,
}).encode("utf-8")

req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{project_ref}/config/auth",
    data=payload,
    method="PATCH",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
)
with urllib.request.urlopen(req) as resp:
    print("HTTP", resp.status)
    result = json.load(resp)
    saved_body = result.get("mailer_templates_confirmation_content", "")
    print("Server confirms saved body length:", len(saved_body), "chars")
    print("Server-confirmed body contains hosted PNG URL (not base64):",
          "manchester-united-emblem.png" in saved_body and "data:image/png;base64" not in saved_body)
' "$TEMPLATE_FILE" "$SUBJECT" "$PROJECT_REF"
    ;;
  *)
    echo "Usage: $0 {check|apply}" >&2
    exit 1
    ;;
esac
