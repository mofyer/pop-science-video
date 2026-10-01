"""Acceptance checks on the finished episode; writes evidence/verification.{json,md}."""
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

from common import KEY_FILE, PipelineError, read_json, tool, write_json
from spec import guardrail_violations

SKIP_CLASSES = {"caption", "preview"}
BINARY_SUFFIXES = {".wav", ".mp4", ".mp3", ".ttf", ".png", ".jpg", ".part"}
NUMBER = re.compile(r"\d+(?:\.\d+)?")


class VisibleText(HTMLParser):
    """Collect page text that viewers see, excluding scripts, styles, captions and the preview notice."""

    def __init__(self):
        super().__init__()
        self.stack, self.parts = [], []

    def handle_starttag(self, tag, attrs):
        if tag in ("meta", "br", "img", "source", "link"):
            return
        classes = set((dict(attrs).get("class") or "").split())
        skip = tag in ("script", "style", "title") or bool(classes & SKIP_CLASSES) or bool(self.stack and self.stack[-1])
        self.stack.append(skip)

    def handle_endtag(self, tag):
        if tag not in ("meta", "br", "img", "source", "link") and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if not (self.stack and self.stack[-1]) and data.strip():
            self.parts.append(data.strip())


def visible_text(html):
    parser = VisibleText()
    parser.feed(html)
    return "\n".join(parser.parts)


def numbers(text):
    return {str(float(n)).rstrip("0").rstrip(".") for n in NUMBER.findall(text)}


def unsourced_numbers(on_screen, sheet_text):
    """Numbers shown on screen that never appear in the production sheet."""
    return sorted(numbers(on_screen) - numbers(sheet_text), key=float)


def parse_srt(text):
    cues = []
    for block in text.strip().split("\n\n"):
        lines = block.split("\n")
        start, end = [_seconds(value) for value in lines[1].split(" --> ")]
        cues.append({"start": start, "end": end, "text": "\n".join(lines[2:])})
    return cues


def _seconds(stamp):
    hours, minutes, rest = stamp.split(":")
    seconds, milliseconds = rest.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(milliseconds) / 1000


def probe(path):
    output = subprocess.run([tool("ffprobe"), "-v", "error", "-show_entries",
                             "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,duration",
                             "-of", "json", str(path)], check=True, capture_output=True, text=True).stdout
    return json.loads(output)


def loudness(path):
    log = subprocess.run([tool("ffmpeg"), "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = log[log.rfind("Summary:"):]
    integrated = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    return integrated, peak


# Regions are w:h:x:y. The stage is where a scene is drawn, between the series badge and the captions.
STAGE_REGION = "1920:760:0:110"
# The opening frame is judged on a tighter box that leaves out the series badge and the page margins.
OPENING_REGION = "1720:685:100:200"
# Motion is measured between the top bar and the captions, where the scene itself is drawn.
MOTION_REGION = "1920:780:0:110"
MOTION_RATE = 4
# Share of the region's pixels that changed between two samples: below the first the picture is frozen,
# at or above the second something the viewer notices has happened (a visual beat).
FROZEN_FLOOR, BEAT_FLOOR = 0.0005, 0.02
# The stage is light, so anything drawn on it has outlines at least this dark (luma, 0–255).
ART_LUMA = 120


def has_art(path, at, region):
    """Whether the region of the frame at `at` seconds shows artwork; False when the frame cannot be read."""
    log = subprocess.run([tool("ffmpeg"), "-hide_banner", "-ss", f"{at:.3f}", "-i", str(path), "-frames:v", "1",
                          "-vf", f"crop={region},signalstats,metadata=print", "-f", "null", "-"], capture_output=True, text=True).stderr
    match = re.search(r"lavfi\.signalstats\.YMIN=(\d+)", log)
    return bool(match) and int(match.group(1)) <= ART_LUMA


def motion_profile(path, region=MOTION_REGION, rate=MOTION_RATE):
    """Share of the region's pixels that changed between consecutive samples, `rate` samples a second."""
    log = subprocess.run([tool("ffmpeg"), "-hide_banner", "-nostats", "-i", str(path), "-an", "-vf",
                          f"fps={rate},crop={region},format=gray,tblend=all_mode=difference,lutyuv=y='if(gt(val,24),255,0)',signalstats,metadata=print",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    return [float(value) / 255 for value in re.findall(r"lavfi\.signalstats\.YAVG=([\d.]+)", log)]


def motion_summary(profile, rate=MOTION_RATE):
    """The longest frozen stretch and the longest wait between visual beats, in seconds."""
    frozen = wait = longest_frozen = longest_wait = 0
    for share in profile:
        frozen = frozen + 1 if share < FROZEN_FLOOR else 0
        wait = 0 if share >= BEAT_FLOOR else wait + 1
        longest_frozen, longest_wait = max(longest_frozen, frozen), max(longest_wait, wait)
    return {"max_frozen": longest_frozen / rate, "max_beat_gap": longest_wait / rate,
            "mean_change": sum(profile) / len(profile) if profile else 0.0, "samples": len(profile)}


def extract_frame(path, at, destination):
    subprocess.run([tool("ffmpeg"), "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", str(path), "-frames:v", "1", str(destination)], check=True)


def contact_sheet(frames, destination, columns=4):
    if not frames:
        return
    inputs = []
    for frame in frames:
        inputs += ["-i", str(frame)]
    count = len(frames)
    layout = "|".join(f"{(i % columns) * 640}_{(i // columns) * 360}" for i in range(count))
    scaled = "".join(f"[{i}:v]scale=640:360[s{i}];" for i in range(count))
    stacked = "".join(f"[s{i}]" for i in range(count))
    graph = scaled + (f"{stacked}xstack=inputs={count}:layout={layout}:fill=black" if count > 1 else "[s0]null")
    subprocess.run([tool("ffmpeg"), "-v", "error", "-y", *inputs, "-filter_complex", graph, "-frames:v", "1", str(destination)], check=True)


def structure(timeline):
    """How long the opening runs, its first line, and where every scene starts; reported, never blocking."""
    scenes = timeline["scenes"]
    first = scenes[0]
    return {"total": scenes[-1]["end"],
            "opening": {"id": first["id"], "seconds": first["end"] - first["start"],
                        "first_cue": first["subtitles"][0]["text"].strip() if first["subtitles"] else ""},
            "closing": {"id": scenes[-1]["id"], "start": scenes[-1]["start"]},
            "scenes": [{"id": s["id"], "start": s["start"], "seconds": s["end"] - s["start"]} for s in scenes]}


def structure_lines(summary):
    opening, closing = summary["opening"], summary["closing"]
    lines = ["## 结构时间点", "", "只报告，不拦截。", "",
             f"- 全片 {summary['total']:.1f} 秒；首镜 {opening['id']} 时长 {opening['seconds']:.1f} 秒，首句“{opening['first_cue']}”。",
             f"- 末镜 {closing['id']} {closing['start']:.1f} 秒起。", "",
             "| 镜头 | 起点（秒） | 时长（秒） |", "|---|---|---|"]
    return lines + [f"| {s['id']} | {s['start']:.1f} | {s['seconds']:.1f} |" for s in summary["scenes"]]


def files_containing_secret(root, key_file=KEY_FILE):
    """Return files under root that contain the Azure key; the key itself is never returned."""
    try:
        from tts_azure import read_key_file
        key, _ = read_key_file(key_file)
    except PipelineError:
        return None
    hits = []
    for path in Path(root).rglob("*"):
        if path.is_file() and not path.is_symlink() and path.suffix not in BINARY_SUFFIXES:
            try:
                if key in path.read_text(encoding="utf-8", errors="ignore"):
                    hits.append(str(path.relative_to(root)))
            except OSError:
                continue
    return hits


def verify(root, resolved, final):
    root, final = Path(root), Path(final)
    checks, failures = {}, []

    def check(name, ok, detail):
        checks[name] = {"ok": bool(ok), "detail": detail}
        if not ok:
            failures.append(f"{name}: {detail}")

    info = probe(final)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = next(s for s in info["streams"] if s["codec_type"] == "audio")
    check("streams", (video["codec_name"], video["width"], video["height"], video["r_frame_rate"], audio["codec_name"],
                      audio["sample_rate"], audio["channels"]) == ("h264", 1920, 1080, "30/1", "aac", "48000", 2),
          f"{video['codec_name']} {video['width']}x{video['height']} {video['r_frame_rate']} / {audio['codec_name']} {audio['sample_rate']} Hz {audio['channels']} ch")
    gap = abs(float(video["duration"]) - float(audio["duration"]))
    check("av_duration", gap < 1 / 30, f"video {video['duration']} s, audio {audio['duration']} s")
    decode = subprocess.run([tool("ffmpeg"), "-v", "error", "-i", str(final), "-f", "null", "-"], capture_output=True, text=True)
    check("decode", decode.returncode == 0 and not decode.stderr.strip(), f"exit {decode.returncode}, stderr {len(decode.stderr)} bytes")
    integrated, peak = loudness(final)
    check("loudness", -17 <= integrated <= -15 and peak <= -1.5, f"{integrated} LUFS, true peak {peak} dBTP")

    timeline = read_json(root / "timeline.json")
    narration = "".join(s["narration"] for s in resolved["scenes"])
    cues = parse_srt((root / "output" / "subtitles.zh-CN.srt").read_text(encoding="utf-8"))
    ordered = all(c["start"] < c["end"] for c in cues) and all(a["end"] <= b["start"] + .001 for a, b in zip(cues, cues[1:]))
    within = cues and cues[-1]["end"] <= float(info["format"]["duration"])
    check("subtitles", ordered and within and re.sub(r"\s", "", "".join(c["text"] for c in cues)) == re.sub(r"\s", "", narration),
          f"{len(cues)} cues, verbatim, ordered and within duration")

    sheet_text = (root / resolved["sheet"]["file"]).read_text(encoding="utf-8")
    on_screen = visible_text((root / "index.html").read_text(encoding="utf-8"))
    (root / "evidence" / "onscreen-text.txt").write_text(on_screen + "\n", encoding="utf-8")
    missing = unsourced_numbers(on_screen, sheet_text)
    check("onscreen_numbers", not missing, "all on-screen numbers appear in the production sheet" if not missing else f"not in the sheet: {missing}")
    banned = guardrail_violations(on_screen, "on-screen text", resolved["guardrail_exceptions"])
    for scene in resolved["scenes"]:
        banned += guardrail_violations(scene["narration"], f"{scene['id']} subtitles", resolved["guardrail_exceptions"], scene["id"])
    check("guardrails", not banned, "; ".join(banned) or "no banned claims on screen or in subtitles")

    keyframes = root / "evidence" / "keyframes"
    keyframes.mkdir(parents=True, exist_ok=True)
    opening = keyframes / "first-frame.png"
    extract_frame(final, 0, opening)
    # The first frame is the cover: the cover's title on the page, over a first scene that is already drawn.
    drawn, cover = has_art(final, 0, OPENING_REGION), resolved["cover"]["title"]
    covered = cover in on_screen.splitlines()
    check("first_frame", drawn and covered, f"the opening frame shows the cover “{cover}” over the first scene" if drawn and covered
          else f"the cover “{cover}” is not on the page" if not covered else "the opening frame is blank below the series badge")
    frames, empty = [opening], []
    for scene in timeline["scenes"]:
        at = scene["start"] + (scene["end"] - scene["start"]) * .68
        frame = keyframes / f"{scene['id']}.png"
        extract_frame(final, at, frame)
        frames.append(frame)
        if not has_art(final, at, STAGE_REGION):
            empty.append(scene["id"])
    contact_sheet(frames, root / "evidence" / "keyframes-contact.png")
    check("no_empty_frames", not empty, "every scene's stage has visible content" if not empty else f"empty stage: {empty}")

    motion = motion_summary(motion_profile(final))
    limits = resolved.get("motion")
    if limits:
        over = [f"{name} {motion[name]:.2f} s exceeds {limit} s" for name, limit in limits.items() if motion[name] > limit]
        check("motion", not over, "; ".join(over) or f"longest frozen stretch {motion['max_frozen']:.2f} s, longest wait between beats {motion['max_beat_gap']:.2f} s")

    hits = files_containing_secret(root)
    check("secret_scan", hits is not None and not hits, "key config unreadable, scan skipped" if hits is None else (f"key found in {hits}" if hits else "no project file contains the Azure key"))

    summary = structure(timeline)
    report = {"file": final.name, "duration": float(info["format"]["duration"]), "bytes": int(info["format"]["size"]),
              "checks": checks, "structure": summary, "motion": motion, "ok": not failures}
    write_json(root / "evidence" / "verification.json", report)
    lines = [f"# 验收记录：{resolved['title']}", "", f"成片：`{final.name}`，{report['duration']:.3f} 秒，{report['bytes']} 字节。", "",
             "| 检查 | 结果 | 说明 |", "|---|---|---|"]
    lines += [f"| {name} | {'通过' if item['ok'] else '未通过'} | {item['detail']} |" for name, item in checks.items()]
    lines += ["", *structure_lines(summary)]
    lines += ["", "## 动态", "", f"每秒取 {MOTION_RATE} 帧比较相邻画面（不含字幕区）。" + ("" if limits else "本期未设阈值，只报告，不拦截。"), "",
              f"- 最长完全静止：{motion['max_frozen']:.2f} 秒。", f"- 两次明显变化之间最长间隔：{motion['max_beat_gap']:.2f} 秒。",
              f"- 平均每次取样变化的画面占比：{motion['mean_change']:.2%}。"]
    lines += ["", "未验证：人工听审（读音、语气、音乐比例）、手机端播放与平台转码。首帧与逐镜抽帧拼图见 `keyframes-contact.png`，需人工或多模态模型查看。"]
    (root / "evidence" / "verification.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if failures:
        raise PipelineError("Verification failed:\n" + "\n".join(failures))
    return report
