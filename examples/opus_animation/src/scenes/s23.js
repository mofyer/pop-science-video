// ---------- S23 行动建议与署名：先写成 Skill，让它照着做，再让它自己查 ----------
const s23_mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
// 小人（正面）一只手的世界坐标：side 为 -1 是画面左边那只，a 是这只手臂的两个角度。
function s23_hand(o, side, a) {
  return [o.x + (side * 46 + Math.cos(a[0]) * 50 + Math.cos(a[0] + a[1]) * 46) * o.s, o.y - o.hop * o.s + (-226 + Math.sin(a[0]) * 50 + Math.sin(a[0] + a[1]) * 46) * o.s];
}

function scene23(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const use = b('use'), near = ease.inOut(seg(L, use - .4, .4)), slap = seg(L, use, .5), wave = seg(L, use + .5, .4);
  const five = seg(L, use - .05, .25) * (1 - seg(L, use + .45, .3)), rise = ease.out(seg(L, b('brand'), .75)), py = lerp(740, 0, rise);
  // 旁白说完后的停顿里，两人每隔一会儿一起轻轻跳一下，不定格。
  let bounce = 0; for (let n = 0; n < 6; n++) bounce += Math.sin(seg(L, use + 1.3 + n * 1.4, .45) * Math.PI);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#ecefff', '#fff6ea');
  ctx.save(); cam.apply(ctx);

  // 品牌牌后面缓缓转动的光芒，和击掌之后一直往下飘的彩纸。
  const glow = seg(L, b('brand') + .4, .6);
  if (glow > 0) {
    ctx.save(); ctx.translate(960, 295); ctx.rotate(t * .22); ctx.fillStyle = 'rgba(255,211,77,' + .2 * glow + ')';
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -110); ctx.lineTo(1100, 110); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  const party = seg(L, use + .2, .5);
  if (party > 0) for (let i = 0; i < 40; i++) {
    const y = 40 + (hash(i + 50) * 740 + (L - use) * (70 + hash(i + 9) * 60)) % 740, x = 110 + hash(i) * 1700 + Math.sin(t * 1.3 + i) * 22;
    ctx.save(); ctx.globalAlpha = party * clamp((780 - y) / 120) * clamp(y / 80); ctx.translate(x, y); ctx.rotate(t * (1.2 + hash(i + 4)) + i);
    ctx.fillStyle = [INDIGO, ORANGE, TEAL, '#ffd34d'][i % 4]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
  // 品牌牌：两根立柱撑着一块白牌，从地面后面升起来；牌上只有文字标签。
  if (rise > 0) {
    ctx.lineCap = 'round';
    for (const x of [720, 1200]) for (const [color, w] of [[PAL.line, 28], ['#c99a62', 18]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, 395 + py); ctx.lineTo(x, 900 + py); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(650, 189 + py, 640, 230, 30); ctx.fill();
    ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(640, 175 + py, 640, 230, 30); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(652, 187 + py, 616, 206, 20); ctx.stroke();
    for (let i = 0; i < 4; i++) sparkle(ctx, [640, 1280, 1296, 622][i], [175, 405, 200, 380][i] + py, 30, glow * (.45 + .55 * Math.abs(Math.sin(t * 2.4 + i * 1.6))));
  }
  floor(ctx);

  // 创作者：举起手里写好的册子说“我试试”；看见胶片盒飘来；把册子放进文件夹递给机器人；最后上前击掌、挥手。
  const tryK = ease.inOut(seg(L, b('try'), .3) * (1 - seg(L, b('notyet') - .5, .4))), gave = seg(L, b('follow') - .05, .45);
  const eyeing = seg(L, b('notyet') - .7, .3) * (1 - seg(L, b('notyet') + .9, .3)), awe = seg(L, b('brand'), .3) * (1 - seg(L, use - .4, .3));
  const man = { x: 700 + 140 * near, y: 856, s: 1, hop: Math.sin(seg(L, b('try'), .4) * Math.PI) * 26 + Math.sin(seg(L, use - .4, .4) * Math.PI) * 30 + Math.sin(slap * Math.PI) * 14 + bounce * 22 };
  let armL = s23_mix([2.2, .5], [4.28, .35], tryK);
  armL = s23_mix(armL, [1.95, .2], seg(L, b('skill') + .3, .4));
  let armR = s23_mix([.35, -.9], [-.1, -.2], Math.sin(gave * Math.PI));
  armR = s23_mix(armR, [1.2, -.2], seg(L, b('follow') + .4, .4));
  armR = s23_mix(armR, reach(46, -226, 112, -308, 50, 46), five);
  armR = s23_mix(armR, [-1.05, -.55 + Math.sin(t * 8) * .3], wave);
  drawPerson(ctx, { ...man, top: '#5b6ee1', hair: '#33262b', armL, armR, blink: blinkAt(t, 4.1, .3),
    mood: L > use - .1 || (L > b('try') && L < b('notyet') - .7) ? 'happy' : eyeing > .5 || awe > .5 ? 'o' : 'smile',
    lookX: lerp(.8, 0, wave), lookY: -Math.max(eyeing, awe) * (1 - wave) });

  // 机器人（朝左站）：拦住飘来的胶片盒；接过文件夹；举起放大镜自己查；抬头看品牌牌；跳起来击掌；朝观众挥手。
  const block = seg(L, b('notyet') - .15, .2) * (1 - seg(L, b('notyet') + .8, .3)), advise = seg(L, b('notyet') + .9, .3) * (1 - seg(L, b('skill') - .3, .3));
  const take = seg(L, b('follow') - .15, .3) * (1 - seg(L, b('brand') - .25, .25)), inspect = seg(L, b('check') - .1, .3) * (1 - seg(L, b('brand') - .25, .25));
  let pose = botMix(BOTS.idle, { eyes: 'happy', mouthOpen: .6 }, seg(L, b('try'), .2) * (1 - seg(L, b('notyet') - .6, .3)));
  pose = botMix(pose, { ...BOTS.stop, armR: [-.6, -.15], lookY: -.4 }, block);
  pose = botMix(pose, BOTS.explain, advise);
  pose = botMix(pose, { ...BOTS.type, chest: 'dot', lookY: .5 }, take);
  pose = botMix(pose, { ...BOTS.type, chest: 'dot', armR: [-.9, -.6], frontR: false, eyes: 'wide', lookY: .7 }, inspect);
  pose = botMix(pose, { ...BOTS.surprise, lookY: -1 }, awe);
  pose = botMix(pose, { eyes: 'happy', mouthOpen: 1, armR: reach(84, -150, 122, -233, 46, 44) }, five);
  pose = botMix(pose, BOTS.wave, wave);
  const bot = { x: 1220 - 150 * near, y: 856, s: .9, dir: -1,
    hop: Math.sin(seg(L, b('notyet') - .15, .35) * Math.PI) * 34 + Math.sin(seg(L, use - .4, .4) * Math.PI) * 40 + Math.sin(slap * Math.PI) * 100 + bounce * 26 };
  const hands = drawBot(ctx, { ...pose, ...botAlive(t, talking), ...bot, lookX: lerp(lerp(1, .4, awe), 0, wave), lookY: pose.lookY,
    armR: [pose.armR[0], pose.armR[1] + Math.sin(t * 9) * .3 * wave], chest: L > b('brand') - .05 ? 'check' : pose.chest,
    squash: sway(t, 3.1) * .012 + Math.sin(seg(L, use + .5, .2) * Math.PI) * .09 });

  // “直接出片”：胶片盒又在两人头顶冒出来、飘下来，被机器人一掌推开，退到左上角，只剩虚线轮廓。
  const drift = seg(L, b('notyet') - 1.0, 1.0), knocked = ease.out(seg(L, b('notyet'), .6)), canGone = seg(L, b('skill') - .7, .3);
  if (drift > 0 && canGone < 1) {
    ctx.save(); ctx.globalAlpha = 1 - canGone;
    filmCan(ctx, lerp(lerp(1080, 1030, ease.inOut(drift)), 330, knocked), lerp(lerp(190, 592, ease.inOut(drift)), 215, knocked) + sway(t, 2.2) * 8, lerp(62, 48, knocked) * ease.back(clamp(drift * 3)), t * .8 - knocked * 5, clamp(knocked * 1.5));
    ctx.restore();
    burst(ctx, 1066, 612, seg(L, b('notyet'), .4), 9, 36, 110, ORANGE);
  }

  // 文件夹：先在创作者手里；册子放进去、贴上标签；“照着做”时递到机器人手里；“自己查”时打上对勾；最后收进机器人胸口。
  const held = s23_hand(man, 1, [.35, -.9]), g = ease.inOut(gave), tuck = ease.in(seg(L, b('brand') - .25, .3));
  const fx = lerp(lerp(held[0] + 30, bot.x - 150, g), bot.x, tuck), fy = lerp(lerp(held[1] - 10, 745 - bot.hop * .9, g) - Math.sin(gave * Math.PI) * 40, 748, tuck);
  if (tuck < 1) {
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1 - tuck, 1 - tuck);
    folder(ctx, 0, 0, 170, 118, seg(L, b('skill') - .4, .3) * (1 - seg(L, b('skill') + .42, .3)));
    const stick = popIn(L, b('skill') + .62);
    if (stick > 0) { ctx.save(); ctx.translate(-34, -6); ctx.scale(stick, stick); ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-40, -17, 80, 34, 8); ctx.fill(); ctx.stroke(); ctx.strokeStyle = INDIGO; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.stroke(); ctx.restore(); }
    mark(ctx, 'check', 48, 26, 1, seg(L, b('check') + .25, .3));
    ctx.restore();
  }
  // 册子：在创作者左手里，“一个 Skill”时越过头顶飞进文件夹。
  const put = seg(L, b('skill') - .1, .5);
  if (put < 1) {
    const h = s23_hand(man, -1, armL), k = ease.inOut(put);
    ctx.save(); ctx.translate(lerp(h[0] - 4, fx, k), lerp(h[1] - 40, fy - 12, k) - Math.sin(put * Math.PI) * 170); ctx.rotate(lerp(-.12, .5, k)); book(ctx, 0, 0, .42, 0, 0); ctx.restore();
  }
  // 放大镜：镜片罩在文件夹上，来回扫。
  if (inspect > 0) { ctx.save(); ctx.globalAlpha = inspect; magnifier(ctx, hands.handR[0] - Math.cos(-1.3) * 68 + sway(t, 1.1) * 14, hands.handR[1] - Math.sin(-1.3) * 68, 34, -1.3); ctx.restore(); }
  // 击掌的那一下。
  burst(ctx, 950, 552, seg(L, use + .2, .4), 10, 26, 104, '#ffd34d');
  sparkle(ctx, 950, 552, 60, Math.sin(seg(L, use + .2, .45) * Math.PI));
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const gone = 1 - seg(L, b('brand') - .05, .2);
  if (gone > 0) {
    const l1 = popIn(L, b('skill') + .6), l2 = popIn(L, b('follow') + .3), l3 = popIn(L, b('check') + .15);
    if (l1 > 0) f.label('s23_skill', { ...at(700, 440), size: 46, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis * gone });
    if (l2 > 0) f.label('s23_follow', { ...at(1220, 440), size: 46, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis * gone });
    if (l3 > 0) f.label('s23_check', { ...at(930, 540), size: 46, color: '#ffffff', plate: TEAL, scale: l3, alpha: vis * gone });
  }
  const named = seg(L, b('brand') + .3, .3);
  // 品牌名用白底牌（和白牌子同色，看不出边）：靛蓝字压白底，四周留出内边距。
  if (named > 0) f.label('s23_brand', { ...at(960, 254 + py), size: 64, color: INDIGO, plate: '#ffffff', alpha: vis * named });
  const l5 = popIn(L, use);
  if (l5 > 0) f.label('s23_slogan', { ...at(960, 350), size: 48, color: '#ffffff', plate: ORANGE_D, scale: l5, alpha: vis });
}
