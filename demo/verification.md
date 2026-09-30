# 验收记录：不会画画也能做动画_Opus5.5出片工作流全拆解

成片：`opus_animation_不会画画也能做动画_Opus5_5出片工作流全拆解.mp4`，365.428 秒，208284607 字节。

| 检查 | 结果 | 说明 |
|---|---|---|
| streams | 通过 | h264 1920x1080 30/1 / aac 48000 Hz 2 ch |
| av_duration | 通过 | video 365.400000 s, audio 365.428000 s |
| decode | 通过 | exit 0, stderr 0 bytes |
| loudness | 通过 | -15.8 LUFS, true peak -1.6 dBTP |
| subtitles | 通过 | 190 cues, verbatim, ordered and within duration |
| onscreen_numbers | 通过 | all on-screen numbers appear in the production sheet |
| guardrails | 通过 | no banned claims on screen or in subtitles |
| first_frame | 通过 | the opening frame already shows the first scene |
| no_empty_frames | 通过 | every scene's stage has visible content |
| motion | 通过 | longest frozen stretch 0.00 s, longest wait between beats 4.00 s |
| secret_scan | 通过 | no project file contains the Azure key |

## 结构时间点

只报告，不拦截。

- 全片 365.4 秒；首镜 S01 时长 19.2 秒，首句“不会画画，”。
- 末镜 S23 348.4 秒起。

| 镜头 | 起点（秒） | 时长（秒） |
|---|---|---|
| S01 | 0.0 | 19.2 |
| S02 | 19.2 | 15.7 |
| S03 | 34.9 | 15.3 |
| S04 | 50.1 | 17.0 |
| S05 | 67.1 | 15.2 |
| S06 | 82.3 | 20.0 |
| S07 | 102.3 | 13.0 |
| S08 | 115.3 | 12.6 |
| S09 | 127.8 | 12.4 |
| S10 | 140.3 | 14.3 |
| S11 | 154.6 | 17.3 |
| S12 | 171.9 | 18.4 |
| S13 | 190.3 | 13.0 |
| S14 | 203.3 | 15.1 |
| S15 | 218.4 | 15.6 |
| S16 | 234.1 | 19.5 |
| S17 | 253.5 | 14.8 |
| S18 | 268.3 | 21.2 |
| S19 | 289.5 | 14.1 |
| S20 | 303.6 | 18.1 |
| S21 | 321.7 | 13.6 |
| S22 | 335.3 | 13.0 |
| S23 | 348.4 | 17.1 |

## 动态

每秒取 4 帧比较相邻画面（不含字幕区）。

- 最长完全静止：0.00 秒。
- 两次明显变化之间最长间隔：4.00 秒。
- 平均每次取样变化的画面占比：5.22%。

未验证：人工听审（读音、语气、音乐比例）、手机端播放与平台转码。首帧与逐镜抽帧拼图见 `keyframes-contact.png`，需人工或多模态模型查看。
