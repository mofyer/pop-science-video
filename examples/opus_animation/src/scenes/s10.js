// ---------- S10 事实台账：每个说法连到读过的来源，数字先登记，读不到原文的不进旁白 ----------
// 账本三行的中线。左页是说法，右页是来源。
const s10_Y = [360, 520, 680];

// 摊开的账本：靛蓝封皮、两页米白纸，立在地上。
function s10_book(ctx) {
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.ellipse(850, 852, 590, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.roundRect(284, 196, 1132, 652, 28); ctx.fill(); ctx.stroke();
  for (const x of [304, 856]) {
    ctx.fillStyle = PAPER; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x, 214, 540, 616, 14); ctx.fill();
    ctx.fillStyle = 'rgba(201,196,238,.5)'; ctx.beginPath(); ctx.roundRect(x, 214, 540, 64, [14, 14, 0, 0]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, 214, 540, 616, 14); ctx.stroke();
  }
  const g = ctx.createLinearGradient(816, 0, 884, 0);
  g.addColorStop(0, 'rgba(44,47,72,0)'); g.addColorStop(.5, 'rgba(44,47,72,.2)'); g.addColorStop(1, 'rgba(44,47,72,0)');
  ctx.fillStyle = g; ctx.fillRect(816, 217, 68, 610);
  ctx.lineWidth = 9; ctx.strokeStyle = INDIGO; ctx.beginPath(); ctx.moveTo(340, 246); ctx.lineTo(450, 246); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.beginPath(); ctx.moveTo(478, 246); ctx.lineTo(540, 246); ctx.stroke();
}
// 一条说法（左上角为原点）：圆角条里一个圆点、两行字；k 是写出的进度，hot 过半时整条换成黄色，表示正讲到这一行。num 为真时后半段是一个等数字的虚线格。
function s10_claim(ctx, k, hot, num) {
  ctx.fillStyle = hot > .5 ? '#ffe08a' : PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(0, -56, 490, 112, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.arc(34, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GREY; ctx.lineWidth = 9; ctx.lineCap = 'round';
  const line = (x0, y, len, p) => { if (p > 0) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len * p, y); ctx.stroke(); } };
  if (num) {
    line(62, 0, 150, clamp(k * 2));
    ctx.setLineDash([10, 9]); ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 4; ctx.globalAlpha *= clamp(k * 2 - 1);
    ctx.beginPath(); ctx.roundRect(240, -44, 140, 88, 14); ctx.stroke(); ctx.setLineDash([]);
  } else { line(62, -17, 300, clamp(k * 2)); line(62, 17, 210, clamp(k * 2 - 1)); }
}
// 来源文档（中心为原点）：合着时大半被封皮盖住，open 到 1 时翻开露出三行字，scan 是读过的进度；locked 为真时是灰的，上面一把锁。
function s10_doc(ctx, open, scan, locked) {
  const o = ease.inOut(clamp(open)), w = lerp(150, 214, o), h = lerp(92, 118, o);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 5, -h / 2 + 8, w, h, 12); ctx.fill();
  ctx.fillStyle = locked ? '#e3e3ea' : PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  if (o > 0) for (let i = 0; i < 3; i++) {
    const p = clamp(scan * 3 - i), y = -14 + i * 24, len = [164, 132, 150][i];
    if (p > 0 && p < 1) { ctx.fillStyle = 'rgba(143,240,221,.55)'; ctx.beginPath(); ctx.roundRect(-88, y - 11, 176, 22, 8); ctx.fill(); }
    ctx.globalAlpha = o; ctx.lineWidth = 8; ctx.strokeStyle = LILAC; ctx.beginPath(); ctx.moveTo(-82, y); ctx.lineTo(-82 + len, y); ctx.stroke();
    if (p > 0) { ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.moveTo(-82, y); ctx.lineTo(-82 + len * p, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const flap = lerp(h * .64, 24, o);
  ctx.fillStyle = locked ? GREY : TEAL; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, flap, [12, 12, 0, 0]); ctx.fill();
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
  if (o < 1 && !locked) { ctx.fillStyle = PAPER; ctx.lineWidth = 4; ctx.globalAlpha = 1 - o; ctx.beginPath(); ctx.arc(0, -h / 2 + flap, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
  if (locked) icon(ctx, 'lock', 0, 2, 1.2);
}

function scene10(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const ask = popIn(L, b('right'), .35), link = ease.inOut(seg(L, b('source'), .35)), doc = popIn(L, b('source') + .25, .35);
  const open = seg(L, b('read'), .4), scan = seg(L, b('read') + .35, .85), ok = seg(L, b('read') + 1.2, .35);
  const drop = ease.in(seg(L, b('number'), .38)), press = seg(L, b('number') + .5, .22), lift = seg(L, b('number') + .8, .3), sealed = seg(L, b('number') + .72, .25);
  const link3 = ease.inOut(seg(L, b('locked'), .35)), doc3 = popIn(L, b('locked') + .2, .35), rattle = seg(L, b('locked') + .55, .8);
  const strike = ease.inOut(seg(L, b('out'), .2)), eject = ease.in(seg(L, b('out') + .22, .4));
  const hot = [seg(L, b('right') - .1, .2) * (1 - seg(L, b('read') + 1.2, .2)), seg(L, b('number') - .1, .2) * (1 - seg(L, b('locked') - .1, .2)), seg(L, b('locked') - .1, .2)];
  // 读来源时镜头推近一点，读完拉回；推近时镜头中心略往下，脚不会被推进字幕区。
  const near = ease.inOut(seg(L, b('read'), .5)) * (1 - ease.inOut(seg(L, b('read') + 1.45, .5)));
  const cam = makeCam(lerp(960, 1010, near), lerp(545, 558, near), (1 + .04 * seg(L, 0, D)) * (1 + .08 * near));
  studio(ctx, t, '#e9f0ff', '#fff9f0');
  ctx.save(); cam.apply(ctx);
  floor(ctx);
  s10_book(ctx);

  // 右页：讲到哪一行，那一行的底色亮起来。每条说法都该有一个来源，没连上之前是虚线空位。
  [[b('source'), '#bfe8e2'], [b('number') + .72, '#d5d1f3'], [b('locked') + .2, '#d9dbe8']].forEach(([at0, color], i) => {
    if (L >= at0) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(880, s10_Y[i] - 56, 490, 112, 18); ctx.fill(); }
  });
  ctx.setLineDash([12, 10]); ctx.strokeStyle = LILAC; ctx.lineWidth = 5;
  [[0, doc], [2, doc3]].forEach(([i, filled]) => { ctx.globalAlpha = 1 - clamp(filled); ctx.beginPath(); ctx.roundRect(935, s10_Y[i] - 46, 150, 92, 12); ctx.stroke(); });
  ctx.globalAlpha = 1; ctx.setLineDash([]);

  // 左页三条说法；第三条读不到原文，被划掉、弹出账本。
  [0, 1, 2].forEach(i => {
    const e = i === 2 ? eject : 0; if (e >= 1) return;
    ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(330 - 190 * e, s10_Y[i] + 50 * e); ctx.rotate(-.22 * e);
    s10_claim(ctx, [1, seg(L, .1, .6), seg(L, .45, .6)][i], hot[i], i === 1);
    ctx.restore();
    if (i === 2 && strike > 0) {
      ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(330 - 190 * e, s10_Y[i] + 50 * e); ctx.rotate(-.22 * e); ctx.lineCap = 'round';
      ctx.strokeStyle = PAL.white; ctx.lineWidth = 18; trace(ctx, [[22, 0], [468, 0]], strike); ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 10; trace(ctx, [[22, 0], [468, 0]], strike);
      ctx.restore();
    }
  });

  // 账本左边的小箭头指着正在讲的那一行。
  const point = popIn(L, b('right') - .15, .3), py = lerp(lerp(s10_Y[0], s10_Y[1], ease.inOut(seg(L, b('number') - .25, .3))), s10_Y[2], ease.inOut(seg(L, b('locked') - .25, .3)));
  if (point > .02) {
    const px = 244 + 8 * sway(t, 1);
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(px - 20 * point, py - 22 * point); ctx.lineTo(px + 20 * point, py); ctx.lineTo(px - 20 * point, py + 22 * point); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // 说法连到来源的线。
  const wire = (y, k, color, dash) => {
    if (k <= 0) return;
    ctx.lineCap = 'round'; ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = 8; trace(ctx, [[826, y], [930, y]], k); ctx.setLineDash([]);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(826, y, 10, 0, Math.PI * 2); ctx.fill();
  };
  wire(s10_Y[0], link, INDIGO, []); wire(s10_Y[2], link3 * (1 - eject), ORANGE_D, [3, 17]);

  // 机器人读来源时的视线。
  if (scan > 0 && scan < 1) {
    const row = Math.min(2, Math.floor(scan * 3)), gx = 1010 - 82 + 164 * (scan * 3 - row), gy = s10_Y[0] - 14 + row * 24;
    ctx.fillStyle = 'rgba(143,240,221,.38)'; ctx.beginPath(); ctx.moveTo(1548, 618); ctx.lineTo(gx, gy - 13); ctx.lineTo(gx, gy + 13); ctx.closePath(); ctx.fill();
  }
  if (doc > .02) { ctx.save(); ctx.translate(1010, s10_Y[0]); ctx.scale(doc, doc); s10_doc(ctx, open, scan, false); ctx.restore(); }
  if (doc3 > .02) {
    const r = rattle > 0 && rattle < 1 ? Math.sin(rattle * Math.PI * 6) * 12 * (1 - rattle) : 0;
    ctx.save(); ctx.translate(1010 + r, s10_Y[2]); ctx.rotate(r * .008); ctx.scale(doc3, doc3); s10_doc(ctx, 0, 0, true); ctx.restore();
  }

  // 第一条：先是问号，读过原文后换成对勾。
  if (ask > .02 && ok < 1) mark(ctx, 'q', 774, s10_Y[0], 1.15 * ask * (1 - ok), 1, ORANGE_D);
  mark(ctx, 'check', 774, s10_Y[0], 1.15, ok, TEAL);

  // 第二条：数字牌落进格子，盖章。
  if (sealed > 0) {
    ctx.save(); ctx.translate(774, s10_Y[1]); ctx.scale(1.5 - .5 * ease.out(sealed), 1.5 - .5 * ease.out(sealed)); ctx.globalAlpha = sealed;
    ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    mark(ctx, 'check', 774, s10_Y[1], .85, sealed, TEAL);
  }
  burst(ctx, 774, s10_Y[1], seg(L, b('number') + .72, .35), 8, 44, 96, TEAL);
  const stampA = seg(L, b('number') + .4, .12) * (1 - lift);
  if (stampA > 0) { ctx.save(); ctx.globalAlpha = stampA; icon(ctx, 'stamp', lerp(862, 774, ease.in(press)) + lift * 70, lerp(426, 488, ease.in(press)) - lift * 50, 1.7, t, TEAL); ctx.restore(); }

  // 机器人在右边，面朝账本：琢磨、指来源、逐行读、盖章、够不到锁着的文档、摆手。
  const live = botAlive(t, talking);
  const pose = [
    [{ ...BOTS.think, lookX: .8, lookY: -.3 }, seg(L, b('right') - .1, .3) * (1 - seg(L, b('source') - .25, .3))],
    [{ ...BOTS.explain, lookY: -.4 }, seg(L, b('source') - .1, .3) * (1 - seg(L, b('read') - .15, .3))],
    [{ armR: [.3, -2.2], eyes: 'wide', mouth: 'flat', lookX: .7 + .3 * sway(t, .55), lookY: -.55, headTilt: .05 }, seg(L, b('read'), .3) * (1 - seg(L, b('read') + 1.25, .3))],
    [{ ...BOTS.cheer, lookX: .8 }, Math.sin(seg(L, b('read') + 1.2, .7) * Math.PI)],
    [{ armR: mix([-1.15, -.4], [.35, -.25], ease.in(press)), lookX: .9, lookY: lerp(-1, .3, drop), mouthOpen: .4 }, seg(L, b('number') - .1, .25) * (1 - seg(L, b('number') + 1.25, .3))],
    [{ ...BOTS.stop, lookX: 1, lookY: .5 }, seg(L, b('locked') + .1, .25) * (1 - seg(L, b('locked') + 1.0, .3))],
    [{ ...BOTS.worry, lookX: .8, lookY: .5 }, seg(L, b('locked') + .95, .3) * (1 - seg(L, b('out') - .1, .25))],
    [{ ...BOTS.stop, armR: [.25, -.15], lookX: 1, lookY: .4 }, seg(L, b('out'), .2)],
  ].reduce((acc, [next, k]) => botMix(acc, next, k), BOTS.idle);
  drawBot(ctx, {
    ...pose, blink: live.blink, ant: live.ant, squash: live.squash, chestT: t, x: 1610, y: 856, s: .88, dir: -1,
    mouthOpen: pose.mouth === 'smile' ? Math.max(pose.mouthOpen, live.mouthOpen ?? 0) : pose.mouthOpen,
    hop: Math.sin(seg(L, b('read') + 1.2, .4) * Math.PI) * 26 + Math.sin(seg(L, b('number') + .6, .3) * Math.PI) * 14 + Math.sin(seg(L, b('out') + .1, .3) * Math.PI) * 16,
    chest: ok > .5 && L < b('locked') ? 'check' : 'lines',
  });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('source') + .3);
  if (l1 > .01) f.label('s10_source', { ...at(1010, 246), size: 44, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  const l2 = popIn(L, b('read') + .5);
  if (l2 > .01) f.label('s10_read', { ...at(1256, s10_Y[0]), size: 46, color: '#ffffff', plate: TEAL, scale: l2, alpha: vis });
  if (L >= b('number')) f.label('s10_n30', { ...at(640, lerp(140, s10_Y[1], drop)), size: 54, color: '#ffffff', plate: ORANGE_D, scale: 1 + .12 * Math.sin(seg(L, b('number') + .38, .25) * Math.PI), alpha: vis * seg(L, b('number'), .08) });
  const l4 = popIn(L, b('number') + .85);
  if (l4 > .01) f.label('s10_reg', { ...at(1130, s10_Y[1]), size: 46, color: '#ffffff', plate: INDIGO, scale: l4, alpha: vis });
  const l5 = popIn(L, b('locked') + .5);
  if (l5 > .01) f.label('s10_locked', { ...at(1256, s10_Y[2]), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l5, alpha: vis });
  const l6 = popIn(L, b('out') + .62);
  if (l6 > .01) f.label('s10_out', { ...at(575, s10_Y[2]), size: 52, color: ORANGE_D, halo: '#ffffff', scale: l6, alpha: vis });
}
