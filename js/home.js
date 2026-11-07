/* =========================================================
   电路学堂 · 首页脚本
   ========================================================= */
(function () {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  function chapterList() {
    return ((window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || []).slice()
      .sort((a, b) => a.num - b.num);
  }
  function modules() {
    return (window.CIRCUIT_DATA && window.CIRCUIT_DATA.modules) || [];
  }

  /* ---------- 进度环 ---------- */
  function renderProgress() {
    const list = chapterList();
    const total = list.length || 1;
    const read = CL.progress.readCount();
    const pct = Math.round((read / total) * 100);

    const ring = document.getElementById('ring');
    if (ring) ring.style.setProperty('--p', pct);
    setText('ring-text', pct + '%');
    setText('stat-read', String(read));

    let title = '还没有开始';
    if (read > 0 && read < total) title = '已学 ' + read + ' / ' + total + ' 章';
    if (read >= total && total > 1) title = '全部章节已读完';

    setText('ring-title', title);
    setText('ring-sub', pct === 0
      ? '完成章节阅读与课后练习即可累计进度'
      : (pct >= 100 ? '建议回到错题本查漏补缺，再做几套随机练习' : '继续保持，下一章的内容会用到前面的知识'));

    // 平均正确率
    const p = CL.progress.all();
    const quizes = Object.keys(p.quizzes);
    let rate = '0%';
    if (quizes.length) {
      let sum = 0, cnt = 0;
      quizes.forEach(function (k) {
        const q = p.quizzes[k];
        if (q && q.total) { sum += q.best / q.total; cnt++; }
      });
      rate = Math.round((sum / cnt) * 100) + '%';
    }
    setText('stat-quiz', rate);
  }

  /* ---------- 继续学习 ---------- */
  function renderContinue() {
    const host = document.getElementById('continue-card');
    if (!host) return;
    const list = chapterList();
    if (!list.length) return;

    const p = CL.progress.all();
    let target = null;
    if (p.visited && p.visited.length) {
      const last = p.visited[p.visited.length - 1];
      target = list.find(function (c) { return c.id === last; }) || null;
    }
    if (!target) target = list.find(function (c) { return !CL.progress.isRead(c.id); }) || list[0];

    const idx = list.indexOf(target);
    const next = list[idx + 1];
    const done = CL.progress.isRead(target.id);

    host.innerHTML =
      '<div class="card pad-lg">' +
        '<div class="flex between flex-wrap gap-2 center">' +
          '<div style="min-width:240px">' +
            '<div class="flex gap-1 center mb-2">' +
              '<span class="tag accent">第 ' + target.num + ' 章</span>' +
              '<span class="tag">' + (target.minutes || 40) + ' 分钟</span>' +
              (done ? '<span class="tag ok">已读完</span>' : '') +
            '</div>' +
            '<h3 style="margin-bottom:6px">' + target.title + '</h3>' +
            '<p class="muted mb-0" style="max-width:60ch">' + target.summary + '</p>' +
          '</div>' +
          '<div class="chapter-nav">' +
            '<a class="btn" href="chapter.html?id=' + target.id + '">' + (done ? '再读一遍' : '开始阅读') + ' →</a>' +
            '<a class="btn ghost" href="practice.html?ch=' + target.id + '">本章练习</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (next
        ? '<p class="muted small mt-1" style="padding-left:4px">下一章：第 ' + next.num + ' 章 · ' + next.title + '</p>'
        : '<p class="muted small mt-1" style="padding-left:4px">这是最后一章，可以开始做整卷随机练习了。</p>');
  }

  /* ---------- 模块列表 ---------- */
  function renderModules() {
    const host = document.getElementById('module-list');
    if (!host) return;
    const list = chapterList();
    const mods = modules();

    host.innerHTML = mods.map(function (m) {
      const chs = list.filter(function (c) { return c.module === m.id; });
      const done = chs.filter(function (c) { return CL.progress.isRead(c.id); }).length;
      const pct = chs.length ? Math.round((done / chs.length) * 100) : 0;
      return '<div class="card">' +
        '<div class="flex between center gap-1">' +
          '<h3 style="margin:0;font-size:1rem">' + m.name + '</h3>' +
          '<span class="tag">' + done + '/' + chs.length + '</span>' +
        '</div>' +
        '<p class="muted small" style="margin:6px 0 12px">' + m.desc + '</p>' +
        '<div style="height:6px;border-radius:99px;background:var(--bg-soft);overflow:hidden;margin-bottom:14px">' +
          '<i style="display:block;height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--accent),var(--accent-2))"></i>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          chs.map(function (c) {
            return '<a class="tag' + (CL.progress.isRead(c.id) ? ' ok' : '') + '" style="text-decoration:none" ' +
              'href="chapter.html?id=' + c.id + '" title="' + CL.escape(c.title) + '">' + c.num + '. ' +
              CL.escape(CL.shortTitle(c)) + '</a>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 今日一题 ---------- */
  let dailyIndex = -1;
  function renderDaily() {
    const host = document.getElementById('daily-quiz');
    if (!host) return;
    const bank = window.QUIZ_BANK || [];
    if (!bank.length) { host.innerHTML = '<p class="muted">题库加载失败。</p>'; return; }

    // 每天相对固定的题：以日期为种子，但允许换题
    if (dailyIndex < 0) {
      const d = new Date();
      const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
      dailyIndex = seed % bank.length;
    }
    const q = bank[dailyIndex];
    const ch = CL.chapterById(q.ch);
    const letters = ['A', 'B', 'C', 'D'];

    host.innerHTML =
      '<div class="q-card">' +
        '<div class="q-meta">' +
          '<span class="tag accent">' + (ch ? '第 ' + ch.num + ' 章 · ' + ch.title : q.ch) + '</span>' +
          '<span class="tag">' + levelName(q.level) + '</span>' +
          '<span class="muted" style="margin-left:auto">随机抽题 · 不计入成绩</span>' +
        '</div>' +
        '<div class="q-text">' + q.q + '</div>' +
        '<div class="options" id="daily-options">' +
          q.options.map(function (opt, i) {
            return '<button class="option" type="button" data-i="' + i + '">' +
              '<span class="key">' + letters[i] + '</span><span>' + opt + '</span></button>';
          }).join('') +
        '</div>' +
        '<div id="daily-explain"></div>' +
        '<div class="flex between center mt-2">' +
          '<a class="muted small" href="chapter.html?id=' + q.ch + '">回本章复习 →</a>' +
          '<button class="btn ghost small" type="button" id="daily-next">换一题</button>' +
        '</div>' +
      '</div>';

    const opts = host.querySelectorAll('#daily-options .option');
    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const pick = Number(btn.getAttribute('data-i'));
        const ok = pick === q.answer;
        opts.forEach(function (b, i) {
          b.classList.add('disabled');
          if (i === q.answer) b.classList.add('correct');
        });
        if (!ok) btn.classList.add('wrong');
        const box = document.getElementById('daily-explain');
        box.innerHTML = '<div class="explain">' +
          '<h5>' + (ok ? '答对了' : '答错了') + ' · 正确答案 ' + letters[q.answer] + '</h5>' +
          '<p>' + q.explain + '</p></div>';
        if (!ok) CL.progress.addWrong(q.id);
      });
    });

    document.getElementById('daily-next').addEventListener('click', function () {
      dailyIndex = Math.floor(Math.random() * bank.length);
      renderDaily();
    });
  }

  function levelName(lv) {
    return lv === 1 ? '基础' : lv === 2 ? '进阶' : '综合';
  }

  function boot() {
    setText('stat-chapters', String(chapterList().length));
    setText('stat-qcount', String((window.QUIZ_BANK || []).length));
    renderProgress();
    renderContinue();
    renderModules();
    renderDaily();
    if (CL.mountDerivations) CL.mountDerivations(document);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
