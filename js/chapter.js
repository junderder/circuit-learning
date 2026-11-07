/* =========================================================
   电路学堂 · 章节详情页脚本
   ========================================================= */
(function () {
  'use strict';

  function chapters() {
    return ((window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || []).slice().sort((a, b) => a.num - b.num);
  }

  function render() {
    const article = document.getElementById('chapter-article');
    const toc = document.getElementById('toc');
    const list = chapters();
    const id = CL.qs('id', '');
    let ch = CL.chapterById(id);

    if (!ch) {
      // 没有参数或参数错误：默认第一章，并给出提示
      ch = list[0];
      if (!ch) {
        article.innerHTML = '<div class="card"><h2>内容加载失败</h2><p>未找到课程数据，请确认 js 目录完整。</p></div>';
        return;
      }
      if (id) CL.toast('未找到该章节，已为你打开第 1 章');
    }

    const idx = list.indexOf(ch);
    const prev = list[idx - 1];
    const next = list[idx + 1];
    const read = CL.progress.isRead(ch.id);
    const qs = CL.questionsFor(ch.id).length;

    document.title = '第 ' + ch.num + ' 章 ' + ch.title + ' · 电路学堂';

    /* ---------- 正文 ---------- */
    let html = '';
    html += '<div class="crumbs">' +
      '<a href="index.html">首页</a><span>/</span>' +
      '<a href="chapters.html">课程章节</a><span>/</span>' +
      '<span>第 ' + ch.num + ' 章</span></div>';

    html += '<header class="chapter-hero">' +
      '<div class="flex gap-1 flex-wrap center">' +
        '<span class="tag accent">第 ' + ch.num + ' 章</span>' +
        '<span class="tag">' + moduleName(ch.module) + '</span>' +
        '<span class="tag">约 ' + (ch.minutes || 40) + ' 分钟</span>' +
        '<span class="tag">' + qs + ' 道练习</span>' +
        (read ? '<span class="tag ok">已读完</span>' : '') +
      '</div>' +
      '<h1>' + CL.escape(ch.title) + '</h1>' +
      '<p class="lead">' + CL.escape(ch.summary) + '</p>' +
      '<div class="objectives"><h4>学习目标</h4><ul>' +
        ch.objectives.map(function (o) { return '<li>' + o + '</li>'; }).join('') +
      '</ul></div>' +
    '</header>';

    html += '<div class="prose">';
    ch.sections.forEach(function (s) {
      html += '<h2 id="' + s.id + '">' + s.title + '</h2>' + s.html;
    });

    // 核心公式
    if (ch.formulas && ch.formulas.length) {
      html += '<h2 id="sec-formulas">核心公式速记</h2>' +
        '<div class="formula-strip">' +
        ch.formulas.map(function (f) {
          return '<div class="formula-item"><div class="k">' + CL.mathify(f.k) + '</div><div class="v">' + CL.mathify(f.v) +
            (f.note ? '<div class="muted small" style="font-family:var(--sans);margin-top:2px">' + CL.mathify(f.note) + '</div>' : '') +
            '</div></div>';
        }).join('') +
        '</div>';
    }

    // 例题
    if (ch.examples && ch.examples.length) {
      html += '<h2 id="sec-examples">典型例题</h2>';
      ch.examples.forEach(function (ex, i) {
        html += '<div class="example">' +
          '<header><span class="badge">例 ' + (i + 1) + '</span><h4>' + CL.escape(ex.title) + '</h4></header>' +
          '<div class="body">' + ex.problem + '</div>' +
          '<details><summary>查看解答</summary><div class="answer">' + ex.answer + '</div></details>' +
        '</div>';
      });
    }

    // 易错点
    if (ch.mistakes && ch.mistakes.length) {
      html += '<h2 id="sec-mistakes">易错点清单</h2>' +
        '<div class="callout danger"><div class="ico">!</div><div>' +
        '<h4>阅卷时最常见的失分点</h4><ul>' +
        ch.mistakes.map(function (m) { return '<li>' + m + '</li>'; }).join('') +
        '</ul></div></div>';
    }

    // 公式推导动画（本章有则自动插入）
    const derivs = (window.DERIVATIONS || []).filter(function (d) { return d.ch === ch.id; });
    if (derivs.length) {
      html += '<h2 id="sec-derive">公式推导动画</h2>' +
        '<p class="muted small" style="margin-top:-.4em">点「播放推导」自动逐步演示，也可以用 <b>←</b> / <b>→</b> 和空格控制；每一步新出现的关键项会扫过高亮。</p>' +
        derivs.map(function (d) {
          return '<div class="derive-host" data-derive="' + d.id + '"></div>';
        }).join('');
    }
    html += '</div>';

    /* ---------- 页脚操作 ---------- */
    html += '<div class="chapter-footer">' +
      '<div class="chapter-nav">' +
        '<button class="btn' + (read ? ' ghost' : '') + '" id="mark-read" type="button">' +
          (read ? '取消“已读完”标记' : '✓ 标记本章为已读完') + '</button>' +
        '<a class="btn soft" href="practice.html?ch=' + ch.id + '">做本章练习（' + qs + ' 题）</a>' +
      '</div>' +
      '<div class="chapter-nav">' +
        (prev ? '<a class="btn ghost" href="chapter.html?id=' + prev.id + '">← 第 ' + prev.num + ' 章</a>' : '') +
        (next ? '<a class="btn ghost" href="chapter.html?id=' + next.id + '">第 ' + next.num + ' 章 →</a>' : '') +
      '</div>' +
    '</div>';

    article.innerHTML = html;
    if (CL.mountDerivations) CL.mountDerivations(article);

    /* ---------- 目录 ---------- */
    const tocItems = [];
    ch.sections.forEach(function (s) { tocItems.push({ id: s.id, title: s.title }); });
    if (ch.formulas && ch.formulas.length) tocItems.push({ id: 'sec-formulas', title: '核心公式速记' });
    if (ch.examples && ch.examples.length) tocItems.push({ id: 'sec-examples', title: '典型例题' });
    if (ch.mistakes && ch.mistakes.length) tocItems.push({ id: 'sec-mistakes', title: '易错点清单' });
    if (derivs.length) tocItems.push({ id: 'sec-derive', title: '公式推导动画' });

    toc.innerHTML = '<h4>本页目录</h4><ol>' +
      tocItems.map(function (t) {
        return '<li><a href="#' + t.id + '" data-target="' + t.id + '">' + t.title + '</a></li>';
      }).join('') +
      '</ol>' +
      '<div class="toc-foot">' +
        '<button class="btn small soft" id="toc-mark" type="button">标记已读完</button>' +
        '<a class="small" href="practice.html?ch=' + ch.id + '">去练习 →</a>' +
      '</div>';

    /* ---------- 交互 ---------- */
    const markBtn = document.getElementById('mark-read');
    const tocMark = document.getElementById('toc-mark');
    function toggleRead() {
      const now = !CL.progress.isRead(ch.id);
      CL.progress.markRead(ch.id, now);
      CL.toast(now ? '已标记为读完：第 ' + ch.num + ' 章' : '已取消标记');
      // 刷新按钮状态
      if (markBtn) {
        markBtn.textContent = now ? '取消“已读完”标记' : '✓ 标记本章为已读完';
        markBtn.classList.toggle('ghost', now);
      }
      if (tocMark) tocMark.textContent = now ? '已读完 ✓' : '标记已读完';
      const heroTag = article.querySelector('.chapter-hero .flex');
      if (heroTag) {
        const exists = heroTag.querySelector('.tag.ok');
        if (now && !exists) {
          const s = document.createElement('span');
          s.className = 'tag ok';
          s.textContent = '已读完';
          heroTag.appendChild(s);
        } else if (!now && exists) {
          exists.remove();
        }
      }
    }
    if (markBtn) markBtn.addEventListener('click', toggleRead);
    if (tocMark) tocMark.addEventListener('click', toggleRead);

    // 记录访问
    const p = CL.progress.all();
    p.visited = (p.visited || []).filter(function (x) { return x !== ch.id; });
    p.visited.push(ch.id);
    if (p.visited.length > 30) p.visited = p.visited.slice(-30);
    CL.progress.save(p);

    // 目录高亮
    setupTocSpy(toc);
    // 阅读进度条
    setupReadProgress();
  }

  function moduleName(id) {
    const mods = (window.CIRCUIT_DATA && window.CIRCUIT_DATA.modules) || [];
    const m = mods.find(function (x) { return x.id === id; });
    return m ? m.name.replace(/^[一二三四五]、/, '') : '';
  }

  function setupTocSpy(toc) {
    const links = Array.prototype.slice.call(toc.querySelectorAll('a[data-target]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const targets = links.map(function (a) { return document.getElementById(a.getAttribute('data-target')); })
      .filter(Boolean);

    const visible = new Set();
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });
      let activeId = null;
      for (let i = 0; i < targets.length; i++) {
        if (visible.has(targets[i].id)) { activeId = targets[i].id; break; }
      }
      links.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-target') === activeId);
      });
    }, { rootMargin: '-70px 0px -65% 0px', threshold: 0 });

    targets.forEach(function (t) { io.observe(t); });
  }

  function setupReadProgress() {
    const bar = document.getElementById('read-progress');
    if (!bar) return;
    function update() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
