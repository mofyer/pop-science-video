// ---------- S22 回顾：路线图上六个站点依次亮起；镜头拉远，这幅画面原来是预览画布里的一帧 ----------
const s22_stops = [[400, 330], [668, 540], [936, 330], [1204, 540], [1472, 330], [1740, 540]];
const s22_path = [[300, 600], ...s22_stops];
// 一个站点：白底圆牌，on 从 0 到 1 时外圈由灰变靛蓝、图标由淡变实。六个图标依次是灯泡、三张纸、四张文件卡、八道拱门、三枚徽章、耳机。
function s22_stop(ctx, i, x, y, on, t) {
  const r = 72 * (1 + .09 * Math.sin(clamp(on) * Math.PI));
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (on > 0) { ctx.fillStyle = 'rgba(75,79,217,' + .16 * on + ')'; ctx.beginPath(); ctx.arc(0, 0, r + 18 + sway(t, 1.8, i * .17) * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = on > .5 ? INDIGO : '#c3c7d6'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha *= lerp(.3, 1, clamp(on));
  if (i === 0) icon(ctx, 'bulb', 0, -6, 1.4);
  else if (i === 1) { sheet(ctx, -24, 4, 38, 52, { rot: -.24, lines: 3 }); sheet(ctx, 24, 4, 38, 52, { rot: .24, lines: 3 }); sheet(ctx, 0, -3, 38, 52, { lines: 3 }); }
  else if (i === 2) [INDIGO, ORANGE, TEAL, '#ffd34d'].forEach((color, j) => { ctx.fillStyle = color; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect((j % 2 ? 4 : -38), (j < 2 ? -42 : 4), 34, 38, 7); ctx.fill(); ctx.stroke(); });
  else if (i === 3) {
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 6;
    for (let j = 0; j < 8; j++) { const ax = -39 + (j % 4) * 26, ay = j < 4 ? -4 : 36; ctx.beginPath(); ctx.moveTo(ax - 8, ay); ctx.lineTo(ax - 8, ay - 18); ctx.arc(ax, ay - 18, 8, Math.PI, 0); ctx.lineTo(ax + 8, ay); ctx.stroke(); }
  } else if (i === 4) for (const [bx, by] of [[-30, 12], [0, -18], [30, 12]]) {
    ctx.fillStyle = PAL.white; ctx.strokeStyle = INDIGO; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx - 2, by + 6); ctx.lineTo(bx + 8, by - 6); ctx.stroke();
  } else icon(ctx, 'ear', 0, -8, 1.3, 0, INDIGO);
  ctx.restore();
}
// 路线图这一幅画面（1920×1080）：背景、地面、路线、六个站点和沿路走的光点。u 是光点走完每一段的进度，on 是每个站点亮起的程度。
function s22_map(ctx, t, u, on) {
  studio(ctx, t, '#eaf2ff', '#fff7ea'); floor(ctx);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [color, w] of [[PAL.line, 30], ['#d9d5ee', 20]]) { ctx.strokeStyle = color; ctx.lineWidth = w; trace(ctx, s22_path, 1); }
  ctx.strokeStyle = PAL.white; ctx.lineWidth = 4; ctx.setLineDash([14, 18]); trace(ctx, s22_path, 1); ctx.setLineDash([]);
  let dot = s22_path[0];
  s22_stops.forEach((p, i) => {
    if (u[i] <= 0) return;
    const from = s22_path[i]; dot = [lerp(from[0], p[0], u[i]), lerp(from[1], p[1], u[i])];
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(dot[0], dot[1]); ctx.stroke();
  });
  s22_stops.forEach((p, i) => s22_stop(ctx, i, p[0], p[1], on[i], t));
  ctx.fillStyle = 'rgba(255,211,77,.4)'; ctx.beginPath(); ctx.arc(dot[0], dot[1], 30 + sway(t, .7) * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(dot[0], dot[1], 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function scene22(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const keys = ['topic', 'three', 'four', 'eight', 'checks', 'ear'];
  // “这一支”：整幅画面缩进右边的预览画布；随后代码一行一行敲出来，预览里的站点跟着重新亮一遍。
  const back = ease.inOut(seg(L, b('this'), .9)), rewind = seg(L, b('this') + .9, .15), again = b('this') + 1.0;
  const u = keys.map((key, i) => lerp(ease.inOut(seg(L, b(key) - .5, .5)), seg(L, again + i * .26, .26), rewind));
  const on = keys.map((key, i) => lerp(seg(L, b(key), .2), seg(L, again + (i + 1) * .26 - .08, .12), rewind));
  const typed = (seg(L, b('this') + .5, .4) + keys.reduce((sum, key, i) => sum + seg(L, again + i * .26, .26), 0) + seg(L, again + 6 * .26, .2)) / 8;
  const sc = lerp(1, 760 / 1920, back), mx = lerp(0, 1030, back), my = lerp(0, 250, back);
  const cam = makeCam(960, 545, 1 + .03 * seg(L, 0, D));
  studio(ctx, t);
  ctx.save(); cam.apply(ctx);
  floor(ctx);
  if (back > 0) {
    // 两块屏各有一根支架；代码窗口在左边的支架顶上长出来，不从画框外滑入。
    const wx = 110;
    ctx.lineCap = 'round'; ctx.globalAlpha = back;
    for (const x of [wx + 300, 1410]) for (const [color, w] of [[PAL.line, 24], [GREY, 14]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, 640); ctx.lineTo(x, 842); ctx.moveTo(x - 70, 846); ctx.lineTo(x + 70, 846); ctx.stroke(); }
    ctx.save(); ctx.translate(wx + 300, 650); ctx.scale(back, back); ctx.translate(-wx - 300, -650); codeWindow(ctx, wx, 250, 600, 400, typed, t); ctx.restore();
    ctx.globalAlpha = back; ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(mx - 8, my, 1920 * sc + 32, 1080 * sc + 32, 24); ctx.fill();
    ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(mx - 16, my - 16, 1920 * sc + 32, 1080 * sc + 32, 24); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(mx, my); ctx.scale(sc, sc); ctx.beginPath(); ctx.roundRect(0, 0, 1920, 1080, 30 * back); ctx.clip();
  s22_map(ctx, t, u, on);
  ctx.restore();

  // 机器人：先站在画面左下角放出光点，每亮一站点一下头；“人的耳朵”时把手拢到耳边；画面缩小时吓一跳，两跳到中间朝观众挥手。
  let nod = 0; keys.forEach(key => { nod += Math.sin(seg(L, b(key), .25) * Math.PI) * 16; });
  const j1 = seg(L, b('this') + .15, .36), j2 = seg(L, b('this') + .51, .36), waving = seg(L, b('this') + .85, .3);
  let pose = botMix(BOTS.idle, { ...BOTS.explain, lookY: -.6 }, seg(L, b('topic') - .6, .3) * (1 - seg(L, b('ear') - .2, .3)));
  pose = botMix(pose, { armR: [-1.2, -.6], eyes: 'happy', headTilt: .08 }, seg(L, b('ear'), .3) * (1 - seg(L, b('this') - .1, .2)));
  pose = botMix(pose, BOTS.surprise, seg(L, b('this'), .15) * (1 - seg(L, b('this') + .5, .3)));
  pose = botMix(pose, BOTS.wave, waving);
  drawBot(ctx, { ...pose, ...botAlive(t, talking), x: 190 + 335 * j1 + 335 * j2, y: 856, s: .85, lookX: 1 - waving,
    armR: [pose.armR[0], pose.armR[1] + Math.sin(t * 9) * .32 * waving], chest: back > .5 ? 'braces' : 'dot',
    hop: nod + Math.sin(j1 * Math.PI) * 70 + Math.sin(j2 * Math.PI) * 70 + waving * Math.abs(sway(t, .9)) * 14,
    squash: sway(t, 3.1) * .012 + Math.sin(seg(L, b('this') + .87, .2) * Math.PI) * .08 });
  ctx.restore();

  // 站点的标签贴在画面里：上排的在站点上方，下排的在下方；画面缩小时一起淡出。
  const names = ['s22_topic', 's22_three', 's22_four', 's22_eight', 's22_checks', 's22_ear'], fade = 1 - seg(L, b('this'), .25);
  if (fade > 0) keys.forEach((key, i) => {
    const k = popIn(L, b(key) + .12); if (k <= 0) return;
    const p = cam.p(mx + s22_stops[i][0] * sc, my + (s22_stops[i][1] + (i % 2 ? 118 : -118)) * sc);
    f.label(names[i], { x: p[0], y: p[1], size: 44, color: '#ffffff', plate: i === 5 ? TEAL : INDIGO, scale: k * sc, alpha: vis * fade });
  });
  const l7 = popIn(L, b('this') + .9);
  if (l7 > 0) { const p = cam.p(1410, 186); f.label('s22_this', { x: p[0], y: p[1], size: 46, color: '#ffffff', plate: ORANGE_D, scale: l7, alpha: vis }); }
}
