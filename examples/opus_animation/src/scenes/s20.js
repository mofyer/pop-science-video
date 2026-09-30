// ---------- S20 踩过的三个坑：样式表的浮动不动、画进画布的字逃过核对、正面摆腿像倒退 ----------
const s20_pits = [380, 860, 1340];
// 坑后面立着的告示板：没亮时是一块灰板加一个橙色警示三角，亮起后变成白板，里面演这个坑。
function s20_board(ctx, x, lit) {
  ctx.lineCap = 'round';
  for (const [color, w] of [[PAL.line, 22], [GREY, 13]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, 825); ctx.stroke(); }
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(x - 193, 216, 400, 265, 22); ctx.fill();
  ctx.fillStyle = lit > .5 ? PAL.white : '#e6e5f0'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(x - 200, 205, 400, 265, 22); ctx.fill(); ctx.stroke();
  if (lit < 1) {
    ctx.save(); ctx.translate(x, 345); ctx.scale(1 - lit, 1 - lit); ctx.lineJoin = 'round';
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(66, 52); ctx.lineTo(-66, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 14); ctx.moveTo(0, 34); ctx.lineTo(0, 34.5); ctx.stroke();
    ctx.restore();
  }
}
// 一块小屏：里面一个方块上下浮动，u 是它的位置 -1..1；grey 从 0 到 1 时僵住发灰。
function s20_screen(ctx, x, y, u, grey, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  ctx.fillStyle = grey > .5 ? '#e3e3ea' : '#e9eeff'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-82, -60, 164, 120, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(0, 44, 30 - u * 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = grey > .5 ? '#a9a9b6' : ORANGE; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.roundRect(-24, -20 + u * 18, 48, 48, 12); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 落进坑里溅起的土：只往上飞。
function s20_dust(ctx, x, y, k) {
  if (k <= 0 || k >= 1) return;
  ctx.fillStyle = 'rgba(141,134,194,' + .8 * (1 - k) + ')';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (.12 + .76 * i / 5), r = 70 + 70 * ease.out(k);
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * .7 + 50 * k * k, 9 * (1 - k * .5), 0, Math.PI * 2); ctx.fill();
  }
}

function scene20(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  // 机器人一跳一跳往前：[落地时刻, 起点, 终点, 跳多高, 用时]。第三、五、七跳落进坑里，最后一跳去接说明书。
  const hops = [[b('pit') - .8, 130, 205, 40, .34], [b('pit') - .4, 205, 290, 46, .34], [b('pit'), 290, 380, 54, .36], [b('text') - .4, 380, 620, 70, .36],
    [b('text'), 620, 860, 70, .36], [b('walk') - .36, 860, 1100, 70, .34], [b('walk'), 1100, 1340, 70, .34], [b('note') - 1.0, 1340, 1560, 76, .4]];
  const lands = [b('pit'), b('text'), b('walk')], leaves = [b('text') - .76, b('walk') - .7, b('note') - 1.4];
  let bx = 130, hop = 0, squash = 0, sink = 0, wobble = 0, gasp = 0, sx = 0, sy = 0;
  for (const [land, x0, x1, h, dur] of hops) { const k = seg(L, land - dur, dur); bx += (x1 - x0) * k; hop += Math.sin(k * Math.PI) * h; squash += Math.sin(seg(L, land, .2) * Math.PI) * .09; }
  lands.forEach((land, i) => {
    const w = seg(L, land, .7), sh = shake(L, land, .3, 7);
    sink += seg(L, land - .06, .06) * (1 - seg(L, leaves[i], .08)); wobble += Math.sin(w * 20) * (1 - w) * .2;
    gasp += seg(L, land, .1) * (1 - seg(L, land + .55, .3)); sx += sh[0]; sy += sh[1];
  });
  const lit = [ease.out(seg(L, b('css'), .4)), ease.out(seg(L, b('text') - .3, .4)), ease.out(seg(L, b('walk') - .1, .4))];
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D), sx, sy);
  studio(ctx, t, '#eef0ff', '#fff6ec');
  ctx.save(); cam.apply(ctx);
  floor(ctx);
  for (const x of s20_pits) {
    ctx.fillStyle = '#b3acdc'; ctx.beginPath(); ctx.ellipse(x, 867, 104, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d86c2'; ctx.beginPath(); ctx.ellipse(x, 871, 86, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 路的尽头：说明书合着立在台子上。
  ctx.fillStyle = '#d9d5ee'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(1658, 716, 84, 136, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(1620, 700, 160, 22, 9); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(0, 25);
  s20_pits.forEach((x, i) => s20_board(ctx, x, lit[i]));

  // 第一个坑：左边预览里方块在浮动；右边成片里同一个方块说到“根本不动”时僵住、变灰。
  if (lit[0] > 0) {
    const riseL = ease.out(seg(L, b('css') + .05, .4)), riseR = ease.out(seg(L, b('css') + .2, .4)), frozen = seg(L, b('still'), .25);
    s20_screen(ctx, 290, 366 + (1 - riseL) * 46, Math.sin(t * 3.2), 0, riseL);
    s20_screen(ctx, 470, 366 + (1 - riseR) * 46, Math.sin(Math.min(t, s.beats.still) * 3.2), frozen, riseR);
    mark(ctx, 'cross', 540, 318, .62, seg(L, b('still') + .15, .3), ORANGE_D);
  }

  // 第二个坑：画布下面一排是标签；数字离开自己的位置溜进画布，放大镜只沿着标签那一排扫，照不到它。
  const sneak = seg(L, b('text') + .05, .45), scan = lerp(700, 1004, ease.inOut(seg(L, b('escape'), .75)));
  if (lit[1] > 0) {
    ctx.save(); ctx.globalAlpha = lit[1];
    preview(ctx, 726, 246, 268, 118, t);
    for (let i = 0; i < 3; i++) {
      const x = 770 + i * 90, empty = i === 2 ? seg(L, b('text') + .05, .2) : 0;
      if (empty > .5) { ctx.setLineDash([9, 8]); ctx.strokeStyle = GREY; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 40, 408, 80, 36, 18); ctx.stroke(); ctx.setLineDash([]); continue; }
      ctx.fillStyle = i === 2 ? PAL.white : LILAC; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 40, 408, 80, 36, 18); ctx.fill(); ctx.stroke();
      if (i < 2) { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 20, 426); ctx.lineTo(x + 14, 426); ctx.stroke(); mark(ctx, 'check', x + 26, 412, .42, clamp((scan - x - 10) / 40)); }
    }
    ctx.restore();
  }
  const lens = seg(L, b('escape') - .15, .2);
  if (lens > 0) { ctx.save(); ctx.globalAlpha = lens; magnifier(ctx, scan, 426, 30, .9); ctx.restore(); }

  // 第三个坑：正面的小人原地摆腿，头顶的箭头不知道指哪边；“倒退”时箭头乱转，小人转成侧面后箭头定住朝右。
  if (lit[2] > 0) {
    const turn = ease.inOut(seg(L, b('back') + .7, .5)), a = L - b('back'), walked = Math.max(0, L - b('back') - 1.0);
    ctx.strokeStyle = GREY; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1190, 446); ctx.lineTo(1490, 446); ctx.stroke();
    ctx.lineWidth = 5; for (let i = 0; i < 5; i++) { const x = 1490 - ((i * 60 + walked * 101) % 300); ctx.beginPath(); ctx.moveTo(x, 446); ctx.lineTo(x - 10, 458); ctx.stroke(); }
    ctx.save(); ctx.globalAlpha = clamp(lit[2] * 2 - .6);
    drawPerson(ctx, { x: 1340, y: 442, s: .46, walk: (t * 1.25) % 1, turn, lean: .07 * turn, lookX: .6 * turn, top: '#2fa6a0', hair: '#33262b', mood: turn > .5 ? 'smile' : 'worry', blink: blinkAt(t, 4.1, .3) });
    const wild = -Math.PI / 2 - Math.PI / 2 * (.35 + .5 * Math.sin(a * 11) + .15 * Math.sin(a * 29));
    const angle = lerp(lerp(-Math.PI / 2 + .35 * Math.sin(t * 2.2), wild, seg(L, b('back'), .15)), 0, turn), show = popIn(L, b('walk') + .3);
    if (show > 0) {
      ctx.translate(1340, 246); ctx.rotate(angle); ctx.scale(show, show); ctx.lineJoin = 'round';
      for (const [color, w] of [[PAL.white, 21], [turn > .5 ? TEAL : ORANGE_D, 12]]) {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.moveTo(12, -18); ctx.lineTo(30, 0); ctx.lineTo(12, 18); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();

  // 机器人：开场得意地往前跳；每落进一个坑就一颠、吓一跳，然后抬头看告示板；最后跳去接说明书。
  let pose = botMix({ eyes: 'happy', armL: [2.5, .4], armR: [.64, -.4] }, BOTS.idle, seg(L, b('pit') - .05, .1));
  pose = botMix(pose, BOTS.surprise, clamp(gasp));
  pose = botMix(pose, BOTS.worry, seg(L, b('still'), .3) * (1 - seg(L, leaves[0] - .1, .2)));
  pose = botMix(pose, { ...BOTS.think, lookX: .2 }, seg(L, b('escape'), .25) * (1 - seg(L, leaves[1] - .1, .2)));
  pose = botMix(pose, BOTS.shrug, seg(L, b('back'), .25) * (1 - seg(L, b('back') + .9, .3)));
  pose = botMix(pose, BOTS.cheer, seg(L, b('note') - .95, .3));
  drawBot(ctx, { ...pose, ...botAlive(t, talking), x: bx, y: 856 + 20 * clamp(sink), s: .72, hop, lean: wobble,
    squash: sway(t, 3.1) * .012 + squash, lookX: seg(L, b('note') - .95, .3), lookY: lerp(pose.lookY, -1, Math.max(clamp(sink), seg(L, b('note') - .95, .3))) });
  lands.forEach((land, i) => s20_dust(ctx, s20_pits[i], 866, seg(L, land, .45)));

  // “记一条”：说明书从台子上升起来翻开，三个坑各飞来一点，三行新规则写进右页。
  const fly = ease.inOut(seg(L, b('note') - 1.0, .6)), open = seg(L, b('note') - .5, .45), bkx = 1700, bky = lerp(639, 425, fly) + sway(t, 2.6) * 5 * fly;
  ctx.save(); ctx.translate(bkx, bky); ctx.rotate(Math.sin(fly * Math.PI) * -.18);
  book(ctx, 0, 0, lerp(.62, .8, fly), open, .7);
  if (open >= 1) {
    ctx.scale(.8, .8); ctx.lineCap = 'round'; ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 9;
    for (let i = 0; i < 3; i++) { const k = seg(L, b('note') + i * .16, .2); if (k > 0) { ctx.beginPath(); ctx.moveTo(27, -3 + i * 30); ctx.lineTo(lerp(27, 150 * (.82 - (i % 2) * .16), k), -4 + i * 30); ctx.stroke(); } }
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const k = seg(L, b('note') - .3 + i * .16, .3); if (k <= 0 || k >= 1) continue;
    const x = lerp(s20_pits[i], bkx + 60, ease.inOut(k)), y = lerp(230, 422 + i * 24, k) - Math.sin(k * Math.PI) * 110;
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('css') + .35), l2 = popIn(L, b('css') + .5);
  if (l1 > 0) f.label('s20_preview', { ...at(290, 287), size: 44, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  if (l2 > 0) f.label('s20_film', { ...at(470, 287), size: 44, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis });
  const l3 = popIn(L, b('still') + .25);
  if (l3 > 0) f.label('s20_still', { ...at(380, 185), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l3, alpha: vis });
  // 数字：先待在标签那一排自己的位置上，“画进画布”时一蹦溜进画布，歪着贴在画面里；放大镜扫过之后得意地蹦一下。
  const l4 = popIn(L, b('text') - .2), sk = ease.inOut(sneak);
  if (l4 > 0) f.label('s20_num', { ...at(lerp(950, 812, sk), lerp(451, 316, sk) - Math.sin(sneak * Math.PI) * 50 - Math.sin(seg(L, b('escape') + .85, .3) * Math.PI) * 18),
    size: 44, color: '#ffffff', plate: INDIGO, scale: l4 * lerp(.72, .86, sk), rotate: -.1 * sk, alpha: vis });
  const l5 = popIn(L, b('escape') + .8);
  if (l5 > 0) f.label('s20_escape', { ...at(860, 185), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l5, alpha: vis });
  const l6 = popIn(L, b('walk') + .35), a6 = vis * (1 - seg(L, b('back') + 1.3, .3));
  if (l6 > 0 && a6 > 0) f.label('s20_where', { ...at(1340, 185), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l6, alpha: a6 });
  const l7 = popIn(L, b('note') - .35);
  if (l7 > 0) f.label('s20_note', { ...at(1700, 290), size: 44, color: '#ffffff', plate: INDIGO, scale: l7, alpha: vis });
}
