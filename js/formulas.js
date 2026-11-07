/* =========================================================
   电路学堂 · 公式速查脚本（从课程数据自动汇总）
   ========================================================= */
(function () {
  'use strict';

  function chapters() {
    return ((window.CIRCUIT_DATA && window.CIRCUIT_DATA.chapters) || []).slice().sort((a, b) => a.num - b.num);
  }
  function modules() {
    return (window.CIRCUIT_DATA && window.CIRCUIT_DATA.modules) || [];
  }

  let keyword = '';

  function strip(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').toLowerCase();
  }

  function match(f, ch) {
    if (!keyword) return true;
    const hay = (f.k + ' ' + f.v + ' ' + (f.note || '') + ' ' + ch.title + ' ' + (ch.keywords || []).join(' ')).toLowerCase();
    const plain = hay + ' ' + strip(f.v);
    return plain.indexOf(keyword) >= 0;
  }

  function render() {
    const host = document.getElementById('formula-list');
    if (!host) return;
    const chs = chapters();
    const mods = modules();
    let total = 0;
    let html = '';

    mods.forEach(function (m) {
      const inMod = chs.filter(function (c) { return c.module === m.id && (c.formulas || []).length; });
      if (!inMod.length) return;

      let modHtml = '';
      let modCount = 0;

      inMod.forEach(function (c) {
        const fs = (c.formulas || []).filter(function (f) { return match(f, c); });
        if (!fs.length) return;
        modCount += fs.length;
        const dv = (window.DERIVATIONS || []).filter(function (d) { return d.ch === c.id; });
        modHtml += '<div class="mt-2">' +
          '<div class="flex between center flex-wrap gap-1" style="margin-bottom:10px">' +
            '<h3 style="margin:0;font-size:1rem">第 ' + c.num + ' 章 · ' + CL.escape(c.title) + '</h3>' +
            '<span class="flex gap-2 center">' +
              (dv.length ? '<a class="small" href="derivations.html#' + dv[0].id + '">推导动画 →</a>' : '') +
              '<a class="small" href="chapter.html?id=' + c.id + '">看本章 →</a>' +
            '</span>' +
          '</div>' +
          '<div class="formula-grid">' +
            fs.map(function (f) {
              return '<div class="formula-card">' +
                '<h4>' + CL.mathify(f.k) + '</h4>' +
                '<div class="fbody">' + CL.mathify(f.v) + '</div>' +
                (f.note ? '<p class="fnote">' + CL.mathify(f.note) + '</p>' : '') +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
      });

      if (!modCount) return;
      total += modCount;
      html += '<section class="mt-3" id="mod-' + m.id + '">' +
        '<div class="section-title" style="margin-top:34px">' +
          '<h2 style="font-size:1.28rem">' + m.name + '</h2>' +
          '<span class="hint">' + m.desc + '　·　' + modCount + ' 条</span>' +
        '</div>' + modHtml + '</section>';
    });

    if (!total) {
      host.innerHTML = '<div class="card text-center" style="padding:40px">' +
        '<p class="muted mb-0">没有匹配的公式，换个关键词试试，例如“阻抗”“一阶”“三相”。</p></div>';
    } else {
      host.innerHTML =
        '<div class="card" style="background:var(--accent-soft);border-color:transparent">' +
          '<div class="flex between flex-wrap center gap-2">' +
            '<div>' +
              '<h3 style="margin:0 0 4px;font-size:1rem">必背十条</h3>' +
              '<p class="small mb-0" style="color:var(--text)">欧姆定律 · 分压分流 · KCL/KVL · 节点法 · 戴维南 · 三要素法 · τ = RC 或 L/R · 相量阻抗 · P = UIcosφ · 三相 √3U<sub>L</sub>I<sub>L</sub>cosφ</p>' +
            '</div>' +
            '<span class="tag accent">' + total + ' 条公式</span>' +
          '</div>' +
        '</div>' + html;
    }

    const cnt = document.getElementById('formula-count');
    if (cnt) cnt.textContent = keyword ? '找到 ' + total + ' 条' : '共 ' + total + ' 条';
  }

  function boot() {
    render();
    const s = document.getElementById('formula-search');
    if (s) {
      s.addEventListener('input', function () {
        keyword = s.value.trim().toLowerCase();
        render();
      });
    }
    const p = document.getElementById('formula-print');
    if (p) p.addEventListener('click', function () { window.print(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
