"""One-command episode builder.

  make-episode run <episode-dir> [--until STAGE] [--from STAGE] [--retry-tts S03,S07]
  make-episode preview <episode-dir>      validate + silent preview snapshots and contact sheet
  make-episode doctor                     check tools, pinned versions, shared assets and key config

Stages: validate → tts → mix → compose → check → render → mux → verify. Every stage records an
input fingerprint in evidence/run.json; --from refuses to resume when an earlier stage's inputs changed.
"""
import argparse
import fcntl
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (AZURE_SDK_VERSION, ENGINE, HYPERFRAMES, KEY_FILE, SHARED_ASSETS, PipelineError,  # noqa: E402
                    materialize_public, read_json, sha256_bytes, sha256_file, tool, verify_shared_assets, write_json)

STAGES = ["validate", "tts", "mix", "compose", "check", "render", "mux", "verify"]
COMPOSER = ENGINE / "compose_stage.mjs"
# kit.mjs is the optional shared drawing library an episode loads in front of its visuals.mjs.
VISUALS = ("kit.mjs", "visuals.mjs")


def file_hash(path):
    path = Path(path)
    return sha256_file(path) if path.is_file() else None


def digest(value):
    return sha256_bytes(json.dumps(value, sort_keys=True, ensure_ascii=False).encode())


def output_name(root, resolved):
    stem = re.sub(r"[\s，。？！、：；,.?!:;/\\\"'（）()《》“”]+", "_", resolved["title"]).strip("_")
    return f"{root.name}_{stem}.mp4"


def stage_outputs(stage, root):
    """Hashes of what a stage produced; a resume refuses when any of them was replaced afterwards."""
    names = {"validate": ["build/resolved.json"], "tts": ["timeline.json", "output/narration.wav", "output/subtitles.zh-CN.srt"],
             "mix": ["audio/final-mix.wav"], "compose": ["index.html"], "render": ["output/render_raw.mp4"]}.get(stage, [])
    if stage == "mux":
        names = ["output/" + output_name(root, read_json(root / "build" / "resolved.json"))]
    if stage == "compose":
        names += sorted(f"public/{p.name}" for p in (root / "public").iterdir()) if (root / "public").is_dir() else []
    return {name: file_hash(root / name) for name in names}


def fingerprint(stage, root):
    """Hash everything a stage consumes, so a later --from can prove its inputs are unchanged."""
    code = {name: file_hash(ENGINE / name) for name in ("common.py", "spec.py", "tts_azure.py", "mix.py", "sfx.py", "sync.py",
                                                       "compose_stage.mjs", "verify.py", "guardrails.json")}
    resolved = root / "build" / "resolved.json"
    if stage == "validate":
        spec = read_json(root / "episode.spec.json") if (root / "episode.spec.json").is_file() else {}
        inputs = {"spec": file_hash(root / "episode.spec.json"), "sheet": file_hash(root / spec.get("sheet", "production-sheet.md")),
                  "visuals": [file_hash(root / name) for name in VISUALS], "code": [code["spec.py"], code["guardrails.json"], code["common.py"]]}
    elif stage == "tts":
        scenes = read_json(resolved)["scenes"]
        inputs = {"narration": [(s["id"], s["narration"], s["pause_after"]) for s in scenes], "voice": read_json(resolved)["voice"],
                  "sdk": AZURE_SDK_VERSION, "code": code["tts_azure.py"]}
    elif stage == "mix":
        episode = read_json(resolved)
        # Sound effects are placed from the reveals and the narration timing, so both are inputs here.
        inputs = {"narration": file_hash(root / "output" / "narration.wav"), "music": episode["music"],
                  "sounds": [(s["id"], s["reveals"], s["sfx"]) for s in episode["scenes"]], "reveal_timing": episode["reveal_timing"],
                  "timeline": file_hash(root / "timeline.json"), "code": [code["mix.py"], code["sfx.py"], code["sync.py"]]}
    elif stage == "compose":
        pictures = sorted((root / "assets").iterdir()) if (root / "assets").is_dir() else []
        inputs = {"resolved": file_hash(resolved), "timeline": file_hash(root / "timeline.json"),
                  "visuals": [file_hash(root / name) for name in VISUALS], "pictures": {p.name: file_hash(p) for p in pictures},
                  "mix": file_hash(root / "audio" / "final-mix.wav"), "assets": SHARED_ASSETS,
                  "code": [code["compose_stage.mjs"], code["sync.py"]]}
    elif stage == "check":
        inputs = {"page": file_hash(root / "index.html")}
    elif stage == "render":
        inputs = {"page": file_hash(root / "index.html"), "mix": file_hash(root / "audio" / "final-mix.wav")}
    elif stage == "mux":
        inputs = {"raw": file_hash(root / "output" / "render_raw.mp4"), "mix": file_hash(root / "audio" / "final-mix.wav")}
    else:
        final = root / "output" / output_name(root, read_json(resolved))
        inputs = {"final": file_hash(final), "resolved": file_hash(resolved), "code": code["verify.py"]}
    return digest(inputs)


class EpisodeLock:
    def __init__(self, root):
        self.handle = open(root / ".lock", "w")
        try:
            fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.handle.close()
            raise PipelineError(f"{root.name} is already being built by another process") from None

    def release(self):
        fcntl.flock(self.handle, fcntl.LOCK_UN)
        self.handle.close()


def run_command(arguments, log=None):
    result = subprocess.run(arguments, capture_output=True, text=True)
    if log:
        Path(log).write_text(result.stdout + result.stderr, encoding="utf-8")
    if result.returncode != 0:
        tail = (result.stderr or result.stdout).strip().splitlines()[-5:]
        raise PipelineError(f"{Path(arguments[0]).name} failed (exit {result.returncode}): " + " | ".join(tail))
    return result


def stage_validate(root, options):
    import spec as spec_module
    verify_shared_assets()
    spec_module.check_visuals_source(root / "visuals.mjs")
    if (root / "kit.mjs").is_file():
        spec_module.check_visuals_source(root / "kit.mjs")
    resolved = spec_module.resolve(root)
    (root / "build").mkdir(exist_ok=True)
    write_json(root / "build" / "resolved.json", resolved)
    return {"scenes": len(resolved["scenes"]), "characters": sum(len(s["narration"]) for s in resolved["scenes"])}


def stage_tts(root, options):
    import tts_azure
    resolved = read_json(root / "build" / "resolved.json")
    client = tts_azure.AzureAudio(root, resolved["voice"], retry=options.retry_tts)
    try:
        return tts_azure.build(root, resolved, client)
    finally:
        client.close()


def stage_mix(root, options):
    import mix
    import sync
    resolved, timeline = read_json(root / "build" / "resolved.json"), read_json(root / "timeline.json")
    return mix.mix(root, timeline["duration"], resolved["music"], sync.sound_events(resolved, timeline))


def check_labels(root, resolved):
    """Stop before rendering when a stage label or the cover shows an unsourced number or a banned claim."""
    import spec as spec_module
    import verify
    text = "\n".join([*read_json(root / "build" / "labels.json").values(), *resolved["cover"].values()])
    missing = verify.unsourced_numbers(text, (root / resolved["sheet"]["file"]).read_text(encoding="utf-8"))
    if missing:
        raise PipelineError(f"Label numbers not in the production sheet: {missing}")
    banned = spec_module.guardrail_violations(text, "labels", resolved["guardrail_exceptions"])
    if banned:
        raise PipelineError("Banned claims found:\n" + "\n".join(banned))


def stage_compose(root, options):
    import sync
    resolved = read_json(root / "build" / "resolved.json")
    materialize_public(root / "public")
    write_json(root / "build" / "beats.json", sync.beats(resolved, read_json(root / "timeline.json")))
    run_command([tool("node"), str(COMPOSER), str(root)], root / "evidence" / "compose.log")
    check_labels(root, resolved)
    return {"page_sha256": file_hash(root / "index.html")}


CHECK_SECTIONS = ("lint", "runtime", "layout", "motion", "contrast")


def check_failures(report, returncode):
    """Reasons a HyperFrames check must stop the build; runtime and layout warnings count as errors."""
    problems = [] if returncode == 0 else [f"exit {returncode}"]
    if report.get("ok") is not True:
        problems.append("ok is not true")
    problems += [f"missing {name}" for name in CHECK_SECTIONS if not isinstance(report.get(name), dict)]
    for name in CHECK_SECTIONS:
        section = report.get(name) if isinstance(report.get(name), dict) else {}
        count = section.get("errorCount", 0) + (section.get("warningCount", 0) if name in ("runtime", "layout") else 0)
        if count:
            problems.append(f"{name}: {count}")
    return problems


def stage_check(root, options):
    result = subprocess.run([str(HYPERFRAMES), "check", str(root), "--json"], capture_output=True, text=True)
    (root / "evidence" / "check.json").write_text(result.stdout, encoding="utf-8")
    try:
        report = json.loads(result.stdout)
    except ValueError:
        raise PipelineError(f"HyperFrames check returned no JSON (exit {result.returncode}); see evidence/check.json") from None
    problems = check_failures(report, result.returncode)
    if problems:
        raise PipelineError(f"HyperFrames check failed: {'; '.join(problems)}; see evidence/check.json")
    return {name: {"errors": report[name].get("errorCount", 0), "warnings": report[name].get("warningCount", 0)} for name in CHECK_SECTIONS}


def stage_render(root, options):
    run_command([str(HYPERFRAMES), "render", str(root), "-o", str(root / "output" / "render_raw.mp4"), "-q", "high"], root / "evidence" / "render.log")
    return {"raw_sha256": file_hash(root / "output" / "render_raw.mp4")}


def stage_mux(root, options):
    final = root / "output" / output_name(root, read_json(root / "build" / "resolved.json"))
    run_command([tool("ffmpeg"), "-v", "error", "-y", "-i", str(root / "output" / "render_raw.mp4"), "-i", str(root / "audio" / "final-mix.wav"),
                 "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest",
                 "-movflags", "+faststart", str(final)])
    return {"file": final.name, "sha256": file_hash(final)}


def stage_verify(root, options):
    import verify
    resolved = read_json(root / "build" / "resolved.json")
    report = verify.verify(root, resolved, root / "output" / output_name(root, resolved))
    return {"ok": report["ok"], "duration": report["duration"]}


HANDLERS = {"validate": stage_validate, "tts": stage_tts, "mix": stage_mix, "compose": stage_compose, "check": stage_check,
            "render": stage_render, "mux": stage_mux, "verify": stage_verify}


def run(root, options):
    root = Path(root).resolve()
    if not (root / "episode.spec.json").is_file():
        raise PipelineError(f"{root} has no episode.spec.json")
    (root / "evidence").mkdir(exist_ok=True)
    run_path = root / "evidence" / "run.json"
    start = STAGES.index(options.from_stage) if options.from_stage else 0
    stop = STAGES.index(options.until) if options.until else len(STAGES) - 1
    if start > stop:
        raise PipelineError(f"--from {options.from_stage} comes after --until {options.until}; nothing would run")
    lock = EpisodeLock(root)
    try:
        record = read_json(run_path) if run_path.is_file() else {}
        for stage in STAGES[:start]:
            entry = record.get(stage)
            if not entry or not entry.get("ok") or entry.get("fingerprint") != fingerprint(stage, root):
                raise PipelineError(f"Cannot resume from {options.from_stage}: inputs of '{stage}' changed or it never passed; rerun from {stage}")
            if entry.get("outputs") != stage_outputs(stage, root):
                raise PipelineError(f"Cannot resume from {options.from_stage}: outputs of '{stage}' were replaced after it ran; rerun from {stage}")
        for stage in STAGES[start:stop + 1]:
            began = time.time()
            print(f"[{stage}] …", flush=True)
            entry = {"started": began, "ok": False}
            record[stage] = entry
            write_json(run_path, record)
            try:
                result = HANDLERS[stage](root, options)
            except PipelineError as error:
                entry.update({"finished": time.time(), "error": str(error)})
                write_json(run_path, record)
                raise
            entry.update({"fingerprint": fingerprint(stage, root), "outputs": stage_outputs(stage, root), "ok": True,
                          "finished": time.time(), "seconds": round(time.time() - began, 1), "result": result})
            write_json(run_path, record)
            print(f"[{stage}] ok {json.dumps(result, ensure_ascii=False)}", flush=True)
    finally:
        lock.release()


def preview(root, options):
    root = Path(root).resolve()
    options.from_stage, options.until = None, "validate"
    run(root, options)
    lock = EpisodeLock(root)
    try:
        materialize_public(root / "preview" / "public")
        # The preview page lives one directory down, so the episode's own images are mirrored beside it;
        # an image the episode no longer has must not linger there.
        if (root / "preview" / "assets").exists():
            shutil.rmtree(root / "preview" / "assets")
        if (root / "assets").is_dir():
            shutil.copytree(root / "assets", root / "preview" / "assets")
        run_command([tool("node"), str(COMPOSER), str(root), "--preview"], root / "evidence" / "compose-preview.log")
        times = read_json(root / "build" / "preview-times.json")
        shots = root / "evidence" / "preview"
        if shots.exists():
            shutil.rmtree(shots)
        # A stage is judged by how it moves, so every scene gets several frames instead of one.
        at = ",".join(f"{moment:.1f}" for scene in times for moment in scene["shots"])
        run_command([str(HYPERFRAMES), "snapshot", str(root / "preview"), "--at", at, "--no-end", "-o", str(shots), "--describe", "false"],
                    root / "evidence" / "preview-snapshot.log")
        import verify
        frames = sorted(shots.glob("frame-*.png"), key=lambda p: int(p.name.split("-")[1]))
        verify.contact_sheet(frames, root / "evidence" / "preview-contact.png", columns=len(times[0]["shots"]))
        print(f"Preview: {len(frames)} frames; review evidence/preview-contact.png and evidence/preview/*.png before the full run")
    finally:
        lock.release()


def doctor(options):
    rows, failed = [], False

    def row(name, ok, detail):
        nonlocal failed
        failed |= not ok
        rows.append(f"{'OK ' if ok else 'FAIL'}  {name}: {detail}")

    for name in ("node", "ffmpeg", "ffprobe"):
        found = shutil.which(name)
        row(name, bool(found), found or "not on PATH")
    version = subprocess.run([str(HYPERFRAMES), "--version"], capture_output=True, text=True) if HYPERFRAMES.exists() else None
    row("hyperframes", bool(version and version.returncode == 0), (version.stdout.strip() if version else "not installed; run tools/setup.sh"))
    try:
        import azure.cognitiveservices.speech as speechsdk
        row("azure speech sdk", speechsdk.__version__ == AZURE_SDK_VERSION, f"{speechsdk.__version__} (pinned {AZURE_SDK_VERSION}); python {sys.executable}")
    except ImportError:
        row("azure speech sdk", False, "not importable; run tools/setup.sh and start the engine with ./make-episode")
    try:
        verify_shared_assets()
        row("shared assets", True, "font, licence and GSAP match pinned SHA-256")
    except PipelineError as error:
        row("shared assets", False, str(error))
    try:
        import tts_azure
        _, region = tts_azure.read_key_file()
        row("azure key config", True, f"{KEY_FILE} (0600, region {region})")
    except PipelineError as error:
        row("azure key config", False, str(error))
    print("\n".join(rows))
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    run_parser = commands.add_parser("run")
    run_parser.add_argument("episode")
    run_parser.add_argument("--until", choices=STAGES)
    run_parser.add_argument("--from", dest="from_stage", choices=STAGES)
    run_parser.add_argument("--retry-tts", default="", help="Comma-separated scene ids whose earlier request result is unknown")
    preview_parser = commands.add_parser("preview")
    preview_parser.add_argument("episode")
    commands.add_parser("doctor")
    options = parser.parse_args()
    options.retry_tts = [s for s in getattr(options, "retry_tts", "").split(",") if s]
    options.from_stage = getattr(options, "from_stage", None)
    options.until = getattr(options, "until", None)
    try:
        if options.command == "run":
            run(options.episode, options)
        elif options.command == "preview":
            preview(options.episode, options)
        else:
            return doctor(options)
    except PipelineError as error:
        print(f"STOPPED: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
