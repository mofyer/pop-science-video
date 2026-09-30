// ---------- S18 第二道自检：引擎验收十一项，外加动态阈值，哪一项不过就停下 ----------
// 变化量曲线上的几个位置：平段从哪到哪（2 秒那么长）、两个峰（相隔 4 秒那么长）、第二个平段从哪开始。
const s18_flat = [1040, 1170], s18_peaks = [1200, 1460], s18_flat2 = 1490, s18_base = 762, s18_tall = 190;

// 变化量：x 处的高度 0..1。开头有动静，中间一段完全静止，两个明显的峰之间只有够不上门槛的小起伏。
function s18_change(x) {
  let v = 0;
  for (const [at, a] of [[962, 1], [1008, .74], [s18_peaks[0], 1], [s18_peaks[1], 1]]) v += a * Math.exp(-Math.pow((x - at) / 12, 2));
  if (x < s18_flat[0] - 6) v += .1 + .07 * Math.sin(x * .41);
  if (x > s18_peaks[0] + 18 && x < s18_peaks[1] - 18) v += .1 + .07 * Math.sin(x * .33) * Math.sin(x * .09);
  return Math.min(1, v);
}
// 量尺：一条带两个端头的横线，k 是从左往右量出来的进度。
function s18_ruler(ctx, x0, x1, y, k, color, drop = 14) {
  if (k <= 0) return;
  const x = lerp(x0, x1, k);
  ctx.lineCap = 'round';
  for (const [c, w] of [[PAL.white, 14], [color, 7]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x, y); ctx.moveTo(x0, y - drop); ctx.lineTo(x0, y + drop);
    if (k >= 1) { ctx.moveTo(x1, y - drop); ctx.lineTo(x1, y + drop); } ctx.stroke();
  }
}
// 小缩略图：白边卡片里一幅迷你场景；frozen 时是灰的。
function s18_thumb(ctx, x, y, w, h, tt, frozen, edge) {
  ctx.fillStyle = 'rgba(40,40,80,.13)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 5, y - h / 2 + 8, w, h, 10); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
  miniScene(ctx, x - w / 2 + 7, y - h / 2 + 7, w - 14, h - 14, tt, { r: 5, frozen });
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x - w / 2 - 7, y - h / 2 - 7, w + 14, h + 14, 15); ctx.stroke(); }
}
// 音量表：半圆表盘，中间偏右一段青色是合格区；v 是指针位置 0..1。
function s18_meter(ctx, x, y, r, v) {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = PAL.line; ctx.lineWidth = r * .34; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#d8dbe8'; ctx.lineWidth = r * .24; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.01, Math.PI * 1.99); ctx.stroke();
  ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.55, Math.PI * 1.8); ctx.stroke();
  const a = Math.PI * (1 + clamp(v));
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86); ctx.stroke();
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86); ctx.stroke();
  ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * .14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function scene18(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const halted = L >= b('stop'), running = Math.min(L, b('stop'));
  // 清单十一行各在什么时候打钩；第 10 行（动态）不过，最后一行没轮到。
  const ticks = [b('eleven') + .5, b('eleven') + .62, b('eleven') + .74, b('loud') + .35, b('verbatim') + .45, b('number') + .4, b('first') + .5, b('first') + .25, b('first') + .7, null, null];
  const rowY = i => 232 + 53 * (i + .5);
  // 曲线画到哪了：三个节拍各落在平段尽头、第二个峰、超出界线的地方。
  const head = L < b('frozen') ? lerp(922, s18_flat[1], seg(L, b('motion'), b('frozen') - b('motion')))
    : L < b('gap') ? lerp(s18_flat[1], s18_peaks[1], seg(L, b('frozen'), b('gap') - b('frozen')))
      : lerp(s18_peaks[1], 1700, seg(L, b('gap'), b('stop') - b('gap')));
  const sh = shake(L, b('stop'), .3, 6);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D), sh[0], sh[1]);
  studio(ctx, t, '#eaf0ff', '#fff7ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 三枚徽章里的第二枚亮着：这是第二道。
  ['lines', 'check', 'play'].forEach((kind, i) => badge(ctx, 116 + i * 64, 172, 27, kind, i === 1 ? seg(L, .1, .3) : 0, t, i === 1 ? 1 + .2 * Math.sin(seg(L, .1, .45) * Math.PI) : .9));

  // 清单
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(98, 230, 430, 602, 16); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(90, 216, 430, 602, 16); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(201,196,238,.6)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 1; i < 11; i++) { ctx.moveTo(112, rowY(i) - 26.5); ctx.lineTo(498, rowY(i) - 26.5); } ctx.stroke();
  for (let i = 0; i < 11; i++) {
    const k = ease.out(seg(L, b('eleven') + i * .04, .25)), y = rowY(i); if (k <= 0) continue;
    const failed = i === 9 && halted, done = ticks[i] === null ? 0 : ease.inOut(seg(L, ticks[i], .25));
    if (failed) { ctx.fillStyle = 'rgba(240,138,60,' + .3 * seg(L, b('stop'), .2) + ')'; ctx.beginPath(); ctx.roundRect(100, y - 25, 410, 50, 10); ctx.fill(); }
    ctx.globalAlpha = k;
    ctx.fillStyle = PAL.white; ctx.strokeStyle = failed ? ORANGE_D : PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(118, y - 16, 32, 32, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = failed ? ORANGE_D : done > .5 ? INK : GREY; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(174, y); ctx.lineTo(174 + (190 + hash(i + 4) * 120) * k, y); ctx.stroke();
    ctx.globalAlpha = 1;
    mark(ctx, 'check', 136, y - 2, .62, done);
    if (failed) mark(ctx, 'cross', 134, y, .62, seg(L, b('stop'), .25), ORANGE_D);
  }

  // 仪表一：上屏的数字连到台账的一行。
  const linked = ease.inOut(seg(L, b('number'), .35));
  sheet(ctx, 752, 250, 108, 150, { lines: 4, k: 1 });
  if (linked > 0) { ctx.fillStyle = 'rgba(11,122,117,' + .28 * linked + ')'; ctx.beginPath(); ctx.roundRect(705, 231, 94, 26, 8); ctx.fill(); }
  ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(586, 186, 72, 72, 16); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(614, 204); ctx.lineTo(608, 240); ctx.moveTo(636, 204); ctx.lineTo(630, 240); ctx.moveTo(602, 214); ctx.lineTo(644, 214); ctx.moveTo(600, 230); ctx.lineTo(642, 230); ctx.stroke();
  if (linked > 0) {
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 11; trace(ctx, [[662, 222], [680, 222], [688, 244], [703, 244]], linked);
    ctx.strokeStyle = TEAL; ctx.lineWidth = 5; trace(ctx, [[662, 222], [680, 222], [688, 244], [703, 244]], linked);
    mark(ctx, 'check', 650, 184, .6, seg(L, b('number') + .3, .25));
  }

  // 仪表二：旁白条在上，字幕条在下；对齐之后每一段都重合。
  const align = ease.inOut(seg(L, b('verbatim'), .4)), off = (20 + 5 * sway(t, 1.7)) * (1 - align), widths = [38, 22, 50, 28, 42];
  for (const [y, shift, color] of [[206, 0, INDIGO], [276, off, align > .95 ? TEAL : ORANGE]]) {
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(835 + shift, y - 21, 230, 42, 14); ctx.fill(); ctx.stroke();
    let x = 844 + shift;
    for (const w of widths) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y - 10, w, 20, 7); ctx.fill(); x += w + 8; }
  }
  if (align >= 1) {
    let x = 844;
    widths.forEach((w, i) => { const k = seg(L, b('verbatim') + .4 + i * .05, .15); if (k > 0) { ctx.strokeStyle = TEAL; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + w / 2, 229); ctx.lineTo(x + w / 2, 229 + 24 * k); ctx.stroke(); } x += w + 8; });
    mark(ctx, 'check', 1070, 186, .6, seg(L, b('verbatim') + .5, .25));
  }

  // 仪表三：音量表，指针摆进合格区停住。
  const loud = ease.inOut(seg(L, b('loud'), .5));
  s18_meter(ctx, 1210, 292, 92, lerp(.16 + .05 * sway(t, 1.1), .68, loud));
  waveform(ctx, 1142, 328, 136, 30, running, 1, loud > .9 ? TEAL : GREY, 14);
  mark(ctx, 'check', 1310, 196, .6, seg(L, b('loud') + .5, .25));

  // 仪表四：第一帧亮起来，不是空的。
  const lit = seg(L, b('first'), .25);
  s18_thumb(ctx, 1536, 262, 104, 68, 2.2, true);
  s18_thumb(ctx, 1490, 254, 124, 80, 1.4, true);
  s18_thumb(ctx, 1420, 242, 160, 104, .42, lit < .5, lit > 0 ? 'rgba(11,122,117,' + lit + ')' : null);
  burst(ctx, 1420, 242, seg(L, b('first'), .35), 10, 96, 140, '#ffd34d');
  mark(ctx, 'check', 1500, 190, .6, seg(L, b('first') + .25, .25));

  // 引擎：齿轮一直转，警示灯灰着；有一项不过，灯亮，齿轮停。
  const rot = running * 1.5, alarm = seg(L, b('stop'), .2);
  ctx.fillStyle = '#5a6078'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(1622, 214, 156, 126, 22); ctx.fill(); ctx.stroke();
  gear(ctx, 1672, 282, 40, rot, GREY, 9); gear(ctx, 1738, 262, 25, -rot * 1.6 + .3, ORANGE, 7);
  if (alarm > 0) { ctx.fillStyle = 'rgba(240,138,60,' + (.3 + .16 * sway(t, .7)) * alarm + ')'; ctx.beginPath(); ctx.arc(1700, 196, 66, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = alarm > .5 ? ORANGE : '#e6e8f2'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1700, 214, 26, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  burst(ctx, 1700, 200, seg(L, b('stop'), .35), 10, 40, 100, ORANGE);

  // 动态：变化量曲线。平段被量出来，正好碰到 2 秒的界线；两个峰之间被量出来，是 4 秒；再平下去就越界了。
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(888, 468, 940, 360, 18); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(880, 455, 940, 360, 18); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = LILAC; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(910, s18_base + 14); ctx.lineTo(1795, s18_base + 14); ctx.stroke();
  ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.moveTo(910, s18_base - s18_tall * .5); ctx.lineTo(1795, s18_base - s18_tall * .5); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(141,151,173,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(922, s18_base - s18_tall * s18_change(922));
  for (let x = 925; x <= 1790; x += 3) ctx.lineTo(x, s18_base - s18_tall * s18_change(x));
  ctx.stroke();
  if (L >= b('motion')) {
    const over = s18_flat2 + s18_flat[1] - s18_flat[0];
    ctx.lineJoin = 'round'; ctx.strokeStyle = INDIGO; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(922, s18_base - s18_tall * s18_change(922));
    for (let x = 925; x <= Math.min(head, over); x += 3) ctx.lineTo(x, s18_base - s18_tall * s18_change(x));
    ctx.stroke();
    if (head > over) { ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(over, s18_base); ctx.lineTo(head, s18_base); ctx.stroke(); }
    const measured = ease.inOut(seg(L, b('frozen'), .35)), spanned = ease.inOut(seg(L, b('gap'), .35));
    if (measured > 0) { ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 5; ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.moveTo(s18_flat[1], s18_base - 96 * measured); ctx.lineTo(s18_flat[1], s18_base + 10); ctx.stroke(); ctx.setLineDash([]); }
    s18_ruler(ctx, s18_flat[0], s18_flat[1], s18_base - 30, measured, ORANGE_D);
    s18_ruler(ctx, s18_peaks[0], s18_peaks[1], s18_base - s18_tall - 22, spanned, TEAL);
    if (head > s18_flat2) s18_ruler(ctx, s18_flat2, over, s18_base - 30, clamp((head - s18_flat2) / (over - s18_flat2)), ORANGE_D);
    ctx.fillStyle = halted ? ORANGE_D : INDIGO; ctx.strokeStyle = PAL.white; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(head, s18_base - s18_tall * s18_change(head), 11 + (halted ? 0 : 2 * sway(t, .5)), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (halted) mark(ctx, 'cross', head, s18_base - 48, .8, seg(L, b('stop'), .25), ORANGE_D);
  }

  // 机器人：看清单刷出来，抬头一块一块看仪表，盯着曲线走；停下那一刻吓一跳，抬手拦住。
  const bx = 720, by = 856, bs = .8, nods = [b('number') + .4, b('verbatim') + .45, b('loud') + .35, b('first') + .25];
  let pose = botMix({ lookX: -1, lookY: -.2 }, { armL: [3.45, .35], lookX: -1, lookY: -.4, mouthOpen: .4 }, seg(L, b('eleven') - .1, .3));
  pose = botMix(pose, { ...BOTS.explain, armR: [-1.0, -.3], lookX: -.2, lookY: -1 }, seg(L, b('number') - .15, .3));
  pose = botMix(pose, { ...BOTS.explain, armR: [-.7, -.3], lookX: .7, lookY: -1 }, seg(L, b('verbatim') - .15, .3));
  pose = botMix(pose, { ...BOTS.explain, armR: [-.5, -.25], lookX: 1, lookY: -.9, chest: 'wave' }, seg(L, b('loud') - .15, .3));
  pose = botMix(pose, { ...BOTS.explain, armR: [-.42, -.2], lookX: 1, lookY: -.8, chest: 'play' }, seg(L, b('first') - .15, .3));
  pose = botMix(pose, { armR: [.05, -.35], lookX: 1, lookY: clamp((s18_base - s18_tall * s18_change(head) - 640) / 160, -1, 1) * .6, chest: 'wave' }, seg(L, b('motion') - .1, .3));
  pose = botMix(pose, { ...BOTS.surprise, lookX: 1, lookY: -.3 }, seg(L, b('stop'), .12) * (1 - seg(L, b('stop') + .45, .25)));
  pose = botMix(pose, { ...BOTS.stop, eyes: 'worry', lookX: 1 }, seg(L, b('stop') + .45, .25));
  const live = botAlive(t, talking, pose.mouth === 'smile' && pose.eyes !== 'happy' ? {} : pose);
  drawBot(ctx, { ...pose, ...live, x: bx, y: by, s: bs, hop: nods.reduce((a, at) => a + Math.sin(seg(L, at, .3) * Math.PI) * 12, 0) + Math.sin(seg(L, b('stop'), .32) * Math.PI) * 30 });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const tag = (key, beat, x, y, o = {}) => { const k = popIn(L, b(beat) + (o.delay ?? .2)); if (k > 0) f.label(key, { ...at(x, y), size: o.size ?? 44, color: '#ffffff', plate: o.plate ?? INDIGO, scale: k, alpha: vis }); };
  tag('s18_eleven', 'eleven', 410, 172, { size: 46, delay: .1 });
  tag('s18_number', 'number', 692, 392);
  tag('s18_sub', 'verbatim', 950, 392);
  tag('s18_loud', 'loud', 1210, 392);
  tag('s18_first', 'first', 1450, 392);
  tag('s18_motion', 'motion', 968, 506);
  tag('s18_two', 'frozen', (s18_flat[0] + s18_flat[1]) / 2 - 14, s18_base - 84, { plate: ORANGE_D, delay: .3 });
  tag('s18_four', 'gap', (s18_peaks[0] + s18_peaks[1]) / 2, s18_base - s18_tall + 36, { plate: TEAL, delay: .3 });
  tag('s18_stop', 'stop', 1700, 392, { plate: ORANGE_D, delay: .1 });
}
