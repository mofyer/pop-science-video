// ---------- S14 铁律：画面只由时间决定，因为渲染是跳着取帧的 ----------
// 滑杆两次停下的刻度、滑杆走完一趟对应迷你场景的多少秒、取景框依次跳到的位置（故意不按顺序）。
const s14_u0 = .7, s14_span = 3, s14_hops = [.22, .88, .4, .08, .62];
const s14_slots = [[1460, 230], [1600, 230], [1740, 230], [1530, 345], [1670, 345]];

// 一只花括号：side 为 -1 是左括号，1 是右括号。
function s14_brace(ctx, x, y, side, s, color) {
  const q = v => side * (v - 20);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(q(10), -20); ctx.quadraticCurveTo(q(20), -20, q(20), -10); ctx.quadraticCurveTo(q(20), 0, q(29), 0);
  ctx.quadraticCurveTo(q(20), 0, q(20), 10); ctx.quadraticCurveTo(q(20), 20, q(10), 20); ctx.stroke(); ctx.restore();
}
// 代码窗口：上下各有一行收起来的别的镜头，中间这一镜的函数按 k 一笔一笔写出来（函数头、左括号、四行函数体、右括号）。
function s14_code(ctx, x, y, w, h, k, t) {
  codeWindow(ctx, x, y, w, h, 0, t);
  const row = i => 86 + i * 38;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  ctx.globalAlpha = .4;
  for (const i of [0, 7]) {
    ctx.strokeStyle = LILAC; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(40, row(i)); ctx.lineTo(176, row(i)); ctx.stroke();
    s14_brace(ctx, 214, row(i), -1, .62, LILAC); s14_brace(ctx, 240, row(i), 1, .62, LILAC);
  }
  ctx.globalAlpha = 1;
  if (k > 0) { ctx.fillStyle = 'rgba(143,240,221,' + .1 * clamp(k * 4) + ')'; ctx.beginPath(); ctx.roundRect(22, row(1) - 22, w - 44, 5 * 38 + 44, 14); ctx.fill(); }
  const steps = [[1, 40, 58, ORANGE], [1, 118, 118, BOTC.glow], [1, 270, 0, BOTC.glow, -1], [2, 78, 206, LILAC], [3, 78, 148, '#ffd34d'], [4, 78, 232, LILAC], [5, 78, 116, BOTC.glow], [6, 52, 0, BOTC.glow, 1]];
  steps.forEach(([r, x0, len, color, side], i) => {
    const p = clamp(k * steps.length - i); if (p <= 0) return;
    if (side) s14_brace(ctx, x0, row(r), side, .9 * ease.out(p), color);
    else { ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x0, row(r)); ctx.lineTo(x0 + len * p, row(r)); ctx.stroke(); }
    if (p < 1 && Math.sin(t * 12) > 0) { ctx.strokeStyle = PAL.white; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + len * p + 18, row(r) - 11); ctx.lineTo(x0 + len * p + 18, row(r) + 11); ctx.stroke(); }
  });
  ctx.restore();
}
// 一张取下来的画面：白卡加彩色边，里面是 tt 那一刻的迷你场景。
function s14_shot(ctx, x, y, w, scale, tt, edge, alpha = 1) {
  const h = w * .62;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 9, w, h, 14); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke(); ctx.fill();
  miniScene(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, tt, { r: 8 });
  ctx.strokeStyle = edge; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke();
  ctx.restore();
}

function scene14(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const g0 = b('same') - b('time'), g1 = b('pic') - b('same'), pg = b('jump') - b('play');
  const typed = seg(L, b('fn'), 1.1), grow = ease.inOut(seg(L, b('fn') + .15, 1));
  const link = ease.inOut(seg(L, b('law'), .35)), lit = seg(L, b('law') + .3, .3);
  // 滑块：被推着走完一趟，回到同一个刻度停下，走开，再回到同一个刻度；最后跟着取景框跳。
  const hopDur = clamp((D - b('jump') - .8) / 5, .07, .28), hopAt = (L - b('jump')) / hopDur;
  const hopI = clamp(Math.floor(hopAt), 0, 4), hopK = ease.inOut(clamp((hopAt - hopI) / .45));
  const tA = b('same') + g1 * .25, tB = b('same') + g1 * .8;
  let u = ease.inOut(seg(L, b('time'), g0 * .85));
  u = lerp(u, s14_u0, ease.inOut(seg(L, b('same'), g1 * .25)));
  u = lerp(u, .15, ease.inOut(seg(L, b('same') + g1 * .33, g1 * .22)));
  u = lerp(u, s14_u0, ease.inOut(seg(L, b('same') + g1 * .58, g1 * .22)));
  if (L >= b('jump')) u = lerp(hopI ? s14_hops[hopI - 1] : s14_u0, s14_hops[hopI], hopK);
  const px = 740, py = 160, pw = 580, ph = 340, sx = 740, sy = 690, sw = 580, kx = sx + sw * u, x0 = sx + sw * s14_u0;
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#e9efff', '#fff8ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  s14_code(ctx, 60, 150, 400, 400, typed, t);

  // 预览画布：一开始是空的，函数写出来的同时小场景从下往上长出来；之后画的永远是滑块所在那一刻。
  preview(ctx, px, py, pw, ph, u * s14_span);
  if (grow < 1) {
    ctx.fillStyle = '#f3f3f9'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph * (1 - grow), [12, 12, 0, 0]); ctx.fill();
    ctx.strokeStyle = LILAC; ctx.lineWidth = 5; ctx.setLineDash([16, 14]); ctx.beginPath(); ctx.moveTo(px, py + ph * (1 - grow)); ctx.lineTo(px + pw, py + ph * (1 - grow)); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const at of [tA, tB]) { const k = seg(L, at, .22); if (k > 0 && k < 1) { ctx.fillStyle = 'rgba(255,255,255,' + .7 * (1 - k) + ')'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill(); } }

  // 铁律：画布和滑杆之间只有这一根线，滑杆说了算。
  if (link > 0) {
    const lx = px + pw / 2, top = py + ph + 16, bottom = lerp(top, sy - 8, link);
    ctx.lineCap = 'round';
    if (lit > 0) { ctx.strokeStyle = 'rgba(75,79,217,' + .2 * lit + ')'; ctx.lineWidth = 56; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom); ctx.stroke(); }
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 32; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom); ctx.stroke();
    ctx.strokeStyle = lit > .5 ? INDIGO : GREY; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom); ctx.stroke();
    if (lit > 0) for (let i = 0; i < 3; i++) {
      const yy = sy - 20 - ((t * 70 + i * 46) % 138);
      ctx.strokeStyle = 'rgba(255,255,255,' + .85 * lit + ')'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(lx - 7, yy + 6); ctx.lineTo(lx, yy - 3); ctx.lineTo(lx + 7, yy + 6); ctx.stroke();
    }
  }

  // 线一接上，画布和滑杆一起亮一圈：它们被这一根线拴在一起了。
  const bind = seg(L, b('law') + .3, .6);
  if (bind > 0 && bind < 1) {
    ctx.strokeStyle = 'rgba(75,79,217,' + .55 * (1 - bind) + ')'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.roundRect(px - 32 - 14 * bind, py - 32 - 14 * bind, pw + 64 + 28 * bind, ph + 64 + 28 * bind, 36); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(sx - 40 - 14 * bind, sy - 42 - 8 * bind, sw + 80 + 28 * bind, 100 + 16 * bind, 44); ctx.stroke();
  }
  slider(ctx, sx, sy, sw, u);
  // 同一个刻度上的记号；滑块停在上面时亮一圈。
  const flag = ease.out(seg(L, b('same'), .25));
  if (flag > 0) {
    ctx.fillStyle = TEAL; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 - 15 * flag, sy - 60); ctx.lineTo(x0 + 15 * flag, sy - 60); ctx.lineTo(x0, sy - 60 + 26 * flag); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (Math.abs(u - s14_u0) < .002 && L < b('jump')) { ctx.strokeStyle = TEAL; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x0, sy, 32 + sway(t, .9) * 2, 0, Math.PI * 2); ctx.stroke(); }
  }

  // “从头播放”：一个从头顺着扫的播放头，没走多远就被划掉。
  const seqGone = 1 - seg(L, b('jump') - .15, .15);
  if (L >= b('play') && seqGone > 0) {
    const crossAt = Math.min(.45, pg * .35), crossK = seg(L, b('play') + crossAt, .22), hx = sx + 250 * seg(L, b('play'), crossAt + .1), hy = sy - 52;
    ctx.save(); ctx.globalAlpha = seqGone * fadeIn(L, b('play'), .12);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = sx + 12 + i * 26 < hx ? (crossK > .5 ? GREY : INDIGO) : LILAC; ctx.beginPath(); ctx.arc(sx + 12 + i * 26, hy, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = crossK > .5 ? GREY : INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx - 12, hy - 22); ctx.lineTo(hx + 24, hy); ctx.lineTo(hx - 12, hy + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    mark(ctx, 'cross', hx + 4, hy, 1.15, crossK, ORANGE_D);
    ctx.restore();
  }
  // “跳着取帧”：取景框套着滑块不按顺序地跳，每落一次闪一下。
  if (L >= b('jump')) {
    const pop = ease.out(seg(L, b('jump'), .12)), half = 38 * (2 - pop), flash = clamp((hopAt - hopI - .45) / .4);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [color, width] of [[PAL.line, 11], [ORANGE, 6]]) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = pop;
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(kx + dx * half, sy + dy * (half - 16)); ctx.lineTo(kx + dx * half, sy + dy * half); ctx.lineTo(kx + dx * (half - 16), sy + dy * half); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    if (hopAt < 5) burst(ctx, kx, sy, flash, 8, 44, 78, ORANGE);
  }

  // 两次停下各取一张画面，“同一幅画”时叠到一起，完全重合。
  const pairGone = 1 - seg(L, b('jump') - .35, .3), merge = ease.inOut(seg(L, b('pic'), .4)), same = seg(L, b('pic') + .4, .3);
  if (pairGone > 0) {
    const shot = (at, slot, edge, alpha) => {
      const k = ease.out(seg(L, at, .35)); if (k <= 0) return;
      s14_shot(ctx, lerp(lerp(px + pw / 2, slot, k), 1605, merge), lerp(py + ph / 2, 270, k), 200, lerp(.5, 1, k), s14_u0 * s14_span, same > .5 ? TEAL : edge, alpha * pairGone);
    };
    shot(tA, 1490, INDIGO, 1);
    shot(tB, 1720, ORANGE, lerp(1, .62, Math.sin(merge * Math.PI)));
    ctx.save(); ctx.globalAlpha = pairGone; mark(ctx, 'check', 1700, 212, 1.15, same); ctx.restore();
  }
  // 取出来的帧飞到右上角排好。
  const machineAt = { x: 1600, y: 850 };
  s14_hops.forEach((v, i) => {
    const land = b('jump') + (i + .45) * hopDur, k = ease.out(seg(L, land, .3)); if (k <= 0) return;
    filmFrame(ctx, lerp(sx + sw * v, s14_slots[i][0], k), lerp(sy, s14_slots[i][1], k) - Math.sin(k * Math.PI) * 60, 130 * lerp(.35, 1, k), (1 - k) * .3, v * s14_span);
  });

  // 那台取帧的机器：S06 里的同一台，缩成小像站在滑杆旁。
  const machine = L > b('hf') ? popIn(L, b('hf'), .45) : 0;
  if (machine > 0) {
    const m = hfMachine(ctx, machineAt.x, machineAt.y, .66 * machine, t, 1);
    s14_hops.forEach((v, i) => sparkle(ctx, m.lamp[0], m.lamp[1], 50, Math.sin(seg(L, b('jump') + (i + .45) * hopDur, .25) * Math.PI)));
  }

  // 机器人：先看代码，再指着那根线，伸手把滑块推出去，眼睛一路跟着滑块。
  const bx = 620, bs = .85, follow = clamp((kx - bx) / 380, -1, 1);
  const wind = ease.inOut(seg(L, b('time') - .35, .3)), shove = ease.out(seg(L, b('time'), .2)), relax = ease.inOut(seg(L, b('time') + .3, .35));
  let pose = botMix({ lookX: -.8, lookY: -.8 }, { armL: [3.75, .45], lookX: -1, lookY: -1, chest: 'braces', halo: .5 }, seg(L, b('fn') - .1, .3));
  pose = botMix(pose, { ...BOTS.stop, lookY: -.4 }, seg(L, b('law') - .1, .3));
  pose = botMix(pose, { armR: reach(84, -150, lerp(108, 152, shove), -195, 46, 44), frontR: true, lookX: 1, lookY: .1, lean: .07 }, wind);
  pose = botMix(pose, { ...BOTS.explain, lookX: follow, lookY: -.3, chest: 'play' }, relax);
  pose = botMix(pose, { ...BOTS.cheer, lookX: 1, lookY: -.6 }, seg(L, b('pic') + .35, .25) * (1 - seg(L, b('hf') - .25, .25)));
  pose = botMix(pose, { ...BOTS.surprise, lookX: 1, lookY: .3 }, seg(L, b('hf'), .2) * (1 - seg(L, b('hf') + .7, .3)));
  pose = botMix(pose, { ...BOTS.stop, headTilt: sway(t, .45) * .07 }, seg(L, b('play'), .2) * (1 - seg(L, b('jump') - .15, .15)));
  pose = botMix(pose, { ...BOTS.lens, eyes: 'happy', lookX: follow }, seg(L, b('jump'), .15));
  const live = botAlive(t, talking, pose.mouth === 'smile' && pose.eyes !== 'happy' ? {} : pose);
  drawBot(ctx, { ...pose, ...live, x: bx, y: 856, s: bs, hop: Math.sin(seg(L, b('pic') + .35, .4) * Math.PI) * 34 + Math.sin(seg(L, b('hf'), .3) * Math.PI) * 18 });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('fn') + .4);
  if (l1 > 0) f.label('s14_fn', { ...at(260, 612), size: 46, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  const l2 = popIn(L, b('time') + .25);
  if (l2 > 0) f.label('s14_time', { ...at(1226, 564), size: 48, color: INDIGO, halo: '#ffffff', scale: l2, alpha: vis });
  const l3 = popIn(L, b('same') + .3);
  if (l3 > 0) f.label('s14_same', { ...at(x0, 778), size: 44, color: '#ffffff', plate: TEAL, scale: l3, alpha: vis * pairGone });
  const l4 = popIn(L, b('pic') + .5);
  if (l4 > 0) f.label('s14_pic', { ...at(1605, 405), size: 46, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis * pairGone });
  if (machine > 0) f.label('s14_hf', { ...at(1600, 596), size: 44, color: '#ffffff', plate: INDIGO, scale: popIn(L, b('hf') + .25), alpha: vis * seg(L, b('hf') + .25, .1) });
  const l6 = popIn(L, b('jump') + .15);
  if (l6 > 0) f.label('s14_jump', { ...at(1600, 470), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l6, alpha: vis });
}
