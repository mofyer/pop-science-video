// ---------- S08 判断标准：关掉声音、遮住字幕，还看不看得懂 ----------
const s08_TV = [760, 200, 800, 450];   // 屏幕内容区：x y w h

// 屏幕的支架和外框；内容区留给场景自己画。
function s08_tv(ctx) {
  const [x, y, w, h] = s08_TV;
  ctx.strokeStyle = PAL.line; ctx.lineJoin = 'round'; ctx.fillStyle = GREY; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(x + w / 2 - 24, y + h + 16, 48, 150, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + w / 2 - 130, 822, 260, 30, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(x - 22, y - 22, w + 44, h + 44, 30); ctx.fill(); ctx.stroke();
}
// 扶手椅：back 为真时画人身后的椅背，否则画人身前的坐垫和两个扶手。
function s08_chair(ctx, x, back) {
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  if (back) { ctx.fillStyle = '#9da1ee'; ctx.beginPath(); ctx.roundRect(x - 112, 630, 224, 226, 44); ctx.fill(); ctx.stroke(); return; }
  ctx.fillStyle = '#7d82ea'; ctx.beginPath(); ctx.roundRect(x - 122, 772, 244, 84, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9da1ee'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(x + side * 124 - 32, 716, 64, 140, 26); ctx.fill(); ctx.stroke(); }
}
// 一张静止的文字卡片：标题加四行要点；grey 是变灰的程度。
function s08_slide(ctx, x, y, w, h, grey) {
  ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h); ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(x + 96, y + 88); ctx.lineTo(x + w * .6, y + 88); ctx.stroke();
  ctx.strokeStyle = INDIGO; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + 86, y + 134); ctx.lineTo(x + 250, y + 134); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const yy = y + 190 + i * 50;
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(x + 100, yy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GREY; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(x + 136, yy); ctx.lineTo(x + w * (.8 - (i % 2) * .17), yy); ctx.stroke();
  }
  if (grey > 0) { ctx.fillStyle = 'rgba(196,196,205,' + .8 * grey + ')'; ctx.fillRect(x, y, w, h); }
}
// 揉成一团的纸。
function s08_wad(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = '#d5d5dd'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = r * (.78 + .3 * hash(i + 2)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 3.5; ctx.strokeStyle = GREY; ctx.beginPath(); ctx.moveTo(-r * .5, -r * .1); ctx.lineTo(0, r * .15); ctx.lineTo(r * .4, -r * .3); ctx.moveTo(-r * .1, -r * .5); ctx.lineTo(r * .1, r * .5); ctx.stroke();
  ctx.restore();
}

function scene08(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const mix = (a, c, k) => a.map((v, i) => lerp(v, c[i], k));
  const span = (from, to, d = .25) => seg(L, from, d) * (1 - seg(L, to, d));
  const [sx, sy, sw, sh] = s08_TV, cx = sx + sw / 2, cy = sy + sh / 2;
  const muted = ease.inOut(seg(L, b('mute'), .35)), board = ease.inOut(seg(L, b('cover'), .45));
  const near = ease.inOut(seg(L, b('see'), .4)) * (1 - ease.inOut(seg(L, b('cant') + .1, .4)));
  const swap = ease.inOut(seg(L, b('cant'), .35)), grey = seg(L, b('slides'), .3);
  const wad = seg(L, b('redo'), .3), toss = seg(L, b('redo') + .28, .5), enter = seg(L, b('redo') + .15, .5);
  // 从“看不看得出”到“重做”之前镜头推向屏幕，重做时拉回，屏幕回到圆形展开的位置。
  const push = ease.inOut(seg(L, b('see') - .1, .6)) * (1 - ease.inOut(seg(L, b('redo') - .1, .5)));
  const cam = makeCam(960 + 40 * push, 545 + 18 * push, 1 + .04 * seg(L, 0, D) + .06 * push);
  studio(ctx, t, '#edf0ff', '#fff7ee');
  ctx.save(); cam.apply(ctx);

  // 创作者坐在扶手椅里：先按遥控器关声音、放下挡板；然后凑近看；看不懂时靠回去发愁；重做后举手。
  const px = 300 + 24 * near, lean = .1 * near, click = Math.max(span(b('mute') - .3, b('mute') + .45, .2), span(b('cover') - .3, b('cover') + .45, .2)), cheer = seg(L, b('redo') + .5, .3);
  const armL = mix(mix([1, -1.2], [.15, -.45], click), [-.95, -.3], cheer), a1 = armL[0] + armL[1];
  const lx = -5.5 + Math.cos(armL[0]) * 50 + Math.cos(a1) * 46, ly = -226 + Math.sin(armL[0]) * 50 + Math.sin(a1) * 46;
  const hand = [px + lx * Math.cos(lean) - ly * Math.sin(lean), 890 + lx * Math.sin(lean) + ly * Math.cos(lean)];
  s08_chair(ctx, 300, true);
  drawPerson(ctx, { x: px, y: 890, turn: 1, top: '#5b6ee1', hair: '#33262b', blink: blinkAt(t, 4.1, .4), lookX: 1, lookY: -.3, lean, armL,
    mood: L < b('see') ? 'smile' : L < b('see') + .35 ? 'o' : L < b('cant') ? 'happy' : L < b('redo') + .4 ? 'worry' : 'happy',
    sweat: seg(L, b('slides'), .3) * (1 - seg(L, b('redo') + .3, .3)), squash: sway(t, 3.4) * .008 });
  // 遥控器握在手里，按下时冒出两道信号弧。
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(a1 + lean); ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-8, -11, 46, 22, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(28, 0, 5, 0, Math.PI * 2); ctx.fill();
  for (const at of [b('mute'), b('cover')]) {
    const k = seg(L, at - .05, .45); if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 6 * (1 - k); ctx.lineCap = 'round';
    for (const r of [40, 70]) { ctx.beginPath(); ctx.arc(30, 0, r + 60 * k, -.45, .45); ctx.stroke(); }
  }
  ctx.restore();
  floor(ctx);
  s08_chair(ctx, 300, false);

  // 屏幕：里面的小球一直在动，底下一条字幕逐词亮；“看不出来”时换成一张静止的文字卡片，“幻灯片”时变灰。
  s08_tv(ctx);
  ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 12); ctx.clip();
  miniScene(ctx, sx, sy, sw, sh, t * .9, { r: 0 });
  ctx.fillStyle = 'rgba(44,47,72,.8)'; ctx.beginPath(); ctx.roundRect(sx + 50, sy + sh - 86, sw - 100, 60, 16); ctx.fill();
  for (let i = 0, x = sx + 78; i < 7; i++) {
    const w = [70, 92, 64, 96, 78, 88, 72][i];
    ctx.fillStyle = i === Math.floor(t * 2.6) % 7 ? '#ffd34d' : PAL.white; ctx.beginPath(); ctx.roundRect(x, sy + sh - 68, w, 24, 8); ctx.fill(); x += w + 14;
  }
  if (swap > 0 && wad <= 0) s08_slide(ctx, sx + (1 - swap) * sw, sy, sw, sh, grey);
  if (wad > 0 && wad < 1) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(wad * 1.3); ctx.scale(lerp(1, .13, ease.in(wad)), lerp(1, .13, ease.in(wad))); s08_slide(ctx, -sw / 2, -sh / 2, sw, sh, 1); ctx.restore(); }
  // 挡板从屏幕上沿滑下来，盖住字幕条。
  if (board > 0) {
    const y = lerp(sy - 100, sy + sh - 100, board);
    ctx.fillStyle = '#f6c56a'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(sx + 26, y, sw - 52, 88, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0a83f'; for (const x of [sx + 60, sx + sw - 110]) { ctx.beginPath(); ctx.roundRect(x, y + 10, 50, 68, 8); ctx.fill(); }
  }
  ctx.restore();
  // 喇叭挂在屏幕左边，朝着观众。
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - 22, 330); ctx.lineTo(676, 330); ctx.stroke();
  ctx.save(); ctx.translate(652, 330); ctx.scale(-1, 1); speaker(ctx, 0, 0, 1.5, t, muted); ctx.restore();

  // 头顶的记号：看得懂是感叹号，看不懂换成问号。
  const bang = popIn(L, b('see') + .3) * (1 - seg(L, b('cant'), .2)), ask = popIn(L, b('cant') + .2) * (1 - seg(L, b('redo') + .3, .2));
  for (const [kind, k, color] of [['bang', bang, TEAL], ['q', ask, ORANGE_D]]) {
    if (k <= 0) continue;
    ctx.save(); ctx.translate(px + 70, 470 + sway(t, 1.7) * 4); ctx.scale(k, k);
    ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    mark(ctx, kind, 0, kind === 'q' ? -2 : 0, 1.15, 1, color); ctx.restore();
  }

  // “重做”：卡片被揉成一团丢出画面，机器人从右边跳进来，屏幕又动起来。
  if (wad >= 1 && toss < 1) s08_wad(ctx, lerp(cx, 2010, toss), lerp(cy, 30, toss) - Math.sin(toss * Math.PI) * 150, 52, toss * 9);
  if (enter > 0) {
    const landed = seg(L, b('redo') + .65, .25), pose = botMix(BOTS.cheer, { ...BOTS.explain, eyes: 'happy' }, seg(L, b('redo') + .9, .3));
    drawBot(ctx, { ...pose, ...botAlive(t, false), x: lerp(2090, 1715, ease.out(enter)), y: 856, s: .85, dir: -1, hop: Math.sin(enter * Math.PI) * 150, squash: Math.sin(landed * Math.PI) * .09 });
  }
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const l1 = popIn(L, b('mute') + .3);
  if (l1 > 0) f.label('s08_mute', { ...at(636, 452), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l1, alpha: vis });
  const l2 = popIn(L, b('cover') + .45);
  if (l2 > 0) f.label('s08_cover', { ...at(cx, sy + sh - 56), size: 46, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  const l3 = popIn(L, b('see') + .45);
  if (l3 > 0) f.label('s08_see', { ...at(372, 372), size: 50, color: '#ffffff', plate: INDIGO, scale: l3, alpha: vis * (1 - seg(L, b('redo') + .2, .25)) });
  const l4 = popIn(L, b('slides') + .2);
  if (l4 > 0) f.label('s08_slides', { ...at(cx + 150, sy + 120), size: 60, color: '#ffffff', plate: ORANGE_D, rotate: -.1, scale: l4, alpha: vis * (1 - seg(L, b('redo'), .15)) });
  const l5 = popIn(L, b('redo') + .6);
  if (l5 > 0) f.label('s08_redo', { ...at(1715, 408), size: 56, color: '#ffffff', plate: TEAL, scale: l5, alpha: vis });
}
