/* =========================================================
   电路学堂 · 课程目录脚本
   ========================================================= */
(function () {
  'use strict';

  const listEl = () => document.getElementById('chapter-list');
  const state = { mod: 'all', q: '' };

  function chapters() {
    return ((window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || []).slice().sort((a, b) => a.num - b.num);
  }
  function modules() {
    return (window.CIRCUIT_DATA && window.CIRCUIT_DATA.modules) || [];
  }

  function matches(c) {
    if (state.mod !== 'all' && c.module !== state.mod) return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    const hay = [c.title, c.summary, (c.keywords || []).join(' '), '第' + c.num + '章'].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function render() {
    const host = listEl();
    if (!host) return;
    const items = chapters().filter(matches);

    if (!items.length) {
      host.innerHTML = '<div class="card text-center" style="padding:36px">' +
        '<p class="muted mb-0">没有找到匹配的章节，换个关键词试试（例如“谐振”“三相”“戴维南”）。</p></div>';
      return;
    }

    host.innerHTML = items.map(function (c) {
      const read = CL.progress.isRead(c.id);
      const qs = CL.questionsFor(c.id).length;
      const quiz = CL.progress.all().quizzes[c.id];
      return '<a class="chapter-row' + (read ? ' done' : '') + '" href="chapter.html?id=' + c.id + '">' +
        '<span class="num">' + (read ? '✓' : c.num) + '</span>' +
        '<span>' +
          '<h3>' + CL.escape(c.title) + '</h3>' +
          '<p>' + CL.escape(c.summary) + '</p>' +
        '</span>' +
        '<span class="meta">' +
          (quiz ? '<span class="tag ok">自测 ' + quiz.best + '/' + quiz.total + '</span>' : '') +
          '<span class="tag">' + (c.minutes || 40) + ' 分钟</span>' +
          '<span class="tag">' + qs + ' 题</span>' +
          '<span class="tag accent">' + CL.escape(moduleName(c.module)) + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
  }

  function moduleName(id) {
    const m = modules().find(function (x) { return x.id === id; });
    return m ? m.name.replace(/^[一二三四五]、/, '') : id;
  }

  function buildFilters() {
    const box = document.getElementById('filters');
    if (!box) return;
    const all = chapters();
    const first = box.querySelector('[data-mod="all"]');
    if (first) first.textContent = '全部（' + all.length + '）';

    modules().forEach(function (m) {
      const n = all.filter(function (c) { return c.module === m.id; }).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn';
      btn.setAttribute('data-mod', m.id);
      btn.textContent = m.name + '（' + n + '）';
      btn.addEventListener('click', function () { setMod(m.id, btn); });
      box.insertBefore(btn, box.querySelector('.search-input'));
    });

    if (first) first.addEventListener('click', function () { setMod('all', first); });
  }

  function setMod(mod, btn) {
    state.mod = mod;
    document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    render();
  }

  function boot() {
    buildFilters();
    render();
    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value;
        render();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
