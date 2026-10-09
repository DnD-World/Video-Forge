#!/usr/bin/env bash
# Wait for the 1xx batch to finish every row, then render 2xx-5xx in one queue.
# One render at a time: starting early would collide on the render port.
cd "/c/Users/strav/Documents/CLAUDE SPACE/BYOK-Vid-Creator"
STATE="jobs/series-1xx.queue.state.json"
until [ -f "$STATE" ] && [ "$(node -e "console.log(Object.keys(require('./$STATE').rows||{}).length)")" -ge 14 ]; do
  sleep 60
done
sleep 30
node tools/run-queue.mjs jobs/series-2to5.queue.json
