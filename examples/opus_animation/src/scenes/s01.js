// ---------- S01 不会画画，也能做动画 ----------
// 一张“图片”卡：白底圆角，里面一座山和一个太阳。
function s01_picture(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.roundRect(-78, -58, 156, 116, 14); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-66, -46, 132, 92, 8); ctx.clip();
  ctx.fillStyle = '#d9e4ff'; ctx.fillRect(-66, -46, 132, 92);
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(34, -18, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = LILAC; ctx.beginPath(); ctx.moveTo(-66, 46); ctx.lineTo(-24, -12); ctx.lineTo(8, 24); ctx.lineTo(30, 2); ctx.lineTo(66, 46); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.restore();
}
// 一把剪刀，刀尖朝右，open 是张开的程度。
function s01_scissors(ctx, x, y, s, rot, open = .35) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.save(); ctx.rotate(side * open);
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(96, 0); ctx.stroke();
    ctx.strokeStyle = GREY; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(96, 0); ctx.stroke();
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 17; ctx.beginPath(); ctx.arc(-40, side * 4, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-40, side * 4, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function scene01(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const scribble = ease.inOut(seg(L, b('draw') + .1, .95)), cut = seg(L, b('cut'), .5), yes = seg(L, b('yes') - .3, .6);
  const film = ease.inOut(seg(L, b('film'), .45)), code = seg(L, b('code'), .35);
  const flow = ease.out(seg(L, b('flow'), .45)), open = ease.inOut(seg(L, b('open'), 1.2));
  const [sx, sy] = shake(L, b('yes') + .24, .3, 10);
  const cam = makeCam(lerp(960, 870, open), lerp(545, 445, open), 1 + .04 * seg(L, 0, D) + .16 * open, sx, sy);
  studio(ctx, t);
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 画架与画纸：先是一条歪线和一个歪歪扭扭的小人，“这支视频”时换成正在播放的小画面。
  const [px, py] = easel(ctx, 760, 850);
  const pts = [[-120, 40], [-92, -30], [-64, 52], [-30, -44], [4, 36], [36, -52], [70, 30], [104, -26]].map(([x, y]) => [px + x, py + 20 + y]);
  const tipAt = k => { const n = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(n)); return [lerp(pts[i][0], pts[i + 1][0], n - i), lerp(pts[i][1], pts[i + 1][1], n - i)]; };
  if (film < 1) {
    ctx.save(); ctx.globalAlpha = 1 - film; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = GREY; ctx.lineWidth = 9; trace(ctx, pts, scribble);
    const fig = ease.out(seg(L, b('draw') + .7, .6));
    if (fig > 0) {
      ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(px - 96, py - 86, 26, 19, -.4, 0, Math.PI * 2 * fig); ctx.stroke();
      trace(ctx, [[px - 90, py - 66], [px - 78, py - 8], [px - 112, py + 8]], fig); trace(ctx, [[px - 84, py - 44], [px - 40, py - 62]], fig);
    }
    ctx.restore();
  }
  if (film > 0) {
    ctx.save(); ctx.globalAlpha = film; miniScene(ctx, px - 170, py - 125, 340, 250, t, { r: 8 }); ctx.restore();
    burst(ctx, px, py, seg(L, b('film') + .1, .5), 12, 190, 300, ORANGE);
  }

  // 创作者：先拿笔在画，胶片掉下来时回头，机器人进来后看着它；三样东西被划掉时跟着点头。
  const drawing = 1 - seg(L, b('cut') - .15, .3), sh = [400 + 46, 856 - 226];
  const tip = tipAt(scribble), to = [sh[0] + (tip[0] - sh[0]) * .42, sh[1] + (tip[1] - sh[1]) * .42];
  const rest = [1.1, -.25], ik = reach(sh[0], sh[1], to[0], to[1], 50, 46);
  const nod = ['noimg', 'novid', 'noedit'].reduce((sum, key) => sum + Math.sin(seg(L, b(key) + .45, .4) * Math.PI), 0);
  const who = { x: 400, y: 856, top: '#5b6ee1', hair: '#33262b', armR: [lerp(rest[0], ik[0], drawing), lerp(rest[1], ik[1], drawing)],
    lookX: yes > .5 || cut > .2 ? 1 : .6, lookY: nod * .8, blink: blinkAt(t, 4.1, .3),
    mood: code > .5 ? 'happy' : yes > .5 ? 'o' : cut > .3 || scribble > .6 ? 'worry' : 'smile',
    sweat: clamp(seg(L, b('draw') + .8, .4) - yes), hop: Math.sin(seg(L, b('yes') + .24, .3) * Math.PI) * 16 + nod * 7 + seg(L, b('open'), .3) * Math.abs(sway(t, .9)) * 14 };
  drawPerson(ctx, who);
  const hand = personHandR(who), end = drawing > .05 ? [lerp(hand[0] + 60, tip[0], drawing), lerp(hand[1] + 70, tip[1], drawing)] : [hand[0] + 60, hand[1] + 70];
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(end[0], end[1]); ctx.stroke();
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(end[0], end[1]); ctx.stroke();

  // “也不会剪辑”：一团缠住的胶片掉下来，躺在地上轻轻晃；“动手剪辑”时和剪刀一起被划掉、收走。
  const edit = seg(L, b('noedit'), .4), editOut = ease.in(seg(L, b('noedit') + .75, .5));
  if (cut > 0 && editOut < 1) {
    const land = Math.sin(seg(L, b('cut') + .5, .35) * Math.PI) * 26;
    ctx.save(); ctx.globalAlpha = (1 - editOut) * clamp(cut * 4);
    tangle(ctx, 1080 + editOut * 260, lerp(150, 812, ease.in(cut)) - land + editOut * 80, 1.0, sway(t, 3.4) * .06 + cut * 1.5 + editOut * 1.4);
    if (edit > 0) {
      s01_scissors(ctx, 1210 + editOut * 260, 745 + editOut * 80, ease.back(edit), -2.5 + editOut, .25 + .2 * Math.abs(sway(t, .5)));
      mark(ctx, 'cross', 1115 + editOut * 260, 760 + editOut * 80, 2.3, seg(L, b('noedit') + .35, .3), ORANGE_D);
    }
    ctx.restore();
    burst(ctx, 1080, 820, seg(L, b('cut') + .5, .4), 10, 90, 190, LILAC);
  }

  // “图片生成”“视频生成”：图片卡和胶片盒先后飘过来，被划掉弹走。
  [['noimg', (x, y, rot) => s01_picture(ctx, x, y, 1.05, rot)], ['novid', (x, y, rot) => filmCan(ctx, x, y, 66, rot)]].forEach(([key, paint], i) => {
    const come = ease.out(seg(L, b(key) - .35, .45)), away = ease.in(seg(L, b(key) + .75, .45));
    if (come <= 0 || away >= 1) return;
    const x = lerp(1640, 1120, come) + away * 380, y = lerp(200, 470, come) - away * 300 + sway(t, 1.8, i * .3) * 8 * (1 - away);
    ctx.save(); ctx.globalAlpha = (1 - away) * clamp(come * 3);
    paint(x, y, (1 - come) * 1.2 + away * 2.4 + sway(t, 2.4, i * .2) * .05);
    mark(ctx, 'cross', x, y, 2.3, seg(L, b(key) + .3, .3), ORANGE_D);
    ctx.restore();
    burst(ctx, 1120, 470, seg(L, b(key) + .3, .4), 9, 80, 160, ORANGE);
  });

  // “画面代码”：机器人手里弹出一块代码牌，升到上方；“流程”时它展开成四节链条；“拆开”时一节节弹开。
  const kinds = ['lines', 'braces', 'wave', 'check'], gap = lerp(180, 250, open);
  if (code > 0 && flow < 1) {
    const rise = ease.out(seg(L, b('code') + .1, .7));
    codePlate(ctx, lerp(1330, 1100, rise), lerp(640, 250, rise) + sway(t, 2.4) * 8, 300, 132, seg(L, b('code') + .3, 1.2), ease.back(clamp(code)) * (1 - flow * .6), (1 - rise) * .5);
  }
  if (flow > 0) for (let i = 3; i >= 0; i--) {
    const k = ease.out(seg(L, b('flow') + i * .07, .35));
    if (k <= 0) continue;
    const tx = lerp(1100, 800 + i * gap, k), ty = 250 + sway(t, 2.6, i * .17) * 7, bump = Math.sin(seg(L, b('open') + i * .16, .4) * Math.PI) * .22;
    if (i < 3) {
      const x1 = lerp(1100, 800 + (i + 1) * gap, k), mid = (tx + x1) / 2, split = open * 34;
      ctx.lineCap = 'round'; ctx.globalAlpha = k;
      for (const [color, w] of [[PAL.line, 14], [ORANGE, 6]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(tx + 50, 250); ctx.lineTo(Math.max(tx + 50, mid - split), 250); ctx.moveTo(Math.min(x1 - 50, mid + split), 250); ctx.lineTo(x1 - 50, 250); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    node(ctx, tx, ty, 46, kinds[i], t, k * (1 + bump));
  }

  // 机器人：“能。”时从右边跳进来；指向画架；拍拍胸口；抬手挡开三样东西；最后朝链条欢呼。
  const fend = ['noimg', 'novid', 'noedit'].reduce((m, key) => Math.max(m, seg(L, b(key) - .3, .25) * (1 - seg(L, b(key) + .9, .3))), 0);
  const pat = code * (1 - seg(L, b('noimg') - .5, .3));
  const pose = botMix(botMix(botMix(botMix(BOTS.cheer, BOTS.explain, seg(L, b('film') - .15, .3)), BOTS.pat, pat), BOTS.stop, fend), BOTS.cheer, seg(L, b('flow'), .3));
  if (yes > 0) drawBot(ctx, { ...pose, ...botAlive(t, talking && yes > .8), x: lerp(1740, 1440, ease.out(yes)), y: 856, s: .9 * ease.out(clamp(yes * 2.5)), dir: -1,
    hop: Math.sin(Math.PI * yes) * 130 + pat * Math.abs(sway(t, .5)) * 8 + seg(L, b('open'), .3) * Math.abs(sway(t, .9)) * 30,
    squash: Math.sin(seg(L, b('yes') + .24, .28) * Math.PI) * .12 + sway(t, 3.1) * .012,
    ant: (1 - yes) * .9 + sway(t, 1.9) * .4, armR: pat > .5 ? [1.9, 1.7 + sway(t, .5) * .18] : pose.armR, lookY: flow > .5 ? -.8 : pose.lookY });
  burst(ctx, 1440, 856, seg(L, b('yes') + .24, .4), 10, 90, 200, LILAC);
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const q1 = at(340, 420), asked = 1 - seg(L, b('yes') - .2, .3);
  f.label('s01_q1', { x: q1.x, y: q1.y + sway(t, 2.2) * 6, size: 56, color: ORANGE_D, halo: '#ffffff', alpha: vis * asked });
  const q2 = popIn(L, b('cut') + .55);
  if (q2 > 0) f.label('s01_q2', { ...at(1170, 640), size: 56, color: ORANGE_D, halo: '#ffffff', scale: q2 * (1 + .04 * sway(t, 1.3)), alpha: vis * asked });
  const y1 = popIn(L, b('yes') + .2);
  if (y1 > 0) f.label('s01_yes', { ...at(1440, 440), size: 68, color: '#ffffff', plate: INDIGO, scale: y1, alpha: vis * (1 - seg(L, b('code') - .1, .3)) });
  const o1 = popIn(L, b('code') + 1.0);
  if (o1 > 0) f.label('s01_opus', { ...at(1440, 452), size: 54, color: '#ffffff', plate: ORANGE_D, scale: o1, alpha: vis });
  [['s01_noimg', 'noimg'], ['s01_novid', 'novid'], ['s01_noedit', 'noedit']].forEach(([key, beat]) => {
    const k = popIn(L, b(beat) + .3);
    if (k > 0) f.label(key, { ...at(1150, 640), size: 46, color: '#ffffff', plate: ORANGE_D, scale: k, alpha: vis * (1 - seg(L, b(beat) + 1.0, .25)) });
  });
  const w1 = popIn(L, b('flow') + .35);
  if (w1 > 0) f.label('s01_flow', { ...at(800 + 1.5 * gap, 130), size: 54, color: INDIGO, halo: '#ffffff', scale: w1, alpha: vis });
}
