"""Normalize narration to -16 LUFS and mix the synthesized music bed under it with speech ducking."""
import json
import re
import subprocess
import wave
from pathlib import Path

import sfx
from common import PipelineError, tool


def run(arguments):
    return subprocess.run([tool("ffmpeg"), "-hide_banner", "-nostdin", "-y", *arguments],
                          check=True, capture_output=True, text=True).stderr


def measurement(path, log_path, stereo=False):
    filters = ("aformat=channel_layouts=stereo," if stereo else "") + "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json"
    log = run(["-i", str(path), "-af", filters, "-f", "null", "-"])
    Path(log_path).write_text(log, encoding="utf-8")
    matches = re.findall(r'\{\s*"input_i".*?\}', log, re.S)
    if len(matches) != 1:
        raise PipelineError("Expected one loudnorm measurement")
    return json.loads(matches[0])


def seconds(path):
    with wave.open(str(path), "rb") as clip:
        return clip.getnframes() / clip.getframerate()


def mix(root, duration, music, events=()):
    """Mix narration over the music bed, plus sound effects when `events` lists (seconds, sound name)."""
    root = Path(root)
    narration = root / "output" / "narration.wav"
    gain_db = music["gain_db"]
    evidence = root / "evidence"
    evidence.mkdir(exist_ok=True)
    (root / "audio").mkdir(exist_ok=True)
    bed_source = root / "audio" / "music-synth.wav"
    sfx.music(bed_source, duration, music["bpm"], music["synth"])
    if abs(seconds(narration) - duration) > 0.001:
        raise PipelineError("Narration duration does not match the timeline")
    measured = measurement(narration, evidence / "mix-loudness-narration-pass1.txt", stereo=True)
    normalize = ("aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11:"
                 f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                 f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
                 f"offset={measured['target_offset']}:linear=true:print_format=json")
    voice = root / "audio" / "narration-normalized.wav"
    run(["-i", str(narration), "-af", normalize, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(voice)])
    voice_levels = measurement(voice, evidence / "mix-loudness-narration-final.txt")

    # The bed is synthesized at the film's own length, so it is never looped.
    filters = (f"[0:a]atrim=duration={duration},asetpts=PTS-STARTPTS,volume={gain_db}dB,"
               f"afade=t=in:d=2,afade=t=out:st={max(0, duration - 4)}:d=4[bed]")
    bed = root / "audio" / "music-bed.wav"
    run(["-i", str(bed_source), "-filter_complex", filters, "-map", "[bed]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(bed)])
    ducked = root / "audio" / "music-ducked.wav"
    # 50% wet caps attenuation at 6.02 dB, even under strong speech peaks.
    run(["-i", str(bed), "-i", str(voice), "-filter_complex",
         "[0:a][1:a]sidechaincompress=threshold=0.015:ratio=4:attack=40:release=500:mix=0.5[ducked]",
         "-map", "[ducked]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(ducked)])
    final = root / "audio" / "final-mix.wav"
    tracks = [voice, ducked]
    if events:
        # Effects are not ducked: they are short and already far below the voice.
        sfx.bus(root / "audio" / "sfx.wav", duration, events)
        tracks.append(root / "audio" / "sfx.wav")
    inputs = [part for track in tracks for part in ("-i", str(track))]
    run([*inputs, "-filter_complex",
         "".join(f"[{i}:a]" for i in range(len(tracks)))
         + f"amix=inputs={len(tracks)}:duration=first:normalize=0,alimiter=limit={10 ** (-1.7 / 20)}:level=false:latency=true,"
         f"atrim=duration={duration}[mix]", "-map", "[mix]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(final)])
    final_levels = measurement(final, evidence / "mix-loudness-final.txt")
    with wave.open(str(final), "rb") as clip:
        if (clip.getnchannels(), clip.getsampwidth(), clip.getframerate()) != (2, 2, 48000):
            raise PipelineError("Final mix must be 48 kHz stereo PCM16")
    if abs(seconds(final) - duration) > 0.001:
        raise PipelineError("Mix duration differs from the timeline")
    if not -17 <= float(final_levels["input_i"]) <= -15 or float(final_levels["input_tp"]) > -1.5:
        raise PipelineError("Final mix outside target loudness or true peak")
    report = {"duration": seconds(final), "narration": voice_levels, "final": final_levels,
              "music": f"synthesized {music['synth']}, {music['bpm']} bpm", "music_gain_db": gain_db,
              "duck_max_attenuation_db": 6.0206, "fade_in_seconds": 2, "fade_out_seconds": 4, "sound_effects": len(events)}
    (evidence / "mix-loudness.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"lufs": final_levels["input_i"], "true_peak_db": final_levels["input_tp"]}
