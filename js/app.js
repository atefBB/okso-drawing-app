import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';
import * as E from './engine.js';

/* ------------------------------------------------------------------ *
 * DOM
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);

const board      = E.board;
const cursorEl   = $('cursor');
const toast      = $('toast');

const undoBtn    = $('undoBtn');
const redoBtn    = $('redoBtn');
const clearBtn   = $('clearBtn');
const exportBtn  = $('exportBtn');
const newPageBtn = $('newPage');
const prevBtn    = $('prevPage');
const nextBtn    = $('nextPage');
const pageNum    = $('pageNum');
const pageTotal  = $('pageTotal');

const sizeBtn    = $('sizeBtn');
const sizePop    = $('sizePop');
const sizeRow    = $('sizeRow');
const sizeRange  = $('sizeRange');
const sizeVal    = $('sizeVal');
const sizeDot    = $('sizeDot');

const colorBtn   = $('colorBtn');
const colorPop   = $('colorPop');
const colorRow   = $('colorRow');
const colorInput = $('colorInput');
const colorDot   = $('colorDot');
const opacityR   = $('opacityRange');

const overview   = $('overview');
const ovGrid     = $('ovGrid');
const ovCount    = $('ovCount');
const ovClose    = $('ovClose');
const ovNew      = $('ovNew');
const ovExportAll= $('ovExportAll');

const INKS  = ['#111111', '#6b7280', '#c2410c', '#dc2626', '#d97706', '#15803d', '#0369a1', '#4338ca', '#9333ea', '#be185d'];
const SIZES = [2, 4, 8, 16, 28];

/* ------------------------------------------------------------------ *
 * Toast
 * ------------------------------------------------------------------ */
let toastTimer;
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1200);
}

/* ------------------------------------------------------------------ *
 * Tools
 * ------------------------------------------------------------------ */
const toolBtns = [...document.querySelectorAll('.tool[data-tool]')];

function setTool(tool) {
  E.state.tool = tool;
  toolBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.tool === tool));
  cursorEl.classList.toggle('eraser', tool === 'eraser');
  paintPreviews();
}
toolBtns.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

/* ------------------------------------------------------------------ *
 * Size + color controls
 * ------------------------------------------------------------------ */
SIZES.forEach((s) => {
  const btn = document.createElement('button');
  btn.className = 'size-chip';
  btn.dataset.size = s;
  const dot = document.createElement('i');
  dot.style.width = Math.min(s, 22) + 'px';
  dot.style.height = Math.min(s, 22) + 'px';
  btn.appendChild(dot);
  btn.addEventListener('click', () => setSize(s));
  sizeRow.appendChild(btn);
});

INKS.forEach((hex) => {
  const btn = document.createElement('button');
  btn.className = 'ink';
  btn.dataset.color = hex;
  btn.style.background = hex;
  btn.title = hex;
  btn.addEventListener('click', () => setColor(hex));
  colorRow.appendChild(btn);
});

function setSize(px) {
  E.state.size = Math.max(1, Math.min(60, Math.round(px)));
  sizeRange.value = E.state.size;
  sizeVal.textContent = E.state.size;
  [...sizeRow.children].forEach((c) => c.classList.toggle('is-active', +c.dataset.size === E.state.size));
  paintPreviews();
}

function setColor(hex) {
  E.state.color = hex;
  colorInput.value = hex;
  [...colorRow.children].forEach((c) => c.classList.toggle('is-active', c.dataset.color.toLowerCase() === hex.toLowerCase()));
  if (E.state.tool === 'eraser') setTool('pen');
  paintPreviews();
}

function paintPreviews() {
  const d = Math.max(3, Math.min(E.state.size, 20));
  sizeDot.style.width = d + 'px';
  sizeDot.style.height = d + 'px';
  sizeDot.style.background = E.state.tool === 'eraser' ? '#c9c9c9' : E.state.color;
  colorDot.style.background = E.state.color;
  colorDot.style.opacity = E.state.opacity;
  updateCursorSize();
}

sizeRange.addEventListener('input', () => setSize(+sizeRange.value));
colorInput.addEventListener('input', () => setColor(colorInput.value));
opacityR.addEventListener('input', () => { E.state.opacity = +opacityR.value / 100; paintPreviews(); });

/* popovers */
function closePops(except) {
  [sizePop, colorPop].forEach((p) => { if (p !== except) p.classList.remove('open'); });
}
function togglePop(pop, anchor) {
  const open = !pop.classList.contains('open');
  closePops(open ? pop : null);
  pop.classList.toggle('open', open);
  if (open) {
    const bar = document.getElementById('toolbar').getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    pop.style.left = (a.left - bar.left + a.width / 2) + 'px';
  }
}
sizeBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePop(sizePop, sizeBtn); });
colorBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePop(colorPop, colorBtn); });
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.pop') && !e.target.closest('#sizeBtn') && !e.target.closest('#colorBtn')) closePops(null);
});

/* ------------------------------------------------------------------ *
 * Cursor ring
 * ------------------------------------------------------------------ */
function updateCursorSize() {
  const d = Math.max(6, E.state.size);
  cursorEl.style.width = d + 'px';
  cursorEl.style.height = d + 'px';
}
board.addEventListener('pointermove', (e) => {
  cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
  cursorEl.classList.add('show');
});
board.addEventListener('pointerenter', () => cursorEl.classList.add('show'));
board.addEventListener('pointerleave', () => cursorEl.classList.remove('show'));

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
function pos(e) {
  const r = board.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

board.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  closePops(null);
  board.setPointerCapture(e.pointerId);
  E.state.drawing = true;
  E.state.start = pos(e);
  E.state.last = E.state.start;

  if (E.state.tool === 'pen' || E.state.tool === 'eraser') {
    E.applyStyle(E.ctx);
    E.ctx.beginPath();
    E.ctx.arc(E.state.start.x, E.state.start.y, Math.max(E.state.size / 2, 0.4), 0, Math.PI * 2);
    E.ctx.fill();
    E.ctx.globalAlpha = 1;
  }
});

board.addEventListener('pointermove', (e) => {
  if (!E.state.drawing) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  if (E.state.tool === 'pen' || E.state.tool === 'eraser') {
    E.applyStyle(E.ctx);
    E.ctx.beginPath();
    E.ctx.moveTo(E.state.last.x, E.state.last.y);
    for (const ev of events) {
      const p = pos(ev);
      E.ctx.lineTo(p.x, p.y);
      E.state.last = p;
    }
    E.ctx.stroke();
    E.ctx.globalAlpha = 1;
  } else {
    const p = pos(e);
    E.clearOverlay();
    E.drawShape(E.octx, E.state.start, p);
    E.state.last = p;
  }
});

function finish(e) {
  if (!E.state.drawing) return;
  E.state.drawing = false;
  const p = e ? pos(e) : E.state.last;
  if (E.state.tool !== 'pen' && E.state.tool !== 'eraser') {
    E.clearOverlay();
    E.drawShape(E.ctx, E.state.start, p);
  }
  E.commit();
}
board.addEventListener('pointerup', finish);
board.addEventListener('pointercancel', () => { E.state.drawing = false; E.clearOverlay(); });

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */
undoBtn.addEventListener('click', () => E.undo());
redoBtn.addEventListener('click', () => E.redo());
clearBtn.addEventListener('click', () => { E.clearPage(); say('Page cleared'); });

newPageBtn.addEventListener('click', async () => { await E.addPage(); say('New page'); });
prevBtn.addEventListener('click', () => E.goTo(E.index - 1));
nextBtn.addEventListener('click', () => E.goTo(E.index + 1));

function download(dataUrl, name) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

exportBtn.addEventListener('click', () => {
  board.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    download(url, `okso-page-${String(E.index + 1).padStart(2, '0')}-${stamp()}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    say('Page exported');
  }, 'image/png');
});

ovExportAll.addEventListener('click', () => {
  E.syncCurrentSnapshot();
  E.pages.forEach((p, i) => {
    if (!p.snapshot) return;
    setTimeout(() => download(p.snapshot, `okso-page-${String(i + 1).padStart(2, '0')}.png`), i * 220);
  });
  say(`Exporting ${E.pages.length} page${E.pages.length > 1 ? 's' : ''}`);
});

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */
function openOverview() {
  E.syncCurrentSnapshot();
  renderOverview();
  overview.classList.remove('hidden');
}
function closeOverview() { overview.classList.add('hidden'); }

$('openOverview').addEventListener('click', openOverview);
$('openOverview2').addEventListener('click', openOverview);
ovClose.addEventListener('click', closeOverview);
ovNew.addEventListener('click', async () => { await E.addPage(); renderOverview(); closeOverview(); say('New page'); });

function renderOverview() {
  ovGrid.innerHTML = '';
  ovCount.textContent = `${E.pages.length} page${E.pages.length > 1 ? 's' : ''}`;

  E.pages.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'ov-card';

    const thumb = document.createElement('div');
    thumb.className = 'ov-thumb' + (i === E.index ? ' is-current' : '');
    if (p.snapshot) {
      const img = document.createElement('img');
      img.src = p.snapshot;
      img.alt = `Page ${i + 1}`;
      thumb.appendChild(img);
    }
    thumb.addEventListener('click', async () => { await E.goTo(i); closeOverview(); });

    const meta = document.createElement('div');
    meta.className = 'ov-meta';
    const label = document.createElement('span');
    label.textContent = String(i + 1).padStart(2, '0');
    const del = document.createElement('button');
    del.className = 'ov-del';
    del.title = 'Delete page';
    del.innerHTML = '<i data-lucide="trash-2"></i>';
    del.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      await E.removePage(i);
      renderOverview();
    });
    meta.append(label, del);
    card.append(thumb, meta);
    ovGrid.appendChild(card);
  });

  createIcons({ icons });
}

/* ------------------------------------------------------------------ *
 * Keyboard
 * ------------------------------------------------------------------ */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') E.state.shift = true;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  const meta = e.ctrlKey || e.metaKey;
  if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? E.redo() : E.undo(); return; }
  if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); E.redo(); return; }
  if (meta) return;

  const k = e.key.toLowerCase();
  const map = { p: 'pen', b: 'pen', l: 'line', r: 'rect', c: 'circle', e: 'eraser' };

  if (e.key === 'Escape') { closeOverview(); closePops(null); return; }
  if (e.key === 'Tab') { e.preventDefault(); overview.classList.contains('hidden') ? openOverview() : closeOverview(); return; }
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'n') { e.preventDefault(); E.addPage().then(() => say('New page')); return; }
  if (k === 's') { e.preventDefault(); exportBtn.click(); return; }
  if (e.key === 'ArrowLeft') { E.goTo(E.index - 1); return; }
  if (e.key === 'ArrowRight') { E.goTo(E.index + 1); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); E.clearPage(); say('Page cleared'); return; }
  if (k === '[') { setSize(E.state.size - (E.state.size > 10 ? 4 : 1)); return; }
  if (k === ']') { setSize(E.state.size + (E.state.size >= 10 ? 4 : 1)); return; }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') E.state.shift = false; });

/* ------------------------------------------------------------------ *
 * Sync UI with engine
 * ------------------------------------------------------------------ */
function syncUI() {
  undoBtn.disabled = !E.canUndo();
  redoBtn.disabled = !E.canRedo();
  pageNum.textContent = String(E.index + 1).padStart(2, '0');
  pageTotal.textContent = String(E.pages.length).padStart(2, '0');
  prevBtn.disabled = E.index === 0;
  nextBtn.disabled = E.index === E.pages.length - 1;
  if (!overview.classList.contains('hidden')) renderOverview();
}
E.onChange(syncUI);

/* ------------------------------------------------------------------ *
 * Resize
 * ------------------------------------------------------------------ */
let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => { E.resizeCanvas(true); E.syncCurrentSnapshot(); }, 160);
});

/* ------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------ */
function init() {
  createIcons({ icons });
  E.resizeCanvas(false);
  setTool('pen');
  setSize(4);
  setColor('#111111');
  E.commit();
  syncUI();
}
requestAnimationFrame(init);
