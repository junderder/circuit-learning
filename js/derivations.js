/* =========================================================
   电路学堂 · 公式推导页脚本
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  let currentId = null;
  let player = null;

  function all() { return window.DERIVATIONS || []; }

  function chapterLabel(chId) {
    const c = CL.chapterById(chId);
    return c ? '第 ' + c.num + ' 章 · ' + CL.shortTitle(c) : '';
  }

  function renderList() {
    const box = $('#derive-items');
    if (!box) return;
    box.innerHTML = all().map(function (d) {
      return '<button class="derive-item" type="button" data-id="' + d.id + '">' +
        '<span class="dt">' + CL.escape(d.title) + '</span>' +
        '<small>' + CL.escape(chapterLabel(d.ch)) + ' · ' + (d.steps || []).length + ' 步</small>' +
      '</button>';
    }).join('');
  }

  function markActive(id) {
    document.querySelectorAll('.derive-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-id') === id);
    });
  }

  function renderSteps(d) {
    const ol = $('#step-list');
    ol.innerHTML = (d.steps || []).map(function (s, i) {
      return '<li data-i="' + i + '"><div class="se">' + s.eq + '</div>' +
        (s.note ? '<div class="sn">' + s.note + '</div>' : '') + '</li>';
    }).join('');
    ol.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('click', function () {
        if (player) player.go(Number(li.getAttribute('data-i')));
      });
    });
    highlightStep(0);
  }

  function highlightStep(i) {
    const items = document.querySelectorAll('#step-list li');
    items.forEach(function (li) {
      li.classList.toggle('now', Number(li.getAttribute('data-i')) === i);
    });
    const now = document.querySelector('#step-list li.now');
    if (now) {
      const r = now.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 20 || r.top < 80) {
        now.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function select(id) {
    const list = all();
    let d = list.find(function (x) { return x.id === id; }) || list[0];
    if (!d) return;
    currentId = d.id;

    const host = $('#player-host');
    host.innerHTML = '';
    player = CL.createDerivationPlayer(host, d, {
      onChange: function (i) { highlightStep(i); }
    });

    renderSteps(d);
    markActive(d.id);

    const idx = list.indexOf(d);
    $('#prev-derive').disabled = idx <= 0;
    $('#next-derive').disabled = idx >= list.length - 1;
    $('#to-chapter').href = 'chapter.html?id=' + d.ch;
    $('#to-chapter').textContent = '回第 ' + (CL.chapterById(d.ch) ? CL.chapterById(d.ch).num : '') + ' 章复习 →';
    document.title = d.title + ' · 公式推导 · 电路学堂';

    try { history.replaceState(null, '', '#' + d.id); } catch (e) { /* file:// 忽略 */ }
  }

  function step(delta) {
    const list = all();
    const idx = list.findIndex(function (x) { return x.id === currentId; });
    const next = list[idx + delta];
    if (next) select(next.id);
  }

  function boot() {
    renderList();

    document.querySelectorAll('.derive-item').forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-id')); });
    });

    $('#prev-derive').addEventListener('click', function () { step(-1); });
    $('#next-derive').addEventListener('click', function () { step(1); });

    const search = $('#derive-search');
    search.addEventListener('input', function () {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll('.derive-item').forEach(function (b) {
        const d = all().find(function (x) { return x.id === b.getAttribute('data-id'); });
        const hay = (d.title + ' ' + d.subtitle + ' ' + chapterLabel(d.ch)).toLowerCase();
        const on = !q || hay.indexOf(q) >= 0;
        b.classList.toggle('hidden', !on);
        if (on) shown++;
      });
      $('#derive-empty').textContent = shown ? '' : '没有匹配的推导。';
    });

    // 键盘切换推导（在播放器外部时）
    document.addEventListener('keydown', function (e) {
      if (e.target.closest('.dplayer') || e.target.matches('input, select, textarea')) return;
      if (e.key === 'j' || e.key === 'J') step(1);
      if (e.key === 'k' || e.key === 'K') step(-1);
    });

    const hash = (location.hash || '').replace('#', '');
    select(hash || (all()[0] && all()[0].id));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
