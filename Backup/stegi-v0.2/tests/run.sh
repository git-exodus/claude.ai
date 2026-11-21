#!/bin/bash
# Builds the game (python3 build.py) and runs every test suite against the
# standalone page that goes into the APK. Exit code 0 = all suites passed.
#
# Run it from a scratch directory: suite-ui.js writes screenshots (ui-*.png)
# into the current directory.
#
#   cd /some/scratch/dir && /path/to/stegi/tests/run.sh
#
# Output: one summary line per suite plus every FAIL line. A suite that crashes
# shows "0 passed, 0 failed"; run it directly with node to see the error.
# make-icon.js is not a test (it renders the app icon).
here="$(cd "$(dirname "$0")" && pwd)"
python3 "$here/../build.py" || exit 1
fail=0
for suite in core ui places; do
  out="$(node "$here/suite-$suite.js" 2>&1)"
  echo "suite-$suite: $(grep -c '^PASS' <<<"$out") passed, $(grep -c '^FAIL' <<<"$out") failed — $(tail -1 <<<"$out" | cut -c1-200)"
  grep '^FAIL' <<<"$out" | cut -c1-300
  grep -q 'ALLE TESTS BESTANDEN' <<<"$out" || fail=1
done
exit $fail
