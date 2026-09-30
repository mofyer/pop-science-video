// ---------- S03 Skill：文件夹里一份说明书，平时只占一行简介，用到才整份读进来 ----------
const s03_HOVER = [990, 395], s03_RACK = [1630, 470], s03_FOLDER = [800, 745], s03_BOOK = 1.25;

// 话泡：里面两行灰线，代表一长串口头交代；tail 为真时带一个指向说话人的小尾巴。
function s03_talk(ctx, x, y, s, rot, alpha, tail) {
  if (alpha <= 0 || s <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  if (tail) { ctx.beginPath(); ctx.moveTo(-58, 30); ctx.lineTo(-84, 70); ctx.lineTo(-22, 30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(-100, -34, 200, 68, 28); ctx.fill(); ctx.stroke();
  if (tail) { ctx.beginPath(); ctx.moveTo(-54, 26); ctx.lineTo(-27, 26); ctx.lineTo(-39, 40); ctx.lineTo(-60, 40); ctx.closePath(); ctx.fill(); }
  ctx.lineCap = 'round'; ctx.strokeStyle = GREY; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-66, -10); ctx.lineTo(62, -10); ctx.moveTo(-66, 12); ctx.lineTo(24, 12); ctx.stroke();
  ctx.restore();
}
// 名片：左边一条色带，右边只有一行字；lit 是亮起的程度。
function s03_card(ctx, x, y, s, color, lit = 0, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  if (lit > 0) { ctx.save(); ctx.globalAlpha *= lit; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 16; ctx.beginPath(); ctx.roundRect(-88, -31, 176, 62, 13); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-84, -27, 168, 54, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-84, -27, 32, 54, [10, 0, 0, 10]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-84, -27, 168, 54, 10); ctx.stroke();
  ctx.lineCap = 'round'; ctx.strokeStyle = lit > .5 ? INDIGO : GREY; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(62, 0); ctx.stroke();
  ctx.restore();
}
// 终端窗口：深色标题栏、三个圆点，左上角一个提示符和闪动的光标。
function s03_window(ctx, x, y, w, h, t) {
  ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3d4163'; ctx.beginPath(); ctx.roundRect(x, y, w, 66, [30, 30, 0, 0]); ctx.fill();
  [ORANGE, '#ffd34d', BOTC.glow].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 46 + i * 38, y + 33, 11, 0, Math.PI * 2); ctx.fill(); });
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INDIGO; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(x + 44, y + 104); ctx.lineTo(x + 64, y + 122); ctx.lineTo(x + 44, y + 140); ctx.stroke();
  if (Math.sin(t * 6) > 0) { ctx.beginPath(); ctx.moveTo(x + 88, y + 140); ctx.lineTo(x + 122, y + 140); ctx.stroke(); }
}

function scene03(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const step = clamp((b('tired') - b('teach')) / 4.2, .1, .32);
  const win = ease.out(seg(L, b('cc'), .7)), gather = ease.in(seg(L, b('skill'), .35));
  const fold = popIn(L, b('skill') + .25), open = seg(L, b('folder'), .5), out = ease.out(seg(L, b('book'), .6)), spread = seg(L, b('book') + .4, .4);
  // “一行简介”：册子合上、缩成名片、飞进名片架，赶在“用到的时候”之前做完。
  const cd = clamp(b('use') - b('card') - .05, .5, 1.05);
  const close = seg(L, b('card'), .22 * cd), shrink = ease.inOut(seg(L, b('card') + .12 * cd, .4 * cd)), slot = ease.inOut(seg(L, b('card') + .48 * cd, .5 * cd));
  const lit = ease.out(seg(L, b('use'), .3));
  const back = ease.inOut(seg(L, Math.max(b('use') + .4, b('load') - .55), .5)), read = seg(L, b('load'), .9);
  const push = ease.inOut(seg(L, b('card') - .2, .6));
  const cam = makeCam(960, 545, 1 + .03 * seg(L, 0, D) + .05 * push);
  studio(ctx, t, '#eaf0ff', '#fff8ee');
  ctx.save(); cam.apply(ctx);

  // 终端窗口从地面后面升起，把两人框在里面；右侧挂着名片架，上面两格已经插着别的名片。
  const slots = [0, 1, 2].map(i => [s03_RACK[0], s03_RACK[1] + i * 78]), third = slots[2];
  if (win > 0) {
    ctx.save(); ctx.translate(0, (1 - win) * 820);
    s03_window(ctx, 110, 140, 1700, 800, t);
    ctx.fillStyle = '#3d4163'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(s03_RACK[0] - 112, s03_RACK[1] - 52, 224, 260, 20); ctx.fill(); ctx.stroke();
    slots.forEach(([x, y], i) => {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(x - 94, y - 33, 188, 66, 12); ctx.fill();
      if (i < 2) s03_card(ctx, x, y, 1, i ? ORANGE : TEAL);
    });
    ctx.restore();
  }
  floor(ctx);

  // 创作者：先比划着讲，讲累了垮下来；窗口升起时抬头，册子飞出来时举手去指。
  const k1 = seg(L, b('tired'), .35), k2 = seg(L, b('cc'), .35), k3 = seg(L, b('book'), .3), k4 = seg(L, b('card') + .1, .35), low = k1 * (1 - k2);
  const armR = mix(mix(mix(mix([-.55 + Math.sin(t * 8) * .16, -.6], [1.42, .12], k1), [1.2, -.2], k2), [-.85, -.2], k3), [1.2, -.2], k4);
  const lookY = lerp(lerp(lerp(lerp(lerp(lerp(0, 1, k1), -1, k2), .8, seg(L, b('skill'), .3)), -.8, k3), .2, slot), -.6, back);
  drawPerson(ctx, { x: 360, y: 856, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.1, .4), lookX: 1, lookY, armR, armL: mix([1.95, .2], [1.72, -.12], low),
    mood: L < b('tired') ? 'smile' : L < b('cc') ? 'worry' : L < b('skill') ? 'o' : L < b('book') ? 'smile' : L < b('card') ? 'happy' : L < b('load') ? 'smile' : 'happy',
    sweat: low, lean: .05 * low, squash: .035 * low + sway(t, 3.4) * (.008 + .012 * low), hop: Math.sin(seg(L, b('book') + .05, .35) * Math.PI) * 26 + Math.sin(seg(L, b('load') + .1, .35) * Math.PI) * 20 });
  // 叹出的气团
  for (let i = 0; i < 2; i++) {
    const k = seg(L, b('tired') + .45 + i * 1.3, 1.1); if (k <= 0 || k >= 1 || k2 >= 1) continue;
    ctx.save(); ctx.globalAlpha = (1 - k) * (1 - k2); ctx.fillStyle = PAL.white; ctx.strokeStyle = GREY; ctx.lineWidth = 4;
    for (const [dx, r] of [[-16, 12], [4, 17], [24, 11]]) { ctx.beginPath(); ctx.arc(462 + 80 * k + dx * (1 + k), 606 - 30 * k, r * (1 + k), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  // 机器人：听一句点一下头；看着塌下来的话泡发愁；最后伸手取名片，逐行读册子。
  const bot = { x: 1300, y: 856, s: .9 };
  let nod = 0; for (let i = 1; i < 5; i++) nod += Math.sin(seg(L, b('teach') + (i - 1) * step + .1, .26) * Math.PI);
  let pose = botMix({ lookX: -1 }, { ...BOTS.worry, lookX: -1 }, seg(L, b('tired') + .25, .3) * (1 - seg(L, b('cc') - .1, .3)));
  pose = botMix(pose, { ...BOTS.surprise, lookX: -.3, lookY: -1 }, seg(L, b('cc'), .25) * (1 - seg(L, b('skill') - .1, .25)));
  pose = botMix(pose, { ...BOTS.think, lookX: -1, lookY: .8 }, seg(L, b('skill') + .1, .3) * (1 - seg(L, b('book') - .1, .25)));
  pose = botMix(pose, { ...BOTS.wave, lookX: -1, lookY: -.6 }, seg(L, b('book') + .1, .3) * (1 - seg(L, b('card') - .1, .25)));
  pose = botMix(pose, { lookX: lerp(-1, 1, slot), lookY: lerp(-.6, 0, slot) }, seg(L, b('card'), .2) * (1 - seg(L, b('use'), .2)));
  pose = botMix(pose, { armR: [-.2, -.15], lookX: 1, lookY: -.2, eyes: 'wide', halo: .6 }, seg(L, b('use'), .25) * (1 - back));
  pose = botMix(pose, { armL: [3.6, .4], lookX: -1 + .5 * ((read * 5) % 1), lookY: lerp(-.5, .5, read), chest: 'lines', halo: .5, eyes: read >= 1 ? 'happy' : 'open' }, back);
  const alive = botAlive(t, talking && L > b('cc'));
  drawBot(ctx, { ...pose, ...alive, ...bot, headTilt: pose.headTilt + sway(t, 2.7) * .03, lookY: pose.lookY + nod * .9, squash: alive.squash + nod * .025, mouthOpen: Math.max(pose.mouthOpen, alive.mouthOpen || 0),
    hop: Math.sin(seg(L, b('skill') + .25, .4) * Math.PI) * 46 });

  // 话泡一个接一个堆高；“太累”时塌到地上；“Skill”时收拢，压成一个文件夹。
  const pile = [[590, 440, 0, 610, 814, -.12], [604, 366, .05, 790, 816, .1], [580, 292, -.06, 700, 752, .22], [608, 218, .07, 960, 812, -.2], [584, 144, -.04, 870, 748, .3]];
  if (gather < 1) pile.forEach(([x0, y0, r0, x1, y1, r1], i) => {
    const grow = i ? seg(L, b('teach') + (i - 1) * step, .3) : 1;
    if (grow <= 0) return;
    const from = b('tired') + (4 - i) * .05, span = .5 + i * .05, drop = seg(L, from, span), bounce = Math.sin(seg(L, from + span, .3) * Math.PI) * 14;
    const x = lerp(lerp(440, x0, ease.out(grow)), x1, ease.out(drop)) + Math.sin(t * 2.4 + i * .5) * i * 3 * (1 - drop);
    const y = lerp(lerp(590, y0, ease.out(grow)), y1, ease.in(drop)) - bounce;
    s03_talk(ctx, lerp(x, s03_FOLDER[0], gather), lerp(y, s03_FOLDER[1], gather), (i ? ease.back(grow) : 1) * lerp(1, .3, gather), lerp(r0, r1, ease.out(drop)), 1 - seg(gather, .75, .25), i === 0 && drop <= 0);
  });
  // 文件夹掀开时往上提一点，掀下来的封面才不会伸进字幕区。
  const fy = s03_FOLDER[1] - 40 * ease.inOut(open);
  if (fold > 0) {
    ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.ellipse(s03_FOLDER[0], 852, 150 * fold, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(s03_FOLDER[0], fy + 90); ctx.scale(fold, fold); folder(ctx, 0, -90, 260, 180, open); ctx.restore();
    burst(ctx, s03_FOLDER[0], s03_FOLDER[1], seg(L, b('skill') + .25, .45), 10, 130, 220, ORANGE);
  }

  // 文件夹掀开就看得见里面的册子；册子飞出来摊开；“一行简介”时合上、缩成一张名片，原处只留一个虚线轮廓。
  const hov = [s03_HOVER[0], s03_HOVER[1] + sway(t, 3.3) * 7];
  if (shrink > 0 && back < 1) {
    ctx.save(); ctx.globalAlpha = .6 * shrink * (1 - back); ctx.strokeStyle = GREY; ctx.lineWidth = 5; ctx.setLineDash([16, 12]);
    ctx.beginPath(); ctx.roundRect(hov[0] - 160 * s03_BOOK, hov[1] - 92 * s03_BOOK, 320 * s03_BOOK, 194 * s03_BOOK, 16); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  if (open > .5 && shrink < 1) {
    ctx.save(); ctx.globalAlpha = seg(open, .5, .3) * (1 - seg(shrink, .55, .45));
    book(ctx, lerp(s03_FOLDER[0], hov[0], out), lerp(fy, hov[1], out), lerp(.62, s03_BOOK, out) * lerp(1, .34, shrink), spread * (1 - close), 0);
    ctx.restore();
  }
  if (shrink > .3 && back < 1) {
    const pulse = 1 + .12 * Math.sin(seg(L, b('use'), .35) * Math.PI) + .05 * lit * sway(t, .8);
    const x = lerp(lerp(hov[0], third[0], slot), hov[0], back), y = lerp(lerp(hov[1], third[1], slot), hov[1], back) - Math.sin(slot * Math.PI) * 90 - Math.sin(back * Math.PI) * 110;
    s03_card(ctx, x, y, lerp(.55, 1, seg(shrink, .3, .7)) * pulse * lerp(1, 1.5, back), INDIGO, lit, seg(shrink, .3, .4) * (1 - seg(back, .55, .35)));
    if (lit > 0 && back <= 0) { sparkle(ctx, third[0] + 100, third[1] - 42, 26, lit * (.7 + .3 * sway(t, .9))); sparkle(ctx, third[0] - 104, third[1] + 36, 18, lit * (.7 + .3 * sway(t, 1.1, .4))); }
  }
  // “读进来”：名片展开回整本册子，页面一行行亮，亮过的内容流进机器人的脑袋。
  if (back > 0) {
    ctx.save(); ctx.globalAlpha = seg(back, .45, .4);
    book(ctx, lerp(third[0], hov[0], back), lerp(third[1], hov[1], back) - Math.sin(back * Math.PI) * 110, lerp(.4, s03_BOOK, back), seg(back, .55, .45), read);
    ctx.restore();
  }
  if (L > b('load')) {
    for (let i = 0; i < 6; i++) {
      const k = ((L - b('load')) * 1.3 + i / 6) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = i % 2 ? INDIGO : TEAL;
      ctx.beginPath(); ctx.arc(lerp(hov[0] + 90, bot.x - 70, ease.inOut(k)), lerp(hov[1] - 60 + i * 24, bot.y - 258 * bot.s, ease.inOut(k)) - Math.sin(k * Math.PI) * 46, 11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('cc') + .45);
  if (l1 > 0) f.label('s03_cc', { ...at(960, 173), size: 46, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  const l2 = popIn(L, b('skill') + .5);
  if (l2 > 0) f.label('s03_skill', { ...at(724, s03_FOLDER[1] - 105 - 40 * ease.inOut(open)), size: 44, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  const l3 = popIn(L, b('book') + .55);
  if (l3 > 0) f.label('s03_md', { ...at(s03_HOVER[0], 572), size: 46, color: INDIGO, halo: '#ffffff', scale: l3, alpha: vis * (1 - seg(L, b('card') - .1, .2)) });
  const l4 = popIn(L, b('card') + .6 * cd);
  if (l4 > 0) f.label('s03_line', { ...at(s03_RACK[0], 372), size: 48, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis });
  const l5 = popIn(L, b('load') + .2);
  if (l5 > 0) f.label('s03_load', { ...at(s03_HOVER[0], 574), size: 48, color: '#ffffff', plate: INDIGO, scale: l5, alpha: vis });
}
