/* =========================================================
   电路学堂 · 练习页脚本
   三种模式：分章练习 / 随机综合 / 错题本
   ========================================================= */
(function () {
  'use strict';

  const app = () => document.getElementById('practice-app');
  const LETTERS = ['A', 'B', 'C', 'D'];
  const state = {
    screen: 'setup',
    mode: 'chapter',
    chId: '',
    questions: [],
    i: 0,
    correct: 0,
    answered: false,
    results: [],
    startedAt: 0
  };

  /* ---------------- 数据 ---------------- */
  function chapters() {
    return ((window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || []).slice().sort((a, b) => a.num - b.num);
  }
  function bank() { return window.QUIZ_BANK || []; }
  function chapterOf(id) { return CL.chapterById(id); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function levelName(lv) { return lv === 1 ? '基础' : lv === 2 ? '进阶' : '综合'; }
  function unusedParam(name) { return CL.qs(name, ''); }

  /* ---------------- 开始练习 ---------------- */
  function start(mode, chId, count) {
    let qs = [];
    state.mode = mode;
    state.chId = chId || '';
    state.i = 0;
    state.correct = 0;
    state.answered = false;
    state.results = [];
    state.startedAt = Date.now();

    if (mode === 'chapter') {
      qs = CL.questionsFor(state.chId);
      if (!qs.length) { CL.toast('该章节暂无题目'); return; }
      qs = shuffle(qs);
    } else if (mode === 'random') {
      qs = shuffle(bank());
      if (count && count > 0) qs = qs.slice(0, count);
    } else if (mode === 'wrong') {
      const ids = CL.progress.wrongList();
      qs = shuffle(bank().filter(function (q) { return ids.indexOf(q.id) >= 0; }));
      if (!qs.length) { CL.toast('错题本还是空的，先去做几道题吧'); return; }
      if (count && count > 0 && qs.length > count) qs = qs.slice(0, count);
    }

    state.questions = qs;
    state.screen = 'runner';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- 设置界面 ---------------- */
  function renderSetup() {
    const paramCh = unusedParam('ch');
    const wrongCount = CL.progress.wrongList().length;
    const list = chapters();
    const preset = paramCh && chapterOf(paramCh) ? paramCh : '';

    // 直接带 ?ch= 进入时自动开始分章练习
    if (preset) {
      setTimeout(function () { start('chapter', preset); }, 0);
      return;
    }

    let options = list.map(function (c) {
      return '<option value="' + c.id + '">第 ' + c.num + ' 章 · ' + CL.escape(CL.shortTitle(c)) + '（' + CL.questionsFor(c.id).length + ' 题）</option>';
    }).join('');

    app().innerHTML =
      '<div class="grid cols-3">' +
        '<div class="card pad-lg">' +
          '<span class="tag accent">模式一</span>' +
          '<h3 class="mt-1">分章练习</h3>' +
          '<p class="muted small">学完一章立刻做，趁热打铁。题目全部来自该章。</p>' +
          '<div class="field"><label for="ch-select">选择章节</label>' +
            '<select id="ch-select">' + options + '</select></div>' +
          '<button class="btn wide mt-2" type="button" id="start-chapter">开始本章练习</button>' +
        '</div>' +

        '<div class="card pad-lg">' +
          '<span class="tag violet">模式二</span>' +
          '<h3 class="mt-1">随机综合</h3>' +
          '<p class="muted small">从全部 ' + bank().length + ' 道题中随机抽取，检验整体掌握程度。</p>' +
          '<div class="field"><label for="random-count">题目数量</label>' +
            '<select id="random-count">' +
              '<option value="5">5 题 · 快速</option>' +
              '<option value="10" selected>10 题 · 标准</option>' +
              '<option value="20">20 题 · 强化</option>' +
              '<option value="0">全部（' + bank().length + ' 题）</option>' +
            '</select></div>' +
          '<button class="btn wide mt-2" type="button" id="start-random">开始随机练习</button>' +
        '</div>' +

        '<div class="card pad-lg">' +
          '<span class="tag warm">模式三</span>' +
          '<h3 class="mt-1">错题本</h3>' +
          '<p class="muted small">' +
            (wrongCount ? '目前有 <b>' + wrongCount + '</b> 道错题。答对即可移出。' : '错题本还是空的。做错的题会自动收集到这里。') +
          '</p>' +
          '<div class="field"><label>记录数量</label>' +
            '<div class="readout"><div class="row"><span class="lbl">待复习题目</span><span class="val">' + wrongCount + ' 道</span></div></div>' +
          '</div>' +
          '<button class="btn wide mt-2" type="button" id="start-wrong"' + (wrongCount ? '' : ' disabled') + '>复习错题</button>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-3" style="background:var(--surface-2)">' +
        '<div class="flex between flex-wrap center gap-2">' +
          '<div>' +
            '<h3 style="margin-bottom:4px">使用说明</h3>' +
            '<p class="muted small mb-0">答题后立即显示解析；错题自动进入错题本；成绩按“最好一次”记录在对应章节。</p>' +
          '</div>' +
          '<div class="chapter-nav">' +
            '<button class="btn ghost small" type="button" id="reset-all">清除全部练习记录</button>' +
            '<a class="btn ghost small" href="chapters.html">去看课程</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('start-chapter').addEventListener('click', function () {
      start('chapter', document.getElementById('ch-select').value);
    });
    document.getElementById('start-random').addEventListener('click', function () {
      start('random', '', Number(document.getElementById('random-count').value));
    });
    const wr = document.getElementById('start-wrong');
    if (wr) wr.addEventListener('click', function () { start('wrong', '', 0); });
    document.getElementById('reset-all').addEventListener('click', function () {
      if (confirm('确定清除所有练习记录与错题本吗？')) {
        CL.progress.reset();
        CL.toast('已清除练习记录');
        renderSetup();
      }
    });
  }

  /* ---------------- 答题界面 ---------------- */
  function renderRunner() {
    const q = state.questions[state.i];
    if (!q) { renderResult(); return; }
    const ch = chapterOf(q.ch);
    const total = state.questions.length;
    const pct = Math.round((state.i / total) * 100);

    app().innerHTML =
      '<div class="quiz-shell">' +
        '<div>' +
          '<div class="q-card">' +
            '<div class="q-meta">' +
              '<span class="tag accent">' + (ch ? '第 ' + ch.num + ' 章' : '') + '</span>' +
              '<span class="tag">' + levelName(q.level) + '</span>' +
              '<span>第 ' + (state.i + 1) + ' / ' + total + ' 题</span>' +
              '<span style="margin-left:auto">已答对 ' + state.correct + ' 题</span>' +
            '</div>' +
            '<div class="q-text">' + q.q + '</div>' +
            '<div class="options" id="options">' +
              q.options.map(function (opt, i) {
                return '<button class="option" type="button" data-i="' + i + '">' +
                  '<span class="key">' + LETTERS[i] + '</span><span>' + opt + '</span></button>';
              }).join('') +
            '</div>' +
            '<div id="explain-slot"></div>' +
            '<div class="flex between center mt-2">' +
              '<button class="btn ghost small" type="button" id="quit">结束练习</button>' +
              '<button class="btn" type="button" id="next" disabled>' + (state.i + 1 === total ? '查看结果 →' : '下一题 →') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<aside class="quiz-side">' +
          '<div class="card">' +
            '<h4 style="margin-bottom:2px">进度</h4>' +
            '<div class="progress-bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="kv"><span>当前模式</span><span>' + modeName(state.mode) + '</span></div>' +
            '<div class="kv"><span>已完成</span><span>' + state.i + ' / ' + total + '</span></div>' +
            '<div class="kv"><span>正确</span><span>' + state.correct + '</span></div>' +
            '<div class="kv"><span>正确率</span><span>' + (state.i ? Math.round((state.correct / state.i) * 100) + '%' : '—') + '</span></div>' +
            '<div class="mt-2"><a class="btn ghost small wide" href="chapters.html">返回课程</a></div>' +
          '</div>' +
        '</aside>' +
      '</div>';

    const opts = app().querySelectorAll('#options .option');
    const nextBtn = document.getElementById('next');
    const slot = document.getElementById('explain-slot');

    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.answered) return;
        state.answered = true;
        const pick = Number(btn.getAttribute('data-i'));
        const ok = pick === q.answer;
        if (ok) state.correct++;

        opts.forEach(function (b, i) {
          b.classList.add('disabled');
          if (i === q.answer) b.classList.add('correct');
        });
        if (!ok) btn.classList.add('wrong');
        btn.classList.add('chosen');

        // 记录
        state.results.push({ q: q, pick: pick, ok: ok });
        if (!ok) CL.progress.addWrong(q.id);
        else if (state.mode === 'wrong') CL.progress.removeWrong(q.id);

        slot.innerHTML = '<div class="explain">' +
          '<h5>' + (ok ? '✓ 回答正确' : '✗ 回答错误') + '　正确答案：' + LETTERS[q.answer] + '</h5>' +
          '<p>' + q.explain + '</p>' +
          (ch ? '<p class="small muted mb-0">对应知识点：第 ' + ch.num + ' 章 · ' + CL.escape(ch.title) + '　<a href="chapter.html?id=' + ch.id + '">回看 →</a></p>' : '') +
          '</div>';
        nextBtn.disabled = false;
        nextBtn.focus();
      });
    });

    nextBtn.addEventListener('click', function () {
      if (!state.answered) return;
      state.answered = false;
      state.i++;
      if (state.i >= total) renderResult();
      else renderRunner();
    });

    document.getElementById('quit').addEventListener('click', function () {
      if (state.i === 0 || confirm('确定结束本次练习吗？已答题目会计入错题本。')) {
        if (state.i > 0) renderResult();
        else { state.screen = 'setup'; renderSetup(); }
      }
    });
  }

  /* ---------------- 结果界面 ---------------- */
  function renderResult() {
    state.screen = 'result';
    const total = state.results.length;
    const correct = state.correct;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const used = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const secs = used >= 60 ? Math.floor(used / 60) + ' 分 ' + (used % 60) + ' 秒' : used + ' 秒';

    if (state.mode === 'chapter' && state.chId && total) {
      CL.progress.recordQuiz(state.chId, correct, total);
    }

    let comment = '先读一遍对应章节，再回来做一次。';
    if (pct >= 90) comment = '非常扎实！可以去做随机综合练习，检验跨章节的迁移能力。';
    else if (pct >= 75) comment = '掌握得不错。把错题对应的知识点回看一遍，再刷错题本。';
    else if (pct >= 60) comment = '基础还在，但不够稳。建议回看本章的“核心公式”和“易错点”。';
    else if (total > 0) comment = '别急，回到正文把例题重新推一遍，尤其是公式的适用条件。';

    const rows = state.results.map(function (r, i) {
      const ch = chapterOf(r.q.ch);
      return '<div class="result-item ' + (r.ok ? 'ok' : 'no') + '">' +
        '<span class="idx">' + (i + 1) + '</span>' +
        '<span>' + r.q.q + (ch ? ' <span class="muted small">（第 ' + ch.num + ' 章）</span>' : '') + '</span>' +
        '<span class="tag ' + (r.ok ? 'ok' : 'warm') + '">' + (r.ok ? '正确' : '错误') + '</span>' +
      '</div>';
    }).join('');

    app().innerHTML =
      '<div class="grid cols-2" style="align-items:stretch">' +
        '<div class="card pad-lg">' +
          '<span class="tag accent">' + modeName(state.mode) + '</span>' +
          '<div class="score-big mt-1">' + pct + '<span style="font-size:1.2rem">%</span></div>' +
          '<p class="muted small">答对 ' + correct + ' / ' + total + ' 题　用时 ' + secs + '</p>' +
          '<p style="margin-bottom:0">' + comment + '</p>' +
          '<div class="chapter-nav mt-2">' +
            '<button class="btn" type="button" id="again">再做一次</button>' +
            '<button class="btn ghost" type="button" id="to-wrong">看错题本</button>' +
            '<a class="btn ghost" href="chapters.html">返回课程</a>' +
          '</div>' +
        '</div>' +
        '<div class="card pad-lg">' +
          '<h3 style="margin-bottom:14px">本次答题明细</h3>' +
          (rows || '<p class="muted">没有作答记录。</p>') +
        '</div>' +
      '</div>';

    document.getElementById('again').addEventListener('click', function () {
      if (state.mode === 'chapter') start('chapter', state.chId);
      else if (state.mode === 'wrong') start('wrong', '', 0);
      else start('random', '', total);
    });
    document.getElementById('to-wrong').addEventListener('click', function () {
      start('wrong', '', 0);
    });
  }

  function modeName(m) {
    return m === 'chapter' ? '分章练习' : m === 'random' ? '随机综合' : '错题本';
  }

  function render() {
    if (state.screen === 'runner') renderRunner();
    else if (state.screen === 'result') renderResult();
    else renderSetup();
  }

  function boot() {
    // 无 ?ch= 时默认单章选择；若带 ch 参数则自动进入
    renderSetup();
    const search = new URLSearchParams(location.search);
    if (search.get('ch') && !CL.chapterById(search.get('ch'))) {
      CL.toast('未找到该章节，请重新选择');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
