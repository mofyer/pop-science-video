// ---------- S04 这个 Skill 里的三样东西：说明书、动效手册、绘图库；说一句“做科普视频”就触发 ----------
const s04_SLOT = [[650, 320], [980, 290], [1310, 330]], s04_F = [980, 735], s04_HAND = [1385, 695];

// 摊开的空白册子，o 是摊开的程度；画在当前原点。
function s04_spread(ctx, o) {
  const half = 150 * o;
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.roundRect(-half - 10, -92, half * 2 + 20, 194, 14); ctx.fill(); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(0, -90); ctx.quadraticCurveTo(side * half * .5, -104, side * half, -90); ctx.lineTo(side * half, 90); ctx.quadraticCurveTo(side * half * .5, 76, 0, 90); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// 动效手册：合着的青色册子，封面小窗里一个球沿弧线来回；tt 是球自己的时间，为 0 时停在起点。
function s04_handbook(ctx, x, y, s, tt) {
  const at = k => [-34 + 76 * k, 14 - Math.sin(k * Math.PI) * 58], where = v => .5 - .5 * Math.cos(v * 4.2);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = TEAL; ctx.beginPath(); ctx.roundRect(-70, -95, 140, 190, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(-52, -70, 112, 106, 10); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-44, 26); ctx.lineTo(52, 26); ctx.stroke();
  ctx.strokeStyle = LILAC; ctx.setLineDash([6, 8]); ctx.beginPath();
  for (let i = 0; i <= 12; i++) { const p = at(i / 12); ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }
  ctx.stroke(); ctx.setLineDash([]);
  if (tt > 0) for (let i = 3; i >= 1; i--) { const p = at(where(tt - i * .07)); ctx.globalAlpha = .5 - i * .12; ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const p = at(where(tt)); ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-44, 58); ctx.lineTo(40, 58); ctx.moveTo(-44, 76); ctx.lineTo(10, 76); ctx.stroke();
  ctx.restore();
}
// 零件盒：lid 从 0 到 1 时两片盒盖向两边掀开；正面的牌子上画着圆、方、三角。
function s04_box(ctx, x, y, s, lid) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-92, -46, 184, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-96, -28, 192, 100, [6, 6, 16, 16]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(-62, 0, 124, 46, 10); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; ctx.fillStyle = INDIGO;
  ctx.beginPath(); ctx.arc(-34, 23, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = TEAL; ctx.beginPath(); ctx.roundRect(-10, 13, 20, 20, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(34, 12); ctx.lineTo(46, 33); ctx.lineTo(22, 33); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 6; ctx.fillStyle = '#f6a65c';
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(side * 96, -38); ctx.rotate(side * 2.4 * lid); ctx.beginPath(); ctx.roundRect(side < 0 ? 0 : -98, -14, 98, 22, 8); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
// 盒里的零件：0 小人头、1 圆、2 方。
function s04_part(ctx, kind, x, y, s, rot) {
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 0) {
    ctx.fillStyle = '#fbd3c1'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#33262b'; ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PAL.pupil; for (const dx of [-10, 10]) { ctx.beginPath(); ctx.arc(dx, 4, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-7, 14); ctx.quadraticCurveTo(0, 20, 7, 14); ctx.stroke();
  } else if (kind === 1) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else { ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.roundRect(-25, -25, 50, 50, 9); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function scene04(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const bump = key => Math.sin(seg(L, b(key), .4) * Math.PI) * .1;
  const slide = ease.inOut(seg(L, b('ours'), .6)), ajar = ease.inOut(seg(L, b('three'), .25)) * .35;
  const man = ease.inOut(seg(L, b('rules'), .4)), flow = seg(L, b('rules') + .3, .45), checks = seg(L, b('rules') + .6, .6);
  const lid = ease.out(seg(L, b('kit'), .3));
  const say = popIn(L, b('say'), .35), chip = ease.inOut(seg(L, b('say') + .45, .55)), arrive = seg(L, b('say') + 1, .2);
  const takeAt = Math.max(b('say') + .95, b('open') - .6), take = ease.inOut(seg(L, takeAt, .55)), flip = seg(L, b('open'), .35), read = seg(L, b('open') + .3, 1);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#eef0ff', '#fff6ec');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 视线：两个角色都看着正在讲的那样东西。
  const bot = { x: 1680, y: 856, s: .9 };
  const gaze = (o, px, py) => [clamp((px - o[0]) / 320, -1, 1), clamp((py - o[1]) / 260, -1, 1)];
  const watch = (o, first, turns) => turns.reduce((eye, [at, px, py]) => { const k = ease.inOut(seg(L, at, .3)), g = gaze(o, px, py); return [lerp(eye[0], g[0], k), lerp(eye[1], g[1], k)]; }, gaze(o, first[0], first[1]));
  const sights = [[b('ours'), 980, 735], [b('three') + .2, 980, 300], [b('rules'), 650, 320], [b('motion'), 980, 290], [b('kit'), 1310, 180]];
  const botEye = watch([bot.x, 624], [500, 800], [...sights, [b('say'), 290, 420], [b('say') + 1.2, 290, 560], [takeAt, 1385, 700]]);
  const manEye = watch([240, 560], [500, 800], [...sights, [b('say'), 1680, 600], [takeAt, 1385, 695]]);

  // 创作者：把文件夹推到中间；三样东西升起来时抬手去指；然后拢着嘴喊一句。
  const ck = [seg(L, b('ours'), .25), seg(L, b('ours') + .5, .3), seg(L, b('three') + .1, .3), seg(L, b('say') - .1, .25), seg(L, b('say') + 1, .3), seg(L, b('open'), .3)];
  const point = [-.75 - (bump('rules') + bump('motion') + bump('kit')) * 1.5, -.15];
  const armR = [[0, 0], [1.2, -.2], point, [-1, -1.5], [1.2, -.2], [-.9, -.3]].reduce((a, c, i) => mix(a, c, ck[i]), [.35 + Math.sin(t * 5) * .08, -.5]);
  drawPerson(ctx, { x: 240, y: 856, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.1, .4), lookX: manEye[0], lookY: manEye[1], armR,
    mood: L < b('three') ? 'smile' : L < b('three') + .8 ? 'o' : L < b('say') - .1 ? 'smile' : L < b('say') + .9 ? 'o' : 'happy',
    squash: sway(t, 3.4) * .008, hop: Math.sin(seg(L, b('say'), .3) * Math.PI) * 14 + Math.sin(seg(L, b('open') + .15, .4) * Math.PI) * 24 });

  // 文件夹：从创作者脚边移到中间放大；“三样东西”时封面掀开一条缝。
  const fx = lerp(500, s04_F[0], slide), fy = lerp(795, s04_F[1], slide) - Math.sin(slide * Math.PI) * 70, fs = lerp(.48, 1, slide);
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.ellipse(fx, 852, 250 * fs, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(fx, fy); ctx.scale(fs, fs); folder(ctx, 0, 0, 460, 220, ajar); ctx.restore();

  // 说明书：摊开后左页画出两段流程线，右页打上四个小勾。
  const manual = (x, y, sc, o) => {
    if (o < .5) { book(ctx, x, y, sc, 0); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); s04_spread(ctx, o * 2 - 1);
    if (o > .6) {
      ctx.scale(o * 2 - 1, 1);
      ctx.lineCap = 'round'; ctx.lineWidth = 16;
      ctx.strokeStyle = INDIGO; trace(ctx, [[-128, -36], [-88, -36]], clamp(flow * 3));
      ctx.strokeStyle = ORANGE_D; trace(ctx, [[-58, -36], [-22, -36]], clamp(flow * 3 - 1.4));
      if (flow > .34) { ctx.strokeStyle = GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-77, -44); ctx.lineTo(-69, -36); ctx.lineTo(-77, -28); ctx.stroke(); }
      ctx.fillStyle = INDIGO; if (flow > .3) { ctx.beginPath(); ctx.arc(-108, -6, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = ORANGE_D; if (flow > .9) for (const dx of [-49, -31]) { ctx.beginPath(); ctx.arc(dx, -6, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = LILAC; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-128, 34); ctx.lineTo(-30, 34); ctx.moveTo(-128, 58); ctx.lineTo(-62, 58); ctx.stroke();
      [[46, -44], [104, -44], [46, 24], [104, 24]].forEach(([cx, cy], i) => {
        ctx.strokeStyle = LILAC; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(cx - 19, cy - 19, 38, 38, 8); ctx.stroke();
        mark(ctx, 'check', cx, cy, .55, clamp(checks * 4 - i));
      });
    }
    ctx.restore();
  };
  // 三样东西从文件夹里升起，悬成一排；封面上沿以下的部分被封面挡住。
  ctx.save(); ctx.beginPath(); ctx.rect(-600, -600, 3200, 1273); ctx.clip();
  s04_SLOT.forEach(([sx, sy], i) => {
    const k = ease.out(seg(L, b('three') + .12 + i * .14, .55)); if (k <= 0) return;
    const x = lerp(s04_F[0], sx, k), y = lerp(790, sy, k) + sway(t, 3 + i * .4, i * .3) * 6 * k, sc = lerp(.45, 1, k);
    if (i === 0) { if (take <= 0) manual(x, y, 1.05 * sc * (1 + bump('rules')), man); }
    else if (i === 1) s04_handbook(ctx, x, y, 1.3 * sc * (1 + 1.5 * bump('motion')), Math.max(0, L - b('motion')));
    else s04_box(ctx, x, y, 1.1 * sc * (1 + bump('kit')), lid);
  });
  ctx.restore();
  // 零件一个个从盒里蹦出来，悬在盒子上方。
  [0, 1, 2].forEach(i => {
    const k = seg(L, b('kit') + .12 + i * .16, .45), c = s04_SLOT[2]; if (k <= 0) return;
    s04_part(ctx, i, lerp(c[0] + (i - 1) * 40, c[0] + (i - 1) * 88, ease.out(k)), lerp(c[1] - 40, c[1] - (i === 1 ? 196 : 160), ease.back(k)) + sway(t, 2.2 + i * .3, i * .37) * 7 * k,
      ease.back(k), (1 - k) * (i - 1) * 1.6 + sway(t, 3.1, i * .3) * .08);
  });

  // “做科普视频”：话泡弹出，一小片指令沿弧线飞到机器人的天线上。
  if (say > 0) { ctx.save(); ctx.translate(238, 486); ctx.scale(say, say); bubble(ctx, 52, -86, 300, 104, -35); ctx.restore(); }
  if (chip > 0 && chip < 1) {
    const q = k => [(1 - k) * (1 - k) * 445 + 2 * k * (1 - k) * 1060 + k * k * bot.x, (1 - k) * (1 - k) * 410 + 2 * k * (1 - k) * 640 + k * k * 520];
    for (let i = 1; i <= 6; i++) { const p = q(Math.max(0, chip - i * .05)); ctx.fillStyle = 'rgba(75,79,217,' + (.5 - i * .07) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 9 - i, 0, Math.PI * 2); ctx.fill(); }
    const p = q(chip); ctx.fillStyle = PAL.white; ctx.strokeStyle = INDIGO; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(p[0] - 34, p[1] - 17, 68, 34, 14); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p[0] - 18, p[1]); ctx.lineTo(p[0] + 18, p[1]); ctx.stroke();
  }

  // 机器人：讲到动效手册时学着小球跳一下；接到指令天线一抖，自己取过说明书翻开，逐行看。
  if (take > 0) {
    // 合上、缩小，从标签和文件夹之间的空当飞过去，到机器人手边再放大。
    if (take < 1) manual(lerp(s04_SLOT[0][0], s04_HAND[0], take), lerp(s04_SLOT[0][1], s04_HAND[1], take) + Math.sin(take * Math.PI) * 80, lerp(1.05, .92, take) * (1 - .55 * Math.sin(take * Math.PI)), man * (1 - seg(take, 0, .3)));
    else book(ctx, s04_HAND[0], s04_HAND[1] + sway(t, 2.9) * 3, .92, flip, read);
  }
  let pose = botMix({}, BOTS.surprise, Math.sin(seg(L, b('three') + .1, .8) * Math.PI));
  pose = botMix(pose, BOTS.cheer, Math.sin(seg(L, b('kit') + .15, 1) * Math.PI));
  pose = botMix(pose, { eyes: 'wide', halo: .8, chest: 'play', armR: [-.9, -.6] }, arrive * (1 - take));
  pose = botMix(pose, { armL: reach(-BOT_SHOULDER[0], BOT_SHOULDER[1], -158, -176, BOT_ARM[0], BOT_ARM[1]), frontL: true, chest: 'lines', halo: .4 }, take);
  const alive = botAlive(t, talking), buzz = seg(L, b('say') + 1, .6);
  drawBot(ctx, { ...pose, ...alive, ...bot, lookX: botEye[0] + (take >= 1 && read < 1 ? .4 * ((read * 5) % 1) : 0), lookY: botEye[1], headTilt: pose.headTilt + sway(t, 2.7) * .03,
    mouthOpen: Math.max(pose.mouthOpen, alive.mouthOpen || 0), ant: alive.ant + Math.sin(buzz * Math.PI * 4) * (1 - buzz),
    hop: Math.sin(seg(L, b('motion') + .1, .45) * Math.PI) * 44 + Math.sin(seg(L, b('kit') + .2, .4) * Math.PI) * 28 + Math.sin(seg(L, b('say') + 1, .4) * Math.PI) * 50 });
  burst(ctx, bot.x, 519, seg(L, b('say') + 1, .4), 10, 30, 90, ORANGE);
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('ours') + .55);
  if (l1 > 0) f.label('s04_name', { ...at(s04_F[0], 765), size: 44, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  const l2 = popIn(L, b('rules') + .15);
  if (l2 > 0) f.label('s04_manual', { ...at(s04_SLOT[0][0], 484), size: 44, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis * (1 - seg(L, takeAt, .25)) });
  const l3 = popIn(L, b('motion') + .15);
  if (l3 > 0) f.label('s04_motion', { ...at(s04_SLOT[1][0], 484), size: 44, color: '#ffffff', plate: TEAL, scale: l3, alpha: vis });
  const l4 = popIn(L, b('kit') + .2);
  if (l4 > 0) f.label('s04_kit', { ...at(s04_SLOT[2][0], 484), size: 44, color: '#ffffff', plate: ORANGE_D, scale: l4, alpha: vis });
  if (say > 0) f.label('s04_say', { ...at(290, 400), size: 46, color: INDIGO, halo: '#ffffff', scale: say, alpha: vis });
}
