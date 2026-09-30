#!/usr/bin/env python3
"""Print where each beat of a scene falls once the narration has been synthesized (needs the episode's timeline.json).

  beats.py <episode> S06 [S07 ...]    seconds from the start of each scene, with its spoken and total length
"""
import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "engine"))
import sync  # noqa: E402

if len(sys.argv) < 3:
    sys.exit(__doc__)
episode = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("episode_script", episode / "src" / "script.py")
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)
timeline_path = episode / "timeline.json"
if not timeline_path.is_file():
    sys.exit(f"beats.py: {timeline_path} is missing; run `make-episode run <episode> --until tts` first")
timeline = {s["id"]: s for s in json.loads(timeline_path.read_text(encoding="utf-8"))["scenes"]}
for sid in sys.argv[2:]:
    found = [(t, r) for s, t, r in script.SCENES if s == sid]
    if not found or sid not in timeline:
        sys.exit(f"beats.py: unknown scene {sid}")
    text, reveals = found[0]
    timed = timeline[sid]
    print(f"{sid}  voice {timed['duration']:.2f} s, scene {timed['end'] - timed['start']:.2f} s")
    for key, phrase in reveals.items():
        print(f"  {key:10} {sync.phrase_time(text, timed['subtitles'], phrase, 'word'):6.2f}  {phrase}")
