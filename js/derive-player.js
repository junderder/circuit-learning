/* =========================================================
   电路学堂 · 公式推导播放器
   用法：
     CL.mountDerivations(root)                     // 自动挂载 [data-derive="id"]
     CL.createDerivationPlayer(host, data, opts)   // 手动挂载
   ========================================================= */
(function () {
  'use strict';

  const CL = window.CL || {};

  function findData(id) {
    const list = window.DERIVATIONS || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  CL.derivation = findData;

  const prefersReduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function create(host, data, opts) {
    opts = opts || {};
    const steps = data.steps || [];
    const total = steps.length;
    let index = 0;
    let playing = false;
    let speed = 1;
    let timer = null;
    let token = 0;

    host.classList.add('derive-host');
    host.innerHTML =
      '<div class="dplayer" tabindex="0" role="group" aria-label="公式推导：' + CL.escape(data.title) + '">' +
        '<div class="dplayer-head">' +
          '<div class="dplayer-title"><span class="tag accent">推导</span>' + CL.escape(data.title) + '</div>' +
          '<div class="dplayer-step"><b>1</b> / ' + total + '</div>' +
        '</div>' +
        '<div class="dplayer-bar"><i></i></div>' +
        '<div class="dplayer-stage">' +
          '<div class="dplayer-eq" aria-live="polite"></div>' +
          '<div class="dplayer-note"></div>' +
        '</div>' +
        '<div class="dplayer-foot">' +
          '<button class="dbtn" type="button" data-act="prev" aria-label="上一步">‹</button>' +
          '<button class="dbtn play" type="button" data-act="play"><span class="pi">▶</span><span class="pl">播放推导</span></button>' +
          '<button class="dbtn" type="button" data-act="next" aria-label="下一步">›</button>' +
          '<button class="dbtn" type="button" data-act="restart" aria-label="重新播放">↻</button>' +
          '<label class="dspeed">速度' +
            '<select data-act="speed">' +
              '<option value="0.75">0.75×</option>' +
              '<option value="1" selected>1×</option>' +
              '<option value="1.5">1.5×</option>' +
            '</select></label>' +
          '<div class="dplayer-dots" role="tablist" aria-label="步骤"></div>' +
        '</div>' +
      '</div>';

    const root = host.querySelector('.dplayer');
    const eqEl = root.querySelector('.dplayer-eq');
    const noteEl = root.querySelector('.dplayer-note');
    const counter = root.querySelector('.dplayer-step b');
    const bar = root.querySelector('.dplayer-bar > i');
    const dots = root.querySelector('.dplayer-dots');
    const playBtn = root.querySelector('[data-act="play"]');
    const playIcon = playBtn.querySelector('.pi');
    const playLabel = playBtn.querySelector('.pl');

    dots.innerHTML = steps.map(function (s, i) {
      return '<button class="dplayer-dot" type="button" role="tab" data-i="' + i +
        '" aria-label="第 ' + (i + 1) + ' 步" aria-selected="' + (i === 0) + '"></button>';
    }).join('');

    function apply(i, animate) {
      const step = steps[i];
      if (!step) return;
      index = i;
      const doAnim = animate && !prefersReduced();

      const doSwap = function (withAnim) {
        eqEl.classList.remove('out');
        noteEl.classList.remove('out');
        eqEl.classList.remove('in');
        noteEl.classList.remove('in');
        eqEl.innerHTML = step.eq;
        noteEl.innerHTML = step.note || '';
        if (withAnim) {
          void eqEl.offsetWidth;          // 强制重排，保证动画能重新触发
          eqEl.classList.add('in');
          noteEl.classList.add('in');
        }
        if (typeof opts.onChange === 'function') opts.onChange(i);
      };

      if (!doAnim) {
        doSwap(false);
      } else {
        // 先让旧内容淡出，再换上新内容（<mark> 的高亮扫描随新内容自动播放）
        eqEl.classList.add('out');
        noteEl.classList.add('out');
        const my = ++token;
        setTimeout(function () {
          if (my !== token) return;   // 期间又切换了，放弃本次
          doSwap(true);
        }, 150);
      }

      counter.textContent = i + 1;
      bar.style.width = ((i + 1) / total * 100) + '%';
      dots.querySelectorAll('.dplayer-dot').forEach(function (d, k) {
        d.classList.toggle('active', k === i);
        d.classList.toggle('done', k < i);
        d.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
    }

    function stopTimer() {
      clearTimeout(timer);
      timer = null;
    }

    function setPlaying(on) {
      playing = on;
      root.classList.toggle('playing', on);
      playIcon.textContent = on ? '❚❚' : '▶';
      playLabel.textContent = on ? '暂停' : (index >= total - 1 ? '重新播放' : '播放推导');
      playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) schedule();
      else stopTimer();
    }

    function schedule() {
      stopTimer();
      if (!playing) return;
      if (index >= total - 1) { setPlaying(false); return; }
      const dur = (steps[index].dur || 2700) / speed;
      timer = setTimeout(function () {
        if (!playing) return;
        apply(index + 1, true);
        schedule();
      }, dur);
    }

    function play() {
      if (playing) { setPlaying(false); return; }
      if (index >= total - 1) apply(0, false);
      setPlaying(true);
    }

    root.addEventListener('click', function (e) {
      const dot = e.target.closest('.dplayer-dot');
      if (dot) {
        setPlaying(false);
        apply(Number(dot.getAttribute('data-i')), true);
        return;
      }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'play') play();
      else if (act === 'prev') { setPlaying(false); apply(Math.max(0, index - 1), true); }
      else if (act === 'next') { setPlaying(false); apply(Math.min(total - 1, index + 1), true); }
      else if (act === 'restart') { setPlaying(false); apply(0, false); }
    });

    root.querySelector('[data-act="speed"]').addEventListener('change', function (e) {
      speed = Number(e.target.value) || 1;
      if (playing) schedule();
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); apply(Math.min(total - 1, index + 1), true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); apply(Math.max(0, index - 1), true); }
      else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); play(); }
      else if (e.key === 'Home') { e.preventDefault(); setPlaying(false); apply(0, false); }
      else if (e.key === 'End') { e.preventDefault(); setPlaying(false); apply(total - 1, true); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && playing) setPlaying(false);
    });

    apply(0, false);

    return {
      el: root,
      go: function (i) { setPlaying(false); apply(Math.max(0, Math.min(total - 1, i)), true); },
      play: play,
      pause: function () { setPlaying(false); },
      destroy: function () { setPlaying(false); host.innerHTML = ''; },
      get index() { return index; }
    };
  }

  CL.createDerivationPlayer = create;

  /** 自动挂载作用域内所有 [data-derive] */
  CL.mountDerivations = function (scope) {
    scope = scope || document;
    scope.querySelectorAll('[data-derive]').forEach(function (host) {
      if (host.getAttribute('data-mounted')) return;
      const data = findData(host.getAttribute('data-derive'));
      if (!data) { host.remove(); return; }
      host.setAttribute('data-mounted', '1');
      create(host, data, {
        onChange: function (i) {
          const ev = new CustomEvent('derive:step', { detail: { id: data.id, index: i } });
          document.dispatchEvent(ev);
        }
      });
    });
  };
})();
