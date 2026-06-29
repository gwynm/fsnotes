#!/bin/bash
open "$(xcodebuild -workspace FSNotes.xcworkspace -scheme 'FSNotes' -showBuildSettings 2>/dev/null | grep ' BUILT_PRODUCTS_DIR' | head -1 | sed 's/.*= //')"
