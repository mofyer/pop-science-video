// ---------- S12 你确认了才开工：这支视频的脚本被打回了两次，现在是第三版 ----------
// 两张被打回的稿子亮出来的位置、地上那摞纸的位置、闸门中线、第三版那一叠的位置。
const s12_V1 = [440, 322], s12_V2 = [900, 322], s12_PILE = [664, 840], s12_V3 = [592, 672], s12_GATE = 1450;
const s12_SKILL = [790, 328], s12_HF = [900, 420];

// 一叠纸平放着看：n 层，(x, y) 是最下面一层的底边中点。
function s12_pile(ctx, x, y, n, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-62 + i * 3, -20 - i * 7, 124, 20, 6); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = GREY; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-44 + n * 3, -10 - (n - 1) * 7); ctx.lineTo(24 + n * 3, -10 - (n - 1) * 7); ctx.stroke();
  ctx.restore();
}
// 被打回的一版（中心为原点，宽 w、高 300）：顶上一条色带留给版本标签。kind 1 中间一大片空白，kind 2 有两个等着补的虚线空位；hole 是空缺显出来的程度。
function s12_page(ctx, w, kind, hole, t) {
  const h = 300; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 16); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); ctx.fill();
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, 78, [16, 16, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-w / 2 + 30, -h / 2 + 100); ctx.lineTo(w / 2 - (kind === 1 ? 70 : 150), -h / 2 + 100); ctx.stroke();
  if (hole <= 0) return;
  const pulse = .5 + .5 * sway(t, 1.1);
  ctx.globalAlpha *= clamp(hole); ctx.setLineDash([14, 11]); ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 5; ctx.fillStyle = 'rgba(240,138,60,' + (.08 + .1 * pulse) + ')';
  const boxes = kind === 1 ? [[0, 58, w - 56, 150]] : [[s12_SKILL[0] - s12_V2[0], s12_SKILL[1] - s12_V2[1], 142, 72], [s12_HF[0] - s12_V2[0], s12_HF[1] - s12_V2[1], 376, 72]];
  for (const [cx, cy, bw, bh] of boxes) { ctx.beginPath(); ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 16); ctx.fill(); ctx.stroke(); }
  ctx.setLineDash([]);
}
// 第三版：厚厚一叠正面朝前，(x, y) 是最上面那张的中心；seal 是盖章的进度。
function s12_bundle(ctx, x, y, sc, seal) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let i = 5; i >= 0; i--) { ctx.fillStyle = i ? '#f3ecdc' : PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-85 + i * 6, -100 + i * 5, 170, 200, 12); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = 'rgba(11,122,117,.22)'; ctx.beginPath(); ctx.roundRect(-85, -100, 170, 74, [12, 12, 0, 0]); ctx.fill();
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-85, -100, 170, 200, 12); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.lineWidth = 8; for (const [yy, len] of [[-4, 116], [20, 84]]) { ctx.beginPath(); ctx.moveTo(-58, yy); ctx.lineTo(-58 + len, yy); ctx.stroke(); }
  if (seal > 0) {
    ctx.save(); ctx.translate(0, 64); ctx.scale(1.6 - .6 * ease.out(seal), 1.6 - .6 * ease.out(seal)); ctx.globalAlpha = clamp(seal * 2);
    ctx.strokeStyle = TEAL; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    mark(ctx, 'check', 0, 64, .72, seal, TEAL);
  }
  ctx.restore();
}
// 闸门：卷帘门后面是引擎。open 是门升起的程度，lamp 是顶灯变青的程度，wait 是“还在等”的灰色脉冲。
function s12_gate(ctx, open, lamp, wait, shake, t) {
  const x0 = s12_GATE - 210, w = 420, top = 300, o = ease.inOut(clamp(open));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.ellipse(s12_GATE, 852, 250, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(x0 + 20, top + 20, w - 40, 850 - top - 20);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 + 24, top + 24, w - 48, 850 - top - 24); ctx.clip();
  if (o > 0) {
    ctx.fillStyle = 'rgba(143,240,221,.22)'; ctx.beginPath(); ctx.arc(s12_GATE, 640, 220, 0, Math.PI * 2); ctx.fill();
    gear(ctx, s12_GATE - 56, 560, 92, t * .9, GREY, 10); gear(ctx, s12_GATE + 78, 664, 60, -t * 1.38, ORANGE, 8);
    conveyor(ctx, x0 + 40, 786, w - 80, t * 90, 40);
  }
  const bottom = lerp(850, top + 74, o) + shake;
  ctx.fillStyle = '#cdd1e2'; ctx.fillRect(x0 + 24, top + 24, w - 48, bottom - top - 24);
  ctx.strokeStyle = '#a3a9c2'; ctx.lineWidth = 4;
  for (let y = bottom - 34; y > top + 24; y -= 34) { ctx.beginPath(); ctx.moveTo(x0 + 24, y); ctx.lineTo(x0 + w - 24, y); ctx.stroke(); }
  ctx.fillStyle = GREY; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x0 + 30, bottom - 24, w - 60, 24, 8); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#5a6078'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  for (const x of [x0, x0 + w - 28]) { ctx.beginPath(); ctx.roundRect(x, top, 28, 852 - top, 6); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(x0 - 16, top - 24, w + 32, 52, 14); ctx.fill(); ctx.stroke();
  // 顶灯
  const ly = top - 62;
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(s12_GATE, top - 24); ctx.lineTo(s12_GATE, ly + 18); ctx.stroke();
  if (wait > 0) { const ring = (t * .8) % 1; ctx.strokeStyle = 'rgba(141,151,173,' + .7 * wait * (1 - ring) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(s12_GATE, ly, 26 + ring * 34, 0, Math.PI * 2); ctx.stroke(); }
  if (lamp > 0) { ctx.fillStyle = 'rgba(11,122,117,' + .3 * lamp + ')'; ctx.beginPath(); ctx.arc(s12_GATE, ly, 58 + 5 * sway(t, 1.2), 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = lamp > .5 ? '#2bc4b4' : '#c3c7d6'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s12_GATE, ly, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function scene12(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const dT = Math.min(.45, .6 * (b('first') - b('twice'))), G = b('now') - b('missed'), tSkill = b('missed') + .15 * G, tHF = b('missed') + .45 * G;
  const give = ease.inOut(seg(L, b('hand'), .5)), pushA = seg(L, b('twice'), .4), pushB = seg(L, b('twice') + dT, .4);
  const back = 1 - ease.in(seg(L, b('now') - .15, .35)), v1 = ease.out(seg(L, b('first'), .45)) * back, v2 = ease.out(seg(L, b('second'), .45)) * back;
  const v3 = popIn(L, b('now'), .4), hit = seg(L, b('third'), .3), open = seg(L, b('third') + .05, .5);
  // 镜头：说实话时推近两人；亮出被打回的稿子时往左让一点，讲完拉回。幅度以闸门始终留在画面里为限。
  const push = ease.inOut(seg(L, b('truth'), .6)) * (1 - ease.inOut(seg(L, b('twice') - .45, .6)));
  const review = ease.inOut(seg(L, b('first') - .1, .5)) * (1 - ease.inOut(seg(L, b('now') - .2, .5)));
  const cam = makeCam(lerp(960, 850, push) - 100 * review, lerp(545, 585, push) + 10 * review, (1 + .04 * seg(L, 0, D)) * (1 + .08 * push + .06 * review));
  studio(ctx, t, '#eceeff', '#fff8ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 闸门：确认之前关着、灯是灰的；第三版盖了章才打开。
  const waiting = seg(L, b('gate'), .2) * (1 - seg(L, b('third'), .2)), rattle = seg(L, b('gate'), .5);
  s12_gate(ctx, open, seg(L, b('third') + .05, .25), waiting, rattle > 0 && rattle < 1 ? Math.sin(rattle * Math.PI * 5) * 10 * (1 - rattle) : 0, t);

  // 地上那摞被打回的稿子。
  const hand = personHandR({ x: 400, y: 856, armR: [.35, -1.0] }), from = [hand[0] + 22, hand[1] - 40];
  const kept = 1 - seg(L, b('now') + .2, .3);
  [[pushA, 0, 0], [pushB, 1, -.06]].forEach(([k, level, rot]) => {
    if (k <= 0 || kept <= 0) return;
    ctx.save(); ctx.globalAlpha = kept;
    const x = lerp(from[0], s12_PILE[0] - level * 12, ease.out(k)), y = lerp(from[1], s12_PILE[1] - level * 24, ease.in(k));
    s12_pile(ctx, x, y, 3, rot + (1 - k) * .5); ctx.restore();
  });
  burst(ctx, s12_PILE[0], s12_PILE[1] - 10, seg(L, b('twice') + .4, .3), 8, 60, 110, LILAC);
  burst(ctx, s12_PILE[0], s12_PILE[1] - 34, seg(L, b('twice') + dT + .4, .3), 8, 60, 110, LILAC);

  // 亮出来的第一版和第二版：从那摞纸里升起来，讲完再落回去。
  [[v1, s12_V1, 300, 1, seg(L, b('unclear'), .3)], [v2, s12_V2, 430, 2, seg(L, b('missed'), .3)]].forEach(([k, to, w, kind, hole]) => {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(k * 3); ctx.translate(lerp(s12_PILE[0], to[0], k), lerp(s12_PILE[1] - 40, to[1], k) + sway(t, 3.4, kind * .3) * 4 * k); ctx.scale(lerp(.2, 1, k), lerp(.2, 1, k));
    s12_page(ctx, w, kind, hole, t); ctx.restore();
  });
  const ask = popIn(L, b('unclear') + .1, .35) * back;
  if (ask > .02) mark(ctx, 'q', s12_V1[0], s12_V1[1] + 60, 1.7 * ask, 1, ORANGE_D);
  burst(ctx, s12_SKILL[0], s12_SKILL[1], seg(L, tSkill + .35, .3), 8, 70, 120, TEAL);
  burst(ctx, s12_HF[0], s12_HF[1], seg(L, tHF + .35, .3), 10, 120, 190, TEAL);

  // 创作者：接过三张纸，翻看，皱眉推回去两次；指着稿子挑毛病；最后点头盖章。
  const held = seg(L, b('hand') + .1, .3) * (1 - seg(L, b('twice') + dT + .35, .3));
  const shove = clamp(Math.sin(seg(L, b('twice') - .05, .4) * Math.PI) + Math.sin(seg(L, b('twice') + dT - .05, .4) * Math.PI));
  const lookUp = seg(L, b('first'), .3) * (1 - seg(L, b('now') - .3, .3)), toV2 = seg(L, b('second') + .05, .3) * (1 - seg(L, b('now') - .3, .3));
  const stampUp = seg(L, b('now') + .3, .3) * (1 - seg(L, b('third') + .45, .3)), swing = ease.in(seg(L, b('third') - .22, .22));
  const armR = mix(mix(mix(mix(mix(PERSON.armR, [.35, -1.0], held), [-.05, .05], shove), [-.66, -.1], toV2), [-.85, -.35], stampUp), [.15, -.3], swing * stampUp);
  const frown = seg(L, lerp(b('truth'), b('twice'), .55), .3), nod = Math.sin(seg(L, b('third') - .05, .45) * Math.PI);
  const shake = seg(L, b('twice') - .8, .3) * (1 - seg(L, b('twice') + dT + .3, .3));
  drawPerson(ctx, {
    x: 400, y: 856, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.3, .4), squash: sway(t, 3.3) * .008, armR,
    armL: mix(PERSON.armL, [4.62, .15], seg(L, b('first') + .05, .3) * (1 - seg(L, b('second') - .1, .3))),
    lookX: lerp(lerp(.9, .7, held), lerp(.1, 1, toV2), lookUp) + shake * .7 * Math.sin(t * 9),
    lookY: lerp(.9 * held, -1, lookUp) + .4 * seg(L, b('now'), .3) + nod * 1.3, hop: Math.sin(hit * Math.PI) * 14,
    mood: L < b('hand') || frown < .5 ? 'smile' : L < b('unclear') ? 'worry' : L < b('unclear') + .8 ? 'o' : L < tHF + .4 ? 'worry' : L < b('now') ? 'smile' : L < b('third') - .1 ? 'o' : 'happy',
    sweat: shake * .8,
  });

  // 第三版那一叠：机器人从身后捧出来，举在两人中间。
  if (L >= b('now')) s12_bundle(ctx, lerp(720, s12_V3[0], clamp(v3)), lerp(730, s12_V3[1], clamp(v3)) + sway(t, 2.8) * 3, .3 + .7 * v3, hit);
  burst(ctx, s12_V3[0], s12_V3[1] + 64, seg(L, b('third'), .35), 9, 40, 96, TEAL);

  // 机器人：递纸，回头看闸门，挠头说实话，看稿子被推回来，抬头认错，捧出第三版，欢呼。
  const live = botAlive(t, talking), holdArm = reach(84, -150, 128, -176, 46, 44);
  const pose = [
    [{ ...BOTS.explain, lookY: .2 }, 1 - seg(L, b('hand') + .35, .3)],
    [{ armL: [Math.PI + .4, .3], lookX: -1, lookY: -.4, mouthOpen: .4 }, seg(L, b('gate') - .1, .25) * (1 - seg(L, b('truth') - .1, .25))],
    [{ ...BOTS.think, armR: [.5, -2.6 + .2 * Math.sin(t * 13)], lookX: .4, lookY: .5, mouth: 'wavy', headTilt: .09 }, seg(L, b('truth'), .3) * (1 - seg(L, b('twice') - .5, .3))],
    [{ ...BOTS.surprise, lookX: 1, lookY: .7 }, seg(L, b('twice') + .1, .2) * (1 - seg(L, b('twice') + dT + .3, .25))],
    [{ ...BOTS.worry, lookX: 1, lookY: .8 }, seg(L, b('twice') + dT + .3, .25) * (1 - seg(L, b('first') - .05, .25))],
    [{ ...BOTS.worry, lookX: 1, lookY: -1, headTilt: -.06 }, seg(L, b('first'), .25) * (1 - seg(L, b('second') - .1, .25))],
    [{ ...BOTS.surprise, lookX: -.2, lookY: -1 }, seg(L, b('second'), .25) * (1 - seg(L, tSkill, .25))],
    [{ armR: [-1.0, -.3], lookX: -.2, lookY: -1, mouthOpen: .5, eyes: 'happy' }, seg(L, tSkill, .25) * (1 - seg(L, b('now') - .3, .25))],
    [{ armR: holdArm, frontR: true, eyes: 'happy', mouthOpen: .7, lookX: 1, lookY: .3 }, seg(L, b('now') - .05, .3)],
    [{ ...BOTS.cheer, armR: holdArm, frontR: true, lookX: -.7, lookY: -.2 }, seg(L, b('third') + .1, .25)],
  ].reduce((acc, [next, k]) => botMix(acc, next, k), BOTS.idle);
  const bot = drawBot(ctx, {
    ...pose, blink: live.blink, ant: live.ant, squash: live.squash, chestT: t, x: 800, y: 856, s: .88, dir: -1,
    mouthOpen: pose.mouth === 'smile' ? Math.max(pose.mouthOpen, live.mouthOpen ?? 0) : pose.mouthOpen,
    hop: Math.sin(seg(L, b('twice') + .35, .3) * Math.PI) * 22 + Math.sin(seg(L, b('twice') + dT + .35, .3) * Math.PI) * 16 + Math.sin(seg(L, b('second') + .1, .35) * Math.PI) * 26 + Math.sin(seg(L, tHF + .35, .35) * Math.PI) * 24
      + Math.sin(seg(L, b('now'), .4) * Math.PI) * 30 + Math.sin(seg(L, b('third') + .1, .4) * Math.PI) * 34,
    chest: L < b('now') ? 'lines' : L < b('third') ? 'braces' : 'check',
  });

  // 三张纸：先在机器人手里，递到创作者手里被翻看，然后分两次推回去。
  const left = L < b('twice') ? 3 : L < b('twice') + dT ? 2 : 0, read = seg(L, b('truth') + .3, .4) * (1 - seg(L, b('twice') - .2, .2));
  const fanX = lerp(bot.handR[0] - 50, from[0], give), fanY = lerp(bot.handR[1] - 48, from[1], give) - Math.sin(give * Math.PI) * 46;
  for (let i = left - 1; i >= 0; i--) {
    const lift = Math.sin(((t * 1.15 + i / 3) % 1) * Math.PI) * 24 * read;
    sheet(ctx, fanX + (i - 1) * 24, fanY - lift + Math.abs(i - 1) * 8, 84, 104, { rot: (i - 1) * .24 - .1 * give, lines: 4, band: i === 0 ? INDIGO : i === 1 ? ORANGE : TEAL });
  }

  // 图章：创作者举起来，落在第三版上。
  if (stampUp > 0 && L < b('third') + .45) {
    const armNow = personHandR({ x: 400, y: 856, armR: mix([-.85, -.35], [.15, -.3], swing) }), fly = ease.in(seg(L, b('third') - .22, .22)), up = ease.out(seg(L, b('third') + .05, .3));
    ctx.save(); ctx.globalAlpha = clamp(stampUp * 2) * (1 - seg(L, b('third') + .2, .25));
    icon(ctx, 'stamp', lerp(armNow[0] + 6, s12_V3[0], fly), lerp(armNow[1] - 22, s12_V3[1] + 40, fly) - up * 60, 1.5, t, TEAL); ctx.restore();
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const gone = 1 - seg(L, b('now') - .25, .2);
  const l0 = popIn(L, b('gate'));
  if (l0 > .01) f.label('s12_wait', { ...at(s12_GATE, 590), size: 48, color: '#ffffff', plate: INDIGO, scale: l0, alpha: vis * (1 - seg(L, b('third') - .05, .15)) });
  const l1 = popIn(L, b('first') + .3), l2 = popIn(L, b('second') + .3);
  if (l1 > .01) f.label('s12_v1', { ...at(s12_V1[0], s12_V1[1] - 111), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l1, alpha: vis * gone });
  if (l2 > .01) f.label('s12_v2', { ...at(s12_V2[0], s12_V2[1] - 111), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis * gone });
  [['s12_skill', tSkill, [620, s12_SKILL[1]], s12_SKILL], ['s12_hf', tHF, [1060, s12_HF[1]], s12_HF]].forEach(([key, at0, start, slot]) => {
    if (L < at0) return;
    const k = ease.out(seg(L, at0, .4));
    f.label(key, { ...at(lerp(start[0], slot[0], k), lerp(start[1], slot[1], k)), size: 44, color: '#ffffff', plate: TEAL, scale: .7 + .3 * popIn(L, at0, .4), alpha: vis * seg(L, at0, .12) * gone });
  });
  const l5 = popIn(L, b('now') + .35), l6 = popIn(L, b('third') + .3);
  if (l5 > .01) f.label('s12_v3', { ...at(s12_V3[0], s12_V3[1] - 63), size: 44, color: '#ffffff', plate: TEAL, scale: l5, alpha: vis });
  if (l6 > .01) f.label('s12_go', { ...at(s12_GATE, 470), size: 60, color: '#ffffff', plate: TEAL, scale: l6, alpha: vis });
}
