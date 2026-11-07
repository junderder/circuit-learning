/* =========================================================
   电路学堂 · 共享脚本
   - 主题（亮/暗）与本地存储
   - 顶栏 / 页脚注入、移动端菜单
   - 学习进度、错题本
   - 通用小工具（toast、数值格式化、转义）
   ========================================================= */
(function () {
  'use strict';

  const CL = (window.CL = window.CL || {});
  const PREFIX = 'circuitlab.v1.';

  /* ---------------- 本地存储（带内存降级） ---------------- */
  const memory = {};
  let lsOK = true;
  try {
    const k = PREFIX + '__probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  } catch (e) {
    lsOK = false;
  }

  CL.store = {
    get(key, fallback) {
      try {
        const raw = lsOK ? localStorage.getItem(PREFIX + key) : memory[key];
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (lsOK) localStorage.setItem(PREFIX + key, raw);
        else memory[key] = raw;
      } catch (e) {
        memory[key] = raw;
      }
    },
    remove(key) {
      try {
        if (lsOK) localStorage.removeItem(PREFIX + key);
        delete memory[key];
      } catch (e) { /* ignore */ }
    },
    persistent: lsOK
  };

  /* ---------------- 进度数据 ---------------- */
  const DEFAULT_PROGRESS = {
    read: {},          // { chapterId: timestamp }
    quizzes: {},       // { chapterId: {best, total, at} }
    wrong: [],         // [questionId]
    solved: {},        // { questionId: timestamp }
    visited: [],       // [chapterId]
    lastAt: 0
  };

  const Progress = (CL.progress = {
    all() {
      const p = CL.store.get('progress', null);
      return Object.assign({}, DEFAULT_PROGRESS, p || {});
    },
    save(p) {
      CL.store.set('progress', p);
    },
    isRead(id) {
      return !!this.all().read[id];
    },
    readCount() {
      return Object.keys(this.all().read).length;
    },
    markRead(id, on) {
      const p = this.all();
      if (on === false) delete p.read[id];
      else p.read[id] = Date.now();
      p.lastAt = Date.now();
      this.save(p);
    },
    recordQuiz(chapterId, correct, total) {
      const p = this.all();
      const prev = p.quizzes[chapterId];
      const best = prev ? Math.max(prev.best, correct) : correct;
      p.quizzes[chapterId] = { best: best, total: total, at: Date.now() };
      p.lastAt = Date.now();
      this.save(p);
    },
    addWrong(id) {
      const p = this.all();
      if (!p.wrong.includes(id)) p.wrong.push(id);
      this.save(p);
    },
    removeWrong(id) {
      const p = this.all();
      p.wrong = p.wrong.filter(function (x) { return x !== id; });
      this.save(p);
    },
    wrongList() {
      return this.all().wrong;
    },
    reset() {
      CL.store.remove('progress');
    }
  });

  /* ---------------- 主题 ---------------- */
  const Theme = (CL.theme = {
    get() {
      const forced = CL.qs('theme', '');
      if (forced === 'light' || forced === 'dark') return forced;
      return CL.store.get('theme', null) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    },
    apply(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      const btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.setAttribute('aria-label', mode === 'dark' ? '切换到浅色模式' : '切换到深色模式');
        btn.innerHTML = mode === 'dark' ? iconSun() : iconMoon();
      }
    },
    toggle() {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      CL.store.set('theme', next);
      this.apply(next);
      if (next === 'dark') {
        document.querySelectorAll('canvas[data-redraw]').forEach(function (c) {
          if (typeof c.__redraw === 'function') c.__redraw();
        });
      }
    },
    init() {
      this.apply(this.get());
    }
  });

  /* ---------------- 图标 ---------------- */
  function iconSun() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>';
  }
  function iconMoon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/></svg>';
  }
  function iconMenu() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  }

  /* ---------------- 顶栏 / 页脚 ---------------- */
  const NAV = [
    { href: 'index.html', label: '首页', key: 'home' },
    { href: 'chapters.html', label: '课程章节', key: 'chapters' },
    { href: 'practice.html', label: '习题练习', key: 'practice' },
    { href: 'derivations.html', label: '公式推导', key: 'derive' },
    { href: 'tools.html', label: '交互工具', key: 'tools' },
    { href: 'formulas.html', label: '公式速查', key: 'formulas' }
  ];

  function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const page = document.body.getAttribute('data-page') || '';
    const links = NAV.map(function (n) {
      const cur = n.key === page ? ' aria-current="page"' : '';
      return '<a href="' + n.href + '"' + cur + '>' + n.label + '</a>';
    }).join('');
    host.className = 'site-header';
    host.innerHTML =
      '<div class="container header-inner">' +
        '<a class="brand" href="index.html">' +
          '<span class="brand-mark">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M3 12h3l2-5 3 10 2.5-7 2 4h5.5"/>' +
            '</svg>' +
          '</span>' +
          '<span>电路学堂<small>Circuit Lab</small></span>' +
        '</a>' +
        '<nav class="main-nav" id="main-nav" aria-label="主导航">' + links + '</nav>' +
        '<div class="header-tools">' +
          '<button class="icon-btn" id="theme-toggle" type="button" aria-label="切换主题"></button>' +
          '<button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="打开菜单" aria-expanded="false" aria-controls="main-nav">' + iconMenu() + '</button>' +
        '</div>' +
      '</div>';
  }

  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    host.className = 'site-footer';
    host.innerHTML =
      '<div class="container footer-inner">' +
        '<div>电路学堂 · 面向「电气工程及其自动化」专业电路课程的自学工具站</div>' +
        '<div class="footer-links">' +
          '<a href="chapters.html">课程</a>' +
          '<a href="practice.html">题库</a>' +
          '<a href="tools.html">工具</a>' +
          '<a href="formulas.html">公式</a>' +
          '<a href="#" id="reset-progress">清除本地进度</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 通用工具 ---------------- */
  CL.escape = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  let toastEl, toastTimer;
  CL.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  };

  /** 数值 + 工程单位前缀（auto range） */
  CL.eng = function (value, unit, digits) {
    if (!isFinite(value)) return '—';
    if (value === 0) return '0' + (unit ? ' ' + unit : '');
    const abs = Math.abs(value);
    const table = [
      [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
      [1e-3, 'm'], [1e-6, 'μ'], [1e-9, 'n'], [1e-12, 'p']
    ];
    let pick = table[table.length - 1];
    for (let i = 0; i < table.length; i++) {
      if (abs >= table[i][0] * 0.9999) { pick = table[i]; break; }
    }
    const v = value / pick[0];
    const d = digits == null ? (Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 10 ? 2 : 3) : digits;
    let s = v.toFixed(d);
    if (Math.abs(parseFloat(s)) >= 1000 && pick !== table[0]) {
      // 例如 999.9 mV 四舍五入到 1000 → 提升一档
      const idx = table.indexOf(pick);
      if (idx > 0) {
        pick = table[idx - 1];
        s = (value / pick[0]).toFixed(Math.abs(value / pick[0]) >= 100 ? 1 : 2);
      }
    }
    return s + ' ' + pick[1] + unit;
  };

  CL.fmt = function (value, digits) {
    if (!isFinite(value)) return '—';
    if (value === 0) return '0';
    const abs = Math.abs(value);
    const d = digits == null ? (abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : 3) : digits;
    return parseFloat(value.toFixed(d)).toString();
  };

  CL.sign = function (value, digits) {
    const s = CL.fmt(value, digits);
    return value > 0 ? '+' + s : s;
  };

  /** 相位角，度 */
  CL.phaseDeg = function (value) {
    let deg = (value * 180) / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    return deg;
  };

  CL.qs = function (name, fallback) {
    const v = new URLSearchParams(location.search).get(name);
    return v == null ? fallback : v;
  };

  CL.clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* 章节短名（用于紧凑的标签展示） */
  const SHORT_TITLES = {
    variables: '电路变量',
    elements: '电阻与电源',
    'kcl-kvl': '基尔霍夫定律',
    analysis: '一般分析法',
    theorems: '电路定理',
    opamp: '运算放大器',
    storage: '电容与电感',
    'first-order': '一阶电路',
    'second-order': '二阶电路',
    phasor: '相量法',
    'ac-analysis': '正弦稳态分析',
    'ac-power': '功率与因数',
    'three-phase': '三相电路',
    coupled: '互感与变压器',
    frequency: '频率响应与谐振',
    twoport: '二端口网络',
    advanced: '非正弦与拉氏'
  };
  CL.shortTitle = function (ch) {
    if (!ch) return '';
    return SHORT_TITLES[ch.id] || ch.title;
  };

  /** 把 a_b、x^2 这类写法转成下标/上标，用于公式展示 */
  CL.mathify = function (s) {
    if (!s) return '';
    return String(s)
      .replace(/([A-Za-zΔΩωφμ])((?:_[A-Za-z0-9ΔΩωφμ]+)+)/g, function (m, base, rest) {
        return base + rest.replace(/_([A-Za-z0-9ΔΩωφμ]+)/g, '<sub>$1</sub>');
      })
      .replace(/\^\(([^()]+)\)/g, '<sup>($1)</sup>')
      .replace(/\^([A-Za-z0-9+]+)/g, '<sup>$1</sup>');
  };

  CL.chapterById = function (id) {    const list = (window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  CL.chapterIndex = function (id) {
    const list = (window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  };
  CL.questionsFor = function (chapterId) {
    const bank = window.QUIZ_BANK || [];
    return bank.filter(function (q) { return q.ch === chapterId; });
  };

  /* ---------------- 初始化 ---------------- */
  function init() {
    buildHeader();
    buildFooter();
    Theme.init();   // 顶栏按钮已就绪，这里才能写入图标

    const tb = document.getElementById('theme-toggle');
    if (tb) tb.addEventListener('click', function () { Theme.toggle(); });

    const navToggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('main-nav');
    if (navToggle && nav) {
      navToggle.addEventListener('click', function () {
        const open = nav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') nav.classList.remove('open');
      });
    }

    const reset = document.getElementById('reset-progress');
    if (reset) {
      reset.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('确定要清除本浏览器中保存的学习进度、错题本和自测成绩吗？此操作不可撤销。')) {
          Progress.reset();
          CL.toast('本地进度已清除');
          setTimeout(function () { location.reload(); }, 700);
        }
      });
    }

    if (!lsOK) {
      CL.toast('当前浏览器禁用了本地存储，进度只在本次会话内有效');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
