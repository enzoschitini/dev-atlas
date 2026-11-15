/*
 * Dev Atlas — simulações de integração entre sistemas.
 * Motor e simulações vêm do "Laboratório de integração"; este arquivo só monta a interface.
 * Uso: <div data-sim="request-response" data-title="Request-response"></div> + este script no fim do <body>.
 */
(function () {
'use strict';

/* ===== Motor de simulação: relógio próprio (pausável, com velocidade), nós, pacotes animados, log ===== */
const NS = 'http://www.w3.org/2000/svg';
const PAL = ['#ff4f2b', '#1f6feb', '#14a06b', '#9b5de5', '#e09f00', '#0fb5c9'];
const GRAY = '#7d889b', RED = '#d6334a', GREEN = '#14a06b';
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const ICONS = {
  client: '<rect x="-13" y="-11" width="26" height="18" rx="3"/><path d="M-6 13H6"/>',
  server: '<rect x="-12" y="-14" width="24" height="8" rx="3"/><rect x="-12" y="-4" width="24" height="8" rx="3"/><rect x="-12" y="6" width="24" height="8" rx="3"/>',
  db: '<ellipse cx="0" cy="-9" rx="11" ry="4"/><path d="M-11 -9V9C-11 13 11 13 11 9V-9M-11 0C-11 4 11 4 11 0"/>',
  gear: '<circle r="5"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return `<path d="M${(9 * Math.cos(a)).toFixed(1)} ${(9 * Math.sin(a)).toFixed(1)}L${(13 * Math.cos(a)).toFixed(1)} ${(13 * Math.sin(a)).toFixed(1)}"/>`; }).join(''),
  bell: '<path d="M-8 6V-2C-8 -9 8 -9 8 -2V6L10 8H-10Z"/><path d="M-3 12H3"/>',
  clock: '<circle r="12"/><path d="M0 -6V0L5 3"/>',
  topic: '<circle r="3.5"/>' + [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3 + 0.5; return `<path d="M${(7 * Math.cos(a)).toFixed(1)} ${(7 * Math.sin(a)).toFixed(1)}L${(13 * Math.cos(a)).toFixed(1)} ${(13 * Math.sin(a)).toFixed(1)}"/>`; }).join(''),
  chip: '<rect x="-8" y="-8" width="16" height="16" rx="2"/><path d="M-4 -12V-8M4 -12V-8M-4 8V12M4 8V12M-12 -4H-8M-12 4H-8M8 -4H12M8 4H12"/>',
  bolt: '<path d="M3 -13L-7 2H0L-3 13L7 -2H0Z"/>',
  doc: '<rect x="-9" y="-12" width="18" height="24" rx="3"/><path d="M-4 -5H4M-4 0H4M-4 5H1"/>',
  phone: '<rect x="-8" y="-13" width="16" height="26" rx="3"/><path d="M-2 9H2"/>',
  door: '<rect x="-8" y="-12" width="16" height="24" rx="2"/><circle cx="4" cy="1" r="1"/>',
  plane: '<path d="M-12 2L12 -8L2 12L0 4Z"/>',
  cart: '<path d="M-12 -10H-8L-5 5H8L11 -5H-7"/><circle cx="-3" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/>',
  card: '<rect x="-12" y="-8" width="24" height="16" rx="3"/><path d="M-12 -3H12M-8 4H-3"/>',
  box: '<path d="M-11 -5L0 -11L11 -5V6L0 12L-11 6Z"/><path d="M-11 -5L0 1L11 -5M0 1V12"/>',
  lock: '<rect x="-9" y="-3" width="18" height="14" rx="3"/><path d="M-5 -3V-7C-5 -13 5 -13 5 -7V-3"/>',
  file: '<path d="M-8 -12H3L9 -6V12H-8Z"/><path d="M3 -12V-6H9"/>',
};

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

class Sim {
  constructor(cfg, ui) {
    this.cfg = cfg; this.ui = ui; this.v = {};
    (cfg.controls || []).forEach(c => { if (c.type !== 'btn') this.v[c.id] = c.value; });
    this.reset();
  }

  reset() {
    this.t = 0; this.timers = []; this.packets = []; this.anch = {}; this.nodes = {}; this.n = 0;
    const svg = this.ui.svg;
    [...svg.children].forEach(c => { if (c.tagName !== 'defs') c.remove(); });
    this.gL = el('g', null, svg); this.gN = el('g', null, svg); this.gT = el('g', null, svg); this.gP = el('g', null, svg);
    this.ui.log.innerHTML = ''; this.ui.now.textContent = 'Aperte um botão abaixo para começar.'; this.ui.now.dataset.k = 'info';
    this.cfg.build(this);
    if (this.ui.syncControls) this.ui.syncControls(this);
  }

  col(i) { return PAL[Math.abs(i) % PAL.length]; }

  /* ---- tempo ---- */
  after(ms, fn) {
    const h = { at: this.t + Math.max(1, ms), fn, dead: false, cancel() { this.dead = true; } };
    this.timers.push(h); return h;
  }
  every(ms, fn) {
    const h = { at: this.t + Math.max(1, ms), every: Math.max(1, ms), fn, dead: false, cancel() { this.dead = true; } };
    this.timers.push(h); return h;
  }
  step(dt) {
    this.t += dt;
    for (let guard = 0; guard < 5000; guard++) {
      let best = null;
      for (const x of this.timers) if (!x.dead && x.at <= this.t && (!best || x.at < best.at)) best = x;
      if (!best) break;
      if (best.every) best.at += best.every; else best.dead = true;
      best.fn();
    }
    if (this.timers.length > 400 || this.timers.some(x => x.dead)) this.timers = this.timers.filter(x => !x.dead);
    for (const p of this.packets.slice()) {
      const f = (this.t - p.t0) / p.dur;
      if (p.lossAt != null && f >= p.lossAt) {
        this.packets.splice(this.packets.indexOf(p), 1);
        this.place(p, p.lossAt); p.g.classList.add('lost');
        this.after(700, () => p.g.remove());
        if (p.onLost) p.onLost(p);
      } else if (f >= 1) {
        this.packets.splice(this.packets.indexOf(p), 1); p.g.remove();
        if (p.onArrive) p.onArrive(p);
      } else this.place(p, f);
    }
    if (this.cfg.tick) this.cfg.tick(this, dt);
  }
  place(p, f) { p.g.setAttribute('transform', `translate(${(p.ax + (p.bx - p.ax) * f).toFixed(1)},${(p.ay + (p.by - p.ay) * f).toFixed(1)})`); }

  /* ---- desenho ---- */
  node(id, o) {
    const r = o.r || 28, s = this;
    const g = el('g', { class: 'nd', 'data-s': 'ok', transform: `translate(${o.x},${o.y})` }, this.gN);
    el('rect', { class: 'ring', x: -r - 5, y: -r - 5, width: 2 * r + 10, height: 2 * r + 10, rx: r < 24 ? 14 : 19 }, g);
    el('rect', { class: 'nbox', x: -r, y: -r, width: 2 * r, height: 2 * r, rx: r < 24 ? 11 : 15 }, g);
    if (o.icon) { const ic = el('g', { class: 'nic' }, g); ic.innerHTML = ICONS[o.icon]; if (r !== 28) ic.setAttribute('transform', `scale(${(r / 28).toFixed(2)})`); }
    el('path', { class: 'xmark', d: 'M-9 -9L9 9M9 -9L-9 9' }, g);
    let lab = null, sub = null, tg = null;
    if (o.label) { lab = el('text', { class: 'nl', y: r + 17, 'text-anchor': 'middle' }, g); lab.textContent = o.label; }
    if (o.sub) { sub = el('text', { class: 'ns', y: r + 30, 'text-anchor': 'middle' }, g); sub.textContent = o.sub; }
    const bd = el('g', { class: 'bd', transform: `translate(${r - 2},${-r + 2})`, style: 'display:none' }, g);
    const bdr = el('rect', { height: 18, rx: 9 }, bd); const bdt = el('text', { y: 13, 'text-anchor': 'middle' }, bd);
    const n = {
      id, g, w: 0, down: false, off: false,
      setState(st) { g.setAttribute('data-s', st); },
      work(d) { this.w = Math.max(0, this.w + d); if (!this.down) g.setAttribute('data-s', this.w > 0 ? 'busy' : 'ok'); },
      setDown(b) { this.down = b; g.setAttribute('data-s', b ? 'down' : (this.w > 0 ? 'busy' : 'ok')); },
      setOff(b) { this.off = b; g.classList.toggle('off', b); },
      badge(t, tone) {
        if (t == null || t === '') { bd.style.display = 'none'; return; }
        t = String(t); const w = Math.max(20, t.length * 7 + 10);
        bd.style.display = ''; bdr.setAttribute('width', w); bdr.setAttribute('x', -w / 2); bdt.textContent = t; bdt.setAttribute('x', 0);
        bd.setAttribute('data-t', tone || 'n');
      },
      label(t) { if (lab) lab.textContent = t; },
      subtext(t) { if (sub) sub.textContent = t; },
      tag(t, tone) {
        if (!tg) { tg = el('text', { class: 'ntag', y: r + (o.sub ? 44 : 31), 'text-anchor': 'middle' }, g); }
        tg.textContent = t || ''; tg.setAttribute('data-t', tone || 'n');
      },
    };
    if (o.onClick) { g.style.cursor = 'pointer'; g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', o.aria || o.label || id); g.addEventListener('click', () => o.onClick(n)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(n); } }); }
    this.anch[id] = { x: o.x, y: o.y, r: r + 5 }; this.nodes[id] = n; return n;
  }

  /* círculo pequeno numerado (anel de nós) */
  dot(id, o) {
    const r = o.r || 17;
    const g = el('g', { class: 'dt', 'data-s': 'off', transform: `translate(${o.x},${o.y})` }, this.gN);
    el('circle', { r, class: 'dc' }, g);
    const t = el('text', { y: 4, 'text-anchor': 'middle', class: 'dtx' }, g); t.textContent = o.label || '';
    const n = { id, g, down: false, setState(st) { g.setAttribute('data-s', st); } };
    if (o.onClick) { g.style.cursor = 'pointer'; g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'nó ' + (o.label || id)); g.addEventListener('click', () => o.onClick(n)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick(n); } }); }
    this.anch[id] = { x: o.x, y: o.y, r: r + 2 }; this.nodes[id] = n; return n;
  }

  link(a, b, o = {}) {
    const A = this.anch[a], B = this.anch[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const x1 = A.x + ux * A.r, y1 = A.y + uy * A.r, x2 = B.x - ux * B.r, y2 = B.y - uy * B.r;
    const ln = el('line', { x1, y1, x2, y2, class: 'lk' + (o.dash ? ' dash' : '') }, this.gL);
    let t = null;
    if (o.label) { t = el('text', { x: (x1 + x2) / 2 + (o.lx || 0), y: (y1 + y2) / 2 - 8 + (o.ly || 0), class: 'll', 'text-anchor': 'middle' }, this.gL); t.textContent = o.label; }
    return { ln, set(cls, on) { ln.classList.toggle(cls, !!on); }, label(v) { if (t) t.textContent = v; } };
  }

  box(id, o) {
    const g = el('g', null, this.gL);
    el('rect', { x: o.x - o.w / 2, y: o.y - o.h / 2, width: o.w, height: o.h, rx: o.rx || 14, class: 'bx' + (o.dash ? ' dash' : '') + (o.cls ? ' ' + o.cls : '') }, g);
    let t = null;
    if (o.label) { t = el('text', { x: o.x, y: o.top ? o.y - o.h / 2 + 15 : o.y + 4, class: 'bl', 'text-anchor': 'middle' }, g); t.textContent = o.label; }
    if (id) this.anch[id] = { x: o.x, y: o.y, r: o.w / 2 + 2 };
    return { g, set(v) { if (t) t.textContent = v; } };
  }

  slots(id, o) {
    const n = o.n, w = o.w || 34, h = o.h || 30, gap = 4, tot = n * (w + gap) - gap, x0 = o.x - tot / 2;
    const g = el('g', null, this.gN), cells = [];
    for (let i = 0; i < n; i++) {
      const c = el('g', { transform: `translate(${x0 + i * (w + gap)},${o.y - h / 2})` }, g);
      const r = el('rect', { width: w, height: h, rx: 7, class: 'cell' + (o.cls ? ' ' + o.cls : '') }, c);
      const t = el('text', { x: w / 2, y: h / 2 + 4, 'text-anchor': 'middle', class: 'ct' }, c);
      cells.push({ r, t });
    }
    if (o.label) { const l = el('text', { x: o.x, y: o.y + h / 2 + 17, class: 'nl', 'text-anchor': 'middle' }, g); l.textContent = o.label; }
    this.anch[id] = { x: o.x, y: o.y, r: tot / 2 + 4 };
    return {
      cells,
      set(items) {
        const over = items.length > n;
        cells.forEach((c, i) => {
          const it = items[i];
          if (!it) { c.r.style.fill = ''; c.r.style.opacity = ''; c.t.textContent = ''; return; }
          c.r.style.fill = it.c || 'var(--ink)'; c.r.style.opacity = it.dim ? .3 : 1; c.t.textContent = it.t == null ? '' : it.t;
          c.t.style.fill = it.tc || '#fff';
          if (over && i === n - 1) { c.r.style.fill = 'var(--muted)'; c.t.textContent = '+' + (items.length - n + 1); }
        });
      },
    };
  }

  txt(x, y, s, o = {}) {
    const t = el('text', { x, y, class: 'tx ' + (o.cls || ''), 'text-anchor': o.anchor || 'middle' }, this.gT);
    if (o.size) t.style.fontSize = o.size + 'px';
    t.textContent = s;
    return { el: t, set(v) { t.textContent = v; }, tone(k) { t.setAttribute('data-t', k || 'n'); } };
  }

  send(a, b, o = {}) {
    const A = typeof a === 'string' ? this.anch[a] : a, B = typeof b === 'string' ? this.anch[b] : b;
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const ax = A.x + ux * (A.r || 0), ay = A.y + uy * (A.r || 0), bx = B.x - ux * (B.r || 0), by = B.y - uy * (B.r || 0);
    const len = Math.max(0, Math.hypot(bx - ax, by - ay)), dur = o.dur || Math.max(380, len / (o.speed || 0.3));
    const g = el('g', { class: 'pk' }, this.gP), label = o.label == null ? '' : String(o.label);
    const w = label ? Math.max(18, label.length * 6.6 + 12) : 12;
    el('rect', { x: -w / 2, y: -8, width: w, height: 16, rx: 8, fill: o.color || PAL[0] }, g);
    if (label) { const t = el('text', { y: 4, 'text-anchor': 'middle' }, g); t.textContent = label; }
    g.setAttribute('transform', `translate(${ax},${ay})`);
    const p = { g, ax, ay, bx, by, t0: this.t, dur, lossAt: o.lossAt == null ? null : o.lossAt, onArrive: o.onArrive, onLost: o.onLost };
    this.packets.push(p); return p;
  }

  log(msg, kind = 'info') {
    const d = document.createElement('div'); d.className = 'ln k-' + kind;
    const tm = document.createElement('time'); tm.textContent = (this.t / 1000).toFixed(1) + 's';
    const sp = document.createElement('span'); sp.textContent = msg;
    d.append(tm, sp); this.ui.log.prepend(d);
    while (this.ui.log.children.length > 80) this.ui.log.lastChild.remove();
    this.ui.now.textContent = msg; this.ui.now.dataset.k = kind;
  }
}


const SIMS = {};
const fmtMs = v => v + ' ms';
const fmtS = v => v.toFixed(1).replace('.', ',') + ' s';

/* =============== 1. REQUEST-RESPONSE =============== */
SIMS['request-response'] = {
  experimente: [
    'Envie uma requisição com a latência baixa: a resposta volta e o cliente segue.',
    'Suba a latência acima do timeout (por exemplo 3000 ms contra 2000 ms) e envie: a resposta chega tarde e ninguém mais espera.',
    'Marque “serviço fora do ar” e envie: o cliente fica bloqueado até o timeout.',
    'Clique em “Enviar 3 de uma vez” e veja que cada requisição espera a sua própria resposta.',
  ],
  controls: [
    { id: 'lat', type: 'range', label: 'Tempo de resposta do serviço', min: 100, max: 5000, step: 100, value: 800, fmt: fmtMs },
    { id: 'tmo', type: 'range', label: 'Timeout do cliente', min: 500, max: 5000, step: 100, value: 2000, fmt: fmtMs },
    { id: 'down', type: 'toggle', label: 'Serviço fora do ar', value: false, change: (s, v) => s.nodes.s.setDown(v) },
    { id: 'go', type: 'btn', label: 'Enviar requisição', primary: true, run: s => rr(s) },
    { id: 'go3', type: 'btn', label: 'Enviar 3 de uma vez', run: s => { rr(s); s.after(250, () => rr(s)); s.after(500, () => rr(s)); } },
  ],
  build(s) {
    s.node('c', { x: 110, y: 190, label: 'cliente', icon: 'client' });
    s.node('s', { x: 690, y: 190, label: 'serviço', icon: 'server' });
    s.nodes.s.setDown(!!s.v.down);
    s.link('c', 's', { dash: true });
    s.st = { ok: 0, tmo: 0, late: 0 };
    s.m = s.txt(400, 340, '');
    rrMetrics(s);
  },
};
function rrMetrics(s) { s.m.set(`respostas úteis: ${s.st.ok}   ·   timeouts: ${s.st.tmo}   ·   respostas tardias descartadas: ${s.st.late}`); }
function rr(s) {
  const id = ++s.n, col = s.col(id), st = { done: false, late: false };
  s.log(`Cliente envia GET /pedidos/${id} e fica esperando.`);
  s.nodes.c.work(1);
  const tm = s.after(s.v.tmo, () => {
    if (st.done) return;
    st.late = true; s.nodes.c.work(-1); s.st.tmo++; rrMetrics(s);
    s.log(`Timeout: o cliente desistiu da #${id} depois de ${s.v.tmo} ms.`, 'bad');
  });
  s.send('c', 's', {
    label: '#' + id, color: col, onArrive: () => {
      if (s.nodes.s.down) { s.log(`Serviço fora do ar: a #${id} não será respondida.`, 'bad'); return; }
      s.nodes.s.work(1); s.log(`Serviço processa a #${id} (${s.v.lat} ms).`);
      s.after(s.v.lat, () => {
        s.nodes.s.work(-1);
        if (s.nodes.s.down) return;
        s.send('s', 'c', {
          label: '200', color: col, onArrive: () => {
            if (st.late) { s.st.late++; rrMetrics(s); s.log(`Resposta da #${id} chegou tarde: ninguém mais esperava por ela.`, 'warn'); return; }
            st.done = true; tm.cancel(); s.nodes.c.work(-1); s.st.ok++; rrMetrics(s);
            s.log(`Cliente recebeu a resposta da #${id} e segue o fluxo.`, 'ok');
          },
        });
      });
    },
  });
}

/* =============== 2. gRPC =============== */
SIMS['grpc'] = {
  experimente: [
    'Chame o método com JSON e depois com Protobuf: o mesmo dado ocupa bem menos bytes e chega mais rápido.',
    'Reduza a banda da rede: a diferença entre os formatos fica ainda maior.',
    'Clique em “Streaming”: uma única conexão leva várias respostas.',
    'Clique em “Enviar campo errado” nos dois formatos: no gRPC o erro aparece antes de enviar, no JSON só depois, no servidor.',
  ],
  controls: [
    { id: 'fmt', type: 'seg', label: 'Formato', options: [['json', 'JSON · HTTP/1.1'], ['pb', 'Protobuf · HTTP/2']], value: 'pb' },
    { id: 'bw', type: 'range', label: 'Banda da rede', min: 5, max: 100, step: 5, value: 20, fmt: v => v + ' KB/s' },
    { id: 'go', type: 'btn', label: 'Chamar Buscar(id = 42)', primary: true, run: s => grpcCall(s) },
    { id: 'st', type: 'btn', label: 'Streaming (5 respostas)', run: s => grpcStream(s) },
    { id: 'bad', type: 'btn', label: 'Enviar campo errado', run: s => grpcBad(s) },
  ],
  build(s) {
    s.box('proto', { x: 400, y: 62, w: 200, h: 40, label: 'pedidos.proto (contrato)', cls: 'soft' }); s.anch.proto.r = 24;
    s.node('c', { x: 110, y: 240, label: 'cliente', sub: 'stub gerado', icon: 'client' });
    s.node('s', { x: 690, y: 240, label: 'servidor', sub: 'implementação', icon: 'server' });
    s.link('c', 's', { dash: true });
    s.link('proto', 'c', { dash: true, label: 'gera código', lx: -40 });
    s.link('proto', 's', { dash: true, label: 'gera código', lx: 40 });
    s.m = s.txt(400, 350, 'Última chamada: —');
  },
};
function grpcCost(s) {
  const bytes = s.v.fmt === 'pb' ? 580 : 2140, ms = Math.round(bytes / s.v.bw) + 30;
  return { bytes, ms };
}
function grpcCall(s) {
  const { bytes, ms } = grpcCost(s), id = ++s.n, col = s.col(id);
  s.log(`Cliente chama Buscar(id=42) em ${s.v.fmt === 'pb' ? 'Protobuf sobre HTTP/2' : 'JSON sobre HTTP/1.1'}.`);
  s.nodes.c.work(1);
  s.send('c', 's', { label: '42', color: col, dur: 500, onArrive: () => {
    s.nodes.s.work(1);
    s.after(200, () => {
      s.nodes.s.work(-1);
      s.log(`Servidor responde com ${bytes} bytes (${ms} ms de transferência a ${s.v.bw} KB/s).`);
      s.send('s', 'c', { label: bytes + ' B', color: col, dur: 500 + ms * 3, onArrive: () => {
        s.nodes.c.work(-1); s.m.set(`Última chamada: ${bytes} bytes · ${ms} ms de transferência`);
        s.log('Cliente recebeu a resposta já como objeto tipado.', 'ok');
      } });
    });
  } });
}
function grpcStream(s) {
  s.log('Cliente abre uma chamada de streaming: uma conexão, várias respostas.');
  s.send('c', 's', { label: 'stream', color: GRAY, dur: 500, onArrive: () => {
    for (let i = 1; i <= 5; i++) s.after(i * 450, () => {
      s.send('s', 'c', { label: 'evt ' + i, color: s.col(i), dur: 600, onArrive: () => { s.log(`Cliente recebe o item ${i} de 5 pela mesma conexão.`, i === 5 ? 'ok' : 'info'); } });
    });
  } });
}
function grpcBad(s) {
  if (s.v.fmt === 'pb') {
    s.log('Erro na compilação do cliente: o contrato não tem o campo “idd”. Nada foi enviado.', 'ok');
    s.nodes.c.tag('erro antes de enviar', 'ok'); s.after(2500, () => s.nodes.c.tag(''));
  } else {
    s.log('Cliente envia { "idd": 42 } sem nenhum aviso prévio…');
    s.send('c', 's', { label: 'idd', color: RED, onArrive: () => {
      s.log('Servidor rejeita em tempo de execução: 400 campo inválido. O erro só apareceu aqui.', 'bad');
      s.send('s', 'c', { label: '400', color: RED });
    } });
  }
}

/* =============== 3. GRAPHQL =============== */
SIMS['graphql'] = {
  experimente: [
    'Com GraphQL, marque só “nome” e busque: apenas um serviço é chamado e vêm menos bytes.',
    'Marque os três campos e busque: um pedido do app, três chamadas internas em paralelo.',
    'Troque para REST e repita: o app faz uma chamada por serviço, uma depois da outra, e recebe campos que nem usa.',
  ],
  controls: [
    { id: 'mode', type: 'seg', label: 'Estilo da API', options: [['gql', 'GraphQL'], ['rest', 'REST']], value: 'gql', restart: true },
    { id: 'f1', type: 'toggle', label: 'Pedir nome do usuário', value: true, change: (s) => gqlQuery(s) },
    { id: 'f2', type: 'toggle', label: 'Pedir pedidos', value: true, change: (s) => gqlQuery(s) },
    { id: 'f3', type: 'toggle', label: 'Pedir produtos', value: false, change: (s) => gqlQuery(s) },
    { id: 'go', type: 'btn', label: 'Carregar a tela', primary: true, run: s => gqlGo(s) },
  ],
  build(s) {
    const gql = s.v.mode === 'gql';
    s.node('app', { x: 90, y: 190, label: 'app', icon: 'phone' });
    s.node('api', { x: 340, y: 190, label: gql ? 'servidor GraphQL' : 'gateway (não usado)', icon: 'server' });
    s.nodes.api.setOff(!gql);
    [['u', 'Usuários', 60], ['p', 'Pedidos', 190], ['pr', 'Produtos', 320]].forEach(([id, l, y]) => s.node(id, { x: 700, y, label: l, icon: 'db', r: 24 }));
    if (gql) { s.link('app', 'api'); ['u', 'p', 'pr'].forEach(i => s.link('api', i, { dash: true })); }
    else ['u', 'p', 'pr'].forEach(i => s.link('app', i, { dash: true }));
    s.q = s.txt(200, 330, '', { anchor: 'middle', cls: 'mono', size: 11 });
    s.m = s.txt(400, 372, 'Chamadas do app: —   ·   bytes recebidos: —   ·   tempo: —');
    gqlQuery(s);
  },
};
function gqlWanted(s) { const w = []; if (s.v.f1) w.push('u'); if (s.v.f2) w.push('p'); if (s.v.f3) w.push('pr'); return w.length ? w : ['u']; }
function gqlQuery(s) {
  if (s.v.mode === 'gql') { const f = []; if (s.v.f1) f.push('nome'); if (s.v.f2) f.push('pedidos { total }'); if (s.v.f3) f.push('produtos { titulo }'); s.q.set('{ usuario { ' + (f.join(' ') || 'nome') + ' } }'); }
  else s.q.set('GET /usuarios/1 · GET /pedidos?u=1 · GET /produtos');
}
function gqlGo(s) {
  const want = gqlWanted(s), t0 = s.t, id = ++s.n, col = s.col(id);
  if (s.v.mode === 'gql') {
    s.log(`App envia uma única query pedindo ${want.length} fonte(s).`);
    s.send('app', 'api', { label: 'query', color: col, onArrive: () => {
      s.log(`Servidor GraphQL chama ${want.length} serviço(s) em paralelo.`);
      let back = 0;
      want.forEach(w => s.send('api', w, { label: 'get', color: col, onArrive: () => {
        s.after(300, () => s.send(w, 'api', { label: 'dados', color: col, onArrive: () => {
          if (++back === want.length) s.send('api', 'app', { label: 'JSON', color: col, onArrive: () => {
            const bytes = want.length * 140; s.m.set(`Chamadas do app: 1   ·   bytes recebidos: ${bytes}   ·   tempo: ${fmtS((s.t - t0) / 1000)}`);
            s.log('App recebeu só os campos pedidos, numa única resposta.', 'ok');
          } });
        } }));
      } }));
    } });
  } else {
    s.log(`App faz ${want.length} chamada(s) REST, uma depois da outra.`);
    let i = 0, bytes = 0;
    const next = () => {
      if (i >= want.length) { s.m.set(`Chamadas do app: ${want.length}   ·   bytes recebidos: ${bytes}   ·   tempo: ${fmtS((s.t - t0) / 1000)}`); s.log('App juntou os pedaços sozinho e recebeu campos que não usa.', 'warn'); return; }
      const w = want[i++];
      s.send('app', w, { label: 'GET', color: col, onArrive: () => s.after(300, () => s.send(w, 'app', { label: 'JSON', color: col, onArrive: () => { bytes += 600; next(); } })) });
    };
    next();
  }
}

/* =============== 4. FILA =============== */
SIMS['fila'] = {
  experimente: [
    'Com 1 consumidor e produção acima da capacidade, a fila cresce. Aumente os consumidores e veja ela esvaziar.',
    'Clique em “Rajada de 10”: a fila absorve o pico e o sistema processa no seu ritmo.',
    'Ligue “consumidor falha” e observe as tentativas e a dead-letter queue.',
    'Coloque a produção em 0 e deixe a fila esvaziar.',
  ],
  controls: [
    { id: 'rate', type: 'range', label: 'Mensagens por segundo', min: 0, max: 5, step: 0.5, value: 1.5, fmt: v => v.toFixed(1).replace('.', ',') + '/s', change: s => qStartProd(s) },
    { id: 'nc', type: 'range', label: 'Consumidores', min: 1, max: 3, step: 1, value: 1, fmt: v => v, change: s => { qConsumers(s); qDispatch(s); } },
    { id: 'proc', type: 'range', label: 'Tempo para processar', min: 0.5, max: 4, step: 0.5, value: 1.5, fmt: fmtS },
    { id: 'fail', type: 'toggle', label: 'Consumidor falha (40% das vezes)', value: false },
    { id: 'burst', type: 'btn', label: 'Rajada de 10', primary: true, run: s => { for (let i = 0; i < 10; i++) s.after(i * 120, () => qProduce(s)); } },
  ],
  build(s) {
    s.q = []; s.dlq = []; s.done = 0; s.mid = 0;
    s.node('p', { x: 80, y: 180, label: 'produtor', icon: 'client' });
    s.qs = s.slots('q', { x: 330, y: 180, n: 7, w: 38, label: 'fila' });
    s.ds = s.slots('dlq', { x: 330, y: 310, n: 4, w: 38, label: 'dead-letter queue (DLQ)', cls: 'bad' });
    s.cons = [0, 1, 2].map(i => ({ id: 'c' + i, busy: false, n: s.node('c' + i, { x: 700, y: 60 + i * 120, label: 'consumidor ' + 'ABC'[i], icon: 'gear' }), done: 0 }));
    s.link('p', 'q'); s.cons.forEach(c => s.link('q', c.id, { dash: true }));
    s.m = s.txt(330, 40, '');
    qConsumers(s); qRefresh(s); qStartProd(s);
  },
};
function qConsumers(s) { s.cons.forEach((c, i) => { c.n.setOff(i >= s.v.nc); c.n.badge(i < s.v.nc ? c.done : null, 'ok'); }); }
function qRefresh(s) {
  s.qs.set(s.q.map(m => ({ t: m.id, c: s.col(m.id) }))); s.ds.set(s.dlq.map(m => ({ t: m.id, c: RED })));
  s.m.set(`na fila: ${s.q.length}   ·   processadas: ${s.done}   ·   na DLQ: ${s.dlq.length}`);
}
function qStartProd(s) { if (s.prod) s.prod.cancel(); s.prod = s.v.rate > 0 ? s.every(1000 / s.v.rate, () => qProduce(s)) : null; }
function qProduce(s) {
  const id = ++s.mid, m = { id, att: 0 };
  s.send('p', 'q', { label: id, color: s.col(id), onArrive: () => { s.q.push(m); qRefresh(s); if (s.q.length === 8) s.log('A fila passou de 7 mensagens: os consumidores não dão conta do ritmo.', 'warn'); qDispatch(s); } });
}
function qDispatch(s) {
  s.cons.forEach((c, i) => {
    if (i >= s.v.nc || c.busy || !s.q.length) return;
    const m = s.q.shift(); c.busy = true; qRefresh(s);
    s.send('q', c.id, { label: m.id, color: s.col(m.id), onArrive: () => {
      c.n.work(1); s.log(`Consumidor ${'ABC'[i]} começa a processar a mensagem ${m.id}.`);
      s.after(s.v.proc * 1000, () => {
        c.n.work(-1);
        if (s.v.fail && Math.random() < 0.4) {
          m.att++; c.busy = false;
          s.send(c.id, 'q', { label: 'falhou', color: RED, onArrive: () => {
            if (m.att >= 3) { s.dlq.push(m); s.log(`Mensagem ${m.id} falhou 3 vezes e foi para a DLQ, para análise.`, 'bad'); }
            else { s.q.push(m); s.log(`Mensagem ${m.id} falhou (tentativa ${m.att}) e volta para a fila.`, 'warn'); }
            qRefresh(s); qDispatch(s);
          } });
        } else {
          c.done++; s.done++; c.busy = false; c.n.badge(c.done, 'ok'); qRefresh(s);
          s.log(`Mensagem ${m.id} processada. O consumidor envia o ack.`, 'ok'); qDispatch(s);
        }
      });
    } });
  });
}

/* =============== 5. PUB/SUB =============== */
SIMS['pubsub'] = {
  experimente: [
    'Publique um evento: os três assinantes recebem uma cópia, e o publicador não sabe quem são.',
    'Coloque “estoque” fora do ar, publique alguns eventos e depois reative: o broker entrega o que ele perdeu.',
    'Marque “analytics” como “não assinou”: ele deixa de receber, sem mexer no publicador.',
  ],
  controls: [
    ['0', 'e-mail'], ['1', 'estoque'], ['2', 'analytics'],
  ].map(([i, n]) => ({ id: 'sub' + i, type: 'seg', label: n, options: [['on', 'ativo'], ['off', 'fora do ar'], ['no', 'não assinou']], value: 'on', change: (s, v) => psChange(s, +i, v) }))
    .concat([
      { id: 'go', type: 'btn', label: 'Publicar pedido.criado', primary: true, run: s => psPublish(s) },
      { id: 'go5', type: 'btn', label: 'Publicar 5', run: s => { for (let i = 0; i < 5; i++) s.after(i * 250, () => psPublish(s)); } },
    ]),
  build(s) {
    s.node('pub', { x: 90, y: 190, label: 'publicador', icon: 'client' });
    s.node('top', { x: 340, y: 190, label: 'tópico', sub: 'pedido.criado', icon: 'topic' });
    s.link('pub', 'top');
    s.subs = [['e-mail', 60, 'bell'], ['estoque', 190, 'box'], ['analytics', 320, 'db']].map(([n, y, ic], i) => {
      const nd = s.node('s' + i, { x: 700, y, label: n, icon: ic });
      s.link('top', 's' + i, { dash: true });
      return { n: nd, got: 0, pend: 0, mode: s.v['sub' + i] };
    });
    s.subs.forEach((x, i) => psBadge(s, i));
  },
};
function psBadge(s, i) {
  const x = s.subs[i]; x.n.setDown(x.mode === 'off'); x.n.setOff(x.mode === 'no');
  x.n.badge(x.mode === 'no' ? null : (x.pend ? `${x.got} · ${x.pend} na espera` : x.got), x.pend ? 'warn' : 'ok');
}
function psChange(s, i, v) {
  const x = s.subs[i], was = x.mode; x.mode = v;
  if (v === 'no') { x.pend = 0; s.log(`${x.n.id === 's0' ? 'E-mail' : x.n.id === 's1' ? 'Estoque' : 'Analytics'} cancelou a assinatura: não recebe mais nada.`, 'info'); }
  if (was === 'off' && v === 'on' && x.pend) {
    s.log(`O assinante voltou: o broker entrega as ${x.pend} mensagens guardadas.`, 'ok');
    const n = x.pend; x.pend = 0;
    for (let k = 0; k < n; k++) s.after(k * 300, () => psDeliver(s, i, 'guardado'));
  }
  psBadge(s, i);
}
function psDeliver(s, i, tag) {
  const x = s.subs[i];
  s.send('top', 's' + i, { label: tag === 'guardado' ? '↩' : 'evt', color: s.col(s.n), onArrive: () => { x.got++; x.n.work(1); s.after(300, () => x.n.work(-1)); psBadge(s, i); } });
}
function psPublish(s) {
  s.n++; s.log('Publicador envia pedido.criado ao tópico e segue em frente.');
  s.send('pub', 'top', { label: 'evt ' + s.n, color: s.col(s.n), onArrive: () => {
    s.subs.forEach((x, i) => {
      if (x.mode === 'no') return;
      if (x.mode === 'off') { x.pend++; psBadge(s, i); s.log(`Assinante ${i + 1} está fora do ar: o broker guarda a mensagem.`, 'warn'); return; }
      psDeliver(s, i);
    });
  } });
}

/* =============== 6. WEBHOOK =============== */
SIMS['webhook'] = {
  experimente: [
    'Aprove um pagamento com tudo ligado: o evento chega, é validado e processado.',
    'Derrube o seu endpoint e aprove: o provedor tenta de novo com intervalos crescentes. Reerga antes da última tentativa.',
    'Escolha “processar antes de responder”: a resposta passa do limite do provedor, ele reenvia e, sem idempotência, você processa duas vezes.',
    'Desligue a validação e deixe o atacante enviar um evento falso.',
  ],
  controls: [
    { id: 'down', type: 'toggle', label: 'Seu endpoint fora do ar', value: false, change: (s, v) => s.nodes.you.setDown(v) },
    { id: 'sig', type: 'seg', label: 'Assinatura do evento', options: [['on', 'validar'], ['off', 'não validar']], value: 'on' },
    { id: 'resp', type: 'seg', label: 'Como responder', options: [['fast', 'responder logo (processa depois)'], ['slow', 'processar antes (4 s)']], value: 'fast' },
    { id: 'dedup', type: 'toggle', label: 'Ignorar eventos repetidos (idempotência)', value: true },
    { id: 'go', type: 'btn', label: 'Aprovar pagamento', primary: true, run: s => whSend(s, false) },
    { id: 'atk', type: 'btn', label: 'Atacante envia evento falso', run: s => whSend(s, true) },
  ],
  build(s) {
    s.node('prov', { x: 110, y: 150, label: 'provedor de pagamento', icon: 'card' });
    s.node('you', { x: 690, y: 150, label: 'seu sistema', sub: 'POST /webhook', icon: 'server' });
    s.node('atk', { x: 400, y: 320, label: 'atacante', icon: 'bolt' });
    s.nodes.you.setDown(!!s.v.down);
    s.link('prov', 'you', { dash: true }); s.link('atk', 'you', { dash: true });
    s.seen = new Set(); s.st = { ok: 0, dup: 0, rej: 0, fake: 0 };
    s.m = s.txt(400, 372, ''); whMetrics(s);
  },
};
function whMetrics(s) { s.m.set(`processados: ${s.st.ok}   ·   duplicados processados: ${s.st.dup}   ·   rejeitados: ${s.st.rej}   ·   falsos aceitos: ${s.st.fake}`); }
function whSend(s, fake) {
  const id = ++s.n, evt = { id, fake, tries: 0, ok: false };
  if (fake) { s.log('Atacante envia um POST forjado “pagamento.aprovado”.', 'warn'); whPost(s, evt, 'atk'); }
  else { s.log(`Pagamento ${id} aprovado no provedor: ele chama a sua URL.`); whPost(s, evt, 'prov'); }
}
function whPost(s, evt, from) {
  evt.tries++; const col = evt.fake ? RED : s.col(evt.id), you = s.nodes.you;
  let answered = false;
  const tmo = s.after(3000, () => {
    if (answered || from !== 'prov') return;
    if (evt.tries >= 5) { s.log(`Sem resposta há ${evt.tries} tentativas: o provedor desiste do evento ${evt.id}.`, 'bad'); return; }
    const wait = 1000 * Math.pow(2, evt.tries - 1);
    s.log(`Provedor não recebeu 200 em 3 s. Nova tentativa do evento ${evt.id} em ${wait / 1000} s.`, 'warn');
    s.after(wait, () => whPost(s, evt, 'prov'));
  });
  const reply = (code, c) => { if (from === 'prov' && !answered) { s.send('you', 'prov', { label: code, color: c || GREEN, onArrive: () => { if (code === '200' && !answered) { answered = true; tmo.cancel(); evt.ok = true; s.log(`Provedor recebeu 200 e marca o evento ${evt.id} como entregue.`, 'ok'); } } }); } else if (from === 'atk') s.send('you', 'atk', { label: code, color: c || GREEN }); };
  s.send(from, 'you', { label: evt.fake ? 'falso' : 'evt ' + evt.id, color: col, onArrive: () => {
    if (you.down) { s.log(`Seu endpoint está fora do ar: a tentativa ${evt.tries} falhou.`, 'bad'); return; }
    if (evt.fake && s.v.sig === 'on') { s.st.rej++; whMetrics(s); s.log('Assinatura inválida: evento falso rejeitado com 401.', 'ok'); reply('401', RED); return; }
    if (evt.fake) { s.st.fake++; whMetrics(s); s.log('Sem validação de assinatura, o evento falso foi aceito: pedido liberado sem pagamento!', 'bad'); reply('200'); return; }
    if (s.v.sig === 'on' || true) {
      if (s.seen.has(evt.id) && s.v.dedup) { s.log(`Evento ${evt.id} repetido: já tratado, ignorado sem efeito colateral.`, 'ok'); reply('200'); return; }
      const dupl = s.seen.has(evt.id); s.seen.add(evt.id);
      you.work(1);
      const run = () => { you.work(-1); if (dupl) { s.st.dup++; s.log(`Evento ${evt.id} processado de novo: entrega ou cobrança duplicada!`, 'bad'); } else { s.st.ok++; s.log(`Evento ${evt.id} processado no seu sistema.`, 'ok'); } whMetrics(s); };
      if (s.v.resp === 'fast') { reply('200'); s.after(1000, run); } else { s.after(4000, () => { run(); reply('200'); }); }
    }
  } });
}

/* =============== 7. REQUEST-REPLY ASSÍNCRONO =============== */
SIMS['reqreply'] = {
  experimente: [
    'Envie um pedido: ele vai por uma fila, o worker processa e a resposta volta por outra, com o mesmo identificador.',
    'Envie vários pedidos de uma vez: as respostas voltam e o cliente liga cada uma ao seu pedido.',
    'Derrube o worker: o pedido espera na fila. Reerga e ele é processado.',
    'Deixe o timeout menor que o tempo do worker: o cliente desiste, e a resposta chega tarde.',
  ],
  controls: [
    { id: 'proc', type: 'range', label: 'Tempo do worker', min: 1, max: 8, step: 0.5, value: 3, fmt: fmtS },
    { id: 'tmo', type: 'range', label: 'Timeout do cliente', min: 2, max: 14, step: 1, value: 9, fmt: v => v + ' s' },
    { id: 'down', type: 'toggle', label: 'Worker fora do ar', value: false, change: (s, v) => { s.nodes.w.setDown(v); if (!v) rpWork(s); } },
    { id: 'go', type: 'btn', label: 'Enviar pedido', primary: true, run: s => rpSend(s) },
    { id: 'go3', type: 'btn', label: 'Enviar 3 pedidos', run: s => { for (let i = 0; i < 3; i++) s.after(i * 300, () => rpSend(s)); } },
  ],
  build(s) {
    s.node('c', { x: 90, y: 190, label: 'cliente', icon: 'client' });
    s.rq = s.slots('rq', { x: 330, y: 90, n: 5, w: 40, label: 'fila de requisições' });
    s.rs = s.slots('rs', { x: 330, y: 290, n: 5, w: 40, label: 'fila de respostas' });
    s.node('w', { x: 700, y: 190, label: 'worker', icon: 'gear' });
    s.nodes.w.setDown(!!s.v.down);
    s.link('c', 'rq'); s.link('rq', 'w', { dash: true }); s.link('w', 'rs', { dash: true }); s.link('rs', 'c', { dash: true });
    s.reqs = []; s.resp = []; s.items = [];
    s.pl = s.txt(20, 28, '', { anchor: 'start', cls: 'mono', size: 11 }); rpList(s);
  },
};
function rpList(s) {
  s.pl.set(s.items.length ? s.items.slice(-4).map(i => `${i.cid}: ${i.st}`).join('   ·   ') : 'pedidos do cliente: nenhum ainda');
  s.rq.set(s.reqs.map(r => ({ t: r.cid.slice(-1), c: s.col(r.n) }))); s.rs.set(s.resp.map(r => ({ t: r.cid.slice(-1), c: s.col(r.n) })));
}
function rpSend(s) {
  const n = ++s.n, cid = 'c' + n, it = { cid, st: 'pendente…', n }; s.items.push(it);
  s.log(`Cliente envia o pedido ${cid} com reply-to e correlation_id=${cid}.`);
  s.send('c', 'rq', { label: cid, color: s.col(n), onArrive: () => { s.reqs.push(it); rpList(s); rpWork(s); } });
  s.after(s.v.tmo * 1000, () => { if (it.st === 'pendente…') { it.st = 'expirou'; s.log(`Cliente desistiu de ${cid} (timeout).`, 'bad'); rpList(s); } });
  rpList(s);
}
function rpWork(s) {
  const w = s.nodes.w; if (w.down || w.w > 0 || !s.reqs.length) return;
  const it = s.reqs.shift(); rpList(s);
  s.send('rq', 'w', { label: it.cid, color: s.col(it.n), onArrive: () => {
    w.work(1); s.log(`Worker processa ${it.cid} (${s.v.proc} s).`);
    s.after(s.v.proc * 1000, () => {
      w.work(-1);
      s.send('w', 'rs', { label: it.cid, color: s.col(it.n), onArrive: () => {
        s.resp.push(it); rpList(s);
        s.after(300, () => { s.resp.splice(s.resp.indexOf(it), 1); rpList(s);
          s.send('rs', 'c', { label: it.cid, color: s.col(it.n), onArrive: () => {
            if (it.st === 'expirou') { it.st = 'expirou (resposta tardia)'; s.log(`Resposta de ${it.cid} chegou depois do timeout e foi descartada.`, 'warn'); }
            else { it.st = 'respondido ✓'; s.log(`Cliente liga a resposta ao pedido ${it.cid} pelo correlation_id.`, 'ok'); }
            rpList(s);
          } }); });
      } });
      rpWork(s);
    });
  } });
}

'use strict';
/* =============== 8. POLLING / LONG POLLING =============== */
SIMS['polling'] = {
  experimente: [
    'No polling, gere uma novidade logo depois de uma consulta: ela só chega na próxima, e a latência mostra isso.',
    'Aumente o intervalo: menos requisições vazias, mas mais demora para ver a novidade.',
    'Troque para long polling: o servidor segura a conexão e responde assim que há novidade, sem requisições vazias.',
  ],
  controls: [
    { id: 'mode', type: 'seg', label: 'Técnica', options: [['poll', 'Polling'], ['long', 'Long polling']], value: 'poll', restart: true },
    { id: 'int', type: 'range', label: 'Intervalo do polling', min: 1, max: 8, step: 1, value: 4, fmt: v => v + ' s' },
    { id: 'auto', type: 'toggle', label: 'Novidade automática a cada ~10 s', value: true },
    { id: 'ev', type: 'btn', label: 'Gerar novidade no servidor', primary: true, run: s => plEvent(s) },
  ],
  build(s) {
    s.node('c', { x: 110, y: 190, label: 'cliente', icon: 'client' });
    s.node('s', { x: 690, y: 190, label: 'servidor', icon: 'server' });
    s.link('c', 's', { dash: true });
    s.ev = null; s.held = null; s.st = { req: 0, empty: 0, last: null };
    s.m = s.txt(400, 340, ''); plMetrics(s);
    s.after(300, () => plRequest(s));
    s.every(10000, () => { if (s.v.auto) plEvent(s); });
  },
};
function plMetrics(s) { s.m.set(`requisições: ${s.st.req}   ·   respostas vazias: ${s.st.empty}   ·   atraso da última novidade: ${s.st.last == null ? '—' : fmtS(s.st.last)}`); }
function plEvent(s) {
  if (s.ev) { s.log('Já existe uma novidade esperando para ser entregue.', 'warn'); return; }
  s.ev = { t: s.t, id: ++s.n }; s.nodes.s.badge('novidade!', 'warn'); s.log(`O servidor tem uma novidade (#${s.ev.id}).`, 'warn');
  if (s.held) { const h = s.held; s.held = null; h.release(); }
}
function plRequest(s) {
  const gen = s.gen = (s.gen || 0) + 1; s.st.req++; plMetrics(s);
  const long = s.v.mode === 'long';
  s.send('c', 's', { label: 'tem novidade?', color: GRAY, onArrive: () => {
    const reply = (empty) => {
      const ev = s.ev; if (!empty) s.ev = null; s.nodes.s.badge(s.ev ? 'novidade!' : null, 'warn'); s.nodes.s.work(-1);
      s.send('s', 'c', { label: empty ? 'vazio' : 'novidade', color: empty ? GRAY : s.col(ev.id), onArrive: () => {
        if (empty) { s.st.empty++; s.log(long ? 'Tempo esgotado sem novidade: o cliente reabre a conexão.' : 'Resposta vazia: nada de novo.', 'info'); }
        else { s.st.last = (s.t - ev.t) / 1000; s.log(`Cliente recebeu a novidade #${ev.id} com ${fmtS(s.st.last)} de atraso.`, 'ok'); }
        plMetrics(s);
        s.after(long ? 200 : s.v.int * 1000, () => plRequest(s));
      } });
    };
    if (s.ev) { s.nodes.s.work(1); reply(false); return; }
    if (!long) { s.nodes.s.work(1); reply(true); return; }
    s.nodes.s.work(1); s.log('Long polling: o servidor segura a requisição aberta até haver novidade.');
    const t = s.after(12000, () => { if (s.held) { s.held = null; reply(true); } });
    s.held = { release() { t.cancel(); reply(false); } };
  } });
}

/* =============== 9. WEBSOCKET =============== */
SIMS['websocket'] = {
  experimente: [
    'Clique em “Enviar mensagem” antes de conectar: sem conexão, nada acontece.',
    'Conecte e use os dois sentidos: o servidor também envia sem ninguém pedir.',
    'Derrube a rede com o heartbeat desligado: o cliente continua achando que está conectado, e as mensagens somem.',
    'Repita com o heartbeat ligado: ele percebe a queda e reconecta sozinho.',
  ],
  controls: [
    { id: 'hb', type: 'toggle', label: 'Heartbeat (ping/pong)', value: true },
    { id: 'conn', type: 'btn', label: 'Conectar', primary: true, run: s => wsConnect(s) },
    { id: 'send', type: 'btn', label: 'Enviar mensagem', run: s => wsMsg(s, 'c') },
    { id: 'push', type: 'btn', label: 'Servidor envia (push)', run: s => wsMsg(s, 's') },
    { id: 'net', type: 'btn', label: 'Derrubar a rede por 9 s', run: s => wsNet(s) },
  ],
  build(s) {
    s.node('c', { x: 110, y: 190, label: 'navegador', icon: 'client' });
    s.node('s', { x: 690, y: 190, label: 'servidor', icon: 'server' });
    s.lk = s.link('c', 's', { dash: true });
    s.ws = { cli: 'fechada', srv: false, net: true, msgs: 0, pings: 0 };
    s.m = s.txt(400, 330, ''); s.tg = s.txt(400, 355, '', { cls: 'sub' }); wsMetrics(s);
    s.every(4000, () => wsPing(s));
  },
};
function wsMetrics(s) {
  const w = s.ws; s.m.set(`estado do cliente: ${w.cli}   ·   mensagens: ${w.msgs}   ·   ~${w.msgs * 500} bytes de cabeçalho HTTP economizados`);
  s.lk.set('open', w.cli === 'aberta' && w.net); s.lk.set('cut', !w.net);
}
function wsLoss(s) { return s.ws.net ? null : 0.5; }
function wsConnect(s) {
  const w = s.ws; if (w.cli === 'aberta') { s.log('A conexão já está aberta.', 'warn'); return; }
  if (!w.net) { s.log('Sem rede: a conexão ainda não é possível.', 'bad'); return; }
  w.cli = 'conectando…'; wsMetrics(s); s.log('Cliente envia um HTTP GET com “Upgrade: websocket”.');
  s.send('c', 's', { label: 'Upgrade', color: GRAY, onArrive: () => s.send('s', 'c', { label: '101', color: GREEN, onArrive: () => { w.cli = 'aberta'; w.srv = true; wsMetrics(s); s.log('Conexão WebSocket aberta: agora os dois lados falam quando quiserem.', 'ok'); } }) });
}
function wsMsg(s, from) {
  const w = s.ws;
  if (w.cli !== 'aberta') { s.log('Não há conexão aberta: clique em “Conectar” primeiro.', 'warn'); return; }
  const n = ++s.n, to = from === 'c' ? 's' : 'c';
  s.log(from === 'c' ? `Cliente envia a mensagem ${n}.` : `Servidor envia a mensagem ${n} sem ninguém pedir.`);
  s.send(from, to, { label: 'msg ' + n, color: s.col(n), lossAt: wsLoss(s), onLost: () => s.log(`A mensagem ${n} se perdeu: a rede caiu e o cliente nem percebeu.`, 'bad'), onArrive: () => {
    if (!w.srv) { s.log(`A mensagem ${n} chegou a um servidor que já fechou a conexão: perdida.`, 'bad'); return; }
    w.msgs++; wsMetrics(s); s.log(`Mensagem ${n} entregue.`, 'ok');
  } });
}
function wsNet(s) {
  const w = s.ws; if (!w.net) return; w.net = false; wsMetrics(s); s.log('A rede caiu por 9 segundos.', 'bad');
  s.after(3500, () => { if (w.cli === 'aberta') { w.srv = false; } });
  s.after(9000, () => { w.net = true; wsMetrics(s); s.log('A rede voltou.', 'info'); if (w.cli === 'fechada' && s.v.hb) wsRetry(s); });
}
function wsRetry(s) { s.log('Cliente tenta reconectar automaticamente.'); wsConnect(s); }
function wsPing(s) {
  const w = s.ws; if (!s.v.hb || w.cli !== 'aberta') return;
  const n = ++w.pings; let ok = false;
  s.send('c', 's', { label: 'ping', color: GRAY, dur: 500, lossAt: wsLoss(s), onArrive: () => { if (!w.srv) return; s.send('s', 'c', { label: 'pong', color: GRAY, dur: 500, lossAt: wsLoss(s), onArrive: () => { ok = true; } }); } });
  s.after(2500, () => {
    if (ok || w.cli !== 'aberta') return;
    w.cli = 'fechada'; wsMetrics(s); s.log('Sem pong: o heartbeat detectou a queda e o cliente fecha a conexão.', 'warn');
    s.every(2000, function () { }).cancel();
    const tryAgain = s.every(2000, () => { if (w.cli === 'aberta') { tryAgain.cancel(); return; } if (w.net) { tryAgain.cancel(); wsRetry(s); } });
  });
}

/* =============== 10. SSE =============== */
SIMS['sse'] = {
  experimente: [
    'Abra a conexão e deixe os eventos fluírem: uma só requisição, muitos eventos.',
    'Derrube a rede por alguns segundos: o navegador reconecta sozinho e o servidor reenvia o que ficou para trás (Last-Event-ID).',
    'Clique em “Tentar enviar do cliente”: o SSE só anda do servidor para o cliente, então o envio é um POST à parte.',
  ],
  controls: [
    { id: 'auto', type: 'toggle', label: 'Servidor emite um evento a cada 1,5 s', value: true },
    { id: 'open', type: 'btn', label: 'Abrir conexão (EventSource)', primary: true, run: s => sseOpen(s) },
    { id: 'now', type: 'btn', label: 'Evento agora', run: s => sseEmit(s) },
    { id: 'net', type: 'btn', label: 'Derrubar a rede por 5 s', run: s => sseNet(s) },
    { id: 'up', type: 'btn', label: 'Tentar enviar do cliente', run: s => sseUp(s) },
  ],
  build(s) {
    s.node('c', { x: 110, y: 190, label: 'navegador', icon: 'client' });
    s.node('s', { x: 690, y: 190, label: 'servidor', icon: 'server' });
    s.lk = s.link('c', 's', { dash: true });
    s.sv = { open: false, net: true, hist: [], lastId: 0, got: 0, retry: null };
    s.m = s.txt(400, 330, ''); sseMetrics(s);
    s.every(1500, () => { if (s.v.auto && s.sv.open) sseEmit(s); });
  },
};
function sseMetrics(s) { const v = s.sv; s.m.set(`conexão: ${v.open ? (v.net ? 'aberta' : 'caída') : 'fechada'}   ·   último id recebido: ${v.lastId}   ·   eventos recebidos: ${v.got}`); s.lk.set('open', v.open && v.net); s.lk.set('cut', !v.net); }
function sseOpen(s, resume) {
  const v = s.sv; if (v.open && !resume) { s.log('A conexão já está aberta.', 'warn'); return; }
  s.log(resume ? `Navegador reconecta enviando Last-Event-ID: ${v.lastId}.` : 'Navegador abre uma requisição GET que o servidor nunca encerra.');
  s.send('c', 's', { label: resume ? 'id ' + v.lastId : 'GET', color: GRAY, onArrive: () => {
    v.open = true; v.retry = null; sseMetrics(s);
    const miss = v.hist.filter(e => e.id > v.lastId);
    if (miss.length) s.log(`Servidor reenvia ${miss.length} evento(s) perdido(s).`, 'ok');
    miss.forEach((e, i) => s.after(i * 350, () => sseDeliver(s, e)));
  } });
}
function sseDeliver(s, e) {
  const v = s.sv;
  s.send('s', 'c', { label: 'evt ' + e.id, color: s.col(e.id), lossAt: v.net ? null : 0.5, onArrive: () => { if (e.id > v.lastId) { v.lastId = e.id; v.got++; } sseMetrics(s); } });
}
function sseEmit(s) {
  const v = s.sv; const e = { id: v.hist.length + 1 }; v.hist.push(e);
  if (!v.open) { s.log(`Evento ${e.id} guardado: ninguém conectado para recebê-lo.`, 'warn'); return; }
  sseDeliver(s, e); s.log(`Servidor empurra o evento ${e.id}.`);
}
function sseNet(s) {
  const v = s.sv; if (!v.open || !v.net) { s.log('Abra a conexão antes de derrubar a rede.', 'warn'); return; }
  v.net = false; sseMetrics(s); s.log('A rede caiu: eventos emitidos agora não chegam.', 'bad');
  s.after(2000, () => { v.open = false; sseMetrics(s); s.log('O navegador percebeu o erro e vai tentar de novo em 3 s.', 'warn'); });
  s.after(5000, () => { v.net = true; sseMetrics(s); s.log('A rede voltou.'); });
  s.after(5200, () => { if (!v.open) sseOpen(s, true); });
}
function sseUp(s) {
  s.log('O SSE só leva dados do servidor para o cliente. Para enviar, o navegador faz um POST normal, em outra requisição.', 'info');
  s.send('c', 's', { label: 'POST', color: GRAY });
}

/* =============== 11. STREAMING (LOG PARTICIONADO) =============== */
SIMS['streaming'] = {
  experimente: [
    'Com 1 consumidor e produção alta, o lag cresce. Adicione consumidores: cada um assume partições.',
    'Ligue “mesma chave em tudo”: uma partição fica sobrecarregada e mais consumidores não ajudam.',
    'Clique em “Rebobinar offsets”: o grupo lê o histórico de novo, sem que os eventos tenham sumido.',
  ],
  controls: [
    { id: 'rate', type: 'range', label: 'Produção', min: 0.5, max: 8, step: 0.5, value: 3, fmt: v => v.toFixed(1).replace('.', ',') + ' ev/s', change: s => skStart(s) },
    { id: 'nc', type: 'range', label: 'Consumidores no grupo', min: 1, max: 3, step: 1, value: 1, fmt: v => v, change: s => skAssign(s) },
    { id: 'cr', type: 'range', label: 'Velocidade de cada consumidor', min: 0.5, max: 4, step: 0.5, value: 1.5, fmt: v => v.toFixed(1).replace('.', ',') + ' ev/s', change: s => skStart(s) },
    { id: 'hot', type: 'toggle', label: 'Mesma chave em todos os eventos', value: false },
    { id: 'rw', type: 'btn', label: 'Rebobinar offsets para 0', primary: true, run: s => { s.parts.forEach(p => p.off = 0); skDraw(s); s.log('O grupo voltou ao offset 0 e vai reprocessar o histórico: os eventos continuam lá.', 'ok'); } },
  ],
  build(s) {
    s.parts = [0, 1, 2].map(i => ({ ev: [], off: 0, y: 80 + i * 110 }));
    s.node('p', { x: 70, y: 190, label: 'produtores', icon: 'client', r: 26 });
    s.sl = s.parts.map((p, i) => s.slots('p' + i, { x: 330, y: p.y, n: 12, w: 28, h: 28 }));
    s.parts.forEach((p, i) => { s.txt(130, p.y - 20, 'partição ' + i, { anchor: 'start', cls: 'sub' }); p.lag = s.txt(530, p.y - 20, '', { anchor: 'end', cls: 'sub' }); });
    s.cons = [0, 1, 2].map(i => s.node('k' + i, { x: 730, y: 80 + i * 110, label: 'consumidor ' + (i + 1), icon: 'gear', r: 24 }));
    s.cons.forEach((c, i) => c.id = 'k' + i);
    s.assign = [0, 1, 2];
    skAssign(s, true); skStart(s); skDraw(s);
  },
};
function skAssign(s, quiet) {
  s.assign = [0, 1, 2].map(i => i % s.v.nc);
  s.cons.forEach((c, i) => { c.setOff(i >= s.v.nc); const mine = s.assign.map((a, p) => a === i ? 'P' + p : null).filter(Boolean); c.tag(i < s.v.nc ? mine.join(' ') : '', 'n'); });
  if (!quiet) s.log(`Rebalanceamento: ${s.v.nc} consumidor(es) dividem as 3 partições.`, 'info');
}
function skStart(s) {
  if (s.tp) s.tp.cancel(); if (s.tc) s.tc.cancel();
  s.tp = s.every(1000 / s.v.rate, () => skProduce(s));
  s.tc = s.every(1000 / s.v.cr, () => skConsume(s));
}
function skProduce(s) {
  const key = s.v.hot ? 0 : Math.floor(Math.random() * 4), pi = key % 3, p = s.parts[pi], n = ++s.n;
  s.send('p', 'p' + pi, { color: s.col(key), dur: 700, onArrive: () => { p.ev.push({ key, off: p.ev.length }); skDraw(s); } });
}
function skConsume(s) {
  s.cons.forEach((c, i) => {
    if (i >= s.v.nc) return;
    const mine = s.parts.map((p, pi) => ({ p, pi })).filter(x => s.assign[x.pi] === i && x.p.off < x.p.ev.length);
    if (!mine.length) return;
    const x = mine.sort((a, b) => (b.p.ev.length - b.p.off) - (a.p.ev.length - a.p.off))[0];
    const e = x.p.ev[x.p.off++]; skDraw(s);
    s.send({ x: 330 + 170, y: x.p.y, r: 0 }, 'k' + i, { label: 'ABCD'[e.key], color: s.col(e.key), dur: 600, onArrive: () => { c.work(1); s.after(250, () => c.work(-1)); } });
  });
}
function skDraw(s) {
  s.parts.forEach((p, i) => {
    const start = Math.max(0, p.ev.length - 12), items = [];
    for (let k = start; k < p.ev.length; k++) { const e = p.ev[k]; items.push({ t: 'ABCD'[e.key], c: s.col(e.key), dim: k < p.off }); }
    s.sl[i].set(items);
    const lag = p.ev.length - p.off; p.lag.set(`offset ${p.off} · lag ${lag}`); p.lag.tone(lag > 8 ? 'bad' : 'n');
  });
}

/* =============== 12. MQTT =============== */
SIMS['mqtt'] = {
  experimente: [
    'Com QoS 0 e perda de 40%, publique várias vezes: algumas leituras somem para sempre.',
    'Com QoS 1, nada se perde, mas aparecem duplicatas quando o ack se perde.',
    'Com QoS 2 há mais mensagens na rede, e cada leitura chega uma única vez.',
    'Deixe o painel offline, publique a temperatura, ligue “retained” e reerga o painel: ele recebe o último valor guardado.',
  ],
  controls: [
    { id: 'qos', type: 'seg', label: 'Qualidade de serviço', options: [['0', 'QoS 0'], ['1', 'QoS 1'], ['2', 'QoS 2']], value: '1' },
    { id: 'loss', type: 'range', label: 'Perda de pacotes na rede', min: 0, max: 80, step: 5, value: 30, fmt: v => v + '%' },
    { id: 'ret', type: 'toggle', label: 'Retained message (broker guarda o último valor)', value: false },
    { id: 'off', type: 'toggle', label: 'Painel offline', value: false, change: (s, v) => mqOffline(s, v) },
    { id: 't', type: 'btn', label: 'Termômetro publica 24 °C', primary: true, run: s => mqPublish(s, 't') },
    { id: 'd', type: 'btn', label: 'Sensor de porta publica “aberta”', run: s => mqPublish(s, 'd') },
  ],
  build(s) {
    s.node('t', { x: 90, y: 80, label: 'termômetro', sub: 'casa/sala/temp', icon: 'chip' });
    s.node('d', { x: 90, y: 300, label: 'sensor de porta', sub: 'casa/porta/estado', icon: 'door' });
    s.node('b', { x: 400, y: 190, label: 'broker MQTT', icon: 'topic' });
    s.node('ph', { x: 710, y: 80, label: 'app no celular', sub: 'assina casa/#', icon: 'phone' });
    s.node('pn', { x: 710, y: 300, label: 'painel da sala', sub: 'assina casa/sala/+', icon: 'client' });
    ['t', 'd'].forEach(i => s.link(i, 'b', { dash: true })); ['ph', 'pn'].forEach(i => s.link('b', i, { dash: true }));
    s.st = { pub: 0, got: 0, dup: 0, lost: 0 }; s.last = null; s.nodes.pn.setDown(!!s.v.off);
    s.m = s.txt(400, 372, ''); mqMetrics(s);
  },
};
function mqMetrics(s) { const x = s.st; s.m.set(`publicadas: ${x.pub}   ·   entregas ao app: ${x.got}   ·   duplicatas: ${x.dup}   ·   perdidas: ${x.lost}`); }
function mqLink(s, a, b, label, col, onGot, tag, countStats) {
  const qos = +s.v.qos, lossP = () => (Math.random() < s.v.loss / 100 ? rnd(0.3, 0.7) : null);
  let got = false;
  const arrive = () => { if (got) { if (countStats) { s.st.dup++; mqMetrics(s); } s.log(`${tag}: duplicata recebida (o ack se perdeu e a mensagem foi reenviada).`, 'warn'); } else { got = true; onGot(); } };
  const fail = () => { if (qos === 0) { if (countStats) s.st.lost++; mqMetrics(s); s.log(`${tag}: mensagem perdida (QoS 0 não reenvia).`, 'bad'); } };
  if (qos === 0) { s.send(a, b, { label, color: col, lossAt: lossP(), onLost: fail, onArrive: arrive }); return; }
  if (qos === 1) {
    const attempt = () => s.send(a, b, { label, color: col, lossAt: lossP(), onLost: () => { s.log(`${tag}: sem ack, reenviando.`, 'warn'); s.after(900, attempt); }, onArrive: () => { arrive(); s.send(b, a, { label: 'ack', color: GRAY, lossAt: lossP(), onLost: () => s.after(900, attempt) }); } });
    attempt(); return;
  }
  const stages = [[a, b, label], [b, a, 'REC'], [a, b, 'REL'], [b, a, 'COMP']];
  const run = i => s.send(stages[i][0], stages[i][1], { label: stages[i][2], color: i ? GRAY : col, lossAt: lossP(), onLost: () => s.after(700, () => run(i)), onArrive: () => { if (i === 0) arrive(); if (i < 3) run(i + 1); } });
  run(0);
}
function mqPublish(s, src) {
  const temp = src === 't', label = temp ? '24°' : 'aberta', col = temp ? PAL[0] : PAL[1];
  s.st.pub++; mqMetrics(s); s.log(`${temp ? 'Termômetro' : 'Sensor de porta'} publica em ${temp ? 'casa/sala/temp' : 'casa/porta/estado'} (QoS ${s.v.qos}).`);
  mqLink(s, src, 'b', label, col, () => {
    if (temp) s.last = label;
    const subs = temp ? ['ph', 'pn'] : ['ph'];
    subs.forEach(sub => {
      if (sub === 'pn' && s.nodes.pn.down) { s.log('Painel offline: o broker não consegue entregar a ele.', 'warn'); return; }
      mqLink(s, 'b', sub, label, col, () => { if (sub === 'ph') { s.st.got++; mqMetrics(s); } s.log(`${sub === 'ph' ? 'Celular' : 'Painel'} recebeu ${label}.`, 'ok'); }, 'Broker → ' + (sub === 'ph' ? 'celular' : 'painel'), sub === 'ph');
    });
  }, 'Publicação', false);
}
function mqOffline(s, v) {
  s.nodes.pn.setDown(v);
  if (!v && s.v.ret && s.last) { s.log('Painel voltou: o broker entrega o último valor guardado (retained).', 'ok'); s.send('b', 'pn', { label: s.last, color: PAL[0] }); }
  else if (!v) s.log('Painel voltou, mas sem retained message ele não recebe o que perdeu.', 'info');
}

/* =============== 13. BATCH =============== */
SIMS['batch'] = {
  experimente: [
    'Com disparo por tempo, observe os registros se acumulando e o job processando tudo de uma vez.',
    'Reduza o intervalo: a latência cai, mas os jobs ficam mais frequentes e mais caros.',
    'Troque para disparo por tamanho: o lote só roda quando junta registros suficientes.',
    'Ligue “job falha no meio” com e sem checkpoint: veja quanto trabalho é refeito.',
  ],
  controls: [
    { id: 'trig', type: 'seg', label: 'Disparo', options: [['time', 'por tempo'], ['size', 'por tamanho']], value: 'time' },
    { id: 'int', type: 'range', label: 'A cada', min: 5, max: 40, step: 5, value: 20, fmt: v => v + ' s' },
    { id: 'size', type: 'range', label: 'Ou ao juntar', min: 5, max: 60, step: 5, value: 30, fmt: v => v + ' registros' },
    { id: 'rate', type: 'range', label: 'Chegada de dados', min: 1, max: 8, step: 1, value: 3, fmt: v => v + '/s' },
    { id: 'fail', type: 'toggle', label: 'Job falha no meio', value: false },
    { id: 'ck', type: 'toggle', label: 'Usar checkpoint', value: true },
    { id: 'run', type: 'btn', label: 'Rodar job agora', primary: true, run: s => btRun(s) },
  ],
  build(s) {
    s.node('src', { x: 90, y: 190, label: 'sistema de origem', icon: 'db' });
    s.box('lot', { x: 400, y: 190, w: 250, h: 120, dash: true, label: 'lote acumulado', top: true }); s.anch.lot.r = 128;
    s.node('job', { x: 710, y: 190, label: 'job', icon: 'clock' });
    s.link('src', 'lot'); s.link('lot', 'job', { dash: true });
    s.recs = []; s.dots = []; s.stat = { total: 0, lat: null, runs: 0 }; s.running = false; s.last = 0;
    s.m = s.txt(400, 350, ''); s.cd = s.txt(710, 275, '', { cls: 'sub' }); btDraw(s);
    s.every(1000 / s.v.rate, () => btArrive(s));
    s.every(250, () => btCheck(s));
  },
  change(s, id) { if (id === 'rate') { s.reset(); } },
};
function btArrive(s) {
  s.send('src', { x: 330 + rnd(0, 140), y: 160 + rnd(0, 60), r: 0 }, { color: s.col(s.n), dur: 600, onArrive: () => { s.recs.push({ t: s.t }); btDraw(s); } });
  s.n++;
}
function btDraw(s) {
  [...s.gL.querySelectorAll('.bdot')].forEach(d => d.remove());
  s.recs.slice(-40).forEach((r, i) => { const c = el('circle', { class: 'bdot', cx: 300 + (i % 20) * 10, cy: 185 + Math.floor(i / 20) * 14, r: 4 }, s.gL); });
  const age = s.recs.length ? (s.t - s.recs[0].t) / 1000 : 0;
  s.m.set(`no lote: ${s.recs.length}   ·   dado mais velho: ${fmtS(age)}   ·   processados: ${s.stat.total}   ·   atraso médio do último lote: ${s.stat.lat == null ? '—' : fmtS(s.stat.lat)}`);
  if (s.v.trig === 'time') s.cd.set(s.running ? 'rodando…' : `próximo job em ${Math.max(0, Math.ceil(s.v.int - (s.t - s.last) / 1000))} s`); else s.cd.set(s.running ? 'rodando…' : `dispara com ${s.v.size} registros`);
}
function btCheck(s) {
  btDraw(s); if (s.running) return;
  if (s.v.trig === 'time' && (s.t - s.last) / 1000 >= s.v.int) btRun(s);
  if (s.v.trig === 'size' && s.recs.length >= s.v.size) btRun(s);
}
function btRun(s) {
  s.last = s.t; if (s.running) { s.log('O job anterior ainda está rodando.', 'warn'); return; }
  if (!s.recs.length) { s.log('Não há registros para processar.', 'warn'); return; }
  const batch = s.recs.splice(0), n = batch.length, dur = 1500 + n * 60; s.running = true; btDraw(s);
  s.log(`Job dispara e leva ${n} registros de uma vez.`);
  s.send('lot', 'job', { label: n, color: s.col(s.n), onArrive: () => {
    s.nodes.job.work(1);
    const failAt = s.v.fail ? dur * 0.6 : null;
    const finish = (extra) => s.after(extra, () => {
      s.nodes.job.work(-1); s.running = false; s.stat.total += n; s.stat.runs++;
      s.stat.lat = batch.reduce((a, r) => a + (s.t - r.t), 0) / n / 1000;
      s.log(`Job terminou ${n} registros. Cada um esperou em média ${fmtS(s.stat.lat)}.`, 'ok'); btDraw(s);
    });
    if (failAt) s.after(failAt, () => {
      s.log('O job falhou com 60% do trabalho feito!', 'bad');
      if (s.v.ck) { s.log('Com checkpoint, só os 40% restantes são refeitos.', 'ok'); finish(dur * 0.4); }
      else { s.log('Sem checkpoint, o lote inteiro é refeito do zero.', 'warn'); finish(dur); }
    }); else finish(dur);
  } });
}

/* =============== 14. CDC =============== */
SIMS['cdc'] = {
  experimente: [
    'No modo CDC, grave um pedido: o conector lê o log do banco e os três consumidores se atualizam.',
    'Derrube o conector, grave vários pedidos e reerga: o log guardou tudo e o conector recupera o atraso.',
    'Troque para “app publica direto”, ligue “app cai entre gravar e publicar” e grave: o banco muda, mas o evento se perde.',
  ],
  controls: [
    { id: 'mode', type: 'seg', label: 'Como os eventos nascem', options: [['cdc', 'CDC (lê o log do banco)'], ['dual', 'App publica direto']], value: 'cdc', restart: true },
    { id: 'down', type: 'toggle', label: 'Conector fora do ar', value: false, change: (s, v) => { s.nodes.cn.setDown(v); } },
    { id: 'crash', type: 'toggle', label: 'App cai entre gravar e publicar', value: false },
    { id: 'ins', type: 'btn', label: 'Gravar pedido (INSERT)', primary: true, run: s => cdWrite(s, 'INSERT') },
    { id: 'upd', type: 'btn', label: 'Alterar pedido (UPDATE)', run: s => cdWrite(s, 'UPDATE') },
  ],
  build(s) {
    const cdc = s.v.mode === 'cdc';
    s.node('app', { x: 70, y: 150, label: 'app', icon: 'client' });
    s.node('db', { x: 230, y: 150, label: 'banco', icon: 'db' });
    s.wal = s.slots('wal', { x: 230, y: 290, n: 4, w: 36, label: 'log de transações (WAL)' });
    s.node('cn', { x: 420, y: 150, label: 'conector CDC', icon: 'gear' }); s.nodes.cn.setOff(!cdc); s.nodes.cn.setDown(!!s.v.down && cdc);
    s.node('tp', { x: 560, y: 150, label: 'tópico', icon: 'topic' });
    s.cons = [['busca', 50], ['cache', 150], ['warehouse', 250]].map(([n, y], i) => s.node('k' + i, { x: 720, y, label: n, icon: 'db', r: 22 }));
    s.link('app', 'db'); s.link('db', 'cn', { dash: true }); s.link('cn', 'tp'); ['k0', 'k1', 'k2'].forEach(k => s.link('tp', k, { dash: true }));
    s.dbv = 0; s.vers = [0, 0, 0]; s.walq = []; s.readq = 0;
    s.m = s.txt(400, 372, ''); cdDraw(s);
    if (cdc) s.every(700, () => cdRead(s));
  },
};
function cdDraw(s) {
  s.wal.set(s.walq.map(e => ({ t: e.v, c: s.col(e.v) })));
  s.nodes.db.badge('v' + s.dbv, 'n');
  s.cons.forEach((c, i) => c.badge('v' + s.vers[i], s.vers[i] === s.dbv ? 'ok' : 'warn'));
  const behind = s.vers.some(v => v !== s.dbv);
  s.m.set(behind ? 'Consumidores estão atrás do banco (v' + s.dbv + ').' : 'Todos os consumidores estão em dia com o banco.'); s.m.tone(behind ? 'warn' : 'ok');
}
function cdFan(s, from, v) { s.send(from, 'tp', { label: 'v' + v, color: s.col(v), onArrive: () => s.cons.forEach((c, i) => s.send('tp', 'k' + i, { label: 'v' + v, color: s.col(v), onArrive: () => { s.vers[i] = Math.max(s.vers[i], v); cdDraw(s); } })) }); }
function cdWrite(s, kind) {
  const v = ++s.dbv; s.log(`App executa ${kind} no banco (versão ${v}).`);
  s.send('app', 'db', { label: kind, color: s.col(v), onArrive: () => {
    s.nodes.db.badge('v' + s.dbv, 'n');
    if (s.v.mode === 'cdc') { s.walq.push({ v }); cdDraw(s); s.log('O banco registra a mudança no log de transações.'); return; }
    cdDraw(s);
    if (s.v.crash) { s.log(`O app caiu antes de publicar a v${v}: o banco mudou, mas o evento nunca existiu. Os consumidores ficam desatualizados.`, 'bad'); return; }
    s.log('App também publica o evento no tópico (segunda escrita).'); cdFan(s, 'app', v);
  } });
}
function cdRead(s) {
  if (s.nodes.cn.down || !s.walq.length) return;
  const e = s.walq.shift(); cdDraw(s); s.log(`Conector lê a mudança v${e.v} do log e publica um evento.`, 'ok'); cdFan(s, 'cn', e.v);
}

'use strict';
/* =============== 15. SAGA =============== */
const SG = [
  { id: 'pe', n: 'pedido', ic: 'doc', ok: 'pedido criado', undo: 'pedido cancelado' },
  { id: 'pa', n: 'pagamento', ic: 'card', ok: 'cobrança feita', undo: 'cobrança estornada' },
  { id: 'es', n: 'estoque', ic: 'box', ok: 'itens reservados', undo: 'itens liberados' },
  { id: 'en', n: 'entrega', ic: 'plane', ok: 'entrega agendada', undo: 'entrega cancelada' },
];
SIMS['saga'] = {
  experimente: [
    'Inicie a compra com tudo certo: os quatro passos terminam.',
    'Faça o estoque falhar: pagamento e pedido são desfeitos, em ordem inversa.',
    'Compare orquestração (um coordenador manda) e coreografia (cada serviço reage ao evento anterior).',
  ],
  controls: [
    { id: 'fail', type: 'seg', label: 'Qual passo falha', options: [['', 'nenhum'], ['pa', 'pagamento'], ['es', 'estoque'], ['en', 'entrega']], value: '', restart: true },
    { id: 'mode', type: 'seg', label: 'Coordenação', options: [['orch', 'Orquestração'], ['chor', 'Coreografia']], value: 'orch', restart: true },
    { id: 'go', type: 'btn', label: 'Iniciar compra', primary: true, run: s => sgStart(s) },
  ],
  build(s) {
    s.xs = [110, 290, 470, 650];
    SG.forEach((p, i) => { s.node(p.id, { x: s.xs[i], y: 230, label: p.n, icon: p.ic }); s.nodes[p.id].tag('aguardando', 'n'); });
    for (let i = 0; i < 3; i++) s.link(SG[i].id, SG[i + 1].id, { dash: true });
    if (s.v.mode === 'orch') { s.node('or', { x: 380, y: 70, label: 'orquestrador', icon: 'gear' }); SG.forEach(p => s.link('or', p.id, { dash: true })); }
    s.m = s.txt(400, 372, 'Resultado: —'); s.running = false;
  },
};
function sgStart(s) {
  if (s.running) return; s.running = true; SG.forEach(p => { s.nodes[p.id].tag('aguardando', 'n'); s.nodes[p.id].setState('ok'); }); s.m.set('Resultado: em andamento…'); s.m.tone('n');
  s.log(s.v.mode === 'orch' ? 'O orquestrador comanda os passos, um por um.' : 'O primeiro serviço emite um evento e cada um reage ao anterior.');
  sgStep(s, 0, []);
}
function sgStep(s, i, done) {
  if (i >= SG.length) { s.running = false; s.m.set('Resultado: compra concluída, tudo certo.'); s.m.tone('ok'); s.log('Todos os passos terminaram: a compra está concluída.', 'ok'); return; }
  const p = SG[i], prev = i ? SG[i - 1].id : (s.v.mode === 'orch' ? 'or' : null), from = s.v.mode === 'orch' ? 'or' : prev;
  const go = () => {
    const n = s.nodes[p.id]; n.work(1); n.tag('executando…', 'n');
    s.after(1000, () => {
      n.work(-1);
      if (s.v.fail === p.id) {
        n.tag('falhou ✕', 'bad'); n.setState('down'); s.log(`O passo “${p.n}” falhou. Agora é preciso desfazer o que já foi feito.`, 'bad');
        const reply = s.v.mode === 'orch' ? 'or' : (i ? SG[i - 1].id : null);
        const comp = () => sgComp(s, done.slice());
        if (reply) s.send(p.id, reply, { label: 'erro', color: RED, onArrive: comp }); else comp();
      } else {
        n.tag(p.ok + ' ✓', 'ok'); s.log(`${p.n}: ${p.ok}.`, 'ok'); done.push(i);
        if (s.v.mode === 'orch') s.send(p.id, 'or', { label: 'ok', color: GREEN, onArrive: () => sgStep(s, i + 1, done) });
        else if (i + 1 < SG.length) s.send(p.id, SG[i + 1].id, { label: 'evento', color: s.col(i), onArrive: () => sgStep(s, i + 1, done) });
        else sgStep(s, i + 1, done);
      }
    });
  };
  if (from) s.send(from, p.id, { label: s.v.mode === 'orch' ? 'comando' : 'evento', color: s.col(i), onArrive: go }); else go();
}
function sgComp(s, done) {
  if (!done.length) { s.running = false; s.m.set('Resultado: compra cancelada, nada ficou pela metade.'); s.m.tone('bad'); s.log('Nada havia a desfazer. Compra cancelada.', 'warn'); return; }
  const i = done.pop(), p = SG[i], from = s.v.mode === 'orch' ? 'or' : (i + 1 < SG.length && s.nodes[SG[i + 1].id].g.getAttribute('data-s') === 'down' ? SG[i + 1].id : SG[i + 1] ? SG[i + 1].id : null);
  const run = () => {
    const n = s.nodes[p.id]; n.work(1); n.tag('desfazendo…', 'warn');
    s.after(800, () => { n.work(-1); n.tag(p.undo + ' ↩', 'warn'); s.log(`Compensação: ${p.undo}.`, 'warn'); if (done.length) { const nx = done[done.length - 1]; if (s.v.mode === 'chor') s.send(p.id, SG[nx].id, { label: 'desfaça', color: RED, onArrive: () => sgComp(s, done) }); else s.send(p.id, 'or', { label: 'ok', color: GRAY, onArrive: () => sgComp(s, done) }); } else { s.running = false; s.m.set('Resultado: compra cancelada, tudo desfeito.'); s.m.tone('bad'); s.log('Tudo foi desfeito: nenhuma cobrança ou reserva ficou pela metade.', 'ok'); } });
  };
  if (s.v.mode === 'orch') s.send('or', p.id, { label: 'desfaça', color: RED, onArrive: run }); else run();
}

/* =============== 16. OUTBOX =============== */
SIMS['outbox'] = {
  experimente: [
    'No modo ingênuo, ligue “serviço cai entre gravar e publicar” e crie um pedido: o pedido existe, o evento nunca sai.',
    'No modo outbox, derrube o broker e crie pedidos: os eventos esperam na tabela e saem quando ele volta.',
    'Ligue “relay cai após publicar” com o consumidor sem idempotência: o evento chega duas vezes e é processado duas vezes.',
  ],
  controls: [
    { id: 'mode', type: 'seg', label: 'Estratégia', options: [['naive', 'Ingênua: grava e publica'], ['outbox', 'Outbox']], value: 'outbox', restart: true },
    { id: 'crash', type: 'toggle', label: 'Serviço cai entre gravar e publicar', value: false },
    { id: 'bdown', type: 'toggle', label: 'Broker fora do ar', value: false, change: (s, v) => s.nodes.br.setDown(v) },
    { id: 'rdup', type: 'toggle', label: 'Relay cai após publicar, antes de marcar', value: false },
    { id: 'idem', type: 'toggle', label: 'Consumidor idempotente', value: true },
    { id: 'go', type: 'btn', label: 'Criar pedido', primary: true, run: s => obCreate(s) },
  ],
  build(s) {
    const ob = s.v.mode === 'outbox';
    s.node('sv', { x: 70, y: 190, label: 'serviço', icon: 'server' });
    s.box('dbx', { x: 270, y: 190, w: 200, h: 200, dash: true, label: 'banco · uma transação', top: true }); s.anch.dbx.r = 105;
    s.t1 = s.slots('t1', { x: 270, y: 160, n: 4, w: 36, label: 'tabela pedidos' });
    s.t2 = s.slots('t2', { x: 270, y: 240, n: 4, w: 36, label: 'tabela outbox' }); s.t2g = ob;
    s.node('rl', { x: 460, y: 300, label: 'relay', icon: 'gear', r: 24 }); s.nodes.rl.setOff(!ob);
    s.node('br', { x: 600, y: 190, label: 'broker', icon: 'topic' }); s.nodes.br.setDown(!!s.v.bdown);
    s.node('co', { x: 740, y: 190, label: 'consumidor', icon: 'bell', r: 24 });
    s.link('sv', 'dbx'); s.link('br', 'co', { dash: true }); if (ob) s.link('rl', 'br', { dash: true }); else s.link('sv', 'br', { dash: true });
    s.rows = []; s.outb = []; s.st = { ped: 0, ev: 0, lost: 0, dup: 0 }; s.proc = new Set(); s.crashed = new Set();
    s.m = s.txt(400, 372, ''); obDraw(s);
    if (ob) s.every(900, () => obRelay(s));
  },
};
function obDraw(s) {
  s.t1.set(s.rows.map(r => ({ t: r, c: s.col(r) })));
  s.t2.set(s.outb.map(o => ({ t: o.id, c: o.sent ? GREEN : RED })));
  s.m.set(`pedidos: ${s.st.ped}   ·   eventos processados: ${s.st.ev}   ·   eventos perdidos: ${s.st.lost}   ·   processados em duplicidade: ${s.st.dup}`);
}
function obDeliver(s, id, from) {
  s.send(from, 'br', { label: 'evt ' + id, color: s.col(id), onArrive: () => {
    if (s.nodes.br.down) { s.log(`Broker fora do ar: o evento ${id} não foi publicado.`, from === 'sv' ? 'bad' : 'warn'); if (from === 'sv') { s.st.lost++; obDraw(s); } return; }
    s.send('br', 'co', { label: 'evt ' + id, color: s.col(id), onArrive: () => {
      if (s.proc.has(id)) { if (s.v.idem) { s.log(`Consumidor já viu o evento ${id}: ignora a repetição.`, 'ok'); return; } s.st.dup++; s.log(`Evento ${id} processado de novo: efeito duplicado!`, 'bad'); }
      else { s.st.ev++; s.log(`Consumidor processa o evento ${id}.`, 'ok'); }
      s.proc.add(id); obDraw(s);
    } });
  } });
}
function obCreate(s) {
  const id = ++s.n; s.log(`Serviço cria o pedido ${id}.`);
  s.send('sv', 'dbx', { label: 'pedido ' + id, color: s.col(id), onArrive: () => {
    s.rows.push(id); s.st.ped++;
    if (s.v.mode === 'outbox') { s.outb.push({ id, sent: false }); obDraw(s); s.log('Pedido e evento foram gravados na mesma transação: os dois existem ou nenhum existe.', 'ok'); return; }
    obDraw(s);
    if (s.v.crash) { s.st.lost++; obDraw(s); s.log(`O serviço caiu antes de publicar: o pedido ${id} existe, mas o evento se perdeu para sempre.`, 'bad'); return; }
    obDeliver(s, id, 'sv');
  } });
}
function obRelay(s) {
  const o = s.outb.find(x => !x.sent); if (!o) return;
  if (s.nodes.br.down) { if (!o.warned) { o.warned = true; s.log('Broker fora do ar: o relay não publica, mas os eventos continuam salvos na outbox.', 'warn'); } return; }
  if (o.busy) return; o.busy = true;
  s.log(`Relay lê o evento ${o.id} da outbox e publica.`);
  obDeliver(s, o.id, 'rl');
  s.after(1300, () => {
    o.busy = false;
    if (s.v.rdup && !s.crashed.has(o.id)) { s.crashed.add(o.id); s.log('O relay caiu depois de publicar e antes de marcar como enviado: vai publicar de novo.', 'bad'); return; }
    o.sent = true; obDraw(s);
  });
}

/* =============== 17. EVENT SOURCING =============== */
SIMS['eventsourcing'] = {
  experimente: [
    'Deposite e saque: cada ação vira um evento imutável. O saldo é calculado somando os eventos.',
    'Tente sacar mais que o saldo: o comando é recusado e nenhum evento é gravado.',
    'Arraste “viajar no tempo” para trás: o estado de qualquer momento é reconstruído.',
    'Ligue os snapshots e viaje até o fim: menos eventos precisam ser reaplicados.',
  ],
  controls: [
    { id: 'snap', type: 'toggle', label: 'Snapshot a cada 3 eventos', value: false, change: s => esView(s) },
    { id: 'tt', type: 'range', label: 'Viajar no tempo (até o evento nº)', min: 0, max: 3, step: 1, value: 3, fmt: v => '#' + v, change: (s, v) => { s.view = v; s.live = v === s.evs.length; esView(s); } },
    { id: 'dep', type: 'btn', label: 'Depositar 100', primary: true, run: s => esAdd(s, 100, 'depósito +100') },
    { id: 'wd', type: 'btn', label: 'Sacar 30', run: s => esWd(s, 30) },
    { id: 'wd5', type: 'btn', label: 'Sacar 500', run: s => esWd(s, 500) },
    { id: 'rev', type: 'btn', label: 'Estornar o último', run: s => esRev(s) },
    { id: 'del', type: 'btn', label: 'Tentar apagar o evento #2', run: s => s.log('Eventos são imutáveis: para corrigir algo, registre um novo evento (um estorno), nunca apague o antigo.', 'warn') },
  ],
  build(s) {
    s.evs = [{ d: 0, t: 'conta aberta' }, { d: 100, t: 'depósito +100' }, { d: -30, t: 'saque −30' }]; s.view = 3; s.live = true;
    s.sl = s.slots('log', { x: 400, y: 80, n: 10, w: 56, h: 44 }); s.txt(400, 30, 'log de eventos (só se acrescenta)', { cls: 'sub' });
    s.box('st', { x: 400, y: 245, w: 280, h: 90, label: '', cls: 'soft' }); s.anch.st.r = 20;
    s.bal = s.txt(400, 255, '', { size: 28, cls: 'big' }); s.cap = s.txt(400, 215, 'estado reconstruído', { cls: 'sub' }); s.info = s.txt(400, 350, '');
    if (s.ui.setRange) s.ui.setRange('tt', { max: s.evs.length, value: s.view });
    esDraw(s);
  },
};
function esBalance(s, k, from) { let b = 0; for (let i = from || 0; i < k; i++) b += s.evs[i].d; return b; }
function esDraw(s) {
  const k = s.view, items = s.evs.map((e, i) => ({ t: e.d > 0 ? '+' + e.d : e.d < 0 ? '−' + (-e.d) : '●', c: e.d < 0 ? RED : e.d > 0 ? GREEN : GRAY, dim: i >= k }));
  s.sl.set(items); s.bal.set('R$ ' + esBalance(s, k));
  s.cap.set(k === s.evs.length ? 'estado atual' : `estado depois do evento #${k}`);
}
function esView(s) {
  esDraw(s); const k = s.view;
  let from = 0; if (s.v.snap) from = Math.floor(k / 3) * 3;
  const n = k - from; s.info.set(`${n} evento(s) reaplicado(s)${s.v.snap && from ? ` a partir do snapshot do evento #${from}` : ' desde o início'}`);
  for (let i = from; i < Math.min(k, from + 8); i++) s.after((i - from) * 120, () => s.send({ x: 400 - 280 + 56 * i * 0.0 + ((i - 4.5) * 60) + 280, y: 100, r: 0 }, 'st', { color: s.col(i), dur: 500, label: s.evs[i].d ? (s.evs[i].d > 0 ? '+' : '−') : '' }));
}
function esSync(s) { if (s.ui.setRange) s.ui.setRange('tt', { max: s.evs.length, value: s.evs.length }); s.view = s.evs.length; esView(s); }
function esAdd(s, d, t) { if (s.evs.length >= 10) { s.log('O log desta demonstração está cheio (10 eventos). Reinicie para começar de novo.', 'warn'); return; } s.evs.push({ d, t }); s.log(`Novo evento #${s.evs.length}: ${t}.`, 'ok'); esSync(s); }
function esWd(s, v) { const b = esBalance(s, s.evs.length); if (b < v) { s.log(`Comando recusado: saldo R$ ${b} é menor que o saque de R$ ${v}. Nenhum evento foi gravado.`, 'bad'); return; } esAdd(s, -v, `saque −${v}`); }
function esRev(s) { const l = s.evs[s.evs.length - 1]; if (!l || !l.d) { s.log('Não há movimento para estornar.', 'warn'); return; } esAdd(s, -l.d, `estorno ${l.d > 0 ? '−' : '+'}${Math.abs(l.d)}`); }

/* =============== 18. CQRS =============== */
SIMS['cqrs'] = {
  experimente: [
    'Crie um pedido com atraso de sincronização alto e consulte logo: a leitura ainda não vê o pedido novo (consistência eventual).',
    'Dispare a rajada de consultas com 1 réplica de leitura e depois com 3: a leitura escala sem tocar na escrita.',
  ],
  controls: [
    { id: 'lag', type: 'range', label: 'Atraso de sincronização', min: 0, max: 5, step: 0.5, value: 2, fmt: fmtS },
    { id: 'rep', type: 'range', label: 'Réplicas de leitura', min: 1, max: 3, step: 1, value: 1, fmt: v => v },
    { id: 'cmd', type: 'btn', label: 'Criar pedido (comando)', primary: true, run: s => cqCmd(s) },
    { id: 'qry', type: 'btn', label: 'Consultar pedidos (query)', run: s => cqQry(s) },
    { id: 'burst', type: 'btn', label: 'Rajada de 12 consultas', run: s => { for (let i = 0; i < 12; i++) s.after(i * 150, () => cqQry(s)); } },
  ],
  build(s) {
    s.node('cl', { x: 70, y: 190, label: 'cliente', icon: 'client' });
    s.node('ca', { x: 260, y: 90, label: 'API de comandos', icon: 'server' });
    s.node('wd', { x: 520, y: 90, label: 'banco de escrita', sub: 'normalizado', icon: 'db' });
    s.node('qa', { x: 260, y: 290, label: 'API de consultas', icon: 'server' });
    s.node('rd', { x: 520, y: 290, label: 'banco de leitura', sub: 'pronto para a tela', icon: 'db' });
    s.link('cl', 'ca'); s.link('ca', 'wd'); s.link('cl', 'qa'); s.link('qa', 'rd', { dash: true }); s.link('wd', 'rd', { dash: true, label: 'eventos', lx: 40 });
    s.W = 0; s.R = 0; s.qbusy = 0; s.qq = [];
    s.m = s.txt(400, 372, ''); cqDraw(s);
  },
};
function cqDraw(s) { s.nodes.wd.badge(s.W, 'n'); s.nodes.rd.badge(s.R, s.R === s.W ? 'ok' : 'warn'); s.m.set(`pedidos na escrita: ${s.W}   ·   visíveis na leitura: ${s.R}   ·   consultas na fila: ${s.qq.length}`); }
function cqCmd(s) {
  const id = ++s.n; s.log(`Comando: criar pedido ${id}.`);
  s.send('cl', 'ca', { label: 'criar', color: s.col(id), onArrive: () => s.send('ca', 'wd', { label: id, color: s.col(id), onArrive: () => {
    s.W++; cqDraw(s); s.log(`Pedido ${id} gravado no modelo de escrita.`, 'ok');
    s.send('wd', 'rd', { label: 'evt', color: s.col(id), dur: Math.max(400, s.v.lag * 1000), onArrive: () => { s.R++; cqDraw(s); s.log(`O modelo de leitura recebeu o pedido ${id}.`, 'info'); } });
  } }) });
}
function cqQry(s) { s.qq.push(++s.n); cqDraw(s); cqServe(s); }
function cqServe(s) {
  if (s.qbusy >= s.v.rep || !s.qq.length) return;
  const id = s.qq.shift(); s.qbusy++; cqDraw(s);
  s.send('cl', 'qa', { label: 'ler', color: GRAY, dur: 400, onArrive: () => s.send('qa', 'rd', { label: 'q', color: GRAY, dur: 400, onArrive: () => {
    s.nodes.rd.work(1);
    s.after(900, () => {
      s.nodes.rd.work(-1); const seen = s.R, stale = seen < s.W;
      s.send('rd', 'cl', { label: seen + ' pedidos', color: stale ? PAL[4] : GREEN, dur: 600, onArrive: () => { s.log(stale ? `Consulta devolveu ${seen} pedidos, mas já existem ${s.W}: leitura atrasada.` : `Consulta devolveu ${seen} pedidos, em dia.`, stale ? 'warn' : 'ok'); } });
      s.qbusy--; cqServe(s);
    });
  } }) });
  cqServe(s);
}

/* =============== 19. SCATTER-GATHER =============== */
SIMS['scatter'] = {
  experimente: [
    'Cote o voo: as três companhias respondem em paralelo e o agregador escolhe a mais barata.',
    'Deixe a companhia C lenta: com timeout, o agregador responde sem ela.',
    'Marque “esperar todos” e derrube a C: o agregador fica esperando para sempre.',
  ],
  controls: [
    { id: 'la', type: 'range', label: 'Resposta da companhia A', min: 200, max: 4000, step: 100, value: 600, fmt: fmtMs },
    { id: 'lb', type: 'range', label: 'Resposta da companhia B', min: 200, max: 4000, step: 100, value: 1200, fmt: fmtMs },
    { id: 'lc', type: 'range', label: 'Resposta da companhia C', min: 200, max: 4000, step: 100, value: 2800, fmt: fmtMs },
    { id: 'tmo', type: 'range', label: 'Timeout do agregador', min: 500, max: 5000, step: 100, value: 2000, fmt: fmtMs },
    { id: 'cd', type: 'toggle', label: 'Companhia C fora do ar', value: false, change: (s, v) => s.nodes.c.setDown(v) },
    { id: 'all', type: 'toggle', label: 'Esperar todos (ignorar o timeout)', value: false },
    { id: 'go', type: 'btn', label: 'Cotar voo', primary: true, run: s => scGo(s) },
  ],
  build(s) {
    s.node('cl', { x: 70, y: 190, label: 'cliente', icon: 'client' });
    s.node('ag', { x: 290, y: 190, label: 'agregador', icon: 'gear' });
    [['a', 'companhia A', 60], ['b', 'companhia B', 190], ['c', 'companhia C', 320]].forEach(([i, n, y]) => { s.node(i, { x: 710, y, label: n, icon: 'plane' }); s.link('ag', i, { dash: true }); });
    s.nodes.c.setDown(!!s.v.cd); s.link('cl', 'ag');
    s.m = s.txt(400, 372, 'Tempo total: —');
  },
};
function scGo(s) {
  const t0 = s.t, got = [], lat = { a: s.v.la, b: s.v.lb, c: s.v.lc }, ids = ['a', 'b', 'c'], run = ++s.n; let done = false;
  s.log('Cliente pede uma cotação ao agregador.'); s.m.set('Tempo total: aguardando…'); ids.forEach(i => s.nodes[i].badge(null));
  const finish = (why) => {
    if (done) return; done = true;
    const best = got.length ? got.reduce((a, b) => a.p < b.p ? a : b) : null;
    s.send('ag', 'cl', { label: best ? 'R$ ' + best.p : 'sem oferta', color: best ? GREEN : RED, onArrive: () => {
      const total = (s.t - t0) / 1000, seq = ids.reduce((a, i) => a + (s.nodes[i].down ? 0 : lat[i]), 0) / 1000;
      s.m.set(`Tempo total: ${fmtS(total)}  ·  em sequência seria ≈ ${fmtS(seq)}`);
      s.log(best ? `Cliente recebeu a melhor oferta: R$ ${best.p} (${best.n}). ${why}` : 'Nenhuma companhia respondeu a tempo.', best ? 'ok' : 'bad');
    } });
  };
  s.send('cl', 'ag', { label: 'cotar', color: GRAY, onArrive: () => {
    s.log('Agregador espalha o pedido às três companhias, em paralelo.');
    ids.forEach(i => s.send('ag', i, { label: 'cotar', color: s.col(run), onArrive: () => {
      if (s.nodes[i].down) { s.log(`A companhia ${i.toUpperCase()} está fora do ar e não responde.`, 'bad'); return; }
      s.nodes[i].work(1);
      s.after(lat[i], () => { s.nodes[i].work(-1); const p = Math.round(rnd(800, 1200)); s.send(i, 'ag', { label: 'R$ ' + p, color: s.col(run), onArrive: () => {
        if (done) { s.log(`A resposta da companhia ${i.toUpperCase()} chegou tarde e foi descartada.`, 'warn'); return; }
        got.push({ p, n: 'companhia ' + i.toUpperCase() }); s.nodes[i].badge('R$ ' + p, 'ok'); s.log(`Companhia ${i.toUpperCase()} respondeu R$ ${p}.`);
        if (got.length === ids.filter(x => !s.nodes[x].down).length && !(s.v.all && s.nodes.c.down)) finish('Todas responderam.');
      } }); });
    } }));
    if (!s.v.all) s.after(s.v.tmo, () => { if (!done) { s.log(`Timeout de ${s.v.tmo} ms: o agregador responde com o que já tem.`, 'warn'); finish('Resposta parcial.'); } });
    else s.after(9000, () => { if (!done) { s.log('Esperando todos, mas uma companhia nunca responde: o cliente fica sem resposta.', 'bad'); } });
  } });
}

/* =============== 20. GOSSIP =============== */
SIMS['gossip'] = {
  experimente: [
    'Conte uma novidade ao nó 0 e acompanhe: a cada rodada, o número de nós informados cresce muito.',
    'Aumente o número de vizinhos por rodada: o cluster converge em menos rodadas.',
    'Clique em alguns nós para derrubá-los: a informação chega aos demais do mesmo jeito.',
  ],
  controls: [
    { id: 'fan', type: 'range', label: 'Vizinhos por rodada', min: 1, max: 4, step: 1, value: 2, fmt: v => v },
    { id: 'rt', type: 'range', label: 'Duração da rodada', min: 0.6, max: 2.5, step: 0.1, value: 1.2, fmt: fmtS },
    { id: 'go', type: 'btn', label: 'Contar novidade ao nó 0', primary: true, run: s => gsStart(s) },
    { id: 'rs', type: 'btn', label: 'Esquecer tudo', run: s => s.reset() },
  ],
  build(s) {
    s.N = 12; s.inf = new Set(); s.round = 0; s.live = false;
    for (let i = 0; i < s.N; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / s.N; s.dot('n' + i, { x: 400 + 135 * Math.cos(a), y: 185 + 135 * Math.sin(a), label: i, r: 17, onClick: n => { n.down = !n.down; n.setState(n.down ? 'down' : s.inf.has(i) ? 'on' : 'off'); s.log(n.down ? `Nó ${i} derrubado.` : `Nó ${i} voltou.`, n.down ? 'bad' : 'info'); } }); }
    s.m = s.txt(400, 185, '', { size: 15, cls: 'big' }); s.m2 = s.txt(400, 210, 'clique em um nó para derrubá-lo', { cls: 'sub' }); gsDraw(s);
  },
};
function gsDraw(s) { const alive = [...Array(s.N).keys()].filter(i => !s.nodes['n' + i].down), k = alive.filter(i => s.inf.has(i)).length; s.m.set(`${k}/${alive.length} sabem`); s.m2.set(s.round ? `rodada ${s.round}` : 'clique em um nó para derrubá-lo'); return { alive, k }; }
function gsStart(s) {
  if (s.live) { s.log('A informação já está se espalhando.', 'warn'); return; }
  s.inf = new Set([0]); s.round = 0; s.live = true; s.nodes.n0.setState('on'); for (let i = 1; i < s.N; i++) s.nodes['n' + i].setState(s.nodes['n' + i].down ? 'down' : 'off');
  s.log('O nó 0 fica sabendo da novidade.', 'info'); gsDraw(s);
  const round = () => {
    if (!s.live) return; s.round++; const from = [...s.inf].filter(i => !s.nodes['n' + i].down); const newly = [];
    from.forEach(i => { const others = [...Array(s.N).keys()].filter(j => j !== i); for (let k = 0; k < s.v.fan; k++) { const j = pick(others); s.send('n' + i, 'n' + j, { color: PAL[0], dur: Math.min(700, s.v.rt * 800), onArrive: () => { if (!s.nodes['n' + j].down && !s.inf.has(j)) { s.inf.add(j); s.nodes['n' + j].setState('on'); newly.push(j); gsDraw(s); } } }); } });
    s.log(`Rodada ${s.round}: ${from.length} nó(s) informado(s) contam para ${s.v.fan} vizinho(s) aleatório(s) cada.`);
    s.after(s.v.rt * 1000, () => { const { alive, k } = gsDraw(s); if (k >= alive.length) { s.live = false; s.log(`Convergiu: todos os nós vivos sabem, em ${s.round} rodada(s), sem coordenador.`, 'ok'); } else round(); });
  };
  s.after(400, round);
}

/* =============== 21. API GATEWAY =============== */
SIMS['gateway'] = {
  experimente: [
    'Com autenticação ligada, o cliente anônimo recebe 401 já no gateway, e o serviço nem fica sabendo.',
    'Dispare a rajada do mobile: depois do limite, o gateway responde 429 e protege os serviços.',
    'Desligue a autenticação e repita com o anônimo: agora a requisição passa.',
  ],
  controls: [
    { id: 'auth', type: 'toggle', label: 'Exigir autenticação', value: true },
    { id: 'lim', type: 'range', label: 'Limite por cliente', min: 1, max: 10, step: 1, value: 3, fmt: v => v + ' req/s' },
    { id: 'w', type: 'btn', label: 'Web: GET /pedidos', primary: true, run: s => gwReq(s, 'w', 'pedidos') },
    { id: 'm', type: 'btn', label: 'Mobile: GET /catálogo', run: s => gwReq(s, 'm', 'catalogo') },
    { id: 'a', type: 'btn', label: 'Anônimo: GET /pagamentos', run: s => gwReq(s, 'a', 'pagamentos') },
    { id: 'mb', type: 'btn', label: 'Rajada do mobile (12)', run: s => { for (let i = 0; i < 12; i++) s.after(i * 120, () => gwReq(s, 'm', 'catalogo')); } },
  ],
  build(s) {
    [['w', 'web', 60, 'client'], ['m', 'mobile', 190, 'phone'], ['a', 'anônimo', 320, 'bolt']].forEach(([i, n, y, ic]) => { s.node(i, { x: 70, y, label: n, sub: i === 'a' ? 'sem token' : 'com token', icon: ic, r: 24 }); });
    s.node('gw', { x: 330, y: 190, label: 'API gateway', icon: 'lock' });
    ['w', 'm', 'a'].forEach(i => s.link(i, 'gw'));
    [['pedidos', 60], ['catalogo', 190], ['pagamentos', 320]].forEach(([i, y]) => { s.node(i, { x: 700, y, label: i === 'catalogo' ? 'catálogo' : i, icon: 'server', r: 24 }); s.link('gw', i, { dash: true }); });
    s.win = { w: [], m: [], a: [] }; s.st = { ok: 0, r401: 0, r429: 0 }; s.cnt = { pedidos: 0, catalogo: 0, pagamentos: 0 };
    ['pedidos', 'catalogo', 'pagamentos'].forEach(i => s.nodes[i].badge(0, 'n'));
    s.m = s.txt(400, 372, ''); gwDraw(s);
  },
};
function gwDraw(s) { s.m.set(`atendidas: ${s.st.ok}   ·   401 (sem token): ${s.st.r401}   ·   429 (limite): ${s.st.r429}`); }
function gwReq(s, c, svc) {
  const id = ++s.n, col = s.col(id);
  s.send(c, 'gw', { label: 'GET', color: col, onArrive: () => {
    const now = s.t; s.win[c] = s.win[c].filter(t => now - t < 1000); s.win[c].push(now);
    if (s.v.auth && c === 'a') { s.st.r401++; gwDraw(s); s.log('Gateway: requisição sem token. Responde 401 e o serviço nem é acionado.', 'warn'); s.send('gw', c, { label: '401', color: RED }); return; }
    if (s.win[c].length > s.v.lim) { s.st.r429++; gwDraw(s); s.log(`Gateway: limite de ${s.v.lim} req/s excedido. Responde 429.`, 'warn'); s.send('gw', c, { label: '429', color: PAL[4] }); return; }
    s.send('gw', svc, { label: 'GET', color: col, onArrive: () => {
      s.cnt[svc]++; s.nodes[svc].badge(s.cnt[svc], 'n'); s.nodes[svc].work(1);
      s.after(400, () => { s.nodes[svc].work(-1); s.send(svc, 'gw', { label: '200', color: GREEN, onArrive: () => s.send('gw', c, { label: '200', color: GREEN, onArrive: () => { s.st.ok++; gwDraw(s); s.log(`Cliente recebeu a resposta de ${svc === 'catalogo' ? 'catálogo' : svc} pelo gateway.`, 'ok'); } }) }); });
    } });
  } });
}

/* =============== 22. SERVICE MESH =============== */
SIMS['mesh'] = {
  experimente: [
    'Chame B com 50% de falha e sem retries: metade das chamadas falha. Suba os retries no sidecar, sem mexer no código dos apps.',
    'Ligue o circuit breaker com 100% de falha: depois de 3 erros, as chamadas falham rápido, sem tocar em B.',
    'Com mTLS ligado, a chamada do intruso sem certificado é rejeitada pelo sidecar. Desligue o mTLS e ele entra.',
  ],
  controls: [
    { id: 'mtls', type: 'toggle', label: 'mTLS obrigatório', value: true },
    { id: 'fail', type: 'range', label: 'Falhas do serviço B', min: 0, max: 100, step: 10, value: 0, fmt: v => v + '%' },
    { id: 'rt', type: 'range', label: 'Retries no sidecar', min: 0, max: 3, step: 1, value: 0, fmt: v => v },
    { id: 'cb', type: 'toggle', label: 'Circuit breaker', value: false },
    { id: 'go', type: 'btn', label: 'A chama B', primary: true, run: s => msCall(s) },
    { id: 'go10', type: 'btn', label: 'Rajada de 10', run: s => { for (let i = 0; i < 10; i++) s.after(i * 350, () => msCall(s)); } },
    { id: 'in', type: 'btn', label: 'Intruso chama B sem certificado', run: s => msIntruder(s) },
  ],
  build(s) {
    s.box('podA', { x: 190, y: 235, w: 300, h: 120, dash: true, label: 'pod do serviço A', top: true }); s.anch.podA.r = 10;
    s.box('podB', { x: 610, y: 235, w: 300, h: 120, dash: true, label: 'pod do serviço B', top: true }); s.anch.podB.r = 10;
    s.node('ctl', { x: 400, y: 60, label: 'plano de controle', sub: 'políticas e certificados', icon: 'gear', r: 24 });
    s.node('aa', { x: 100, y: 245, label: 'app A', icon: 'server', r: 24 });
    s.node('sa', { x: 270, y: 245, label: 'sidecar', icon: 'lock', r: 22 });
    s.node('sb', { x: 530, y: 245, label: 'sidecar', icon: 'lock', r: 22 });
    s.node('ab', { x: 700, y: 245, label: 'app B', icon: 'server', r: 24 });
    s.node('in', { x: 400, y: 345, label: 'intruso', icon: 'bolt', r: 20 });
    s.link('aa', 'sa'); s.link('sb', 'ab'); s.link('sa', 'sb', { dash: true, label: 'rede entre sidecars' }); s.link('ctl', 'sa', { dash: true }); s.link('ctl', 'sb', { dash: true });
    s.st = { n: 0, ok: 0, fail: 0, retry: 0, fast: 0 }; s.consec = 0; s.open = 0;
    s.m = s.txt(400, 22, '', { cls: 'sub' }); msDraw(s);
  },
};
function msDraw(s) { s.m.set(`telemetria: ${s.st.n} chamadas  ·  ${s.st.ok} ok  ·  ${s.st.fail} falhas  ·  ${s.st.retry} retries  ·  ${s.st.fast} recusadas pelo circuito`); s.nodes.sa.badge(s.open > s.t ? 'aberto' : null, 'bad'); }
function msCall(s) {
  const id = ++s.n, col = s.col(id); s.st.n++; msDraw(s);
  s.send('aa', 'sa', { label: 'req', color: col, dur: 450, onArrive: () => msTry(s, id, col, 0) });
}
function msTry(s, id, col, att) {
  if (s.v.cb && s.open > s.t) { s.st.fast++; s.st.fail++; msDraw(s); s.log(`Chamada ${id}: o circuito está aberto, o sidecar falha rápido sem incomodar o serviço B.`, 'warn'); s.send('sa', 'aa', { label: '503', color: PAL[4], dur: 450 }); return; }
  s.send('sa', 'sb', { label: s.v.mtls ? '🔒' : 'req', color: col, onArrive: () => s.send('sb', 'ab', { label: 'req', color: col, dur: 450, onArrive: () => {
    s.nodes.ab.work(1);
    s.after(500, () => { s.nodes.ab.work(-1);
      const bad = Math.random() * 100 < s.v.fail;
      s.send('ab', 'sb', { label: bad ? '500' : '200', color: bad ? RED : GREEN, dur: 450, onArrive: () => s.send('sb', 'sa', { label: bad ? '500' : '200', color: bad ? RED : GREEN, onArrive: () => {
        if (!bad) { s.consec = 0; s.st.ok++; msDraw(s); s.log(`Chamada ${id} concluída${att ? ` depois de ${att} retry(s)` : ''}.`, 'ok'); s.send('sa', 'aa', { label: '200', color: GREEN, dur: 450 }); return; }
        s.consec++; if (s.v.cb && s.consec >= 3) { s.open = s.t + 6000; s.log('Três falhas seguidas: o circuit breaker abre por 6 s.', 'bad'); msDraw(s); }
        if (att < s.v.rt) { s.st.retry++; msDraw(s); s.log(`Chamada ${id} falhou: o sidecar tenta de novo (${att + 1}/${s.v.rt}), e o app nem percebe.`, 'warn'); msTry(s, id, col, att + 1); return; }
        s.st.fail++; msDraw(s); s.log(`Chamada ${id} falhou definitivamente.`, 'bad'); s.send('sa', 'aa', { label: '500', color: RED, dur: 450 });
      } }) });
    });
  } }) });
}
function msIntruder(s) {
  s.log('Um intruso tenta chamar o serviço B diretamente, sem certificado.', 'warn');
  s.send('in', 'sb', { label: 'req', color: RED, onArrive: () => {
    if (s.v.mtls) { s.log('O sidecar de B exige mTLS e recusa a conexão: sem certificado, sem acesso.', 'ok'); s.send('sb', 'in', { label: 'recusado', color: RED }); }
    else { s.log('Sem mTLS, o intruso passou e chegou ao app B!', 'bad'); s.send('sb', 'ab', { label: 'req', color: RED, dur: 450 }); }
  } });
}


/* ===== montagem: troca cada [data-sim] por palco, controles, barra e registro ===== */
const H = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs || {}) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
  kids.flat().forEach(c => e.append(c));
  return e;
};
const instances = [];

function mount(host) {
  const id = host.dataset.sim, cfg = SIMS[id];
  if (!cfg) return;
  host.classList.add('sim');
  host.innerHTML = '';
  const ui = { svg: null, log: null, now: null, cur: null, pending: {}, ctl: {} };
  const inst = { sim: null, paused: false, speed: 1, visible: true };

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 400'); svg.setAttribute('class', 'sm-stage'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Simulação interativa: ' + (host.dataset.title || id));
  svg.append(document.createElementNS(NS, 'defs'));
  const now = H('div', { class: 'sm-now', 'aria-live': 'polite' });
  const controls = H('div', { class: 'sm-ctl' });
  const logEl = H('div', { class: 'sm-log' });
  ui.svg = svg; ui.now = now; ui.log = logEl;

  function reflect(cid, val) {
    const k = ui.ctl[cid]; if (!k) return; const c = k.c;
    if (c.type === 'toggle') k.i.checked = !!val;
    else if (c.type === 'range') { k.i.value = val; k.o.textContent = c.fmt ? c.fmt(+val) : val; }
    else if (c.type === 'seg') k.bs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(val))));
  }
  function setVal(c, val) {
    const sim = inst.sim; if (!sim) return;
    sim.v[c.id] = val; reflect(c.id, val);
    if (c.restart) { sim.reset(); return; }
    if (c.change) c.change(sim, val);
    if (sim.cfg.change) sim.cfg.change(sim, c.id, val);
  }
  ui.syncControls = s => {
    ui.cur = s;
    for (const cid in ui.pending) {
      const p = ui.pending[cid], k = ui.ctl[cid];
      if (k && k.i) { if (p.min != null) k.i.min = p.min; if (p.max != null) k.i.max = p.max; }
      if (p.value != null) s.v[cid] = p.value;
    }
    ui.pending = {};
    for (const cid in ui.ctl) if (ui.ctl[cid].c.type !== 'btn') reflect(cid, s.v[cid]);
  };
  ui.setRange = (cid, o) => {
    const k = ui.ctl[cid];
    if (k && k.i) {
      if (o.min != null) k.i.min = o.min; if (o.max != null) k.i.max = o.max;
      if (o.value != null) { k.i.value = o.value; k.o.textContent = k.c.fmt ? k.c.fmt(o.value) : o.value; }
    }
    if (o.value != null) { ui.pending[cid] = o; if (ui.cur) ui.cur.v[cid] = o.value; }
  };

  function buildControls() {
    controls.innerHTML = ''; ui.ctl = {};
    const acts = H('div', { class: 'sm-row' }), params = H('div', { class: 'sm-params' });
    cfg.controls.forEach(c => {
      let w;
      if (c.type === 'btn') {
        w = H('button', { class: 'sm-btn' + (c.primary ? ' primary' : ''), type: 'button' }, c.label);
        w.onclick = () => { if (inst.sim) c.run(inst.sim); };
        acts.append(w); ui.ctl[c.id] = { c, w }; return;
      }
      if (c.type === 'toggle') {
        const i = H('input', { type: 'checkbox' }); i.onchange = () => setVal(c, i.checked);
        w = H('label', { class: 'sm-tg' }, i, H('span', { class: 'sm-sw' }), c.label); ui.ctl[c.id] = { c, w, i };
      } else if (c.type === 'range') {
        const o = H('output'), i = H('input', { type: 'range', min: c.min, max: c.max, step: c.step, 'aria-label': c.label });
        i.oninput = () => setVal(c, parseFloat(i.value));
        w = H('div', { class: 'sm-rg' }, H('label', {}, H('span', {}, c.label), o), i); ui.ctl[c.id] = { c, w, i, o };
      } else if (c.type === 'seg') {
        const bs = c.options.map(([v, t]) => { const b = H('button', { type: 'button', 'data-v': v }, t); b.onclick = () => setVal(c, v); return b; });
        w = H('div', { class: 'sm-seg' }, H('span', { class: 'lb' }, c.label), H('div', { role: 'group', 'aria-label': c.label }, bs)); ui.ctl[c.id] = { c, w, bs };
      }
      if (w) params.append(w);
    });
    if (params.children.length) controls.append(params);
    if (acts.children.length) controls.append(acts);
  }

  function start() {
    buildControls(); ui.cur = null; ui.pending = {}; inst.paused = false;
    pb.textContent = 'Pausar';
    inst.sim = new Sim(cfg, ui);
  }

  const bar = H('div', { class: 'sm-bar' });
  const pb = H('button', { class: 'sm-btn', type: 'button' }, 'Pausar');
  pb.onclick = () => { inst.paused = !inst.paused; pb.textContent = inst.paused ? 'Continuar' : 'Pausar'; };
  const spBtns = [['0.5', '0,5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']].map(([v, t]) => {
    const b = H('button', { type: 'button', 'aria-pressed': String(v === '1') }, t);
    b.onclick = () => { inst.speed = parseFloat(v); spBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
    return b;
  });
  const sp = H('div', { class: 'sm-seg' }, H('div', { role: 'group', 'aria-label': 'Velocidade' }, spBtns));
  const rs = H('button', { class: 'sm-btn', type: 'button' }, 'Recomeçar'); rs.onclick = start;
  bar.append(pb, sp, rs);

  host.append(H('div', { class: 'sm-box' }, H('div', { class: 'sm-stagewrap' }, svg), now, controls, bar));
  if (cfg.experimente && cfg.experimente.length) {
    const ol = H('ol'); cfg.experimente.forEach(t => ol.append(H('li', {}, t)));
    host.append(H('div', { class: 'sm-try' }, H('h3', {}, 'Experimente'), ol));
  }
  host.append(H('details', { class: 'sm-logbox' }, H('summary', {}, 'Registro do que aconteceu'), logEl));
  start();
  instances.push(inst);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { inst.visible = es[0].isIntersecting; }).observe(host);
  }
}

let last = 0;
function frame(ts) {
  const dt = Math.min(100, ts - (last || ts)); last = ts;
  if (!document.hidden) {
    instances.forEach(inst => {
      if (!inst.sim || inst.paused || !inst.visible) return;
      let left = dt * inst.speed;
      while (left > 0) { const d = Math.min(25, left); inst.sim.step(d); left -= d; }
    });
  }
  requestAnimationFrame(frame);
}
function init() {
  document.querySelectorAll('[data-sim]').forEach(mount);
  requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.DevSim = { SIMS, instances };

})();
