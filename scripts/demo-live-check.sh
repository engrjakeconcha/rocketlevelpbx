#!/bin/sh
set -eu

COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT

TOKEN="$(curl -s -c "$COOKIE" https://rocketaischedule.jcit.digital/api/auth/csrf | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')"

curl -s -b "$COOKIE" -c "$COOKIE" -X POST https://rocketaischedule.jcit.digital/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$TOKEN" \
  --data-urlencode "email=pbxsupport@rocketlevelcommercial.com" \
  --data-urlencode "password=Admin1234" \
  --data-urlencode "callbackUrl=https://rocketaischedule.jcit.digital/overview" \
  --data-urlencode "json=true" >/dev/null

printf 'SCHEDULE PUT\n'
curl -s -b "$COOKIE" -X PUT https://rocketaischedule.jcit.digital/api/schedule \
  -H "Content-Type: application/json" \
  --data @- <<'JSON'
{"timezone":"America/New_York","weeklyRules":[{"dayOfWeek":0,"isOpen":false,"startTime":null,"endTime":null},{"dayOfWeek":1,"isOpen":true,"startTime":"08:00","endTime":"17:00"},{"dayOfWeek":2,"isOpen":true,"startTime":"08:00","endTime":"17:00"},{"dayOfWeek":3,"isOpen":true,"startTime":"08:00","endTime":"17:00"},{"dayOfWeek":4,"isOpen":true,"startTime":"08:00","endTime":"17:00"},{"dayOfWeek":5,"isOpen":true,"startTime":"08:00","endTime":"16:00"},{"dayOfWeek":6,"isOpen":false,"startTime":null,"endTime":null}],"holidayClosures":[{"name":"Memorial Day","startsAt":"2026-05-25T00:00:00.000Z","endsAt":"2026-05-25T23:59:59.000Z"}],"overrides":[{"label":"Team Retreat","mode":"FORCE_CLOSED","startsAt":"2026-04-10T14:00:00.000Z","endsAt":"2026-04-10T22:00:00.000Z","targetNumber":null}]}
JSON

printf '\n---\nCOVERAGE PUT\n'
curl -s -b "$COOKIE" -X PUT https://rocketaischedule.jcit.digital/api/coverage \
  -H "Content-Type: application/json" \
  --data @- <<'JSON'
{"coverageGroupId":"cmn3pufil00223vmoc6dgbi20","members":[{"displayLabel":"Backup 2","memberType":"EXTERNAL_NUMBER","destinationNumber":"+15555550113","enabled":true,"temporaryStatus":"ACTIVE","sortOrder":1},{"displayLabel":"Primary Tech","memberType":"USER","destinationNumber":"+15555550111","enabled":true,"temporaryStatus":"ACTIVE","sortOrder":2},{"displayLabel":"Backup 1","memberType":"EXTERNAL_NUMBER","destinationNumber":"+15555550112","enabled":true,"temporaryStatus":"ACTIVE","sortOrder":3}]}
JSON

printf '\n---\nVERIFY SCHEDULE\n'
curl -s -b "$COOKIE" https://rocketaischedule.jcit.digital/api/schedule

printf '\n---\nVERIFY COVERAGE\n'
curl -s -b "$COOKIE" https://rocketaischedule.jcit.digital/api/coverage
