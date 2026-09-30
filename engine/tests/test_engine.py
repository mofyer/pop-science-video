"""Orchestrator fingerprints and locks, compose contract, and verification helpers."""
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from helpers import ENGINE, edit_spec, sample_episode

import make_episode  # noqa: E402
import sfx  # noqa: E402
import sync  # noqa: E402
import tts_azure  # noqa: E402
import verify  # noqa: E402
from common import PipelineError, materialize_public, tool, verify_shared_assets, write_json  # noqa: E402


class Orchestrator(unittest.TestCase):
    def setUp(self):
        self.parent, self.root = sample_episode()

    def tearDown(self):
        shutil.rmtree(self.parent)

    def options(self, **values):
        return SimpleNamespace(**{"from_stage": None, "until": None, "retry_tts": [], **values})

    def test_the_stages_keep_their_names_and_order(self):
        self.assertEqual(make_episode.STAGES, ["validate", "tts", "mix", "compose", "check", "render", "mux", "verify"])
        self.assertEqual(list(make_episode.HANDLERS), make_episode.STAGES)

    def test_validate_writes_resolved_and_resume_checks_fingerprints(self):
        make_episode.run(self.root, self.options(until="validate"))
        record = json.loads((self.root / "evidence" / "run.json").read_text())
        self.assertTrue(record["validate"]["ok"])
        self.assertTrue((self.root / "build" / "resolved.json").is_file())
        sheet = self.root / "production-sheet.md"
        sheet.write_text(sheet.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        with self.assertRaisesRegex(PipelineError, "inputs of 'validate' changed"):
            make_episode.run(self.root, self.options(from_stage="tts", until="tts"))

    def test_resume_refused_when_a_stage_output_was_replaced(self):
        make_episode.run(self.root, self.options(until="validate"))
        resolved = self.root / "build" / "resolved.json"
        resolved.write_text(resolved.read_text(encoding="utf-8").replace("一秒钟放三十张", "一秒钟放六十张"), encoding="utf-8")
        with self.assertRaisesRegex(PipelineError, "outputs of 'validate' were replaced"):
            make_episode.run(self.root, self.options(from_stage="tts", until="tts"))

    def test_shared_assets_match_their_pins_and_reach_the_episode_as_regular_files(self):
        verify_shared_assets()
        materialize_public(self.root / "public")
        (self.root / "index.html").write_text("x")
        outputs = make_episode.stage_outputs("compose", self.root)
        for name in ("public/NotoSansSC.ttf", "public/NotoSansSC-LICENSE.txt", "public/gsap.min.js"):
            self.assertIn(name, outputs)
        self.assertFalse(any(p.is_symlink() for p in (self.root / "public").iterdir()))

    def test_from_after_until_is_refused(self):
        with self.assertRaisesRegex(PipelineError, "nothing would run"):
            make_episode.run(self.root, self.options(from_stage="mux", until="render"))

    def test_check_failures(self):
        good = {"ok": True, **{name: {"errorCount": 0, "warningCount": 3 if name == "lint" else 0} for name in make_episode.CHECK_SECTIONS}}
        self.assertEqual(make_episode.check_failures(good, 0), [])
        self.assertIn("exit 1", make_episode.check_failures(good, 1))
        self.assertIn("ok is not true", make_episode.check_failures({**good, "ok": False}, 0))
        self.assertIn("missing motion", make_episode.check_failures({k: v for k, v in good.items() if k != "motion"}, 0))
        self.assertIn("layout: 2", make_episode.check_failures({**good, "layout": {"errorCount": 0, "warningCount": 2}}, 0))
        self.assertIn("missing runtime", make_episode.check_failures({**good, "runtime": ["not", "a", "dict"]}, 0))

    def test_resume_refused_when_an_earlier_stage_never_passed(self):
        (self.root / "evidence").mkdir()
        write_json(self.root / "evidence" / "run.json", {})
        with self.assertRaisesRegex(PipelineError, "never passed"):
            make_episode.run(self.root, self.options(from_stage="mix"))

    def test_episode_lock_refuses_a_second_process(self):
        first = make_episode.EpisodeLock(self.root)
        try:
            with self.assertRaisesRegex(PipelineError, "already being built"):
                make_episode.EpisodeLock(self.root)
        finally:
            first.release()

    def test_output_name_is_filesystem_safe(self):
        self.assertEqual(make_episode.output_name(Path("/x/02"), {"title": "一秒 30 张，为什么会“动”？"}), "02_一秒_30_张_为什么会_动.mp4")


class StageCompose(unittest.TestCase):
    def setUp(self):
        self.parent, self.root = sample_episode()

    def tearDown(self):
        shutil.rmtree(self.parent)

    def compose(self):
        make_episode.run(self.root, SimpleNamespace(from_stage=None, until="validate", retry_tts=[]))
        materialize_public(self.root / "preview" / "public")
        return subprocess.run([tool("node"), str(ENGINE / "compose_stage.mjs"), str(self.root), "--preview"], capture_output=True, text=True)

    def edit_visuals(self, old, new):
        path = self.root / "visuals.mjs"
        path.write_text(path.read_text(encoding="utf-8").replace(old, new), encoding="utf-8")

    def test_preview_page_is_one_canvas_with_readable_labels(self):
        result = self.compose()
        self.assertEqual(result.returncode, 0, result.stderr)
        html = (self.root / "preview" / "index.html").read_text(encoding="utf-8")
        self.assertIn('<canvas id="stage"', html)
        self.assertIn('<div class="lb" id="lb-thirty">一秒 30 张</div>', html)
        self.assertIn('<div class="src" id="src-S01" style="opacity:0">来源：测试来源</div>', html)
        self.assertIn("function draw(ctx, f)", html)
        for absent in ("export const", "export function", "<audio"):
            self.assertNotIn(absent, html)
        # The labels reach the checks: visible text for the numbers check, and a file for the pre-render check.
        self.assertIn("一秒 30 张", verify.visible_text(html))
        self.assertEqual(json.loads((self.root / "build" / "labels.json").read_text(encoding="utf-8")), {"thirty": "一秒 30 张"})
        times = json.loads((self.root / "build" / "preview-times.json").read_text(encoding="utf-8"))
        self.assertEqual([len(scene["shots"]) for scene in times], [3, 3])
        self.assertTrue(times[0]["start"] < times[0]["shots"][0] < times[0]["shots"][2] < times[0]["end"])

    def test_accent_recolours_the_series_text_and_the_progress_bar(self):
        default = (".series{", "color:#4b4fd9;"), (".progress{", "linear-gradient(90deg,#4b4fd9,#f08a3c)"), (".preview{", "color:#4b4fd9;")
        recoloured = (".series{", "color:#1f7a8c;"), (".progress{", "linear-gradient(90deg,#1f7a8c,#e2b33c)"), (".preview{", "color:#1f7a8c;")
        for accent, expected in ((None, default), (["#1f7a8c", "#e2b33c"], recoloured)):
            with self.subTest(accent=accent):
                if accent:
                    edit_spec(self.root, lambda s: s.update(accent=accent))
                result = self.compose()
                self.assertEqual(result.returncode, 0, result.stderr)
                rules = (self.root / "preview" / "index.html").read_text(encoding="utf-8").splitlines()
                for selector, declaration in expected:
                    self.assertIn(declaration, next(line for line in rules if line.startswith(selector)))

    def test_the_kit_is_loaded_in_front_of_the_visuals(self):
        (self.root / "kit.mjs").write_text("const TINT = '#abcdef';\n", encoding="utf-8")
        self.edit_visuals("'#123456'", "TINT")
        result = self.compose()
        self.assertEqual(result.returncode, 0, result.stderr)
        html = (self.root / "preview" / "index.html").read_text(encoding="utf-8")
        self.assertLess(html.index("const TINT"), html.index("function draw(ctx, f)"))

    def test_bad_visuals_stop_compose(self):
        for old, new, message in [("export function draw", "function draw", "must export function draw"),
                                  ("{ thirty:", "{ Thirty:", "label key Thirty"),
                                  ("'一秒 30 张'", "''", "label thirty must be a non-empty string"),
                                  ("export const labels", "export const images = { logo: 'assets/missing.png' };\nexport const labels", "image logo must be an existing file"),
                                  ("export const labels", "export default 1;\nexport const labels", "may only export declarations"),
                                  ("export const labels", "export async function later() {}\nexport const labels", "may only export declarations"),
                                  ("'#123456'", "'</script>'", "closing script tag")]:
            with self.subTest(message=message):
                original = (self.root / "visuals.mjs").read_text(encoding="utf-8")
                self.edit_visuals(old, new)
                result = self.compose()
                (self.root / "visuals.mjs").write_text(original, encoding="utf-8")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)

    def test_a_frame_that_throws_stops_compose_with_its_time_and_scene(self):
        # The page check does not notice a draw that throws part-way through the film, so compose rehearses every moment.
        cases = [("f.label('thirty', { x: 960, y: 300 });", "if (f.t > 12.3) f.label('nope', { x: 1, y: 1 });", r"draw failed at 12\.\d\d s \(S02\): Unknown label nope"),
                 ("f.label('thirty', { x: 960, y: 300 });", "f.label('thirty', { x: 960 });", r"draw failed at 0\.00 s \(S01\): Label thirty needs x, y"),
                 ("ctx.fillStyle = '#123456';", "if (f.scene.beats.moves && f.t >= f.scene.beats.moves) undefined.x;", r"draw failed at \d+\.\d\d s \(S01\): Cannot read")]
        for old, new, message in cases:
            with self.subTest(message=message):
                original = (self.root / "visuals.mjs").read_text(encoding="utf-8")
                self.edit_visuals(old, new)
                result = self.compose()
                (self.root / "visuals.mjs").write_text(original, encoding="utf-8")
                self.assertNotEqual(result.returncode, 0)
                self.assertRegex(result.stderr, message)
        self.assertEqual(self.compose().returncode, 0)

    def test_label_numbers_and_claims_are_checked_before_rendering(self):
        self.compose()
        resolved = json.loads((self.root / "build" / "resolved.json").read_text(encoding="utf-8"))
        make_episode.check_labels(self.root, resolved)
        write_json(self.root / "build" / "labels.json", {"thirty": "一秒 9 张"})
        with self.assertRaisesRegex(PipelineError, r"Label numbers not in the production sheet: \['9'\]"):
            make_episode.check_labels(self.root, resolved)
        write_json(self.root / "build" / "labels.json", {"thirty": "照做保证见效"})
        with self.assertRaisesRegex(PipelineError, "guaranteed_outcome"):
            make_episode.check_labels(self.root, resolved)

    def test_fingerprints_cover_the_kit_pictures_and_sounds(self):
        make_episode.run(self.root, SimpleNamespace(from_stage=None, until="validate", retry_tts=[]))
        before = make_episode.fingerprint("validate", self.root)
        (self.root / "kit.mjs").write_text("const TINT = 1;\n", encoding="utf-8")
        self.assertNotEqual(make_episode.fingerprint("validate", self.root), before)
        write_json(self.root / "timeline.json", {"scenes": []})
        before = make_episode.fingerprint("compose", self.root)
        (self.root / "assets").mkdir()
        (self.root / "assets" / "logo.png").write_bytes(b"png")
        self.assertNotEqual(make_episode.fingerprint("compose", self.root), before)
        before = make_episode.fingerprint("mix", self.root)
        resolved = self.root / "build" / "resolved.json"
        resolved.write_text(resolved.read_text(encoding="utf-8").replace('"thirty": "pop"', '"thirty": "ding"'), encoding="utf-8")
        self.assertNotEqual(make_episode.fingerprint("mix", self.root), before)


class Beats(unittest.TestCase):
    NARRATION = "一秒钟放三十张，画面就动起来。"
    CUES = [{"start": 0.1, "end": 1.5, "text": "一秒钟放三十张，", "char_starts": [0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3]},
            {"start": 1.8, "end": 3.0, "text": "画面就动起来。", "char_starts": [1.8, 2.0, 2.2, 2.4, 2.6, 2.8]}]

    def test_word_timing_lands_on_the_phrase_and_cue_timing_on_its_cue(self):
        self.assertEqual(sync.phrase_time(self.NARRATION, self.CUES, "三十张", "word"), 0.9)
        self.assertEqual(sync.phrase_time(self.NARRATION, self.CUES, "三十张", "cue"), 0.1)
        self.assertEqual(sync.phrase_time(self.NARRATION, self.CUES, "起来", "word"), 2.6)
        # A phrase that opens a cue is the same moment either way.
        self.assertEqual(sync.phrase_time(self.NARRATION, self.CUES, "画面", "word"), 1.8)

    def test_without_character_times_a_word_reveal_falls_back_to_its_cue(self):
        plain = [{key: value for key, value in cue.items() if key != "char_starts"} for cue in self.CUES]
        self.assertEqual(sync.phrase_time(self.NARRATION, plain, "起来", "word"), 1.8)

    def test_punctuation_is_not_counted_as_a_spoken_character(self):
        cues = [{"start": 0.0, "end": 1.0, "text": "先别急，画面", "char_starts": [0.0, 0.2, 0.4, 0.6, 0.8]}]
        self.assertEqual(sync.phrase_time("先别急，画面", cues, "画面", "word"), 0.6)

    def test_character_times_from_the_narration_stage_feed_the_beats(self):
        # The real cues, not a hand-made fixture: a 40-character clause is cut at 32, and a phrase in the second
        # piece must still land on its own character.
        text = "".join(chr(0x4e00 + index) for index in range(40)) + "。"
        events = [{"kind": "Word", "text": char, "start": index * .1, "duration": .1} for index, char in enumerate(text[:-1])]
        cues = tts_azure.boundary_cues(text, events, 4.0)
        self.assertEqual([len(cue["text"]) for cue in cues], [32, 9])
        self.assertAlmostEqual(sync.phrase_time(text, cues, text[35:38], "word"), 3.5)
        self.assertAlmostEqual(sync.phrase_time(text, cues, text[35:38], "cue"), 3.2)
        self.assertAlmostEqual(sync.phrase_time(text, cues, text[31:33], "word"), 3.1)

    def test_beats_and_sound_events_use_the_film_timeline(self):
        resolved = {"reveal_timing": "word", "scenes": [
            {"id": "S01", "narration": "开场。", "reveals": {}, "sfx": {}},
            {"id": "S02", "narration": self.NARRATION, "reveals": {"thirty": "三十张", "moves": "起来"},
             "sfx": {"moves": "ding", "start": "whoosh", "thirty": "pop"}}]}
        timeline = {"scenes": [{"start": 0.0, "subtitles": [{"start": 0.0, "end": 1.0, "text": "开场。"}]},
                               {"start": 10.0, "subtitles": self.CUES}]}
        self.assertEqual(sync.beats(resolved, timeline), {"S01": {}, "S02": {"thirty": 10.9, "moves": 12.6}})
        self.assertEqual(sync.sound_events(resolved, timeline), [(10.0, "whoosh"), (10.9, "pop"), (12.6, "ding")])


class Sounds(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.dir)

    def samples(self, path):
        with wave.open(str(path), "rb") as clip:
            self.assertEqual((clip.getnchannels(), clip.getsampwidth(), clip.getframerate()), (2, 2, sfx.RATE))
            frames = clip.readframes(clip.getnframes())
        return [int.from_bytes(frames[i:i + 2], "little", signed=True) for i in range(0, len(frames), 4)]

    def test_every_sound_is_short_quiet_and_repeatable(self):
        for name in sfx.SOUNDS:
            samples = sfx.render(name)
            self.assertLess(len(samples) / sfx.RATE, 1.0, name)
            self.assertAlmostEqual(max(abs(value) for value in samples), sfx.SFX_PEAK, places=6, msg=name)
            self.assertEqual(sfx.SOUNDS[name](), sfx.SOUNDS[name](), name)

    def test_bus_places_sounds_on_time_and_cuts_them_at_the_edges(self):
        path = self.dir / "sfx.wav"
        sfx.bus(path, 2.0, [(0.5, "tick"), (1.98, "ding"), (-0.02, "tick")])
        samples = self.samples(path)
        self.assertEqual(len(samples), 2 * sfx.RATE)
        first = next(index for index, value in enumerate(samples) if value)
        self.assertLess(first, 5)                                   # the tick that began before 0 is heard from the first samples
        self.assertEqual(set(samples[round(.1 * sfx.RATE):round(.5 * sfx.RATE)]), {0})
        self.assertTrue(any(samples[round(.5 * sfx.RATE):round(.55 * sfx.RATE)]))
        self.assertTrue(any(samples[round(1.98 * sfx.RATE):]))      # the ding is cut at the end, not moved or dropped
        with self.assertRaises(KeyError):
            sfx.bus(path, 1.0, [(0, "boom")])

    def test_music_is_the_asked_length_and_the_same_every_time(self):
        first, second = self.dir / "a.wav", self.dir / "b.wav"
        sfx.music(first, 3.0, 108)
        sfx.music(second, 3.0, 108)
        self.assertEqual(len(self.samples(first)), 3 * sfx.RATE)
        self.assertEqual(hashlib.sha256(first.read_bytes()).hexdigest(), hashlib.sha256(second.read_bytes()).hexdigest())
        with self.assertRaisesRegex(ValueError, "Unknown music style"):
            sfx.music(first, 1.0, 108, "organ")


class VerifyHelpers(unittest.TestCase):
    def test_visible_text_skips_scripts_captions_and_the_preview_notice(self):
        html = ('<div class="series">一分钟科普</div><div class="preview">静音视觉预览 · 每镜 10 秒</div><div class="caption"><div>旁白 99</div></div>'
                '<div class="lb">一秒 30 张</div><script>var x=5</script><style>.a{}</style><p>示例<br>3 天</p>')
        text = verify.visible_text(html)
        for shown in ("一分钟科普", "一秒 30 张", "3 天"):
            self.assertIn(shown, text)
        for hidden in ("每镜 10 秒", "旁白 99", "var x", ".a{}"):
            self.assertNotIn(hidden, text)

    def test_unsourced_numbers(self):
        self.assertEqual(verify.unsourced_numbers("一秒 30 张，2025 年，13 帧，02 期", "一秒30张画面，2025-10-17，F02"), ["13"])

    def light_clips(self, directory, drawn_box):
        """Two one-second clips of the light stage with a dark series badge: one with nothing else, one with `drawn_box`."""
        blank, drawn = directory / "blank.mp4", directory / "drawn.mp4"
        badge = "drawbox=x=64:y=40:w=400:h=56:color=0x0f2a4a:t=fill"
        for clip, extra in ((blank, ""), (drawn, "," + drawn_box)):
            subprocess.run([tool("ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "color=c=0xeaf5ff:s=1920x1080:d=1",
                            "-vf", badge + extra, "-pix_fmt", "yuv420p", str(clip)], check=True)
        return blank, drawn

    def test_an_empty_stage_is_detected_despite_the_dark_series_badge(self):
        directory = Path(tempfile.mkdtemp())
        try:
            blank, drawn = self.light_clips(directory, "drawbox=x=800:y=400:w=300:h=200:color=0x4a2326:t=fill")
            for region in (verify.STAGE_REGION, verify.OPENING_REGION):
                self.assertFalse(verify.has_art(blank, .5, region))
                self.assertTrue(verify.has_art(drawn, .5, region))
            # The badge itself is dark, so the whole frame would pass: the regions are what keep it out.
            self.assertTrue(verify.has_art(blank, .5, "1920:1080:0:0"))
            self.assertFalse(verify.has_art(directory / "missing.mp4", .5, verify.STAGE_REGION))
        finally:
            shutil.rmtree(directory)

    def test_a_pale_mark_does_not_count_as_artwork(self):
        directory = Path(tempfile.mkdtemp())
        try:
            _, pale = self.light_clips(directory, "drawbox=x=800:y=400:w=300:h=200:color=0xc8d8e8:t=fill")
            self.assertFalse(verify.has_art(pale, 0, verify.OPENING_REGION))
        finally:
            shutil.rmtree(directory)

    def test_motion_profile_tells_a_still_picture_from_a_moving_one(self):
        directory = Path(tempfile.mkdtemp())
        try:
            clip = directory / "clip.mp4"
            # Two seconds of a still box, then two seconds of the box sliding across the stage.
            subprocess.run([tool("ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "color=c=0xeaf5ff:s=1920x1080:r=30:d=4",
                            "-f", "lavfi", "-i", "color=c=0x4b4fd9:s=300x300:r=30:d=4", "-filter_complex",
                            "[0:v][1:v]overlay=x='if(gt(t,2),200+(t-2)*600,200)':y=400", "-pix_fmt", "yuv420p", str(clip)], check=True)
            profile = verify.motion_profile(clip)
            self.assertEqual(len(profile), 4 * verify.MOTION_RATE - 1)
            still, moving = profile[:2 * verify.MOTION_RATE - 1], profile[2 * verify.MOTION_RATE + 1:]
            self.assertLess(max(still), verify.FROZEN_FLOOR)
            self.assertGreater(min(moving), verify.BEAT_FLOOR)
            summary = verify.motion_summary(profile)
            self.assertAlmostEqual(summary["max_frozen"], 1.75, delta=.26)
            self.assertLessEqual(summary["max_beat_gap"] - summary["max_frozen"], .5)
        finally:
            shutil.rmtree(directory)

    def test_motion_summary_counts_frozen_stretches_and_waits_between_beats(self):
        quiet, idle, beat = 0.0, 0.005, 0.05
        summary = verify.motion_summary([beat, quiet, quiet, quiet, idle, idle, beat, idle, quiet, quiet], rate=4)
        self.assertEqual((summary["max_frozen"], summary["max_beat_gap"], summary["samples"]), (.75, 1.25, 10))
        self.assertEqual(verify.motion_summary([], rate=4)["mean_change"], 0.0)
        # Exactly on a floor counts as moving, and as a beat.
        edge = verify.motion_summary([verify.FROZEN_FLOOR, verify.BEAT_FLOOR], rate=4)
        self.assertEqual((edge["max_frozen"], edge["max_beat_gap"]), (0, .25))

    def test_structure_reports_the_opening_the_closing_and_every_scene(self):
        timeline = {"scenes": [{"id": "S01", "start": 0, "end": 4, "subtitles": [{"text": " 一秒钟放三十张，"}]},
                               {"id": "S02", "start": 4, "end": 30, "subtitles": []},
                               {"id": "S03", "start": 30, "end": 50, "subtitles": []}]}
        summary = verify.structure(timeline)
        self.assertEqual(summary["opening"], {"id": "S01", "seconds": 4, "first_cue": "一秒钟放三十张，"})
        self.assertEqual((summary["total"], summary["closing"]), (50, {"id": "S03", "start": 30}))
        text = "\n".join(verify.structure_lines(summary))
        self.assertIn("全片 50.0 秒；首镜 S01 时长 4.0 秒，首句“一秒钟放三十张，”。", text)
        self.assertIn("末镜 S03 30.0 秒起", text)
        self.assertIn("| S02 | 4.0 | 26.0 |", text)

    def test_parse_srt(self):
        cues = verify.parse_srt("1\n00:00:00,050 --> 00:00:01,200\n你好，\n\n2\n00:00:01,300 --> 00:00:02,000\n世界。\n")
        self.assertEqual([c["text"] for c in cues], ["你好，", "世界。"])
        self.assertAlmostEqual(cues[1]["start"], 1.3)

    def test_the_mix_puts_narration_in_front_of_the_synthesized_bed_at_the_target_loudness(self):
        import mix
        root = Path(tempfile.mkdtemp())
        try:
            (root / "output").mkdir()
            subprocess.run([tool("ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=5",
                            "-ac", "1", "-c:a", "pcm_s16le", str(root / "output" / "narration.wav")], check=True)
            result = mix.mix(root, 5.0, {"synth": "marimba", "bpm": 108, "gain_db": -14}, [(0.5, "pop")])
            self.assertTrue(-17 <= float(result["lufs"]) <= -15 and float(result["true_peak_db"]) <= -1.5, result)
            report = json.loads((root / "evidence" / "mix-loudness.json").read_text(encoding="utf-8"))
            self.assertEqual((report["duration"], report["music"], report["sound_effects"]), (5.0, "synthesized marimba, 108 bpm", 1))
            with self.assertRaisesRegex(PipelineError, "does not match the timeline"):
                mix.mix(root, 6.0, {"synth": "marimba", "bpm": 108, "gain_db": -14})
        finally:
            shutil.rmtree(root)

    CHECKS = ["streams", "av_duration", "decode", "loudness", "subtitles", "onscreen_numbers", "guardrails", "first_frame",
              "no_empty_frames", "motion", "secret_scan"]

    def test_verify_runs_the_eleven_checks_on_a_real_file(self):
        root, keys = Path(tempfile.mkdtemp()), Path(tempfile.mkdtemp())
        try:
            for name in ("output", "evidence"):
                (root / name).mkdir()
            final = root / "output" / "film.mp4"
            # Two seconds of a dark box sliding across the light stage, with a tone far too quiet to pass loudness.
            subprocess.run([tool("ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "color=c=0xeaf5ff:s=1920x1080:r=30:d=2",
                            "-f", "lavfi", "-i", "color=c=0x4a2326:s=300x300:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=2",
                            "-filter_complex", "[0:v][1:v]overlay=x='200+t*600':y=400[v];[2:a]volume=0.01[a]", "-map", "[v]", "-map", "[a]",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ac", "2", str(final)], check=True)
            (root / "production-sheet.md").write_text("| F01 | 一秒 30 张画面 |\n", encoding="utf-8")
            (root / "index.html").write_text('<div class="lb">一秒 30 张</div><div class="caption"><div>原文。</div></div>', encoding="utf-8")
            (root / "output" / "subtitles.zh-CN.srt").write_text("1\n00:00:00,100 --> 00:00:01,500\n原文。\n", encoding="utf-8")
            write_json(root / "timeline.json", {"scenes": [{"id": "S01", "start": 0, "end": 2, "subtitles": [{"text": "原文。"}]}]})
            resolved = {"title": "测试片", "scenes": [{"id": "S01", "narration": "原文。"}], "sheet": {"file": "production-sheet.md"},
                        "guardrail_exceptions": [], "motion": {"max_frozen": 1, "max_beat_gap": 1}}
            key_file = keys / "key.env"
            key_file.write_text("AZURE_SPEECH_KEY=abcdef0123\nAZURE_SPEECH_REGION=eastus\n")
            os.chmod(key_file, 0o600)
            scan = verify.files_containing_secret
            with patch.object(verify, "files_containing_secret", lambda path: scan(path, key_file)):
                with self.assertRaisesRegex(PipelineError, r"^Verification failed:\nloudness: "):
                    verify.verify(root, resolved, final)
            report = json.loads((root / "evidence" / "verification.json").read_text(encoding="utf-8"))
            self.assertEqual(list(report["checks"]), self.CHECKS)
            self.assertEqual([name for name, item in report["checks"].items() if not item["ok"]], ["loudness"])
            self.assertEqual(report["structure"]["opening"], {"id": "S01", "seconds": 2, "first_cue": "原文。"})
            for produced in ("verification.md", "keyframes-contact.png", "keyframes/first-frame.png", "keyframes/S01.png", "onscreen-text.txt"):
                self.assertTrue((root / "evidence" / produced).is_file(), produced)
        finally:
            shutil.rmtree(root)
            shutil.rmtree(keys)

    def test_secret_scan_reports_files_not_values(self):
        directory, keys = Path(tempfile.mkdtemp()), Path(tempfile.mkdtemp())
        try:
            key_file = keys / "key.env"
            key_file.write_text("AZURE_SPEECH_KEY=abcdef0123\nAZURE_SPEECH_REGION=eastus\n")
            os.chmod(key_file, 0o600)
            (directory / "leak.json").write_text('{"k": "abcdef0123"}')
            (directory / "clean.txt").write_text("nothing")
            (directory / "audio.wav").write_bytes(b"abcdef0123")
            self.assertEqual(verify.files_containing_secret(directory, key_file), ["leak.json"])
            self.assertIsNone(verify.files_containing_secret(directory, directory / "missing.env"))
        finally:
            shutil.rmtree(directory)
            shutil.rmtree(keys)


if __name__ == "__main__":
    unittest.main()
