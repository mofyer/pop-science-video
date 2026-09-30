// ---------- S02 原理：它输出的是文字，代码也是文字 ----------
function scene02(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const tape = ease.out(seg(L, b('lm'), .8)), text = seg(L, b('text'), 1.0), bump = seg(L, b('novideo'), .5);
  const roll = ease.inOut(seg(L, b('code'), .7)), plug = ease.inOut(seg(L, b('prog'), .7)), run = seg(L, b('time'), b('thirty') - b('time') + .6);
  const flip = seg(L, b('thirty'), 1.1), link = ease.inOut(seg(L, b('link'), .9));
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#e9f0ff', '#fff9f0');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 画布：先是暗的，代码牌插进去才亮；时间轴在它下面。
  const cx = 1010, cy = 250, cw = 700, ch = 440, lit = plug;
  ctx.strokeStyle = PAL.line; ctx.lineCap = 'round';
  for (const x of [cx + 120, cx + cw - 120]) { ctx.lineWidth = 26; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(x, cy + ch); ctx.lineTo(x, 850); ctx.stroke(); ctx.lineWidth = 16; ctx.strokeStyle = '#8d97ad'; ctx.beginPath(); ctx.moveTo(x, cy + ch); ctx.lineTo(x, 850); ctx.stroke(); }
  // “三十张”：画布后面翻出一叠画纸，一张张翻过去。
  if (flip > 0 && link < 1) for (let i = 0; i < 7; i++) {
    const k = clamp(flip * 9 - i * 1.15), up = Math.sin(clamp(k) * Math.PI);
    ctx.save(); ctx.globalAlpha = (1 - link) * clamp(flip * 4); ctx.translate(cx + cw / 2 + 26 + i * 9, cy - 14 - i * 9 - up * 70); ctx.rotate(up * -.22);
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-cw / 2, 0, cw, 120, 12); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(cx - 18, cy - 18, cw + 36, ch + 36, 26); ctx.fill(); ctx.stroke();
  const u = link > 0 ? (t * .16) % 1 : ease.inOut(run);
  miniScene(ctx, cx, cy, cw, ch, link > 0 ? t : run * 3.2, { frozen: lit < .5, r: 12 });
  if (lit < 1) { ctx.fillStyle = 'rgba(44,47,72,' + .28 * (1 - lit) + ')'; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.fill(); }
  // 侧面的插槽
  ctx.fillStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(cx - 40, cy + ch / 2 - 60, 30, 120, 10); ctx.fill(); ctx.stroke();
  // 时间轴与指针
  const ty = 770;
  ctx.lineWidth = 16; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + cw, ty); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = '#c9c4ee'; ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + cw, ty); ctx.stroke();
  ctx.strokeStyle = INDIGO; ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + cw * u, ty); ctx.stroke();
  for (let i = 0; i <= 10; i++) { ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + cw * i / 10, ty + 16); ctx.lineTo(cx + cw * i / 10, ty + (i % 5 ? 28 : 38)); ctx.stroke(); }
  ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + cw * u, ty - 12); ctx.lineTo(cx + cw * u - 20, ty - 46); ctx.lineTo(cx + cw * u + 20, ty - 46); ctx.closePath(); ctx.fill(); ctx.stroke();

  // “连起来”：画纸排成一条胶片，从右往左走，每格里的小球接着上一格的位置。
  if (link > 0) {
    ctx.save(); ctx.globalAlpha = link;
    const y = lerp(60, 130, link);
    for (let i = 0; i < 9; i++) {
      const x = cx + cw + 120 - ((t * 120 + i * 150) % 1350);
      if (x > cx - 170 && x < cx + cw + 60) filmFrame(ctx, x, y, 138, 0, t - ((t * 120 + i * 150) % 1350) / 120 * .5, clamp((cx + cw + 60 - x) / 90) * clamp((x - cx + 170) / 90));
    }
    ctx.restore();
  }

  // 纸带：从机器人嘴边吐出来，上面写出一行行“字”；“代码也是文字”时卷起来变成代码牌。
  const bot = { x: 330, y: 856, s: .92 }, mouth = [bot.x + 12, bot.y - 228 * bot.s];
  const plateAt = [lerp(700, cx - 26, plug), lerp(520, cy + ch / 2, plug)];
  if (tape > 0 && roll < 1) {
    const len = 330 * tape * (1 - roll), x0 = lerp(mouth[0] + 70, plateAt[0] - 165, roll), y0 = lerp(mouth[1] + 4, plateAt[1], roll), wave = k => Math.sin(k * 5 + t * 2.4) * 10 * (1 - roll);
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    for (const [color, w] of [[PAL.line, 64], [PAPER, 54]]) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0 + wave(0));
      for (let k = .05; k <= 1.001; k += .05) ctx.lineTo(x0 + len * k, y0 - 50 * k * (1 - roll) + wave(k));
      ctx.stroke();
    }
    ctx.lineCap = 'round'; ctx.strokeStyle = '#8d97ad'; ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const k0 = .08 + i * .15, p = clamp(text * 6 - i); if (p <= 0 || k0 > .96) continue;
      for (const dy of [-12, 10]) { ctx.beginPath(); ctx.moveTo(x0 + len * k0, y0 - 50 * k0 * (1 - roll) + wave(k0) + dy); ctx.lineTo(x0 + len * (k0 + .1 * p), y0 - 50 * (k0 + .1) * (1 - roll) + wave(k0 + .1) + dy); ctx.stroke(); }
    }
  }
  if (roll > 0) codePlate(ctx, plateAt[0], plateAt[1], 330, 150, seg(L, b('code') + .4, .8), ease.back(clamp(roll)) * lerp(1, .42, plug), plug * Math.PI / 2);

  // 胶片盒飘过来，碰到纸带被弹开，只剩虚线轮廓。
  const can = seg(L, b('novideo') - .9, .9);
  if (can > 0 && roll < 1) {
    const hit = ease.out(bump), x = lerp(lerp(1150, 640, ease.inOut(can)), 560, hit), y = lerp(lerp(130, 500, ease.in(can)), 250, hit);
    ctx.save(); ctx.globalAlpha = (1 - roll) * clamp(can * 4); filmCan(ctx, x, y + sway(t, 2.4) * 8 * hit, 74, t * .8 + can * 3, clamp(bump * 1.6)); ctx.restore();
    burst(ctx, 650, 520, seg(L, b('novideo'), .4), 9, 40, 130, ORANGE);
  }

  // 机器人：张嘴吐纸带；抬手挡开胶片盒；指向画布；最后欢呼。
  const pose = botMix(botMix(botMix(botMix(BOTS.idle, BOTS.stop, seg(L, b('novideo') - .5, .3) * (1 - seg(L, b('code') - .2, .3))), BOTS.explain, seg(L, b('prog') - .2, .3)), BOTS.surprise, seg(L, b('thirty'), .25) * (1 - seg(L, b('link') - .2, .3))), BOTS.cheer, seg(L, b('link'), .3));
  drawBot(ctx, { ...pose, ...botAlive(t, talking), ...bot, lookX: 1,
    hop: Math.sin(seg(L, b('prog') + .55, .35) * Math.PI) * 40 + seg(L, b('link'), .3) * Math.abs(sway(t, .9)) * 36, chest: roll > .5 ? 'braces' : 'dot' });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const gone = 1 - seg(L, b('code') - .2, .3);
  const l1 = popIn(L, b('text') + .5);
  if (l1 > 0) f.label('s02_text', { ...at(620, 690), size: 52, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis * gone });
  const l2 = popIn(L, b('novideo') + .3);
  if (l2 > 0) f.label('s02_novideo', { ...at(560, 130), size: 48, color: ORANGE_D, halo: '#ffffff', scale: l2, alpha: vis * gone });
  const l3 = popIn(L, b('code') + .6);
  if (l3 > 0) f.label('s02_code', { ...at(640, 690), size: 50, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis * (1 - seg(L, b('time') - .2, .3)) });
  const l4 = popIn(L, b('time') + .3);
  if (l4 > 0) f.label('s02_time', { ...at(cx + cw / 2, 850), size: 46, color: INDIGO, halo: '#ffffff', scale: l4, alpha: vis });
  const l5 = popIn(L, b('thirty') + .3);
  if (l5 > 0) f.label('s02_thirty', { ...at(640, 690), size: 56, color: '#ffffff', plate: ORANGE_D, scale: l5, alpha: vis });
}
