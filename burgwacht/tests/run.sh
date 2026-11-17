#!/bin/bash
# Builds the game and runs all test suites against the standalone page (the one inside the APK).
# Screenshots the suites take are written to the current directory.
here="$(cd "$(dirname "$0")" && pwd)"
python3 "$here/../build.py" || exit 1
fail=0
for suite in core menu world; do
  out="$(node "$here/suite-$suite.js" 2>&1)"
  echo "suite-$suite: $(grep -c '^PASS' <<<"$out") passed, $(grep -c '^FAIL' <<<"$out") failed — $(tail -1 <<<"$out" | cut -c1-200)"
  grep '^FAIL' <<<"$out" | cut -c1-300
  grep -q 'ALLE TESTS BESTANDEN' <<<"$out" || fail=1
done
exit $fail
