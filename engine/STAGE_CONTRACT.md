# 舞台约定

期目录由 [compose_stage.mjs](compose_stage.mjs) 合成：整幅画面是一块 1920×1080 的 Canvas，由本期的 `visuals.mjs` 按时间逐帧画出；画面里的文字是 DOM 标签。参考实现：`examples/opus_animation/`。

## 引擎负责的部分，不要重做

左上角栏目名（`series`）、封面（`cover`）、字幕、每镜来源行（`scenes[].source.text`）、右下角说明（`footer`）、进度条、配音、配乐与音效的混音。字幕区从 y 900 起，来源行与说明在 y 1040 以下，角色的脚和标签都要留在 y 885 以上。

成片的第一帧就是封面：引擎把 `cover` 的主标题和副标题做成一张卡片，连同一层淡色蒙版盖在首镜的舞台区（y 890 以上）上，第 0 帧完整显示，1 秒起用 0.4 秒淡出。旁白照常从第 0 秒开始，首镜也照常在底下播放；第一条字幕至少推迟一帧出现，第 0 帧上没有字幕。所以首镜要从第 0 帧就画全，不从空白淡入，它就是封面的底图；卡片在画面中央，首镜的主角和主道具最好落在卡片两侧。

## 期目录里由模型写的文件

| 文件 | 内容 |
|---|---|
| `production-sheet.md` | 事实台账与 `### SXX 旁白` |
| `episode.spec.json` | 见下文“规格” |
| `visuals.mjs` | `labels`、可选的 `images`、`draw(ctx, f)` |
| `kit.mjs`（可选） | 共用的绘图工具与角色绑定，合成时拼在 `visuals.mjs` 前面；两个文件共用一个作用域，不能重名 |
| `assets/`（可选） | 本期用到的图片，只能是 `assets/` 下的 png、jpg、svg |

旁白只写在制作单里：每镜一个 `### S01 旁白`、`### S02 旁白`……小节，编号从 S01 起连续，引擎从这里取旁白，规格里不再抄一遍。

## visuals.mjs

```js
export const labels = { thirty: '一秒 30 张' };          // 画面上出现的全部文字，键是小写标识符
export const images = { logo: 'assets/logo.png' };      // 可选
export function draw(ctx, f) { /* 画出 f.t 这一刻的整幅画面 */ }
```

`draw` 每一帧被调用一次，调用前画布已清空、变换已复位。它必须是时间的纯函数：同一个 `f.t` 永远画出同一幅画，不依赖上一帧留下的任何东西。渲染是跳着取帧的，不是从头播放。

`f` 的内容：

| 字段 | 含义 |
|---|---|
| `f.t`、`f.total` | 当前时间与全片时长（秒） |
| `f.scenes` | 每镜 `{id, start, end, voice, beats}`：`voice` 是旁白说完的时刻，`end` 含其后的停顿，`beats` 是本镜各揭示短语在全片时间线上的秒数 |
| `f.scene`、`f.local` | 当前镜与镜内时间 |
| `f.label(key, o)` | 这一帧显示一个标签：`x`、`y` 必填（屏幕坐标，默认居中对齐），可选 `size`、`color`、`weight`、`alpha`、`scale`、`rotate`、`align`、`plate`（底色）、`halo`（描边色） |
| `f.image(key, o)` | 这一帧显示一张图：`x`、`y`、`w` 必填，可选 `alpha`、`scale`、`rotate` |

没有被调用的标签和图片在这一帧是隐藏的。镜间转场由 `draw` 自己画：转场期间可以同时画前后两镜。引擎没有结尾卡，结尾也由 `draw` 自己画。

引擎拒绝的写法：`import`、`Math.random`、`Date`、`fetch`、`eval`、外部 URL、运行时写入文字，在 Canvas 上画字（`fillText`、`strokeText`），`export const` 与 `export function` 之外的导出写法（如 `export default`、`export async function`），以及源码里出现脚本结束标签。文字画进 Canvas 后，画面数字核对、文字重叠和对比度检查都读不到它，所以一律用标签。需要随机感时用由序号算出的确定值。

## 规格（episode.spec.json）

规格不含旁白。引擎只有全幅画布这一种画面，`theme` 不是规格字段，写了会报错。

| 字段 | 含义 |
|---|---|
| `title` | 必填。页面标题，也用来生成成片文件名 |
| `cover` | 必填。成片第一帧的封面：`{"title": …, "subtitle": …}`，主标题不超过 16 个字符，副标题可省略、不超过 28 个字符。封面文字和标签一样要过数字核对与禁用说法检查 |
| `series` | 必填。左上角栏目名 |
| `sheet` | 制作单文件名，缺省 `production-sheet.md` |
| `voice` | `zh-CN-XiaoyiNeural`（缺省）或 `zh-CN-XiaoqiuNeural` |
| `footer` | 右下角说明，缺省“情境与图表为示意” |
| `sources` | 来源表：每项 `{"id": "F01", "label": …, "url": "https://…"}`，`id` 必须出现在制作单的事实台账里 |
| `scenes[].id` | 与制作单的旁白小节一一对应：`S01`、`S02`…… |
| `scenes[].source` | 可选，`{"ids": ["F01"], "text": …}`：本镜左下角显示“来源：…”，`ids` 必须在 `sources` 里 |
| `scenes[].pause_after` | 本镜旁白说完后的停顿，0.2–10 秒，缺省 0.6 |
| `scenes[].reveals` | 节拍表：键 → 旁白里恰好出现一次的短语。同一张表驱动画面（`beats`）和音效 |
| `scenes[].sfx` | 音效：节拍键（或 `start`，即本镜第一帧）→ 音效名。可用：`pop`、`tick`、`ding`、`rise`、`drop`、`whoosh`、`sparkle`，全部由 [sfx.py](sfx.py) 合成 |
| `reveal_timing` | `word`（缺省）让揭示落在短语自己的第一个字上；`cue` 落在所在字幕分句的开头。配音没有逐字时间时 `word` 回退为分句开头 |
| `music` | 引擎合成的轻快配乐：`{"synth": "marimba", "bpm": 108, "gain_db": -14}`。三个键都可以省略，不写 `music` 就用这组缺省值；`bpm` 限 60–180，`gain_db` 限 -30 到 -6。引擎不接受配乐文件 |
| `motion` | 动态验收阈值，单位秒：`max_frozen`（最长完全静止）、`max_beat_gap`（两次明显变化之间的最长间隔）。写了才拦截，不写只在验收记录里报告 |
| `accent` | 可选，两个 `#rrggbb` 颜色。第一个是左上角栏目名的文字色和进度条的起始色，第二个是进度条的结束色。不写时是 `["#4b4fd9", "#f08a3c"]` |
| `guardrail_exceptions` | 经用户批准的禁用说法例外：每项 `{"rule", "scene", "reason", "approved_by_user"}`，`approved_by_user` 是用户批准的日期（`YYYY-MM-DD`） |

## 自检与验收

- `make-episode preview <期目录>`：每镜取三帧（镜内 12%、50%、92%）拼成 `evidence/preview-contact.png`。预览没有配音，节拍按短语在旁白里的位置估算，只用来看构图。预览页在 `preview/` 下，期目录的 `assets/` 每次都会整份镜像过去，已删除的图片不会残留。首镜的第一格换成第 0 帧，也就是封面。
- 合成时，引擎先用一块替身画布把整支片子排练一遍（每秒 10 个时刻，加上每镜首尾和每个节拍）。任何一刻 `draw` 抛错、用了没声明的标签或图片、标签缺坐标，都会立刻停下并报出时间和镜头。这一步必不可少：实测某一帧画到一半抛错时，HyperFrames 检查和成片验收都发现不了，成片里那一帧就是半成品。
- 合成后、渲染前，引擎核对标签里的数字都在制作单中、没有禁用说法。
- HyperFrames 检查照常运行：标签是 DOM 文字，重叠、出画和对比度不足都会被拦下。
- 成片验收做动态量化：每秒取 4 帧比较相邻画面（y 110–890，不含字幕区）。变化像素不到 0.05% 记为静止，达到 2% 记为一次明显变化。结果写进 `evidence/verification.md` 的“动态”一节。

动态数字只说明画面在不在动，不说明动得对不对、好不好看；成片仍要按 0.5–1 秒一帧抽出来看，配乐和音效要人工试听。
