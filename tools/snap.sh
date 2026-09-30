#!/bin/sh
# Take extra stills from an episode's silent preview, beyond the three per scene that `make-episode preview` takes.
# Usage: snap.sh <episode-dir> "1.2,3.4,5.6"   (seconds on the preview timeline; scene N runs from (N-1)*10 to N*10)
# Run `make-episode preview <episode-dir>` first. Stills land in <episode-dir>/evidence/snap/.
set -eu
dir=$(cd "$1" && pwd)
repo=$(cd "$(dirname "$0")/.." && pwd)
out="$dir/evidence/snap"
rm -rf "$out"; mkdir -p "$out"
"$repo/node_modules/.bin/hyperframes" snapshot "$dir/preview" --at "$2" --no-end -o "$out" --describe false >"$dir/evidence/snap.log" 2>&1 || { tail -5 "$dir/evidence/snap.log"; exit 1; }
ls "$out"
