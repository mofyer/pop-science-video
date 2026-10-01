"""Validate an episode spec against its production sheet and resolve it for the renderer.

Narration is never copied by hand: it is extracted from the sheet's `### SXX 旁白` blocks.
"""
import re
from datetime import date
from pathlib import Path

from common import ENGINE, PipelineError, read_json, sha256_bytes
from sfx import MUSIC_STYLES, SOUNDS

VOICE = "zh-CN-XiaoyiNeural"
SUPPORTED_VOICES = (VOICE, "zh-CN-XiaoqiuNeural")
REVEAL_TIMINGS = ("word", "cue")
MOTION_LIMITS = ("max_frozen", "max_beat_gap")
DEFAULT_PAUSE = 0.6
# The bed is synthesized by sfx.music; a spec overrides any of these.
MUSIC_DEFAULTS = {"synth": "marimba", "bpm": 108, "gain_db": -14}
REVEAL_KEY = re.compile(r"^[a-z][a-z0-9_]*$")
HEX_COLOUR = re.compile(r"#[0-9a-fA-F]{6}")
# The film's first frame is its cover: a title and an optional subtitle, short enough to stay on one line each.
COVER_LIMITS = {"title": 16, "subtitle": 28}
# Model-written visuals must render the same frame every time and stay inside the episode.
VISUALS_FORBIDDEN = [
    (re.compile(r"Math\.random"), "Math.random makes frames non-deterministic"),
    (re.compile(r"\bDate\b|performance\.now"), "wall-clock time makes frames non-deterministic"),
    (re.compile(r"\bfetch\s*\(|XMLHttpRequest|WebSocket"), "network access is not allowed"),
    (re.compile(r"\bimport\s*\(|\brequire\s*\("), "dynamic imports are not allowed"),
    (re.compile(r"^\s*import\b", re.M), "visuals.mjs must not import modules"),
    (re.compile(r"\bprocess\.|\bglobalThis\b|\beval\s*\(|\bFunction\s*\("), "runtime escapes are not allowed"),
    (re.compile(r"https?://(?!www\.w3\.org/)"), "external URLs are not allowed"),
    # Every visible word must be in the markup so verification can read it.
    (re.compile(r"\bcontent\s*:\s*((['\"])[^'\"]|attr\s*\(|counter)"), "CSS content text is not allowed; put visible text in the markup"),
    (re.compile(r"textContent|innerHTML|innerText|outerHTML|insertAdjacent|document\.write|createTextNode"
                r"|\.(append|prepend|replaceWith|replaceChildren)\s*\("), "runtime text insertion is not allowed"),
    (re.compile(r"\b(fill|stroke)Text\s*\("), "words drawn on a canvas cannot be verified; show them as labels"),
]


def narration_blocks(sheet_text):
    """Return [(scene_id, narration)] from `### SXX 旁白` sections, joining paragraphs with newlines."""
    blocks, current, lines = [], None, []
    for line in sheet_text.splitlines():
        heading = re.match(r"^(#{1,6})\s", line)
        if heading:
            if current:
                blocks.append((current, _join(lines)))
            match = re.match(r"^### (S\d\d) 旁白\s*$", line)
            current, lines = (match.group(1) if match else None), []
        elif current:
            lines.append(line)
    if current:
        blocks.append((current, _join(lines)))
    return blocks


def _join(lines):
    paragraphs, buffer = [], []
    for line in lines + [""]:
        if line.strip():
            buffer.append(line.strip())
        elif buffer:
            paragraphs.append("".join(buffer))
            buffer = []
    return "\n".join(paragraphs)


def load_guardrails():
    return read_json(ENGINE / "guardrails.json")["rules"]


def guardrail_violations(text, where, exceptions=(), scene=None):
    """Return human-readable violations of the banned-claim rules, minus user-approved exceptions.

    With scene=None (whole-page text) an exception for the rule in any scene applies.
    """
    allowed = {(item["rule"], item["scene"]) for item in exceptions}
    found = []
    for rule in load_guardrails():
        if (rule["id"], scene) in allowed or (scene is None and any(r == rule["id"] for r, _ in allowed)):
            continue
        match = re.search(rule["pattern"], text)
        if match:
            found.append(f"{where}: rule {rule['id']} matched “{match.group(0)}” ({rule['why']})")
    return found


def check_visuals_source(path):
    source = Path(path).read_text(encoding="utf-8")
    problems = [f"{Path(path).name}: {why}" for pattern, why in VISUALS_FORBIDDEN if pattern.search(source)]
    if problems:
        raise PipelineError("; ".join(problems))


def _is_date(value):
    try:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(value))) and bool(date.fromisoformat(str(value)))
    except ValueError:
        return False


def _require(condition, message):
    if not condition:
        raise PipelineError(message)


def _text(value, field):
    _require(isinstance(value, str) and value.strip(), f"{field} must be a non-empty string")
    return value


def resolve(episode_dir):
    """Validate episode.spec.json + production sheet and return the renderer's resolved episode."""
    episode_dir = Path(episode_dir)
    spec = read_json(episode_dir / "episode.spec.json")
    sheet_path = episode_dir / spec.get("sheet", "production-sheet.md")
    _require(sheet_path.is_file(), f"Production sheet not found: {sheet_path.name}")
    sheet_bytes = sheet_path.read_bytes()
    sheet_text = sheet_bytes.decode("utf-8")
    blocks = narration_blocks(sheet_text)
    _require(blocks, "Production sheet has no `### SXX 旁白` sections")
    ids = [scene_id for scene_id, _ in blocks]
    _require(ids == [f"S{i:02}" for i in range(1, len(ids) + 1)], f"Sheet narration ids must be S01…S{len(ids):02} in order, got {ids}")
    _require(all(body for _, body in blocks), "Every narration block must have text")

    _require("theme" not in spec, "theme is not a spec field: this engine draws one kind of picture, the full-frame canvas stage; remove it")
    voice = spec.get("voice", VOICE)
    _require(voice in SUPPORTED_VOICES, f"voice must be one of {SUPPORTED_VOICES}")
    timing = spec.get("reveal_timing", "word")
    _require(timing in REVEAL_TIMINGS, f"reveal_timing must be one of {REVEAL_TIMINGS}")
    motion = spec.get("motion")
    if motion is not None:
        _require(isinstance(motion, dict) and motion and set(motion) <= set(MOTION_LIMITS)
                 and all(isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0 for v in motion.values()),
                 f"motion needs positive seconds for any of {MOTION_LIMITS}")
    accent = spec.get("accent")
    if accent is not None:
        # The stage's own chrome: the series text and the progress bar's start colour, then the bar's end colour.
        _require(isinstance(accent, list) and len(accent) == 2 and all(isinstance(c, str) and HEX_COLOUR.fullmatch(c) for c in accent),
                 "accent must be two #rrggbb colours")
        accent = [c.lower() for c in accent]
    cover = spec.get("cover")
    _require(isinstance(cover, dict) and "title" in cover and set(cover) <= set(COVER_LIMITS),
             "cover needs a title and may have a subtitle: the film's first frame is its cover")
    _text(cover["title"], "cover.title")
    _require(isinstance(cover.get("subtitle", ""), str), "cover.subtitle must be a string")
    cover = {field: cover.get(field, "").strip() for field in COVER_LIMITS}
    for field, limit in COVER_LIMITS.items():
        _require(len(cover[field]) <= limit, f"cover.{field} must be at most {limit} characters")
    music = {**MUSIC_DEFAULTS, **spec.get("music", {})}
    _require(set(music) == set(MUSIC_DEFAULTS), "music takes synth, bpm and gain_db only")
    _require(music["synth"] in MUSIC_STYLES, f"music.synth must be one of {MUSIC_STYLES}")
    _require(isinstance(music["bpm"], (int, float)) and 60 <= music["bpm"] <= 180, "music.bpm must be between 60 and 180")
    _require(isinstance(music["gain_db"], (int, float)) and -30 <= music["gain_db"] <= -6, "music.gain_db must be between -30 and -6")
    exceptions = spec.get("guardrail_exceptions", [])
    for item in exceptions:
        _require({"rule", "scene", "reason", "approved_by_user"} <= set(item), "guardrail_exceptions need rule, scene, reason, approved_by_user")
        _require(_is_date(item["approved_by_user"]), "approved_by_user must be the YYYY-MM-DD date the user approved it")

    sources = spec.get("sources", [])
    source_ids = [item.get("id") for item in sources]
    _require(len(set(source_ids)) == len(source_ids), "Duplicate source ids")
    for item in sources:
        _require(re.fullmatch(r"F\d\d", item.get("id") or ""), "source id must look like F01")
        _text(item.get("label"), f"source {item['id']}.label")
        _require(re.fullmatch(r"https://\S+", item.get("url") or ""), f"source {item['id']}.url must be https")
        _require(item["id"] in sheet_text, f"source {item['id']} is not in the production sheet's fact ledger")

    spec_scenes = spec.get("scenes", [])
    _require([s.get("id") for s in spec_scenes] == ids, "spec scenes must match the sheet's narration ids one to one")
    scenes, errors = [], []
    for raw, (scene_id, narration) in zip(spec_scenes, blocks):
        source = raw.get("source")
        if source is not None:
            _require(source.get("ids") and set(source["ids"]) <= set(source_ids), f"{scene_id}.source.ids must reference declared sources")
            _text(source.get("text"), f"{scene_id}.source.text")
        reveals = raw.get("reveals", {})
        for key, phrase in reveals.items():
            _require(REVEAL_KEY.match(key), f"{scene_id}.reveals key {key!r} must be lowercase identifier")
            _require(isinstance(phrase, str) and phrase, f"{scene_id}.reveals.{key} must be a phrase")
            _require(narration.count(phrase) == 1, f"{scene_id}.reveals.{key} phrase {phrase!r} must occur exactly once in the narration")
        sounds = raw.get("sfx", {})
        _require(isinstance(sounds, dict), f"{scene_id}.sfx must map a reveal key, or start, to a sound name")
        _require(not ("start" in sounds and "start" in reveals), f"{scene_id}: with sfx.start, no reveal may be named start")
        for anchor, sound in sounds.items():
            _require(anchor == "start" or anchor in reveals, f"{scene_id}.sfx.{anchor} must be start or one of the scene's reveals")
            _require(sound in SOUNDS, f"{scene_id}.sfx.{anchor} must be one of {tuple(SOUNDS)}")
        pause = raw.get("pause_after", DEFAULT_PAUSE)
        _require(isinstance(pause, (int, float)) and 0.2 <= pause <= 10, f"{scene_id}.pause_after must be 0.2–10 seconds")
        errors += guardrail_violations(narration, f"{scene_id} narration", exceptions, scene_id)
        if source is not None:
            errors += guardrail_violations(source["text"], f"{scene_id} source line", exceptions, scene_id)
        scenes.append({"id": scene_id, "narration": narration, "source": source, "reveals": reveals,
                       "pause_after": float(pause), "sfx": sounds})
    errors += guardrail_violations(" ".join(cover.values()), "cover", exceptions)
    if errors:
        raise PipelineError("Banned claims found:\n" + "\n".join(errors))
    title = _text(spec.get("title"), "title")
    resolved = {"title": title, "cover": cover, "series": _text(spec.get("series"), "series"),
                "footer": spec.get("footer", "情境与图表为示意"), "voice": voice, "music": music,
                "reveal_timing": timing, "motion": motion,
                "sources": sources, "guardrail_exceptions": exceptions,
                "sheet": {"file": sheet_path.name, "sha256": sha256_bytes(sheet_bytes)}, "scenes": scenes}
    # Only present when asked for; without it the stage keeps its default colours.
    if accent:
        resolved["accent"] = accent
    return resolved
