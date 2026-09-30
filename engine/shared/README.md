# 共享资源

每期的页面都用到下面三个文件。引擎启动时逐个核对它们的 SHA-256（固定在 `../common.py`），对不上就不运行；合成时把它们以普通文件放进期目录的 `public/`。

| 文件 | 在哪里 | 来源与许可 | SHA-256 |
|---|---|---|---|
| `NotoSansSC.ttf` | `public/`，随仓库入库 | Noto Sans SC 可变字体，取自 Google Fonts；SIL Open Font License 1.1 | a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da |
| `NotoSansSC-LICENSE.txt` | `public/`，随仓库入库 | 字体的许可全文，按许可要求与字体一同分发 | 1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9 |
| `gsap.min.js` | 不入库，运行时取自仓库根的 `node_modules/gsap/dist/gsap.min.js` | GSAP 3.14.2，npm 包 `gsap@3.14.2`，许可见该包自带的说明 | c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280 |

GSAP 由仓库根的 `npm ci` 安装（`tools/setup.sh` 会做）。校验值不符时：字体重新从仓库检出，GSAP 重新执行 `npm ci`。

在仓库根目录自行核对：

```sh
shasum -a 256 engine/shared/public/* node_modules/gsap/dist/gsap.min.js
```
