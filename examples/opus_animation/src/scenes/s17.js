// ---------- S17 第一道自检：预览拼图，每镜取三帧拼成一张图，模型自己看 ----------
// 拼图里有毛病的三格：哪一格、什么毛病、对应哪个节拍。
const s17_bad = { 1: 'ghost', 5: 'over', 6: 'corner' };
const s17_acts = ['idle', 'explain', 'cheer', 'wave', 'think', 'surprise', 'pat', 'lens', 'stop'];

// 拼图里的一格：一幅小画面，里面一个小机器人和一块标签牌。kind 决定它有没有毛病：
// ok 正常；ghost 角色只剩地上的影子；over 标签牌盖在角色脸上；corner 所有东西缩在左下角。
function s17_cell(ctx, x, y, w, h, kind, i, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 6); ctx.clip();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#dfe7ff'); g.addColorStop(1, '#fdf6ea');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#d6d2ee'; ctx.fillRect(-w / 2, h * .3, w, h);
  if (kind === 'corner') { ctx.translate(-w * .24, h * .2); ctx.scale(.4, .4); }
  const s = h * .6 / 375, bx = -w * .2, gy = h * .3;
  if (kind === 'ghost') {
    ctx.fillStyle = 'rgba(40,40,80,.34)'; ctx.beginPath(); ctx.ellipse(bx, gy + 3, 100 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,80,.3)'; ctx.lineWidth = 3; ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.roundRect(bx - 88 * s, gy - 340 * s, 176 * s, 336 * s, 30 * s); ctx.stroke(); ctx.setLineDash([]);
  } else drawBot(ctx, { ...BOTS[s17_acts[i % s17_acts.length]], blink: blinkAt(t + i, 3.6, .9), halo: 0, x: bx, y: gy, s });
  const plateAt = kind === 'over' ? [bx + 4, gy - 262 * s] : [w * .2, -h * .14], pw = w * .36, ph = h * .2;
  ctx.fillStyle = kind === 'over' ? ORANGE_D : INDIGO; ctx.beginPath(); ctx.roundRect(plateAt[0] - pw / 2, plateAt[1] - ph / 2, pw, ph, ph / 2); ctx.fill();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = ph * .2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(plateAt[0] - pw * .28, plateAt[1]); ctx.lineTo(plateAt[0] + pw * .28, plateAt[1]); ctx.stroke();
  ctx.restore();
}
// 放大镜：镜片在 (x, y)，柄伸到手 (hx, hy)；inside 负责画镜片里的东西。
function s17_lens(ctx, x, y, r, hx, hy, rim, inside) {
  const a = Math.atan2(hy - y, hx - x), ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = INDIGO; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = 'rgba(40,40,80,.13)'; ctx.beginPath(); ctx.arc(x + 8, y + 12, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 6, 0, Math.PI * 2); ctx.clip(); inside(); ctx.restore();
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = rim; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r - 22, Math.PI * 1.12, Math.PI * 1.4); ctx.stroke();
}

function scene17(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const cw = 196, ch = 122, gap = 14, gx = 570, gy = 330;
  const cells = []; for (let i = 0; i < 9; i++) cells.push([gx + (i % 3) * (cw + gap) + cw / 2, gy + Math.floor(i / 3) * (ch + gap) + ch / 2]);
  const stripY = r => 384 + r * 124, dotU = [.12, .5, .92], step = clamp((b('look') - b('shots') - .75) / 9, .05, .14);
  const chosen = ease.inOut(seg(L, b('preview'), .35));
  // 放大镜扫过拼图的路线：什么时刻停在第几格。三处毛病正好在各自的节拍上被照到，照到了就停住，快到下一处才挪开。
  const stops = [[b('look') + .3, 0], [b('broken'), 1], [b('over') - .3, 2], [b('over') - .2, 3], [b('over') - .1, 4], [b('over'), 5], [b('corner'), 6]];
  let scan = cells[0], cur = 0;
  for (const [at, i] of stops.slice(1)) { const k = ease.inOut(seg(L, at - .1, .1)); scan = [lerp(scan[0], cells[i][0], k), lerp(scan[1], cells[i][1], k)]; if (L >= at - .05) cur = i; }
  const looking = L >= b('look') ? popIn(L, b('look'), .4) : 0;
  const found = [['broken', 1], ['over', 5], ['corner', 6]];
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#eaf1ff', '#fff7ec');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 三枚徽章：依次弹出；说到第一道，它放大，另外两枚退后。
  ['lines', 'check', 'play'].forEach((kind, i) => {
    const pop = seg(L, b('three') + i * .22, .2), bump = Math.sin(seg(L, b('three') + i * .22, .4) * Math.PI) * .22;
    const on = i ? pop * (1 - chosen) : pop, size = (i ? lerp(1, .82, chosen) : lerp(1, 1.28, chosen)) * (.86 + .14 * pop + bump);
    badge(ctx, i ? lerp(190 + i * 150, 508 + i * 102, chosen) : 190, 196, 50, kind, on, t, size);
  });

  // 左边三条镜头条：每条是一镜的时间，上面各取三个点。
  for (let r = 0; r < 3; r++) {
    const y = stripY(r), u = (t * .11 + r * .31) % 1;
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(100, y - 22, 370, 44, 22); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(104, y - 18, 362, 36, 18); ctx.clip(); ctx.fillStyle = LILAC; ctx.fillRect(100, y - 22, 370 * u, 44); ctx.restore();
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(100 + 370 * u, y - 30); ctx.lineTo(100 + 370 * u, y + 30); ctx.stroke();
    dotU.forEach((v, c) => {
      const k = L >= b('shots') + (r * 3 + c) * step ? popIn(L, b('shots') + (r * 3 + c) * step, .25) : 0; if (k <= 0) return;
      ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(100 + 370 * v, y, 13 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }

  // 拼图：九个空位从一开始就在；取样点变成小帧，飞过来拼成三列三行。
  cells.forEach(([x, y], i) => {
    ctx.strokeStyle = LILAC; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.roundRect(x - cw / 2, y - ch / 2, cw, ch, 10); ctx.stroke(); ctx.setLineDash([]);
  });
  cells.forEach(([x, y], i) => {
    const r = Math.floor(i / 3), c = i % 3, k = ease.out(seg(L, b('shots') + i * step + .12, .4)); if (k <= 0) return;
    const fx = lerp(100 + 370 * dotU[c], x, k), fy = lerp(stripY(r), y, k) - Math.sin(k * Math.PI) * 50, size = lerp(.22, 1, k);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(size, size); s17_cell(ctx, 0, 0, cw, ch, s17_bad[i] ?? 'ok', i, t); ctx.restore();
  });
  // 圈出毛病：橙色的圈一笔画出来，不回弹。
  found.forEach(([key, i]) => {
    const k = ease.inOut(seg(L, b(key), .35)); if (k <= 0) return;
    ctx.lineCap = 'round';
    for (const [color, width] of [[PAL.white, 15], [ORANGE, 8]]) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.ellipse(cells[i][0], cells[i][1], cw * .6, ch * .68, -.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
  });
  // 正在看的那一格
  if (looking > 0) {
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.globalAlpha = clamp(looking);
    ctx.beginPath(); ctx.roundRect(scan[0] - cw / 2 - 7, scan[1] - ch / 2 - 7, cw + 14, ch + 14, 14); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // 机器人：数徽章，看小帧飞过去，举起放大镜一格一格看，照到毛病就一愣。
  const bx = 1700, by = 856, bs = .85;
  const flinch = found.reduce((a, [key]) => Math.max(a, seg(L, b(key), .12) * (1 - seg(L, b(key) + .55, .3))), 0);
  const jolt = found.reduce((a, [key]) => a + Math.sin(seg(L, b(key), .3) * Math.PI) * 20, 0);
  let pose = botMix({ lookX: 1, lookY: -.6 }, { ...BOTS.explain, armR: [-.55, -.35], lookY: -.8 }, seg(L, b('three') - .1, .3));
  pose = botMix(pose, { armR: [-.8, -.45], lookX: 1, lookY: -.9, chest: 'lines', halo: .5, mouthOpen: .5 }, seg(L, b('preview'), .3));
  pose = botMix(pose, { lookX: 1, lookY: -.1 + .3 * sway(t, 1.3), chest: 'lines' }, seg(L, b('shots'), .3));
  pose = botMix(pose, { ...BOTS.lens, lookY: clamp((scan[1] - 560) / 200, -1, 1) }, seg(L, b('look') - .1, .3));
  pose = botMix(pose, { ...BOTS.lens, eyes: 'worry', mouth: 'wavy', headTilt: -.06 }, flinch);
  const live = botAlive(t, talking, pose.mouth === 'smile' && pose.eyes !== 'happy' ? {} : pose);
  const bot = drawBot(ctx, { ...pose, ...live, x: bx, y: by, s: bs, dir: -1, hop: jolt + Math.sin(seg(L, b('look'), .35) * Math.PI) * 26 });
  if (looking > 0) {
    const r = 150 * looking, lx = bot.handR[0] - 228 * looking, ly = bot.handR[1] - 214 * looking;
    // 从正在看的那一格连到镜片
    ctx.strokeStyle = 'rgba(75,79,217,.5)'; ctx.lineWidth = 5; ctx.setLineDash([4, 14]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(scan[0] + cw / 2 + 8, scan[1]); ctx.lineTo(lx - r, ly); ctx.stroke(); ctx.setLineDash([]);
    s17_lens(ctx, lx, ly, r, bot.handR[0], bot.handR[1], s17_bad[cur] && L >= stops.find(v => v[1] === cur)[0] ? ORANGE : INDIGO, () => {
      ctx.translate(lx, ly); ctx.scale(1.45 * looking, 1.45 * looking); s17_cell(ctx, 0, 0, cw, ch, s17_bad[cur] ?? 'ok', cur, t);
    });
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('three') + .5);
  if (l1 > 0) f.label('s17_three', { ...at(690, 196), size: 56, color: INDIGO, halo: '#ffffff', scale: l1, alpha: vis * (1 - seg(L, b('preview') - .25, .2)) });
  const l2 = popIn(L, b('preview') + .15);
  if (l2 > 0) f.label('s17_preview', { ...at(398, 196), size: 50, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis });
  const l3 = popIn(L, b('shots') + .45);
  if (l3 > 0) f.label('s17_shots', { ...at(285, 742), size: 46, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis });
  found.forEach(([key], n) => {
    const k = popIn(L, b(key) + .2), next = found[n + 1];
    if (k > 0) f.label('s17_' + key, { ...at(1352, 244), size: 50, color: '#ffffff', plate: ORANGE_D, scale: k, alpha: vis * (next ? 1 - seg(L, b(next[0]) - .45, .15) : 1) });
  });
}
