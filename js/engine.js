/* ------------------------------------------------------------------ *
 * engine.js — canvas, drawing, history and pages
 * ------------------------------------------------------------------ */

export const stage   = document.getElementById('stage');
export const board   = document.getElementById('board');
export const overlay = document.getElementById('overlay');
export const ctx     = board.getContext('2d');
export const octx    = overlay.getContext('2d');

export const PAPER = '#ffffff';

export const state = {
  tool: 'pen',
  color: '#111111',
  size: 4,
  opacity: 1,
  shift: false,
  drawing: false,
  start: null,
  last: null,
};

/* ----------------------------- pages ----------------------------- */
let uid = 0;
const newPage = () => ({ id: ++uid, snapshot: null, history: [], future: [] });

export const pages = [newPage()];
export let index = 0;

export const current = () => pages[index];

/* ----------------------------- sizing ----------------------------- */
export const dpr = () => Math.min(window.devicePixelRatio || 1, 2.5);

export function cssSize() {
  return { w: stage.clientWidth || window.innerWidth, h: stage.clientHeight || window.innerHeight };
}

export function fillPaper() {
  const { w, h } = cssSize();
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function resizeCanvas(preserve = true) {
  const { w, h } = cssSize();
  const ratio = dpr();

  let snap = null;
  if (preserve && board.width && board.height) {
    snap = document.createElement('canvas');
    snap.width = board.width;
    snap.height = board.height;
    snap.getContext('2d').drawImage(board, 0, 0);
  }

  [board, overlay].forEach((c) => { c.width = Math.round(w * ratio); c.height = Math.round(h * ratio); });
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  octx.setTransform(ratio, 0, 0, ratio, 0, 0);

  fillPaper();

  if (snap) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(snap, 0, 0, board.width, board.height);
    ctx.restore();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/* ----------------------------- history ----------------------------- */
const MAX = 40;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export const emit = () => listeners.forEach((fn) => fn());

export function snapshot() {
  try { return board.toDataURL('image/png'); } catch { return null; }
}

export function commit() {
  const p = current();
  const data = snapshot();
  if (!data) return;
  p.history.push(data);
  if (p.history.length > MAX) p.history.shift();
  p.future.length = 0;
  p.snapshot = data;
  emit();
}

export function paint(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) { fillPaper(); resolve(); return; }
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, board.width, board.height);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, board.width, board.height);
      ctx.drawImage(img, 0, 0, board.width, board.height);
      ctx.restore();
      resolve();
    };
    img.onerror = () => { fillPaper(); resolve(); };
    img.src = dataUrl;
  });
}

export const canUndo = () => current().history.length > 1;
export const canRedo = () => current().future.length > 0;

export async function undo() {
  const p = current();
  if (p.history.length < 2) return false;
  p.future.push(p.history.pop());
  p.snapshot = p.history[p.history.length - 1];
  await paint(p.snapshot);
  emit();
  return true;
}

export async function redo() {
  const p = current();
  if (!p.future.length) return false;
  const next = p.future.pop();
  p.history.push(next);
  p.snapshot = next;
  await paint(next);
  emit();
  return true;
}

export function clearPage() {
  fillPaper();
  commit();
}

/* ----------------------------- page nav ----------------------------- */
function stash() {
  const p = current();
  p.snapshot = snapshot();
}

export async function goTo(i) {
  if (i < 0 || i >= pages.length || i === index) return;
  stash();
  index = i;
  const p = current();
  await paint(p.snapshot);
  if (!p.history.length) commit();
  emit();
}

export async function addPage(at = pages.length) {
  stash();
  const p = newPage();
  pages.splice(at, 0, p);
  index = at;
  fillPaper();
  commit();
  emit();
}

export async function removePage(i) {
  if (pages.length === 1) {
    pages[0] = newPage();
    index = 0;
    fillPaper();
    commit();
    emit();
    return;
  }
  const wasCurrent = i === index;
  pages.splice(i, 1);
  if (index >= pages.length) index = pages.length - 1;
  else if (i < index) index -= 1;
  if (wasCurrent || true) await paint(current().snapshot);
  if (!current().history.length) commit();
  emit();
}

export function syncCurrentSnapshot() { stash(); }

/* ----------------------------- drawing ----------------------------- */
export function applyStyle(c) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = state.size;
  if (state.tool === 'eraser') {
    c.globalAlpha = 1;
    c.strokeStyle = PAPER;
    c.fillStyle = PAPER;
  } else {
    c.globalAlpha = state.opacity;
    c.strokeStyle = state.color;
    c.fillStyle = state.color;
  }
}

function constrain(a, b) {
  if (!state.shift) return b;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (state.tool === 'line' || state.tool === 'arrow') {
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
  }
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + (dx < 0 ? -m : m), y: a.y + (dy < 0 ? -m : m) };
}

export function drawShape(c, a, bRaw) {
  const b = constrain(a, bRaw);
  applyStyle(c);
  c.beginPath();
  if (state.tool === 'line') {
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  } else if (state.tool === 'rect') {
    c.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    c.stroke();
  } else if (state.tool === 'circle') {
    c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    c.stroke();
  } else if (state.tool === 'arrow') {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = Math.max(10, state.size * 2.5);
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.beginPath();
    c.moveTo(b.x, b.y);
    c.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
    c.moveTo(b.x, b.y);
    c.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
    c.stroke();
  }
  c.globalAlpha = 1;
}

export function clearOverlay() {
  octx.save();
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, overlay.width, overlay.height);
  octx.restore();
}
