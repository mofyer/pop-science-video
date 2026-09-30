"""Shared test setup: import the engine modules and build a throwaway two-scene episode."""
import json
import sys
import tempfile
import wave
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE))
FIXTURES = Path(__file__).resolve().parent / "fixtures"

SHEET = """# 测试片

| F01 | 一秒 30 张画面 | 测试来源 |

### S01 旁白

一秒钟放三十张，画面就动起来。张数越多，动作越顺。

### S02 旁白

建议截图收藏。
"""
SPEC = {"title": "测试片", "series": "一分钟科普",
        "sources": [{"id": "F01", "label": "测试来源", "url": "https://example.org/frames"}],
        "scenes": [{"id": "S01", "reveals": {"thirty": "三十张", "moves": "起来"}, "sfx": {"start": "whoosh", "thirty": "pop"},
                    "source": {"ids": ["F01"], "text": "测试来源"}},
                   {"id": "S02", "pause_after": 1.0}]}
VISUALS = """export const labels = { thirty: '一秒 30 张' };
export function draw(ctx, f) {
  ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 100 + f.t, 100);
  f.label('thirty', { x: 960, y: 300 });
}
"""


def sample_episode(name="sample"):
    """A two-scene episode in a temporary directory; caller removes the parent."""
    parent = Path(tempfile.mkdtemp())
    root = parent / name
    root.mkdir()
    (root / "production-sheet.md").write_text(SHEET, encoding="utf-8")
    (root / "episode.spec.json").write_text(json.dumps(SPEC, ensure_ascii=False), encoding="utf-8")
    (root / "visuals.mjs").write_text(VISUALS, encoding="utf-8")
    return parent, root


def edit_spec(root, change):
    path = root / "episode.spec.json"
    spec = json.loads(path.read_text(encoding="utf-8"))
    change(spec)
    path.write_text(json.dumps(spec, ensure_ascii=False), encoding="utf-8")


def write_wav(path, seconds=1.0, rate=48000):
    with wave.open(str(path), "wb") as output:
        output.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        output.writeframes(b"\x00\x00" * round(seconds * rate))
