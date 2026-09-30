// ---------- S13 第二步出片：文件夹里放进四个文件，其余由引擎生成 ----------
// 四个槽的中心；最后一个（画面代码）是下一镜圆形展开的起点。
const s13_X = [730, 980, 1230, 1480], s13_SY = 360, s13_KEYS = ['sheet', 'spec', 'kit', 'code'];

// 四个文件的卡片，中心为原点，各有自己的底色：kind 0 制作单（账本行）、1 规格表（滑杆和开关）、2 绘图库（零件）、3 画面代码（花括号）。
function s13_card(ctx, kind, t) {
  const w = 190, h = 216;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 10, w, h, 16); ctx.fill();
  ctx.fillStyle = ['#cfd0f7', '#bfe5e0', '#fbd3ac', INK][kind]; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); ctx.fill();
  ctx.fillStyle = [INDIGO, TEAL, ORANGE, '#3d4163'][kind]; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, 38, [16, 16, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); ctx.stroke();
  if (kind === 0) {
    for (let i = 0; i < 4; i++) {
      const y = -44 + i * 40;
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.roundRect(-72, y - 13, 26, 26, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-66, y); ctx.lineTo(-60, y + 7); ctx.lineTo(-50, y - 8); ctx.stroke();
      ctx.strokeStyle = GREY; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, y); ctx.lineTo(i % 2 ? 40 : 66, y); ctx.stroke();
    }
  } else if (kind === 1) {
    for (let i = 0; i < 3; i++) {
      const y = -40 + i * 42, u = .5 + .32 * sway(t, 2.4 + i * .7, i * .37);
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-64, y); ctx.lineTo(64, y); ctx.stroke();
      ctx.strokeStyle = LILAC; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-64, y); ctx.lineTo(64, y); ctx.stroke();
      ctx.strokeStyle = TEAL; ctx.beginPath(); ctx.moveTo(-64, y); ctx.lineTo(-64 + 128 * u, y); ctx.stroke();
      ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-64 + 128 * u, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = TEAL; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-64, 66, 58, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(-20, 80, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = GREY; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(14, 80); ctx.lineTo(62, 80); ctx.stroke();
  } else if (kind === 2) {
    const bob = i => sway(t, 2.2 + i * .4, i * .3) * 4;
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 4;
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.arc(-42, -24 + bob(0), 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#33262b'; ctx.beginPath(); ctx.arc(-42, -24 + bob(0), 27, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.pupil; for (const dx of [-10, 10]) { ctx.beginPath(); ctx.arc(-42 + dx, -18 + bob(0), 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(44, -28 + bob(1), 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.roundRect(-64, 34 + bob(2), 44, 44, 9); ctx.fill(); ctx.stroke();
    star(ctx, 44, 56 + bob(3), 25, sway(t, 5) * .2, '#ffd34d', PAL.line, 4);
  } else {
    ctx.save(); ctx.translate(0, -30); ctx.scale(1.55, 1.55); botGlyph(ctx, 'braces', t); ctx.restore();
    ctx.lineWidth = 9;
    [[BOTC.glow, 104], [ORANGE, 70], [LILAC, 88]].forEach(([color, len], i) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-60 + (i === 1 ? 20 : 0), 38 + i * 24); ctx.lineTo(-60 + (i === 1 ? 20 : 0) + len, 38 + i * 24); ctx.stroke(); });
  }
}
// 引擎生成的东西，灰色的小卡片，中心为原点：kind 0 配音波形、1 胶片、2 验收清单。age 是它出现后过去的秒数。
function s13_product(ctx, kind, age, t) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = '#e9ebf3'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-84, -56, 168, 112, 14); ctx.fill(); ctx.stroke();
  if (kind === 0) waveform(ctx, -62, 0, 124, 72, t, 1, GREY, 9);
  else if (kind === 1) {
    ctx.fillStyle = '#7b829c'; ctx.beginPath(); ctx.roundRect(-70, -36, 140, 72, 8); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(-66, -36, 132, 72); ctx.clip();
    for (let i = -1; i < 4; i++) {
      const x = -66 + ((i * 52 + t * 34) % 208 + 208) % 208 - 52;
      ctx.fillStyle = '#e9ebf3'; ctx.beginPath(); ctx.roundRect(x + 5, -17, 42, 34, 5); ctx.fill();
      for (const dy of [-29, 23]) { ctx.beginPath(); ctx.roundRect(x + 8, dy, 10, 6, 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(x + 32, dy, 10, 6, 2); ctx.fill(); }
    }
    ctx.restore();
  } else {
    for (let i = 0; i < 3; i++) {
      const y = -30 + i * 30, tick = seg(age, .25 + i * .22, .2);
      ctx.strokeStyle = GREY; ctx.lineWidth = 4; ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.roundRect(-62, y - 11, 22, 22, 5); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 5; trace(ctx, [[-57, y], [-52, y + 6], [-44, y - 7]], tick);
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-26, y); ctx.lineTo(i === 1 ? 34 : 58, y); ctx.stroke();
    }
  }
}

function scene13(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const open = ease.inOut(seg(L, b('go'), .6)), made = Math.max(0, L - b('rest')), spin = (made < .6 ? made * made / 1.2 : made - .3) * 2.4;
  const ready = i => b('go') + (b('four') - b('go')) * (.34 + .14 * i);   // 四张卡片依次在机器人手里亮出来的时刻
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#e9f0ff', '#fff9f0');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 大文件夹：背板、页签、里面的内页。
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.ellipse(1110, 852, 640, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0a83f'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(520, 92, 380, 102, [20, 20, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(500, 176, 1220, 626, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(520, 196, 1180, 586, 14); ctx.fill(); ctx.stroke();

  if (open > .5) {
    // 上半：四个槽，等着四个文件。
    for (let i = 0; i < 4; i++) {
      const lit = seg(L, b('four') + i * .12, .2), flash = Math.sin(seg(L, b('four') + i * .12, .5) * Math.PI), landed = seg(L, b(s13_KEYS[i]) + .42, .3);
      if (flash > 0 || landed > 0) { ctx.fillStyle = 'rgba(255,211,77,' + Math.max(.5 * flash, .4 * Math.sin(landed * Math.PI)) + ')'; ctx.beginPath(); ctx.roundRect(s13_X[i] - 118, s13_SY - 132, 236, 264, 28); ctx.fill(); }
      ctx.save(); ctx.globalAlpha = seg(open, .9, .1) * lerp(.4, 1, lit); ctx.translate(s13_X[i], s13_SY); ctx.scale(1 + .07 * flash, 1 + .07 * flash);
      ctx.fillStyle = lit > .5 ? '#d5d1f3' : 'rgba(201,196,238,.22)'; ctx.setLineDash([14, 11]); ctx.strokeStyle = GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-102, -116, 204, 232, 18); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // 下半：引擎。四个文件放齐之前是灰的、不转；之后齿轮转起来，传送带上一件件长出产物。
    const live = seg(made, 0, .3);
    ctx.strokeStyle = LILAC; ctx.lineWidth = 5; ctx.setLineDash([16, 14]); trace(ctx, [[556, 590], [1664, 590]], seg(L, b('rest') - .5, .5)); ctx.setLineDash([]);
    ctx.save(); ctx.globalAlpha = lerp(.4, 1, live);
    conveyor(ctx, 720, 744, 680, spin * 58, 34);
    gear(ctx, 626, 690, 58, spin, live > .5 ? GREY : '#d9dbe8', 10); gear(ctx, 700, 750, 27, -spin * 58 / 27 + .3, live > .5 ? ORANGE : '#e6e0d6', 7);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const at0 = b('rest') + .25 + i * .28, k = popIn(L, at0, .35); if (k < .02) continue;
      ctx.save(); ctx.translate(830 + i * 220, 742); ctx.scale(k, k); ctx.translate(0, -60); s13_product(ctx, i, L - at0, t); ctx.restore();
    }
  }

  // 封面：关着时盖住里面，画着一只胶片盒；“出片”时向下翻开，变成底边的一条。
  ctx.save(); ctx.translate(0, 802); ctx.scale(1, lerp(1, -.07, open));
  ctx.fillStyle = open > .93 ? '#e9b458' : '#f6c56a'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(500, -626, 1220, 626, 22); ctx.fill(); ctx.stroke();
  if (open < .9) {
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.roundRect(880, -500, 460, 330, 26); ctx.fill();
    filmCan(ctx, 1110, -360, 84, t * .4 + open * 3);
    ctx.strokeStyle = '#b9822a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(1010, -230); ctx.lineTo(1210, -230); ctx.stroke();
  }
  ctx.restore();

  // 机器人：亮出步骤牌，推开封面，手里亮出四张卡片，一张张抛进槽里，然后摊开手退后，看引擎自己干。
  const live = botAlive(t, talking), holding = seg(L, ready(0) - .25, .3) * (1 - seg(L, b('code') + .3, .3));
  const swing = Math.max(...s13_KEYS.map(key => Math.sin(seg(L, b(key) - .06, .34) * Math.PI)));
  const pose = [
    [{ ...BOTS.explain, lookY: -.3 }, seg(L, b('step') + .1, .3) * (1 - seg(L, b('go') - .15, .2))],
    [{ armR: [-.1, -.1], lookX: 1, lookY: -.2, mouthOpen: .5 }, seg(L, b('go') - .12, .2) * (1 - seg(L, b('go') + .7, .3))],
    [{ armR: mix([-.3, -.75], [-.2, -.05], swing), lookX: .9, lookY: -.3 - .3 * seg(L, b('four'), .3), mouthOpen: .3 }, holding],
    [{ armL: [2.75, .9], armR: [.4, -.9], eyes: 'happy', mouthOpen: .5, headTilt: .05, lookX: .6 }, seg(L, b('code') + .7, .3) * (1 - seg(L, b('rest') - .15, .3))],
    [{ ...BOTS.cheer, lookX: 1, lookY: .2 }, seg(L, b('rest') + .15, .3)],
  ].reduce((acc, [next, k]) => botMix(acc, next, k), BOTS.idle);
  const throws = s13_KEYS.reduce((sum, key) => sum + Math.sin(seg(L, b(key) - .02, .3) * Math.PI), 0);
  const bot = drawBot(ctx, {
    ...pose, blink: live.blink, ant: live.ant, squash: live.squash, chestT: t, x: 250 - 36 * ease.inOut(seg(L, b('rest') - .12, .4)), y: 856, s: .88,
    mouthOpen: pose.mouth === 'smile' ? Math.max(pose.mouthOpen, live.mouthOpen ?? 0) : pose.mouthOpen,
    hop: Math.sin(seg(L, b('step') + .3, .4) * Math.PI) * 28 + Math.sin(seg(L, b('go') - .1, .35) * Math.PI) * 18 + throws * 14 + Math.sin(seg(L, b('rest') - .12, .4) * Math.PI) * 30,
    chest: L < b('go') ? 'play' : L < b('code') + .5 ? 'lines' : made > 0 ? 'check' : 'braces',
  });

  // 四张文件卡：先在机器人手里排成扇形，说到哪张，哪张飞进自己的槽。
  for (let i = 3; i >= 0; i--) {
    const show = popIn(L, ready(i), .3); if (show < .02) continue;
    const k = seg(L, b(s13_KEYS[i]), .5), e = ease.inOut(k), settle = 1 + .09 * Math.sin(seg(L, b(s13_KEYS[i]) + .5, .25) * Math.PI);
    const x = lerp(bot.handR[0] + 52 + (i - 1.5) * 28, s13_X[i], e), y = lerp(bot.handR[1] - 58 + Math.abs(i - 1.5) * 8, s13_SY, e) - Math.sin(k * Math.PI) * 120;
    ctx.save(); ctx.translate(x, y); ctx.rotate((i - 1.5) * .2 * (1 - e) + Math.sin(k * Math.PI) * .3); ctx.scale(lerp(.36 * show, 1, e) * settle, lerp(.36 * show, 1, e) * settle);
    s13_card(ctx, i, t); ctx.restore();
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  if (L >= b('step') + .3) f.label('s13_step', { ...at(710, 134), size: 46, color: '#ffffff', plate: INDIGO, scale: popIn(L, b('step') + .3), alpha: vis });
  [['s13_sheet', INDIGO], ['s13_spec', TEAL], ['s13_kit', ORANGE_D], ['s13_code', INDIGO]].forEach(([key, plate], i) => {
    const k = popIn(L, b(s13_KEYS[i]) + .45);
    if (k > .01) f.label(key, { ...at(s13_X[i], 524), size: 44, color: '#ffffff', plate, scale: k, alpha: vis });
  });
  const l5 = popIn(L, b('rest') + .4);
  if (l5 > .01) f.label('s13_rest', { ...at(1565, 690), size: 46, color: '#ffffff', plate: INDIGO, scale: l5, alpha: vis });
}
