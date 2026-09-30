// ---------- S07 四条硬规则：四块小牌从说明书里弹出来，各演一条 ----------
// 四块牌排成两行两列：[x, y]。
const s07_AT = [[1050, 262], [1500, 262], [1050, 645], [1500, 645]], s07_S = 1.26, s07_BOOK = [270, 700];
// 第三块牌里的小球和牌底的字格共用一套节奏：每 s07_P 秒落地一次，落点依次对准各个字格（0 1 2 3 4 3 2 1 …）。
const s07_P = .62, s07_CELL = 46;
function s07_hit(tau) { const i = Math.floor(tau / s07_P) % 8; return i < 5 ? i : 8 - i; }

// 小牌：白底圆角牌，左上角一枚小签用圆点标第几条；内容由 inside 在裁剪区里画。
function s07_board(ctx, x, y, s, n, inside) {
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(40,40,80,.13)'; ctx.beginPath(); ctx.roundRect(-124, -98, 260, 220, 22); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-130, -110, 260, 220, 22); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-120, -100, 240, 200, 14); ctx.clip(); inside(); ctx.restore();
  ctx.fillStyle = INDIGO; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-130, -110, 22 + n * 15, 30, [22, 0, 12, 0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.white; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(-112 + i * 15, -95, 4.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// 一张满是字的卡片。
function s07_card(ctx) {
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-84, -66, 168, 132, 10); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-62, -40); ctx.lineTo(30, -40); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.lineWidth = 7;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-62, -12 + i * 20); ctx.lineTo(i % 2 ? 40 : 62, -12 + i * 20); ctx.stroke(); }
}
// 第一条：文字卡片被划掉，裂成两半落下。k 是“文字卡片”说出口之后的秒数。
function s07_rule1(ctx, k) {
  const split = ease.in(seg(k, .35, .5)), land = Math.sin(seg(k, .85, .25) * Math.PI) * 6;
  ctx.fillStyle = '#f4f2fb'; ctx.fillRect(-120, -100, 240, 200);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * split * 34, split * 58 - land); ctx.rotate(side * split * .42);
    ctx.beginPath(); ctx.rect(side < 0 ? -100 : 0, -90, 100, 180); ctx.clip(); s07_card(ctx); ctx.restore();
  }
  mark(ctx, 'cross', 0, -8 - 30 * split, 2.1, seg(k, 0, .3), ORANGE_D);
}
// 第二条：空牌里长出天、地面、太阳，一个小球掉进来弹几下，然后来回滚。
function s07_rule2(ctx, k, t) {
  if (k <= 0) { ctx.strokeStyle = LILAC; ctx.lineWidth = 5; ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.roundRect(-84, -66, 168, 132, 12); ctx.stroke(); ctx.setLineDash([]); return; }
  const up = ease.out(seg(k, 0, .45)), sun = popIn(k, .2), fall = k - .4, g = ctx.createLinearGradient(0, -100, 0, 100);
  g.addColorStop(0, '#d9e4ff'); g.addColorStop(1, '#fdf6ea');
  ctx.globalAlpha = seg(k, 0, .3); ctx.fillStyle = g; ctx.fillRect(-120, -100, 240, 200); ctx.globalAlpha = 1;
  ctx.fillStyle = '#c9c4ee'; ctx.fillRect(-120, 100 - 56 * up, 240, 60);
  if (sun > 0) sunDisc(ctx, 66, -46, 22 * sun, t, sun);
  if (fall <= 0) return;
  const h = fall < .25 ? 170 * (1 - ease.in(fall / .25)) : Math.abs(Math.sin((fall - .25) * Math.PI / .4)) * 56 * Math.exp(-(fall - .25) * 2);
  const roll = Math.sin(Math.max(0, k - 1.3) * 1.5) * 34, x = -40 + roll, y = 44 - 20 - h;
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(x, 48, 22 - Math.min(10, h * .1), 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + Math.cos(roll / 20) * 9, y + Math.sin(roll / 20) * 9, 5, 0, Math.PI * 2); ctx.fill();
}
// 第三条：小球一直在弹；“动在字上”时牌底升起一行字格，亮到哪一格，小球正好落在那一格上方。
// tau 是“一直在动”说出口之后的秒数，不到 0 时球停在地上；cells 是字格条出现的进度。
function s07_rule3(ctx, tau, cells) {
  const live = tau > 0, ph = live ? (tau / s07_P) % 1 : 0, from = live ? s07_hit(tau) : 0, to = live ? s07_hit(tau + s07_P) : 0, ground = 34;
  const at = p => [(lerp(from, to, p) - 2) * s07_CELL, ground - 20 - Math.sin(p * Math.PI) * 88];
  ctx.fillStyle = '#eef0ff'; ctx.fillRect(-120, -100, 240, 200); ctx.fillStyle = '#c9c4ee'; ctx.fillRect(-120, ground, 240, 80);
  const [x, y] = at(ph), squash = live ? Math.max(0, 1 - ph * 7) + Math.max(0, ph * 7 - 6) : 0;
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(x, ground + 4, 22 - (ground - 20 - y) * .1, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (live) for (let i = 3; i >= 1; i--) { const p = at(Math.max(0, ph - i * .07)); ctx.fillStyle = 'rgba(240,138,60,' + (.34 - i * .08) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 19, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = live ? ORANGE : GREY; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.ellipse(x, y + squash * 5, 20 * (1 + squash * .22), 20 * (1 - squash * .22), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (live) burst(ctx, (from - 2) * s07_CELL, ground + 2, ph * 3, 7, 16, 40, ORANGE);
  if (cells <= 0) return;
  const hit = s07_hit(tau), flash = Math.max(0, 1 - ph * 3), top = 100 - 52 * ease.out(clamp(cells * 2.5));
  ctx.fillStyle = PAL.white; ctx.fillRect(-120, top, 240, 60); ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-120, top); ctx.lineTo(120, top); ctx.stroke();
  // 亮着的那一格上方有个小箭头，指着小球的落点。
  if (cells >= 1) { const px = (hit - 2) * s07_CELL; ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.moveTo(px, top - 12 - 4 * flash); ctx.lineTo(px - 9, top + 2); ctx.lineTo(px + 9, top + 2); ctx.closePath(); ctx.fill(); }
  for (let j = 0; j < 5; j++) {
    const p = ease.back(clamp(cells * 3 - .8 - j * .3)) * (j === hit ? 1 + .2 * flash : 1); if (p <= 0) continue;
    const cx = (j - 2) * s07_CELL, cy = top + 27;
    ctx.fillStyle = j === hit ? INDIGO : LILAC; ctx.strokeStyle = j === hit && flash > 0 ? ORANGE : PAL.line; ctx.lineWidth = j === hit ? 4 + 3 * flash : 4;
    ctx.beginPath(); ctx.roundRect(cx - 19 * p, cy - 14 * p, 38 * p, 28 * p, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 9 * p, cy); ctx.lineTo(cx + 9 * p, cy); ctx.stroke();
  }
}
// 第四条：灰色僵立的小机器人变成彩色，挥手、跳起来。k 是“要演”说出口之后的秒数。
function s07_rule4(ctx, k, t) {
  const on = seg(k, 0, .3), jump = k > 0 ? Math.abs(Math.sin(k * Math.PI / .55)) : 0;
  ctx.fillStyle = '#eef0ff'; ctx.fillRect(-120, -100, 240, 200); ctx.fillStyle = '#c9c4ee'; ctx.fillRect(-120, 62, 240, 60);
  const pose = botMix({ armL: [1.62, 0], armR: [1.52, 0], mouth: 'flat' }, { ...BOTS.wave, armR: [-.9 + Math.sin(t * 9) * .35, -.7] }, on);
  drawBot(ctx, { ...pose, x: 0, y: 86, s: .42, hop: jump * 70, squash: on * (1 - jump) * .07, blink: on > 0 ? blinkAt(t, 3, .5) : 0, ant: on * sway(t, .7) });
  if (on < 1) { ctx.fillStyle = 'rgba(214,214,224,' + .8 * (1 - on) + ')'; ctx.fillRect(-120, -100, 240, 200); }
}

function scene07(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const span = (from, to, d = .25) => seg(L, from, d) * (1 - seg(L, to, d));
  // 正在讲哪一块牌：那一块抬高、放大，讲完放回去。
  const focus = [span(b('card') - .1, b('scene') - .9), span(b('scene') - .8, b('moving') - .3), span(b('moving') - .2, b('act') - .35), span(b('act') - .25, b('stand') + .05)].map(k => ease.inOut(k));
  const tau = L - b('moving'), jump = Math.sin(seg(L, b('stand'), .5) * Math.PI);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#eef0ff', '#fff7ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 说明书：讲过一条，页面上就亮一行。
  const lit = (seg(L, b('card'), .3) + seg(L, b('scene'), .3) + seg(L, b('moving'), .3) + seg(L, b('act'), .3)) * .1;
  book(ctx, s07_BOOK[0], s07_BOOK[1] + sway(t, 3.1) * 4 - jump * 76, 1, 1, lit);

  // 机器人：左手扶着说明书，右手指着正在讲的那块牌；“不做”时摇头，小球弹时跟着点，最后自己也跳一下。
  const bot = { x: 560, y: 856, s: .95 }, aim = Math.max(...focus), sum = focus.reduce((a, c) => a + c, 0) || 1;
  const target = [0, 1].map(axis => focus.reduce((a, c, i) => a + c * s07_AT[i][axis], 0) / sum);
  const angle = Math.atan2(target[1] - (bot.y - 150 * bot.s), target[0] - (bot.x + 84 * bot.s));
  let pose = botMix({ lookX: -1, lookY: .7 }, BOTS.surprise, span(b('four'), b('four') + .7, .2));
  pose = botMix(pose, { lookX: .8, lookY: -.3 }, seg(L, b('four') + .7, .3));
  pose = botMix(pose, { armR: [angle, -.12], lookX: 1, lookY: clamp((target[1] - 600) / 300, -1, 1) }, aim);
  pose = botMix(pose, { ...BOTS.stop, armR: [angle, -.1], lookY: -.5 }, span(b('card'), b('card') + .9, .2));
  pose = botMix(pose, { ...BOTS.wave, armR: [-.9 + Math.sin(t * 9) * .35, -.7], lookX: 1 }, span(b('act') + .1, b('stand') - .05, .2));
  pose = botMix(pose, { ...BOTS.cheer, lookX: 0 }, seg(L, b('stand'), .2));
  const alive = botAlive(t, talking), shake = seg(L, b('card') + .05, .7), bob = tau > 0 ? focus[2] * Math.abs(Math.sin(tau * Math.PI / s07_P)) : 0;
  drawBot(ctx, { ...pose, ...alive, ...bot, armL: reach(-BOT_SHOULDER[0], BOT_SHOULDER[1], -132, -156, BOT_ARM[0], BOT_ARM[1]), frontL: true,
    headTilt: pose.headTilt + sway(t, 2.7) * .03 + Math.sin(shake * Math.PI * 4) * .11 * (1 - shake), mouthOpen: Math.max(pose.mouthOpen, alive.mouthOpen || 0),
    hop: jump * 80 + bob * 12 + Math.sin(seg(L, b('scene') - .8, .35) * Math.PI) * 22, squash: alive.squash + bob * .015 });

  // 四块小牌从书页里弹出来，排成两行两列。
  s07_AT.forEach(([x, y], i) => {
    const born = seg(L, b('four') + i * .12, .5), wave = Math.sin(seg(L, b('stand') + .1 + i * .07, .4) * Math.PI) * 22;
    s07_board(ctx, lerp(s07_BOOK[0], x, ease.out(born)), lerp(s07_BOOK[1] - 30, y, ease.out(born)) - Math.sin(born * Math.PI) * 110 - focus[i] * 10 - wave + sway(t, 3.3 + i * .3, i * .23) * 4 * born,
      ease.back(born) * s07_S * (1 + .06 * focus[i]), i + 1, () => {
        if (i === 0) s07_rule1(ctx, L - b('card'));
        else if (i === 1) s07_rule2(ctx, L - b('scene'), t);
        else if (i === 2) s07_rule3(ctx, tau, seg(L, b('onword'), .5));
        else s07_rule4(ctx, L - b('act'), t);
      });
  });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const under = i => at(s07_AT[i][0], s07_AT[i][1] + 110 * s07_S + 36);
  const l0 = popIn(L, b('four') + .35);
  if (l0 > 0) f.label('s07_four', { ...at(s07_BOOK[0], 455), size: 50, color: '#ffffff', plate: INDIGO, scale: l0, alpha: vis });
  const l1 = popIn(L, b('card') + .35);
  if (l1 > 0) f.label('s07_card', { ...under(0), size: 46, color: ORANGE_D, halo: '#ffffff', scale: l1, alpha: vis });
  const l2 = popIn(L, b('scene') + .3);
  if (l2 > 0) f.label('s07_scene', { ...under(1), size: 46, color: INDIGO, halo: '#ffffff', scale: l2, alpha: vis });
  const l3 = popIn(L, b('onword') + .3);
  if (l3 > 0) f.label('s07_onword', { ...under(2), size: 46, color: INDIGO, halo: '#ffffff', scale: l3, alpha: vis });
  const l4 = popIn(L, b('act') + .3);
  if (l4 > 0) f.label('s07_act', { ...under(3), size: 46, color: TEAL, halo: '#ffffff', scale: l4, alpha: vis });
}
