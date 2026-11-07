/* =========================================================
   电路学堂 · 交互工具
   1) 分压 / 分流      2) RC / RL 响应
   3) RLC 阻抗与谐振   4) 三相电路
   5) 电阻色环         6) 最大功率传输
   ========================================================= */
(function () {
  'use strict';

  /* ================= 公共工具 ================= */
  const TH = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      text: v('--text'), mute: v('--text-mute'), soft: v('--text-soft'),
      border: v('--border'), surface: v('--surface'), bg: v('--bg-soft'),
      accent: v('--accent'), accent2: v('--accent-2'), warm: v('--warm'),
      violet: v('--violet'), ok: v('--ok'), danger: v('--danger')
    };
  };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /** 挂一个可重绘的 canvas */
  function chart(canvas, draw) {
    function redraw() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height || 260;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, TH());
    }
    canvas.__redraw = redraw;
    redraw();
    if (window.ResizeObserver) {
      let last = 0;
      new ResizeObserver(function () {
        const w = canvas.getBoundingClientRect().width;
        if (Math.abs(w - last) > 1) { last = w; redraw(); }
      }).observe(canvas);
    }
    return redraw;
  }

  function axes(ctx, box, theme) {
    const { x0, y0, x1, y1 } = box;
    ctx.save();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rows = 4;
    for (let i = 0; i <= rows; i++) {
      const y = y0 + (y1 - y0) * (i / rows);
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    const cols = 5;
    for (let i = 0; i <= cols; i++) {
      const x = x0 + (x1 - x0) * (i / cols);
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    ctx.globalAlpha = .55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.mute;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function label(ctx, text, x, y, color, align, size) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = (size || 11) + 'px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, width) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const head = 8;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** 数值输入控件 */
  function numField(o) {
    const wrap = el('div', 'field');
    const id = 'n' + Math.random().toString(36).slice(2, 8);
    wrap.innerHTML = '<label for="' + id + '"><span>' + o.label + '</span><span class="muted small">' +
      (o.unit || '') + '</span></label>' +
      '<input id="' + id + '" type="number" value="' + o.value + '" min="' + (o.min != null ? o.min : '') +
      '" max="' + (o.max != null ? o.max : '') + '" step="' + (o.step || 'any') + '">';
    const input = wrap.querySelector('input');
    input.addEventListener('input', function () { if (o.oninput) o.oninput(parseFloat(input.value)); });
    input.addEventListener('change', function () { if (o.onchange) o.onchange(parseFloat(input.value)); });
    return {
      el: wrap,
      input: input,
      get: function () { return parseFloat(input.value) || 0; },
      set: function (v) { input.value = v; }
    };
  }

  /** 范围滑块控件 */
  function rangeField(o) {
    const wrap = el('div', 'field');
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    wrap.innerHTML = '<label for="' + id + '"><span>' + o.label + '</span>' +
      '<output id="' + id + 'o"></output></label>' +
      '<input id="' + id + '" type="range" min="' + o.min + '" max="' + o.max +
      '" step="' + o.step + '" value="' + o.value + '">';
    const input = wrap.querySelector('input');
    const out = wrap.querySelector('output');
    function fmt(v) { return (o.format ? o.format(v) : CL.fmt(v, o.digits == null ? 2 : o.digits)) + (o.unit ? ' ' + o.unit : ''); }
    function sync() { out.textContent = fmt(parseFloat(input.value)); }
    input.addEventListener('input', function () {
      sync();
      if (o.oninput) o.oninput(parseFloat(input.value));
    });
    sync();
    return {
      el: wrap,
      input: input,
      get: function () { return parseFloat(input.value); },
      set: function (v) { input.value = v; sync(); },
      sync: sync
    };
  }

  /** 读数行 */
  function row(lbl, val, hl) {
    return '<div class="row' + (hl ? ' hl' : '') + '"><span class="lbl">' + lbl +
      '</span><span class="val">' + val + '</span></div>';
  }
  const U = (v, unit) => CL.eng(v, unit);

  /* ============================================================
     工具 1：分压 / 分流
     ============================================================ */
  function buildDivider(host) {
    host.innerHTML =
      '<div class="tool-grid">' +
        '<div class="card controls" id="dv-controls"></div>' +
        '<div>' +
          '<div class="canvas-wrap" style="padding:18px">' +
            '<div class="tool-note" id="dv-desc" style="margin-bottom:12px"></div>' +
            '<div id="dv-formula" class="eq" style="margin:0 0 16px"></div>' +
            '<div class="flex between small muted" style="margin-bottom:4px">' +
              '<span>电压 / 电流分配（比例条）</span><span id="dv-ratio"></span></div>' +
            '<div style="height:26px;border-radius:8px;overflow:hidden;display:flex;border:1px solid var(--border)" id="dv-bar"></div>' +
            '<div class="flex between small muted mt-1"><span id="dv-bar-a"></span><span id="dv-bar-b"></span></div>' +
            '<div class="readout mt-3" id="dv-out"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const controls = document.getElementById('dv-controls');
    const modeSel = el('div', 'field');
    modeSel.innerHTML = '<label for="dv-mode"><span>计算类型</span></label>' +
      '<select id="dv-mode"><option value="v">串联分压（电压源）</option><option value="i">并联分流（电流源）</option></select>';
    controls.appendChild(modeSel);

    const src = numField({ label: '电压源 u<sub>s</sub>', unit: 'V', value: 12, min: 0, step: 1, oninput: calc });
    const isrc = numField({ label: '电流源 i<sub>s</sub>', unit: 'A', value: 3, min: 0, step: 0.1, oninput: calc });
    const r1 = numField({ label: '电阻 R<sub>1</sub>', unit: 'Ω', value: 1000, min: 0, step: 10, oninput: calc });
    const r2 = numField({ label: '电阻 R<sub>2</sub>', unit: 'Ω', value: 2000, min: 0, step: 10, oninput: calc });
    controls.appendChild(src.el);
    controls.appendChild(isrc.el);
    controls.appendChild(r1.el);
    controls.appendChild(r2.el);

    const presets = el('div', 'flex gap-1 flex-wrap');
    presets.innerHTML = '<button class="btn ghost small" data-set="1000,1000" type="button">等分</button>' +
      '<button class="btn ghost small" data-set="100,900" type="button">1 : 9</button>' +
      '<button class="btn ghost small" data-set="1000,9000" type="button">1 : 9 十进</button>';
    controls.appendChild(presets);

    const out = document.getElementById('dv-out');
    const desc = document.getElementById('dv-desc');
    const fml = document.getElementById('dv-formula');
    const bar = document.getElementById('dv-bar');
    const barA = document.getElementById('dv-bar-a');
    const barB = document.getElementById('dv-bar-b');
    const ratio = document.getElementById('dv-ratio');

    function calc() {
      const m = document.getElementById('dv-mode').value;
      const R1 = Math.max(1e-6, r1.get());
      const R2 = Math.max(1e-6, r2.get());
      const isV = m === 'v';
      src.el.classList.toggle('hidden', !isV);
      isrc.el.classList.toggle('hidden', isV);

      let html = '', f = '', p1, p2, total, share1, a, b;

      if (isV) {
        const Us = src.get();
        const I = Us / (R1 + R2);
        const U1 = I * R1, U2 = I * R2;
        p1 = I * I * R1; p2 = I * I * R2; total = Us * I;
        share1 = U1 / (U1 + U2 || 1);
        a = 'u<sub>1</sub> = ' + U(U1, 'V'); b = 'u<sub>2</sub> = ' + U(U2, 'V');
        desc.textContent = 'R₁ 与 R₂ 串联，流过同一电流，电压按阻值正比例分配。';
        f = 'u<sub>2</sub> = R<sub>2</sub> ÷ (R<sub>1</sub> + R<sub>2</sub>) × u<sub>s</sub> = ' +
          R2 + ' ÷ (' + R1 + ' + ' + R2 + ') × ' + Us + ' V';
        html += row('电流 i', U(I, 'A'), true);
        html += row('u<sub>1</sub>（R<sub>1</sub> 上）', U(U1, 'V'));
        html += row('u<sub>2</sub>（R<sub>2</sub> 上）', U(U2, 'V'), true);
        html += row('P<sub>1</sub> / P<sub>2</sub>', U(p1, 'W') + ' / ' + U(p2, 'W'));
        html += row('电源输出功率', U(total, 'W'));
      } else {
        const Is = isrc.get();
        const Req = R1 * R2 / (R1 + R2);
        const Uend = Is * Req;
        const I1 = Uend / R1, I2 = Uend / R2;
        p1 = I1 * I1 * R1; p2 = I2 * I2 * R2; total = Uend * Is;
        share1 = I1 / (Is || 1);
        a = 'i<sub>1</sub> = ' + U(I1, 'A'); b = 'i<sub>2</sub> = ' + U(I2, 'A');
        desc.textContent = 'R₁ 与 R₂ 并联，承受同一电压，电流按电导（电阻的倒数）分配。';
        f = 'i<sub>1</sub> = R<sub>2</sub> ÷ (R<sub>1</sub> + R<sub>2</sub>) × i<sub>s</sub> = ' +
          R2 + ' ÷ (' + R1 + ' + ' + R2 + ') × ' + Is + ' A';
        html += row('等效电阻 R<sub>1</sub> ∥ R<sub>2</sub>', U(Req, 'Ω'));
        html += row('端电压 u', U(Uend, 'V'), true);
        html += row('i<sub>1</sub>', U(I1, 'A'), true);
        html += row('i<sub>2</sub>', U(I2, 'A'));
        html += row('P<sub>1</sub> / P<sub>2</sub>', U(p1, 'W') + ' / ' + U(p2, 'W'));
        html += row('电源输出功率', U(total, 'W'));
      }
      out.innerHTML = html;
      fml.innerHTML = f;
      const w1 = Math.max(0, Math.min(100, share1 * 100));
      bar.innerHTML = '<i style="width:' + w1 + '%;background:var(--accent);display:block"></i>' +
        '<i style="width:' + (100 - w1) + '%;background:var(--accent-2);opacity:.45;display:block"></i>';
      barA.innerHTML = a;
      barB.innerHTML = b;
      ratio.textContent = CL.fmt(w1, 1) + '% : ' + CL.fmt(100 - w1, 1) + '%';
    }

    document.getElementById('dv-mode').addEventListener('change', calc);
    presets.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const v = btn.getAttribute('data-set').split(',');
      r1.set(v[0]); r2.set(v[1]);
      calc();
    });
    calc();
    return;
  }

  /* ============================================================
     工具 2：RC / RL 响应
     ============================================================ */
  function buildRC(host) {
    host.innerHTML =
      '<div class="tool-grid">' +
        '<div class="card controls" id="rc-controls"></div>' +
        '<div>' +
          '<div class="canvas-wrap">' +
            '<canvas class="chart" id="rc-canvas"></canvas>' +
            '<div class="canvas-legend"><span><i style="background:var(--accent)"></i>响应</span>' +
            '<span><i style="background:var(--warm)"></i>t = τ 时刻</span>' +
            '<span><i style="background:var(--violet)"></i>当前游标</span>' +
            '<span id="rc-fml" style="margin-left:auto"></span></div>' +
          '</div>' +
          '<div class="readout mt-2" id="rc-out"></div>' +
        '</div>' +
      '</div>';

    const controls = document.getElementById('rc-controls');
    const typeSel = el('div', 'field');
    typeSel.innerHTML = '<label for="rc-type"><span>电路类型</span></label>' +
      '<select id="rc-type"><option value="rc">RC 充电（看 u_C）</option><option value="rl">RL 充电（看 i_L）</option></select>';
    controls.appendChild(typeSel);

    const R = rangeField({ label: '电阻 R', min: 0.1, max: 20, step: 0.1, value: 2, unit: 'kΩ', digits: 1, oninput: draw });
    const C = rangeField({ label: '电容 C', min: 0.5, max: 200, step: 0.5, value: 47, unit: 'μF', digits: 1, oninput: draw });
    const L = rangeField({ label: '电感 L', min: 1, max: 500, step: 1, value: 100, unit: 'mH', digits: 0, oninput: draw });
    const Usrc = rangeField({ label: '电源 u<sub>s</sub>', min: 1, max: 24, step: 1, value: 10, unit: 'V', digits: 0, oninput: draw });
    const cursor = rangeField({ label: '时间游标', min: 0, max: 5, step: 0.05, value: 1, unit: 'τ', digits: 2, oninput: draw });
    controls.appendChild(R.el);
    controls.appendChild(C.el);
    controls.appendChild(L.el);
    controls.appendChild(Usrc.el);
    controls.appendChild(cursor.el);

    const canvas = document.getElementById('rc-canvas');
    const out = document.getElementById('rc-out');

    function params() {
      const type = document.getElementById('rc-type').value;
      const r = R.get() * 1000;
      const c = C.get() * 1e-6;
      const l = L.get() * 1e-3;
      const tau = type === 'rc' ? r * c : l / r;
      const Us = Usrc.get();
      const final = type === 'rc' ? Us : Us / r;
      return { type: type, r: r, c: c, l: l, tau: tau, Us: Us, final: final };
    }

    function respFrac(t, tau) { return 1 - Math.exp(-t / tau); }

    function draw() {
      const p = params();
      const isRC = p.type === 'rc';
      C.el.classList.toggle('hidden', !isRC);
      L.el.classList.toggle('hidden', isRC);

      const cur = cursor.get() * p.tau;
      const curVal = p.final * respFrac(cur, p.tau);

      const unit = isRC ? 'V' : 'A';
      const fmlEl = document.getElementById('rc-fml');
      if (fmlEl) {
        fmlEl.innerHTML = isRC
          ? 'u<sub>C</sub>(t) = U<sub>s</sub>(1 − e<sup>−t/τ</sup>)'
          : 'i<sub>L</sub>(t) = (U<sub>s</sub>/R)(1 − e<sup>−t/τ</sup>)';
      }
      out.innerHTML =
        row('时间常数 τ', (p.tau < 1e-3 ? (p.tau * 1e6).toFixed(1) + ' μs' : p.tau < 1 ? (p.tau * 1e3).toFixed(2) + ' ms' : p.tau.toFixed(3) + ' s'), true) +
        row('稳态值', U(p.final, unit)) +
        row('游标 t = ' + cursor.get().toFixed(2) + ' τ 时的值', U(curVal, unit), true) +
        row('达到 63.2% 的时间', '1 τ = ' + (p.tau < 1 ? (p.tau * 1e3).toFixed(2) + ' ms' : p.tau.toFixed(3) + ' s')) +
        row('稳态储能', isRC ? U(.5 * p.c * p.Us * p.Us, 'J') : U(.5 * p.l * p.final * p.final, 'J'));

      chart(canvas, function (ctx, w, h, theme) {
        const pad = { l: 62, r: 18, t: 18, b: 34 };
        const box = { x0: pad.l, y0: pad.t, x1: w - pad.r, y1: h - pad.b };
        axes(ctx, box, theme);
        const T = 5 * p.tau;
        const X = (t) => box.x0 + (t / T) * (box.x1 - box.x0);
        const Y = (v) => box.y1 - (v / p.final) * (box.y1 - box.y0);

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = theme.warm;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(X(p.tau), box.y0);
        ctx.lineTo(X(p.tau), box.y1);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'τ', X(p.tau), box.y0 - 7, theme.warm, 'center');

        ctx.save();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const N = 240;
        for (let i = 0; i <= N; i++) {
          const t = (T * i) / N;
          const v = p.final * respFrac(t, p.tau);
          const x = X(t), y = Y(v);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = theme.mute;
        ctx.globalAlpha = .7;
        ctx.beginPath();
        ctx.moveTo(box.x0, Y(p.final * 0.632));
        ctx.lineTo(box.x1, Y(p.final * 0.632));
        ctx.stroke();
        ctx.restore();
        label(ctx, '63.2%', box.x0 + 4, Y(p.final * 0.632) - 9, theme.mute);

        const cx = X(cur), cy = Y(curVal);
        ctx.save();
        ctx.strokeStyle = theme.violet;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, box.y0);
        ctx.lineTo(cx, box.y1);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.fillStyle = theme.violet;
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        for (let k = 0; k <= 5; k++) {
          label(ctx, k === 0 ? '0' : k + 'τ', X(k * p.tau), box.y1 + 14, theme.mute, 'center');
        }
        [0, 0.25, 0.5, 0.75, 1].forEach(function (fr) {
          label(ctx, U(p.final * fr, unit), box.x0 - 8, Y(p.final * fr), theme.mute, 'right');
        });
      });
    }

    document.getElementById('rc-type').addEventListener('change', draw);
    draw();
    return;
  }

  /* ============================================================
     工具 3：RLC 阻抗与谐振
     ============================================================ */
  function buildRLC(host) {
    host.innerHTML =
      '<div class="tool-grid">' +
        '<div class="card controls">' +
          '<div id="rlc-controls"></div>' +
          '<button class="btn soft wide mt-2" type="button" id="rlc-res">跳到谐振频率 f₀</button>' +
        '</div>' +
        '<div>' +
          '<div class="canvas-wrap">' +
            '<canvas class="chart" id="rlc-canvas"></canvas>' +
            '<div class="canvas-legend"><span><i style="background:var(--accent)"></i>|Z|(f)</span>' +
            '<span><i style="background:var(--warm)"></i>f₀ 谐振点</span>' +
            '<span><i style="background:var(--violet)"></i>当前频率</span></div>' +
          '</div>' +
          '<div class="grid cols-2 mt-2" style="align-items:start">' +
            '<div class="canvas-wrap"><canvas class="chart sm" id="rlc-phasor"></canvas>' +
              '<div class="canvas-legend">相量图：Ù_R、Ù_L、Ù_C 与总电压 Ù</div></div>' +
            '<div class="readout" id="rlc-out"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const box = document.getElementById('rlc-controls');
    const R = rangeField({ label: '电阻 R', min: 1, max: 200, step: 1, value: 20, unit: 'Ω', digits: 0, oninput: draw });
    const L = rangeField({ label: '电感 L', min: 0.5, max: 200, step: 0.5, value: 50, unit: 'mH', digits: 1, oninput: draw });
    const C = rangeField({ label: '电容 C', min: 0.5, max: 200, step: 0.5, value: 20, unit: 'μF', digits: 1, oninput: draw });
    const F = rangeField({ label: '频率 f', min: 10, max: 5000, step: 5, value: 159, unit: 'Hz', digits: 0, oninput: draw });
    const Us = rangeField({ label: '电源 u<sub>s</sub>', min: 1, max: 220, step: 1, value: 100, unit: 'V', digits: 0, oninput: draw });
    [R, L, C, F, Us].forEach(function (f) { box.appendChild(f.el); });

    const canvas = document.getElementById('rlc-canvas');
    const pcanvas = document.getElementById('rlc-phasor');
    const out = document.getElementById('rlc-out');

    function params() {
      const r = R.get(), l = L.get() * 1e-3, c = C.get() * 1e-6, f = F.get(), us = Us.get();
      const w = 2 * Math.PI * f;
      const XL = w * l, XC = 1 / (w * c);
      const X = XL - XC;
      const Z = Math.sqrt(r * r + X * X);
      const phi = Math.atan2(X, r);
      const I = us / Z;
      const w0 = 1 / Math.sqrt(l * c);
      const f0 = w0 / (2 * Math.PI);
      const Q = w0 * l / r;
      return {
        r: r, l: l, c: c, f: f, us: us, w: w, XL: XL, XC: XC, X: X, Z: Z, phi: phi, I: I,
        w0: w0, f0: f0, Q: Q, BW: f0 / Q,
        UR: I * r, UL: I * XL, UC: I * XC,
        P: us * I * Math.cos(phi), Qp: us * I * Math.sin(phi), S: us * I
      };
    }

    function draw() {
      const p = params();
      const deg = CL.phaseDeg(p.phi);
      out.innerHTML =
        row('感抗 X<sub>L</sub> = ωL', U(p.XL, 'Ω')) +
        row('容抗 X<sub>C</sub> = 1/ωC', U(p.XC, 'Ω')) +
        row('电抗 X = X<sub>L</sub> − X<sub>C</sub>', U(p.X, 'Ω') + (p.X >= 0 ? '（感性）' : '（容性）'), true) +
        row('阻抗 |Z|', U(p.Z, 'Ω'), true) +
        row('阻抗角 φ', deg.toFixed(1) + '°') +
        row('电流 I', U(p.I, 'A'), true) +
        row('谐振频率 f₀', p.f0.toFixed(1) + ' Hz', true) +
        row('品质因数 Q', p.Q.toFixed(2)) +
        row('通频带 BW', p.BW.toFixed(1) + ' Hz') +
        row('P / Q / S', U(p.P, 'W') + ' / ' + U(Math.abs(p.Qp), 'var') + ' / ' + U(p.S, 'VA'));

      chart(canvas, function (ctx, w, h, theme) {
        const pad = { l: 60, r: 16, t: 22, b: 34 };
        const bx = { x0: pad.l, y0: pad.t, x1: w - pad.r, y1: h - pad.b };
        axes(ctx, bx, theme);
        const fMax = Math.max(3 * p.f0, p.f * 1.15, 100);
        const zMax = Math.max(
          Math.sqrt(p.r * p.r + Math.pow(2 * Math.PI * fMax * p.l, 2)),
          1
        );
        const X = (f) => bx.x0 + (f / fMax) * (bx.x1 - bx.x0);
        const Y = (z) => bx.y1 - Math.min(1, z / zMax) * (bx.y1 - bx.y0);

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = theme.warm;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(X(p.f0), bx.y0);
        ctx.lineTo(X(p.f0), bx.y1);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'f₀', X(p.f0), bx.y0 - 8, theme.warm, 'center');

        ctx.save();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const N = 300;
        for (let i = 0; i <= N; i++) {
          const f = (fMax * i) / N;
          const ww = 2 * Math.PI * f;
          const z = Math.sqrt(p.r * p.r + Math.pow(ww * p.l - 1 / (ww * p.c), 2));
          const x = X(f), y = Y(z);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.fillStyle = theme.violet;
        ctx.arc(X(p.f), Y(p.Z), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = theme.violet;
        ctx.beginPath();
        ctx.moveTo(X(p.f), Y(p.Z));
        ctx.lineTo(X(p.f), bx.y1);
        ctx.stroke();
        ctx.restore();

        for (let k = 0; k <= 3; k++) {
          const f = (fMax * k) / 3;
          label(ctx, Math.round(f) + '', X(f), bx.y1 + 14, theme.mute, 'center');
        }
        label(ctx, 'f / Hz', bx.x1, bx.y1 + 26, theme.mute, 'right');
        label(ctx, '|Z| / Ω', bx.x0 - 6, bx.y0 - 10, theme.mute, 'left');
      });

      chart(pcanvas, function (ctx, w, h, theme) {
        const cx = w / 2, cy = h / 2 + 8;
        const maxU = Math.max(p.UR, p.UL, p.UC, p.us, 1);
        const scale = Math.min(w, h) * 0.38 / maxU;
        const ux = p.UR * scale;
        const uy = -p.UL * scale;
        const ucy = p.UC * scale;
        const tx = ux;
        const ty = -(p.UL - p.UC) * scale;

        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, cy); ctx.lineTo(w - 8, cy);
        ctx.moveTo(cx, 8); ctx.lineTo(cx, h - 8);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.setLineDash([3, 3]);
        arrow(ctx, cx, cy, cx + ux, cy, theme.mute, 1.4);
        arrow(ctx, cx, cy, cx, cy + uy, theme.mute, 1.4);
        arrow(ctx, cx, cy, cx, cy + ucy, theme.mute, 1.4);
        ctx.restore();

        arrow(ctx, cx, cy, cx + ux, cy + uy, theme.accent, 2.2);
        arrow(ctx, cx, cy, cx + ux, cy + ucy, theme.warm, 2.2);
        arrow(ctx, cx, cy, cx + tx, cy + ty, theme.violet, 2.6);

        label(ctx, 'U_R', cx + ux + 6, cy + 4, theme.mute);
        label(ctx, 'U_L', cx + 6, cy + uy - 4, theme.mute);
        label(ctx, 'U_C', cx + 6, cy + ucy - 4, theme.mute);
        label(ctx, 'U', cx + tx + 8, cy + ty - 8, theme.violet, 'left', 12);
      });
    }

    document.getElementById('rlc-res').addEventListener('click', function () {
      F.set(+(1 / (2 * Math.PI * Math.sqrt(L.get() * 1e-3 * C.get() * 1e-6))).toFixed(0));
      draw();
    });
    draw();
    return;
  }

  /* ============================================================
     工具 4：三相电路
     ============================================================ */
  function buildThree(host) {
    host.innerHTML =
      '<div class="tool-grid">' +
        '<div class="card controls" id="tp-controls"></div>' +
        '<div>' +
          '<div class="canvas-wrap">' +
            '<canvas class="chart" id="tp-canvas"></canvas>' +
            '<div class="canvas-legend"><span><i style="background:var(--accent)"></i>A 相</span>' +
            '<span><i style="background:var(--warm)"></i>B 相</span>' +
            '<span><i style="background:var(--violet)"></i>C 相</span></div>' +
          '</div>' +
          '<div class="readout mt-2" id="tp-out"></div>' +
        '</div>' +
      '</div>';

    const controls = document.getElementById('tp-controls');
    const conn = el('div', 'field');
    conn.innerHTML = '<label for="tp-conn"><span>负载连接方式</span></label>' +
      '<select id="tp-conn"><option value="Y">星形 Y</option><option value="D">三角形 Δ</option></select>';
    controls.appendChild(conn);

    const ULf = rangeField({ label: '线电压 U<sub>L</sub>', min: 100, max: 660, step: 10, value: 380, unit: 'V', digits: 0, oninput: draw });
    const Rp = rangeField({ label: '每相电阻 R', min: 1, max: 100, step: 1, value: 10, unit: 'Ω', digits: 0, oninput: draw });
    const Xp = rangeField({ label: '每相电抗 X', min: -50, max: 50, step: 1, value: 6, unit: 'Ω', digits: 0, oninput: draw });
    controls.appendChild(ULf.el);
    controls.appendChild(Rp.el);
    controls.appendChild(Xp.el);
    controls.appendChild(el('p', 'tool-note',
      'X &gt; 0 表示感性（电流滞后），X &lt; 0 表示容性（电流超前）。对称负载时中性点之间无电位差，可单相化计算。'));

    const canvas = document.getElementById('tp-canvas');
    const out = document.getElementById('tp-out');

    function params() {
      const connV = document.getElementById('tp-conn').value;
      const ULv = ULf.get(), R = Rp.get(), X = Xp.get();
      const Z = Math.sqrt(R * R + X * X);
      const phi = Math.atan2(X, R);
      const isY = connV === 'Y';
      const Up = isY ? ULv / Math.sqrt(3) : ULv;
      const Ip = Up / Z;
      const IL = isY ? Ip : Ip * Math.sqrt(3);
      const P = 3 * Ip * Ip * R;
      const Qv = 3 * Ip * Ip * X;
      const S = Math.sqrt(P * P + Qv * Qv);
      return { conn: connV, UL: ULv, R: R, X: X, Z: Z, phi: phi, isY: isY, Up: Up, Ip: Ip, IL: IL, P: P, Q: Qv, S: S };
    }

    function draw() {
      const p = params();
      out.innerHTML =
        row('连接方式', p.isY ? '星形 Y' : '三角形 Δ') +
        row('相电压 U<sub>p</sub>', U(p.Up, 'V'), true) +
        row('每相阻抗 |Z|', U(p.Z, 'Ω') + '（φ = ' + CL.phaseDeg(p.phi).toFixed(1) + '°）') +
        row('相电流 I<sub>p</sub>', U(p.Ip, 'A'), true) +
        row('线电流 I<sub>L</sub>', U(p.IL, 'A'), true) +
        row('有功 P', U(p.P, 'W'), true) +
        row('无功 Q', U(Math.abs(p.Q), 'var') + (p.Q >= 0 ? '（感性）' : '（容性）')) +
        row('视在 S', U(p.S, 'VA')) +
        row('功率因数 cosφ', (Math.cos(p.phi)).toFixed(3));

      chart(canvas, function (ctx, w, h, theme) {
        const pad = { l: 56, r: 16, t: 18, b: 34 };
        const bx = { x0: pad.l, y0: pad.t, x1: w - pad.r, y1: h - pad.b };
        axes(ctx, bx, theme);
        const Um = Math.sqrt(2) * p.Up;
        const Y = (v) => (bx.y0 + bx.y1) / 2 - (v / Um) * ((bx.y1 - bx.y0) / 2 - 6);
        const T = 2 * Math.PI;
        const X = (t) => bx.x0 + (t / T) * (bx.x1 - bx.x0);

        ctx.save();
        ctx.strokeStyle = theme.border;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(bx.x0, (bx.y0 + bx.y1) / 2);
        ctx.lineTo(bx.x1, (bx.y0 + bx.y1) / 2);
        ctx.stroke();
        ctx.restore();

        const phases = [
          { a: 0, c: theme.accent },
          { a: -2 * Math.PI / 3, c: theme.warm },
          { a: 2 * Math.PI / 3, c: theme.violet }
        ];
        phases.forEach(function (ph) {
          ctx.save();
          ctx.strokeStyle = ph.c;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 200; i++) {
            const t = (T * i) / 200;
            const v = Um * Math.cos(t + ph.a);
            const x = X(t), y = Y(v);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        });

        for (let k = 0; k <= 2; k++) {
          label(ctx, k + 'π', X(k * Math.PI), bx.y1 + 14, theme.mute, 'center');
        }
        label(ctx, '+' + Math.round(Um) + ' V', bx.x0 - 6, Y(Um), theme.mute, 'right');
        label(ctx, '−' + Math.round(Um) + ' V', bx.x0 - 6, Y(-Um), theme.mute, 'right');
        label(ctx, '0', bx.x0 - 6, Y(0), theme.mute, 'right');
        label(ctx, 'ωt', bx.x1, bx.y0 - 8, theme.mute, 'right');
      });
    }

    document.getElementById('tp-conn').addEventListener('change', draw);
    draw();
    return;
  }

  /* ============================================================
     工具 5：电阻色环
     ============================================================ */
  const COLORS = [
    { n: '黑', hex: '#1a1a1a', d: 0, mul: 1 },
    { n: '棕', hex: '#7b3f00', d: 1, mul: 10 },
    { n: '红', hex: '#c0392b', d: 2, mul: 100 },
    { n: '橙', hex: '#e67e22', d: 3, mul: 1e3 },
    { n: '黄', hex: '#f1c40f', d: 4, mul: 1e4 },
    { n: '绿', hex: '#27ae60', d: 5, mul: 1e5 },
    { n: '蓝', hex: '#2d6cdf', d: 6, mul: 1e6 },
    { n: '紫', hex: '#8e44ad', d: 7, mul: 1e7 },
    { n: '灰', hex: '#95a5a6', d: 8, mul: 1e8 },
    { n: '白', hex: '#f7f7f7', d: 9, mul: 1e9 },
    { n: '金', hex: '#d4af37', d: null, mul: 0.1, tol: 5 },
    { n: '银', hex: '#c0c0c0', d: null, mul: 0.01, tol: 10 }
  ];
  const TOL_TABLE = [20, 1, 2, 3, 4, 0.5, 0.25, 0.1, 0.05, 0];

  function mulText(m) {
    if (m >= 1e6) return '×' + (m / 1e6) + ' M';
    if (m >= 1e3) return '×' + (m / 1e3) + ' k';
    return '×' + m;
  }

  function buildColor(host) {
    host.innerHTML =
      '<div class="grid cols-2" style="align-items:start">' +
        '<div class="card">' +
          '<div class="field"><label for="cl-bands"><span>色环数量</span></label>' +
            '<select id="cl-bands"><option value="4">4 环（两位有效数字）</option>' +
            '<option value="5">5 环（三位有效数字，精密电阻）</option></select></div>' +
          '<div id="cl-selects" class="controls mt-2"></div>' +
          '<button class="btn ghost wide mt-2" type="button" id="cl-random">随机一个电阻</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="band-svg" id="cl-svg"></div>' +
          '<div class="readout mt-2" id="cl-out"></div>' +
          '<p class="tool-note mt-2">口诀：<b>黑棕红橙黄绿蓝紫灰白</b> 对应 0—9；金色与银色只用于倍率与误差。' +
          '读数时从靠近端部的那一环开始，最后一环（误差）与前面几环的间距略大。</p>' +
        '</div>' +
      '</div>';

    const selBox = document.getElementById('cl-selects');
    const svgBox = document.getElementById('cl-svg');
    const outBox = document.getElementById('cl-out');
    let selects = [];

    function bandDefs(n) {
      if (n === 4) {
        return [
          { label: '第 1 环（十位）', type: 'digit' },
          { label: '第 2 环（个位）', type: 'digit' },
          { label: '第 3 环（倍率）', type: 'mul' },
          { label: '第 4 环（误差）', type: 'tol' }
        ];
      }
      return [
        { label: '第 1 环', type: 'digit' },
        { label: '第 2 环', type: 'digit' },
        { label: '第 3 环', type: 'digit' },
        { label: '第 4 环（倍率）', type: 'mul' },
        { label: '第 5 环（误差）', type: 'tol' }
      ];
    }

    function buildSelects() {
      const n = Number(document.getElementById('cl-bands').value);
      const defs = bandDefs(n);
      selBox.innerHTML = '';
      selects = [];
      defs.forEach(function (d, i) {
        const field = el('div', 'field');
        let opts = '';
        if (d.type === 'digit') {
          opts = COLORS.slice(0, 10).map(function (c, ci) {
            return '<option value="' + ci + '">' + c.n + '（' + c.d + '）</option>';
          }).join('');
        } else if (d.type === 'mul') {
          opts = COLORS.map(function (c, ci) {
            return '<option value="' + ci + '">' + c.n + '（' + mulText(c.mul) + '）</option>';
          }).join('');
        } else {
          opts = COLORS.slice(0, 10).map(function (c, ci) {
            return '<option value="' + ci + '">' + c.n + '（±' + TOL_TABLE[ci] + '%）</option>';
          }).join('') +
          '<option value="10">金（±5%）</option><option value="11">银（±10%）</option>';
        }
        field.innerHTML = '<label for="cl' + i + '"><span>' + d.label + '</span></label>' +
          '<select id="cl' + i + '">' + opts + '</select>';
        const sel = field.querySelector('select');
        const defaults4 = [1, 0, 2, 10];
        const defaults5 = [1, 0, 0, 2, 1];
        sel.value = String((n === 4 ? defaults4 : defaults5)[i]);
        sel.addEventListener('change', update);
        selBox.appendChild(field);
        selects.push(sel);
      });
      update();
    }

    function currentValue() {
      const n = Number(document.getElementById('cl-bands').value);
      const cs = selects.map(function (s) { return COLORS[Number(s.value)]; });
      let digits, mul, tol;
      if (n === 4) {
        digits = cs[0].d * 10 + cs[1].d;
        mul = cs[2].mul;
        tol = cs[3].tol != null ? cs[3].tol : TOL_TABLE[Number(selects[3].value)];
      } else {
        digits = cs[0].d * 100 + cs[1].d * 10 + cs[2].d;
        mul = cs[3].mul;
        tol = cs[4].tol != null ? cs[4].tol : TOL_TABLE[Number(selects[4].value)];
      }
      return { value: digits * mul, tol: tol, colors: cs, n: n };
    }

    function fmtOhm(v) {
      if (v >= 1e6) return CL.fmt(v / 1e6, 2) + ' MΩ';
      if (v >= 1e3) return CL.fmt(v / 1e3, 2) + ' kΩ';
      return CL.fmt(v, 2) + ' Ω';
    }

    function update() {
      const r = currentValue();
      const n = r.n;
      const cs = r.colors;

      const W = 520, H = 120;
      const bodyX = 110, bodyW = 300, bodyY = 34, bodyH = 52;
      let bandsSvg = '';
      const nBands = n;                     // 色环总数（含误差环）
      const first = bodyX + bodyW * 0.10;
      const last = bodyX + bodyW * 0.86;
      const step = nBands > 1 ? (last - first) / (nBands - 1) : 0;
      for (let i = 0; i < nBands - 1; i++) {
        const x = first + i * step;
        bandsSvg += '<rect x="' + x.toFixed(1) + '" y="' + (bodyY + 3) + '" width="19" height="' + (bodyH - 6) +
          '" fill="' + cs[i].hex + '" stroke="rgba(0,0,0,.25)" stroke-width="1" rx="2"/>';
      }
      // 误差环：与前一环之间留出稍大的间距
      const tolX = last + 14;
      bandsSvg += '<rect x="' + tolX.toFixed(1) + '" y="' + (bodyY + 3) + '" width="19" height="' + (bodyH - 6) +
        '" fill="' + cs[n - 1].hex + '" stroke="rgba(0,0,0,.25)" stroke-width="1" rx="2"/>';

      svgBox.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" class="resistor-svg" role="img" aria-label="色环电阻示意图">' +
          '<g stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
            '<path d="M10 60h' + (bodyX - 10) + '"/>' +
            '<path d="M' + (bodyX + bodyW) + ' 60h' + (W - bodyX - bodyW - 10) + '"/>' +
          '</g>' +
          '<rect x="' + bodyX + '" y="' + bodyY + '" width="' + bodyW + '" height="' + bodyH + '" rx="18" ' +
            'fill="var(--surface-2)" stroke="currentColor" stroke-width="2"/>' +
          bandsSvg +
        '</svg>';

      const lo = r.value * (1 - r.tol / 100);
      const hi = r.value * (1 + r.tol / 100);
      outBox.innerHTML =
        row('标称阻值', '<b style="font-size:1.45rem">' + fmtOhm(r.value) + '</b>', true) +
        row('允许误差', '±' + r.tol + '%') +
        row('实际范围', fmtOhm(lo) + ' ~ ' + fmtOhm(hi)) +
        row('读数方法', n === 4 ? '前两环数字 × 第三环倍率' : '前三环数字 × 第四环倍率');
    }

    document.getElementById('cl-bands').addEventListener('change', buildSelects);
    document.getElementById('cl-random').addEventListener('click', function () {
      const n = Number(document.getElementById('cl-bands').value);
      selects.forEach(function (s, i) {
        if (i === n - 1) {
          s.value = String([10, 11][Math.floor(Math.random() * 2)]);
        } else if (i === n - 2) {
          s.value = String(Math.floor(Math.random() * 5) + 1);
        } else {
          s.value = String(Math.floor(Math.random() * 10));
        }
      });
      update();
    });

    buildSelects();
    return;
  }

  /* ============================================================
     工具 6：最大功率传输
     ============================================================ */
  function buildMaxPower(host) {
    host.innerHTML =
      '<div class="tool-grid">' +
        '<div class="card controls" id="mp-controls"></div>' +
        '<div>' +
          '<div class="canvas-wrap">' +
            '<canvas class="chart" id="mp-canvas"></canvas>' +
            '<div class="canvas-legend"><span><i style="background:var(--accent)"></i>P_L(R_L)</span>' +
            '<span><i style="background:var(--warm)"></i>最大功率点</span>' +
            '<span><i style="background:var(--violet)"></i>当前负载</span></div>' +
          '</div>' +
          '<div class="readout mt-2" id="mp-out"></div>' +
        '</div>' +
      '</div>';

    const controls = document.getElementById('mp-controls');
    const Uoc = rangeField({ label: '开路电压 u<sub>oc</sub>', min: 1, max: 50, step: 1, value: 20, unit: 'V', digits: 0, oninput: draw });
    const Req = rangeField({ label: '等效内阻 R<sub>eq</sub>', min: 1, max: 100, step: 1, value: 5, unit: 'Ω', digits: 0, oninput: function () { syncRange(); draw(); } });
    const RL = rangeField({ label: '负载 R<sub>L</sub>', min: 0.1, max: 25, step: 0.1, value: 5, unit: 'Ω', digits: 1, oninput: draw });
    controls.appendChild(Uoc.el);
    controls.appendChild(Req.el);
    controls.appendChild(RL.el);
    controls.appendChild(el('p', 'tool-note', '注意：最大功率点处的效率只有 50%。电力系统追求高效率，电子系统才追求最大功率。'));

    const canvas = document.getElementById('mp-canvas');
    const out = document.getElementById('mp-out');

    function syncRange() {
      const r = Req.get();
      RL.input.max = String((r * 5).toFixed(1));
      if (RL.get() > r * 5) RL.set((r * 5).toFixed(1));
    }

    function draw() {
      const uoc = Uoc.get(), req = Req.get(), rl = RL.get();
      const I = uoc / (req + rl);
      const PL = I * I * rl;
      const Pmax = uoc * uoc / (4 * req);
      const eff = rl / (req + rl);

      out.innerHTML =
        row('负载电流 i', U(I, 'A')) +
        row('负载电压 u<sub>L</sub>', U(I * rl, 'V')) +
        row('负载功率 P<sub>L</sub>', U(PL, 'W'), true) +
        row('匹配时最大功率 P<sub>max</sub>', U(Pmax, 'W'), true) +
        row('传输效率 η', (eff * 100).toFixed(1) + '%', true) +
        row('是否匹配', Math.abs(rl - req) / req < 0.02 ? '≈ 匹配（R<sub>L</sub> = R<sub>eq</sub>）' : (rl < req ? '负载偏小，应增大 R<sub>L</sub>' : '负载偏大，应减小 R<sub>L</sub>'));

      chart(canvas, function (ctx, w, h, theme) {
        const pad = { l: 62, r: 16, t: 22, b: 34 };
        const bx = { x0: pad.l, y0: pad.t, x1: w - pad.r, y1: h - pad.b };
        axes(ctx, bx, theme);
        const rMax = req * 5;
        const X = (r) => bx.x0 + (r / rMax) * (bx.x1 - bx.x0);
        const Y = (p) => bx.y1 - Math.min(1, p / (Pmax * 1.15)) * (bx.y1 - bx.y0);

        ctx.save();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const N = 260;
        for (let i = 0; i <= N; i++) {
          const r = (rMax * i) / N;
          const ii = uoc / (req + r);
          const p = ii * ii * r;
          const x = X(r), y = Y(p);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = theme.warm;
        ctx.beginPath();
        ctx.moveTo(X(req), Y(Pmax));
        ctx.lineTo(X(req), bx.y1);
        ctx.moveTo(bx.x0, Y(Pmax));
        ctx.lineTo(X(req), Y(Pmax));
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.fillStyle = theme.warm;
        ctx.arc(X(req), Y(Pmax), 4, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, 'R_L = R_eq', X(req) + 6, Y(Pmax) - 10, theme.warm);

        ctx.beginPath();
        ctx.fillStyle = theme.violet;
        ctx.arc(X(rl), Y(PL), 5, 0, Math.PI * 2);
        ctx.fill();

        for (let k = 0; k <= 4; k++) {
          const r = (rMax * k) / 4;
          label(ctx, Math.round(r) + '', X(r), bx.y1 + 14, theme.mute, 'center');
        }
        label(ctx, 'R_L / Ω', bx.x1, bx.y1 + 26, theme.mute, 'right');
        label(ctx, 'P_L / W', bx.x0 - 6, bx.y0 - 10, theme.mute, 'left');
      });
    }

    syncRange();
    draw();
    return;
  }

  /* ============================================================
     框架：选项卡
     ============================================================ */
  const TOOLS = [
    { id: 'divider', label: '分压 / 分流', build: buildDivider },
    { id: 'rc', label: 'RC / RL 响应', build: buildRC },
    { id: 'rlc', label: 'RLC 与谐振', build: buildRLC },
    { id: 'three', label: '三相电路', build: buildThree },
    { id: 'color', label: '色环电阻', build: buildColor },
    { id: 'maxpower', label: '最大功率', build: buildMaxPower }
  ];

  function boot() {
    const tabs = document.getElementById('tool-tabs');
    const panels = document.getElementById('tool-panels');
    if (!tabs || !panels) return;

    TOOLS.forEach(function (t, i) {
      const btn = el('button', i === 0 ? 'active' : '', t.label);
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-tool', t.id);
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.addEventListener('click', function () { show(t.id, true); });
      tabs.appendChild(btn);

      const panel = el('div', 'tool-panel' + (i === 0 ? ' active' : ''));
      panel.setAttribute('data-tool', t.id);
      panel.setAttribute('role', 'tabpanel');
      panels.appendChild(panel);
      try { t.build(panel); } catch (err) {
        panel.innerHTML = '<div class="card"><p class="muted">该工具加载失败：' + (err && err.message) + '</p></div>';
      }
    });

    function show(id, updateHash) {
      document.querySelectorAll('#tool-tabs button').forEach(function (b) {
        const on = b.getAttribute('data-tool') === id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.tool-panel').forEach(function (p) {
        const on = p.getAttribute('data-tool') === id;
        p.classList.toggle('active', on);
        if (on) {
          p.querySelectorAll('canvas').forEach(function (c) { if (c.__redraw) c.__redraw(); });
        }
      });
      if (updateHash) {
        try { history.replaceState(null, '', '#' + id); }
        catch (e) { /* file:// 下某些浏览器禁止改写历史记录，忽略即可 */ }
      }
    }

    const hash = (location.hash || '').replace('#', '');
    if (hash && TOOLS.some(function (t) { return t.id === hash; })) show(hash, false);
    window.addEventListener('hashchange', function () {
      const h = (location.hash || '').replace('#', '');
      if (h && TOOLS.some(function (t) { return t.id === h; })) show(h, false);
    });
    window.addEventListener('resize', function () {
      document.querySelectorAll('.tool-panel.active canvas').forEach(function (c) { if (c.__redraw) c.__redraw(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
