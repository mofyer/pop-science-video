// ---------- S06 渲染靠的是开源框架 HyperFrames ----------
// 木箱：lid 从 0 到 1 时箱盖向后掀开。(x, y) 是底边中点。
function s06_crate(ctx, x, y, s, lid) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(0, 6, 190, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9a866'; ctx.beginPath(); ctx.roundRect(-160, -210, 320, 210, 12); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b07f42'; ctx.lineWidth = 8; for (const dx of [-80, 0, 80]) { ctx.beginPath(); ctx.moveTo(dx, -196); ctx.lineTo(dx, -14); ctx.stroke(); }
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-160, -210, 320, 210, 12); ctx.stroke();
  // 箱盖绕后沿掀起来
  ctx.translate(-168, -210); ctx.rotate(-lid * 1.9);
  ctx.fillStyle = '#e7bd82'; ctx.beginPath(); ctx.roundRect(0, -30, 336, 30, 10); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 浏览器窗口：标题栏三个圆点，里面左边一块小场景、右边两块标签牌。dashed 为 1 时边框变虚线（后台运行）。
// 返回三样东西各自的中心，给时间条连线用。
function s06_window(ctx, x, y, w, h, tt, dashed = 0) {
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(x + 8, y + 14, w, h, 22); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill();
  ctx.fillStyle = LILAC; ctx.beginPath(); ctx.roundRect(x, y, w, h * .13, [22, 22, 0, 0]); ctx.fill();
  [ORANGE, '#ffd34d', BOTC.glow].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + w * .04 + i * w * .036, y + h * .065, h * .025, 0, Math.PI * 2); ctx.fill(); });
  if (dashed > .5) ctx.setLineDash([18, 14]);
  ctx.strokeStyle = dashed > .5 ? GREY : PAL.line; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.stroke(); ctx.setLineDash([]);
  const sw = w * .46, sh = h * .46, sx = x + w * .05, sy = y + h * .2;
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(sx - 4, sy - 4, sw + 8, sh + 8, 12); ctx.stroke();
  miniScene(ctx, sx, sy, sw, sh, tt, { r: 8 });
  const tags = [[x + w * .76, y + h * .3, INDIGO], [x + w * .76, y + h * .52, ORANGE_D]];
  tags.forEach(([cx, cy, color], i) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(cx - w * .17, cy - h * .07, w * (i ? .28 : .34), h * .14, h * .07); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(4, h * .018); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * .13, cy); ctx.lineTo(cx + w * (i ? .06 : .12), cy); ctx.stroke();
  });
  return [[sx + sw / 2, sy + sh], [tags[0][0], tags[0][1] + h * .07], [tags[1][0] - w * .03, tags[1][1] + h * .07]];
}
// 压片机：左边进料口，机身两只滚轮，下面出片。squeeze 是正在压的抖动量。
function s06_press(ctx, x, y, t, squeeze = 0, on = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + squeeze * .05, 1 - squeeze * .07); ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.fillStyle = '#4a4f66'; ctx.beginPath(); ctx.moveTo(-150, -60); ctx.lineTo(-96, -34); ctx.lineTo(-96, 34); ctx.lineTo(-150, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a6078'; ctx.beginPath(); ctx.roundRect(-100, -92, 200, 184, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-34, 78, 68, 26, 8); ctx.fill(); ctx.stroke();
  ctx.restore();
  gear(ctx, x - 40, y + 26, 30, t * 3 * on, GREY, 8); gear(ctx, x + 40, y + 26, 30, -t * 3 * on, ORANGE, 8);
}
function scene06(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  const lid = ease.out(seg(L, b('open'), .5)), rise = seg(L, b('hf'), .6), page = ease.out(seg(L, b('page'), .6));
  const inside = ease.inOut(seg(L, b('inside'), .7)), back = ease.inOut(seg(L, b('browser'), .9));
  const press = seg(L, b('encode'), 1.0), again = seg(L, b('same'), 1.2), out = seg(L, b('out'), .5);
  const [sx, sy] = shake(L, b('encode') + .55, .3, 7);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D), sx, sy);
  studio(ctx, t, '#e8f1ff', '#fff8ee');
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 箱子掀盖，机器从里面长出来。
  const MX = 540, MS = 1.22;
  if (rise < 1) { ctx.save(); ctx.globalAlpha = 1 - seg(L, b('hf') + .15, .45); s06_crate(ctx, MX, 850, 1.05, lid); ctx.restore(); }
  for (let i = 0; i < 5; i++) sparkle(ctx, MX - 150 + i * 75, 560 + Math.sin(i * 2.1) * 40 - lid * 50, 26, lid * (1 - rise) * (.5 + .5 * sway(t, .8, i * .2)));
  const working = seg(L, b('browser') + .6, .4), busy = 1 + working * 1.6 + Math.sin(clamp(press) * Math.PI) * 2;
  let m = { win: [MX - 49, 850 - 195], slot: [MX + 215, 850 - 104] };
  if (rise > 0) m = hfMachine(ctx, MX, 850 + Math.sin(clamp(press) * Math.PI * 6) * 3 * (press < 1 ? 1 : 0), MS * ease.back(clamp(rise)), t * busy, clamp(rise * 2));
  burst(ctx, MX, 600, seg(L, b('hf') + .2, .5), 14, 200, 330, '#ffd34d');

  // 网页：从机器的小窗展开成一个大浏览器窗口；“后台的浏览器”时边框变虚线，缩回机器里。
  const WX = 890, WY = 190, WW = 840, WH = 440, show = page * (1 - back);
  if (show > .02) {
    const k = ease.out(clamp(show)), w = lerp(230, WW, k), h = lerp(150, WH, k), x = lerp(m.win[0] - 115, WX, k), y = lerp(m.win[1] - 75, WY, k);
    ctx.save(); ctx.globalAlpha = clamp(show * 2.2) * (back > 0 ? lerp(1, .75, clamp(back * 3)) : 1);
    const el = s06_window(ctx, x, y, w, h, t, seg(L, b('browser'), .25));
    // “第几秒出现”：每样东西下面挂出一段时间条，长短不一；“写在里面”时收进右上角的源码角标。
    const bars = [[.08, .5, INDIGO], [.3, .34, ORANGE], [.52, .4, TEAL]];
    const tagX = x + w - 70, tagY = y + h * .065;
    bars.forEach(([x0, len, color], i) => {
      const p = ease.out(seg(L, b('when') + i * .22, .4)); if (p <= 0 || k < .98) return;
      const row = y + h * (.76 + i * .065), bx = x + w * (.08 + x0 * .8), bw = w * len * .8 * p;
      const cx = lerp(bx + bw / 2, tagX, inside), cy = lerp(row, tagY, inside), sc = 1 - inside * .9;
      ctx.save(); ctx.globalAlpha *= 1 - seg(inside, .8, .2);
      if (inside < .1) { ctx.strokeStyle = GREY; ctx.lineWidth = 4; ctx.setLineDash([7, 8]); ctx.beginPath(); ctx.moveTo(el[i][0], el[i][1] + 8); ctx.lineTo(el[i][0], lerp(el[i][1] + 8, row - 12, p)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = color; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(cx - bw * sc / 2, cy - 11 * sc, bw * sc, 22 * sc, 11 * sc); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    const track = seg(L, b('when') - .1, .3) * (1 - inside);
    if (track > 0 && k > .98) { ctx.strokeStyle = 'rgba(141,151,173,' + .5 * track + ')'; ctx.lineWidth = 3; for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(x + w * (.08 + i * .1), y + h * .72); ctx.lineTo(x + w * (.08 + i * .1), y + h * .93); ctx.stroke(); } }
    const tag = popIn(L, b('inside') + .25);
    if (tag > 0 && k > .98) {
      ctx.save(); ctx.translate(tagX, tagY); ctx.scale(tag, tag); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-44, -20, 88, 40, 12); ctx.fill();
      ctx.strokeStyle = BOTC.glow; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(-26, 0); ctx.lineTo(-14, 10); ctx.moveTo(14, -10); ctx.lineTo(26, 0); ctx.lineTo(14, 10); ctx.moveTo(5, -12); ctx.lineTo(-5, 12); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 渲染：时间轴上的指针一格一格地跳；每跳一下镜头一闪，机器吐出一帧，排成一排。
  const N = 6, TX = 880, TW = 640, TY = 780, stage = seg(L, b('browser') + .7, .5);
  const step = (b('encode') - b('seek')) / N, hops = clamp((L - b('seek')) / step, 0, N);
  if (stage > 0) {
    const within = hops - Math.floor(hops), u = hops >= N ? 1 : (Math.floor(hops) + ease.out(clamp(within * 3))) / N;
    ctx.save(); ctx.globalAlpha = stage;
    ctx.lineCap = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(TX + TW, TY); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = LILAC; ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(TX + TW, TY); ctx.stroke();
    for (let i = 0; i <= N; i++) { ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(TX + TW * i / N, TY + 16); ctx.lineTo(TX + TW * i / N, TY + 34); ctx.stroke(); }
    const px = TX + TW * (L < b('seek') ? 0 : u), lift = L < b('seek') || hops >= N ? 0 : Math.sin(clamp(within * 3) * Math.PI) * 26;
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, TY - 12 - lift); ctx.lineTo(px - 20, TY - 48 - lift); ctx.lineTo(px + 20, TY - 48 - lift); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < N; i++) {
      const born = b('seek') + i * step, fly = ease.out(seg(L, born + .08, .32)); if (fly <= 0) continue;
      const home = [TX + TW * (i + .5) / N, 610], eat = ease.in(seg(L, b('encode') + i * .07, .4));
      if (eat >= 1) continue;
      const x = lerp(lerp(m.slot[0], home[0], fly), 1560, eat), y = lerp(lerp(m.slot[1], home[1], fly) - Math.sin(fly * Math.PI) * 70, 420, eat);
      filmFrame(ctx, x, y, lerp(40, 108, fly) * (1 - eat * .6), (1 - fly) * -.8, born * 1.3, 1);
      // 镜头一闪
      const flash = Math.sin(seg(L, born, .2) * Math.PI);
      if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * .9 + ')'; ctx.beginPath(); ctx.arc(MX + 114 * MS, 850 - 176 * MS, 46 * MS * flash, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  // 压成视频：帧排队进压片机，出来一个胶片盒；同一张网页再来一次，出来的第二个和第一个完全重合。
  const PX = 1700, PY = 400;
  const pressIn = ease.back(seg(L, b('encode') - .5, .45));
  if (pressIn > 0) {
    const squeeze = Math.sin(clamp(press) * Math.PI * 5) * (press < 1 ? 1 : 0) + Math.sin(clamp(seg(L, b('same') + .5, .7)) * Math.PI * 4) * (again < 1 ? 1 : 0);
    ctx.save(); ctx.translate(PX, PY); ctx.scale(pressIn, pressIn); ctx.translate(-PX, -PY);
    s06_press(ctx, PX, PY, t, squeeze, clamp(seg(L, b('encode'), .2)));
    ctx.restore();
    const can = ease.in(seg(L, b('encode') + .6, .35));
    if (can > 0) filmCan(ctx, PX, lerp(PY + 100, 680, can) - Math.sin(seg(L, b('encode') + .95, .3) * Math.PI) * 18, 58, t * .6);
    burst(ctx, PX, 690, seg(L, b('encode') + .95, .35), 9, 70, 140, LILAC);
    // 第二遍：一张小网页从机器飞进压片机
    const send = ease.inOut(seg(L, b('same'), .6));
    if (send > 0 && send < 1) {
      const x = lerp(m.slot[0], PX - 150, send), y = lerp(m.slot[1], PY, send) - Math.sin(send * Math.PI) * 190;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sway(t, .6) * .12); s06_window(ctx, -75, -46, 150, 92, t, 0); ctx.restore();
    }
    // 第二个胶片盒先落在旁边，再滑过去和第一个重合。
    const twin = ease.in(seg(L, b('out') - .35, .35));
    if (twin > 0) {
      const merge = ease.inOut(seg(L, b('out') + .1, .45));
      ctx.save(); ctx.globalAlpha = lerp(1, .0, seg(merge, .9, .1));
      filmCan(ctx, lerp(PX - 150, PX, merge), lerp(PY + 100, 680, twin) - Math.sin(seg(L, b('out'), .3) * Math.PI) * 16, 58, t * .6);
      ctx.restore();
      mark(ctx, 'check', PX + 92, 640, 1.5, seg(L, b('out') + .5, .35), TEAL);
      for (let i = 0; i < 5; i++) sparkle(ctx, PX + Math.cos(i * 1.26 + t) * 120, 660 + Math.sin(i * 1.26 + t) * 80, 22, seg(L, b('out') + .55, .3) * (.5 + .5 * sway(t, .8, i * .2)));
    }
  }

  // 机器人：先看箱子，机器升起来时吓一跳；指着网页讲；渲染时盯着看；最后欢呼。
  const pose = botMix(botMix(botMix(botMix(botMix(BOTS.explain, BOTS.surprise, seg(L, b('hf'), .25) * (1 - seg(L, b('hf') + 1.4, .4))), BOTS.explain, seg(L, b('page') - .2, .3)),
    BOTS.think, seg(L, b('browser') - .1, .3)), BOTS.lens, seg(L, b('seek') - .2, .3)), BOTS.cheer, seg(L, b('out') + .45, .3));
  drawBot(ctx, { ...pose, ...botAlive(t, talking), x: 160, y: 856, s: .78, lookX: 1,
    hop: Math.sin(seg(L, b('hf') + .05, .4) * Math.PI) * 50 + seg(L, b('out') + .6, .3) * Math.abs(sway(t, .9)) * 34,
    chest: L > b('shot') && L < b('out') ? 'wave' : L > b('out') ? 'check' : 'dot' });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  const o = popIn(L, b('open') + .25);
  if (o > 0) f.label('s06_open', { ...at(MX, 745), size: 50, color: '#ffffff', plate: TEAL, scale: o, alpha: vis * (1 - seg(L, b('hf') + .1, .3)) });
  const h = popIn(L, b('hf') + .45);
  if (h > 0) f.label('s06_hf', { ...at(MX, 405), size: 56, color: '#ffffff', plate: INDIGO, scale: h, alpha: vis });
  const p1 = popIn(L, b('page') + .45);
  if (p1 > 0) f.label('s06_page', { ...at(WX + WW / 2, 138), size: 52, color: INDIGO, halo: '#ffffff', scale: p1, alpha: vis * (1 - seg(L, b('browser') + .3, .3)) });
  const w1 = popIn(L, b('when') + .7);
  if (w1 > 0) f.label('s06_when', { ...at(WX + WW / 2, 690), size: 46, color: '#ffffff', plate: ORANGE_D, scale: w1, alpha: vis * (1 - seg(L, b('inside') - .1, .3)) });
  const i1 = popIn(L, b('inside') + .55);
  if (i1 > 0) f.label('s06_inside', { ...at(WX + WW / 2, 690), size: 46, color: '#ffffff', plate: INDIGO, scale: i1, alpha: vis * (1 - seg(L, b('browser') - .1, .3)) });
  const b1 = popIn(L, b('browser') + .8);
  if (b1 > 0) f.label('s06_browser', { ...at(MX, 330), size: 44, color: TEAL, halo: '#ffffff', scale: b1, alpha: vis * (1 - seg(L, b('encode') - .2, .3)) });
  const s1 = popIn(L, b('shot') + .15);
  if (s1 > 0) f.label('s06_shot', { ...at(TX + TW / 2, 500), size: 48, color: INDIGO, halo: '#ffffff', scale: s1, alpha: vis * (1 - seg(L, b('encode') + .3, .3)) });
  const f1 = popIn(L, b('encode') + .1);
  if (f1 > 0) f.label('s06_ff', { ...at(PX, 290), size: 46, color: '#ffffff', plate: INK, scale: f1, alpha: vis });
  const d1 = popIn(L, b('out') + .6);
  if (d1 > 0) f.label('s06_same', { ...at(1700, 800), size: 50, color: '#ffffff', plate: TEAL, scale: d1, alpha: vis });
}
