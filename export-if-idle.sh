#!/bin/bash
# Trigger Drafts export only if the Mac has been idle for 5+ minutes
idle_ms=$(ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF; exit}')
idle_min=$((idle_ms / 1000000000 / 60))

if [ "$idle_min" -ge 5 ]; then
    open "drafts://runAction?action=Export%20drafts%20(silent)&allowEmpty=true"
fi
