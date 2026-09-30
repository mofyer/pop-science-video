"""Narration: verbatim segmentation, WordBoundary cues, key file rules, cache, unknown results, locks."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from helpers import ENGINE, FIXTURES, write_wav

import tts_azure  # noqa: E402
from common import PipelineError  # noqa: E402


class Text(unittest.TestCase):
    def test_segments_preserve_every_character_and_cap_length(self):
        text = "第一句，第二句。\n" + "长" * 70 + "！English H.264 2025，结束。"
        pieces = tts_azure.segments(text)
        self.assertEqual("".join(pieces), text)
        self.assertLessEqual(max(map(len, pieces)), 32)

    def test_probe_events_align_and_ignore_punctuation(self):
        # Event shapes and timings as the service returned them for one probe sentence; one word of the sentence was replaced.
        probe = json.loads((FIXTURES / "azure-word-boundary-probe.json").read_text(encoding="utf-8"))
        events = [{**event, "kind": event["type"].split(".")[-1]} for event in probe["events"]]
        cues = tts_azure.boundary_cues("你好，欢迎来到动画世界。", events, 3)
        self.assertEqual([c["text"] for c in cues], ["你好，", "欢迎来到动画世界。"])
        self.assertAlmostEqual(cues[0]["start"], 0.05)
        self.assertAlmostEqual(cues[-1]["end"], 2.5625)
        # One start per spoken character, beginning where the cue begins and rising through it.
        self.assertEqual([len(c["char_starts"]) for c in cues], [2, 8])
        for cue in cues:
            self.assertEqual(cue["char_starts"][0], cue["start"])
            self.assertEqual(cue["char_starts"], sorted(cue["char_starts"]))
            self.assertLess(cue["char_starts"][-1], cue["end"])

    def test_mismatched_words_stop_and_missing_events_fall_back(self):
        with self.assertRaisesRegex(ValueError, "do not match"):
            tts_azure.boundary_cues("原文。", [{"kind": "Word", "text": "改写", "start": 0, "duration": 1}], 2)
        self.assertIsNone(tts_azure.boundary_cues("原文。", [], 1))


class KeyFile(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.path = self.dir / "azure-speech.env"

    def tearDown(self):
        shutil.rmtree(self.dir)

    def write(self, text, mode=0o600):
        self.path.write_text(text)
        os.chmod(self.path, mode)

    def test_missing_open_or_incomplete_files_are_refused_without_echoing(self):
        with self.assertRaisesRegex(PipelineError, "not found"):
            tts_azure.read_key_file(self.path)
        self.write("AZURE_SPEECH_KEY=secret-value\nAZURE_SPEECH_REGION=eastus\n", 0o644)
        with self.assertRaises(PipelineError) as caught:
            tts_azure.read_key_file(self.path)
        self.assertNotIn("secret-value", str(caught.exception))
        self.write("AZURE_SPEECH_REGION=eastus\n")
        with self.assertRaisesRegex(PipelineError, "needs"):
            tts_azure.read_key_file(self.path)

    def test_symlinked_key_file_is_refused(self):
        target = self.dir / "real.env"
        target.write_text("AZURE_SPEECH_KEY=abc123\nAZURE_SPEECH_REGION=eastus\n")
        os.chmod(target, 0o600)
        self.path.symlink_to(target)
        with self.assertRaisesRegex(PipelineError, "not a symlink"):
            tts_azure.read_key_file(self.path)

    def test_valid_file(self):
        self.write("# comment\nAZURE_SPEECH_REGION=eastus\nAZURE_SPEECH_KEY=abc123\n")
        self.assertEqual(tts_azure.read_key_file(self.path), ("abc123", "eastus"))

    def test_narration_uses_the_region_in_the_key_file_and_a_default_without_one(self):
        # Without a key file a run that is fully cached still has to resolve its cache keys.
        self.assertEqual(tts_azure.AzureAudio(self.dir, "zh-CN-XiaoyiNeural", key_file=self.path).request("字")["region"], "eastus")
        self.write("AZURE_SPEECH_KEY=abc123\nAZURE_SPEECH_REGION=southeastasia\n")
        self.assertEqual(tts_azure.AzureAudio(self.dir, "zh-CN-XiaoyiNeural", key_file=self.path).request("字")["region"], "southeastasia")
        self.assertEqual(tts_azure.AzureAudio(self.dir, "zh-CN-XiaoyiNeural", region="westus2", key_file=self.path).request("字")["region"], "westus2")

    def key_file_in_a_fresh_process(self, **environment):
        """The path is fixed when the engine starts, so each case needs its own interpreter."""
        inherited = {name: value for name, value in os.environ.items() if name != "POP_VIDEO_AZURE_ENV"}
        result = subprocess.run([sys.executable, "-c", "import common; print(common.KEY_FILE)"], cwd=ENGINE,
                                env={**inherited, **environment}, capture_output=True, text=True, check=True)
        return Path(result.stdout.strip())

    def test_the_default_path_is_under_the_home_config_and_the_environment_can_move_it(self):
        self.assertEqual(self.key_file_in_a_fresh_process(), Path.home() / ".config" / "pop-science-video" / "azure-speech.env")
        self.assertEqual(self.key_file_in_a_fresh_process(POP_VIDEO_AZURE_ENV=str(self.path)), self.path)
        self.assertEqual(self.key_file_in_a_fresh_process(POP_VIDEO_AZURE_ENV=""), Path.home() / ".config" / "pop-science-video" / "azure-speech.env")


class Cache(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "audio").mkdir()
        self.client = tts_azure.AzureAudio(self.root, "zh-CN-XiaoyiNeural", key_file=self.root / "no-key.env")

    def tearDown(self):
        shutil.rmtree(self.root)

    def cache(self, name, text):
        wav = self.root / "audio" / (name + ".wav")
        write_wav(wav)
        request = self.client.request(text)
        tts_azure.write_json(wav.with_suffix(".cache.json"), {
            "request_sha256": tts_azure.sha256_bytes(json.dumps(request, sort_keys=True, ensure_ascii=False).encode()),
            "audio_sha256": tts_azure.sha256_bytes(wav.read_bytes()), "events": []})
        return wav

    def test_valid_cache_needs_no_key_and_tampering_forces_a_request(self):
        wav = self.cache("S01.full", "原文。")
        self.assertEqual(self.client.synthesize("S01.full", "原文。")[0], wav)
        wav.write_bytes(wav.read_bytes() + b"x")
        with self.assertRaisesRegex(PipelineError, "not found"):
            self.client.synthesize("S01.full", "原文。")
        self.assertEqual(self.client.request_count, 0)

    def test_unknown_result_blocks_until_explicit_retry(self):
        tts_azure.write_json(self.root / "audio" / "S03.full.intent.json", {"request_sha256": "x"})
        with self.assertRaisesRegex(PipelineError, "--retry-tts S03"):
            self.client.synthesize("S03.full", "原文。")
        self.client.retry = {"S03"}
        with self.assertRaisesRegex(PipelineError, "not found"):
            self.client.synthesize("S03.full", "原文。")

    def test_build_uses_real_wav_lengths_and_scene_pauses(self):
        scenes = [{"id": f"S{i:02}", "narration": "原文。", "pause_after": 0.6} for i in range(1, 4)]
        scenes[-1]["pause_after"] = 6.0

        def cached(scene):
            path = self.root / "audio" / (scene["id"] + ".wav")
            write_wav(path, 1)
            return path, [{"start": 0.1, "end": 0.9, "text": scene["narration"]}], "fixture"

        with patch.object(self.client, "scene", side_effect=cached):
            result = tts_azure.build(self.root, {"scenes": scenes}, self.client)
        self.assertAlmostEqual(result["duration"], 3 + 0.6 * 2 + 6.0)
        self.assertEqual(result["requests"], 0)
        timeline = json.loads((self.root / "timeline.json").read_text())
        self.assertEqual([s["pause_after"] for s in timeline["scenes"]], [0.6, 0.6, 6.0])
        self.assertTrue((self.root / "output" / "subtitles.zh-CN.srt").is_file())


class Locks(unittest.TestCase):
    def test_second_global_lock_is_refused(self):
        directory = Path(tempfile.mkdtemp())
        try:
            first = tts_azure.GlobalLock(directory)
            with self.assertRaisesRegex(PipelineError, "Another episode"):
                tts_azure.GlobalLock(directory)
            first.release()
            tts_azure.GlobalLock(directory).release()
        finally:
            shutil.rmtree(directory)


if __name__ == "__main__":
    unittest.main()
