# 《不会画画也能做动画：Opus 5.5 出片工作流全拆解》制作单

## 定位与验收

讲清一套用 Opus 5.5 做动画视频的工作流的科普短片（极客Ai科技 · AI 动画小课堂），23 镜，旁白 1445 字，全片约 6 分钟，实际以晓伊配音合成为准。横版 1920×1080，30fps，晓伊配音（zh-CN-XiaoyiNeural），引擎合成的轻快配乐与音效，逐字字幕。每一镜是一个有事情发生的场景，文字只作短标签，不复述旁白。主角是一个示意用的小机器人和一位创作者。

这支片子讲的就是它自己的做法：用 `pop-science-video` 这个 Skill 的流程出片。脚本沿革、节拍表和出片记录见同目录的 `SCRIPT.md`。

画面代码由 `tools/build.py` 从 `src/scenes/` 拼成 `visuals.mjs`，规格 `episode.spec.json` 也由它生成；旁白与节拍短语的唯一来源是 `src/script.py`，下面的旁白与它逐字一致。

## 事实台账

外部来源在 2026-09-30 实际打开读过；仓库内的来源是本仓库里的现行文件。“原文”一栏照抄来源。

| 编号 | 旁白里的说法 | 来源与位置 | 原文 |
|---|---|---|---|
| F01 | Opus 5.5 是语言模型，输出的是文字，不是视频；能看图 | Anthropic《Models overview》 | “Claude is a family of state-of-the-art large language models developed by Anthropic.”；“All current models support text and image input, text output, multilingual capabilities, vision, and tool use.” |
| F02 | Claude Code 里有个机制叫 Skill：一个文件夹，里面放一份说明书 | Claude Code 文档《Extend Claude with skills》 | “Create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`.”；“Skills add optional features: a directory for supporting files” |
| F03 | 平时只占一段简介，用到的时候才把整份读进来 | 同上，加载方式一表 | “Description always in context, full skill loads when invoked”；“a skill's body loads only when it's used” |
| F04 | 这个 Skill 主要有说明书、动效手册、绘图库三样；说“做科普视频”一般就会触发 | 本仓库 `.claude/skills/pop-science-video/`：`SKILL.md`、`references/motion-grammar.md`、`references/kit.mjs`；`SKILL.md` 头部的 `description` | 目录实查；“当用户说‘科普视频’‘做科普视频’……时使用。” |
| F05 | 引擎一步都不用大模型；模型负责写脚本、写代码、看图 | `engine/README.md` | “引擎不调用大模型；脚本、事实核实和画面代码由执行技能的模型完成。” |
| F06 | HyperFrames 是开源框架 | GitHub `heygen-com/hyperframes` 的 README 与仓库信息 | “HyperFrames is an open-source framework for turning HTML, CSS, media, and seekable animations into deterministic MP4 videos.”；许可证 Apache-2.0 |
| F07 | 它把视频当成一张网页，每样东西第几秒出现都写在里面 | 同上，How It Works | “Define a video as HTML. Add data attributes for timing and tracks.” |
| F08 | 渲染时在后台的浏览器里一帧一帧跳到指定时刻，截图，再压成视频；同样的输入出同样的成片 | 同上，How It Works 与包列表 | “The renderer seeks each frame in headless Chrome and encodes the result with FFmpeg, so the same input produces the same video.”；`@hyperframes/engine`：“Seekable page-to-video capture engine using Puppeteer and FFmpeg” |
| F09 | 八道工序里的检查和渲染用的是 HyperFrames | `engine/make_episode.py` 的 `stage_check`、`stage_render` | 命令 `hyperframes check <期目录> --json` 与 `hyperframes render <期目录> -o … -q high`；依赖固定在 `package.json`：`hyperframes` 0.8.91 |
| F10 | 四条硬规则 | `.claude/skills/pop-science-video/SKILL.md`“四条硬规则” | “不做文字卡片。”“每一镜是一个场景。”“一直在动，而且动在字上。”“角色要演，不是站着。” |
| F11 | 判断标准：关掉声音、遮住字幕还看得出在讲什么 | `.claude/skills/pop-science-video/SKILL.md` 开头 | “把成片静音、遮住字幕，观众还能不能看出这一段在讲什么、有没有事情正在发生。做不到，就是在讲 PPT，要重做。” |
| F12 | 第一步先交事实台账、旁白、节拍表，等人确认 | `.claude/skills/pop-science-video/SKILL.md`“第一步” | “写出下面三样，等用户确认再动手出片。” |
| F13 | 来源必须打开读过；上屏数字要登记；读不到原文的不进旁白 | `.claude/skills/pop-science-video/SKILL.md`“事实台账” | “来源要实际打开读过”“画面上要出现的每一个数字都列进台账。读不到原文的说法不进旁白。” |
| F14 | 节拍写动作不写版式；连续两秒找不出节拍就补一个动作 | `.claude/skills/pop-science-video/SKILL.md`“节拍表” | “节拍要写动作，不写版式。”“一镜里如果有连续 2 秒以上找不出节拍，就补一个动作，或者把这一镜拆短。” |
| F15 | 本片脚本在确认这一步被打回两次：第一次流程没讲清楚，第二次漏了 Skill 和 HyperFrames；现在是第三版 | 本次制作的对话记录（2026-09-30） | 用户原话：“没讲这个skill的工作流讲清楚呢，还有时长可以放长点五分钟左右。”；“怎么没讲到skill和hyperframes” |
| F16 | 期目录里四个文件：制作单、规格表、绘图库、画面代码；其余由引擎生成 | `.claude/skills/pop-science-video/SKILL.md`“第二步” | “写四个文件，其余由引擎生成。”四个文件是 `production-sheet.md`、`episode.spec.json`、`kit.mjs`、`visuals.mjs` |
| F17 | 每镜一个函数；画面只由时间决定；渲染跳着取帧 | `engine/STAGE_CONTRACT.md`；F08 | “它必须是时间的纯函数：同一个 `f.t` 永远画出同一幅画，不依赖上一帧留下的任何东西。渲染是跳着取帧的，不是从头播放。” |
| F18 | 我们用的语音合成给出每个词的时间 | Microsoft Learn《How to synthesize speech from text》WordBoundary；`engine/tts_azure.py` 订阅了这个事件 | “This event is raised at the beginning of each new spoken word, punctuation, and sentence. The event reports the current word's time offset, in ticks, from the beginning of the output audio.” |
| F19 | 引擎把节拍短语换成秒；画面和音效读同一张表 | `engine/sync.py` 开头注释 | “One table drives both what moves on screen and when a sound effect plays, so they cannot drift apart.” |
| F20 | 八道工序：校验、配音、混音、合成、检查、渲染、封装、验收；上游输入变了不许从中间续跑 | `engine/make_episode.py` 的 `STAGES` 与文件开头的说明 | `STAGES = ["validate", "tts", "mix", "compose", "check", "render", "mux", "verify"]`；“--from refuses to resume when an earlier stage's inputs changed.” |
| F21 | 预览拼图不配音，每镜取三帧，模型自己看 | `engine/STAGE_CONTRACT.md`；`.claude/skills/pop-science-video/SKILL.md`“三道自检” | “每镜取三帧（镜内 12%、50%、92%）拼成 `evidence/preview-contact.png`。预览没有配音”；“有没有角色只剩影子……标签压住角色……构图挤在一角” |
| F22 | 引擎验收共十一项；上屏的数字都能在制作单里找到 | `engine/verify.py` 的 11 个 `check(...)`；本片验收记录 `demo/verification.md` 11 行 | streams、av_duration、decode、loudness、subtitles、onscreen_numbers、guardrails、first_frame、no_empty_frames、motion、secret_scan |
| F23 | 完全静止不超过两秒；两次明显变化之间不超过四秒 | `.claude/skills/pop-science-video/SKILL.md`；`references/motion-grammar.md` 第 1 条 | `"motion": {"max_frozen": 2.0, "max_beat_gap": 4.0}`；“完全静止不超过 2 秒。两次明显变化之间不超过 4 秒。” |
| F24 | 验收通过不等于好看；每 0.7 秒抽一帧拼图，逐镜对照节拍表 | `.claude/skills/pop-science-video/SKILL.md`“逐段看成片” | “验收通过不等于好看。把成片按 0.7 秒一帧抽出来拼图看一遍” |
| F25 | 三个坑：样式表动画在成片里不动；字画进画布会逃过数字核对；正面摆腿像倒退 | `.claude/skills/pop-science-video/SKILL.md`“容易踩的坑” | “不要用 CSS 动画做常驻微动。实测在渲染出的成片里它不动”；“画进去的字逃过了数字核对和重叠检查”；“正面摆腿看不出往哪走，甚至像在倒退” |
| F26 | 配乐听感、读音、手机端播放要人来判断；交付时列出还没验证的事 | `.claude/skills/pop-science-video/SKILL.md`“交付”；本片验收记录 `demo/verification.md` 末尾 | “还没验证的事。配乐和音效的听感模型无法判断，要明确请用户试听。”；“未验证：人工听审（读音、语气、音乐比例）、手机端播放与平台转码。” |
| F27 | 一秒画三十张 | `engine/compose_stage.mjs`；本片验收记录 | `data-fps="30"`；“streams：h264 1920x1080 30/1” |
| F28 | 这支视频的脚本和每一镜的画面代码都是 Opus 5.5 写的；就是这样一镜一镜做出来的 | 本片的制作过程，见本目录 `SCRIPT.md` 的“出片记录” | 出片并验收通过后才成立 |
| F29 | 没用图片生成，没用视频生成，也没有人动手剪辑 | `.claude/skills/pop-science-video/SKILL.md` 开头；`engine/make_episode.py` 的阶段列表 | “全流程不需要任何图像或视频生成密钥。”；合成、渲染、封装都由引擎自动完成 |

上屏数字清单：5.5、30、1、2、3、4、8、11、0.7。画面与标签里出现的数字只有这些。

来源地址：

- Anthropic Models overview：https://platform.claude.com/docs/en/about-claude/models/overview
- Claude Code skills：https://code.claude.com/docs/en/skills
- HyperFrames：https://github.com/heygen-com/hyperframes
- Microsoft Learn 语音合成：https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis

### 证据边界

- F06–F08 读的是 HyperFrames 仓库主分支 2026-09-30 的 README；本仓库固定的版本是 0.8.91，引擎只用到它的 `check`、`render`、`snapshot` 三个命令。“后台的浏览器”是对原文 headless Chrome 的口语说法，“压成视频”对应原文的 FFmpeg 编码，FFmpeg 这个名字只出现在画面标签上。
- F08 的“同样的输入出同样的成片”照的是 README 的说法；本片没有为了验证这句话专门渲染两遍去比对。
- HyperFrames 自己也带一套给编程助手用的技能，本片没有用到，不提。
- F03 的“一段简介”指 `description`。文档写的是默认设置下它常驻上下文，并在技能清单里截到 1,536 个字符；技能设了 `disable-model-invocation: true` 时简介不进上下文。
- F04 说“主要有三样”，是因为技能目录里还有一份写镜约定。“一般就会自己翻开”照的是文档的“Claude uses skills when relevant”，不是保证每次都触发。
- F05 的“不用大模型”不等于不用任何模型：配音是 Azure 的神经语音。第一稿写成“一步都不用模型”，被独立复核指出后改正。
- F18 的原文是“每个词（word）”的时间，不是每个字；引擎在词内按字数平均推算出每个字的时间。它说的是本片所用的 Azure 语音服务，不是所有语音合成都有这个能力。
- F22 的数字核对，引擎比的是整份制作单（`verify.py`：“all on-screen numbers appear in the production sheet”），不只是台账那张表，所以编号和日期里的数字也算“找得到”。技能要求把上屏数字都列进台账，是比引擎更严的人工约定。
- F23 的两秒和四秒是技能写进规格的阈值，`motion-grammar.md` 自己标明是经验值；规格里不写阈值时，引擎只报告不拦截。旁白说的是这套流程的做法，不是行业标准。
- F25 的“样式表做的浮动到了成片里没动”是这套流程的一次实测，不是说 HyperFrames 不支持样式表动画；它的 README 把 CSS 列为可用的动画方式之一。
- F27 的每秒 30 帧是这套引擎的设置，不是做动画的硬性要求。
- F15 是这次制作里真实发生的事，两次都发生在脚本确认这一步；第二次是在用户点了“确认出片”之后补充提出的。旁白说“被打回了两次”，不夸大。
- F16 的“四个文件，其余由引擎生成”是技能的常规做法。本片在四个文件之上多了一层 `src/`：旁白数据和每镜一个文件，由 `tools/build.py` 拼成 `visuals.mjs` 和规格表，这一层也是模型写的。
- F28 说的是本片的脚本和每一镜的场景代码，它们由主会话和四个子代理写成，五者都按各自的系统提示确认所用模型是 Opus 5.5。共用绘图库 `kit.mjs` 里的通用小人、镜头和缓动是这个技能早先就有的代码，最初由谁写的没有核实，所以旁白不说“每一帧都是 Opus 5.5 画的”，S04 也点明绘图库是“现成的角色和道具”。
- F29 的“没用图片生成、没用视频生成”不等于没用任何模型：配音用的是语音合成，S15 会讲到。
- 片子没有讲的前提：除了 Claude Code，还要装 Node、FFmpeg、HyperFrames 和一个语音合成服务。写进发布描述，不写进旁白。
- 不写进旁白的说法：“一句话出片”“零基础十分钟”“一次生成不用改”。X 上“由 Opus 5.5 一次生成”的案例都是作者自述，没有核实，不引用为事实。
- 片中机器人只是示意角色，不使用 Anthropic、Claude 或 HeyGen 的任何标识，也不暗示官方出品。
- 英文原文由模型译成中文。

## 完整旁白

### S01 旁白

不会画画，也不会剪辑，能做动画视频吗？能。你正在看的这支视频，脚本和每一镜的画面代码，都是 Opus 5.5 写的。没用图片生成，没用视频生成，也没有人动手剪辑。今天把这套流程拆开给你看。

### S02 旁白

先说原理。Opus 5.5 是语言模型，输出的是文字，不是视频。可代码也是文字：让它写一段程序，按时间在画布上作画，一秒画三十张，连起来就是动画。

### S03 旁白

但每次都从头教它一遍，太累。Claude Code 里有个机制叫 Skill：一个文件夹，里面放一份说明书。平时它只占一段简介，用到的时候，才把整份读进来。

### S04 旁白

我们做科普动画的这个 Skill，主要有三样东西：说明书写流程和规矩，动效手册讲画面怎么动，绘图库是现成的角色和道具。你说一句“做科普视频”，它一般就会自己翻开说明书。

### S05 旁白

Skill 背后还有一台引擎。分工很清楚：Opus 5.5 负责动脑，写脚本、写代码、看图挑毛病；引擎负责干活，从配音到验收，一步都不用大模型。

### S06 旁白

渲染靠的是开源框架 HyperFrames。它把视频当成一张网页，每样东西第几秒出现，都写在里面。渲染时，它在后台的浏览器里一帧一帧跳到指定的时刻，截图，再压成视频。同样的输入，出同样的成片。

### S07 旁白

说明书里有四条硬规则。不做文字卡片；每一镜都是一个有事发生的场景；画面一直在动，而且动在字上；角色要演，不能干站着。

### S08 旁白

判断标准只有一条：把声音关掉，把字幕遮住，观众还看不看得出这一段在讲什么。看不出来，就是在讲幻灯片，得重做。

### S09 旁白

流程分两步。第一步，你只给一个主题。它不会马上出片，而是先交三样东西等你点头：事实台账、旁白、节拍表。

### S10 旁白

事实台账管的是说得对不对。每个说法都写明来源，来源必须真的打开读过。画面上要出现的每个数字，也得先登记。读不到原文的说法，不进旁白。

### S11 旁白

节拍表最关键，它决定这是动画还是幻灯片。每一镜都要写清楚：旁白说到哪个词，画面里发生哪件事。节拍只写动作，不写版式。连续两秒找不出节拍，就补一个动作。

### S12 旁白

三样东西交到你手上，你确认了才开工。说句实话：这支视频的脚本，在这一步被打回了两次。第一次，流程没讲清楚；第二次，漏了 Skill 和 HyperFrames。你现在看到的，是第三版。

### S13 旁白

第二步，出片。它在这一期的文件夹里放进四个文件：制作单、规格表、绘图库、画面代码。其余的，全由引擎生成。

### S14 旁白

画面代码里，每一镜是一个函数。铁律只有一条：画面只由时间决定，同一个时刻，永远画出同一幅画。因为 HyperFrames 不是从头播放，而是跳着取帧的。

### S15 旁白

那动作怎么对上旁白？我们用的语音合成，会给出每个词的时间。引擎把节拍表里的短语换成秒，画面和音效读的是同一张表。所以说到“跳”，它就在这一刻起跳。

### S16 旁白

四个文件备齐，交给引擎。八道工序一条线：校验、配音、混音、合成、检查、渲染、封装、验收。其中检查和渲染，用的就是 HyperFrames。上游的输入一变，就不许从中间接着跑。

### S17 旁白

接下来是三道自检。第一道，预览拼图：不配音，每一镜取三帧拼成一张图，它自己打开看。角色有没有画坏，标签有没有压住人，构图是不是挤在一角。

### S18 旁白

第二道，引擎验收，一共十一项。上屏的数字都能在制作单里找到，字幕和旁白逐字一致，响度合格，首帧不是空的。还要查动态：完全静止不能超过两秒，两次明显变化之间不能超过四秒。哪一项不过，就停下。

### S19 旁白

第三道最容易被省掉。验收全过，不等于好看。把成片每零点七秒抽一帧，拼成图，逐镜对照节拍表：说到的事，有没有真的在画面里发生。

### S20 旁白

这些规则，很多是踩坑踩出来的。我们用样式表做的浮动，到了成片里根本没动。把字直接画进画布，会逃过数字核对。正面摆腿走路，看着像在倒退。踩一次，就往说明书里记一条。

### S21 旁白

也有它判断不了的。配乐好不好听，读音准不准，手机上放出来怎么样，得由人来听、来看。所以交付的时候，它会把还没验证的事一条一条列出来。

### S22 旁白

回头看一遍：一个主题，三样东西，四个文件，八道工序，三道自检，再加上人的耳朵。你正在看的这一支，就是这样一镜一镜做出来的。

### S23 旁白

想自己试试？别急着让它直接出片。先把你的做法写成一个 Skill，让它照着做，再让它自己查。极客AI科技，陪你把 AI 真正用起来。

## 发布包

标题：不会画画也能做动画：Opus 5.5 出片工作流全拆解

描述：Opus 5.5 不会直接吐出视频，但它会写代码。我们把做法写成了一个 Claude Code 的 Skill：先交事实台账、旁白和节拍表等人确认，再写逐帧绘图代码，交给引擎配音、合成，用开源框架 HyperFrames 检查和渲染，最后过三道自检。这支视频本身就是按这套流程做出来的。需要 Claude Code，以及 Node、FFmpeg、HyperFrames 和语音合成服务。

话题：#Opus5.5 #ClaudeCode #Skill #HyperFrames #AI做动画
