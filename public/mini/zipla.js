// Zıpla Eğil, telefon tarafı: ortada sahne, altında iki büyük düğme (⬆ ZIPLA, ⬇ EĞİL).
// Karakterler Ritim Dizisi'ndeki gibi çubuk adamlar: koşar, zıplarken kollarını kaldırır, eğilince çömelir, çarpınca tökezler.
// Herkes aynı platformda kademeli şeritlerde durur; sen en öndesin. Silindirler sağdan gelir ve giderek hızlanır.
(() => {
  const ZIPLA = 650, EGIL = 700, KORUMA = 1000;
  let alan, gonder, benId, d, alinan, rafId, tuval, x, W, H, yildiz;
  let zipBas, egBas, korumaBit, yargilanan, benimCan, elendim, olaylar;
  const $ = (s) => alan.querySelector(s);
  const ses = (ad, v = .45) => efektCal(ad, v); // önceden yüklenmiş Web Audio
  const gecen = () => d.gecenMs + performance.now() - alinan;

  function kur(a, g, kim) {
    alan = a; gonder = g; benId = kim; d = null; yildiz = null; W = 0; H = 0; // yeni tuval: eski ölçü kalmasın
    zipBas = -1e9; egBas = -1e9; korumaBit = -1e9; yargilanan = new Set(); benimCan = 3; elendim = false; olaylar = [];
    alan.innerHTML = `<div class="ust"><h2>🦘 Zıpla Eğil</h2><span class="soluk" id="zs"></span></div>
      <div class="cubuk"><div id="zc"></div></div>
      <div class="geri" id="zg"></div>
      <div class="zipla-kap">
        <div class="zipla-tuval"><canvas id="zt"></canvas></div>
        <div class="zipla-tuslar"><button id="zegil">⬇<small>EĞİL</small></button><button id="zzipla">⬆<small>ZIPLA</small></button></div>
      </div>`;
    tuval = $('#zt'); x = tuval.getContext('2d');
    $('#zzipla').addEventListener('pointerdown', (e) => { e.preventDefault(); eylem('zipla'); });
    $('#zegil').addEventListener('pointerdown', (e) => { e.preventDefault(); eylem('egil'); });
    kare();
  }

  function eylem(tur) {
    if (!d || elendim) return;
    const g = gecen(); if (g < 0 || g > d.sureMs) return;
    if (tur === 'zipla') { if (g - zipBas < ZIPLA) return; zipBas = g; egBas = -1e9; ses('kutuphane/arayuz/maximize_00' + (1 + (Math.random() * 3 | 0)), .35); }
    else { if (g - egBas < EGIL * .6) return; egBas = g; zipBas = -1e9; ses('kutuphane/arayuz/minimize_00' + (1 + (Math.random() * 3 | 0)), .35); }
    const b = $(tur === 'zipla' ? '#zzipla' : '#zegil'); b.classList.remove('basti'); void b.offsetWidth; b.classList.add('basti');
    gonder({ eylem: tur, g: Math.round(g) });
  }

  const ziplamaY = (g, bas) => { const p = (g - bas) / ZIPLA; return p > 0 && p < 1 ? 4 * p * (1 - p) : 0; };
  const egik = (g, bas) => g - bas >= 0 && g - bas < EGIL;

  function guncelle(yeni) {
    d = yeni.mini; alinan = performance.now();
    const ben = d.oyuncular.find((o) => o.id === benId());
    if (ben) { benimCan = Math.min(benimCan, ben.can); if (ben.elendi != null) elendim = true; }
  }

  function boyut() {
    const r = tuval.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); /* 3x ekranlarda piksel yükünü yarıya indirir */
    if (r.width === W && r.height === H) return;
    W = r.width; H = r.height; tuval.width = W * dpr; tuval.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function silindir(cx, cy, r, aci) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = '#c9c4d6';
    for (let i = 0; i < 8; i++) { x.save(); x.rotate(aci + i * Math.PI / 4); x.beginPath(); x.moveTo(r * .8, -r * .22); x.lineTo(r * 1.45, 0); x.lineTo(r * .8, r * .22); x.fill(); x.restore(); }
    const g = x.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#a0703f'); g.addColorStop(1, '#5a3a1d');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
    x.strokeStyle = '#3a2410'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r * .6, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * .25, 0, 7); x.stroke();
    x.restore();
  }

  // çubuk adam (Ritim Dizisi'ndeki dansçının koşan hali); zemin = ayakların bastığı çizgi; başın üstünün y'sini döndürür
  function cubukAdam(cx, zemin, boy, renk, poz, g, saydam) {
    const adim = Math.sin(g / 95), yuk = poz.yuk || 0, kalkis = yuk * boy * 1.4;
    let egim = .12, kolOn = .9 + adim * .7, kolArka = -.9 - adim * .7, bacakOn = .45 * adim, bacakArka = -.45 * adim, cok = 0, diz = .25;
    if (poz.zipla) { kolOn = -2.7; kolArka = 2.7; bacakOn = .6; bacakArka = -.2; diz = .9; egim = 0; }
    if (poz.egil) { cok = boy * .3; egim = .55; kolOn = 1.4; kolArka = 1.1; diz = 1.1; bacakOn = .5; bacakArka = -.3; }
    if (poz.tokez) { egim = -.7; kolOn = -2.3; kolArka = -1.2; }
    const kalca = { x: cx, y: zemin - boy * .46 - kalkis + cok };
    const gogus = { x: kalca.x + Math.sin(egim) * boy * .34, y: kalca.y - Math.cos(egim) * boy * .34 };
    x.save(); x.globalAlpha = saydam; x.strokeStyle = renk; x.fillStyle = renk; x.lineWidth = Math.max(3.5, boy * .085); x.lineCap = 'round'; x.lineJoin = 'round';
    const cizgi = (...p) => { x.beginPath(); x.moveTo(p[0].x, p[0].y); p.slice(1).forEach((q) => x.lineTo(q.x, q.y)); x.stroke(); };
    const uc = (p, aci, u) => ({ x: p.x + Math.sin(aci) * u, y: p.y + Math.cos(aci) * u });
    for (const a of [bacakOn, bacakArka]) { const dz = uc(kalca, a + (poz.egil ? .6 : 0), boy * .24); cizgi(kalca, dz, uc(dz, a - diz * Math.sign(a || 1) * .6, boy * .24)); }
    cizgi(kalca, gogus);
    for (const a of [kolOn, kolArka]) { const dr = uc(gogus, a, boy * .17); cizgi(gogus, dr, uc(dr, a + .5, boy * .16)); }
    const basX = gogus.x + Math.sin(egim) * boy * .13, basY = gogus.y - Math.cos(egim) * boy * .13;
    x.beginPath(); x.arc(basX, basY, boy * .12, 0, 7); x.fill();
    x.globalAlpha = saydam * .35; x.fillStyle = '#000'; x.beginPath(); x.ellipse(cx, zemin + 2, boy * .22 * (1 - yuk * .5), 4, 0, 0, 7); x.fill();
    x.restore();
    return basY - boy * .14;
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d) return;
    boyut();
    const g = gecen(), simdi = performance.now(), geri = $('#zg');
    geri.textContent = g < 0 ? Math.ceil(-g / 1000) : ''; geri.style.display = g < 0 ? 'block' : 'none';
    $('#zc').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.sureMs)})`;
    $('#zs').textContent = elendim ? 'elendin, izliyorsun' : g >= 0 && g < d.sureMs ? Math.ceil((d.sureMs - g) / 1000) + ' sn' : g >= d.sureMs ? 'bitti' : '';
    $('#zzipla').disabled = $('#zegil').disabled = elendim || g < 0 || g > d.sureMs;

    // kendi çarpışman: silindir karakterin hizasına geldiği an
    if (!elendim) d.engeller.forEach((e, i) => {
      if (yargilanan.has(i) || g < e.t) return;
      yargilanan.add(i);
      const kurtuldu = e.tip === 'alcak' ? ziplamaY(e.t, zipBas) > .32 : egik(e.t, egBas);
      if (kurtuldu || e.t < korumaBit) { if (kurtuldu) olaylar.push({ metin: e.tip === 'alcak' ? 'Hop!' : 'Kıl payı!', z: simdi }); return; }
      korumaBit = g + KORUMA; benimCan = Math.max(0, benimCan - 1);
      gonder({ vurul: i }); ses('kutuphane/arayuz/error_008', .55); navigator.vibrate && navigator.vibrate([60, 40, 60]);
      if (benimCan === 0) elendim = true;
    });

    // her oyuncunun kendi şeridi: kendi zemini, kendi silindirleri, tek karakter. Sen en alttasın, şeridin daha büyük.
    const oyuncular = [...d.oyuncular].sort((a, b) => (a.id === benId()) - (b.id === benId()));
    const n = oyuncular.length, birim = H / (n - 1 + 1.6), PX = W * .3;
    if (!yildiz) yildiz = Array.from({ length: 30 }, () => [Math.random(), Math.random() * .55, Math.random() * 1.4 + .4]);
    const sonraki = d.engeller.find((e) => e.t >= g) || d.engeller.at(-1), hiz = (d.engeller[0].gecis / sonraki.gecis).toFixed(1);
    let y0 = 0, benimSerit = null;
    oyuncular.forEach((o) => {
      const benim = o.id === benId(), h = benim ? birim * 1.6 : birim, ust = y0; y0 += h;
      const zemin = ust + h * .86, boy = Math.min(h * .36, 80), elenmis = o.elendi != null;
      x.save(); x.beginPath(); x.rect(0, ust, W, h); x.clip();
      // gökyüzü ve yıldızlar
      const bg = x.createLinearGradient(0, ust, 0, ust + h); bg.addColorStop(0, '#3a2a5c'); bg.addColorStop(1, '#1d1729');
      x.fillStyle = bg; x.fillRect(0, ust, W, h);
      yildiz.forEach(([x0, yy, r], i) => { x.globalAlpha = .25 + .3 * Math.sin(simdi / 700 + i); x.fillStyle = '#fff'; x.beginPath(); x.arc(x0 * W, ust + yy * h, r, 0, 7); x.fill(); }); x.globalAlpha = 1;
      // zemin: oyuncunun renginde kenar çizgisi
      x.fillStyle = '#54447a'; x.fillRect(0, zemin, W, ust + h - zemin);
      x.fillStyle = o.renk; x.fillRect(0, zemin, W, 3);
      // silindirler: alçaktaki zeminde yuvarlanır, yüksekteki zincirle sallanır
      d.engeller.forEach((e) => {
        const ex = PX + (e.t - g) * (W - PX) / e.gecis;
        if (ex < -60 || ex > W + 60) return;
        const r = boy * .3, ey = e.tip === 'alcak' ? zemin - r : zemin - boy * 1.05 - r * .1;
        if (e.tip === 'yuksek') { x.strokeStyle = '#8a83a0'; x.lineWidth = 2; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(ex, ust); x.lineTo(ex, ey - r); x.stroke(); x.setLineDash([]); }
        silindir(ex, ey, r, -g / 140);
      });
      // karakter: kendin için yerel, başkaları için sunucudan gelen son eylem
      let poz = {};
      if (benim) poz = { yuk: ziplamaY(g, zipBas), zipla: g - zipBas < ZIPLA, egil: egik(g, egBas), tokez: g < korumaBit && g > korumaBit - 450 };
      else if (o.son) poz = o.son.eylem === 'zipla' ? { yuk: ziplamaY(g, o.son.g), zipla: g - o.son.g < ZIPLA } : { egil: egik(g, o.son.g) };
      if (elenmis) poz = { tokez: true };
      const dus = elenmis ? Math.min(1, (g - o.elendi) / 900) : 0, yanip = benim && g < korumaBit && Math.floor(g / 100) % 2;
      cubukAdam(PX, zemin + dus * h * .6, boy, o.renk, poz, g, elenmis ? Math.max(.15, 1 - dus) : yanip ? .35 : 1);
      // şerit başlığı: ad ve canlar
      const can = benim ? benimCan : o.can;
      x.font = `800 ${benim ? 15 : 13}px system-ui`; x.textAlign = 'left'; x.lineWidth = 4; x.strokeStyle = '#14111c';
      const etiket = o.ad + (benim ? ' (sen)' : '');
      x.strokeText(etiket, 10, ust + (benim ? 22 : 18)); x.fillStyle = benim ? '#ffcf4a' : '#f3eefc'; x.fillText(etiket, 10, ust + (benim ? 22 : 18));
      x.font = `${benim ? 16 : 12}px system-ui`; x.fillText('❤️'.repeat(can) + '🖤'.repeat(Math.max(0, d.can - can)), 10 + x.measureText(' ').width, ust + (benim ? 44 : 34));
      if (elenmis) { x.fillStyle = '#14111caa'; x.fillRect(0, ust, W, h); x.font = `900 italic ${benim ? 30 : 20}px "Arial Black", Arial`; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = '#14111c'; x.strokeText(benim ? 'ELENDİN' : 'ELENDİ', W / 2, ust + h * .5); x.fillStyle = '#ff5d5d'; x.fillText(benim ? 'ELENDİN' : 'ELENDİ', W / 2, ust + h * .5); }
      x.restore();
      x.fillStyle = '#14111c'; x.fillRect(0, y0 - 1.5, W, 3); // şeritler arası ayırıcı
      if (benim) benimSerit = { ust, h, zemin, boy };
    });
    // hız göstergesi ve kendi şeridindeki "Hop!" yazıları
    x.font = '900 italic 15px "Arial Black", Arial'; x.textAlign = 'right'; x.lineWidth = 4; x.strokeStyle = '#14111c'; x.strokeText(`HIZ ×${hiz}`, W - 10, 22); x.fillStyle = hiz > 1.8 ? '#ff5d5d' : hiz > 1.3 ? '#ff9f43' : '#ffcf4a'; x.fillText(`HIZ ×${hiz}`, W - 10, 22);
    olaylar = olaylar.filter((o) => simdi - o.z < 600);
    if (benimSerit) olaylar.forEach((o) => { const t = (simdi - o.z) / 600, yy = benimSerit.ust + benimSerit.h * .3 - t * 16; x.globalAlpha = 1 - t; x.font = '900 italic 22px "Arial Black", Arial'; x.textAlign = 'center'; x.lineWidth = 5; x.strokeStyle = '#14111c'; x.strokeText(o.metin, PX + 70, yy); x.fillStyle = '#5ee07a'; x.fillText(o.metin, PX + 70, yy); x.globalAlpha = 1; });
  }

  MINI.zipla = { kur, guncelle, kapat: () => cancelAnimationFrame(rafId) };
})();
