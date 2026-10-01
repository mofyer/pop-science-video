"""Spec resolution, narration extraction, guardrails and visuals static checks."""
import shutil
import unittest

from helpers import VISUALS, edit_spec, sample_episode

import spec  # noqa: E402
from common import PipelineError  # noqa: E402


class NarrationBlocks(unittest.TestCase):
    def test_joins_paragraphs_and_stops_at_next_heading(self):
        text = "## 5\n\n### S01 旁白\n\n第一段，\n续行。\n\n第二段。\n\n### S02 旁白\n\n只有一段。\n## 6. 台账\n\n### F01 不是旁白\n\n忽略。\n"
        self.assertEqual(spec.narration_blocks(text), [("S01", "第一段，续行。\n第二段。"), ("S02", "只有一段。")])


class Resolve(unittest.TestCase):
    def setUp(self):
        self.parent, self.root = sample_episode()

    def tearDown(self):
        shutil.rmtree(self.parent)

    def assert_rejected(self, change, message):
        original = (self.root / "episode.spec.json").read_text(encoding="utf-8")
        edit_spec(self.root, change)
        try:
            with self.assertRaisesRegex(PipelineError, message):
                spec.resolve(self.root)
        finally:
            (self.root / "episode.spec.json").write_text(original, encoding="utf-8")

    def test_defaults(self):
        resolved = spec.resolve(self.root)
        self.assertEqual((resolved["voice"], resolved["reveal_timing"], resolved["motion"]), ("zh-CN-XiaoyiNeural", "word", None))
        self.assertEqual(resolved["music"], {"synth": "marimba", "bpm": 108, "gain_db": -14})
        self.assertEqual([s["pause_after"] for s in resolved["scenes"]], [0.6, 1.0])
        self.assertEqual(resolved["scenes"][0]["sfx"], {"start": "whoosh", "thirty": "pop"})
        self.assertEqual((resolved["scenes"][1]["source"], resolved["scenes"][1]["reveals"], resolved["scenes"][1]["sfx"]), (None, {}, {}))

    def test_the_cover_is_required_and_its_lines_are_short(self):
        self.assertEqual(spec.resolve(self.root)["cover"], {"title": "画面为什么会动", "subtitle": "动画的原理"})
        edit_spec(self.root, lambda s: s["cover"].pop("subtitle"))
        self.assertEqual(spec.resolve(self.root)["cover"], {"title": "画面为什么会动", "subtitle": ""})
        for change, message in [(lambda s: s.pop("cover"), "cover needs a title"),
                                (lambda s: s.update(cover="画面为什么会动"), "cover needs a title"),
                                (lambda s: s["cover"].update(tagline="x"), "cover needs a title"),
                                (lambda s: s["cover"].update(title=" "), "cover.title must be a non-empty string"),
                                (lambda s: s["cover"].update(title="一" * 17), "cover.title must be at most 16 characters"),
                                (lambda s: s["cover"].update(subtitle=3), "cover.subtitle must be a string"),
                                (lambda s: s["cover"].update(subtitle="一" * 29), "cover.subtitle must be at most 28 characters"),
                                (lambda s: s["cover"].update(title="照做保证见效"), "cover: rule guaranteed_outcome")]:
            with self.subTest(message=message):
                self.assert_rejected(change, message)

    def test_a_theme_field_is_refused(self):
        self.assert_rejected(lambda s: s.update(theme="pop"), "theme is not a spec field.*full-frame canvas")

    def test_scene_ids_must_match_the_sheet(self):
        self.assert_rejected(lambda s: s["scenes"].pop(), "match the sheet")

    def test_reveal_phrase_must_exist_once(self):
        self.assert_rejected(lambda s: s["scenes"][0]["reveals"].update(bad="不存在的短语"), "exactly once")
        self.assert_rejected(lambda s: s["scenes"][0]["reveals"].update(bad="张"), "exactly once")

    def test_sources_must_be_declared_and_in_the_ledger(self):
        self.assert_rejected(lambda s: s["scenes"][0]["source"].update(ids=["F09"]), "declared sources")
        self.assert_rejected(lambda s: s["sources"].append({"id": "F09", "label": "x", "url": "https://example.org"}), "fact ledger")

    def test_pause_after_must_stay_in_range(self):
        self.assert_rejected(lambda s: s["scenes"][1].update(pause_after=0.1), "pause_after must be")
        self.assert_rejected(lambda s: s["scenes"][1].update(pause_after=11), "pause_after must be")

    def test_banned_source_line_is_rejected(self):
        self.assert_rejected(lambda s: s["scenes"][0]["source"].update(text="照做保证见效"), "S01 source line: rule guaranteed_outcome")

    def test_banned_narration_is_rejected_unless_user_approved(self):
        sheet = self.root / "production-sheet.md"
        sheet.write_text(sheet.read_text(encoding="utf-8").replace("一秒钟放三十张", "前阵子我刷到一个视频，一秒钟放三十张"), encoding="utf-8")
        with self.assertRaisesRegex(PipelineError, "fabricated_first_person"):
            spec.resolve(self.root)
        edit_spec(self.root, lambda s: s.update(guardrail_exceptions=[{"rule": "fabricated_first_person", "scene": "S01",
                                                                        "reason": "test", "approved_by_user": True}]))
        with self.assertRaisesRegex(PipelineError, "YYYY-MM-DD"):
            spec.resolve(self.root)
        edit_spec(self.root, lambda s: s["guardrail_exceptions"][0].update(approved_by_user="2026-99-99"))
        with self.assertRaisesRegex(PipelineError, "YYYY-MM-DD"):
            spec.resolve(self.root)
        edit_spec(self.root, lambda s: s.update(guardrail_exceptions=[{"rule": "fabricated_first_person", "scene": "S01",
                                                                        "reason": "test", "approved_by_user": "2026-09-30"}]))
        resolved = spec.resolve(self.root)
        self.assertEqual(len(resolved["scenes"]), 2)
        # Whole-page text (scene unknown) honours an approved exception for the same rule.
        self.assertEqual(spec.guardrail_violations("前阵子我刷到", "page", resolved["guardrail_exceptions"]), [])
        self.assertTrue(spec.guardrail_violations("前阵子我刷到", "S02", resolved["guardrail_exceptions"], "S02"))

    def test_sound_effects_need_a_known_sound_and_anchor(self):
        self.assert_rejected(lambda s: s["scenes"][0].update(sfx={"thirty": "boom"}), "sfx.thirty must be one of")
        self.assert_rejected(lambda s: s["scenes"][0].update(sfx={"later": "pop"}), "must be start or one of the scene's reveals")
        self.assert_rejected(lambda s: s["scenes"][0].update(sfx=["pop"]), "must map")
        self.assert_rejected(lambda s: s["scenes"][0].update(reveals={"start": "三十张"}, sfx={"start": "pop"}), "no reveal may be named start")

    def test_motion_limits_timing_and_music(self):
        edit_spec(self.root, lambda s: s.update(motion={"max_frozen": 2, "max_beat_gap": 4.5}, reveal_timing="cue", music={"bpm": 120}))
        resolved = spec.resolve(self.root)
        self.assertEqual(resolved["motion"], {"max_frozen": 2, "max_beat_gap": 4.5})
        self.assertEqual((resolved["reveal_timing"], resolved["music"]), ("cue", {"synth": "marimba", "bpm": 120, "gain_db": -14}))
        for change, message in [({"motion": {"max_still": 2}}, "motion needs"), ({"motion": {"max_frozen": 0}}, "motion needs"),
                                ({"motion": {}}, "motion needs"), ({"motion": {"max_frozen": True}}, "motion needs"),
                                ({"reveal_timing": "frame"}, "reveal_timing"), ({"music": {"synth": "organ"}}, "music.synth"),
                                ({"music": {"synth": "marimba", "bpm": 30}}, "music.bpm"),
                                ({"music": {"file": "x.wav"}}, "synth, bpm and gain_db only"),
                                ({"music": {"synth": "marimba", "gain_db": -3}}, "gain_db")]:
            with self.subTest(change=change):
                self.assert_rejected(lambda s, change=change: s.update(change), message)

    def test_accent_is_optional_and_takes_two_hex_colours(self):
        # Left out, the resolved episode has no accent key at all and the stage keeps its default colours.
        self.assertNotIn("accent", spec.resolve(self.root))
        edit_spec(self.root, lambda s: s.update(accent=["#1F7A8C", "#e2b33c"]))
        self.assertEqual(spec.resolve(self.root)["accent"], ["#1f7a8c", "#e2b33c"])
        for value in (["#1f7a8c"], ["#1f7a8c", "orange"], "#1f7a8c", ["#1f7a8c", "#e2b33c", "#000000"], ["#1f7", "#e2b"], [1, 2]):
            with self.subTest(value=value):
                self.assert_rejected(lambda s, value=value: s.update(accent=value), "accent must be two #rrggbb colours")


class Guardrails(unittest.TestCase):
    SAMPLES = {
        "fabricated_first_person": "前阵子我刷到一个短视频",
        "guaranteed_outcome": "照这个方法做一定能成功",
        "profanity": "忘记生活有多操蛋",
    }

    def test_every_rule_has_a_matching_sample(self):
        ids = {rule["id"] for rule in spec.load_guardrails()}
        self.assertEqual(ids, set(self.SAMPLES))
        for rule, sample in self.SAMPLES.items():
            found = spec.guardrail_violations(sample, "sample")
            self.assertTrue(any(f"rule {rule}" in item for item in found), rule)

    def test_promises_are_caught_and_plain_or_negated_statements_pass(self):
        for promise in ("保证三天见效", "用了必然暴富", "包治百病", "稳赚不赔"):
            self.assertTrue(spec.guardrail_violations(promise, "sample"), promise)
        for plain in ("一秒钟放三十张，画面就动起来。张数越多，动作越顺。", "这个办法不一定能成功", "谁也不保证见效"):
            self.assertEqual(spec.guardrail_violations(plain, "sample"), [], plain)


class VisualsSource(unittest.TestCase):
    def setUp(self):
        self.parent, self.root = sample_episode()

    def tearDown(self):
        shutil.rmtree(self.parent)

    def test_sample_visuals_pass(self):
        spec.check_visuals_source(self.root / "visuals.mjs")

    def test_empty_css_content_is_allowed(self):
        path = self.root / "visuals.mjs"
        path.write_text(VISUALS + "\nexport const more=`.y:before{content:''}`;\n", encoding="utf-8")
        spec.check_visuals_source(path)

    def test_nondeterministic_or_external_code_is_rejected(self):
        for snippet in ("Math.random()", "new Date()", "fetch('x')", "import fs from 'node:fs';",
                        "const u='https://cdn.example.com/a.js'", "process.env.X", "eval('1')",
                        "export const extra=`.x:after{content:'13 帧'}`;", "el.textContent='13'", "el.innerHTML='x'",
                        "export const c2=`.x:after{content:attr(data-n)}`;", "node.append('13 帧')"):
            path = self.root / "visuals.mjs"
            path.write_text(VISUALS + "\n" + snippet + "\n", encoding="utf-8")
            with self.assertRaises(PipelineError, msg=snippet):
                spec.check_visuals_source(path)

    def test_words_drawn_on_a_canvas_are_rejected(self):
        path = self.root / "visuals.mjs"
        path.write_text(VISUALS + "\nctx.fillText('13 帧', 0, 0);\n", encoding="utf-8")
        with self.assertRaisesRegex(PipelineError, "visuals.mjs: words drawn on a canvas"):
            spec.check_visuals_source(path)


if __name__ == "__main__":
    unittest.main()
