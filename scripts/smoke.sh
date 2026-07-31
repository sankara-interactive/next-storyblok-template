#!/usr/bin/env bash
# Phase 0 smoke test against a running dev server.
# Usage: ./scripts/smoke.sh [base-url]   (default http://localhost:3000)
#
# Requires a dev server running against a space bootstrapped by `yarn setup:space`.
# Baseline stories may be unpublished drafts; `next dev` reads drafts, so that is fine.
BASE="${1:-http://localhost:3000}"
pass=0; fail=0

chk() { # chk <name> <condition-result>
  if [ "$2" = "1" ]; then printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1))
  else printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); fi
}

echo "Smoke test against $BASE"
echo
echo "Home page"
HOME_HTML=$(curl -s "$BASE/")
HOME_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
chk "/ returns 200 (got $HOME_CODE)"                 "$([ "$HOME_CODE" = 200 ] && echo 1)"
chk "renders headline 'Template-Demoseite'"          "$(grep -qF 'Template-Demoseite' <<<"$HOME_HTML" && echo 1)"
chk "renders eyebrow 'Willkommen'"                   "$(grep -qF 'Willkommen' <<<"$HOME_HTML" && echo 1)"

echo
echo "Rich text"
chk "bold mark renders as <strong>"                  "$(grep -qE '<strong>fett</strong>' <<<"$HOME_HTML" && echo 1)"
chk "internal link resolves to /about"               "$(grep -qE 'href="/about"' <<<"$HOME_HTML" && echo 1)"
chk "email link renders as mailto:"                  "$(grep -qF 'mailto:hallo@example.ch' <<<"$HOME_HTML" && echo 1)"
chk "embedded blok renders inside richtext"          "$(grep -qF 'Eingebetteter Blok' <<<"$HOME_HTML" && echo 1)"

echo
echo "Second page"
ABOUT_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/about")
chk "/about returns 200 (got $ABOUT_CODE)"           "$([ "$ABOUT_CODE" = 200 ] && echo 1)"
chk "/about renders its headline"                    "$(curl -s "$BASE/about" | grep -qF 'Über uns' && echo 1)"

echo
echo "CMS redirects (Phase A2)"
R=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/alt")
chk "/alt -> 308 /about  (got: $R)"                  "$(grep -qE '^308 .*/about$' <<<"$R" && echo 1)"
RQ=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/alt?utm_source=mail")
chk "query preserved  (got: $RQ)"                    "$(grep -qE '^308 .*/about\?utm_source=mail$' <<<"$RQ" && echo 1)"

echo
echo "Negative cases"
NF=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/definitely-not-a-page")
chk "unknown path 404s (got $NF)"                    "$([ "$NF" = 404 ] && echo 1)"
DR=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/data/redirects")
chk "data/ route not routable (got $DR)"             "$([ "$DR" = 404 ] && echo 1)"

echo
echo "$pass passed, $fail failed"
[ "$fail" = 0 ] || exit 1
