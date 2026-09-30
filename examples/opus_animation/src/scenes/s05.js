// ---------- S05 分工：模型动脑（写脚本、写代码、看图），引擎干活（从配音到验收都不用模型）----------
const s05_GEAR = [1110, 650], s05_TOP = [915, 185];

// 引擎：机身正面一大一小两个咬合的齿轮，右边一条传送带和四道工位拱门，顶上一根烟囱。lit(i) 是第 i 道拱门亮起的程度。
function s05_engine(ctx, spin, belt, lit) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line;
  for (const x of [1430, 1620, 1800]) { ctx.fillStyle = GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x - 11, 776, 22, 80, 6); ctx.fill(); ctx.stroke(); }
  conveyor(ctx, 1290, 742, 560, belt);
  for (let i = 0; i < 4; i++) {
    const x = 1330 + (belt + i * 140) % 560;
    ctx.save(); ctx.globalAlpha = clamp((1850 - x) / 40); ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(x - 23, 704, 46, 38, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = INDIGO; ctx.fillRect(x - 5, 707, 10, 32); ctx.restore();
  }
  for (let i = 0; i < 4; i++) arch(ctx, 1405 + i * 122, 742, 80, 150, lit(i));
  ctx.strokeStyle = PAL.line;
  for (const x of [1050, 1270]) { ctx.fillStyle = GREY; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x - 22, 790, 44, 66, 8); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = GREY; ctx.beginPath(); ctx.roundRect(1232, 352, 56, 70, [12, 12, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a6078'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(1000, 410, 320, 394, 36); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a4f66'; ctx.beginPath(); ctx.roundRect(1000, 752, 320, 52, [0, 0, 36, 36]); ctx.fill(); ctx.beginPath(); ctx.roundRect(1000, 410, 320, 394, 36); ctx.stroke();
  ctx.fillStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(1026, 434, 268, 70, 18); ctx.fill(); ctx.stroke();
  gear(ctx, 1236, 606, 56, -spin * 1.5 + .2, GREY, 8);
  gear(ctx, s05_GEAR[0], s05_GEAR[1], 88, spin, ORANGE, 12);
}
// “不用模型”的牌子：圆牌里一个小机器人头，被一道斜线划掉。
function s05_nobot(ctx, x, y, s) {
  if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -32); ctx.stroke();
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(0, -35, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BOTC.shell; ctx.beginPath(); ctx.roundRect(-36, -22, 72, 54, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BOTC.screen; ctx.beginPath(); ctx.roundRect(-28, -15, 56, 40, 12); ctx.fill();
  ctx.fillStyle = BOTC.glow; for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(dx, 3, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 53, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(-35, 35); ctx.lineTo(35, -35); ctx.stroke();
  ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-37, 37); ctx.lineTo(37, -37); ctx.stroke();
  ctx.restore();
}

function scene05(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const rise = ease.out(seg(L, b('engine'), .7));
  // Skill 文件夹先挡在引擎前面，随后跳到正上方，分界线从它下面落下来。
  const hopAt = Math.max(b('engine') + .35, b('split') - .55), up = ease.inOut(seg(L, hopAt, .5)), drop = ease.inOut(seg(L, Math.max(b('split'), hopAt + .45), .45));
  const write = seg(L, b('brain') + .25, clamp(b('code') - b('brain') - .35, .7, 2)), plate = seg(L, b('code'), .45);
  const look = seg(L, b('look'), .3), flaw = seg(L, b('look') + .45, .4);
  const run = Math.max(0, L - b('work')), belt = run < .5 ? 150 * run * run : 150 * (run - .25), off = ease.inOut(seg(L, b('nomodel'), .4));
  const spin = Math.max(0, L - b('engine')) * .5 + run * 1.3 + Math.max(0, L - b('nomodel')) * .9;
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#edf1ff', '#fff7ee');
  ctx.save(); cam.apply(ctx);
  if (drop > 0) {
    ctx.fillStyle = 'rgba(75,79,217,' + .05 * drop + ')'; ctx.fillRect(-600, -300, 1515, 1150);
    ctx.fillStyle = 'rgba(240,138,60,' + .06 * drop + ')'; ctx.fillRect(915, -300, 1700, 1150);
  }

  // 引擎从地面后面升起；“负责干活”起传送带走、烟囱吐气团；“从配音到验收”工位一个接一个亮。
  if (rise > 0) {
    // 开工的一刻整台机器往上一颠，之后一直轻轻地抖。
    ctx.save(); ctx.translate(0, (1 - rise) * 560 + Math.sin(t * 31) * 1.2 * Math.min(1, run * 2) - Math.sin(seg(L, b('work'), .3) * Math.PI) * 16);
    s05_engine(ctx, spin, belt, i => seg(L, b('line') + i * .3, .2));
    if (run > 0) for (let i = 0; i < 3; i++) {
      const k = (run * .8 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * Math.min(1, run * 3); ctx.fillStyle = PAL.white; ctx.strokeStyle = GREY; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(1260 + Math.sin(k * 5 + i) * 14, 340 - k * 120, 12 + k * 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  floor(ctx);

  // 分界线
  if (drop > 0) {
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.setLineDash([24, 20]);
    ctx.beginPath(); ctx.moveTo(s05_TOP[0], 252); ctx.lineTo(s05_TOP[0], 252 + 592 * drop); ctx.stroke(); ctx.setLineDash([]);
    burst(ctx, s05_TOP[0], 846, seg(L, Math.max(b('split'), hopAt + .45) + .4, .35), 8, 16, 60, INDIGO);
  }
  const fx = lerp(1180, s05_TOP[0], up), fy = lerp(745, s05_TOP[1], up) - Math.sin(up * Math.PI) * 120, fs = lerp(1, .55, up);
  ctx.fillStyle = 'rgba(40,40,80,' + .12 * (1 - up) + ')'; ctx.beginPath(); ctx.ellipse(1180, 852, 165, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(fx, fy); ctx.scale(fs, fs); folder(ctx, 0, 0, 300, 190, 0); ctx.restore();

  // 模型这边的三件活：写脚本（纸上一行行写出来）、写代码（代码牌从胸口弹出）、看图（放大镜下圈出毛病）。
  const bot = { x: lerp(250, 212, off), y: 856, s: .95 };
  const paper = popIn(L, b('brain'), .35), rot = -.05, li = Math.min(4, Math.floor(write * 5)), lp = clamp(write * 5 - li);
  const lx = -180 * .36 + 180 * (.72 - (li % 3) * .14) * lp, ly = -115 + 230 * .3 + li * 230 * .6 / 5;
  const tip = [560 + lx * Math.cos(rot) - ly * Math.sin(rot), 400 + lx * Math.sin(rot) + ly * Math.cos(rot)];
  if (paper > 0) sheet(ctx, 560, 400, 180, 230, { k: write, rot, s: paper, band: INDIGO });
  if (write > 0 && plate < 1) {
    ctx.save(); ctx.globalAlpha = 1 - plate; ctx.translate(tip[0], tip[1]); ctx.rotate(-1 + (write < 1 ? Math.sin(t * 24) * .06 : 0));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -8); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(18, -9, 66, 18, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(84, -9, 14, 18, 5); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  if (plate > 0) codePlate(ctx, lerp(bot.x, 752, ease.out(plate)), lerp(bot.y - 120 * bot.s, 578, ease.out(plate)), 330, 150, seg(L, b('code') + .3, .7), ease.back(plate) * .72);
  const pic = popIn(L, b('look'), .35);
  if (pic > 0) {
    ctx.save(); ctx.translate(520, 708); ctx.scale(pic, pic); preview(ctx, -92, -62, 184, 124, t); ctx.restore();
    if (flaw > 0) for (const [color, w] of [[PAL.white, 13], [ORANGE, 7]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(570, 722, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * flaw); ctx.stroke(); }
  }

  // 机器人：先指着文件夹；引擎升起时吓一跳；念到自己时挥手；动脑时头顶亮光晕；最后举起双手退后一步。
  const span = (from, to, d = .25) => seg(L, from, d) * (1 - seg(L, to - d, d));
  let pose = botMix({ lookX: .8 }, BOTS.explain, 1 - seg(L, b('engine') - .1, .2));
  pose = botMix(pose, BOTS.surprise, span(b('engine'), b('engine') + 1));
  pose = botMix(pose, { ...BOTS.wave, lookX: .3 }, span(b('brain') - .95, b('brain') - .05));
  pose = botMix(pose, { armR: reach(BOT_SHOULDER[0], BOT_SHOULDER[1], (tip[0] - bot.x) / bot.s, (tip[1] - bot.y) / bot.s, BOT_ARM[0], BOT_ARM[1]), lookX: .9, lookY: -.7, halo: .9 }, span(b('brain'), b('code') + .1));
  pose = botMix(pose, { ...BOTS.pat, halo: .9 }, span(b('code'), b('look') + .1, .2));
  pose = botMix(pose, { ...BOTS.lens, lookY: .5, halo: .9, chest: 'braces' }, span(b('look'), b('work') + .2));
  pose = botMix(pose, { lookX: 1, lookY: .1, chest: 'check' }, seg(L, b('work'), .3));
  pose = botMix(pose, { armL: [3.75, .55], armR: [-.6, -.55], eyes: 'happy', lookX: 1 }, off);
  const alive = botAlive(t, talking);
  const anchors = drawBot(ctx, { ...pose, ...alive, ...bot, headTilt: pose.headTilt + sway(t, 2.7) * .03, mouthOpen: Math.max(pose.mouthOpen, alive.mouthOpen || 0),
    hop: Math.sin(seg(L, b('engine') + .05, .4) * Math.PI) * 40 + Math.sin(seg(L, b('brain') - .9, .4) * Math.PI) * 36 + Math.sin(seg(L, b('work') + .1, .35) * Math.PI) * 26 + Math.sin(seg(L, b('nomodel'), .4) * Math.PI) * 50 });
  const mag = look * (1 - seg(L, b('work'), .3));
  if (mag > 0) { const th = .45 + sway(t, 1.6) * .22, r = 44 * mag; magnifier(ctx, anchors.handR[0] + Math.cos(th) * r * 2.1, anchors.handR[1] + Math.sin(th) * r * 2.1, r, th + Math.PI); }
  s05_nobot(ctx, 1600, 272, popIn(L, b('nomodel') + .1) * 1.25);
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  f.label('s05_skill', { ...at(fx, fy + 10 * fs), size: 44, color: '#ffffff', plate: INDIGO, scale: lerp(1, .82, up), alpha: vis });
  const l1 = popIn(L, b('brain') + .15);
  if (l1 > 0) f.label('s05_model', { ...at(250, 410), size: 50, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  const l2 = popIn(L, b('work') + .15);
  if (l2 > 0) f.label('s05_engine', { ...at(1160, 469), size: 50, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  const l3 = popIn(L, b('nomodel') + .3);
  if (l3 > 0) f.label('s05_nomodel', { ...at(1600, 408), size: 52, color: ORANGE_D, halo: '#ffffff', scale: l3, alpha: vis });
}
