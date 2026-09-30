# pop-science-video

[中文](README.md) | **English**

A Claude Code skill plus a render engine. You give it a topic; the model writes a script and a beat table and waits for your approval, then writes the frame-by-frame drawing code; the engine handles text-to-speech, mixing, compositing, rendering and verification. The result is a narrated explainer animation in which something is always happening on screen.

No image generation, no video generation and no editing software are involved. Every frame is drawn by code on a Canvas as a function of time and rendered frame by frame with [HyperFrames](https://github.com/heygen-com/hyperframes).

The skill, its reference documents and the narration are in Chinese. This page is a translation of the [Chinese README](README.md).

## Demo

https://github.com/user-attachments/assets/0632d1b6-8e62-4832-aa45-941754234241

The player above shows a 720p preview and starts muted, so turn the sound on. The 1080p version is on [YouTube](https://youtu.be/ogl79nqNduM), and a compressed file is in the repository at [demo/opus_animation.mp4](demo/opus_animation.mp4).

The film is 《不会画画也能做动画：Opus 5.5 出片工作流全拆解》 ("You can't draw, but you can animate: the Opus 5.5 production workflow taken apart"), 6 min 05 s, 1920×1080, narrated in Chinese. It explains the workflow in this repository and was itself made with that workflow; the complete project is in [examples/opus_animation/](examples/opus_animation/).

![Key frames of every scene](demo/keyframes.png)

It is a demo, not a polished production. The problems an independent review found (for example, the second scene is almost completely still for about its first 3 seconds) are listed as they are under ["已知的不足" (known shortcomings) in SCRIPT.md](examples/opus_animation/SCRIPT.md#已知的不足) and were left unfixed.

## How it works

```text
You give a topic
   │
   ▼
Step 1  The model hands over three things and waits for your approval
        Fact ledger   every claim with its source; the source has actually been opened and read
        Narration     short spoken sentences, one block per scene
        Beat table    which word of the narration triggers which event on screen
   │    (send it back for a rewrite if you are not satisfied)
   ▼
Step 2  The model writes four files
        production-sheet.md   production sheet: the ledger and the narration
        episode.spec.json     spec: beat phrases, sound effects, music, thresholds
        kit.mjs               drawing library: characters, camera, transitions, props
        visuals.mjs           drawing code: one function per scene; the picture depends on time only
   │
   ▼
Engine  validate → tts → mix → compose → check → render → mux → verify
        Speech comes from Azure text-to-speech; its per-word timing pins each beat to its word
        check and render use HyperFrames
   │
   ▼
Three self-checks
        Preview sheet         three frames per scene; the model looks for anything drawn wrong
        Engine verification   eleven checks, including "never fully still for more than 2 seconds"
        Watching the film     one frame every 0.7 s, compared against the beat table
```

The engine never calls a large language model. The script, the fact checking and the drawing code are the work of the model that runs the skill.

Two ideas carry the approach:

- **Motion is pinned to words.** Beat phrases are taken verbatim from the narration, the speech service reports when each word is spoken, and the picture and the sound effects read the same table.
- **The picture is a pure function of time.** The same moment always draws the same picture. That is what lets the renderer jump to any frame, and lets the model pull any single frame to inspect.

## What is in the repository

| Path | Contents |
|---|---|
| [.claude/skills/pop-science-video/](.claude/skills/pop-science-video/) | The skill itself: [SKILL.md](.claude/skills/pop-science-video/SKILL.md) (the process, four hard rules, three self-checks, pitfalls we hit), the [motion handbook](.claude/skills/pop-science-video/references/motion-grammar.md), the [scene-writing conventions](.claude/skills/pop-science-video/references/scene-guide.md) and the [drawing library kit.mjs](.claude/skills/pop-science-video/references/kit.mjs) |
| [engine/](engine/) | The render engine (Python plus one Node script) and its tests; see [engine/README.md](engine/README.md) and [engine/STAGE_CONTRACT.md](engine/STAGE_CONTRACT.md) |
| [tools/](tools/) | The setup script, and the tools for long films: `build.py` assembles scenes, `snap.sh` grabs frames, `beats.py` looks up beat times |
| [examples/opus_animation/](examples/opus_animation/) | The demo's complete project: production sheet, [script and beat table](examples/opus_animation/SCRIPT.md), drawing code for all 23 scenes |
| [demo/](demo/) | The demo film, key frames of every scene, the robot's poses, the verification record |

## Getting started

You need:

- macOS or Linux. So far it has only been run on macOS (Apple Silicon); other environments are untested.
- Node.js 22 or later, FFmpeg and Python 3.
- [Claude Code](https://claude.com/claude-code), or another coding assistant that supports skills. The model must be able to read images, because the self-checks involve looking at contact sheets.
- A key for Azure Speech, used for the narration.

```sh
git clone https://github.com/mofyer/pop-science-video.git
cd pop-science-video
tools/setup.sh              # installs HyperFrames and GSAP, creates a Python virtual environment
```

Put the speech key in your own config directory, not in the repository:

```sh
mkdir -p ~/.config/pop-science-video
cat > ~/.config/pop-science-video/azure-speech.env <<'EOF'
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=your-region
EOF
chmod 600 ~/.config/pop-science-video/azure-speech.env
./make-episode doctor       # checks the environment
```

Then start Claude Code in the repository root and tell it, for example:

```text
做科普视频：为什么飞机在万米高空飞
```

That reads "make a pop-science video: why airliners cruise at ten thousand metres". The skill is written in Chinese and the two built-in voices are Chinese; English topics and English narration have not been tried.

It first hands over the fact ledger, the narration and the beat table for your approval. Once you approve, it writes the files under `episodes/<name>/` and renders the film.

### Try the demo first

```sh
./make-episode preview examples/opus_animation   # silent preview, three frames per scene, no key needed
./make-episode run examples/opus_animation       # full run; calls text-to-speech for about 1,700 characters
```

A full run needs the key file in place. The last verification check reads it in order to make sure the key has not ended up inside the episode directory; if the file cannot be read, the check is recorded as failed.

The demo was written one scene per file, and the sources are in `examples/opus_animation/src/`. After editing a scene, run `python3 tools/build.py examples/opus_animation` to regenerate the drawing file and the spec.

## Limits

- Only Azure text-to-speech is wired in, with the Chinese voices Xiaoyi and Xiaoqiu. Using another speech service means changing `engine/tts_azure.py`, and that service has to report per-word timing.
- The visual style comes from the drawing library: bright flat cartoons, a small robot host and a generic person. A different style or a different character means adding drawing functions to `kit.mjs` yourself.
- The model cannot judge pronunciation, or how the music and sound effects feel. A person has to listen after the film is rendered.
- The engine's eleven checks only show that the file is well formed, the picture keeps moving and the numbers on screen have a source. They do not show that the content is correct, or that it looks good.
- The `visuals.mjs` and `kit.mjs` in an episode directory are code that runs in Node and in a browser on your machine. The engine rejects a set of dangerous constructs, but it is not a sandbox: do not run an episode directory from a source you do not trust.

## License and credits

The code, documents and demo film in this repository are released under the [MIT License](LICENSE).

It depends on these projects, each under its own license:

- [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0): renders web pages to video.
- [GSAP](https://gsap.com/): the timeline inside the HyperFrames page. It is fetched by npm during setup and is not distributed with this repository.
- [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) (SIL Open Font License 1.1): the font for subtitles and labels. It is distributed with the repository; the license text is in `engine/shared/public/`.
- Azure text-to-speech: the narration service; bring your own key.

The robot in the demo is an illustrative character only. It is not affiliated with Anthropic, Claude or HeyGen and does not represent their official positions.
