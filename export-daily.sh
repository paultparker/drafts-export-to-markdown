#!/bin/bash
# Trigger silent Drafts export via URL scheme
# Every 10 min during 6am-11pm, every 30 min otherwise
# (launchd fires every 10 min; off-peak we only run on :00 and :30)
hour=$(date +%H)
min=$(date +%M)
if [ "$hour" -lt 6 ] || [ "$hour" -ge 23 ]; then
    # Off-peak: only run at :00-:09 and :30-:39 (i.e. 1 of every 3 fires)
    if [ "$min" -ge 10 ] && [ "$min" -lt 30 ]; then
        exit 0
    fi
    if [ "$min" -ge 40 ]; then
        exit 0
    fi
fi
open -g "drafts://runAction?action=Export%20drafts%20(silent)&allowEmpty=true"
