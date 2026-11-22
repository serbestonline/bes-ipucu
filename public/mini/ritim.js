// Ritim Dizisi, telefon tarafı: her oyuncunun şeridi; notalar sağdan sola akar, solda vuruş halkası ve dansçı.
(() => {
  // notaların geçiş süresi oyun boyunca 2,6 sn'den 1,8 sn'ye iner: akış giderek hızlanır (müzik temposu aynı kalır)
  const RENK = ['#ff5d5d', '#4fb3ff', '#5ee07a', '#ffcf4a'], YAK_BAS = 2600, YAK_SON = 1800, SOL = 64;
  let alan, gonder, benId, d, alinan, rafId, muzik, basladi, tuval, x, W, H;
  let vurdum, patlamalar, yargi, benimSon, oncekiVurulan, kacanlar;
  const $ = (s) => alan.querySelector(s);
  const ses = (ad, v = .4) => efektCal(ad, v); // önceden yüklenmiş Web Audio
  const gecen = () => d.gecenMs + performance.now() - alinan;

  function kur(a, g, kim) {
    alan = a; gonder = g; benId = kim; W = 0; H = 0; // yeni tuval baştan ölçülsün
    d = null; basladi = false; vurdum = new Set(); patlamalar = []; yargi = null; benimSon = null; oncekiVurulan = {}; kacanlar = new Set();
    muzik = new Audio('efekt/muzik/ritim.mp3'); muzik.volume = .8;
    alan.innerHTML = `<div class="ust"><h2>🕺 Ritim Dizisi</h2><span class="soluk" id="rs"></span></div>
      <div class="cubuk"><div id="rc"></div></div>
      <div class="geri" id="rg"></div>
      <div class="ritim-tuval"><canvas id="rt"></canvas></div>
      <div class="ritim-tuslar dortlu">${['▲', '▼', '◀', '▶'].map((s, i) => `<button data-t="${i}" style="--r:${RENK[i]}">${s}</button>`).join('')}</div>`;
    tuval = $('#rt'); x = tuval.getContext('2d');
    alan.querySelectorAll('.ritim-tuslar button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); bas(+b.dataset.t, b); }));
    kare();
  }

  function boyut() {
    const r = tuval.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); /* 3x ekranlarda piksel yükünü yarıya indirir */
    if (r.width === W && r.height === H) return;
    W = r.width; H = r.height; tuval.width = W * dpr; tuval.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // basılan tuşa en yakın, henüz vurulmamış aynı tuştaki nota aranır
  function bas(tus, b) {
    if (!d) return;
    const g = gecen(); if (g < 0 || g > d.sureMs + 500) return;
    b.classList.remove('basti'); void b.offsetWidth; b.classList.add('basti');
    let en = -1, enFark = Infinity;
    d.notalar.forEach((n, i) => { const f = g - n.t; if (n.tus === tus && !vurdum.has(i) && Math.abs(f) <= d.iyiMs && Math.abs(f) < Math.abs(enFark)) { en = i; enFark = f; } });
    if (en >= 0) {
      vurdum.add(en); const mk = Math.abs(enFark) <= d.mukemmelMs;
      gonder({ vur: en, fark: Math.round(enFark) });
      yargi = { metin: mk ? 'Mükemmel!' : 'İyi', renk: mk ? '#ffcf4a' : '#9fe0ff', z: performance.now() };
      patlamalar.push({ id: benId(), renk: RENK[tus], z: performance.now() });
      benimSon = { tus, sonuc: 'vur', z: performance.now() };
      ses('kutuphane/arayuz/click_00' + (tus + 1), .3);
    } else {
      gonder({ kacir: true, tus });
      yargi = { metin: 'Kaçtı', renk: '#ff5d5d', z: performance.now() };
      benimSon = { tus, sonuc: 'kacti', z: performance.now() };
      navigator.vibrate && navigator.vibrate(25);
    }
  }

  function guncelle(yeni) {
    d = yeni.mini; alinan = performance.now();
    // başkalarının yeni isabetleri kendi şeritlerinde patlar
    for (const o of d.oyuncular) {
      const eski = oncekiVurulan[o.id] || 0;
      if (o.id !== benId() && o.vurulan.length > eski) patlamalar.push({ id: o.id, renk: RENK[d.notalar[o.vurulan.at(-1)].tus], z: performance.now() });
      oncekiVurulan[o.id] = o.vurulan.length;
    }
  }

  function ucgen(cx, cy, r, tus, renk, saydam = 1) {
    const aci = [-Math.PI / 2, Math.PI / 2, Math.PI, 0][tus];
    x.save(); x.globalAlpha = saydam; x.translate(cx, cy);
    x.fillStyle = renk; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
    x.rotate(aci); x.fillStyle = '#111'; x.beginPath(); x.moveTo(r * .55, 0); x.lineTo(-r * .35, -r * .45); x.lineTo(-r * .35, r * .45); x.closePath(); x.fill();
    x.restore();
  }

  // çubuk adam: duruş son hareketten gelir (▲ kollar yukarı, ▼ çömel, ◀ ▶ eğil, ıska tökezle), yoksa vuruşa göre sallan
  function dansci(cx, ty, boy, renk, poz, g) {
    const faz = ((g + d.geriSayimMs) % d.vurusMs) / d.vurusMs, sal = Math.sin(faz * Math.PI), yon = Math.floor((g + d.geriSayimMs) / d.vurusMs) % 2 ? 1 : -1;
    let egim = yon * sal * .12, cok = -sal * 3, kolS = 2.4 + sal * .4, kolD = .74 - sal * .4, bacak = .25;
    if (poz === 0) { kolS = -2.6; kolD = -.5; cok = -5; egim = 0; }
    if (poz === 1) { cok = boy * .16; kolS = 2.0; kolD = 1.1; bacak = .7; egim = 0; }
    if (poz === 2) { egim = -.38; kolS = Math.PI; kolD = -1.2; }
    if (poz === 3) { egim = .38; kolS = -1.9; kolD = 0; }
    if (poz === 'kacti') { egim = .7; kolS = -2.2; kolD = -.8; cok = 4; }
    const kalca = { x: cx, y: ty + boy * .62 + cok }, gogus = { x: cx + Math.sin(egim) * boy * .32, y: kalca.y - Math.cos(egim) * boy * .32 };
    x.save(); x.strokeStyle = renk; x.fillStyle = renk; x.lineWidth = Math.max(3, boy * .08); x.lineCap = 'round';
    const cizgi = (a, b) => { x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); };
    const uc = (p, aci, u) => ({ x: p.x + Math.sin(aci) * u, y: p.y + Math.cos(aci) * u });
    cizgi(kalca, gogus);
    x.beginPath(); x.arc(gogus.x + Math.sin(egim) * boy * .13, gogus.y - Math.cos(egim) * boy * .13, boy * .11, 0, 7); x.fill();
    cizgi(gogus, uc(gogus, kolS, boy * .26)); cizgi(gogus, uc(gogus, -kolS + (poz === 2 || poz === 3 ? 2 * egim : 0), boy * .26));
    if (poz === 2 || poz === 3) cizgi(gogus, uc(gogus, kolD, boy * .26));
    const zemin = ty + boy;
    cizgi(kalca, { x: kalca.x - boy * bacak * .5, y: zemin }); cizgi(kalca, { x: kalca.x + boy * bacak * .5, y: zemin });
    x.restore();
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d) return;
    boyut();
    const g = gecen(), simdi = performance.now(), geri = $('#rg');
    // müzik tanıtım ekranından sonra, geri sayımla başlar
    if (!basladi && g >= -d.geriSayimMs) { basladi = true; muzik.currentTime = Math.max(0, (g + d.geriSayimMs) / 1000); muzik.play().catch(() => {}); }
    geri.textContent = g < 0 ? Math.ceil(-g / 1000) : ''; geri.style.display = g < 0 ? 'block' : 'none';
    $('#rc').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.sureMs)})`;
    $('#rs').textContent = g >= 0 && g < d.sureMs ? Math.ceil((d.sureMs - g) / 1000) + ' sn' : g >= d.sureMs ? 'bitti' : '';
    // kendi kaçırdığın notalar
    d.notalar.forEach((n, i) => { if (g - n.t > d.iyiMs && !vurdum.has(i) && !kacanlar.has(i)) { kacanlar.add(i); yargi = { metin: 'Kaçtı', renk: '#ff5d5d', z: simdi }; } });

    x.clearRect(0, 0, W, H);
    const ben = benId(), oyuncular = [...d.oyuncular].sort((a, b) => (b.id === ben) - (a.id === ben));
    const serit = Math.min(130, H / oyuncular.length), HX = SOL + 30;
    oyuncular.forEach((o, i) => {
      const y0 = i * serit, orta = y0 + serit / 2, benim = o.id === ben, r = Math.min(14, serit * .17);
      x.fillStyle = benim ? '#2d2640' : '#221d2e'; x.fillRect(0, y0 + 2, W, serit - 4);
      x.fillStyle = o.renk; x.fillRect(0, y0 + 2, 4, serit - 4);
      // şerit çizgisi ve vuruş halkası
      x.strokeStyle = '#ffffff14'; x.lineWidth = 2; x.beginPath(); x.moveTo(HX, orta); x.lineTo(W, orta); x.stroke();
      x.strokeStyle = benim ? '#ffffffaa' : '#ffffff44'; x.lineWidth = 3; x.beginPath(); x.arc(HX, orta, r + 4, 0, 7); x.stroke();
      // notalar
      const vurulan = benim ? vurdum : new Set(o.vurulan);
      d.notalar.forEach((n, j) => {
        if (vurulan.has(j)) return;
        // her notanın hızı kendi zamanına göre: geç gelen nota daha hızlı akar, notalar birbirini geçmez
        const hizN = (W - HX) / (YAK_BAS - (YAK_BAS - YAK_SON) * Math.min(1, n.t / d.sureMs)), nx = HX + (n.t - g) * hizN;
        if (nx > W + r || nx < HX - 60) return;
        ucgen(nx, orta, r, n.tus, nx < HX - d.iyiMs * hizN ? '#555' : RENK[n.tus], nx < HX ? Math.max(0, 1 + (nx - HX) / 60) : 1);
      });
      // isabet patlamaları
      patlamalar.filter((p) => p.id === o.id).forEach((p) => { const t = (simdi - p.z) / 300; if (t < 1) { x.strokeStyle = p.renk; x.globalAlpha = 1 - t; x.lineWidth = 4; x.beginPath(); x.arc(HX, orta, r + 4 + t * 18, 0, 7); x.stroke(); x.globalAlpha = 1; } });
      // dansçı ve ad
      const son = benim ? (benimSon && simdi - benimSon.z < 350 ? benimSon : null) : (o.son && g - o.son.g < 450 ? o.son : null);
      const poz = son ? (son.sonuc === 'kacti' ? 'kacti' : son.tus) : null;
      dansci(SOL / 2, y0 + serit * .2, serit * .62, o.renk, poz, g);
      x.fillStyle = '#f3eefc'; x.font = `700 ${Math.max(10, serit * .11)}px system-ui`; x.textAlign = 'left'; x.fillText(o.ad + (benim ? ' (sen)' : ''), HX + r + 10, y0 + 16);
      x.fillStyle = '#ffcf4a'; x.textAlign = 'right'; x.fillText(o.skor, W - 8, y0 + 16);
      if (benim && yargi && simdi - yargi.z < 500) {
        const t = (simdi - yargi.z) / 500; x.globalAlpha = 1 - t; x.fillStyle = yargi.renk; x.textAlign = 'center';
        x.font = `900 ${Math.max(14, serit * .16)}px system-ui`; x.fillText(yargi.metin, HX + 70, orta - r - 6 - t * 10); x.globalAlpha = 1;
      }
    });
    patlamalar = patlamalar.filter((p) => simdi - p.z < 300);
  }

  MINI.ritim = { kur, guncelle, kapat: () => { cancelAnimationFrame(rafId); muzik && muzik.pause(); } };
})();
