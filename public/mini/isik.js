// Işık İzi, telefon tarafı: kuşbakışı neon arena; sol tuşu basılı tut sola, sağ tuşu basılı tut sağa dön.
(() => {
  let alan, gonder, benId, d, alinan, rafId, tuval, x, W, H;
  let izler, basim, el, patlama, puan, canli, don;
  const $ = (s) => alan.querySelector(s);
  const ses = (ad, v = .5) => efektCal(ad, v); // önceden yüklenmiş Web Audio
  const gecen = () => d.gecenMs + performance.now() - alinan;

  function kur(a, g, kim) {
    alan = a; gonder = g; benId = kim; d = null; W = 0; H = 0; izler = {}; basim = {}; el = 0; patlama = []; puan = {}; canli = {}; don = 0; // W, H sıfırlanır: yeni tuval her açılışta yeniden boyutlansın
    alan.innerHTML = `<div class="ust"><h2>⚡ Işık İzi</h2><span class="soluk" id="is"></span></div>
      <div class="cubuk"><div id="ic"></div></div>
      <div class="geri" id="ig"></div>
      <div class="isik-puan" id="ip"></div>
      <div class="isik-alan"><canvas id="it"></canvas></div>
      <div class="isik-tuslar"><button data-y="-1">◀<small>basılı tut</small></button><button data-y="1">▶<small>basılı tut</small></button></div>`;
    tuval = $('#it'); x = tuval.getContext('2d');
    // iki tuş da basılıysa düz gider; bırakınca düz
    const basili = new Set();
    const bildir = () => { const yeni = (basili.has(1) ? 1 : 0) - (basili.has(-1) ? 1 : 0); if (yeni !== don) { don = yeni; gonder({ don }); } };
    alan.querySelectorAll('.isik-tuslar button').forEach((b) => {
      const y = +b.dataset.y;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); basili.add(y); b.classList.add('basik'); bildir(); });
      const birak = () => { basili.delete(y); b.classList.remove('basik'); bildir(); };
      b.addEventListener('pointerup', birak); b.addEventListener('pointercancel', birak);
    });
    alan._tus = (e, bas) => { const k = e.key.toLowerCase(), y = k === 'arrowleft' || k === 'a' ? -1 : k === 'arrowright' || k === 'd' ? 1 : 0; if (!y) return; bas ? basili.add(y) : basili.delete(y); bildir(); };
    alan._bas = (e) => alan._tus(e, true); alan._birak = (e) => alan._tus(e, false);
    addEventListener('keydown', alan._bas); addEventListener('keyup', alan._birak);
    kare();
  }

  // tam durum gelince (başlangıç ve her yeni el) izler baştan kurulur
  function guncelle(yeni) {
    d = yeni.mini; alinan = performance.now();
    if (d.elNo !== el) {
      el = d.elNo; izler = {}; basim = {};
      for (const o of d.oyuncular) { izler[o.id] = o.iz.slice(); const son = o.iz.filter(Boolean).at(-1) || [d.a / 2, d.a / 2]; basim[o.id] = { x: son[0], y: son[1] }; canli[o.id] = o.canli; puan[o.id] = o.puan; }
    }
    puanCiz();
  }

  function puanCiz() {
    if (!d) return;
    $('#ip').innerHTML = [...d.oyuncular].sort((a, b) => (puan[b.id] || 0) - (puan[a.id] || 0)).map((o) =>
      `<span class="${canli[o.id] === false ? 'elendi' : ''}" style="--c:${o.renk}"><i></i>${o.id === benId() ? 'Sen' : o.ad}<b>${puan[o.id] || 0}</b></span>`).join('');
  }

  function mesaj(m) {
    if (!d) return;
    if (m.tik) {
      if (m.tik.el !== el) return; // yeni elin tam durumu gelene kadar bekle
      for (const [id, px, py, c, bos, p] of m.tik.p) {
        if (!izler[id]) continue;
        if (c) izler[id].push(bos ? null : [px, py]);
        basim[id] = { x: px, y: py }; if (puan[id] !== p) { puan[id] = p; puanCiz(); }
        if (canli[id] && !c) { canli[id] = false; puanCiz(); }
      }
      for (const o of m.tik.olay) if (o.elendi) {
        const renk = d.oyuncular.find((k) => k.id === o.elendi)?.renk || '#fff';
        for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, h = 6 + Math.random() * 22; patlama.push({ x: o.x, y: o.y, vx: Math.cos(a) * h, vy: Math.sin(a) * h, z: performance.now(), renk }); }
        if (o.elendi === benId()) { ses('kutuphane/dijital/lowdown', .6); navigator.vibrate && navigator.vibrate(250); }
        else ses('kutuphane/dijital/zap1', .4);
      }
    }
    if (m.yeniEl) ses('kutuphane/dijital/powerup2', .5);
  }

  function boyut() {
    const r = tuval.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); /* 3x ekranlarda piksel yükünü yarıya indirir */
    if (r.width === W && r.height === H) return; W = r.width; H = r.height; tuval.width = W * dpr; tuval.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d) return;
    boyut();
    const g = gecen(), simdi = performance.now(), geri = $('#ig');
    geri.textContent = g < 0 ? Math.ceil(-g / 1000) : ''; geri.style.display = g < 0 ? 'block' : 'none';
    $('#ic').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.sureMs)})`;
    $('#is').textContent = g >= 0 && g < d.sureMs ? `${el}. el · ${Math.ceil((d.sureMs - g) / 1000)} sn` : g >= d.sureMs ? 'bitti' : '';

    const k = Math.min(W, H) / d.a, ox = (W - k * d.a) / 2, oy = (H - k * d.a) / 2;
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#0d0a16'; x.beginPath(); x.roundRect(ox, oy, k * d.a, k * d.a, 14); x.fill();
    x.strokeStyle = '#ffffff0c'; x.lineWidth = 1;
    for (let i = 10; i < d.a; i += 10) { x.beginPath(); x.moveTo(ox + i * k, oy); x.lineTo(ox + i * k, oy + d.a * k); x.moveTo(ox, oy + i * k); x.lineTo(ox + d.a * k, oy + i * k); x.stroke(); }
    x.strokeStyle = '#c77dff'; x.lineWidth = 3; x.shadowColor = '#c77dff'; x.shadowBlur = 12; x.beginPath(); x.roundRect(ox + 1.5, oy + 1.5, k * d.a - 3, k * d.a - 3, 14); x.stroke(); x.shadowBlur = 0;

    // izler: parlayan çizgiler, boşluklarda kopar
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const o of d.oyuncular) {
      const iz = izler[o.id]; if (!iz) continue;
      x.strokeStyle = o.renk; x.lineWidth = Math.max(2.5, k * .9); x.shadowColor = o.renk; x.shadowBlur = 10;
      x.beginPath(); let acik = false;
      for (const p of iz) { if (!p) { acik = false; continue; } const px = ox + p[0] * k, py = oy + p[1] * k; acik ? x.lineTo(px, py) : x.moveTo(px, py); acik = true; }
      x.stroke(); x.shadowBlur = 0;
    }
    // başlar
    for (const o of d.oyuncular) {
      if (!canli[o.id]) continue; const b = basim[o.id]; if (!b) continue;
      const px = ox + b.x * k, py = oy + b.y * k, benim = o.id === benId(), r = Math.max(4, k * 1.3);
      x.fillStyle = '#fff'; x.shadowColor = o.renk; x.shadowBlur = 16; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.shadowBlur = 0;
      x.fillStyle = o.renk; x.beginPath(); x.arc(px, py, r * .55, 0, 7); x.fill();
      x.font = `800 ${benim ? 13 : 11}px system-ui`; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#0d0a16';
      const ad = benim ? 'Sen' : o.ad; x.strokeText(ad, px, py - r - 6); x.fillStyle = benim ? '#ffcf4a' : '#fff'; x.fillText(ad, px, py - r - 6);
    }
    // elenme patlamaları
    patlama = patlama.filter((p) => simdi - p.z < 700);
    for (const p of patlama) { const t = (simdi - p.z) / 1000; x.globalAlpha = 1 - t / .7; x.fillStyle = p.renk; x.fillRect(ox + (p.x + p.vx * t) * k - 2, oy + (p.y + p.vy * t) * k - 2, 4, 4); }
    x.globalAlpha = 1;
    if (d.oyuncular.some((o) => o.id === benId()) && canli[benId()] === false && g >= 0 && g < d.sureMs) {
      x.font = '900 italic 26px "Arial Black", Arial'; x.textAlign = 'center'; x.lineWidth = 7; x.strokeStyle = '#0d0a16';
      x.strokeText('ÇARPTIN!', W / 2, H / 2); x.fillStyle = '#ffcf4a'; x.fillText('ÇARPTIN!', W / 2, H / 2);
      x.font = '700 12px system-ui'; x.lineWidth = 4; x.strokeText('Yeni el bu el bitince başlar', W / 2, H / 2 + 22); x.fillStyle = '#fff'; x.fillText('Yeni el bu el bitince başlar', W / 2, H / 2 + 22);
    }
  }

  MINI.isik = { kur, guncelle, mesaj, kapat: () => { cancelAnimationFrame(rafId); removeEventListener('keydown', alan._bas); removeEventListener('keyup', alan._birak); } };
})();
