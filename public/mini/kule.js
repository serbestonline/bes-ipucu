// Kule, telefon tarafı: solda kendi kulen ve üstünde kayan parça, sağda rakiplerin kuleleri, altta "Bırak".
(() => {
  const RENK = ['#000', '#ff5d5d', '#4fb3ff', '#5ee07a', '#ffcf4a', '#c77dff', '#ff9f43'];
  let alan, gonder, benId, d, alinan, rafId, tuval, x, kt, kx;
  let izgara, sira, parca, px, yon, dusen, devrilen, bitti, sonGonderilen;
  const $ = (s) => alan.querySelector(s);
  const ses = (ad, v = .45) => efektCal(ad, v); // önceden yüklenmiş Web Audio
  const gecen = () => d.gecenMs + performance.now() - alinan;

  function kur(a, g, kim) {
    alan = a; gonder = g; benId = kim; d = null; izgara = null; sira = 0; parca = null; dusen = null; devrilen = []; bitti = false;
    alan.innerHTML = `<div class="ust"><h2>🧱 Kule</h2><span class="soluk" id="ks"></span></div>
      <div class="cubuk"><div id="kc"></div></div>
      <div class="geri" id="kg"></div>
      <div class="kule-alan"><div class="kule-ben"><canvas id="kt"></canvas></div><div class="kule-rakip"><canvas id="kr"></canvas></div></div>
      <button class="ana kule-birak" id="kb">Bırak</button>`;
    tuval = $('#kt'); x = tuval.getContext('2d'); kt = $('#kr'); kx = kt.getContext('2d');
    $('#kb').addEventListener('pointerdown', (e) => { e.preventDefault(); birak(); });
    kare();
  }

  const boyutla = (c, cx) => { const r = c.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); /* 3x ekranlarda piksel yükünü yarıya indirir */ if (c._w !== r.width || c._h !== r.height) { c._w = r.width; c._h = r.height; c.width = r.width * dpr; c.height = r.height * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); } return [r.width, r.height]; };
  const genislik = (h) => Math.max(...h.map((c) => c[0])) + 1;
  const dolu = (xx, yy) => yy < 0 || (izgara[yy] && izgara[yy][xx] > 0);
  const yuk = () => { for (let y = izgara.length - 1; y >= 0; y--) if (izgara[y].some((v) => v)) return y + 1; return 0; };

  function yeniParca() {
    const p = d.parcalar[sira++ % d.parcalar.length];
    parca = { hucre: d.sekiller[p.s], renk: p.renk }; px = Math.random() * (d.gen - genislik(parca.hucre)); yon = Math.random() < .5 ? 1 : -1;
  }

  // parça şu anki sütunda düşer; en alt hücrelerinin yarısından azı dayanıyorsa devrilir
  function birak() {
    if (!d || bitti || !parca || dusen) return;
    const g = gecen(); if (g < 0 || g > d.bitisMs) return;
    const sx = Math.round(px), h = parca.hucre;
    let y0 = 0;
    for (const [cx, cy] of h) { let top = 0; for (let y = izgara.length - 1; y >= 0; y--) if (izgara[y][sx + cx]) { top = y + 1; break; } y0 = Math.max(y0, top - cy); }
    const sutunlar = [...new Set(h.map((c) => c[0]))];
    const temas = sutunlar.filter((c) => { const enAlt = Math.min(...h.filter((q) => q[0] === c).map((q) => q[1])); return dolu(sx + c, y0 + enAlt - 1); }).length;
    const devril = temas * 2 < sutunlar.length;
    dusen = { hucre: h, renk: parca.renk, x: sx, hedefY: y0, y: d.hedef + 3, devril, z: performance.now() };
    parca = null;
  }

  function yerles() {
    const p = dusen; dusen = null;
    if (p.devril) {
      devrilen.push({ ...p, z: performance.now(), yonu: p.x + 1 < d.gen / 2 ? -1 : 1 });
      gonder({ devrildi: true }); ses('kutuphane/arayuz/error_004', .4); navigator.vibrate && navigator.vibrate([20, 30, 20]);
    } else {
      for (const [cx, cy] of p.hucre) { while (izgara.length <= p.hedefY + cy) izgara.push(Array(d.gen).fill(0)); izgara[p.hedefY + cy][p.x + cx] = p.renk; }
      const satirlar = izgara.slice(0, d.hedef + 6).map((r) => r.join(''));
      gonder({ izgara: satirlar }); ses('kutuphane/arayuz/drop_00' + (1 + (Math.random() * 3 | 0)), .5); navigator.vibrate && navigator.vibrate(25);
      if (yuk() >= d.hedef) { bitti = true; ses('kazan', .6); return; }
    }
    setTimeout(() => { if (!bitti) yeniParca(); }, 250);
  }

  function guncelle(yeni) {
    const ilk = !d; d = yeni.mini; alinan = performance.now();
    if (ilk) { izgara = []; yeniParca(); }
  }

  // boyalı tahta kasa: renkli gövde, koyu çerçeve, çapraz tahta, üstte parlaklık
  function hucreCiz(cx, X, Y, b, renk, saydam = 1) {
    const r = Math.max(2, b * .14), k = RENK[renk];
    cx.save(); cx.globalAlpha = saydam;
    cx.fillStyle = '#0006'; cx.beginPath(); cx.roundRect(X + 1, Y + 3, b - 2, b - 2, r); cx.fill();
    cx.fillStyle = k; cx.beginPath(); cx.roundRect(X + 1, Y + 1, b - 2, b - 3, r); cx.fill();
    cx.strokeStyle = '#00000055'; cx.lineWidth = Math.max(1.5, b * .09); cx.beginPath(); cx.roundRect(X + b * .14, Y + b * .14, b * .72, b * .68, r * .6); cx.stroke();
    cx.beginPath(); cx.moveTo(X + b * .18, Y + b * .2); cx.lineTo(X + b * .82, Y + b * .76); cx.stroke();
    cx.fillStyle = '#ffffff55'; cx.fillRect(X + b * .12, Y + 3, b * .76, Math.max(1.5, b * .08));
    cx.restore();
  }

  let yildiz = null; const arkaOnbellek = new Map();
  // gökyüzü her boyut için bir kez çizilir, sonra her karede yalnız kopyalanır
  function arkaPlan(cx, W, H) {
    const anahtar = W + 'x' + H; let o = arkaOnbellek.get(anahtar);
    if (!o) { o = document.createElement('canvas'); o.width = W * 2; o.height = H * 2; const ox = o.getContext('2d'); ox.scale(2, 2); arkaPlanCiz(ox, W, H); arkaOnbellek.set(anahtar, o); }
    cx.drawImage(o, 0, 0, W, H);
  }
  function arkaPlanCiz(cx, W, H) {
    const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2a5c'); g.addColorStop(.6, '#1d1729'); g.addColorStop(1, '#14111c');
    cx.fillStyle = g; cx.beginPath(); cx.roundRect(0, 0, W, H, 18); cx.fill();
    if (!yildiz) yildiz = Array.from({ length: 40 }, () => [Math.random(), Math.random() * .7, Math.random() * 1.6 + .4]);
    yildiz.forEach(([x0, y0, r], i) => { cx.globalAlpha = .3 + .4 * ((i * 37) % 10) / 10; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x0 * W, y0 * H, r, 0, 7); cx.fill(); });
    cx.globalAlpha = 1;
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d || !izgara) return;
    const g = gecen(), simdi = performance.now(), geri = $('#kg');
    geri.textContent = g < 0 ? Math.ceil(-g / 1000) : ''; geri.style.display = g < 0 ? 'block' : 'none';
    $('#kc').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.bitisMs)})`;
    $('#ks').textContent = bitti ? 'tepedesin!' : g >= 0 && g < d.bitisMs ? Math.ceil((d.bitisMs - g) / 1000) + ' sn' : g >= d.bitisMs ? 'bitti' : '';
    $('#kb').disabled = bitti || g < 0 || g > d.bitisMs;

    // ---- kendi kulen ----
    const [W, H] = boyutla(tuval, x), satir = d.hedef + 4, cetvel = 22, zeminH = 16;
    const b = Math.min((W - cetvel - 8) / d.gen, (H - zeminH - 6) / satir), ox = cetvel + (W - cetvel - b * d.gen) / 2, taban = H - zeminH;
    x.clearRect(0, 0, W, H); arkaPlan(x, W, H);
    // zemin: ahşap platform
    x.fillStyle = '#6b4a2b'; x.beginPath(); x.roundRect(ox - 6, taban, b * d.gen + 12, zeminH - 2, 4); x.fill();
    x.fillStyle = '#8a6239'; for (let i = 0; i < d.gen + 1; i++) x.fillRect(ox - 6 + i * b, taban + 2, b - 3, 4);
    // sütun kılavuzları
    x.strokeStyle = '#ffffff08'; x.lineWidth = 1; for (let i = 1; i < d.gen; i++) { x.beginPath(); x.moveTo(ox + i * b, taban); x.lineTo(ox + i * b, taban - b * (d.hedef + 1)); x.stroke(); }
    // cetvel
    const mevcut = yuk();
    x.font = '800 10px system-ui'; x.textAlign = 'right';
    for (let r = 0; r <= d.hedef; r += 2) { const yy = taban - r * b; x.fillStyle = r <= mevcut ? '#ffcf4a' : '#ffffff40'; x.fillRect(cetvel - 6, yy - 1, 6, 2); if (r % 6 === 0 && r) x.fillText(r, cetvel - 8, yy + 3); }
    x.fillStyle = '#ffcf4a'; x.beginPath(); const oy = taban - mevcut * b; x.moveTo(cetvel + 2, oy); x.lineTo(cetvel - 6, oy - 5); x.lineTo(cetvel - 6, oy + 5); x.fill();
    // bitiş şeridi: damalı bant ve bayrak
    const ty = taban - b * d.hedef, kare2 = Math.max(5, b * .35);
    for (let i = 0; i * kare2 < b * d.gen; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#14111c' : '#fff'; x.fillRect(ox + i * kare2, ty - (j + 1) * kare2, Math.min(kare2, b * d.gen - i * kare2), kare2); }
    x.font = `900 italic ${Math.max(12, b * .55)}px "Arial Black", Arial`; x.textAlign = 'left'; x.lineWidth = 4; x.strokeStyle = '#14111c'; x.strokeText('🏁 TEPE', ox + 4, ty - kare2 * 2 - 6); x.fillStyle = '#ffcf4a'; x.fillText('🏁 TEPE', ox + 4, ty - kare2 * 2 - 6);
    izgara.forEach((r, y) => r.forEach((v, xx) => { if (v) hucreCiz(x, ox + xx * b, taban - (y + 1) * b, b, v); }));
    // kayan kasa: vincin halatına asılı, hız kule yükseldikçe artar
    if (parca && g >= 0 && !bitti) {
      const hiz = (3.2 + yuk() * .3) / 60, w = genislik(parca.hucre);
      px += yon * hiz; if (px < 0) { px = 0; yon = 1; } if (px > d.gen - w) { px = d.gen - w; yon = -1; }
      const ust = d.hedef + 2, ustY = taban - (ust + Math.max(...parca.hucre.map((c) => c[1])) + 1) * b, ortaX = ox + (px + w / 2) * b;
      const gx = Math.round(px); x.fillStyle = '#ffffff10'; x.fillRect(ox + gx * b, ustY, w * b, taban - ustY);
      x.strokeStyle = '#d8cbb0'; x.lineWidth = 2; x.beginPath(); x.moveTo(ortaX, 0); x.lineTo(ortaX, ustY - 6); x.stroke();
      x.strokeStyle = '#a9a9b8'; x.lineWidth = 3; x.beginPath(); x.arc(ortaX, ustY - 6, 5, Math.PI * .1, Math.PI * 1.1); x.stroke();
      parca.hucre.forEach(([cx, cy]) => hucreCiz(x, ox + (px + cx) * b, taban - (ust + cy + 1) * b, b, parca.renk));
    }
    if (dusen) {
      dusen.y -= .9; if (dusen.y <= dusen.hedefY) { dusen.y = dusen.hedefY; dusen.hucre.forEach(([cx, cy]) => hucreCiz(x, ox + (dusen.x + cx) * b, taban - (dusen.y + cy + 1) * b, b, dusen.renk)); yerles(); }
      else dusen.hucre.forEach(([cx, cy]) => hucreCiz(x, ox + (dusen.x + cx) * b, taban - (dusen.y + cy + 1) * b, b, dusen.renk));
    }
    devrilen = devrilen.filter((p) => simdi - p.z < 900);
    devrilen.forEach((p) => {
      const t = (simdi - p.z) / 900; x.save(); x.translate(ox + (p.x + 1) * b + p.yonu * t * b * 3, taban - (p.hedefY + 1) * b + t * t * H * .6); x.rotate(p.yonu * t * 2.5);
      p.hucre.forEach(([cx, cy]) => hucreCiz(x, (cx - 1) * b, -(cy) * b, b, p.renk, 1 - t)); x.restore();
    });
    if (bitti) { x.font = '900 italic 34px "Arial Black", Arial'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#14111c'; x.strokeText('TEPEDESİN!', W / 2, H * .4); x.fillStyle = '#ffcf4a'; x.fillText('TEPEDESİN!', W / 2, H * .4); }

    // ---- yarış pisti: her rakip kendi yüksekliğine göre bayrağa tırmanır ----
    const [RW, RH] = boyutla(kt, kx), rakip = d.oyuncular.filter((o) => o.id !== benId());
    kx.clearRect(0, 0, RW, RH); arkaPlan(kx, RW, RH);
    const ustP = 46, altP = RH - 34;
    kx.font = '900 italic 22px "Arial Black", Arial'; kx.textAlign = 'center'; kx.fillText('🏁', RW / 2, 28);
    for (let i = 0; i * 8 < RW - 16; i++) { kx.fillStyle = i % 2 ? '#14111c' : '#fff'; kx.fillRect(8 + i * 8, ustP - 8, 8, 4); kx.fillStyle = i % 2 ? '#fff' : '#14111c'; kx.fillRect(8 + i * 8, ustP - 4, 8, 4); }
    if (!rakip.length) { kx.fillStyle = '#a99fc0'; kx.font = '700 12px system-ui'; kx.fillText('Tek başınasın', RW / 2, RH / 2); return; }
    const aralik = (RW - 16) / rakip.length;
    rakip.forEach((o, i) => {
      const cx0 = 8 + aralik * (i + .5), oran = o.tepe != null ? 1 : o.yukseklik / d.hedef, yy = altP - (altP - ustP) * oran;
      kx.strokeStyle = '#ffffff18'; kx.lineWidth = 8; kx.lineCap = 'round'; kx.beginPath(); kx.moveTo(cx0, altP); kx.lineTo(cx0, ustP); kx.stroke();
      kx.strokeStyle = o.renk; kx.beginPath(); kx.moveTo(cx0, altP); kx.lineTo(cx0, yy); kx.stroke();
      const r = Math.min(15, aralik * .32);
      kx.fillStyle = '#fff'; kx.beginPath(); kx.arc(cx0, yy, r + 3, 0, 7); kx.fill();
      kx.fillStyle = o.renk; kx.beginPath(); kx.arc(cx0, yy, r, 0, 7); kx.fill();
      kx.fillStyle = '#fff'; kx.font = `900 ${r}px "Arial Black", Arial`; kx.textAlign = 'center'; kx.textBaseline = 'middle'; kx.fillText(o.ad[0].toLocaleUpperCase('tr'), cx0, yy + 1); kx.textBaseline = 'alphabetic';
      kx.fillStyle = '#f3eefc'; kx.font = '800 11px system-ui'; kx.fillText(o.ad.slice(0, 7), cx0, RH - 18);
      kx.fillStyle = o.tepe != null ? '#5ee07a' : '#ffcf4a'; kx.fillText(o.tepe != null ? 'tepede!' : `${o.yukseklik}/${d.hedef}`, cx0, RH - 5);
    });
  }

  MINI.kule = { kur, guncelle, kapat: () => cancelAnimationFrame(rafId) };
})();
