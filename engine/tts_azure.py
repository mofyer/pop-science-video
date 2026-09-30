"""Verbatim, cached Azure narration with word-level subtitles.

The key is read from the 0600 config file only when a request is actually needed, and is never
logged or persisted.
"""
import fcntl
import json
import os
import re
import stat
import time
import wave
from pathlib import Path

from common import AZURE_SDK_VERSION, GLOBAL_LOCK_DIR, KEY_FILE, PipelineError, sha256_bytes, write_json

SAMPLE_RATE = 48000
REQUEST_SPACING = 3.2


def normalized(text):
    return "".join(char for char in text if char.isalnum())


def segments(text):
    """Split at Chinese punctuation and newlines, preserving every character; pieces ≤ 32 chars."""
    pieces = re.findall(r"[^，。？！；、\n]*[，。？！；、\n]+|[^，。？！；、\n]+$", text)
    result = []
    for piece in pieces:
        while len(piece) > 32:
            result.append(piece[:32])
            piece = piece[32:]
        if piece:
            if not normalized(piece) and result:
                result[-1] += piece
            else:
                result.append(piece)
    if "".join(result) != text or any(not normalized(piece) for piece in result):
        raise ValueError("Cannot segment narration without losing text")
    return result


def wav_duration(path):
    with wave.open(str(path), "rb") as clip:
        if (clip.getnchannels(), clip.getsampwidth(), clip.getframerate()) != (1, 2, SAMPLE_RATE):
            raise ValueError("Unexpected WAV format")
        seconds = clip.getnframes() / SAMPLE_RATE
        if seconds <= 0 or len(clip.readframes(clip.getnframes())) != clip.getnframes() * 2:
            raise ValueError("Empty or truncated WAV")
        return seconds


def combine_wav(destination, clips):
    temporary = destination.with_suffix(".wav.part")
    with wave.open(str(temporary), "wb") as output:
        output.setparams((1, 2, SAMPLE_RATE, 0, "NONE", "not compressed"))
        for path, pause in clips:
            wav_duration(path)
            with wave.open(str(path), "rb") as clip:
                output.writeframes(clip.readframes(clip.getnframes()))
            output.writeframes(b"\x00\x00" * round(pause * SAMPLE_RATE))
    temporary.replace(destination)


def validate_cues(text, cues, seconds):
    if "".join(cue["text"] for cue in cues) != text:
        raise ValueError("Subtitle text is not verbatim")
    previous_end = 0.0
    for cue in cues:
        if not 0 <= cue["start"] < cue["end"] <= seconds + 0.001:
            raise ValueError("Subtitle outside measured audio duration")
        if cue["start"] < previous_end - 0.001:
            raise ValueError("Overlapping subtitle cues")
        previous_end = cue["end"]


def boundary_cues(text, events, seconds):
    words = [event for event in events if event["kind"] == "Word" and normalized(event["text"])]
    if not words:
        return None
    if normalized("".join(event["text"] for event in words)) != normalized(text):
        raise ValueError("WordBoundary characters do not match original narration")
    timings = []
    for event in words:
        chars = normalized(event["text"])
        for index in range(len(chars)):
            timings.append((event["start"] + event["duration"] * index / len(chars),
                            event["start"] + event["duration"] * (index + 1) / len(chars)))
    cues, pointer = [], 0
    for piece in segments(text):
        count = len(normalized(piece))
        # char_starts lets a reveal land on its own word instead of on the start of the cue.
        cues.append({"start": timings[pointer][0], "end": timings[pointer + count - 1][1], "text": piece,
                     "char_starts": [start for start, _ in timings[pointer:pointer + count]]})
        pointer += count
    validate_cues(text, cues, seconds)
    return cues


DEFAULT_REGION = "eastus"


def read_key_file(path=KEY_FILE):
    """Return (key, region); refuse group/world-readable or foreign-owned files. Never echoes the key."""
    path = Path(path)
    if path.is_symlink():
        raise PipelineError(f"{path} must be a regular file, not a symlink")
    if not path.is_file():
        raise PipelineError(f"Azure key config not found at {path}")
    info = path.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise PipelineError(f"{path} must be owned by you with mode 0600")
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            name, value = line.split("=", 1)
            values[name.strip()] = value.strip()
    key, region = values.get("AZURE_SPEECH_KEY", ""), values.get("AZURE_SPEECH_REGION", "")
    if not key or len(key) >= 4095 or not re.fullmatch(r"[a-z0-9-]+", region):
        raise PipelineError(f"{path} needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
    return key, region


class GlobalLock:
    """Serialise Azure requests across episodes; F0 allows little concurrency."""

    def __init__(self, directory=GLOBAL_LOCK_DIR):
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.handle = open(directory / "azure-tts.lock", "w")
        try:
            fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.handle.close()
            raise PipelineError("Another episode is synthesizing narration; try again when it finishes") from None

    def release(self):
        fcntl.flock(self.handle, fcntl.LOCK_UN)
        self.handle.close()


class AzureAudio:
    def __init__(self, root, voice, region=None, retry=(), key_file=KEY_FILE):
        # The region is part of each cache key. It comes from the key file; with no key file yet, a fully cached
        # run still resolves against the default.
        if region is None:
            region = read_key_file(key_file)[1] if Path(key_file).is_file() else DEFAULT_REGION
        self.root, self.voice, self.region = Path(root), voice, region
        self.retry, self.key_file = set(retry), key_file
        self.key, self.lock, self.last_request = None, None, None
        self.request_count, self.characters = 0, 0

    def request(self, text):
        return {"text": text, "voice": self.voice, "region": self.region, "sdk": AZURE_SDK_VERSION,
                "format": "Riff48Khz16BitMonoPcm", "input": "plain_text"}

    def _connect(self):
        if self.key is None:
            key, region = read_key_file(self.key_file)
            if region != self.region:
                raise PipelineError(f"Key config region {region} differs from cache region {self.region}")
            import azure.cognitiveservices.speech as speechsdk
            if speechsdk.__version__ != AZURE_SDK_VERSION:
                raise PipelineError(f"azure-cognitiveservices-speech must be {AZURE_SDK_VERSION}")
            self.key, self.lock = key, GlobalLock()

    def close(self):
        self.key = None
        if self.lock:
            self.lock.release()
            self.lock = None

    def synthesize(self, name, text):
        wav = self.root / "audio" / (name + ".wav")
        metadata = wav.with_suffix(".cache.json")
        intent = wav.with_suffix(".intent.json")
        request = self.request(text)
        request_hash = sha256_bytes(json.dumps(request, sort_keys=True, ensure_ascii=False).encode())
        if wav.exists() and metadata.exists():
            cached = json.loads(metadata.read_text(encoding="utf-8"))
            if cached.get("request_sha256") == request_hash and cached.get("audio_sha256") == sha256_bytes(wav.read_bytes()):
                wav_duration(wav)
                return wav, cached["events"]
        scene = name.split(".")[0]
        if intent.exists() and scene not in self.retry:
            raise PipelineError(f"{name}: an earlier request has an unknown result; rerun with --retry-tts {scene} to send it again")
        self._connect()
        import azure.cognitiveservices.speech as speechsdk
        if self.last_request is not None:
            time.sleep(max(0.0, REQUEST_SPACING - (time.monotonic() - self.last_request)))
        config = speechsdk.SpeechConfig(subscription=self.key, region=self.region)
        config.speech_synthesis_voice_name = self.voice
        config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff48Khz16BitMonoPcm)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=config, audio_config=None)
        events = []

        def on_boundary(event):
            events.append({"kind": str(event.boundary_type).split(".")[-1], "text": event.text,
                           "text_offset": event.text_offset, "word_length": event.word_length,
                           "start": event.audio_offset / 10_000_000, "duration": event.duration.total_seconds()})

        synthesizer.synthesis_word_boundary.connect(on_boundary)
        write_json(intent, {"request_sha256": request_hash, "sent_at": time.time()})
        self.last_request = time.monotonic()
        self.request_count += 1
        self.characters += len(text)
        result = synthesizer.speak_text_async(text).get()
        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            cancellation = result.cancellation_details
            # Error codes only: cancellation.error_details may contain endpoint and connection data.
            write_json(self.root / "audio" / "failure.json", {"scene": name, "voice": self.voice,
                       "reason": str(result.reason), "cancellation_reason": str(cancellation.reason),
                       "error_code": str(cancellation.error_code), "automatic_retry": False})
            intent.unlink()
            raise PipelineError(f"Azure synthesis failed for {name}; see audio/failure.json")
        temporary = wav.with_suffix(".wav.part")
        temporary.write_bytes(result.audio_data)
        seconds = wav_duration(temporary)
        temporary.replace(wav)
        write_json(metadata, {"request_sha256": request_hash, "request": request,
                              "audio_sha256": sha256_bytes(wav.read_bytes()), "seconds": seconds, "events": events})
        intent.unlink()
        return wav, events

    def scene(self, scene):
        text, scene_id = scene["narration"], scene["id"]
        full_wav, events = self.synthesize(scene_id + ".full", text)
        cues = boundary_cues(text, events, wav_duration(full_wav))
        destination = self.root / "audio" / (scene_id + ".wav")
        if cues is not None:
            destination.write_bytes(full_wav.read_bytes())
            return destination, cues, "WordBoundary; within-word cue edges interpolated"
        clips, cues, cursor = [], [], 0.0
        pieces = segments(text)
        for index, piece in enumerate(pieces, 1):
            wav, _ = self.synthesize(f"{scene_id}.clause{index:02}", piece)
            length = wav_duration(wav)
            pause = 0.15 if index < len(pieces) else 0.0
            clips.append((wav, pause))
            cues.append({"start": cursor, "end": cursor + length, "text": piece})
            cursor += length + pause
        combine_wav(destination, clips)
        validate_cues(text, cues, wav_duration(destination))
        return destination, cues, "independently synthesized verbatim clauses; measured WAV edges"


def stamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def build(root, resolved, client):
    """Synthesize every scene, then write the narration track, subtitles and timeline.json."""
    root = Path(root)
    (root / "audio").mkdir(exist_ok=True)
    (root / "output").mkdir(exist_ok=True)
    scenes, all_cues, cursor = [], [], 0.0
    for original in resolved["scenes"]:
        wav, cues, alignment = client.scene(original)
        seconds = wav_duration(wav)
        pause = original["pause_after"]
        scenes.append({"id": original["id"], "text": original["narration"], "start": cursor,
                       "end": cursor + seconds + pause, "duration": seconds, "pause_after": pause,
                       "audio": str(wav.relative_to(root)), "subtitles": cues, "alignment": alignment})
        all_cues.extend({"start": c["start"] + cursor, "end": c["end"] + cursor, "text": c["text"]} for c in cues)
        cursor = scenes[-1]["end"]
    validate_cues("".join(s["text"] for s in scenes), all_cues, cursor)
    narration = root / "output" / "narration.wav"
    combine_wav(narration, [(root / s["audio"], s["pause_after"]) for s in scenes])
    if abs(wav_duration(narration) - cursor) > 0.001:
        raise PipelineError("Combined narration duration differs from timeline")
    (root / "output" / "subtitles.zh-CN.srt").write_text("\n\n".join(
        f"{index}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text'].strip()}"
        for index, c in enumerate(all_cues, 1)) + "\n", encoding="utf-8")
    write_json(root / "audio" / "captions.json", all_cues)
    write_json(root / "timeline.json", {"voice": client.voice, "region": client.region, "scenes": scenes,
                                        "duration": cursor, "subtitle_cues": len(all_cues)})
    return {"duration": cursor, "subtitle_cues": len(all_cues), "requests": client.request_count,
            "characters_sent": client.characters, "narration_sha256": sha256_bytes(narration.read_bytes())}
