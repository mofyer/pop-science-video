// ---------- S11 节拍表：旁白说到哪个词，画面里发生哪件事 ----------
// 表的四行中线；时间线上四个节拍点的位置（第四个是后来补的）。
const s11_Y = [300, 400, 500, 600], s11_U = [.10, .32, .54, .77];
const s11_tx = u => 560 + 1140 * u;

// 左列一格（x 是格子左边，y 是中线）：三个词块，中间那个是节拍挂住的词。lit 为亮起，flash 是刚被说到时的一闪。
function s11_word(ctx, x, y, lit, flash, t) {
  ctx.fillStyle = lit > .5 ? PAL.white : LILAC; for (const dx of [18, 280]) { ctx.beginPath(); ctx.roundRect(x + dx, y - 22, 64, 44, 14); ctx.fill(); }
  ctx.save(); ctx.translate(x + 181, y); ctx.scale(1 + .1 * flash, 1 + .1 * flash);
  if (flash > 0) { ctx.fillStyle = 'rgba(75,79,217,' + .28 * flash + ')'; ctx.beginPath(); ctx.roundRect(-98, -41, 196, 82, 26); ctx.fill(); }
  ctx.fillStyle = lit > .5 ? INDIGO : PAL.white; ctx.strokeStyle = lit > .5 ? PAL.line : LILAC; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-85, -29, 170, 58, 18); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = lit > .5 ? PAL.white : LILAC;
  for (let j = 0; j < 8; j++) {
    const a = lit > .5 ? 5 + (6 + 11 * flash) * Math.abs(Math.sin(t * 7 + j * 1.3)) : 4 + 5 * Math.abs(Math.sin(j * 1.3));
    ctx.beginPath(); ctx.moveTo(-59 + j * 17, -a); ctx.lineTo(-59 + j * 17, a); ctx.stroke();
  }
  ctx.restore();
}
// 右列一格里发生的事，(x, y) 是中心：kind 0 小球弹起、1 滑块沿箭头滑过、2 星星转一下、3 灯亮。a 是触发后过去的秒数，没触发时为负。
function s11_act(ctx, x, y, kind, a, t) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 0) {
    const jump = a < 0 ? 0 : a < .55 ? Math.sin(a / .55 * Math.PI) * 38 : a < .85 ? Math.sin((a - .55) / .3 * Math.PI) * 11 : 0, flat = a >= 0 && jump < 5 ? .16 * (1 - jump / 5) * (1 - seg(a, .85, .2)) : 0;
    ctx.strokeStyle = LILAC; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 120, y + 28); ctx.lineTo(x + 120, y + 28); ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(x, y + 28, 20 - jump * .2, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + 12 - jump + flat * 16, 16 * (1 + flat), 16 * (1 - flat), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    burst(ctx, x, y + 24, seg(a, 0, .3), 7, 22, 50, ORANGE);
  } else if (kind === 1) {
    const go = a < 0 ? 0 : ease.inOut(seg(a, 0, .5));
    ctx.strokeStyle = INDIGO; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 112, y + 16); ctx.lineTo(x + 104, y + 16); ctx.moveTo(x + 84, y); ctx.lineTo(x + 106, y + 16); ctx.lineTo(x + 84, y + 32); ctx.stroke();
    if (go > 0 && go < 1) { ctx.strokeStyle = 'rgba(11,122,117,.4)'; ctx.lineWidth = 6; for (const dy of [-14, -2]) { ctx.beginPath(); ctx.moveTo(x - 118 + 150 * go, y + dy); ctx.lineTo(x - 150 + 150 * go, y + dy); ctx.stroke(); } }
    ctx.fillStyle = TEAL; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 112 + 150 * go, y - 24, 34, 34, 9); ctx.fill(); ctx.stroke();
  } else if (kind === 2) {
    const pop = a < 0 ? 0 : Math.sin(seg(a, 0, .45) * Math.PI), rot = a < 0 ? 0 : ease.out(seg(a, 0, .6)) * Math.PI * .8;
    burst(ctx, x, y, seg(a, 0, .4), 8, 38, 64, '#ffc93c');
    star(ctx, x, y, 27 * (1 + .4 * pop), rot, a < 0 ? LILAC : '#ffd34d', PAL.line, 4);
  } else {
    const pop = a < 0 ? 0 : Math.sin(seg(a, 0, .45) * Math.PI), on = seg(a, 0, .2);
    if (on > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .5 * on + ')'; ctx.beginPath(); ctx.arc(x, y - 4, 44 + 6 * sway(t, 1.4), 0, Math.PI * 2); ctx.fill(); }
    burst(ctx, x, y - 4, seg(a, 0, .4), 9, 40, 72, '#ffc93c');
    icon(ctx, 'bulb', x, y - 2, 1.05 * (1 + .35 * pop), t);
  }
}
// 版式卡片：一张静止的灰色幻灯片，(x, y) 是中心。
function s11_slide(ctx, x, y, w, h) {
  ctx.fillStyle = '#e3e3ea'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h * .12); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = GREY; ctx.lineWidth = Math.max(5, h * .09); ctx.beginPath(); ctx.moveTo(x - w * .36, y - h * .26); ctx.lineTo(x + w * .16, y - h * .26); ctx.stroke();
  ctx.strokeStyle = '#b9bfd2'; ctx.lineWidth = Math.max(4, h * .06);
  for (let i = 0; i < 3; i++) { const yy = y - h * .02 + i * h * .16; ctx.beginPath(); ctx.moveTo(x - w * .36, yy); ctx.lineTo(x - w * .34, yy); ctx.moveTo(x - w * .25, yy); ctx.lineTo(x + w * (.3 - i * .1), yy); ctx.stroke(); }
}

function scene11(ctx, f, s, L, vis) {
  const t = f.t, b = key => s.beats[key] - s.start, D = s.end - s.start, talking = L < s.voice - s.start;
  // 每一行“词亮起”和“动作发生”的时刻：第一行分两拍讲，后面几行词一亮动作就发生。
  const G = b('gap') - b('action'), T1 = b('action') + .45 * G, T2 = b('action') + .74 * G, T3 = b('add') + .32;
  const lit = [b('word'), T1, T2, T3], first = [b('thing'), T1, T2, T3];
  const last0 = b('thing') + Math.max(0, Math.floor((Math.min(L, T1 - .5) - b('thing')) / 1.1)) * 1.1;   // 第一行隔一会儿再演一遍
  const tip = ease.inOut(seg(L, b('or'), .5)), seesaw = 1 - ease.inOut(seg(L, b('rows') - .05, .4)), swap = seg(L, b('action'), Math.min(.45, .4 * G));
  const sweepD = Math.min(1, .8 * (b('add') - b('gap'))), sweep = seg(L, b('gap'), sweepD), fixed = seg(L, T3, .3), drop = ease.in(seg(L, b('add'), .32));
  // 播放头：走到第一个节拍点停下，再依次走过第二、第三个，然后进入那段空白。
  const keys = [[b('word') - .5, 0], [b('word'), s11_U[0]], [T1 - .35, s11_U[0]], [T1, s11_U[1]], [T2, s11_U[2]], [b('gap'), s11_U[2] + .02], [b('gap') + sweepD, .985]];
  const head = keys.reduce((u, [time, value], i) => i > 0 && L >= keys[i - 1][0] ? lerp(keys[i - 1][1], value, seg(L, keys[i - 1][0], Math.max(.001, time - keys[i - 1][0]))) : u, 0);
  const cam = makeCam(960, 545, 1 + .04 * seg(L, 0, D));
  studio(ctx, t);
  ctx.save(); cam.apply(ctx);
  floor(ctx);

  // 大表：表头两栏，左栏旁白、右栏画面。
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(478, 164, 1320, 512, 30); ctx.fill();
  ctx.fillStyle = PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(470, 150, 1320, 512, 30); ctx.fill();
  ctx.fillStyle = 'rgba(75,79,217,.07)'; ctx.fillRect(474, 250, 572, 408); ctx.fillStyle = 'rgba(240,138,60,.09)'; ctx.fillRect(1194, 250, 592, 408);
  ctx.fillStyle = 'rgba(201,196,238,.55)'; ctx.beginPath(); ctx.roundRect(470, 150, 1320, 100, [30, 30, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(470, 150, 1320, 512, 30); ctx.stroke();
  const shine = seg(L, b('key'), .4);
  burst(ctx, 1120, 200, seg(L, b('key'), .45), 10, 40, 84, '#ffc93c');
  if (shine > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .45 * shine + ')'; ctx.beginPath(); ctx.arc(1120, 200, 50 + 4 * sway(t, 1.5), 0, Math.PI * 2); ctx.fill(); }
  star(ctx, 1120, 200, 30 * (1 + .45 * Math.sin(shine * Math.PI)), sway(t, 4) * .12 * shine, shine > .3 ? '#ffd34d' : '#e6e8f2', PAL.line, 5);

  // 跷跷板：一头是静止的幻灯片，一头是在动的画面，倒向动的那头。表格长出来时它收进表头的星里。
  if (seesaw > 0) {
    const sc = lerp(.25, 1, seesaw), th = lerp(.035 * sway(t, 1.9), .17, tip);
    ctx.save(); ctx.globalAlpha = seesaw; ctx.translate(1130, lerp(230, 572, seesaw)); ctx.scale(sc, sc);
    ctx.fillStyle = GREY; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(50, 62); ctx.lineTo(-50, 62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(th);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * 285, -104);
      if (side > 0 && tip > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .5 * tip + ')'; ctx.beginPath(); ctx.roundRect(-143, -101, 286, 202, 30); ctx.fill(); }
      ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-127, -85, 254, 170, 18); ctx.fill(); ctx.stroke();
      if (side > 0) miniScene(ctx, -115, -73, 230, 146, t * 1.2, { r: 10 }); else s11_slide(ctx, 0, 0, 230, 146);
      if (side < 0 && tip > 0) { ctx.fillStyle = 'rgba(44,47,72,' + .14 * tip + ')'; ctx.beginPath(); ctx.roundRect(-127, -85, 254, 170, 18); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = '#c99a62'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-420, -19, 840, 20, 10); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 表格一行一行长出来，机器人把每行的内容敲进去。第四行先是虚线空位，等补上节拍才有内容。
  // 说到哪一格，那一格的底色就换掉：左格变紫是“词说到了”，右格变橙是“动作发生了”。颜色一帧切换，不渐变。
  const fill = i => b('rows') + .6 + i * Math.max(.18, (b('word') - b('rows') - 1.4) / 3), swapped = b('action') + Math.min(.45, .4 * G) / 2;
  for (let i = 0; i < 4; i++) {
    const grow = ease.out(seg(L, b('rows') + .15 + i * .18, .4)); if (grow <= 0) continue;
    const y = s11_Y[i] - (1 - grow) * 26, empty = i === 3 && L < T3, late = i === 3 && L >= b('gap') + sweepD, glow = i === 3 ? seg(L, T3, .3) : 0;
    const aWord = L - (i === 0 && L >= b('thing') ? last0 : lit[i]), aAct = L - (i === 0 ? last0 : first[i]);
    const said = L >= lit[i], done = L >= (i === 1 ? swapped : first[i]), shown = i === 3 ? 1 : popIn(L, fill(i), .3);
    ctx.save(); ctx.globalAlpha = grow;
    if (glow > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .5 * glow + ')'; ctx.beginPath(); ctx.roundRect(1192, y - 57, 596, 114, 26); ctx.fill(); }
    [[486, 548, said ? '#dcd9f6' : PAL.white], [1206, 568, done ? '#ffdcb3' : PAL.white]].forEach(([x0, w, color]) => {
      ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x0, y - 43, w, 86, 16);
      if (empty) { if (late) { ctx.fillStyle = 'rgba(240,138,60,.42)'; ctx.fill(); } ctx.setLineDash([12, 10]); ctx.strokeStyle = late ? ORANGE_D : GREY; ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.fillStyle = color; ctx.strokeStyle = PAL.line; ctx.fill(); ctx.stroke(); }
    });
    if (!empty && shown > .02) {
      ctx.save(); ctx.translate(760, y); ctx.scale(shown, shown); s11_word(ctx, -274, 0, said ? 1 : 0, aWord >= 0 ? 1 - seg(aWord, .1, .6) : 0, t); ctx.restore();
      if (i === 1 && swap < 1) {
        const flip = swap < .5 ? 1 - swap * 2 : swap * 2 - 1;
        ctx.save(); ctx.translate(1366, y); ctx.scale(Math.max(.02, flip) * shown, shown);
        if (swap < .5) s11_slide(ctx, 0, 0, 112, 66); else s11_act(ctx, 0, 0, 1, -1, t);
        ctx.restore();
      } else { ctx.save(); ctx.translate(1366, y); ctx.scale(shown, shown); s11_act(ctx, 0, 0, i, aAct, t); ctx.restore(); }
      // 两格之间的连线：第一次触发时画出来，之后每次触发有一颗光点跑过去。
      const wire = seg(L, first[i], .22), spark = seg(aAct, 0, .22);
      if (wire > 0) {
        ctx.strokeStyle = INDIGO; ctx.lineWidth = 7; trace(ctx, [[1040, y], [1196, y]], wire);
        if (wire >= 1) { ctx.beginPath(); ctx.moveTo(1180, y - 13); ctx.lineTo(1197, y); ctx.lineTo(1180, y + 13); ctx.stroke(); }
        if (spark > 0 && spark < 1) { ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lerp(1040, 1196, spark), y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  // 表下的时间线：节拍点、播放头，和那段找不出节拍的空白。
  const ty = 765, xa = s11_tx(0), xb = s11_tx(1);
  ctx.lineCap = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(xa, ty); ctx.lineTo(xb, ty); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = LILAC; ctx.beginPath(); ctx.moveTo(xa, ty); ctx.lineTo(xb, ty); ctx.stroke();
  if (head > 0) { ctx.strokeStyle = INDIGO; ctx.beginPath(); ctx.moveTo(xa, ty); ctx.lineTo(s11_tx(head), ty); ctx.stroke(); }
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(xb, ty - 20); ctx.lineTo(xb, ty + 20); ctx.stroke();
  if (sweep > 0 && fixed < 1) {
    const xs = s11_tx(s11_U[2]) + 22, xe = s11_tx(lerp(s11_U[2] + .02, .985, sweep)), late = seg(sweep, .92, .08);
    ctx.save(); ctx.globalAlpha = 1 - fixed;
    ctx.fillStyle = late > .5 ? ORANGE : '#d9dbe8'; ctx.strokeStyle = late > .5 ? ORANGE_D : GREY; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(xs, ty - 44, Math.max(8, xe - xs), 22, 8); ctx.fill(); ctx.stroke();
    const out = 1 - seg(L, b('add'), .25), jit = late > .5 ? Math.sin(t * 42) * 4 * (1 - seg(L, b('gap') + sweepD, .5)) : 0;
    icon(ctx, 'clock', xe + jit, ty - 74, .78 * out, sweep * Math.PI * 4);
    ctx.restore();
  }
  for (let i = 0; i < 4; i++) {
    const k = i < 3 ? popIn(L, b('rows') + .3 + i * .18, .3) : L >= b('add') ? 1 : 0; if (k < .02) continue;
    const x = s11_tx(s11_U[i]), y = i < 3 ? ty : lerp(ty - 96, ty, drop), done = i < 3 ? head >= s11_U[i] - .005 : L >= T3;
    ctx.fillStyle = done ? (i === 3 ? TEAL : INDIGO) : PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 15 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  burst(ctx, s11_tx(s11_U[3]), ty, seg(L, T3, .35), 9, 24, 66, TEAL);
  if (L >= b('word') - .5) {
    const x = s11_tx(head);
    ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, ty + 14); ctx.lineTo(x - 18, ty + 46); ctx.lineTo(x + 18, ty + 46); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // 机器人：指星星、看跷跷板、敲出表格、指词、跟着小球一起跳、摆手换掉版式、盯着空白发愁、补上节拍欢呼。
  const live = botAlive(t, talking), typing = seg(L, b('rows') - .1, .3) * (1 - seg(L, b('word') - .45, .3));
  const pose = [
    [{ ...BOTS.explain, lookY: -.7 }, seg(L, b('key') - .2, .3) * (1 - seg(L, b('or') - .2, .3))],
    [{ ...BOTS.surprise, lookX: 1, lookY: -.2 }, seg(L, b('or'), .25) * (1 - seg(L, b('rows') - .25, .3))],
    [{ ...BOTS.type, armL: [.75 + .14 * sway(t, .24), -.9], armR: [.75 - .14 * sway(t, .24), -.55] }, typing],
    [{ ...BOTS.explain, lookY: -.5 }, seg(L, b('word') - .2, .3) * (1 - seg(L, b('thing') - .15, .2))],
    [{ ...BOTS.cheer, lookX: 1, lookY: -.4 }, seg(L, b('thing'), .2) * (1 - seg(L, b('action') - .2, .25))],
    [{ ...BOTS.stop, lookX: 1, lookY: -.2 }, seg(L, b('action') - .1, .2) * (1 - seg(L, b('action') + .5, .3))],
    [{ ...BOTS.explain, lookY: -.1 }, seg(L, b('action') + .45, .3) * (1 - seg(L, b('gap') - .2, .3))],
    [{ ...BOTS.think, lookX: 1, lookY: .8 }, seg(L, b('gap') - .1, .3) * (1 - seg(L, b('add') - .15, .2))],
    [{ ...BOTS.cheer, lookX: 1, lookY: .2 }, seg(L, b('add'), .2)],
  ].reduce((acc, [next, k]) => botMix(acc, next, k), BOTS.idle);
  const bounce = L >= b('thing') && L - last0 < .55 ? Math.sin((L - last0) / .55 * Math.PI) * 44 : 0;
  drawBot(ctx, {
    ...pose, blink: live.blink, ant: live.ant, squash: live.squash, chestT: t, x: 250, y: 856, s: .88,
    mouthOpen: pose.mouth === 'smile' ? Math.max(pose.mouthOpen, live.mouthOpen ?? 0) : pose.mouthOpen,
    hop: Math.sin(seg(L, b('key'), .35) * Math.PI) * 22 + bounce + Math.sin(seg(L, T3, .45) * Math.PI) * 48,
    chest: L < b('rows') ? 'dot' : L < b('word') - .45 ? 'braces' : L < T3 ? 'wave' : 'check',
  });
  ctx.restore();

  const at = (x, y) => { const p = cam.p(x, y); return { x: p[0], y: p[1] }; };
  f.label('s11_narr', { ...at(760, 200), size: 46, color: '#ffffff', plate: INDIGO, alpha: vis });
  f.label('s11_pic', { ...at(1490, 200), size: 46, color: '#ffffff', plate: ORANGE_D, alpha: vis });
  const l1 = popIn(L, b('word') + .15), l2 = popIn(L, b('thing') + .15), l3 = popIn(L, b('action') + .35), l4 = popIn(L, b('add') + .45);
  if (l1 > .01) f.label('s11_word', { ...at(940, s11_Y[0]), size: 44, color: '#ffffff', plate: INDIGO, scale: l1, alpha: vis });
  if (l2 > .01) f.label('s11_thing', { ...at(1650, s11_Y[0]), size: 44, color: '#ffffff', plate: ORANGE_D, scale: l2, alpha: vis });
  if (l3 > .01) f.label('s11_action', { ...at(1650, s11_Y[1]), size: 44, color: '#ffffff', plate: TEAL, scale: l3, alpha: vis });
  if (l4 > .01) f.label('s11_add', { ...at(s11_tx(s11_U[3]), 836), size: 44, color: '#ffffff', plate: TEAL, scale: l4, alpha: vis });
}
