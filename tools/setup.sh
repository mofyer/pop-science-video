#!/bin/sh
# One-time setup: the pinned Node dependencies (HyperFrames, GSAP) and a .venv with the pinned Azure Speech SDK.
set -eu
cd "$(dirname "$0")/.."
for tool in node npm python3 ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 || { echo "setup.sh: $tool is not on PATH; install it first (Node.js 22 or newer, Python 3, FFmpeg)" >&2; exit 1; }
done
major=$(node -p "process.versions.node.split('.')[0]")
[ "$major" -ge 22 ] || { echo "setup.sh: Node.js 22 or newer is needed; found $(node --version)" >&2; exit 1; }
echo "node $(node --version), $(python3 --version), $(ffmpeg -version | head -1 | cut -d' ' -f1-3)"
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
echo "Done. Check the environment with: ./make-episode doctor"
