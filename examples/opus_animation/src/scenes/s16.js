// ---------- S16 引擎的八道工序：一条传送带，包裹每过一道拱门变一次样 ----------
const s16_keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const s16_gap = 160, s16_first = 535, s16_belt = 700;

// 小圆章：青色圆底加白色对勾，k 是弹出的进度。
function s16_tick(ctx, x, y, r, k) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = TEAL; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = r * .32; ctx.beginPath(); ctx.moveTo(-r * .45, 0); ctx.lineTo(-r * .12, r * .34); ctx.lineTo(r * .48, -r * .34); ctx.stroke();
  ctx.restore();
}
// 带上的包裹：(x, y) 是它落在带面上的那一点；stage 是已经过了几道拱门，k 是过完最近一道之后的进度。
// 0 文件夹 → 1 打勾 → 2 挂上声波 → 3 加音符 → 4 变成网页框 → 5 被放大镜扫过 → 6 变成一格格帧 → 7 合成胶片盒 → 8 盖章。
function s16_pack(ctx, x, y, stage, k, t, fade = 0) {
  const pop = stage ? 1 + .3 * Math.sin(clamp(k) * Math.PI) * (1 - clamp(k)) : 1, fresh = ease.out(clamp(k * 1.6));
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.globalAlpha *= 1 - fade;
  if (stage <= 3) {
    folder(ctx, 0, -33, 84, 58, 0);
    if (stage >= 2) {
      const s = stage === 2 ? fresh : 1;
      ctx.save(); ctx.translate(-16, -86); ctx.scale(s, s); ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-27, -14, 54, 28, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = BOTC.glow; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const h = 3 + 7 * Math.abs(Math.sin(t * 6 + i * 1.4)); ctx.beginPath(); ctx.moveTo(-16 + i * 8, -h); ctx.lineTo(-16 + i * 8, h); ctx.stroke(); }
      ctx.restore();
    }
    if (stage >= 3) icon(ctx, 'note', 22, -88, .55 * fresh, t, ORANGE);
    if (stage >= 1) s16_tick(ctx, 27, -22, 15, stage === 1 ? fresh : 1);
  } else if (stage <= 5) {
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.roundRect(-44, -72, 88, 70, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = LILAC; ctx.beginPath(); ctx.roundRect(-44, -72, 88, 17, [9, 9, 0, 0]); ctx.fill(); ctx.beginPath(); ctx.roundRect(-44, -72, 88, 70, 9); ctx.stroke();
    [ORANGE, '#ffd34d', BOTC.glow].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-34 + i * 11, -63.5, 3.6, 0, Math.PI * 2); ctx.fill(); });
    miniScene(ctx, -38, -50, 76, 42, t, { r: 4 });
    if (stage === 5) {
      if (k < 1) { const mx = lerp(-34, 34, ease.inOut(clamp(k))); ctx.fillStyle = 'rgba(11,122,117,.22)'; ctx.fillRect(-38, -50, mx + 38, 42); magnifier(ctx, mx, -34, 19, .9); }
      else s16_tick(ctx, 38, -70, 13, 1);
    }
  } else if (stage === 6) {
    frameGrid(ctx, -46, -76, 2, 2, 44, 34, 4, fresh, t, .4);
  } else {
    filmCan(ctx, 0, -42, 40, t * .8);
    if (stage >= 8) {
      const hit = ease.in(clamp(k * 2.2)), lift = ease.out(clamp(k * 2.2 - 1.1));
      if (k > .45) { ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -42, 49, 0, Math.PI * 2); ctx.stroke(); s16_tick(ctx, 34, -74, 16, ease.out(clamp(k * 2.2 - 1))); }
      if (lift < 1) { ctx.save(); ctx.globalAlpha *= 1 - lift; icon(ctx, 'stamp', 0, -68 - 74 * (1 - hit) - 60 * lift, .95, 0, TEAL); ctx.restore(); }
    }
  }
  ctx.restore();
}

function scene16(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const ax = i => s16_first + i * s16_gap, startX = 430, endX = 1797, launch = b('give') + .35;
  // 包裹的位置：说到哪道工序，它正好到哪道拱门。
  let px = lerp(startX, ax(0), Math.pow(seg(L, launch, b('a') - launch), 2.2));
  if (L >= b('h')) px = lerp(ax(7), endX, ease.out(seg(L, b('h'), .5)));
  else if (L >= b('a')) { let i = 0; while (i < 6 && L >= b(s16_keys[i + 1])) i++; px = lerp(ax(i), ax(i + 1), (L - b(s16_keys[i])) / (b(s16_keys[i + 1]) - b(s16_keys[i]))); }
  const stage = s16_keys.filter(key => L >= b(key)).length, since = stage ? L - b(s16_keys[stage - 1]) : 0;
  const cg = b('resume') - b('change'), stale = seg(L, b('change'), .3), blocked = L >= b('resume');
  const phase = px - startX + 110 * Math.max(0, Math.min(L, b('resume')) - b('h') - .5);
  const hfOn = seg(L, b('hf'), .3), hfLine = ease.inOut(seg(L, b('hf') + .1, .35));
  const sh = shake(L, b('resume'), .3, 6);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D), sh[0], sh[1]);
  studio(ctx, t, '#eaf0ff', '#fff6ea');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 传送带、两条腿、终点的托盘
  for (const x of [400, 1720]) { ctx.lineCap = 'butt'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(x, s16_belt + 40); ctx.lineTo(x, 850); ctx.stroke(); ctx.strokeStyle = GREY; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, s16_belt + 40); ctx.lineTo(x, 850); ctx.stroke(); }
  ctx.fillStyle = '#d8dbe8'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(1748, s16_belt, 98, 22, 8); ctx.fill(); ctx.stroke();
  conveyor(ctx, 380, s16_belt, 1360, phase);

  // 八道拱门：包裹一到就亮；“检查”“渲染”两道点名之后换成青色；输入一变，全部熄灭。
  s16_keys.forEach((key, i) => {
    const on = seg(L, b(key), .2) * (1 - seg(L, b('change') + i * .03, .25)), hf = (i === 4 || i === 5) && hfOn > .5;
    if (hf && on > .5) { ctx.strokeStyle = 'rgba(11,122,117,' + (.2 + .12 * sway(t, 1.2)) + ')'; ctx.lineWidth = 60; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax(i) - 52, s16_belt - 4); ctx.lineTo(ax(i) - 52, s16_belt - 167); ctx.arc(ax(i), s16_belt - 167, 52, Math.PI, 0); ctx.lineTo(ax(i) + 52, s16_belt - 4); ctx.stroke(); }
    arch(ctx, ax(i), s16_belt - 4, 104, 215, on, hf ? TEAL : INDIGO);
    burst(ctx, ax(i), s16_belt - 48, seg(L, b(key), .3), 8, 40, 84, '#ffd34d');
  });
  // “检查”和“渲染”头上同一块名牌，两条线连下来。
  if (hfLine > 0) for (const [x0, x1] of [[1222, ax(4)], [1288, ax(5)]]) {
    ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 12; trace(ctx, [[x0, 424], [x1, s16_belt - 236]], hfLine);
    ctx.strokeStyle = TEAL; ctx.lineWidth = 6; trace(ctx, [[x0, 424], [x1, s16_belt - 236]], hfLine);
  }

  // 闸杆：输入变了之后挂在“检查”拱门里，有包裹想从半路接着跑就落下来。
  const armed = ease.out(seg(L, b('change') + .2, .25)), slam = ease.in(seg(L, b('resume'), .12));
  // 半路上那只旧包裹：上一趟留下的中间产物，想接着往下走。
  const ghostAt = b('change') + cg * .3, ghost = L >= ghostAt ? popIn(L, ghostAt, .3) : 0;
  const gx = Math.min(1072, 1020 + 120 * Math.max(0, L - ghostAt - .2)) - 16 * Math.sin(seg(L, b('resume'), .3) * Math.PI);
  if (ghost > 0) {
    ctx.save(); ctx.translate(gx, s16_belt); ctx.scale(ghost, ghost); s16_pack(ctx, 0, 0, 4, 1, 0, .3); ctx.restore();
    if (!blocked) for (let i = 0; i < 2; i++) { const k = ((t * 1.6 + i * .5) % 1); ctx.strokeStyle = 'rgba(75,79,217,' + (1 - k) * ghost + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(gx - 8 + k * 30, 600); ctx.lineTo(gx + 4 + k * 30, 612); ctx.lineTo(gx - 8 + k * 30, 624); ctx.stroke(); }
    else mark(ctx, 'cross', gx, 598, 1, seg(L, b('resume') + .1, .22), ORANGE_D);
  }
  if (armed > 0) {
    const gy = lerp(s16_belt - 172, s16_belt - 44, slam);
    ctx.save(); ctx.translate(ax(4), gy); ctx.scale(armed, 1);
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-46, -12, 92, 24, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(-46, -12, 92, 24, 8); ctx.clip(); ctx.strokeStyle = PAL.white; ctx.lineWidth = 8; for (let i = -2; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-46 + i * 26, 14); ctx.lineTo(-30 + i * 26, -14); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.roundRect(-46, -12, 92, 24, 8); ctx.stroke();
    ctx.restore();
    burst(ctx, ax(4) - 50, s16_belt - 44, seg(L, b('resume') + .1, .3), 8, 20, 70, ORANGE);
  }
  // 指回起点的箭头：虚线一直往回流。
  const redo = ease.inOut(seg(L, b('resume') + .15, .45));
  if (redo > 0) {
    const curve = []; for (let i = 0; i <= 24; i++) { const k = i / 24; curve.push([lerp(lerp(1118, 790, k), lerp(790, 462, k), k), lerp(lerp(456, 396, k), lerp(396, 456, k), k)]); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 16; trace(ctx, curve, redo);
    ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 8; ctx.setLineDash([22, 16]); ctx.lineDashOffset = -t * 60; trace(ctx, curve, redo); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    if (redo >= 1) { for (const [color, width] of [[PAL.white, 16], [ORANGE_D, 8]]) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(492, 432); ctx.lineTo(458, 458); ctx.lineTo(496, 474); ctx.stroke(); } }
  }

  // 包裹
  const tossed = ease.inOut(seg(L, b('give'), .35));
  const bx = 200, by = 856, bs = .82;
  // 机器人：托着文件夹，抛上传送带，一路看着包裹过拱门；输入变了就举起新的文件夹，被闸杆拦住后回头看起点。
  const swap = L >= b('change') ? popIn(L, b('change'), .35) : 0, eyeX = clamp((px - bx) / 900, .3, 1);
  let pose = botMix({ armR: [.9, -1.3], frontR: true, lookX: .7, lookY: .2 }, { armR: [-.15, -.25], lookX: 1, lookY: -.1 }, ease.out(seg(L, b('give'), .25)));
  pose = botMix(pose, { ...BOTS.explain, lookX: eyeX, lookY: -.35, chest: 'play' }, seg(L, b('give') + .5, .3));
  pose = botMix(pose, { ...BOTS.cheer, lookX: 1 }, seg(L, b('h') + .2, .25) * (1 - seg(L, b('h') + 1.1, .3)));
  pose = botMix(pose, { ...BOTS.explain, armR: [-.75, -.3], lookX: 1, lookY: -1, chest: 'check' }, seg(L, b('hf'), .3));
  pose = botMix(pose, { armR: [-.6, -.3], eyes: 'wide', mouth: 'o', lookX: .8, lookY: -.5 }, seg(L, b('change'), .25));
  pose = botMix(pose, { ...BOTS.worry, armR: [-.6, -.3], lookX: 1 }, seg(L, b('resume'), .15) * (1 - seg(L, b('resume') + .7, .3)));
  pose = botMix(pose, { armR: [-.35, -.4], lookX: .8, lookY: .1 }, seg(L, b('resume') + .7, .3));
  const live = botAlive(t, talking, pose.mouth === 'smile' && pose.eyes !== 'happy' ? {} : pose);
  const nod = stage && stage < 8 ? Math.sin(clamp(since / .3) * Math.PI) * 10 : 0;
  const bot = drawBot(ctx, { ...pose, ...live, x: bx, y: by, s: bs, hop: nod + Math.sin(seg(L, b('h') + .2, .4) * Math.PI) * 36 + Math.sin(seg(L, b('resume'), .3) * Math.PI) * 16 });
  if (tossed < 1) { ctx.save(); ctx.translate(lerp(bot.handR[0], startX, tossed), lerp(bot.handR[1] + 6, s16_belt, tossed) - Math.sin(tossed * Math.PI) * 70); ctx.rotate(-.35 * Math.sin(tossed * Math.PI)); s16_pack(ctx, 0, 0, 0, 1, t); ctx.restore(); }
  else { ctx.save(); ctx.globalAlpha = 1 - .62 * stale; s16_pack(ctx, px, s16_belt, stage, since / .35, t); ctx.restore(); }
  // 放大看：包裹头顶一只圆窗，把它现在的样子放大，过一道拱门变一次样看得清。
  const lens = (L >= launch ? popIn(L, launch, .35) : 0) * (1 - ease.in(seg(L, b('change'), .25))), lx = clamp(px, ax(0), 1700), ly = 296;
  if (lens > 0) {
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([4, 14]); ctx.beginPath(); ctx.moveTo(px, s16_belt - 104); ctx.lineTo(lx, ly + 140 * lens); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(lx, ly); ctx.scale(lens, lens);
    ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.arc(8, 12, 140, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 134, 0, Math.PI * 2); ctx.clip(); ctx.translate(0, 98); ctx.scale(1.8, 1.8); s16_pack(ctx, 0, 0, stage, since / .35, t); ctx.restore();
    ctx.strokeStyle = stage && since < .3 ? '#ffd34d' : INDIGO; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 128, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 新的输入：同一只文件夹换了颜色。
  if (swap > 0) {
    ctx.save(); ctx.translate(bot.handR[0] + 26, bot.handR[1] - 38); ctx.scale(swap, swap); folder(ctx, 0, 0, 84, 58, 0, ORANGE); ctx.restore();
    sparkle(ctx, bot.handR[0] + 78, bot.handR[1] - 76, 30, Math.sin(seg(L, b('change'), .6) * Math.PI));
    burst(ctx, bot.handR[0] + 26, bot.handR[1] - 38, seg(L, b('change'), .35), 9, 50, 100, ORANGE);
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const eightAt = b('give') + .45 * (b('a') - b('give')), l0 = popIn(L, eightAt);
  if (l0 > 0) f.label('s16_eight', { ...at(200, 466), size: 58, color: INDIGO, halo: '#ffffff', scale: l0, alpha: vis });
  s16_keys.forEach((key, i) => {
    const k = popIn(L, b(key), .3);
    if (L >= b(key)) f.label('s16_' + key, { ...at(ax(i), 806), size: 44, color: '#ffffff', plate: (i === 4 || i === 5) && hfOn > .5 ? TEAL : INDIGO, scale: k, alpha: vis * seg(L, b(key), .08) });
  });
  if (L >= b('hf')) f.label('s16_hf', { ...at(1255, 386), size: 46, color: '#ffffff', plate: TEAL, scale: popIn(L, b('hf'), .35), alpha: vis * seg(L, b('hf'), .08) });
  const l9 = popIn(L, b('resume') + .3);
  if (l9 > 0) f.label('s16_redo', { ...at(790, 360), size: 50, color: '#ffffff', plate: ORANGE_D, scale: l9, alpha: vis });
}
