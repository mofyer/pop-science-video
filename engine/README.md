# 视频引擎

把“制作单 + 规格 + 画面代码”做成 1920×1080 的横版成片：校验 → Azure 配音 → 逐字字幕 → 合成配乐与音效混音 → 合成网页（整幅 Canvas，逐帧由代码画出）→ HyperFrames 检查与渲染 → 封装 H.264/AAC → 自动验收。

引擎不调用大模型；脚本、事实核实和画面代码由执行技能的模型完成。

画面怎么写见 [STAGE_CONTRACT.md](STAGE_CONTRACT.md)。

## 安装

需要本机已有 `node`、`npm`、`python3`、`ffmpeg`、`ffprobe`。在仓库根目录执行一次：

```sh
tools/setup.sh            # npm ci，建 .venv 并安装 requirements.txt
./make-episode doctor     # 逐项检查环境
```

## 命令

都在仓库根目录执行。入口脚本 `make-episode` 用根目录的 `.venv` 运行 `engine/make_episode.py`。

```sh
./make-episode doctor                          # 工具、固定版本、共享资源校验值、密钥配置
./make-episode preview <期目录>                # 校验 + 静音预览：每镜三帧，拼成 evidence/preview-contact.png
./make-episode run <期目录>                    # 全流程，八个阶段依次执行
./make-episode run <期目录> --until validate   # 跑到某个阶段为止
./make-episode run <期目录> --from compose     # 从某个阶段续跑；它之前任一阶段的输入或产物变了就拒绝
```

`preview` 和 `doctor` 不发配音请求。`run` 走到配音阶段会向 Azure 语音服务发请求，占用你订阅的额度；每镜的配音按请求内容缓存在期目录的 `audio/` 里，旁白和音色没变时重跑不会再发。某次请求结果不明时引擎会停下，确认后用 `--retry-tts S03,S07` 指明重发哪几镜。

同一期同一时间只允许一个进程；配音另有跨期的全局锁（`~/.cache/pop-science-video/`）。

## 八个阶段

每个阶段把输入指纹和产物校验值写进 `evidence/run.json`，`--from` 靠它判断能不能续跑。

| 阶段 | 做什么 | 主要产物 |
|---|---|---|
| `validate` | 核对共享资源校验值；静态检查 `visuals.mjs` 和 `kit.mjs`；规格对照制作单；禁用说法 | `build/resolved.json` |
| `tts` | 逐镜配音，取逐字时间，切字幕分句 | `timeline.json`、`output/narration.wav`、`output/subtitles.zh-CN.srt` |
| `mix` | 旁白归一到 -16 LUFS，合成配乐并随人声压低，按节拍表放音效 | `audio/final-mix.wav` |
| `compose` | 算出节拍时间，生成页面，把全片排练一遍，核对标签里的数字和禁用说法 | `index.html`、`build/beats.json`、`build/labels.json` |
| `check` | HyperFrames 检查：有错误，或运行时、布局有告警，都停下 | `evidence/check.json` |
| `render` | HyperFrames 渲染 | `output/render_raw.mp4` |
| `mux` | 画面与混音封装成成片 | `output/<期目录名>_<标题>.mp4` |
| `verify` | 成片验收，见下文 | `evidence/verification.md`、`evidence/keyframes-contact.png` |

## 期目录

| 文件 | 谁写 |
|---|---|
| `production-sheet.md` | 人或模型：事实台账、每镜的 `### SXX 旁白` |
| `episode.spec.json` | 人或模型：栏目名、来源、节拍表、音效、配乐、验收阈值；不含旁白 |
| `visuals.mjs` | 人或模型：标签、可选的图片、逐帧画面 `draw(ctx, f)` |
| `kit.mjs`（可选） | 人或模型：共用的绘图工具与角色绑定 |
| `assets/`（可选） | 人或模型：本期用到的图片 |
| `build/`、`timeline.json`、`index.html`、`public/`、`preview/`、`audio/`、`output/`、`evidence/`、`.lock` | 引擎生成，不入库 |

成片是 `output/<期目录名>_<标题>.mp4`，字幕是 `output/subtitles.zh-CN.srt`，验收记录是 `evidence/verification.md`，逐镜抽帧拼图是 `evidence/keyframes-contact.png`。

## 验收自动检查的内容

| 检查 | 通过条件 |
|---|---|
| `streams` | H.264 1920×1080 30 帧/秒，AAC 48 kHz 双声道 |
| `av_duration` | 音视频时长相差不到一帧 |
| `decode` | 完整解码，没有报错 |
| `loudness` | 响度 -16±1 LUFS，真峰值不高于 -1.5 dBTP |
| `subtitles` | 字幕与旁白逐字一致，时间有序，不超出片长 |
| `onscreen_numbers` | 页面上可见文字里的数字都能在制作单中找到 |
| `guardrails` | 上屏文字和字幕里没有禁用说法（[guardrails.json](guardrails.json)：编造的第一人称经历、保证效果的承诺、粗口） |
| `first_frame` | 首帧就是封面：封面主标题在页面上，栏目名以下已经有画面 |
| `no_empty_frames` | 每一镜抽一帧（镜内 68% 处），舞台区都有内容 |
| `motion` | 规格写了 `motion` 才检查：最长完全静止、两次明显变化之间的最长间隔都不超过阈值 |
| `secret_scan` | 期目录的文本文件里没有 Azure 密钥；读不到密钥配置时记为未通过 |

`verification.md` 另附两节只报告、不拦截的内容：“结构时间点”（首镜时长与首句、末镜起点、逐镜起止）和“动态”（最长完全静止、两次明显变化之间的最长间隔、平均变化占比）。

自动检查不能证明事实正确，也不能代替看成片和人工试听。

## 依赖与固定版本

- HyperFrames 0.8.91、GSAP 3.14.2：版本固定在仓库根的 `package.json` 和 `package-lock.json`，`npm ci` 装到根目录的 `node_modules/`。
- Azure Speech SDK 1.52.0：固定在仓库根的 `requirements.txt`，装进根目录的 `.venv/`。版本号参与配音缓存键，换版本会让已有配音缓存失效。
- FFmpeg（`ffmpeg`、`ffprobe`）和 Node 从 PATH 查找，不固定版本。
- 字体 Noto Sans SC 在 `shared/public/`，随仓库入库；GSAP 运行时取自 `node_modules/gsap/dist/gsap.min.js`。三个文件的 SHA-256 固定在 `common.py`，对不上引擎就不运行，见 [shared/README.md](shared/README.md)。合成时它们以普通文件放进期目录的 `public/`（HyperFrames 打包不接受软链接）。

## 密钥

配音阶段读取 `~/.config/pop-science-video/azure-speech.env`；想放别处，把环境变量 `POP_VIDEO_AZURE_ENV` 设成那个文件的路径。文件内容两行：

```
AZURE_SPEECH_KEY=<你的密钥>
AZURE_SPEECH_REGION=<你的区域，例如 eastus>
```

- 文件必须是普通文件（不能是软链接）、属主是你本人、权限 0600，否则引擎拒绝读取。
- 密钥只在真正要发请求时读取，不进命令行参数、日志和产物；报错信息里也不回显。
- 区域取自这个文件里的 `AZURE_SPEECH_REGION`，并参与配音缓存键：换了区域，已有的配音缓存不再命中，会重新合成。只在 `eastus` 上实际跑过。

## 测试

在仓库根目录执行（先跑过 `tools/setup.sh`，并且 PATH 里有 `node` 和 `ffmpeg`）：

```sh
.venv/bin/python -W default -m unittest discover -s engine/tests
```

测试不发配音请求，也不读取你的密钥文件。
