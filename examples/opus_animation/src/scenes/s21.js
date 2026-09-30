// ---------- S21 它判断不了的事：要人来听、来看；交付时把还没验证的列出来 ----------
// 头戴耳机，跟着小人的朝向变：正面时两只耳罩在头两侧；转成侧面时只见近侧那只，头梁变窄。o 与 drawPerson 的参数同义，bob 是走路时身体的起伏。
function s21_phones(ctx, o) {
  const T = o.turn, near = lerp(-57, -5, T), far = lerp(57, 3, T), hy = -284;
  ctx.save(); ctx.translate(o.x, o.y - o.bob * o.s); ctx.scale(o.s * o.dir, o.s); ctx.rotate(o.lean); ctx.translate(T * 6, 0);
  ctx.lineCap = 'round';
  for (const [color, w] of [[PAL.line, 16], [INK, 8]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse((near + far) / 2, hy, (far - near) / 2, 64, 0, Math.PI, 0); ctx.stroke(); }
  for (const [x, alpha] of [[far, 1 - T], [near, 1]]) {
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha; ctx.fillStyle = INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x - 13, hy - 10, 26, 44, 12); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// 包裹：纸箱上贴一张带播放键的标签，代表做好的成片。(x, y) 是底边中点。
function s21_box(ctx, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(0, 4, 78, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9bd7e'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-64, -104, 128, 104, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c99a62'; ctx.fillRect(-64, -104, 128, 22); ctx.beginPath(); ctx.roundRect(-64, -104, 128, 104, 10); ctx.stroke();
  ctx.fillStyle = PAL.white; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-36, -70, 72, 50, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.moveTo(-9, -59); ctx.lineTo(14, -45); ctx.lineTo(-9, -31); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// 右边的门：open 从 0 到 1 时门扇朝里打开。
function s21_door(ctx, open) {
  ctx.fillStyle = '#c9c4ee'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(1690, 470, 180, 384, [16, 16, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#545a7c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(1708, 488, 144, 362); ctx.fill(); ctx.stroke();
  const w = 144 * (1 - .74 * open);
  ctx.fillStyle = '#f3dfc2'; ctx.beginPath(); ctx.rect(1852 - w, 488, w, 362); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ORANGE; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1852 - w + 18, 676, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function scene21(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const arrive = b('human') + 1.2, walkK = seg(L, b('human') - .5, 1.7), here = ease.inOut(seg(L, arrive, .35));
  const give = ease.out(seg(L, b('deliver'), .6)), sheetK = ease.inOut(seg(L, b('deliver') + .15, .6));
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t, '#edf1ff', '#fff7ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);
  s21_door(ctx, ease.inOut(seg(L, b('human') - .9, .4)) * (1 - ease.inOut(seg(L, arrive + .2, .4))));

  // 话筒：说到“读音”时亮起来，旁边跳出一小段声波。
  const say = seg(L, b('say'), .3);
  ctx.lineCap = 'round';
  for (const [color, w] of [[PAL.line, 20], [GREY, 11]]) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(170, 668); ctx.lineTo(170, 842); ctx.moveTo(120, 846); ctx.lineTo(220, 846); ctx.stroke(); }
  mic(ctx, 170, 590, 1.25, say);
  if (say > 0) waveform(ctx, 226, 566, 60, 48, t, say, INDIGO, 5);
  // 手机：平放在矮凳上，说到“手机”时立起来，里面的小画面在播。
  ctx.fillStyle = '#d9d5ee'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(380, 790, 140, 62, 10); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(450, 790); ctx.scale(1, lerp(.1, 1, ease.back(seg(L, b('phone'), .45)))); icon(ctx, 'phone', 0, -84, 1.8, t); ctx.restore();
  // 音符从右边飘过机器人的耳边。
  const tune = seg(L, b('music'), .3) * (1 - seg(L, b('human') - .7, .3));
  if (tune > 0) for (let i = 0; i < 3; i++) {
    const u = (t * .17 + i / 3) % 1;
    ctx.save(); ctx.globalAlpha = tune * Math.sin(u * Math.PI); icon(ctx, 'note', lerp(1500, 930, u), 548 + Math.sin(u * 9 + i) * 26 - i * 14, 1.05 - .15 * i, 0, INDIGO); ctx.restore();
  }
  // 三个问号：耳边一个，话筒旁一个，手机旁一个。
  const ask = (x, y, at, until) => { const k = popIn(L, at) * (until ? 1 - seg(L, until, .3) : 1); if (k > 0) mark(ctx, 'q', x, y + sway(t, 1.7, x / 300) * 5, 1.25 * k, 1, ORANGE_D); };
  ask(908, 548, b('music') + .25, b('human') - .7); ask(96, 532, b('say') + .15); ask(556, 655, b('phone') + .35);

  // 包裹先放在机器人脚边；“交付”时推到创作者面前，清单从它手里升起来展开。
  s21_box(ctx, lerp(932, 1236, give), 852 - Math.sin(give * Math.PI) * 26);

  // 机器人：摊手摇头；听音符、看话筒、看手机，都拿不准；招呼创作者；推出包裹，指着清单。
  const shrug = seg(L, b('cant'), .25) * (1 - seg(L, b('music') - .2, .3)), hear = seg(L, b('music'), .3) * (1 - seg(L, b('say') - .15, .25));
  const toMic = seg(L, b('say'), .25) * (1 - seg(L, b('phone') - .1, .2)), toPhone = seg(L, b('phone'), .25) * (1 - seg(L, b('human') - .7, .3));
  const greet = seg(L, b('human') - .4, .3) * (1 - seg(L, b('deliver') - .35, .3));
  const push = seg(L, b('deliver') - .1, .25) * (1 - seg(L, b('deliver') + .7, .3)), show = seg(L, b('deliver') + .7, .3);
  let pose = botMix(BOTS.idle, BOTS.shrug, shrug);
  pose = botMix(pose, { armR: [.5, -2.6], mouth: 'flat', headTilt: .08, lookX: 1, lookY: -.2 }, hear);
  pose = botMix(pose, { ...BOTS.worry, lookX: -1, lookY: -.2 }, toMic);
  pose = botMix(pose, { ...BOTS.worry, armL: [2.6, .5], lookX: -1, lookY: .4 }, toPhone);
  pose = botMix(pose, { ...BOTS.wave, lookX: 1 }, greet);
  pose = botMix(pose, { ...BOTS.stop, lookX: 1, lookY: .5 }, push);
  pose = botMix(pose, { armR: [-.75, -.3], lookX: 1, lookY: -.6, mouthOpen: .5 }, show);
  const wag = Math.sin((L - b('cant')) * 14) * .07 * seg(L, b('cant'), .1) * (1 - seg(L, b('cant') + .1, .8));
  let nod = 0; for (let i = 0; i < 3; i++) nod += Math.sin(seg(L, b('list') + i * .2, .2) * Math.PI) * 14;
  drawBot(ctx, { ...pose, ...botAlive(t, talking), x: 760, y: 856, s: .9, headTilt: pose.headTilt + wag, hop: nod, chest: L > b('deliver') ? 'lines' : 'dot' });

  // 清单：上面两行已经打勾；下面三行前面是空方框（配乐、读音、手机），“列出来”时一条一条弹出来。
  if (sheetK > 0) {
    ctx.save(); ctx.translate(lerp(900, 1060, sheetK), lerp(640, 450, sheetK) + sway(t, 3.3) * 4 * sheetK); ctx.rotate((1 - sheetK) * -.5); ctx.scale(lerp(.15, 1, sheetK), lerp(.15, 1, sheetK));
    ctx.fillStyle = 'rgba(40,40,80,.13)'; ctx.beginPath(); ctx.roundRect(-143, -174, 300, 370, 14); ctx.fill();
    ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-150, -185, 300, 370, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INDIGO; ctx.beginPath(); ctx.roundRect(-150, -185, 300, 52, [14, 14, 0, 0]); ctx.fill(); ctx.beginPath(); ctx.roundRect(-150, -185, 300, 370, 14); ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = PAL.white; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-118, -159); ctx.lineTo(0, -159); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = GREY; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-76, -92 + i * 48); ctx.lineTo(104 - i * 40, -92 + i * 48); ctx.stroke();
      mark(ctx, 'check', -112, -92 + i * 48, .42, 1);
    }
    for (let i = 0; i < 3; i++) {
      const out = ease.out(seg(L, b('list') + i * .2, .3)), hot = seg(L, b('open') + i * .12, .25), grow = 1 + .3 * Math.sin(hot * Math.PI);
      ctx.save(); ctx.translate(out * 44, 15 + i * 55); ctx.scale(1 + .06 * out, 1 + .06 * out);
      if (out > 0) {
        ctx.fillStyle = 'rgba(40,40,80,' + .14 * out + ')'; ctx.beginPath(); ctx.roundRect(-132, -19, 276, 48, 12); ctx.fill();
        ctx.fillStyle = PAL.white; ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-138, -24, 276, 48, 12); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = GREY; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(108 - (i % 2) * 34, 0); ctx.stroke();
      ctx.fillStyle = PAL.white; ctx.strokeStyle = hot > .5 ? ORANGE_D : GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-110 - 14 * grow, -14 * grow, 28 * grow, 28 * grow, 6); ctx.fill(); ctx.stroke();
      const pop = ease.back(hot);
      if (pop > 0) {
        ctx.translate(-56, 0); ctx.scale(pop, pop);
        if (i === 0) icon(ctx, 'note', 0, 2, .44, 0, INDIGO); else if (i === 1) mic(ctx, 0, 2, .3, 1); else icon(ctx, 'phone', 0, 0, .4, t);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 创作者戴着耳机从门里走进来（侧面走路），站定后转回正面；看清单上的空方框，一条一条指过去。
  if (walkK > 0) {
    const man = { x: lerp(1782, 1380, walkK), y: 856, s: .92, dir: -1, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.1, .3) };
    ctx.save(); ctx.globalAlpha = seg(L, b('human') - .5, .2);
    if (walkK < 1) {
      const phase = walkK * 2.5;
      drawPerson(ctx, { ...man, walk: phase % 1 });
      s21_phones(ctx, { ...man, turn: 1, lean: .07, bob: Math.abs(Math.cos(phase * Math.PI * 2)) * 5 });
    } else {
      const idx = clamp((L - b('list')) / .2, 0, 2), aim = seg(L, b('list') - .15, .25), sh = [46 * man.s, -226 * man.s];
      const to = reach(sh[0], sh[1], (1262 - man.x) * man.dir, 465 + idx * 55 - man.y, 50 * man.s, 46 * man.s);
      drawPerson(ctx, { ...man, turn: 1 - here, lookX: .8, lookY: lerp(.2, -.6, sheetK), mood: L > b('list') ? 'happy' : L > b('open') ? 'o' : 'smile',
        armR: [lerp(1.2, to[0], aim), lerp(-.2, to[1], aim)], hop: Math.sin(seg(L, b('open') + .1, .3) * Math.PI) * 12 });
      s21_phones(ctx, { ...man, y: man.y - Math.sin(seg(L, b('open') + .1, .3) * Math.PI) * 12 * man.s, turn: 1 - here, lean: 0, bob: 0 });
      // 耳机里有声音：两侧的小弧线一下一下地跳。
      ctx.strokeStyle = INDIGO; ctx.lineWidth = 6;
      for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = here * (side < 0 ? 1 - aim : 1) * (.35 + .65 * Math.abs(Math.sin(t * 5 - i * 1.1)));
        ctx.beginPath(); ctx.arc(man.x + side * 66, 610, 16 + i * 14, side > 0 ? -.7 : Math.PI - .7, side > 0 ? .7 : Math.PI + .7); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const gone = 1 - seg(L, b('deliver') - .3, .3);
  const l1 = popIn(L, b('music') + .3), a1 = vis * (1 - seg(L, b('human') - .6, .3));
  if (l1 > 0 && a1 > 0) f.label('s21_music', { ...at(1150, 440), size: 46, color: '#ffffff', plate: INDIGO, scale: l1, alpha: a1 });
  const l2 = popIn(L, b('say') + .3);
  if (l2 > 0 && gone > 0) f.label('s21_say', { ...at(200, 415), size: 46, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis * gone });
  const l3 = popIn(L, b('phone') + .4);
  if (l3 > 0 && gone > 0) f.label('s21_phone', { ...at(450, 560), size: 46, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis * gone });
  const l4 = popIn(L, b('human') + .3);
  if (l4 > 0) f.label('s21_human', { ...at(1400, 462), size: 46, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis });
  const l5 = popIn(L, b('open') + .2);
  if (l5 > 0) f.label('s21_open', { ...at(1060, 222), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l5, alpha: vis });
}
