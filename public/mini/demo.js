// Mini oyun tanıtımlarındaki küçük canlandırmalar: MINI_DEMO[ad] = HTML (stili stil.css'te, .demo-*)
// Başka mini oyunlar da buraya kendi gösterimini ekleyebilir.
window.MINI_DEMO = {
  // kasa vincin ucunda sallanır, "Bırak" yanıp söner, kasa düşüp kuleye oturur
  kule: `<div class="demo demo-kule">
      <div class="dk-halat"><div class="dk-kasa dk-sallanan"></div></div>
      <div class="dk-yigin"><div class="dk-kasa" style="--k:#ffcf4a"></div><div class="dk-kasa" style="--k:#4fb3ff"></div></div>
      <div class="dk-zemin"></div><div class="demo-dokun dk-dokun">👆 Bırak!</div></div>`,
  // nota halkaya kayar, aynı yön tuşu parlar, "Mükemmel!" çıkar
  ritim: `<div class="demo demo-ritim">
      <div class="dr-serit"><div class="dr-halka"></div><div class="dr-nota">▲</div><div class="dr-yargi">Mükemmel!</div></div>
      <div class="dr-tuslar"><b class="dr-u">▲</b><b>◀</b><b>▶</b><b>▼</b></div></div>`,
  // karışık taşlar yer değiştirip kelimeye dönüşür
  karma: `<div class="demo demo-karma">${[...'ZÜRAFA'].map((h, i) => `<b style="--i:${i};--s:${[3, 0, 5, 1, 4, 2][i]}">${h}</b>`).join('')}<div class="dkm-ok">✓ +1</div></div>`,
};

// Zıpla Eğil: karakter alçak silindirin üstünden zıplar, sonra yüksekten sallananın altından eğilerek geçer
MINI_DEMO.zipla = `<div class="demo demo-zipla"><div class="dz-zemin"></div><div class="dz-kisi"><svg viewBox="0 0 40 60" width="40" height="60"><g stroke="#ff5d5d" stroke-width="4.5" stroke-linecap="round" fill="none"><path d="M20 34 L22 16"/><path d="M22 20 L12 30 M22 20 L32 28"/><path d="M20 34 L13 47 L15 58 M20 34 L28 46 L26 58"/></g><circle cx="23" cy="9" r="7" fill="#ff5d5d"/></svg></div>
    <div class="dz-silindir dz-alcak"></div><div class="dz-zincir"><div class="dz-silindir"></div></div>
    <div class="dz-ipucu dz-u">⬆ Zıpla!</div><div class="dz-ipucu dz-a">⬇ Eğil!</div></div>`;
