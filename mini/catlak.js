// Çatlak Zemin: lavın üstünde 10x10 taş zemin. Üstüne basılan taş çatlar ve 0,9 sn sonra düşer.
// Serbest hareket, itme yok; iki oyuncu çarpışınca ikisi de geri savrulur ve 1 sn sersemler.
// Düşen taş 4 sn sonra geri gelir. Herkesin 3 canı var: lava düşen sağlam bir taşta yeniden doğar ve 1,5 sn korunur;
// canı biten elenir. Ayakta kalan son kişi kazanır; süre 60 sn.
// 35. saniyeden sonra kenarlardan içeri doğru zemin kalıcı olarak çöker (o taşlar geri gelmez).
// Konumu her telefon kendisi hesaplar ve yollar; taşları, çarpışmayı ve düşmeyi sunucu belirler.
const N = 10, SURE = 60000, CATLAMA = 900, GERI_GELME = 4000, YARICAP = 0.34, SERSEM = 1000, TIK = 66, COKUS = 35000, CAN = 3, KORUMA = 1500;

module.exports = {
  ad: 'catlak', baslik: 'Çatlak Zemin',
  baslat(m) {
    m.basla = Date.now() + m.GERI_SAYIM;
    m.tas = new Array(N * N).fill(0);       // 0 sağlam, 1 çatlıyor, 2 düştü (geri gelecek), 3 kalıcı çöktü
    m.dusme = new Array(N * N).fill(0);     // taşın düştüğü an
    m.kalici = new Array(N * N).fill(false);
    m.catlak = new Array(N * N).fill(0);    // çatlamanın başladığı an
    const n = m.oyuncular.length;
    m.durumlar = Object.fromEntries(m.oyuncular.map((o, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, r = n > 1 ? 3.2 : 0;
      return [o.id, { x: N / 2 + Math.cos(a) * r, y: N / 2 + Math.sin(a) * r, sersem: 0, dustu: null, kirdi: 0, carpisma: {}, can: CAN, koruma: 0, dogum: 0 }];
    }));
    m.cokusHalka = 0;
    m.zamanlayici(() => tik(m), m.GERI_SAYIM);
    m.zamanlayici(() => bitir(m), m.GERI_SAYIM + SURE);
  },
  mesaj(m, o, v) {
    const d = m.durumlar[o.id], g = Date.now() - m.basla;
    if (!d || d.dustu != null || g < 0 || g > SURE || !Array.isArray(v.poz)) return;
    if ((v.n | 0) !== d.dogum) return; // yeniden doğmadan önceki yerden yola çıkmış eski konum
    const [x, y] = v.poz.map(Number);
    // telefon bir tıkta en fazla kısa bir mesafe gidebilir; uçuk konum yok sayılır
    if (!isFinite(x) || !isFinite(y) || Math.hypot(x - d.x, y - d.y) > 2.5) return;
    d.x = x; d.y = y;
  },
  durum(m) {
    return {
      gecenMs: Date.now() - m.basla, sureMs: SURE, n: N, yaricap: YARICAP, catlamaMs: CATLAMA, geriGelmeMs: GERI_GELME, sersemMs: SERSEM, tas: m.tas.join(''),
      oyuncular: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return { id: o.id, ad: o.ad, renk: o.renk, x: d.x, y: d.y, dustu: d.dustu, can: d.can }; }),
    };
  },
};

function tik(m) {
  if (m.bitti) return;
  const simdi = Date.now(), g = simdi - m.basla, canli = m.oyuncular.filter((o) => m.durumlar[o.id].dustu == null);
  // üstünde durulan taş çatlamaya başlar
  for (const o of canli) {
    const d = m.durumlar[o.id], tx = Math.floor(d.x), ty = Math.floor(d.y), i = ty * N + tx;
    if (d.koruma > simdi) continue; // yeniden doğduktan sonra kısa süre ne düşer ne taşını çatlatır
    if (tx < 0 || ty < 0 || tx >= N || ty >= N || m.tas[i] >= 2) { yan(m, o, d, g, simdi); continue; }
    if (m.tas[i] === 0) { m.tas[i] = 1; m.catlak[i] = simdi; d.kirdi++; }
  }
  // 35. saniyeden sonra kenardan içeri her 2,5 sn'de bir halka çatlar
  if (g > COKUS) {
    const halka = Math.min(4, Math.floor((g - COKUS) / 2500));
    while (m.cokusHalka <= halka) {
      const h = m.cokusHalka++;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.min(x, y, N - 1 - x, N - 1 - y) === h) { const i = y * N + x; m.kalici[i] = true; if (m.tas[i] === 0) { m.tas[i] = 1; m.catlak[i] = simdi; } else if (m.tas[i] === 2) m.tas[i] = 3; }
    }
  }
  for (let i = 0; i < m.tas.length; i++) {
    if (m.tas[i] === 1 && simdi - m.catlak[i] > CATLAMA) { m.tas[i] = m.kalici[i] ? 3 : 2; m.dusme[i] = simdi; }
    else if (m.tas[i] === 2 && simdi - m.dusme[i] > GERI_GELME) m.tas[i] = 0; // düşen taş lavdan geri yükselir
  }
  // çarpışma: iki oyuncu birbirine değerse ikisi de ters yöne savrulur ve sersemler
  for (let a = 0; a < canli.length; a++) for (let b = a + 1; b < canli.length; b++) {
    const A = m.durumlar[canli[a].id], B = m.durumlar[canli[b].id], dx = B.x - A.x, dy = B.y - A.y, uz = Math.hypot(dx, dy) || 0.001;
    const anahtar = canli[b].id;
    if (uz < YARICAP * 2 && !(A.carpisma[anahtar] > simdi)) {
      A.carpisma[anahtar] = simdi + 600;
      A.sersem = B.sersem = simdi + SERSEM;
      m.herkese({ t: 'mini', carpisma: [[canli[a].id, -dx / uz, -dy / uz], [canli[b].id, dx / uz, dy / uz]] });
    }
  }
  m.herkese({ t: 'mini', tik: { g, tas: m.tas.join(''), p: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return [o.id, +d.x.toFixed(2), +d.y.toFixed(2), d.sersem > simdi ? 1 : 0, d.dustu != null ? 1 : 0, d.can, d.koruma > simdi ? 1 : 0]; }) } });
  // birden fazla oyuncu varken tek kişi kalırsa (ya da tek başına oynayan düşerse) oyun biter
  const kalan = m.oyuncular.filter((o) => m.durumlar[o.id].dustu == null).length;
  if ((m.oyuncular.length > 1 && kalan <= 1) || kalan === 0) { if (!m.bitisPlan) { m.bitisPlan = true; m.zamanlayici(() => bitir(m), 1500); } }
  m.zamanlayici(() => tik(m), TIK);
}

// lava düşen bir can kaybeder; can kaldıysa merkeze yakın, kimsenin olmadığı sağlam bir taşta yeniden doğar
function yan(m, o, d, g, simdi) {
  d.can--;
  const bos = [];
  if (d.can > 0) for (let i = 0; i < N * N; i++) {
    const x = i % N + .5, y = Math.floor(i / N) + .5;
    if (m.tas[i] !== 0 || m.kalici[i]) continue;
    if (m.oyuncular.some((p) => p !== o && m.durumlar[p.id].dustu == null && Math.hypot(m.durumlar[p.id].x - x, m.durumlar[p.id].y - y) < 1.5)) continue;
    bos.push([Math.hypot(x - N / 2, y - N / 2) + Math.random(), x, y]);
  }
  if (!bos.length) { d.can = 0; d.dustu = g; m.herkese({ t: 'mini', dustu: o.id, ad: o.ad }); return; }
  const [, x, y] = bos.sort((a, b) => a[0] - b[0])[0];
  d.x = x; d.y = y; d.sersem = 0; d.koruma = simdi + KORUMA; d.dogum++;
  m.herkese({ t: 'mini', yandi: o.id, ad: o.ad, can: d.can, poz: [x, y], n: d.dogum });
}

function bitir(m) {
  if (m.bitti) return; m.bitti = true;
  // ayakta kalanlar önde (canı çok olan, sonra az taş kıran üstte), düşenler geç düşen üstte
  const s = m.oyuncular.map((o) => ({ id: o.id, ...m.durumlar[o.id] }))
    .sort((a, b) => (a.dustu != null) - (b.dustu != null) || (a.dustu == null ? b.can - a.can || a.kirdi - b.kirdi : b.dustu - a.dustu));
  m.bitir(s.map((x) => x.id));
}
