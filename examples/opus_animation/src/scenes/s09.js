// ---------- S09 流程分两步：第一步只给一个主题，它先交三样东西 ----------
// 三张纸最后停在台阶上方排成一排；第一张是下一镜圆形展开的起点。
const s09_ROW = [[880, 318], [1150, 318], [1420, 318]], s09_KIND = ['ledger', 'wave', 'grid'];
const s09_STOP = { armL: [Math.PI + .12, .2], mouth: 'flat', lookX: -.8, headTilt: .04 };

// 一张纸：没亮时是灰的，只有几行线；亮起后整张变白、顶上换成色带，画出各自的内容（ledger 账本行、wave 声波、grid 两列格子）。
function s09_paper(ctx, x, y, kind, lit, t, rot, sc) {
  const w = 190, h = 236, band = kind === 'ledger' ? INDIGO : kind === 'wave' ? ORANGE : TEAL, on = ease.out(clamp(lit));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (on > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .42 * on + ')'; ctx.beginPath(); ctx.roundRect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 28); ctx.fill(); }
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 10, w, h, 14); ctx.fill();
  ctx.fillStyle = on > .5 ? PAPER : '#d9d9e6'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on > .5 ? band : '#b9bfd2'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, 36, [14, 14, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke();
  if (on <= .5) {
    ctx.strokeStyle = '#b9bfd2'; ctx.lineWidth = 8;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-62, -48 + i * 40); ctx.lineTo(i % 2 ? 30 : 62, -48 + i * 40); ctx.stroke(); }
  } else if (kind === 'ledger') {
    for (let i = 0; i < 4; i++) {
      const p = clamp(on * 4 - i), yy = -50 + i * 42; if (p <= 0) continue;
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.roundRect(-72, yy - 13, 26, 26, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = TEAL; ctx.lineWidth = 6; trace(ctx, [[-66, yy], [-60, yy + 7], [-50, yy - 8]], p);
      ctx.strokeStyle = GREY; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, yy); ctx.lineTo(-30 + (i % 2 ? 70 : 96) * p, yy); ctx.stroke();
    }
  } else if (kind === 'wave') {
    waveform(ctx, -74, 22, 148, 130, t, on, ORANGE_D, 9);
  } else {
    for (let i = 0; i < 3; i++) {
      const p = clamp(on * 3 - i), yy = -46 + i * 52; if (p <= 0) continue;
      ctx.save(); ctx.globalAlpha *= p;
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.fillStyle = PAL.white;
      for (const cx of [-76, 6]) { ctx.beginPath(); ctx.roundRect(cx, yy - 21, 70, 42, 8); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = INDIGO; ctx.lineWidth = 5;
      for (let j = 0; j < 4; j++) { const a = 4 + 10 * Math.abs(Math.sin(t * 6 + i * 1.7 + j)); ctx.beginPath(); ctx.moveTo(-61 + j * 13, yy - a); ctx.lineTo(-61 + j * 13, yy + a); ctx.stroke(); }
      ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(41, yy + 10 - Math.abs(Math.sin(t * 3.4 + i * 1.1)) * 18, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}
// 一级台阶：从 top 到地面的一块，on 为亮起程度，pulse 让“当前这一步”轻轻呼吸。
function s09_stair(ctx, x0, x1, top, on, pulse) {
  if (on > 0) { ctx.fillStyle = 'rgba(75,79,217,' + (.16 + .1 * pulse) * on + ')'; ctx.beginPath(); ctx.roundRect(x0 - 14, top - 22, x1 - x0 + 28, 60, 22); ctx.fill(); }
  ctx.fillStyle = on > .5 ? '#c4c0f0' : '#eeecf6'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(x0, top, x1 - x0, 856 - top, [14, 14, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on > .5 ? INDIGO : '#c3c7d6'; ctx.beginPath(); ctx.roundRect(x0, top, x1 - x0, 18, [14, 14, 0, 0]); ctx.fill(); ctx.stroke();
}

function scene09(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const on1 = seg(L, b('two'), .3), on2 = seg(L, b('two') + .35, .3) * (1 - seg(L, b('topic') - .1, .3)), now1 = seg(L, b('topic') - .2, .4);
  const say = popIn(L, b('topic'), .35), fly = ease.inOut(seg(L, b('topic') + .75, .5)), got = seg(L, b('topic') + 1.2, .5);
  const reach = ease.out(seg(L, b('notyet'), .25)) * (1 - ease.inOut(seg(L, b('notyet') + .95, .35)));
  const stop = seg(L, b('notyet') + .1, .2) * (1 - seg(L, b('three') - .4, .3)), away = ease.inOut(seg(L, b('notyet') + .3, .7));
  const present = seg(L, b('three') - .15, .3), nod = Math.sin(seg(L, b('three') + 1.05, .5) * Math.PI), done = seg(L, b('beat') + .15, .3);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t);
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 两级台阶在右边，整个留在画面里（画到边上会被布局检查拦下）。先依次亮起；说到“第一步”时第二级暗下去，只留第一级亮着。
  s09_stair(ctx, 1480, 1850, 650, on2, 0);
  s09_stair(ctx, 1080, 1480, 750, on1, now1 * (.5 + .5 * sway(t, 1.6)));

  // 胶片盒：先悬在两人之间，被拦下后退到第二级台阶上，变成虚影。
  const canX = lerp(520, 1665, away), canY = lerp(215 + sway(t, 2.6) * 10, 588, away) - Math.sin(away * Math.PI) * 130;
  if (away < 1) { ctx.fillStyle = 'rgba(255,211,77,' + (.3 + .1 * sway(t, 1.8)) * (1 - away) + ')'; ctx.beginPath(); ctx.arc(canX, canY, 92, 0, Math.PI * 2); ctx.fill(); }
  filmCan(ctx, canX, canY, 62, t * .5 + away * 5, away * .65);
  burst(ctx, 1665, 620, seg(L, b('notyet') + 1.0, .35), 8, 50, 110, LILAC);

  // 创作者：先看台阶，说出主题，伸手去够胶片盒，最后看着三张纸点头。
  const speak = say * (1 - seg(L, b('topic') + 1.0, .3));
  const armR = mix(mix(PERSON.armR, [-.3, -.9], clamp(speak)), [-1.08, 0], reach);
  const gaze = seg(L, b('three'), .3);
  drawPerson(ctx, {
    x: 250, y: 856, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.3, .4), squash: sway(t, 3.3) * .008,
    armR, lookX: lerp(.8, 1, gaze), lookY: -reach - .8 * gaze + nod * 1.6, hop: reach * 12 + Math.sin(done * Math.PI) * 18,
    mood: reach > .5 ? 'o' : speak > .3 || nod > .2 || L > b('ledger') ? 'happy' : 'smile',
  });

  // 话泡里一只灯泡：从创作者头顶飞向机器人，被它收下。
  if (say > 0 && fly < 1) {
    const x = lerp(345, 640, fly), y = lerp(415, 730, fly) - Math.sin(fly * Math.PI) * 90;
    ctx.save(); ctx.translate(x, y + sway(t, 2.2) * 5 * (1 - fly)); ctx.scale(say * lerp(1, .35, fly), say * lerp(1, .35, fly));
    bubble(ctx, 0, 0, 156, 116, -36); icon(ctx, 'bulb', 0, -4, 1.35, t); ctx.restore();
  }

  // 机器人：指台阶，听主题，拦住，亮出三张纸。
  const explain = seg(L, b('two') - .25, .3) * (1 - seg(L, b('topic') - .3, .3));
  const listen = seg(L, b('topic') - .2, .3) * (1 - seg(L, b('three') - .3, .3));
  const pose = botMix(botMix(botMix(botMix(botMix(BOTS.idle, BOTS.explain, explain), { lookX: -1, lookY: -.3, headTilt: -.05 }, listen), s09_STOP, stop),
    { armR: mix([-.3, -.2], [-.75, -.5], seg(L, b('three') + .7, .4)), lookX: .9, lookY: -.7, mouthOpen: .5 }, present), { ...BOTS.cheer, lookX: .6, lookY: -.6 }, done);
  const live = botAlive(t, talking);
  const bot = drawBot(ctx, {
    ...pose, blink: live.blink, ant: live.ant, squash: live.squash, chestT: t, x: 640, y: 856, s: .9, halo: Math.max(pose.halo, Math.sin(got * Math.PI) * .9),
    mouthOpen: pose.mouth === 'smile' ? Math.max(pose.mouthOpen, live.mouthOpen ?? 0) : pose.mouthOpen,
    hop: Math.sin(got * Math.PI) * 24 + Math.sin(seg(L, b('notyet') + .05, .3) * Math.PI) * 20 + Math.sin(seg(L, b('three'), .35) * Math.PI) * 22 + Math.sin(done * Math.PI) * 30,
    chest: got > .5 && present < .5 ? 'play' : present > .5 ? 'lines' : 'dot',
  });
  burst(ctx, 640, 730, seg(L, b('topic') + 1.2, .4), 9, 50, 120, '#ffc93c');

  // 三张纸：先在机器人手里扇形展开，再升到台阶上方排成一排，说到哪张亮哪张。
  for (let i = 2; i >= 0; i--) {
    const grow = popIn(L, b('three') + i * .07, .3); if (grow < .02) continue;
    const rise = ease.inOut(seg(L, b('three') + .5 + i * .12, .6)), lit = seg(L, b(['ledger', 'narr', 'beat'][i]), .6);
    const x = lerp(bot.handR[0] + 48 + (i - 1) * 40, s09_ROW[i][0], rise), y = lerp(bot.handR[1] - 66 + Math.abs(i - 1) * 12, s09_ROW[i][1] + sway(t, 3 + i * .4, i * .3) * 5, rise);
    s09_paper(ctx, x, y, s09_KIND[i], lit, t, (i - 1) * .34 * (1 - rise), lerp(.44 * grow, 1, rise) * (1 + .09 * Math.sin(clamp(lit * 2) * Math.PI)));
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('two') + .1), l2 = popIn(L, b('two') + .45);
  if (l1 > .01) f.label('s09_step1', { ...at(1280, 806), size: 46, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  if (l2 > .01) f.label('s09_step2', { ...at(1665, 760), size: 46, color: '#ffffff', plate: INDIGO, scale: l2, alpha: vis });
  const l3 = popIn(L, b('topic') + .15);
  if (l3 > .01) f.label('s09_topic', { ...at(330, 322), size: 50, color: '#ffffff', plate: ORANGE_D, scale: l3, alpha: vis * (1 - seg(L, b('notyet') - .3, .3)) });
  [['s09_ledger', 'ledger', INDIGO], ['s09_narr', 'narr', ORANGE_D], ['s09_beat', 'beat', TEAL]].forEach(([key, beat, plate], i) => {
    const k = popIn(L, b(beat) + .15);
    if (k > .01) f.label(key, { ...at(s09_ROW[i][0], 498), size: 46, color: '#ffffff', plate, scale: k, alpha: vis });
  });
}
