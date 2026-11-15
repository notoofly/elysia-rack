const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || reducedMotion) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

function initRack() {
  const input = $('#rack-path');
  if (!input) return;
  const routes = $$('#rf-routes .rf-p');
  const dot = $('#rf-dot');
  const status = $('#rf-status');
  const list = $('#rf-routes');
  let raf = 0;

  const render = () => {
    const raw = input.value.trim().replace(/^\/+|\/+$/g, '');
    const clean = raw.replace(/[^a-zA-Z0-9\-_/]/g, '');
    const base = clean ? '/' + clean : '';
    routes.forEach((p) => {
      p.textContent = base + (p.dataset.suffix || '');
    });
    const valid = raw === '' || /^[a-zA-Z0-9\-_/]+$/.test(raw);
    const frag = $('.rack-fragment');
    frag.classList.toggle('bad', raw !== '' && !valid);
    if (raw === '') {
      status.textContent = 'waiting';
      dot.style.background = '';
    } else if (valid) {
      status.textContent = 'registered';
      dot.style.background = '';
    } else {
      status.textContent = 'invalid path';
      dot.style.background = '#e0655e';
    }
    input.style.width = Math.max(6, input.value.length + 1) + 'ch';
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        list.classList.remove('tick');
        void list.offsetWidth;
        list.classList.add('tick');
      });
    }
  };

  input.addEventListener('input', render);
  render();
}

function initCaps() {
  const filter = $('#caps-filter');
  const list = $('#caps-list');
  if (!filter || !list) return;
  const rows = $$('.cap-row', list);

  const visible = () => rows.filter((r) => !r.hidden);
  const select = (row) => {
    rows.forEach((r) => {
      const on = r === row;
      r.classList.toggle('selected', on);
      $('.cap-btn', r).setAttribute('aria-pressed', String(on));
    });
  };

  const applyFilter = () => {
    const q = filter.value.trim().toLowerCase();
    rows.forEach((r) => {
      const hay = (r.dataset.tags + ' ' + r.textContent).toLowerCase();
      r.hidden = q !== '' && !hay.includes(q);
    });
    const vis = visible();
    if (vis.length && !vis.includes(list.querySelector('.cap-row.selected'))) {
      select(vis[0]);
    }
  };

  filter.addEventListener('input', applyFilter);
  filter.addEventListener('keydown', (e) => {
    const vis = visible();
    const cur = list.querySelector('.cap-row.selected');
    let i = vis.indexOf(cur);
    if (e.key === 'ArrowDown') i = Math.min(vis.length - 1, i + 1);
    else if (e.key === 'ArrowUp') i = Math.max(0, i - 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = vis.length - 1;
    else return;
    e.preventDefault();
    if (vis[i]) {
      select(vis[i]);
      $('.cap-btn', vis[i]).focus();
    }
  });

  rows.forEach((r) => {
    $('.cap-btn', r).addEventListener('click', () => select(r));
  });
}

function initHow() {
  const steps = $$('.how-step');
  const fig = $('.code-fragment');
  const pre = $('#cf-pre');
  const stateLabel = $('#cf-state');
  if (!steps.length || !fig) return;
  const labels = { 1: 'the model', 2: 'the registration', 3: 'live' };

  const setState = (n) => {
    fig.dataset.state = String(n);
    if (stateLabel) stateLabel.textContent = labels[n];
    steps.forEach((s) => s.classList.toggle('active', s.dataset.state === String(n)));
    $$('.cf-g', pre).forEach((g) => g.classList.toggle('on', Number(g.dataset.g) <= n));
    const g = $(`.cf-g[data-g="${n}"]`, pre);
    if (g && pre) {
      const rect = g.getBoundingClientRect();
      const preRect = pre.getBoundingClientRect();
      const target = pre.scrollTop + rect.top - preRect.top - 10;
      pre.scrollTop = Math.max(0, target);
    }
  };

  if (!('IntersectionObserver' in window)) {
    setState(3);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setState(Number(e.target.dataset.state));
      }
    },
    { rootMargin: '-45px 0px -45% 0px', threshold: 0 },
  );
  steps.forEach((s) => io.observe(s));
  setState(1);
}

function initPanel() {
  const table = $('#pf-table');
  if (!table) return;
  const tbody = $('tbody', table);
  const rows = $$('.pf-row', tbody);
  const count = $('#pf-count');
  const range = $('#pf-range');
  const search = $('#pf-search');
  const statusSel = $('#pf-status');
  const catSel = $('#pf-category');
  const sortSel = $('#pf-sort');
  const apply = $('#pf-apply');

  const applyFilters = () => {
    const q = (search?.value || '').trim().toLowerCase();
    const st = statusSel?.value || '';
    const cat = catSel?.value || '';
    const sort = sortSel?.value || '';
    let shown = 0;
    rows.forEach((r) => {
      const d = r.dataset;
      const ok =
        (!q || d.name.includes(q)) &&
        (!st || d.status === st) &&
        (!cat || d.category === cat);
      r.hidden = !ok;
      const det = r.nextElementSibling;
      if (det && det.classList.contains('pf-detail-row')) det.hidden = !ok || !r.classList.contains('open');
      if (ok) shown++;
    });
    if (sort) {
      [...rows]
        .sort((a, b) => {
          const va = sort === 'price' ? Number(a.dataset.price) : a.dataset.name;
          const vb = sort === 'price' ? Number(b.dataset.price) : b.dataset.name;
          return va > vb ? 1 : va < vb ? -1 : 0;
        })
        .forEach((r) => {
          tbody.appendChild(r);
          if (r.nextElementSibling && r.nextElementSibling.classList.contains('pf-detail-row')) {
            tbody.appendChild(r.nextElementSibling);
          }
        });
    }
    if (count) count.textContent = shown === 1 ? '1 record' : shown + ' records';
    if (range) range.textContent = shown === 0 ? 'No records found.' : `1–${shown} of ${shown} records`;
  };

  rows.forEach((r) => {
    r.addEventListener('click', () => {
      const opening = !r.classList.contains('open');
      rows.forEach((other) => {
        other.classList.remove('open');
        const det = other.nextElementSibling;
        if (det && det.classList.contains('pf-detail-row')) det.hidden = true;
      });
      if (opening) {
        r.classList.add('open');
        const det = r.nextElementSibling;
        if (det && det.classList.contains('pf-detail-row')) det.hidden = false;
      }
    });
  });

  if (apply) apply.addEventListener('click', applyFilters);
  if (search) search.addEventListener('keydown', (e) => e.key === 'Enter' && applyFilters());
  [statusSel, catSel, sortSel].forEach((s) => s && s.addEventListener('change', applyFilters));
}

function initCopy() {
  $$('.copy-btn').forEach((btn) => {
    const target = document.getElementById(btn.dataset.copy);
    if (!target) return;
    btn.addEventListener('click', async () => {
      const text = target.textContent;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 1600);
    });
  });
}

function initNav() {
  const toggle = $('.nav-toggle');
  const sheet = $('#nav-sheet');
  if (!toggle || !sheet) return;
  const close = () => {
    sheet.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!sheet.classList.contains('open')) sheet.hidden = true;
    }, 300);
  };
  toggle.addEventListener('click', () => {
    const open = sheet.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) sheet.hidden = false;
    else close();
  });
  $$('a', sheet).forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document.addEventListener('click', (e) => {
    if (sheet.classList.contains('open') && !sheet.contains(e.target) && !toggle.contains(e.target)) close();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initRack();
  initCaps();
  initHow();
  initPanel();
  initCopy();
  initNav();
});
