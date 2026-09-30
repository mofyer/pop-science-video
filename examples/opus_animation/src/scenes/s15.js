// ---------- S15 动作怎么钉在字上：语音合成给出每个词的时间，节拍换成秒，画面和音效读同一张表 ----------
// 词格的宽度（按字数）、被钉住的是第几格、三条轨道的左右两端。
const s15_units = [2, 1, 2, 2, 1, 2, 3, 2], s15_pin = 4, s15_x0 = 280, s15_x1 = 1200;

// 动作牌：橙色小牌，上面一道起跳的弧线。全镜里它代表“要在某个词上发生的那个动作”。
function s15_chip(ctx, x, y, s, rot, alpha = 1, color = ORANGE) {
  if (s <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = color; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-58, -30, 116, 60, 18); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-26, 16); ctx.lineTo(26, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.quadraticCurveTo(-4, -30, 14, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(15, 0); ctx.lineTo(19, -12); ctx.stroke();
  ctx.restore();
}
// 小喇叭：ring 从 0 到 1 时吐出三道声波并散开。
function s15_speaker(ctx, x, y, s, ring) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-34, -16); ctx.lineTo(-10, -16); ctx.lineTo(22, -42); ctx.lineTo(22, 42); ctx.lineTo(-10, 16); ctx.lineTo(-34, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (ring > 0 && ring < 1) for (let i = 0; i < 3; i++) {
    const k = clamp(ring * 1.5 - i * .25); if (k <= 0 || k >= 1) continue;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(24, 0, 20 + k * 62, -.8, .8); ctx.stroke();
  }
  ctx.restore();
}
// 折线上走到 k（0..1）处的那一点。
function s15_along(points, k) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = lengths.reduce((a, v) => a + v, 0) * clamp(k);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]) return [lerp(points[i][0], points[i + 1][0], left / lengths[i]), lerp(points[i][1], points[i + 1][1], left / lengths[i])];
    left -= lengths[i];
  }
  return points[points.length - 1];
}

function scene15(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const unit = (s15_x1 - s15_x0) / 15, starts = s15_units.map((_, i) => s15_x0 + unit * s15_units.slice(0, i).reduce((a, v) => a + v, 0));
  const pinX = starts[s15_pin], waveY = 235, cellY = 395, axisY = 555;
  const on = seg(L, b('tts'), .25), spread = ease.out(seg(L, b('tts'), .9));
  const step = clamp((b('sec') - b('word') - .7) / 8, .07, .2);
  const pinned = L >= b('sec') ? popIn(L, b('sec'), .3) : 0;
  const wires = ease.inOut(seg(L, b('table') + .15, .5)), feed = ease.inOut(seg(L, b('sec') + .1, .35));
  // 播放指针：匀速走，正好在“跳”这个节拍走到图钉上。
  const playFrom = b('table') + .3, speed = (pinX - s15_x0) / (b('jump') - playFrom), playX = Math.min(s15_x1, s15_x0 + speed * (L - playFrom));
  // 起跳：节拍前下蹲预备，节拍那一刻离地（节拍后的第一帧就已经腾空）；在最高处停一停，赶在“起跳”二字上落地。
  const gap = b('land') - b('jump'), rise = Math.min(.26, gap * .3), fall = Math.min(.22, gap * .25), tau = L - b('jump'), since = L - b('land');
  const squat = tau <= 0 ? ease.out(seg(L, b('jump') - .3, .24)) : 0, air = tau > 0 && since < 0;
  const up = ease.out(clamp((tau + .02) / rise)), hang = clamp((tau - rise) / Math.max(.01, gap - rise - fall)), down = ease.in(clamp((tau - gap + fall) / fall));
  const hop = air ? 185 * (up + .07 * Math.sin(hang * Math.PI)) * (1 - down) : 0;
  const stretch = air ? -.1 * Math.sin(clamp(tau / (rise * 1.6)) * Math.PI) - .07 * down : 0;
  const thud = since >= 0 ? .15 * Math.exp(-5 * since) * Math.cos(11 * since) : 0;
  const sh = shake(L, b('land'), .3, 7);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D), sh[0], sh[1]);
  studio(ctx, t, '#e8f1ff', '#fff7ec');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 话筒和声波：一开始是灰的小波纹，语音合成一响，靛蓝的声波从左往右铺开。
  mic(ctx, 165, 262, 1.15, on);
  for (let i = 0; i < 2; i++) {
    const k = seg(L, b('tts') + i * .18, .6); if (k <= 0 || k >= 1) continue;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(165, 222, 60 + k * 70, -.7, .7); ctx.stroke(); ctx.globalAlpha = 1;
  }
  waveform(ctx, s15_x0, waveY, s15_x1 - s15_x0, 46, t, 1, GREY, 40);
  if (spread > 0) waveform(ctx, s15_x0, waveY, s15_x1 - s15_x0, 118, t, spread, INDIGO, 40);

  // 时间轴
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(s15_x0 - 16, axisY); ctx.lineTo(s15_x1 + 16, axisY); ctx.stroke();
  ctx.strokeStyle = LILAC; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(s15_x0 - 16, axisY); ctx.lineTo(s15_x1 + 16, axisY); ctx.stroke();
  if (L > playFrom) { ctx.strokeStyle = INDIGO; ctx.beginPath(); ctx.moveTo(s15_x0 - 16, axisY); ctx.lineTo(playX, axisY); ctx.stroke(); }
  for (let i = 0; i <= 30; i++) { ctx.strokeStyle = PAL.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s15_x0 + unit * i / 2, axisY + 14); ctx.lineTo(s15_x0 + unit * i / 2, axisY + (i % 2 ? 22 : 30)); ctx.stroke(); }

  // 词格一格格从声波里落下来，每格的开头往时间轴上弹出一根刻度。
  s15_units.forEach((n, i) => {
    const k = ease.out(seg(L, b('word') + i * step, .3)); if (k <= 0) return;
    const x = starts[i], w = n * unit - 10, y = lerp(waveY, cellY, k), tick = ease.inOut(seg(L, b('word') + i * step + .22, .25));
    const mine = i === s15_pin && pinned > .5, active = L > playFrom && playX >= x && playX < x + n * unit;
    if (tick > 0) {
      ctx.strokeStyle = mine ? ORANGE_D : INDIGO; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, cellY + 32); ctx.lineTo(x, lerp(cellY + 32, axisY, tick)); ctx.stroke();
      if (tick >= 1) { ctx.fillStyle = mine ? ORANGE_D : INDIGO; ctx.beginPath(); ctx.arc(x, axisY, 8, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = k;
    ctx.fillStyle = mine ? '#ffdfbd' : active ? '#d6d8ff' : PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x, y - 32, w, 64, 14); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = mine ? ORANGE_D : active ? INDIGO : GREY; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + w - 16, y); ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // 播放指针：一条竖线穿过声波、词格和时间轴。
  if (L > playFrom) {
    ctx.strokeStyle = 'rgba(75,79,217,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(playX, waveY - 74); ctx.lineTo(playX, axisY); ctx.stroke();
    ctx.fillStyle = INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(playX - 17, waveY - 98); ctx.lineTo(playX + 17, waveY - 98); ctx.lineTo(playX, waveY - 70); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // 动作牌：先是没处落脚，往时间轴上一碰就弹回来；等词的时间有了，才落到那个词的刻度上，变成一枚图钉。
  const miss = seg(L, b('ask'), .55), dip = Math.sin(miss * Math.PI);
  const toPin = ease.inOut(seg(L, b('sec') - .5, .35)), drop = ease.in(seg(L, b('sec') - .15, .15)), back = ease.out(seg(L, b('sec'), .25));
  const chipX = lerp(lerp(900 + sway(t, 4.3) * 70, 1030, dip), pinX, toPin);
  const chipY = lerp(lerp(lerp(488 + sway(t, 2.1) * 9 + 50 * dip, 468, toPin), 522, drop), 470, back);
  const missK = seg(L, b('ask') + .27, .2), missGone = 1 - seg(L, b('ask') + .8, .4);
  if (missK > 0 && missGone > 0) { ctx.save(); ctx.globalAlpha = missGone; mark(ctx, 'cross', 1030, axisY + 4, .9, missK, ORANGE_D); ctx.restore(); }
  if (pinned > 0) {
    icon(ctx, 'pin', pinX, axisY - 44, 1.1 * pinned);
    burst(ctx, pinX, axisY, seg(L, b('sec'), .35), 9, 26, 84, ORANGE);
    burst(ctx, pinX, axisY - 55, seg(L, b('jump'), .4), 10, 30, 96, ORANGE);
  }
  s15_chip(ctx, chipX, chipY, 1 - .35 * back, miss > 0 && miss < 1 ? Math.sin(miss * Math.PI * 4) * .2 * (1 - miss) : sway(t, 3.3) * .05 * (1 - toPin), 1 - seg(L, b('sec') + .15, .2));

  // 同一张表：一行是“这个动作，第几秒”，从这一行连出两条线，一条通向画面，一条通向喇叭。
  const wireA = [[670, 770], [745, 770], [815, 705], [1452, 705]], wireB = [[670, 770], [745, 770], [815, 812], [985, 812]];
  if (wires > 0) for (const wire of [wireA, wireB]) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 13; trace(ctx, wire, wires); ctx.strokeStyle = LILAC; ctx.lineWidth = 6; trace(ctx, wire, wires);
    const pulse = seg(L, b('jump') - .3, .3);
    if (pulse > 0 && pulse < 1) { const p = s15_along(wire, pulse); ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  // 图钉把“第几秒”送进表里：一条虚线从图钉拐进表的右列。
  if (feed > 0) {
    ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([4, 15]);
    trace(ctx, [[pinX, axisY + 40], [pinX, 622], [585, 622], [585, 656]], feed); ctx.setLineDash([]);
  }
  {
    const glow = seg(L, b('table'), .5);
    if (glow > 0 && glow < 1) { ctx.strokeStyle = 'rgba(75,79,217,' + .5 * (1 - glow) + ')'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(330 - 40 * glow, 662 - 40 * glow, 340 + 80 * glow, 178 + 80 * glow, 14 + 30 * glow); ctx.stroke(); }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(337, 674, 340, 178, 14); ctx.fill();
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(330, 662, 340, 178, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.roundRect(330, 662, 340, 38, [14, 14, 0, 0]); ctx.fill();
    const lit = seg(L, b('jump') - .3, .2) * (1 - seg(L, b('jump') + .5, .4));
    ctx.fillStyle = 'rgba(240,138,60,' + (.2 + .45 * lit) + ')'; ctx.fillRect(333, 700 + 46.67, 334, 46.67);
    ctx.beginPath(); ctx.roundRect(330, 662, 340, 178, 14); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(470, 662); ctx.lineTo(470, 840); for (const r of [0, 1, 2]) { ctx.moveTo(330, 700 + r * 46.67); ctx.lineTo(670, 700 + r * 46.67); } ctx.stroke();
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(356, 681); ctx.lineTo(444, 681); ctx.moveTo(496, 681); ctx.lineTo(600, 681); ctx.stroke();
    for (const r of [0, 1, 2]) {
      const y = 700 + 46.67 * (r + .5), k = ease.inOut(seg(L, b('sec') + .4 + [.3, 0, .45][r], .3)), color = r === 1 ? ORANGE_D : GREY;
      if (r === 1) s15_chip(ctx, 400, y, .58, 0);
      else { ctx.fillStyle = LILAC; ctx.beginPath(); ctx.roundRect(366, y - 13, 68, 26, 9); ctx.fill(); }
      if (k < 1) { ctx.strokeStyle = LILAC; ctx.lineWidth = 4; ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.roundRect(492, y - 14, 150, 28, 9); ctx.stroke(); ctx.setLineDash([]); }
      if (k <= 0) continue;
      ctx.fillStyle = PAPER; ctx.fillRect(486, y - 19, 162, 38);
      if (r === 1) { ctx.fillStyle = 'rgba(240,138,60,' + (.2 + .45 * lit) + ')'; ctx.fillRect(486, y - 19, 162, 38); }
      ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(536, y); ctx.lineTo(536 + [70, 104, 52][r] * k, y); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(506, y, 11, 0, Math.PI * 2); ctx.moveTo(506, y - 6); ctx.lineTo(506, y); ctx.lineTo(511, y + 3); ctx.stroke();
    }
  }
  s15_speaker(ctx, 1035, 812, .85, Math.max(seg(L, b('jump'), .55) < 1 ? seg(L, b('jump'), .55) : 0, seg(L, b('land'), .55)));

  // 画面：取景框框住机器人，它自己就是要对上旁白的那个画面。
  const framed = seg(L, b('table') + .5, .3), bx = 1640, by = 856, bs = .95, held = air ? Math.min(clamp(tau / rise), 1 - down) : 0;
  if (held > 0) { ctx.save(); ctx.translate(bx, by - 240 * bs - hop * bs); ctx.rotate(t * .5); ctx.strokeStyle = 'rgba(11,122,117,' + .5 * held + ')'; ctx.lineWidth = 6; ctx.setLineDash([18, 16]); ctx.beginPath(); ctx.arc(0, 0, 215, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
  if (framed > 0) {
    ctx.globalAlpha = framed; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [color, width] of [[PAL.line, 12], [TEAL, 6]]) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      for (const [cx, dx] of [[1465, 1], [1815, -1]]) for (const [cy, dy] of [[300, 1], [872, -1]]) { ctx.beginPath(); ctx.moveTo(cx, cy + dy * 52); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * 52, cy); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  // 机器人：纳闷，看话筒，盯着词格落下，明白过来，指表，下蹲，起跳，落地，回头看图钉点头。
  let pose = botMix({ ...BOTS.think, lookX: .8, lookY: -.2 }, { ...BOTS.shrug, lookX: .6 }, seg(L, b('ask'), .25));
  pose = botMix(pose, { ...BOTS.explain, lookX: 1, lookY: -1, chest: 'wave' }, seg(L, b('tts') - .1, .3));
  pose = botMix(pose, { lookX: 1, lookY: -.4 + .25 * sway(t, 1.1), chest: 'wave' }, seg(L, b('word') + .2, .4));
  pose = botMix(pose, { ...BOTS.surprise, lookX: 1, lookY: .1 }, seg(L, b('sec') - .1, .2) * (1 - seg(L, b('sec') + .6, .3)));
  pose = botMix(pose, { armR: [.5, .25], lookX: 1, lookY: .7, mouthOpen: .45 }, seg(L, b('table') + .1, .3));
  pose = botMix(pose, { armL: [2.25, .3], armR: [.9, -.3], lookX: 1, lookY: .1, eyes: 'wide' }, seg(L, b('jump') - .55, .3));
  pose = botMix(pose, BOTS.cheer, tau <= 0 ? 0 : air ? up : 1 - seg(L, b('land'), .18));
  pose = botMix(pose, { lookX: 1, lookY: .35 + .45 * Math.sin(since * 9), headTilt: .05 * Math.sin(since * 9), mouthOpen: .6 }, seg(L, b('land') + .12, .25));
  const live = botAlive(t, talking, pose.mouth === 'smile' && pose.eyes !== 'happy' ? {} : pose);
  drawBot(ctx, { ...pose, ...live, x: bx, y: by, s: bs, dir: -1, hop, squash: live.squash + squat * .11 + stretch + thud, lean: pose.lean + squat * .03, ant: live.ant + (air ? -.8 * (1 - hang) : 0) + thud * 3 });
  mark(ctx, 'q', 1752, 498, 1.7 * (L >= b('ask') ? popIn(L, b('ask'), .35) : 0) * (1 - seg(L, b('tts'), .2)), 1, ORANGE_D);
  // 落地溅星
  if (since >= 0 && since < .8) {
    const k = since / .8;
    ctx.save(); ctx.beginPath(); ctx.rect(bx - 320, by - 320, 640, 330); ctx.clip(); burst(ctx, bx, by - 6, seg(L, b('land'), .35), 12, 110, 210, '#ffc93c'); ctx.restore();
    for (let i = 0; i < 6; i++) {
      const e = Math.PI * (.08 + .11 * (i % 3)), a = i < 3 ? e - Math.PI : -e, d = 135 + (80 + hash(i) * 80) * ease.out(k);
      ctx.save(); ctx.globalAlpha = 1 - k * k; star(ctx, bx + Math.cos(a) * d, by - 10 + Math.sin(a) * d + 70 * k * k, 24 * (1 - k * .5), k * 3 + i, PAL.star, PAL.starLine); ctx.restore();
    }
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('word') + .5);
  if (l1 > 0) f.label('s15_word', { ...at(1338, 482), size: 44, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis * (1 - seg(L, b('table') - .3, .25)) });
  const l2 = popIn(L, b('sec') + .2);
  if (l2 > 0) f.label('s15_beat', { ...at(pinX - 108, 500), size: 44, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  const l3 = popIn(L, b('table') + .3);
  if (l3 > 0) f.label('s15_table', { ...at(190, 751), size: 46, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis });
  const l4 = popIn(L, b('table') + .75);
  if (l4 > 0) {
    f.label('s15_pic', { ...at(1375, 652), size: 44, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis });
    f.label('s15_sfx', { ...at(1165, 812), size: 44, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis });
  }
  const l6 = popIn(L, b('jump'), .3);
  if (L >= b('jump')) f.label('s15_jump', { ...at(1350, 400), size: 64, color: '#ffffff', plate: ORANGE_D, scale: l6, alpha: vis * seg(L, b('jump'), .08) });
}
