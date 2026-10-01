// Build the HyperFrames page for an episode: one full-frame canvas that <episode>/visuals.mjs draws as a
// pure function of time, its words as DOM labels the checks can read, and engine-owned captions and chrome.
// An optional <episode>/kit.mjs (the shared character rig and drawing helpers) is loaded in front of visuals.mjs.
// Usage: node compose_stage.mjs <episode-dir> [--preview]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const PREVIEW_SECONDS = 10;
const PREVIEW_SHOTS = [.12, .5, .92];
// The film's first frame is its cover: the title card over the first scene, which is already drawn and already
// speaking underneath. It holds for a second, fades out, and no caption shows on frame 0.
const COVER_HOLD = 1, COVER_FADE = .4, FRAME = 1 / 30;
const dir = path.resolve(process.argv[2] || '');
const preview = process.argv.includes('--preview');
const resolved = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'resolved.json'), 'utf8'));
const kit = path.join(dir, 'kit.mjs');
const source = (fs.existsSync(kit) ? fs.readFileSync(kit, 'utf8') + '\n' : '') + fs.readFileSync(path.join(dir, 'visuals.mjs'), 'utf8');
// Node reads the labels from the same joined text the page will run.
const joined = path.join(dir, 'build', preview ? 'stage-preview.mjs' : 'stage.mjs');
fs.writeFileSync(joined, source);
const visuals = await import(pathToFileURL(joined).href);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fail = message => { throw new Error(message); };

if (typeof visuals.draw !== 'function') fail('visuals.mjs must export function draw(ctx, frame)');
const labels = visuals.labels ?? {};
if (typeof labels !== 'object' || Array.isArray(labels)) fail('visuals.mjs labels must be an object of key: text');
for (const [key, text] of Object.entries(labels)) {
  if (!/^[a-z][a-z0-9_]*$/.test(key)) fail(`label key ${key} must be a lowercase identifier`);
  if (typeof text !== 'string' || !text.trim()) fail(`label ${key} must be a non-empty string`);
}
const images = visuals.images ?? {};
for (const [key, file] of Object.entries(images)) {
  if (!/^[a-z][a-z0-9_]*$/.test(key)) fail(`image key ${key} must be a lowercase identifier`);
  if (!/^assets\/[\w.-]+\.(png|jpg|svg)$/.test(file) || !fs.existsSync(path.join(dir, file))) fail(`image ${key} must be an existing file under assets/`);
}
// The whole file runs in the page, so its exports become plain declarations there.
const pageSource = source.replace(/^export\s+(?=(const|let|function|class)\b)/gm, '');
if (/^\s*export\b/m.test(pageSource)) fail('visuals.mjs may only export declarations (export const / export function)');
if (/<\/script/i.test(source)) fail('visuals.mjs must not contain a closing script tag');

let timeline, beats;
if (preview) {
  timeline = resolved.scenes.map((s, i) => ({id: s.id, start: i * PREVIEW_SECONDS, end: (i + 1) * PREVIEW_SECONDS, duration: PREVIEW_SECONDS, subtitles: []}));
  // No narration yet: a reveal sits where its phrase sits in the text.
  beats = Object.fromEntries(resolved.scenes.map((scene, i) => [scene.id, Object.fromEntries(Object.entries(scene.reveals).map(
    ([key, phrase]) => [key, timeline[i].start + PREVIEW_SECONDS * scene.narration.indexOf(phrase) / scene.narration.length]))]));
} else {
  timeline = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8')).scenes;
  beats = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'beats.json'), 'utf8'));
  if (timeline.length !== resolved.scenes.length) fail('timeline.json and the spec disagree on the scene count');
  if (!fs.existsSync(path.join(dir, 'audio', 'final-mix.wav'))) fail('Missing audio/final-mix.wav; run the mix stage');
}
let previous = 0;
for (const [i, s] of timeline.entries()) {
  const scene = resolved.scenes[i];
  if (s.id !== scene.id || !(s.end > s.start) || Math.abs(s.start - previous) > .002) fail(`Invalid timeline at ${s.id}`);
  if (!preview) {
    if (!(s.duration > 0) || s.duration > s.end - s.start + .01) fail(`Invalid audio duration ${s.id}`);
    if (s.subtitles.map(c => c.text).join('') !== scene.narration) fail(`Subtitles must preserve the narration verbatim: ${s.id}`);
    let last = 0;
    for (const c of s.subtitles) { if (c.start < last - .001 || !(c.end > c.start) || c.end > s.end - s.start + .01) fail(`Invalid cue ${s.id}`); last = c.end; }
  }
  for (const key of Object.keys(scene.reveals)) if (!Number.isFinite(beats[s.id]?.[key])) fail(`No beat time for ${s.id}.${key}`);
  previous = s.end;
}
const total = timeline.at(-1).end;
// What the episode's draw function sees: `voice` is where the narration ends, `end` includes the pause after it.
const scenes = timeline.map(s => ({id: s.id, start: s.start, end: s.end, voice: s.start + s.duration, beats: beats[s.id]}));

// Rehearse the whole film against a stand-in canvas before anything is rendered. A frame whose draw throws would
// otherwise come out half drawn, and neither the page check nor the final verification notices that.
function rehearse() {
  const gradient = {addColorStop() {}};
  const canvas = new Proxy({globalAlpha: 1}, {
    get: (own, key) => key in own ? own[key] : typeof key === 'string' && key.startsWith('create') ? () => gradient : () => undefined,
    set: (own, key, value) => { own[key] = value; return true; },
  });
  globalThis.Path2D ??= class { constructor() { return new Proxy(this, {get: () => () => undefined}); } };
  const need = (what, key, o, fields) => {
    if (fields.some(field => !Number.isFinite(o?.[field]))) throw new Error(`${what} ${key} needs ${fields.join(', ')}`);
  };
  const label = (key, o) => { if (!(key in labels)) throw new Error(`Unknown label ${key}`); need('Label', key, o, ['x', 'y']); };
  const image = (key, o) => { if (!(key in images)) throw new Error(`Unknown image ${key}`); need('Image', key, o, ['x', 'y', 'w']); };
  // Ten moments a second, plus every scene edge and every beat, where a branch is most likely to change.
  const moments = new Set();
  for (let t = 0; t < total; t += .1) moments.add(Math.round(t * 1000) / 1000);
  for (const s of scenes) {
    moments.add(s.start);
    moments.add(Math.max(0, s.end - .001));
    for (const beat of Object.values(s.beats)) moments.add(beat);
  }
  for (const t of [...moments].sort((a, b) => a - b)) {
    const scene = scenes.find(s => t < s.end) ?? scenes.at(-1);
    try { visuals.draw(canvas, {t, total, scenes, scene, local: t - scene.start, label, image}); }
    catch (error) { fail(`draw failed at ${t.toFixed(2)} s (${scene.id}): ${error.message}`); }
  }
}
rehearse();

// Serialized into the page, so it must stay self-contained.
function stageRuntime(scenes, total) {
  const ctx = document.getElementById('stage').getContext('2d');
  const nodes = {};
  for (const node of document.querySelectorAll('.lb')) nodes[node.id.slice(3)] = node;
  for (const node of document.querySelectorAll('.im')) nodes[node.id.slice(3)] = node;
  const shown = new Set();
  const anchor = {center: '-50%', left: '0%', right: '-100%'};
  // Show one picture from the episode's assets this frame, centred on x, y and w pixels wide.
  function image(key, o = {}) {
    const node = nodes[key];
    if (!node || node.tagName !== 'IMG') throw new Error('Unknown image ' + key);
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y) || !Number.isFinite(o.w)) throw new Error('Image ' + key + ' needs x, y and w');
    shown.add(key);
    node.style.opacity = o.alpha ?? 1;
    node.style.width = o.w + 'px';
    node.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) translate(-50%,-50%) rotate(' + (o.rotate ?? 0) + 'rad) scale(' + (o.scale ?? 1) + ')';
  }
  // Show one label this frame; anything not asked for stays hidden, so no state survives between frames.
  function label(key, o = {}) {
    const node = nodes[key];
    if (!node || node.tagName === 'IMG') throw new Error('Unknown label ' + key);
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) throw new Error('Label ' + key + ' needs x and y');
    shown.add(key);
    const s = node.style;
    s.opacity = o.alpha ?? 1;
    s.fontSize = (o.size ?? 44) + 'px';
    s.fontWeight = o.weight ?? 800;
    s.color = o.color ?? '#0f2a4a';
    s.background = o.plate ?? 'none';
    s.padding = o.plate ? '.18em .62em' : '0';
    s.textShadow = o.halo ? ['-3px 0', '3px 0', '0 -3px', '0 3px', '-2px -2px', '2px -2px', '-2px 2px', '2px 2px'].map(d => d + ' 0 ' + o.halo).join(',') : 'none';
    s.transform = 'translate(' + o.x + 'px,' + o.y + 'px) translate(' + anchor[o.align ?? 'center'] + ',-50%) rotate(' + (o.rotate ?? 0) + 'rad) scale(' + (o.scale ?? 1) + ')';
  }
  return function render(t) {
    const scene = scenes.find(s => t < s.end) ?? scenes[scenes.length - 1];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, 1920, 1080);
    shown.clear();
    // Hide what this frame did not ask for even when draw throws, so a broken frame cannot keep an earlier frame's words.
    try { draw(ctx, {t, total, scenes, scene, local: t - scene.start, label, image}); }
    finally { for (const key in nodes) if (!shown.has(key)) nodes[key].style.opacity = 0; }
  };
}

// The series text and the progress bar are the stage's own chrome; an episode may recolour them with spec.accent.
const [accent, accentEnd] = resolved.accent ?? ['#4b4fd9', '#f08a3c'];
const CSS = `
@font-face{font-family:NotoSC;src:url('public/NotoSansSC.ttf') format('truetype');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#eaf5ff;color:#0f2a4a;font-family:NotoSC,sans-serif}
#root{position:relative;width:100%;height:100%;overflow:hidden}
#stage{position:absolute;inset:0;width:1920px;height:1080px}
.lb,.im{position:absolute;left:0;top:0;z-index:2;transform-origin:center;opacity:0}
.lb{white-space:nowrap;line-height:1.25;border-radius:999px}
.series{position:absolute;left:64px;top:40px;z-index:6;padding:9px 26px;border-radius:999px;background:#fff;color:${accent};font-size:25px;font-weight:800;letter-spacing:2px;box-shadow:0 6px 18px rgba(40,40,80,.14)}
.caption{position:absolute;left:150px;right:150px;top:908px;display:flex;justify-content:center;text-align:center;z-index:4}
.caption>div{max-width:1560px;padding:8px 34px;font-size:42px;font-weight:700;line-height:1.4;white-space:pre-line;color:#0f2a4a;background:rgba(255,255,255,.95);border-radius:20px;box-shadow:0 8px 26px rgba(40,40,80,.16);overflow-wrap:break-word}
.src,.footer{position:absolute;bottom:18px;z-index:3;padding:3px 14px;border-radius:999px;background:rgba(255,255,255,.88);font-size:19px;letter-spacing:1px;color:#274463;font-weight:600}
.src{left:64px}.footer{right:64px}
.progress{position:absolute;bottom:0;left:0;right:0;height:6px;z-index:5;background:linear-gradient(90deg,${accent},${accentEnd});transform-origin:left center}
.preview{position:absolute;right:64px;top:46px;z-index:5;color:${accent};font-size:22px;font-weight:700}
.cover{position:absolute;left:0;top:0;width:1920px;height:890px;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;background:rgba(255,255,255,.45)}
.cover-title{padding:20px 64px;border-radius:40px;background:#fff;color:${accent};font-size:88px;font-weight:900;letter-spacing:4px;line-height:1.25;white-space:nowrap;box-shadow:0 14px 40px rgba(40,40,80,.18)}
.cover-subtitle{padding:10px 40px;border-radius:999px;background:${accent};color:#fff;font-size:44px;font-weight:800;letter-spacing:2px;white-space:nowrap}
`;

const parts = [`<canvas id="stage" class="clip" data-start="0" data-duration="${total}" data-track-index="1" width="1920" height="1080"></canvas>`];
const calls = [];
for (const [key, text] of Object.entries(labels)) parts.push(`<div class="lb" id="lb-${key}">${esc(text)}</div>`);
for (const [key, file] of Object.entries(images)) {
  if (key in labels) fail(`${key} names both a label and an image`);
  parts.push(`<img class="im" id="im-${key}" src="${esc(file)}" alt="">`);
}
for (const [i, s] of timeline.entries()) {
  const scene = resolved.scenes[i];
  if (scene.source) {
    parts.push(`<div class="src" id="src-${s.id}" style="opacity:0">来源：${esc(scene.source.text)}</div>`);
    calls.push(`tl.set('#src-${s.id}',{opacity:1},${s.start});tl.set('#src-${s.id}',{opacity:0},${s.end});`);
  }
  for (const [j, c] of s.subtitles.entries()) {
    parts.push(`<div id="caption-${s.id}-${j}" class="caption" style="opacity:0"><div>${esc(c.text.trim())}</div></div>`);
    calls.push(`tl.set('#caption-${s.id}-${j}',{opacity:1},${Math.max(s.start + c.start, FRAME)});tl.set('#caption-${s.id}-${j}',{opacity:0},${s.start + c.end});`);
  }
}
const cover = resolved.cover;
parts.push(`<div id="cover" class="cover"><div class="cover-title">${esc(cover.title)}</div>${cover.subtitle ? `<div class="cover-subtitle">${esc(cover.subtitle)}</div>` : ''}</div>`);
calls.push(`tl.fromTo('#cover',{opacity:1},{opacity:0,duration:${COVER_FADE},ease:'none'},${COVER_HOLD});`);
if (!preview) parts.push(`<audio id="mixed-audio" src="audio/final-mix.wav" data-start="0" data-duration="${total}" data-track-index="3" data-volume="1"></audio>`);
const composition = preview ? 'episode-preview' : 'episode';
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920,height=1080"><title>${esc(resolved.title)}${preview ? ' · 静音视觉预览' : ''}</title><script src="public/gsap.min.js"></script><style>
${CSS}
</style></head><body><div id="root" data-composition-id="${composition}" data-start="0" data-width="1920" data-height="1080" data-fps="30" data-duration="${total}">
${parts.join('\n')}
<div class="series">${esc(resolved.series)}</div><div class="footer">${esc(resolved.footer)}</div><div id="film-progress" class="progress"></div>${preview ? `<div class="preview">静音视觉预览 · 每镜 ${PREVIEW_SECONDS} 秒 · 非配音成片</div>` : ''}
</div><script>
${pageSource}
</script><script>
${stageRuntime.toString()}
const render=stageRuntime(${JSON.stringify(scenes)},${total});
// The clock is a property GSAP writes on every seek, so the frame is redrawn even when callbacks are suppressed.
const clock={now:0,get t(){return this.now;},set t(value){this.now=value;render(value);}};
const tl=gsap.timeline({paused:true});
tl.fromTo(clock,{t:0},{t:${total},duration:${total},ease:'none'},0);
${calls.join('\n')}
tl.fromTo('#film-progress',{scaleX:0},{scaleX:1,duration:${total},ease:'none'},0);
render(0);
window.__timelines=window.__timelines||{};window.__timelines[${JSON.stringify(composition)}]=tl;
</script></body></html>`;
const dest = path.join(dir, preview ? 'preview/index.html' : 'index.html');
fs.mkdirSync(path.dirname(dest), {recursive: true});
fs.writeFileSync(dest, html);
fs.writeFileSync(path.join(dir, 'build', 'labels.json'), JSON.stringify(labels, null, 2));
// The preview's first shot is frame 0, so the contact sheet opens with the cover.
fs.writeFileSync(path.join(dir, 'build', preview ? 'preview-times.json' : 'scene-times.json'), JSON.stringify(timeline.map((s, i) => ({
  id: s.id, start: s.start, end: s.end, snapshot: s.start + (s.end - s.start) * .68,
  ...(preview ? {shots: PREVIEW_SHOTS.map((k, j) => i === 0 && j === 0 ? 0 : s.start + (s.end - s.start) * k)} : {}),
})), null, 2));
console.log(`Built ${preview ? 'silent preview' : 'audio timeline'}: ${timeline.length} stage scenes, ${total.toFixed(3)} s, ${Object.keys(labels).length} labels`);
