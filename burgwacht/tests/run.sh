#!/bin/bash
# Builds the game (python3 build.py) and runs every test suite against the
# standalone page that goes into the APK. Exit code 0 = all suites passed.
#
# Run it from a scratch directory: the suites write screenshots (shop.png,
# menu.png, lava.png, ...) into the current directory.
#
#   cd /some/scratch/dir && /path/to/burgwacht/tests/run.sh
#
# Output: one summary line per suite plus every FAIL line. A suite that crashes
# shows "0 passed, 0 failed"; run it directly with node to see the error.
# bench-weapons.js is not part of this run (it is slow and has no pass/fail).
here="$(cd "$(dirname "$0")" && pwd)"
python3 "$here/../build.py" || exit 1
fail=0
for suite in core menu world progress content; do
  out="$(node "$here/suite-$suite.js" 2>&1)"
  echo "suite-$suite: $(grep -c '^PASS' <<<"$out") passed, $(grep -c '^FAIL' <<<"$out") failed — $(tail -1 <<<"$out" | cut -c1-200)"
  grep '^FAIL' <<<"$out" | cut -c1-300
  grep -q 'ALLE TESTS BESTANDEN' <<<"$out" || fail=1
done
exit $fail
