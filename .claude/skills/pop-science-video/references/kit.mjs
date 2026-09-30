// 科普动画的共用绘图库：小机器人和通用小人两个角色、镜头与转场、场景元素、道具。
// 所有画面都是时间的纯函数，不保留跨帧状态，不用随机数。合成时它拼在每期 visuals.mjs 的前面，两个文件共用一个作用域。
// 唯一来源是技能目录的 references/kit.mjs；期目录里的 kit.mjs 是原样复制的。某一期专用的道具写在该期的画面代码里，
// 通用的加到这里再复制过去。
//
// 目录（按出现顺序）：
//   基础      PAL 色板 · clamp lerp seg ease hash sway blinkAt · limb star
//   镜头      W H · makeCam(cx, cy, zoom, sx, sy) 得到 {apply, p} · shake · popIn · fadeIn
//   场景元素  sky cloud hills sunDisc sparkle burst trace
//   小人      PERSON 默认项 · strideOf(adult) · drawPerson(ctx, 选项) 返回头部中心坐标 · drawSpecs · drawRing
//   机器人    BOT 默认姿态 · botMix(a, b, k) · drawBot(ctx, 姿态) 返回手、头、胸口等锚点 · BOTS 现成姿态 · botAlive(t, talking)
//   转场      wipe(ctx, k) 色带扫过 · iris(ctx, k, x, y, 画新镜的函数) 圆形展开
//   场景      INDIGO ORANGE ORANGE_D TEAL INK PAPER · studio floor · reach personHandR · miniScene filmFrame tangle easel node filmCan codePlate
//   道具      sheet folder book codeWindow preview slider mark magnifier waveform speaker mic gear conveyor arch bubble icon badge hfMachine frameGrid
// 坐标：角色以双脚中点为原点，y 向上为负；机器人 scale 1 时连天线高约 375，大人小人高约 350。

const PAL = {
  line: '#4a2326', skin: '#fbd3c1', blush: '#fc9a8d', pupil: '#2a1517', white: '#ffffff', mouth: '#8c2f39',
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
// 0→1 的进度：t 在 [a, a+d] 内线性推进，区间外钳制。
const seg = (t, a, d) => clamp((t - a) / d);
const ease = {
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  inOut: k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  // 欠阻尼弹簧的阶跃响应，只给角色和轻松道具用，器官结构和数据不用。
  spring: k => 1 - Math.exp(-6 * k) * Math.cos(9 * k),
};
// 确定性噪声：同一个 n 永远得到同一个 0..1。
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// 周期为 period 秒的往复，值域 -1..1。
const sway = (t, period, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
// 眨眼：每 period 秒闭合一次，闭合约 0.16 秒；返回 0（睁）到 1（闭）。
const blinkAt = (t, period = 3.8, offset = 1.3) => {
  const p = ((t + offset) % period + period) % period;
  return p < .16 ? Math.sin(p / .16 * Math.PI) : 0;
};

function limb(ctx, x0, y0, a, len, width, fill, line) {
  const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
  ctx.lineCap = 'round';
  ctx.strokeStyle = line; ctx.lineWidth = width + 9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  return [x1, y1];
}

function star(ctx, x, y, r, rot, fill, line, lw = 4.5) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .46 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.lineJoin = 'round';
  ctx.fillStyle = fill; ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); }
}
// ---------- 镜头与转场 ----------
const W = 1920, H = 1080;

// 镜头：把世界坐标 (cx, cy) 放到画面中心并放大 zoom 倍；sx、sy 是抖动位移。
function makeCam(cx = W / 2, cy = H / 2, zoom = 1, sx = 0, sy = 0) {
  return {
    zoom,
    apply(ctx) { ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); },
    // 世界坐标换成屏幕坐标，标签用它跟着画面里的物体走。
    p(x, y) { return [(x - cx) * zoom + W / 2 + sx, (y - cy) * zoom + H / 2 + sy]; },
  };
}
// 冲击抖动：at 时刻起 d 秒内衰减到零。
function shake(t, at, d = .35, amp = 14) {
  const k = seg(t, at, d);
  return k <= 0 || k >= 1 ? [0, 0] : [Math.sin(k * 40) * amp * (1 - k), Math.cos(k * 33) * amp * .6 * (1 - k)];
}
// 弹出：at 时刻起 d 秒从 0 长到 1，略带回弹；只用于角色、道具和标签。
const popIn = (t, at, d = .4) => ease.back(seg(t, at, d));
const fadeIn = (t, at, d = .3) => ease.out(seg(t, at, d));
// ---------- 场景元素 ----------
function sky(ctx, top = '#dff1ff', bottom = '#f6fbff') {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function cloud(ctx, x, y, s = 1, alpha = .92) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = PAL.white;
  for (const [dx, dy, r] of [[-62, 8, 38], [-18, -14, 52], [38, -2, 44], [80, 12, 30]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.roundRect(x - 96 * s, y + 6 * s, 204 * s, 38 * s, 19 * s); ctx.fill(); ctx.restore();
}
// 一排会横向滚动的圆丘，phase 增大时向左移动。
function hills(ctx, phase, y, color, amp = 60, width = 520) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y - amp * (.5 + .5 * Math.sin((x + phase) / width * Math.PI * 2)));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}
function sunDisc(ctx, x, y, r, t, glow = 1) {
  const g = ctx.createRadialGradient(x, y, r * .6, x, y, r * 3);
  g.addColorStop(0, 'rgba(255,221,102,' + .55 * glow + ')'); g.addColorStop(1, 'rgba(255,221,102,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = r * .16; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + t * .35, r0 = r * 1.28, r1 = r * (1.55 + .1 * Math.sin(t * 2 + i));
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe48a'; ctx.beginPath(); ctx.arc(x - r * .28, y - r * .28, r * .42, 0, Math.PI * 2); ctx.fill();
}
// 四角闪光，k 为 0..1 的大小。
function sparkle(ctx, x, y, r, k = 1, color = '#ffe27a') {
  if (k <= 0) return;
  const R = r * k; ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? R * .28 : R; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
// 冲击线：k 从 0 到 1 向外放射并消失。
function burst(ctx, x, y, k, n = 10, r0 = 30, r1 = 110, color = '#ffc93c') {
  if (k <= 0 || k >= 1) return;
  ctx.strokeStyle = color; ctx.lineWidth = 9 * (1 - k); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + .3, a0 = lerp(r0, r1, ease.out(k)), a1 = lerp(r0, r1, ease.out(clamp(k * 1.6)));
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * a0, y + Math.sin(a) * a0); ctx.lineTo(x + Math.cos(a) * a1, y + Math.sin(a) * a1); ctx.stroke();
  }
}
// 按进度画一条折线：k 从 0 到 1 逐渐画完。
function trace(ctx, points, k) {
  if (k <= 0) return;
  let total = 0; const lengths = [];
  for (let i = 1; i < points.length; i++) { const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); lengths.push(d); total += d; }
  let left = total * clamp(k);
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length && left > 0; i++) {
    const part = Math.min(1, left / lengths[i - 1]);
    ctx.lineTo(lerp(points[i - 1][0], points[i][0], part), lerp(points[i - 1][1], points[i][1], part)); left -= lengths[i - 1];
  }
  ctx.stroke();
}
// ---------- 通用小人 ----------
const PERSON = {
  x: 0, y: 0, s: 1, dir: 1, adult: true, skin: '#fbd3c1', hair: '#3a2a2e', style: 'short', top: '#8fc2f2', bottom: '#3e5279', shoe: '#ffffff',
  specs: 0, lookX: 0, lookY: 0, blink: 0, mood: 'smile', armL: [1.95, .2], armR: [1.2, -.2], hop: 0, lean: 0, squash: 0, sweat: 0,
  walk: null,   // 步态相位 0..1；给了就朝画面右方走（dir 为 -1 时朝左），一个相位周期是左右各一步
  turn: 0,      // 0 正面，1 朝行进方向的四分之三侧面
};
// 一个步态周期里身体前进的距离（scale 1 时的像素）；让背景按这个速度后退，脚就不会打滑。
const strideOf = adult => (adult ? 104 : 58) * .84 * 2;
// 膝盖朝前弯的两段腿：从胯 (x0, y0) 到脚 (x1, y1)，length 是腿伸直时的长度。
function bentLeg(ctx, x0, y0, x1, y1, length, width, fill, line) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.min(Math.hypot(dx, dy), length - .01) || 1, half = length / 2;
  const bend = Math.sqrt(half * half - d * d / 4);
  const kx = x0 + dx / 2 + dy / d * bend, ky = y0 + dy / 2 - dx / d * bend;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [color, w] of [[line, width + 9], [fill, width]]) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(x1, y1); ctx.stroke();
  }
}

// 画一个大人或孩子。turn 为 0 是正面；为 1 是朝画面右方的四分之三侧面（dir 为 -1 时朝左）：
// 脸整体转过去、后脑勺的头发露出来、鼻尖朝前、只见近侧耳朵、身体变窄。给了 walk 就按这个侧面走路。
// 返回头部中心的世界坐标，方便让道具（如眼镜）对准。
function drawPerson(ctx, o) {
  const p = { ...PERSON, ...o };
  const walking = p.walk != null, swing = walking ? Math.sin(p.walk * Math.PI * 2) : 0;
  if (walking) {
    // 走路时没另外指定的：转成侧面、前倾、看向前方，手臂与同侧的腿反向摆。
    if (o.turn === undefined) p.turn = 1;
    if (o.lean === undefined) p.lean = .07;
    if (o.lookX === undefined) p.lookX = .6;
    if (o.armL === undefined) p.armL = [Math.PI / 2 + swing * .7, -.35];
    if (o.armR === undefined) p.armR = [Math.PI / 2 - swing * .7, -.35];
  }
  const T = clamp(p.turn), side3q = T > .5;
  const legH = p.adult ? 104 : 58, bodyH = p.adult ? 146 : 92, bw0 = p.adult ? 46 : 40, hr = p.adult ? 54 : 58;
  const bw = bw0 * (1 - .24 * T), top = -(legH + bodyH);
  const arm = p.adult ? [50, 46] : [34, 32], shoulderY = top + 24, headY = top - hr * .74;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.save(); ctx.scale(p.s, p.s); ctx.fillStyle = 'rgba(20,60,110,.14)'; ctx.beginPath(); ctx.ellipse(0, 5, bw + 26, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // 两腿并拢时身体最高，迈开时略低。
  const bob = walking ? Math.abs(Math.cos(p.walk * Math.PI * 2)) * 5 : 0;
  ctx.translate(0, -(p.hop + bob) * p.s); ctx.scale(p.s * p.dir * (1 + p.squash), p.s * (1 - p.squash)); ctx.rotate(p.lean);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // side 为 -1 是靠近镜头的一侧，+1 是远侧。
  const drawLeg = side => {
    const hip = walking ? T * 5 + side * 5 : side * 17;
    const phase = walking ? (p.walk + (side < 0 ? 0 : .5)) * Math.PI * 2 : 0;
    // 着地的脚向后蹬，迈出的脚抬起向前。
    const footX = hip + (walking ? Math.sin(phase) * legH * .42 : 0), lift = walking ? Math.max(0, Math.cos(phase)) : 0;
    const footY = -12 - lift * legH * .24;
    if (walking) bentLeg(ctx, hip, -legH, footX, footY, legH - 8, 25, p.bottom, PAL.line);
    else limb(ctx, hip, -legH, Math.PI / 2, legH - 12, 25, p.bottom, PAL.line);
    // 鞋：脚跟在脚踝下，鞋尖朝前。
    const toe = side3q ? 14 : side * 5 + 2;
    ctx.save(); ctx.translate(footX, footY + 6); ctx.rotate(-lift * .35);
    ctx.fillStyle = p.shoe; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(toe, 0, 25, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const drawArmOf = (side, angles) => {
    const sx = (side < 0 ? lerp(-bw0, -bw * .3, T) : lerp(bw0, bw * .7, T)) + T * 5;
    const [ex, ey] = limb(ctx, sx, shoulderY, angles[0], arm[0], 22, p.top, PAL.line);
    const [hx, hy] = limb(ctx, ex, ey, angles[0] + angles[1], arm[1], 16, p.skin, PAL.line);
    ctx.fillStyle = p.skin; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const drawTorso = () => {
    const cx = T * 5;
    ctx.fillStyle = p.top; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - bw + 6, top); ctx.quadraticCurveTo(cx, top - 10, cx + bw - 6, top);
    ctx.quadraticCurveTo(cx + bw + 8, top + 12, cx + bw + 6, -legH - 4); ctx.quadraticCurveTo(cx, -legH + 10, cx - bw - 6, -legH - 4);
    ctx.quadraticCurveTo(cx - bw - 8, top + 12, cx - bw + 6, top); ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  // 侧面时远侧的手臂和腿在身体后面，近侧的手臂盖在身体前面。
  if (side3q) { drawArmOf(1, p.armR); drawLeg(1); drawLeg(-1); drawTorso(); drawArmOf(-1, p.armL); }
  else { drawLeg(-1); drawLeg(1); drawArmOf(-1, p.armL); drawTorso(); drawArmOf(1, p.armR); }

  // 头：头颅和头发不动，脸的部分朝行进方向挪过去。
  const hx0 = T * 6, shift = T * hr * .36, squeeze = 1 - .3 * T;
  ctx.save(); ctx.translate(hx0, 0);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 5;
  if (p.style === 'bob') { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.roundRect(-hr - 13 - T * 8, headY - hr - 9, hr * 2 + 26, hr * 1.78, [hr, hr, 22, 22]); ctx.fill(); ctx.stroke(); }
  if (!side3q) for (const side of [-1, 1]) { ctx.fillStyle = p.skin; ctx.beginPath(); ctx.ellipse(side * hr, headY + 6, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // 鼻尖：侧面时从脸的前缘鼓出来，是最直接的朝向标志。
  if (T > 0) { ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(hr - 2, headY + 14, 9 * T, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = p.hair; ctx.beginPath();
  if (p.style === 'bob') { ctx.moveTo(-hr - 6, headY - hr - 6); ctx.lineTo(hr + 6, headY - hr - 6); ctx.lineTo(hr + 6, headY - 6 - T * hr * .3); ctx.quadraticCurveTo(hr * .3 + shift, headY - hr * .62, -hr * .1 + shift, headY - hr * .2); ctx.quadraticCurveTo(-hr * .6 + shift * .5, headY - hr * .5, -hr - 6, headY + 4); }
  else { ctx.moveTo(-hr - 6, headY - hr - 6); ctx.lineTo(hr + 6, headY - hr - 6); ctx.lineTo(hr + 6, headY - hr * (.22 + .3 * T)); ctx.quadraticCurveTo(hr * .2 + shift, headY - hr * .78, -hr * .5 + shift, headY - hr * .36); ctx.quadraticCurveTo(-hr * .8 + shift * .5, headY - hr * .3, -hr - 6, headY - hr * .1); }
  ctx.closePath(); ctx.fill();
  // 后脑勺：侧面时脑后一整片都是头发。
  if (T > 0) ctx.fillRect(-hr - 6, headY - hr - 6, T * (hr * .78 + 6), hr * (p.style === 'bob' ? 2.2 : 1.42));
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); ctx.stroke();
  if (p.style === 'kid') { ctx.strokeStyle = p.hair; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(4, headY - hr + 4); ctx.quadraticCurveTo(14, headY - hr - 24, 30, headY - hr - 14); ctx.stroke(); }
  // 近侧的耳朵在发际线上。
  if (side3q) { ctx.fillStyle = p.skin; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(-hr * .2, headY + 8, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // 五官：整体挪向前方并收窄，远侧的眼睛更窄。
  const ex = hr * .36 * squeeze, ey = headY + 6, open = Math.max(.1, 1 - p.blink);
  for (const side of [-1, 1]) {
    const x = shift + side * ex + p.lookX * 4, y = ey + p.lookY * 3, narrow = side > 0 ? 1 - .25 * T : 1;
    if (p.mood === 'happy') { ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 9 * narrow, y + 3); ctx.quadraticCurveTo(x, y - 9, x + 9 * narrow, y + 3); ctx.stroke(); continue; }
    ctx.fillStyle = PAL.pupil; ctx.beginPath(); ctx.ellipse(x, y, (p.mood === 'o' ? 8 : 7) * narrow, (p.mood === 'o' ? 10 : 9) * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(x - 2, y - 3 * open, 2.4 * open, 0, Math.PI * 2); ctx.fill();
    if (p.mood === 'worry') { ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - side * 11, y - 19); ctx.lineTo(x + side * 8, y - 13); ctx.stroke(); }
  }
  ctx.fillStyle = PAL.blush; ctx.globalAlpha = .5; ctx.beginPath(); ctx.ellipse(shift - hr * .62 * squeeze, ey + 17, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .5 * (1 - T); ctx.beginPath(); ctx.ellipse(shift + hr * .62 * squeeze, ey + 17, 10, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; const my = ey + 24;
  ctx.save(); ctx.translate(shift + T * 3, 0);
  ctx.beginPath();
  if (p.mood === 'worry') { ctx.moveTo(-10, my + 4); ctx.quadraticCurveTo(0, my - 6, 10, my + 4); ctx.stroke(); }
  else if (p.mood === 'o') { ctx.fillStyle = PAL.mouth; ctx.ellipse(0, my + 2, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (p.mood === 'happy') { ctx.fillStyle = PAL.mouth; ctx.moveTo(-12, my - 3); ctx.quadraticCurveTo(0, my + 1, 12, my - 3); ctx.quadraticCurveTo(8, my + 13, 0, my + 13); ctx.quadraticCurveTo(-8, my + 13, -12, my - 3); ctx.fill(); ctx.stroke(); }
  else { ctx.moveTo(-10, my - 2); ctx.quadraticCurveTo(0, my + 8, 10, my - 2); ctx.stroke(); }
  ctx.restore();
  if (p.specs > 0) { ctx.save(); ctx.translate(shift + p.lookX * 2, ey); ctx.scale(squeeze, 1); drawSpecs(ctx, 0, 0, 1, 0, p.specs); ctx.restore(); }
  if (p.sweat > 0) { ctx.globalAlpha = p.sweat; ctx.fillStyle = '#8fd6f5'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(hr - 8, headY - hr * .6); ctx.quadraticCurveTo(hr - 18, headY - hr * .25, hr - 8, headY - hr * .18); ctx.quadraticCurveTo(hr + 2, headY - hr * .25, hr - 8, headY - hr * .6); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  ctx.restore();
  return [p.x, p.y - p.hop * p.s + (headY + 6) * p.s * (1 - p.squash)];
}
// 一副眼镜，中心在 (x, y)。
function drawSpecs(ctx, x, y, s = 1, rot = 0, alpha = 1, color = '#27304f') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.fillStyle = 'rgba(190,225,250,.45)'; ctx.beginPath(); ctx.roundRect(side * 22 - 17, -15, 34, 30, 11); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-5, -3); ctx.quadraticCurveTo(0, -8, 5, -3); ctx.stroke();
  ctx.restore();
}
// 进度环：k 为 0..1，从正上方顺时针填充。
function drawRing(ctx, o) {
  const p = { x: 0, y: 0, r: 110, k: 0, color: '#4b4fd9', width: 26, ...o };
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,78,162,.14)'; ctx.lineWidth = p.width; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
  if (p.k > 0) { ctx.strokeStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p.k)); ctx.stroke(); }
}

// ---------- 小机器人：主持人角色，不带任何公司标识 ----------
// 坐标与小人一致：以双脚中点为原点，y 向上为负；scale 1 时连天线高约 375。腿很短，移动用跳，不走路。
const BOTC = {
  shell: '#fff6e8', shade: '#f0dcc0', accent: '#f08a3c', accentDark: '#b9560f',
  screen: '#2c2f48', glow: '#8ff0dd', joint: '#8d97ad',
};
const BOT = {
  x: 0, y: 0, s: 1, dir: 1, lean: 0, hop: 0, squash: 0, headTilt: 0,
  lookX: 0, lookY: 0, blink: 0, eyes: 'open', mouth: 'smile', mouthOpen: 0,
  armL: [2.0, .3], armR: [1.15, -.3],   // [上臂角, 肘部弯曲]，弧度，0 指向右，正值向下
  ant: 0,            // 天线的跟随摆动，-1..1
  chest: 'dot',      // 胸前小屏显示：dot braces check wave play
  chestT: 0,         // 小屏动画用的时间
  halo: 0,           // 头部光晕 0..1，“想到了”“亮起来”时用
  frontL: false, frontR: false,   // 手在身前做事（敲代码、拍胸口）时，把这条手臂画在机身前面
};
const BOT_ARM = [46, 44];
const BOT_SHOULDER = [84, -150];

// 两个姿态按 k 混合：数值插值，其余在过半时切换。没写的项按默认姿态算，所以结果总是完整姿态。
function botMix(a, b, k) {
  const from = { ...BOT, ...a }, to = { ...BOT, ...b }, out = { ...from };
  for (const key of Object.keys(to)) {
    const va = from[key], vb = to[key];
    if (typeof vb === 'number' && typeof va === 'number') out[key] = lerp(va, vb, k);
    else if (Array.isArray(vb) && Array.isArray(va)) out[key] = vb.map((v, i) => lerp(va[i], v, k));
    else out[key] = k < .5 ? va : vb;
  }
  return out;
}

function botGlyph(ctx, kind, t, color = BOTC.glow) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'braces') {
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 10, -20); ctx.quadraticCurveTo(side * 20, -20, side * 20, -10);
      ctx.quadraticCurveTo(side * 20, 0, side * 29, 0); ctx.quadraticCurveTo(side * 20, 0, side * 20, 10);
      ctx.quadraticCurveTo(side * 20, 20, side * 10, 20); ctx.stroke();
    }
  } else if (kind === 'check') {
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-6, 14); ctx.lineTo(22, -16); ctx.stroke();
  } else if (kind === 'wave') {
    for (let i = -2; i <= 2; i++) {
      const h = 6 + 14 * Math.abs(Math.sin(t * 7 + i * 1.3));
      ctx.beginPath(); ctx.moveTo(i * 13, -h); ctx.lineTo(i * 13, h); ctx.stroke();
    }
  } else if (kind === 'lines') {
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-20, i * 14); ctx.lineTo(i ? 20 : 8, i * 14); ctx.stroke(); }
  } else if (kind === 'play') {
    ctx.beginPath(); ctx.moveTo(-10, -17); ctx.lineTo(18, 0); ctx.lineTo(-10, 17); ctx.closePath(); ctx.fill();
  } else {
    ctx.globalAlpha *= .55 + .45 * Math.sin(t * 3); ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  }
}

// 画机器人，返回几个锚点的世界坐标：head 头部中心、top 天线球、chest 小屏中心、handL、handR。
function drawBot(ctx, pose) {
  const p = { ...BOT, ...pose };
  const sx = p.s * p.dir * (1 + p.squash), sy = p.s * (1 - p.squash), cl = Math.cos(p.lean), sl = Math.sin(p.lean);
  const world = (lx, ly) => [p.x + (lx * cl - ly * sl) * sx, p.y - p.hop * p.s + (lx * sl + ly * cl) * sy];
  const hand = (side, a) => {
    const u = a[0], f = a[0] + a[1];
    return [side * BOT_SHOULDER[0] + Math.cos(u) * BOT_ARM[0] + Math.cos(f) * BOT_ARM[1], BOT_SHOULDER[1] + Math.sin(u) * BOT_ARM[0] + Math.sin(f) * BOT_ARM[1]];
  };
  ctx.save(); ctx.translate(p.x, p.y);
  // 影子留在地上，跳得越高越小。
  const lift = clamp(p.hop / 220);
  ctx.save(); ctx.scale(p.s, p.s); ctx.fillStyle = 'rgba(40,40,80,.16)';
  ctx.beginPath(); ctx.ellipse(0, 6, 92 * (1 - lift * .45), 14 * (1 - lift * .45), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.translate(0, -p.hop * p.s); ctx.scale(sx, sy); ctx.rotate(p.lean);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5;

  // 头部光晕画在最底下，不盖住机身。
  if (p.halo > 0) {
    const g = ctx.createRadialGradient(0, -258, 90, 0, -258, 250);
    g.addColorStop(0, 'rgba(255,214,120,' + .55 * p.halo + ')'); g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -258, 250, 0, Math.PI * 2); ctx.fill();
  }
  // 腿和脚
  for (const side of [-1, 1]) {
    ctx.fillStyle = BOTC.joint; ctx.beginPath(); ctx.roundRect(side * 36 - 12, -46, 24, 34, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = BOTC.accent; ctx.beginPath(); ctx.roundRect(side * 38 - 27, -20, 54, 22, 11); ctx.fill(); ctx.stroke();
  }
  // 手臂：上臂与机身同色，前臂是关节灰，手是橙色圆球。先画，机身盖住肩头。
  const arm = (side, a) => {
    const u = a[0], f = a[0] + a[1];
    const [ex, ey] = limb(ctx, side * BOT_SHOULDER[0], BOT_SHOULDER[1], u, BOT_ARM[0], 22, BOTC.shell, PAL.line);
    const [hx, hy] = limb(ctx, ex, ey, f, BOT_ARM[1], 17, BOTC.joint, PAL.line);
    ctx.fillStyle = BOTC.accent; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(hx, hy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  // 手举过肩或在身前做事时画在最前面，否则画在机身后面。
  const hl = hand(-1, p.armL), hr = hand(1, p.armR), upL = hl[1] < -176, upR = hr[1] < -176;
  const lateL = upL || p.frontL, lateR = upR || p.frontR;
  if (!lateL) arm(-1, p.armL);
  if (!lateR) arm(1, p.armR);
  // 机身
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.line;
  ctx.fillStyle = BOTC.shell; ctx.beginPath(); ctx.roundRect(-80, -174, 160, 136, 38); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-80, -174, 160, 136, 38); ctx.clip();
  ctx.fillStyle = BOTC.shade; ctx.fillRect(-90, -66, 180, 40); ctx.restore();
  ctx.beginPath(); ctx.roundRect(-80, -174, 160, 136, 38); ctx.stroke();
  // 胸前小屏
  ctx.fillStyle = BOTC.screen; ctx.beginPath(); ctx.roundRect(-46, -152, 92, 64, 16); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(0, -120); botGlyph(ctx, p.chest, p.chestT); ctx.restore();
  // 脖子
  ctx.fillStyle = BOTC.joint; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-20, -190, 40, 22, 8); ctx.fill(); ctx.stroke();

  // 头
  ctx.save(); ctx.translate(0, -186); ctx.rotate(p.headTilt); ctx.translate(0, 186);
  // 天线
  const ax = p.ant * 16;
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, -332); ctx.quadraticCurveTo(ax * .3, -352, ax, -368); ctx.stroke();
  ctx.strokeStyle = BOTC.joint; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -332); ctx.quadraticCurveTo(ax * .3, -352, ax, -368); ctx.stroke();
  ctx.fillStyle = BOTC.accent; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(ax, -374, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 耳朵螺栓
  for (const side of [-1, 1]) { ctx.fillStyle = BOTC.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(side * 108 - 13, -280, 26, 48, 10); ctx.fill(); ctx.stroke(); }
  // 头壳与脸屏
  ctx.fillStyle = BOTC.shell; ctx.beginPath(); ctx.roundRect(-108, -334, 216, 152, 50); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BOTC.screen; ctx.beginPath(); ctx.roundRect(-86, -316, 172, 114, 34); ctx.fill(); ctx.stroke();
  // 眼睛
  const ey = -268 + p.lookY * 6, open = Math.max(.12, 1 - p.blink);
  ctx.fillStyle = BOTC.glow; ctx.strokeStyle = BOTC.glow; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = side * 40 + p.lookX * 8;
    if (p.eyes === 'happy') { ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ex - 17, ey + 7); ctx.quadraticCurveTo(ex, ey - 17, ex + 17, ey + 7); ctx.stroke(); continue; }
    const r = p.eyes === 'wide' ? 22 : 17;
    ctx.beginPath(); ctx.ellipse(ex, ey, r, r * open, 0, 0, Math.PI * 2); ctx.fill();
    if (p.eyes === 'worry') { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex - side * 22, ey - 34); ctx.lineTo(ex + side * 14, ey - 26); ctx.stroke(); }
  }
  // 嘴
  const my = -228; ctx.lineWidth = 7;
  if (p.mouth === 'o') { ctx.beginPath(); ctx.ellipse(0, my + 2, 10, 12, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (p.mouth === 'flat') { ctx.beginPath(); ctx.moveTo(-16, my); ctx.lineTo(16, my); ctx.stroke(); }
  else if (p.mouth === 'wavy') { ctx.beginPath(); ctx.moveTo(-20, my + 2); ctx.quadraticCurveTo(-10, my - 8, 0, my + 2); ctx.quadraticCurveTo(10, my + 12, 20, my + 2); ctx.stroke(); }
  else if (p.mouthOpen > .08) {
    const h = 5 + p.mouthOpen * 15;
    ctx.beginPath(); ctx.moveTo(-20, my - 4); ctx.quadraticCurveTo(0, my - 1, 20, my - 4); ctx.quadraticCurveTo(14, my + h, 0, my + h); ctx.quadraticCurveTo(-14, my + h, -20, my - 4); ctx.closePath(); ctx.fill();
  } else { ctx.beginPath(); ctx.moveTo(-18, my - 4); ctx.quadraticCurveTo(0, my + 10, 18, my - 4); ctx.stroke(); }
  ctx.restore();

  if (lateL) arm(-1, p.armL);
  if (lateR) arm(1, p.armR);
  ctx.restore();
  return { head: world(0, -258), top: world(ax, -374), chest: world(0, -120), handL: world(hl[0], hl[1]), handR: world(hr[0], hr[1]) };
}

// 常用姿态。场景里用 botMix 过渡，再叠加眨眼、天线晃动和说话的嘴。
const BOTS = {
  idle: {},
  wave: { eyes: 'happy', mouthOpen: .7, armR: [-.9, -.7], headTilt: .06 },
  explain: { armR: [-.35, -.3], lookX: 1, mouthOpen: .45 },
  think: { armR: [.5, -2.6], lookX: -.6, lookY: -1, mouth: 'flat', headTilt: .08 },
  surprise: { eyes: 'wide', mouth: 'o', armL: [3.9, .5], armR: [-.75, -.5] },
  cheer: { eyes: 'happy', mouthOpen: 1, armL: [3.75, .55], armR: [-.6, -.55], halo: .8 },
  worry: { eyes: 'worry', mouth: 'wavy', armL: [1.35, -1.1], armR: [1.79, 1.1], headTilt: -.05, lookY: .6 },
  type: { armL: [.75, -.9], armR: [.75, -.55], lookX: .8, lookY: .6, chest: 'braces', frontL: true, frontR: true },
  pat: { armR: [1.9, 1.7], frontR: true, eyes: 'happy', mouthOpen: .6, chest: 'braces', halo: .6 },
  lens: { armR: [-.5, -.75], lookX: .9, lookY: -.2, eyes: 'wide' },
  stop: { armR: [-.12, -.2], mouth: 'flat', lookX: .8, headTilt: -.04 },
  shrug: { armL: [2.75, .9], armR: [.4, -.9], mouth: 'wavy', headTilt: .07, lookY: -.4 },
};
// 常驻微动：眨眼、天线轻晃、呼吸；talking 为真时嘴跟着动（第三个参数给了带嘴型的姿态时不动嘴）。
// 要展开在姿态之后：botMix 返回的是完整姿态，写在它前面会被姿态里的 0 盖掉。
function botAlive(t, talking, pose = {}) {
  const out = { blink: blinkAt(t, 3.6, .9), ant: sway(t, 1.9) * .4, squash: sway(t, 3.1) * .012, chestT: t };
  if (talking && !pose.mouth) out.mouthOpen = .25 + .45 * (.5 + .5 * sway(t, .29));
  return out;
}

// ---------- 配色、转场与场景元素 ----------
const INDIGO = '#4b4fd9', ORANGE = '#f08a3c', ORANGE_D = '#b9560f', TEAL = '#0b7a75', INK = '#2c2f48', PAPER = '#fffdf7';

// 色带转场：k 从 0 到 1，k=.5 时盖满全屏，换镜头藏在这一刻。
function wipe(ctx, k) {
  if (k <= 0 || k >= 1) return;
  const left = lerp(-1.75 * W, 1.15 * W, ease.inOut(k));
  const band = (x0, width, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x0, 0); ctx.lineTo(x0 + width, 0); ctx.lineTo(x0 + width - 160, H); ctx.lineTo(x0 - 160, H); ctx.closePath(); ctx.fill();
  };
  band(left - 70, 1.5 * W + 140, ORANGE);
  band(left, 1.5 * W, INDIGO);
}
// 圆形展开转场：以 (x, y) 为圆心把新镜头揭出来。
function iris(ctx, k, x, y, drawInside) {
  if (k <= 0) return;
  const r = ease.inOut(clamp(k)) * 2300;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip(); drawInside(); ctx.restore();
  if (k < 1) {
    ctx.strokeStyle = PAL.white; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r + 11, 0, Math.PI * 2); ctx.stroke();
  }
}

// 工作室的背景（画在镜头之外）和地面（画在镜头之内）。
function studio(ctx, t, top = '#eceeff', bottom = '#fff8ee') {
  sky(ctx, top, bottom);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(960, 470, 480, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x = (hash(i) * 2200 + t * (8 + hash(i + 5) * 10)) % 2200 - 140, y = 110 + hash(i + 11) * 420 + sway(t, 5 + hash(i) * 3, hash(i + 2)) * 14;
    ctx.fillStyle = i % 2 ? 'rgba(75,79,217,.10)' : 'rgba(240,138,60,.13)';
    ctx.beginPath(); ctx.arc(x, y, 16 + hash(i + 3) * 26, 0, Math.PI * 2); ctx.fill();
  }
}
function floor(ctx, y = 850) {
  ctx.fillStyle = '#e7e4f6'; ctx.fillRect(-600, y, 3200, 900);
  ctx.fillStyle = '#d6d2ee'; ctx.fillRect(-600, y, 3200, 10);
}

// 两节手臂够到 (tx, ty)：返回 [上臂角, 肘部弯曲]，肘朝下。
function reach(sx, sy, tx, ty, l1, l2) {
  const dx = tx - sx, dy = ty - sy, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - 1);
  const a0 = Math.atan2(dy, dx) + Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ex = sx + Math.cos(a0) * l1, ey = sy + Math.sin(a0) * l1;
  return [a0, Math.atan2(sy + dy / Math.hypot(dx, dy) * d - ey, sx + dx / Math.hypot(dx, dy) * d - ex) - a0];
}
// 大人小人（正面、不走路）右手的世界坐标。
function personHandR(o) {
  const s = o.s ?? 1, a = o.armR ?? PERSON.armR;
  return [o.x + (46 + Math.cos(a[0]) * 50 + Math.cos(a[0] + a[1]) * 46) * s, o.y + (-226 + Math.sin(a[0]) * 50 + Math.sin(a[0] + a[1]) * 46) * s];
}

// 迷你场景：一块小画面里有天、地、太阳和一个弹跳的小球，tt 是它自己的时间。全片用它代表“正在做的那支动画”。
function miniScene(ctx, x, y, w, h, tt, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? Math.min(w, h) * .08); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d9e4ff'); g.addColorStop(1, '#fdf6ea');
  ctx.fillStyle = o.frozen ? '#e3e3ea' : g; ctx.fillRect(x, y, w, h);
  const gy = y + h * .78;
  ctx.fillStyle = o.frozen ? '#cfcfd8' : '#c9c4ee'; ctx.fillRect(x, gy, w, h);
  ctx.fillStyle = o.frozen ? '#c4c4cc' : '#ffd34d'; ctx.beginPath(); ctx.arc(x + w * .8, y + h * .24, h * .1, 0, Math.PI * 2); ctx.fill();
  const hop = Math.abs(Math.sin(tt * Math.PI * 1.15)), bx = x + w * (.18 + .62 * ((tt * .3) % 1)), r = h * .1;
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(bx, gy + r * .25, r * (1.1 - hop * .4), r * .28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.frozen ? '#a9a9b6' : ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = Math.max(2, h * .018);
  ctx.beginPath(); ctx.ellipse(bx, gy - r - hop * h * .42, r * (1 + (1 - hop) * .12), r * (1 - (1 - hop) * .12), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 一格胶片：深色边、两排齿孔，中间是迷你场景。
function filmFrame(ctx, x, y, w, rot, tt, alpha = 1) {
  const h = w * .72;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * .08); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER;
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(-w * .36 + i * w * .24 - w * .04, side * h * .4 - h * .035, w * .08, h * .07, 2); ctx.fill(); }
  miniScene(ctx, -w * .4, -h * .3, w * .8, h * .6, tt);
  ctx.restore();
}
// 缠成一团的胶片。
function tangle(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round';
  const loop = () => { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse((i - 2) * 22, Math.sin(i * 2.1) * 16 - 48, 62 - i * 5, 40 + (i % 2) * 14, i * .7, 0, Math.PI * 2); ctx.stroke(); } };
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 27; loop();
  ctx.strokeStyle = INK; ctx.lineWidth = 19; loop();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 4; ctx.setLineDash([5, 11]); loop(); ctx.setLineDash([]);
  ctx.restore();
}
// 画架：返回画纸的中心。
function easel(ctx, x, y) {
  ctx.strokeStyle = PAL.line; ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [[x - 120, y - 250, x - 190, y], [x + 120, y - 250, x + 190, y], [x, y - 330, x + 60, y - 30]]) {
    ctx.lineWidth = 27; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = 17; ctx.strokeStyle = '#c99a62'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.fillStyle = '#c99a62'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x - 215, y - 232, 430, 26, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(x - 190, y - 520, 380, 290, 12); ctx.fill(); ctx.stroke();
  return [x, y - 375];
}
// 流程链条上的一节：白底圆牌，里面一个小图标。
function node(ctx, x, y, r, kind, t, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(75,79,217,.12)'; ctx.beginPath(); ctx.arc(0, 8, r + 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = INDIGO; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r - 11, 0, Math.PI * 2); ctx.stroke();
  ctx.scale(r / 46, r / 46); botGlyph(ctx, kind, t, INDIGO);
  ctx.restore();
}
// 胶片盒：一个带辐条的圆盘。dashed 为真时只剩虚线轮廓。
function filmCan(ctx, x, y, r, rot, dashed = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (dashed < 1) {
    ctx.globalAlpha = 1 - dashed; ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8d97ad'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(0, 0, r * .16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (dashed > 0) { ctx.globalAlpha = dashed * .8; ctx.strokeStyle = '#8d97ad'; ctx.lineWidth = 6; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
// 代码牌：深色圆角牌，左边一对花括号，右边几行彩色短线代表代码。k 是写出的进度。
function codePlate(ctx, x, y, w, h, k = 1, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(-w / 2 + 46, 0); ctx.scale(1.15, 1.15); botGlyph(ctx, 'braces', 0); ctx.restore();
  ctx.lineCap = 'round'; ctx.lineWidth = 9;
  [[BOTC.glow, .5], [ORANGE, .34], ['#c9c4ee', .44]].forEach(([color, len], i) => {
    const p = clamp(k * 3 - i); if (p <= 0) return;
    const x0 = -w / 2 + 100 + (i === 1 ? 22 : 0), yy = -h / 2 + h * (.28 + i * .22);
    ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + (w - 130) * len * 1.6 * p, yy); ctx.stroke();
  });
  ctx.restore();
}

// ---------- 道具：纸、文件夹、册子、代码窗口、滑杆、记号、放大镜、声音、机器 ----------
const GREY = '#8d97ad', LILAC = '#c9c4ee';

// 一张纸：上面几行灰色短线，k 是写出的进度；icon 是右上角的小图标（lines wave grid 之一或不写）。
function sheet(ctx, x, y, w, h, o = {}) {
  const k = o.k ?? 1, n = o.lines ?? 5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(o.s ?? 1, o.s ?? 1); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = 'rgba(40,40,80,.12)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 + 10, w, h, 12); ctx.fill();
  ctx.fillStyle = o.tint ?? PAPER; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  if (o.band) { ctx.fillStyle = o.band; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h * .17, [12, 12, 0, 0]); ctx.fill(); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke(); }
  ctx.lineCap = 'round'; ctx.strokeStyle = o.ink ?? GREY; ctx.lineWidth = Math.max(4, h * .035);
  const top = -h / 2 + h * (o.band ? .3 : .2), gap = h * (o.band ? .6 : .66) / n;
  for (let i = 0; i < n; i++) {
    const p = clamp(k * n - i); if (p <= 0) continue;
    const len = w * (.72 - (i % 3) * .14);
    ctx.beginPath(); ctx.moveTo(-w * .36, top + i * gap); ctx.lineTo(-w * .36 + len * p, top + i * gap); ctx.stroke();
  }
  ctx.restore();
}
// 文件夹：open 从 0 到 1 时封面掀开。返回内页的中心。
function folder(ctx, x, y, w, h, open = 0, color = '#f6c56a') {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.fillStyle = '#e0a83f'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 - h * .1, w * .42, h * .2, [14, 14, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(-w / 2 + 14, -h / 2 + 12, w - 28, h - 24, 10); ctx.fill();
  // 封面：绕下边掀开，掀到一半时变窄。
  const tilt = ease.inOut(clamp(open));
  if (tilt < 1) {
    ctx.save(); ctx.translate(0, h / 2); ctx.scale(1, lerp(1, -.28, tilt));
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 16); ctx.fill(); ctx.stroke(); ctx.restore();
  } else {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2 - 22, h / 2 + h * .28); ctx.lineTo(w / 2 + 22, h / 2 + h * .28); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  return [x, y];
}
// 册子（说明书）：open 为 0 是合上的封面，1 是摊开的两页；k 是页面上亮起的行数进度。
function book(ctx, x, y, s = 1, open = 1, k = 0, cover = INDIGO) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const o = ease.inOut(clamp(open));
  if (o < .5) {
    ctx.fillStyle = cover; ctx.beginPath(); ctx.roundRect(-70, -95, 140, 190, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(-44, -62, 88, 44, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(34, -95); ctx.lineTo(34, -40); ctx.lineTo(46, -54); ctx.lineTo(58, -40); ctx.lineTo(58, -95); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    const half = 150 * (o * 2 - 1);
    ctx.fillStyle = cover; ctx.beginPath(); ctx.roundRect(-half - 10, -92, half * 2 + 20, 194, 14); ctx.fill(); ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(0, -90); ctx.quadraticCurveTo(side * half * .5, -104, side * half, -90); ctx.lineTo(side * half, 90); ctx.quadraticCurveTo(side * half * .5, 76, 0, 90); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const lit = clamp(k * 10 - (side < 0 ? i : i + 5));
        ctx.strokeStyle = lit > 0 ? INDIGO : LILAC; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(side * half * .18, -62 + i * 30); ctx.lineTo(side * half * (.82 - (i % 2) * .16), -64 + i * 30); ctx.stroke();
      }
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
    }
  }
  ctx.restore();
}
// 代码窗口：标题栏三个圆点，下面几行带缩进的彩色短线，k 是敲出来的进度。
function codeWindow(ctx, x, y, w, h, k = 1, t = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(8, 14, w, h, 22); ctx.fill();
  ctx.fillStyle = INK; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3d4163'; ctx.beginPath(); ctx.roundRect(0, 0, w, 50, [22, 22, 0, 0]); ctx.fill();
  [ORANGE, '#ffd34d', BOTC.glow].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(34 + i * 32, 25, 9, 0, Math.PI * 2); ctx.fill(); });
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 22); ctx.stroke();
  const rows = Math.max(3, Math.floor((h - 90) / 38)), colors = [BOTC.glow, LILAC, ORANGE, LILAC, '#ffd34d', LILAC, BOTC.glow, ORANGE];
  ctx.lineCap = 'round'; ctx.lineWidth = 11;
  for (let i = 0; i < rows; i++) {
    const p = clamp(k * rows - i); if (p <= 0) continue;
    const indent = (i === 0 || i === rows - 1 ? 0 : 1 + (i % 3 === 2 ? 1 : 0)) * 34, len = (w - 110 - indent) * (.35 + hash(i + 3) * .5);
    ctx.strokeStyle = colors[i % colors.length]; ctx.beginPath(); ctx.moveTo(40 + indent, 86 + i * 38); ctx.lineTo(40 + indent + len * p, 86 + i * 38); ctx.stroke();
    // 正在敲的那一行后面有光标在闪。
    if (p < 1 && Math.sin(t * 12) > 0) { ctx.strokeStyle = PAL.white; ctx.beginPath(); ctx.moveTo(40 + indent + len * p + 16, 76 + i * 38); ctx.lineTo(40 + indent + len * p + 16, 96 + i * 38); ctx.stroke(); }
  }
  ctx.restore();
}
// 预览画布：白框里是迷你场景。
function preview(ctx, x, y, w, h, tt, o = {}) {
  ctx.fillStyle = 'rgba(40,40,80,.14)'; ctx.beginPath(); ctx.roundRect(x - 8, y, w + 32, h + 32, 24); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(x - 16, y - 16, w + 32, h + 32, 24); ctx.fill(); ctx.stroke();
  miniScene(ctx, x, y, w, h, tt, { r: 12, ...o });
}
// 时间滑杆：u 是滑块位置 0..1。
function slider(ctx, x, y, w, u, color = INDIGO) {
  ctx.lineCap = 'round';
  ctx.lineWidth = 18; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.lineWidth = 9; ctx.strokeStyle = LILAC; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * u, y); ctx.stroke();
  for (let i = 0; i <= 10; i++) { ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w * i / 10, y + 18); ctx.lineTo(x + w * i / 10, y + (i % 5 ? 30 : 40)); ctx.stroke(); }
  ctx.fillStyle = ORANGE; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x + w * u, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
// 记号：check 对勾、cross 叉、q 问号、bang 感叹号。k 是画出的进度；都是路径，不是文字。
function mark(ctx, kind, x, y, s = 1, k = 1, color = TEAL) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const both = draw => { ctx.strokeStyle = PAL.white; ctx.lineWidth = 22; draw(); ctx.strokeStyle = color; ctx.lineWidth = 12; draw(); };
  if (kind === 'check') both(() => trace(ctx, [[-24, 2], [-7, 20], [26, -20]], k));
  else if (kind === 'cross') both(() => { trace(ctx, [[-20, -20], [20, 20]], clamp(k * 2)); if (k > .5) trace(ctx, [[20, -20], [-20, 20]], clamp(k * 2 - 1)); });
  else if (kind === 'q') both(() => { ctx.beginPath(); ctx.arc(0, -14, 17, Math.PI * 1.05, Math.PI * (1.05 + 1.45 * clamp(k * 1.4))); ctx.stroke(); if (k > .6) { ctx.beginPath(); ctx.moveTo(1, 4); ctx.lineTo(1, 12); ctx.moveTo(1, 30); ctx.lineTo(1, 30.5); ctx.stroke(); } });
  else both(() => { ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 8 * clamp(k * 1.5) - 4); ctx.stroke(); if (k > .6) { ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, 28.5); ctx.stroke(); } });
  ctx.restore();
}
// 放大镜：镜片中心在 (x, y)，柄朝 a 的方向。
function magnifier(ctx, x, y, r, a = .9) {
  const hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r;
  ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = r * .42; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * r * 1.1, hy + Math.sin(a) * r * 1.1); ctx.stroke();
  ctx.strokeStyle = INDIGO; ctx.lineWidth = r * .24; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * r * 1.1, hy + Math.sin(a) * r * 1.1); ctx.stroke();
  ctx.fillStyle = 'rgba(214,236,255,.55)'; ctx.strokeStyle = PAL.line; ctx.lineWidth = r * .2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = r * .1; ctx.beginPath(); ctx.arc(x, y, r * .62, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
}
// 声波：一排随时间起伏的竖条，k 是从左到右铺开的进度。
function waveform(ctx, x, y, w, h, t, k = 1, color = INDIGO, n = 26) {
  ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = Math.max(5, w / n * .42);
  for (let i = 0; i < n; i++) {
    if (i / n > k) break;
    const a = h * (.18 + .82 * Math.abs(Math.sin(i * 1.7 + t * 5) * Math.sin(i * .45 + t * 1.3)));
    ctx.beginPath(); ctx.moveTo(x + w * (i + .5) / n, y - a / 2); ctx.lineTo(x + w * (i + .5) / n, y + a / 2); ctx.stroke();
  }
}
// 喇叭：muted 从 0 到 1 时声波消失并划上斜线。
function speaker(ctx, x, y, s, t, muted = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = INDIGO; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-34, -16); ctx.lineTo(-10, -16); ctx.lineTo(22, -42); ctx.lineTo(22, 42); ctx.lineTo(-10, 16); ctx.lineTo(-34, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 2; i++) { ctx.globalAlpha = (1 - muted) * (.55 + .45 * Math.sin(t * 6 - i * 1.2)); ctx.strokeStyle = INDIGO; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(24, 0, 24 + i * 22, -.75, .75); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (muted > 0) { ctx.strokeStyle = PAL.white; ctx.lineWidth = 20; trace(ctx, [[-44, -46], [62, 46]], muted); ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 11; trace(ctx, [[-44, -46], [62, 46]], muted); }
  ctx.restore();
}
// 话筒：on 时头部发亮。
function mic(ctx, x, y, s, on = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  if (on > 0) { ctx.fillStyle = 'rgba(240,138,60,' + .25 * on + ')'; ctx.beginPath(); ctx.arc(0, -30, 70, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, -10, 44, .15, Math.PI - .15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(0, 62); ctx.moveTo(-28, 62); ctx.lineTo(28, 62); ctx.stroke();
  ctx.fillStyle = on > .5 ? ORANGE : GREY; ctx.beginPath(); ctx.roundRect(-24, -76, 48, 88, 24); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; for (const dy of [-46, -28, -10]) { ctx.beginPath(); ctx.moveTo(-12, dy); ctx.lineTo(12, dy); ctx.stroke(); }
  ctx.restore();
}
// 齿轮。
function gear(ctx, x, y, r, rot, color = GREY, teeth = 9) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r : r * .78; for (const da of [-.11, .11]) ctx.lineTo(Math.cos(a + da) * rr, Math.sin(a + da) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 传送带：phase 增大时带面向右走。
function conveyor(ctx, x, y, w, phase, h = 46) {
  ctx.fillStyle = '#5a6078'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 4, y + 4, w - 8, h - 8, h / 2); ctx.clip();
  ctx.strokeStyle = '#7b829c'; ctx.lineWidth = 6;
  for (let i = -1; i < w / 44 + 1; i++) { const xx = x + ((i * 44 + phase) % (w + 44) + w + 44) % (w + 44) - 22; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx - 16, y + h); ctx.stroke(); }
  ctx.restore();
  for (const xx of [x + h / 2, x + w - h / 2]) gear(ctx, xx, y + h / 2, h * .36, phase / 22, GREY, 7);
}
// 工位拱门：on 从 0 到 1 时亮起。
function arch(ctx, x, y, w, h, on = 0, color = INDIGO) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.stroke(); };
  if (on > 0) { ctx.strokeStyle = 'rgba(75,79,217,' + .22 * on + ')'; ctx.lineWidth = 46; path(); }
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 26; path();
  ctx.strokeStyle = on > .5 ? color : '#b9bfd2'; ctx.lineWidth = 15; path();
  ctx.fillStyle = on > .5 ? '#ffd34d' : '#e6e8f2'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - h, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
// 话泡：尾巴朝下，tail 是尾巴相对中心的横向位置。
function bubble(ctx, x, y, w, h, tail = 0, fill = PAL.white) {
  ctx.fillStyle = fill; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x + tail - 18, y + h / 2 - 4); ctx.lineTo(x + tail * 1.5, y + h / 2 + 34); ctx.lineTo(x + tail + 18, y + h / 2 - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) * .38); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x + tail - 14, y + h / 2 - 8); ctx.lineTo(x + tail * 1.42, y + h / 2 + 22); ctx.lineTo(x + tail + 14, y + h / 2 - 8); ctx.closePath(); ctx.fill();
}
// 小图标：bulb 灯泡、lock 锁、note 音符、phone 手机、ear 耳机、pin 图钉、stamp 印章、clock 秒表。都以 (x, y) 为中心，s 为大小。
function icon(ctx, kind, x, y, s = 1, t = 0, color = INDIGO) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 5; ctx.fillStyle = color;
  if (kind === 'bulb') {
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, -8, 24, Math.PI * .8, Math.PI * .2); ctx.lineTo(10, 22); ctx.lineTo(-10, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GREY; ctx.beginPath(); ctx.roundRect(-10, 22, 20, 12, 4); ctx.fill(); ctx.stroke();
  } else if (kind === 'lock') {
    ctx.beginPath(); ctx.arc(0, -10, 15, Math.PI, 0); ctx.lineTo(15, 2); ctx.moveTo(-15, -10); ctx.lineTo(-15, 2); ctx.stroke();
    ctx.fillStyle = GREY; ctx.beginPath(); ctx.roundRect(-24, 0, 48, 36, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(0, 15, 5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'note') {
    ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-6, -26); ctx.lineTo(22, -34); ctx.lineTo(22, 10); ctx.stroke();
    for (const [nx, ny] of [[-16, 18], [12, 10]]) { ctx.beginPath(); ctx.ellipse(nx, ny, 12, 9, -.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (kind === 'phone') {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-26, -46, 52, 92, 12); ctx.fill(); ctx.stroke();
    miniScene(ctx, -20, -36, 40, 64, t, { r: 4 });
  } else if (kind === 'ear') {
    ctx.lineWidth = 9; ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 5; for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * 30 - 11, -4, 22, 36, 10); ctx.fill(); ctx.stroke(); }
  } else if (kind === 'pin') {
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 40); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-6, -16, 6, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'stamp') {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-13, -40, 26, 38, 10); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-30, -4, 60, 22, 8); ctx.fill(); ctx.stroke();
  } else if (kind === 'clock') {
    ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(0, 4, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -36); ctx.lineTo(8, -36); ctx.moveTo(0, -36); ctx.lineTo(0, -26); ctx.stroke();
    ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(Math.cos(t - Math.PI / 2) * 20, 4 + Math.sin(t - Math.PI / 2) * 20); ctx.stroke();
  }
  ctx.restore();
}
// 步骤徽章：白底圆牌，on 从 0 到 1 时外圈由灰变靛蓝并轻轻放大；kind 是里面的小图标（lines braces wave check play dot）。
function badge(ctx, x, y, r, kind, on = 1, t = 0, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + .06 * on), s * (1 + .06 * on));
  ctx.fillStyle = 'rgba(75,79,217,.12)'; ctx.beginPath(); ctx.arc(0, 8, r + 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = on > .5 ? INDIGO : '#c3c7d6'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
  ctx.scale(r / 46, r / 46); botGlyph(ctx, kind, t, on > .5 ? INDIGO : '#a9aec2');
  ctx.restore();
}
// HyperFrames 那台机器：机身正面是一块浏览器小窗，顶上一盏灯，右侧是出片口；(x, y) 是底边中点。on 为亮起程度。
// 名牌用标签贴在它上方。返回 {win: 小窗中心, slot: 出片口, lamp: 灯} 的世界坐标。
function hfMachine(ctx, x, y, s = 1, t = 0, on = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.line; ctx.lineWidth = 6;
  ctx.fillStyle = 'rgba(40,40,80,.16)'; ctx.beginPath(); ctx.ellipse(0, 6, 190, 16, 0, 0, Math.PI * 2); ctx.fill();
  for (const dx of [-110, 110]) { ctx.fillStyle = '#8d97ad'; ctx.beginPath(); ctx.roundRect(dx - 16, -30, 32, 32, 8); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#5a6078'; ctx.beginPath(); ctx.roundRect(-170, -250, 340, 226, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a4f66'; ctx.beginPath(); ctx.roundRect(-170, -78, 340, 54, [0, 0, 30, 30]); ctx.fill(); ctx.beginPath(); ctx.roundRect(-170, -250, 340, 226, 30); ctx.stroke();
  // 正面的小窗：一张网页
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(-140, -226, 200, 132, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9c4ee'; ctx.beginPath(); ctx.roundRect(-140, -226, 200, 28, [14, 14, 0, 0]); ctx.fill(); ctx.beginPath(); ctx.roundRect(-140, -226, 200, 132, 14); ctx.stroke();
  ['#f08a3c', '#ffd34d', '#8ff0dd'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-122 + i * 20, -212, 6, 0, Math.PI * 2); ctx.fill(); });
  miniScene(ctx, -132, -192, 184, 92, t, { r: 6, frozen: on < .5 });
  // 右侧：快门镜头和出片口
  ctx.fillStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(114, -176, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on > .5 ? '#8ff0dd' : '#8d97ad'; ctx.beginPath(); ctx.arc(114, -176, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(150, -120, 26, 70, 8); ctx.fill(); ctx.stroke();
  // 底部一排齿轮
  ctx.restore();
  gear(ctx, x - 96 * s, y - 51 * s, 20 * s, t * 1.6 * on, '#8d97ad', 7); gear(ctx, x - 52 * s, y - 51 * s, 16 * s, -t * 2 * on, '#f08a3c', 7);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, -250); ctx.lineTo(0, -272); ctx.stroke();
  if (on > 0) { ctx.fillStyle = 'rgba(255,211,77,' + .35 * on + ')'; ctx.beginPath(); ctx.arc(0, -288, 40, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = on > .5 ? '#ffd34d' : '#e6e8f2'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -288, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  return { win: [x - 40 * s, y - 160 * s], slot: [x + 176 * s, y - 85 * s], lamp: [x, y - 288 * s] };
}
// 一组小画面排成格子：k 是从第一格到最后一格依次弹出的进度，tt 是第一格里迷你场景的时间，每格往后错开 step 秒。
// 返回每一格的中心坐标。
function frameGrid(ctx, x, y, cols, rows, cw, ch, gap, k = 1, tt = 0, step = .35) {
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const cx = x + (i % cols) * (cw + gap) + cw / 2, cy = y + Math.floor(i / cols) * (ch + gap) + ch / 2;
    cells.push([cx, cy]);
    const p = ease.out(clamp(k * cols * rows - i)); if (p <= 0) continue;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
    ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 8); ctx.fill(); ctx.stroke();
    miniScene(ctx, -cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, tt + i * step, { r: 5 });
    ctx.restore();
  }
  return cells;
}
