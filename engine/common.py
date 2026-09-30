"""Shared paths, hashing, JSON IO and tool lookup for the video engine."""
import hashlib
import json
import os
import shutil
from pathlib import Path

ENGINE = Path(__file__).resolve().parent
REPO = ENGINE.parent
SHARED_PUBLIC = ENGINE / "shared" / "public"
NODE_MODULES = REPO / "node_modules"
HYPERFRAMES = NODE_MODULES / ".bin" / "hyperframes"
# The key file may live elsewhere: point POP_VIDEO_AZURE_ENV at it.
KEY_FILE = Path(os.environ.get("POP_VIDEO_AZURE_ENV") or Path.home() / ".config" / "pop-science-video" / "azure-speech.env").expanduser()
GLOBAL_LOCK_DIR = Path.home() / ".cache" / "pop-science-video"

# What every episode's public/ directory holds. The font and its licence are committed; GSAP comes from npm.
SHARED_FILES = {
    "NotoSansSC.ttf": SHARED_PUBLIC / "NotoSansSC.ttf",
    "NotoSansSC-LICENSE.txt": SHARED_PUBLIC / "NotoSansSC-LICENSE.txt",
    "gsap.min.js": NODE_MODULES / "gsap" / "dist" / "gsap.min.js",
}
# Pinned: the engine refuses to run when a file differs.
SHARED_ASSETS = {
    "NotoSansSC.ttf": "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da",
    "NotoSansSC-LICENSE.txt": "1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9",
    "gsap.min.js": "c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280",
}
AZURE_SDK_VERSION = "1.52.0"


class PipelineError(Exception):
    """A stage precondition or validation failed; the message is safe to show."""


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + ".part")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def tool(name):
    found = shutil.which(name)
    if not found:
        raise PipelineError(f"{name} not found on PATH")
    return found


def verify_shared_assets():
    for name, expected in SHARED_ASSETS.items():
        path = SHARED_FILES[name]
        if not path.is_file():
            raise PipelineError(f"Missing shared asset {name}; see engine/shared/README.md")
        if sha256_file(path) != expected:
            raise PipelineError(f"Shared asset {name} does not match its pinned SHA-256")


def materialize_public(destination):
    """Place shared fonts and scripts as regular files; HyperFrames bundling rejects symlinks."""
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    for name, source in sorted(SHARED_FILES.items()):
        target = destination / name
        if target.is_symlink():
            target.unlink()
        if target.exists() and sha256_file(target) == sha256_file(source):
            continue
        if target.exists():
            target.unlink()
        try:
            os.link(source, target)
        except OSError:
            shutil.copy2(source, target)
