// ---------- S19 第三道自检：把成片抽帧拼成图，逐镜对照节拍表 ----------
const s19_g = { x: 1062, y: 352, cw: 168, ch: 108, gap: 14 };
function s19_slot(i) {
  return [s19_g.x + (i % 4) * (s19_g.cw + s19_g.gap) + s19_g.cw / 2, s19_g.y + Math.floor(i / 4) * (s19_g.ch + s19_g.gap) + s19_g.ch / 2];
}
// 一张抽出来的帧：白边里是定格的迷你场景；grey 从 0 到 1 时整格发灰。
function s19_still(ctx, x, y, rot, sc, tt, grey) {
  const cw = s19_g.cw, ch = s19_g.ch;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 8); ctx.fill(); ctx.stroke();
  miniScene(ctx, -cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, tt, { r: 5 });
  if (grey > 0) { ctx.globalAlpha *= grey; miniScene(ctx, -cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, tt, { r: 5, frozen: true }); }
  ctx.restore();
}
// 板子上的一张大纸：白底、顶上一条色带。(x, y) 是中心。
function s19_paper(ctx, x, y, w, h, band) {
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 7, y - h / 2 + 11, w, h, 14); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = band; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, 60, [14, 14, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.stroke();
}

function scene19(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const tick = clamp((L - b('sample')) / .08, 0, 12), slide = ease.out(seg(L, b('compare'), .55)), found = seg(L, b('real'), .3);
  const link = r => ease.inOut(seg(L, b('compare') + .6 + r * .4, .4));
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#eaf0ff', '#fff8ef');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 三枚徽章（图标与 S17、S18 一致）：前两枚灰着，第三枚这时亮起来、弹一下。
  badge(ctx, 150, 190, 40, 'lines', 0, t, .9); badge(ctx, 262, 190, 40, 'check', 0, t, .9);
  badge(ctx, 380, 190, 46, 'play', seg(L, b('third') + .25, .2), t, .9 + .1 * seg(L, b('third') + .25, .2) + .3 * Math.sin(seg(L, b('third') + .25, .45) * Math.PI));
  burst(ctx, 380, 190, seg(L, b('third') + .35, .45), 10, 60, 108, ORANGE);

  // 成片：一条胶片从左边的片盘放出来，收进右边的片盘，整条都在画面里。平时慢慢走；“抽一帧”时快速过闸，闸口每响一下取走一帧。
  const fy = 226, pitch = 132, off = 46 * L + pitch * tick, gx = 1230;
  ctx.save(); ctx.beginPath(); ctx.rect(900, fy - 60, 900, 120); ctx.clip();
  ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.rect(880, fy - 48, 940, 96); ctx.fill(); ctx.stroke();
  for (let j = -1; j < 8; j++) filmFrame(ctx, 966 + j * pitch + off % pitch, fy, pitch, 0, 100 - (j - Math.floor(off / pitch)) * .11);
  ctx.restore();
  filmCan(ctx, 900, fy, 58, off / 58); filmCan(ctx, 1800, fy, 58, off / 58);
  const flash = tick > 0 && tick < 12 ? 1 - tick % 1 : 0;
  if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + .8 * flash + ')'; ctx.fillRect(gx - 66, fy - 48, 132, 96); }
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(gx, 150); ctx.lineTo(gx, fy - 62); ctx.stroke();
  for (const [color, w] of [[PAL.line, 15], [tick > 0 ? ORANGE : '#b9bfd2', 7]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.roundRect(gx - 74, fy - 60, 148, 120, 14); ctx.stroke(); }
  icon(ctx, 'clock', gx, 120, .9, tick * Math.PI * 2);

  // 拼图板：十二个空位等着帧飞进来。
  for (const x of [1130, 1710]) for (const [color, w] of [[PAL.line, 26], [GREY, 16]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, 720); ctx.lineTo(x, 850); ctx.stroke(); }
  ctx.fillStyle = '#f3f1fb'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(1040, 330, 758, 396, 22); ctx.fill(); ctx.stroke();
  ctx.setLineDash([10, 9]); ctx.strokeStyle = '#b9bfd2'; ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const [x, y] = s19_slot(i); ctx.beginPath(); ctx.roundRect(x - 84, y - 54, 168, 108, 8); ctx.stroke(); }
  ctx.setLineDash([]);
  // 对照到哪一行，那一行的底色亮起。
  for (let r = 0; r < 3; r++) {
    const k = link(r); if (k <= 0) continue;
    ctx.fillStyle = r === 2 && found > 0 ? 'rgba(240,138,60,' + .2 * k + ')' : 'rgba(75,79,217,' + .14 * k + ')';
    ctx.beginPath(); ctx.roundRect(1050, 406 + r * 122 - 61, 738, 122, 12); ctx.fill();
  }
  // 帧从闸口掉到板子中间堆成一摞；“拼成图”时摊开成四列三行。第三行第三格的小球该跳没跳。
  for (let i = 0; i < 12; i++) {
    const drop = seg(L, b('sample') + i * .08, .32); if (drop <= 0) continue;
    const d = ease.out(drop), spread = ease.inOut(seg(L, b('grid') + i * .05, .5)), slot = s19_slot(i);
    const px = 1419 + (hash(i + 3) - .5) * 150, py = 528 + (hash(i + 23) - .5) * 90, pr = (hash(i + 43) - .5) * .6;
    s19_still(ctx, lerp(lerp(gx, px, d), slot[0], spread), lerp(lerp(fy, py, d), slot[1], spread), pr * d * (1 - spread), lerp(.7, 1, d), i === 10 ? 6.957 : 3 + i * .7, i === 10 ? found : 0);
  }
  for (let i = 0, j = 0; i < 12; i++) {
    if (i === 10) continue;
    const [x, y] = s19_slot(i);
    mark(ctx, 'check', x + 54, y + 22, .5, seg(L, b('real') + .2 + j++ * .05, .25));
  }
  const ring = ease.inOut(seg(L, b('real') + .1, .5));
  if (ring > 0) {
    const [x, y] = s19_slot(10), pulse = 1 + .03 * sway(t, 1.1) * ring;
    for (const [color, w] of [[PAL.white, 17], [ORANGE, 9]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, 114 * pulse, 71 * pulse, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke(); }
  }

  // 左边的板子：先是全打了勾的验收清单；“对照节拍表”时节拍表像翻页一样从左边翻过来盖住它。
  const bx = 640, by = 502;
  for (const [x0, x1] of [[560, 528], [720, 752]]) for (const [color, w] of [[PAL.line, 26], ['#c99a62', 16]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, 700); ctx.lineTo(x1, 850); ctx.stroke(); }
  if (slide < 1) {
    s19_paper(ctx, bx, by, 330, 434, TEAL);
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(bx - 130, by - 187); ctx.lineTo(bx + 10, by - 187); ctx.stroke();
    for (let i = 0; i < 11; i++) {
      const y = 366 + i * 31, shine = Math.sin(seg(L, b('notgood') - 1.2 + i * .07, .28) * Math.PI);
      if (shine > 0) { ctx.fillStyle = 'rgba(11,122,117,' + .18 * shine + ')'; ctx.beginPath(); ctx.roundRect(488, y - 14, 304, 28, 8); ctx.fill(); }
      ctx.strokeStyle = GREY; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(552, y); ctx.lineTo(552 + [206, 164, 186][i % 3], y); ctx.stroke();
      mark(ctx, 'check', 514, y, .36 * (1 + .45 * shine), 1);
    }
  }
  if (slide > 0) {
    const tx = bx;
    ctx.save(); ctx.translate(bx - 165, 0); ctx.scale(slide, 1); ctx.translate(165 - bx, 0);
    s19_paper(ctx, tx, by, 330, 434, ORANGE);
    // 表头：左列是旁白（声波），右列是画面（播放键）。
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { const h = [8, 15, 11, 6][i]; ctx.beginPath(); ctx.moveTo(tx - 106 + i * 13, by - 187 - h); ctx.lineTo(tx - 106 + i * 13, by - 187 + h); ctx.stroke(); }
    ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.moveTo(tx + 66, by - 201); ctx.lineTo(tx + 92, by - 187); ctx.lineTo(tx + 66, by - 173); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = LILAC; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tx - 8, by - 157); ctx.lineTo(tx - 8, by + 209);
    for (const dy of [-35, 87]) { ctx.moveTo(tx - 150, by + dy); ctx.lineTo(tx + 150, by + dy); }
    ctx.stroke();
    // 每一行：说到哪个词（声波），画面里发生哪件事（小球起跳）。
    for (let r = 0; r < 3; r++) {
      const cy = by - 96 + r * 122, hop = Math.abs(Math.sin((t * 1.3 + r * .37) * Math.PI));
      waveform(ctx, tx - 148, cy, 124, 58, t + r * 1.7, 1, INDIGO, 8);
      ctx.strokeStyle = GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(tx + 22, cy + 36); ctx.lineTo(tx + 134, cy + 36); ctx.stroke();
      ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx + 78, cy + 21 - hop * 50, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // 逐行连线：前两行连到了对应的画面；第三行的线找不到，变成橙色虚线来回找。
  for (let r = 0; r < 3; r++) {
    const k = link(r); if (k <= 0) continue;
    const y = 406 + r * 122, miss = r === 2 && found > 0, x1 = lerp(812, 1034, k);
    if (miss) { ctx.setLineDash([16, 14]); ctx.lineDashOffset = -t * 46; }
    for (const [color, w] of [[PAL.white, 15], [miss ? ORANGE_D : INDIGO, 7]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(812, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.fillStyle = miss ? ORANGE_D : INDIGO; ctx.strokeStyle = PAL.white; ctx.lineWidth = 4;
    for (const x of [812, x1]) { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }

  // 机器人：指一下第三枚徽章；看着满屏对勾还是皱眉；转头看胶片和拼图；推来节拍表；发现那一格，跳起来指。
  const up = seg(L, b('third') + .2, .3) * (1 - seg(L, b('notgood') - 1.3, .3));
  const frown = seg(L, b('notgood') - .1, .3) * (1 - seg(L, b('sample') - .25, .3));
  const film = seg(L, b('sample'), .3) * (1 - seg(L, b('compare') - .2, .3));
  const push = seg(L, b('compare') - .1, .25) * (1 - seg(L, b('compare') + .7, .3));
  const gasp = seg(L, b('real'), .2) * (1 - seg(L, b('real') + .8, .3)), point = seg(L, b('real') + .8, .3);
  let pose = botMix(BOTS.idle, { armR: [-1.05, -.35], lookY: -1, mouthOpen: .5 }, up);
  pose = botMix(pose, { armR: [.5, -2.6], eyes: 'worry', mouth: 'wavy', headTilt: .08, lookY: .1 }, frown);
  pose = botMix(pose, { armR: [-.8, -.3], lookY: lerp(-1, -.1, seg(L, b('grid'), .4)) }, film);
  pose = botMix(pose, BOTS.stop, push);
  pose = botMix(pose, { ...BOTS.surprise, lookY: .3 }, gasp);
  pose = botMix(pose, { armR: [-.2, -.25], lookY: .3 }, point);
  const bot = { x: 250, y: 856, s: .9 }, jump = seg(L, b('real'), .42), hopUp = seg(L, b('third') + .25, .35);
  drawBot(ctx, { ...pose, ...botAlive(t, talking), ...bot, lookX: 1, chest: L > b('sample') ? 'play' : 'check',
    hop: Math.sin(jump * Math.PI) * 48 + Math.sin(hopUp * Math.PI) * 26,
    squash: sway(t, 3.1) * .012 + Math.sin(seg(L, b('real') + .42, .2) * Math.PI) * .07 });
  const ask = popIn(L, b('notgood') + .05) * (1 - seg(L, b('sample') - .2, .25));
  if (ask > 0) mark(ctx, 'q', 250, 446 + sway(t, 1.6) * 6, 1.5 * ask, 1, ORANGE_D);
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('third') + .55), a1 = vis * (1 - seg(L, b('compare') - .3, .3));
  if (l1 > 0 && a1 > 0) f.label('s19_watch', { ...at(602, 190), size: 48, color: '#ffffff', plate: INDIGO, scale: l1, alpha: a1 });
  const l2 = popIn(L, b('sample') + .25);
  if (l2 > 0) f.label('s19_sample', { ...at(1464, 120), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  const l3 = popIn(L, b('compare') + .5);
  if (l3 > 0) f.label('s19_compare', { ...at(640, 244), size: 46, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis });
  const l4 = popIn(L, b('real') + .45);
  if (l4 > 0) f.label('s19_miss', { ...at(1510, 796), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l4, alpha: vis });
}
