#!/bin/bash
# usage: shotsvg.sh in.svg out.png
google-chrome --headless=new --no-sandbox --hide-scrollbars --window-size=896,1200 --screenshot=$2 file://$(realpath $1) 2>/dev/null
