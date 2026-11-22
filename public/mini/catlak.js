// Çatlak Zemin, telefon tarafı: kuşbakışı lav üstünde taş zemin, altta sanal kol.
// Kendi konumunu telefon hesaplar (anında tepki); taşlar, çarpışma ve düşme sunucudan gelir.
(() => {
  const HIZ = 3.4, SAVRULMA = 7;
  let alan, gonder, benId, d, alinan, rafId, tuval, x, W, H;
  let tas, tasDegisim, tasOnce, ben, rakip, girdi, kol, sonGonder, sonKare, dustumZ, kabarcik, sersemBitis, dogum, yanmaZ;
  const $ = (s) => alan.querySelector(s);
  const ses = (ad, v = .5) => efektCal(ad, v); // önceden yüklenmiş Web Audio
  const gecen = () => d.gecenMs + performance.now() - alinan;

  function kur(a, g, kim) {
    // W = H = 0: yeni tuval baştan ölçülsün (önceki oyunun ölçüsü kalırsa yeni tuval hiç boyutlanmaz)
    alan = a; gonder = g; benId = kim; W = 0; H = 0; d = null; tas = null; tasDegisim = []; tasOnce = []; ben = null; rakip = {}; girdi = [0, 0]; kol = null; sonGonder = 0; sonKare = performance.now(); dustumZ = null; sersemBitis = 0; dogum = 0; yanmaZ = 0;
    kabarcik = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 5, h: .3 + Math.random() * .7 }));
    alan.innerHTML = `<div class="ust"><h2>🌋 Çatlak Zemin</h2><span class="soluk" id="cs"></span></div>
      <div class="cubuk"><div id="cc"></div></div>
      <div class="geri" id="cg"></div>
      <div class="catlak-alan"><canvas id="ct"></canvas></div>
      <div class="catlak-kol" id="ck"><div class="kol-taban"><div class="kol-top"></div></div><span>Parmağını sürükle</span></div>`;
    tuval = $('#ct'); x = tuval.getContext('2d');
    // sanal kol: dokunduğun yer merkez olur, parmağın yönü hareket yönü
    const ck = $('#ck'), taban = ck.querySelector('.kol-taban'), top = ck.querySelector('.kol-top');
    const yer = (e) => { const r = ck.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    ck.addEventListener('pointerdown', (e) => { e.preventDefault(); ck.setPointerCapture(e.pointerId); const [px, py] = yer(e); kol = { ox: px, oy: py }; taban.style.left = px + 'px'; taban.style.top = py + 'px'; ck.classList.add('aktif'); });
    ck.addEventListener('pointermove', (e) => {
      if (!kol) return; const [px, py] = yer(e); let dx = px - kol.ox, dy = py - kol.oy; const u = Math.hypot(dx, dy), R = 48;
      if (u > R) { dx *= R / u; dy *= R / u; } top.style.transform = `translate(${dx}px, ${dy}px)`; girdi = [dx / R, dy / R];
    });
    const birak = () => { kol = null; girdi = [0, 0]; top.style.transform = ''; ck.classList.remove('aktif'); };
    ck.addEventListener('pointerup', birak); ck.addEventListener('pointercancel', birak);
    // bilgisayarda denemek için yön tuşları ve WASD
    const tuslar = new Set(), klavye = () => { const k = (a, b) => (tuslar.has(a) || tuslar.has(b) ? 1 : 0); const v = [k('d', 'arrowright') - k('a', 'arrowleft'), k('s', 'arrowdown') - k('w', 'arrowup')]; const u = Math.hypot(...v) || 1; girdi = [v[0] / u, v[1] / u]; };
    alan._tusBas = (e) => { tuslar.add(e.key.toLowerCase()); klavye(); }; alan._tusBirak = (e) => { tuslar.delete(e.key.toLowerCase()); klavye(); };
    addEventListener('keydown', alan._tusBas); addEventListener('keyup', alan._tusBirak);
    kare();
  }

  function guncelle(yeni) {
    const ilk = !d; d = yeni.mini; alinan = performance.now();
    if (ilk) {
      tas = [...d.tas].map(Number);
      for (const o of d.oyuncular) {
        if (o.id === benId()) ben = { x: o.x, y: o.y, vx: 0, vy: 0, renk: o.renk, ad: o.ad, can: o.can ?? 3, koruma: 0 };
        else rakip[o.id] = { x: o.x, y: o.y, hx: o.x, hy: o.y, renk: o.renk, ad: o.ad, sersem: 0, dustu: 0, can: o.can ?? 3, koruma: 0 };
      }
    }
  }

  function mesaj(m) {
    if (!d) return;
    if (m.tik) {
      const yeni = [...m.tik.tas].map(Number);
      yeni.forEach((v, i) => { if (v !== tas[i]) { tasDegisim[i] = performance.now(); tasOnce[i] = tas[i]; } });
      if (yeni.some((v, i) => v >= 2 && tas[i] < 2)) ses('kutuphane/arayuz/drop_00' + (1 + (Math.random() * 3 | 0)), .25);
      tas = yeni;
      for (const [id, px, py, ser, dus, can, kor] of m.tik.p) {
        if (id === benId()) { if (ben) { ben.can = can; ben.koruma = kor; } continue; }
        const r = rakip[id]; if (!r) continue;
        r.hx = px; r.hy = py; r.sersem = ser; r.can = can; r.koruma = kor; if (dus && !r.dustu) r.dustu = performance.now();
      }
    }
    if (m.carpisma) for (const [id, dx, dy] of m.carpisma) {
      if (id === benId() && ben) { ben.vx = dx * SAVRULMA; ben.vy = dy * SAVRULMA; sersemBitis = performance.now() + d.sersemMs; ses('kutuphane/arayuz/drop_004', .7); navigator.vibrate && navigator.vibrate([40, 30, 40]); }
    }
    // lava düşüp yeniden doğma: kendin ışınlanırsın, rakip kaymadan yeni yerinde belirir
    if (m.yandi) {
      if (m.yandi === benId() && ben) { ben.x = m.poz[0]; ben.y = m.poz[1]; ben.vx = ben.vy = 0; ben.can = m.can; dogum = m.n; sersemBitis = 0; yanmaZ = performance.now(); ses('kutuphane/arayuz/error_008', .5); navigator.vibrate && navigator.vibrate(200); }
      else if (rakip[m.yandi]) { const r = rakip[m.yandi]; r.x = r.hx = m.poz[0]; r.y = r.hy = m.poz[1]; r.can = m.can; }
    }
    if (m.dustu === benId() && !dustumZ) { dustumZ = performance.now(); ses('kutuphane/arayuz/error_008', .6); navigator.vibrate && navigator.vibrate(300); }
  }

  function boyut() {
    const r = tuval.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); /* 3x ekranlarda piksel yükünü yarıya indirir */
    if (r.width === W && r.height === H) return; W = r.width; H = r.height; tuval.width = W * dpr; tuval.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lav(t) {
    const g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, '#ffb13b'); g.addColorStop(.5, '#ff6a1f'); g.addColorStop(1, '#b8260f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // akan lav damarları ve kabarcıklar
    x.strokeStyle = '#ffe08a55'; x.lineWidth = 3;
    for (let i = 0; i < 6; i++) { x.beginPath(); for (let k = 0; k <= 20; k++) { const xx = k / 20 * W, yy = (i + .5) / 6 * H + Math.sin(k * .7 + t * 1.3 + i) * 8; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
    for (const b of kabarcik) { const yy = ((b.y - t * .03 * b.h) % 1 + 1) % 1; x.fillStyle = '#ffe9a066'; x.beginPath(); x.arc(b.x * W, yy * H, b.r * (.6 + .4 * Math.sin(t * 3 + b.x * 9)), 0, 7); x.fill(); }
  }

  function tasCiz(i, ox, oy, b, simdi) {
    const tx = i % d.n, ty = Math.floor(i / d.n), durum = tas[i], dt = simdi - (tasDegisim[i] || 0);
    let X = ox + tx * b, Y = oy + ty * b, olcek = 1, saydam = 1;
    if (durum >= 2) {
      if (dt <= 350) { olcek = 1 - dt / 350 * .5; saydam = 1 - dt / 350; }
      else {
        // geri gelecek taşın yeri, dönüşüne bir saniye kala lavın içinde yanıp söner
        if (durum === 2 && dt > d.geriGelmeMs - 1000) { x.strokeStyle = `rgba(255,240,200,${.4 + .4 * Math.sin(simdi / 70)})`; x.lineWidth = 3; x.beginPath(); x.roundRect(X + b * .08, Y + b * .08, b * .84, b * .84, 6); x.stroke(); }
        return;
      }
    }
    if (durum === 0 && tasOnce[i] === 2 && dt < 400) { olcek = .6 + .4 * (dt / 400); saydam = dt / 400; } // lavdan yükselerek geri gelir
    if (durum === 1) { const s = Math.min(1, dt / d.catlamaMs) * 2.2; X += (Math.random() - .5) * s; Y += (Math.random() - .5) * s; }
    x.save(); x.globalAlpha = saydam; x.translate(X + b / 2, Y + b / 2); x.scale(olcek, olcek);
    const p = b * .04, k = b - p * 2;
    x.fillStyle = '#2a1d18'; x.beginPath(); x.roundRect(-k / 2, -k / 2 + 3, k, k, 6); x.fill();
    const ton = durum === 1 ? 60 - Math.min(1, dt / d.catlamaMs) * 28 : 62 + ((tx * 7 + ty * 13) % 5) * 3;
    x.fillStyle = `hsl(28 14% ${ton}%)`; x.beginPath(); x.roundRect(-k / 2, -k / 2, k, k, 6); x.fill();
    x.fillStyle = '#ffffff30'; x.fillRect(-k / 2 + 4, -k / 2 + 3, k - 8, 3);
    x.strokeStyle = '#00000025'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-k * .3, -k * .1); x.lineTo(k * .05, k * .2); x.stroke();
    // çatlaklar: çatlama ilerledikçe çoğalır, aralarından lav ışığı sızar
    if (durum === 1) {
      const n = 1 + Math.floor(Math.min(1, dt / d.catlamaMs) * 4);
      x.strokeStyle = '#ffb13b'; x.lineWidth = 2;
      for (let c = 0; c < n; c++) { const a = (c * 2.1 + tx + ty) % 6.28; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * k * .25, Math.sin(a) * k * .25); x.lineTo(Math.cos(a + .5) * k * .45, Math.sin(a + .5) * k * .45); x.stroke(); }
    }
    x.restore();
  }

  function karakter(px, py, r, renk, ad, sersem, dustuZ, simdi, benim, can, koruma) {
    let olcek = 1, saydam = 1;
    if (dustuZ) { const t = (simdi - dustuZ) / 700; if (t > 1) return; olcek = 1 - t * .7; saydam = 1 - t; }
    else if (koruma) saydam = .45 + .4 * Math.sin(simdi / 60); // yeniden doğduktan sonra korunurken yanıp söner
    x.save(); x.globalAlpha = saydam; x.translate(px, py); x.scale(olcek, olcek);
    x.fillStyle = '#0006'; x.beginPath(); x.ellipse(0, r * .8, r * .9, r * .35, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, r + 3, 0, 7); x.fill();
    x.fillStyle = renk; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
    x.fillStyle = '#ffffff55'; x.beginPath(); x.arc(-r * .3, -r * .35, r * .3, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = `900 ${r * 1.05}px "Arial Black", Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ad[0].toLocaleUpperCase('tr'), 0, 1);
    if (sersem) for (let i = 0; i < 3; i++) { const a = simdi / 180 + i * 2.1; x.fillStyle = '#ffcf4a'; x.font = `${r * .8}px system-ui`; x.fillText('★', Math.cos(a) * r * 1.2, -r * 1.1 + Math.sin(a) * r * .35); }
    x.textBaseline = 'alphabetic'; x.font = `800 ${Math.max(10, r * .7)}px system-ui`; x.lineWidth = 3; x.strokeStyle = '#14111c';
    x.strokeText(benim ? 'Sen' : ad, 0, -r - 8); x.fillStyle = '#fff'; x.fillText(benim ? 'Sen' : ad, 0, -r - 8);
    // kalan canlar ayağının altında küçük kalpler
    if (!dustuZ) { x.font = `${Math.max(9, r * .62)}px system-ui`; x.textBaseline = 'top'; x.fillText('❤️'.repeat(Math.max(0, can)), 0, r + 5); }
    x.restore();
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d || !tas || !ben) return;
    boyut();
    const simdi = performance.now(), dt = Math.min(.05, (simdi - sonKare) / 1000), g = gecen(); sonKare = simdi;
    const geri = $('#cg'); geri.textContent = g < 0 ? Math.ceil(-g / 1000) : ''; geri.style.display = g < 0 ? 'block' : 'none';
    $('#cc').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.sureMs)})`;
    const canliSayi = Object.values(rakip).filter((r) => !r.dustu).length + (dustumZ ? 0 : 1);
    $('#cs').textContent = dustumZ ? 'elendin!' : g >= 0 && g < d.sureMs ? `${'❤️'.repeat(ben.can)} · ${Math.ceil((d.sureMs - g) / 1000)} sn · ${canliSayi} kişi` : g >= d.sureMs ? 'bitti' : '';
    // kendi hareketin: sersemken girdi yok, savrulma hızı söner
    if (g >= 0 && g < d.sureMs && !dustumZ) {
      const serseme = simdi < sersemBitis;
      ben.x += ((serseme ? 0 : girdi[0] * HIZ) + ben.vx) * dt; ben.y += ((serseme ? 0 : girdi[1] * HIZ) + ben.vy) * dt;
      const sonum = Math.exp(-dt * 6); ben.vx *= sonum; ben.vy *= sonum;
      if (simdi - sonGonder > 66) { sonGonder = simdi; gonder({ poz: [+ben.x.toFixed(3), +ben.y.toFixed(3)], n: dogum }); }
    }
    for (const r of Object.values(rakip)) { r.x += (r.hx - r.x) * Math.min(1, dt * 14); r.y += (r.hy - r.y) * Math.min(1, dt * 14); }

    lav(simdi / 1000);
    const b = Math.min(W, H) / (d.n + .6), ox = (W - b * d.n) / 2, oy = (H - b * d.n) / 2;
    for (let i = 0; i < tas.length; i++) tasCiz(i, ox, oy, b, simdi);
    const r = d.yaricap * b;
    for (const [id, o] of Object.entries(rakip)) karakter(ox + o.x * b, oy + o.y * b, r, o.renk, o.ad, o.sersem, o.dustu, simdi, false, o.can, o.koruma);
    karakter(ox + ben.x * b, oy + ben.y * b, r, ben.renk, ben.ad, simdi < sersemBitis, dustumZ, simdi, true, ben.can, ben.koruma);
    // yeni yandıysan kısa bir uyarı: kaç canın kaldı
    if (yanmaZ && !dustumZ && simdi - yanmaZ < 1400) {
      x.save(); x.globalAlpha = Math.min(1, (1400 - (simdi - yanmaZ)) / 400); x.textAlign = 'center'; x.font = '900 italic 26px "Arial Black", Arial'; x.lineWidth = 7; x.strokeStyle = '#14111c';
      const y = ben.can === 1 ? 'SON CANIN!' : `${ben.can} CANIN KALDI`; x.strokeText(y, W / 2, H * .18); x.fillStyle = '#ffcf4a'; x.fillText(y, W / 2, H * .18); x.restore();
    }
    if (dustumZ && simdi - dustumZ > 700) {
      x.font = '900 italic 30px "Arial Black", Arial'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#14111c';
      x.strokeText('CANIN BİTTİ!', W / 2, H / 2); x.fillStyle = '#ffcf4a'; x.fillText('CANIN BİTTİ!', W / 2, H / 2);
      x.font = '700 13px system-ui'; x.lineWidth = 4; x.strokeText('Diğerlerini izliyorsun', W / 2, H / 2 + 24); x.fillStyle = '#fff'; x.fillText('Diğerlerini izliyorsun', W / 2, H / 2 + 24);
    }
  }

  MINI.catlak = { kur, guncelle, mesaj, kapat: () => { cancelAnimationFrame(rafId); removeEventListener('keydown', alan._tusBas); removeEventListener('keyup', alan._tusBirak); } };
})();
