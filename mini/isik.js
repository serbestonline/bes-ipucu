// Işık İzi: herkes durmadan ilerler ve arkasında iz bırakır. Telefonlar yalnız "sola / sağa / düz" yollar,
// oyunu sunucu yürütür ki herkes aynı izleri görsün. İze ya da duvara çarpan elenir; her elemede ayakta kalan
// herkes 1 puan alır. Bir kişi (tek başına oynarken hiç kimse) kalınca yeni el başlar. Süre 60 sn, en çok puan kazanır.
// İzde ara sıra kısa boşluklar kalır; becerikli olan aradan geçebilir.
const A = 100, HIZ = 15, DONUS = 2.7, TIK = 33, SURE = 90000, CARPMA = 1.0, BOSLUK_ARA = [1800, 3200], BOSLUK_SURE = 260;

module.exports = {
  ad: 'isik', baslik: 'Işık İzi',
  baslat(m) {
    m.basla = Date.now() + m.GERI_SAYIM;
    m.puan = Object.fromEntries(m.oyuncular.map((o) => [o.id, 0]));
    m.yasam = Object.fromEntries(m.oyuncular.map((o) => [o.id, 0])); // eşitlikte toplam hayatta kalma süresi
    m.elNo = 0; yeniEl(m);
    m.zamanlayici(() => { m.sonTik = Date.now(); tik(m); }, m.GERI_SAYIM);
    m.zamanlayici(() => bitir(m), m.GERI_SAYIM + SURE);
  },
  mesaj(m, o, v) {
    const d = m.durumlar && m.durumlar[o.id];
    if (d && [-1, 0, 1].includes(v.don)) d.don = v.don;
  },
  durum(m) {
    return {
      gecenMs: Date.now() - m.basla, sureMs: SURE, a: A, elNo: m.elNo,
      oyuncular: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return { id: o.id, ad: o.ad, renk: o.renk, puan: m.puan[o.id], canli: d.canli, iz: d.iz.map((p) => p && [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) }; }),
    };
  },
};

// yeni el: herkes çemberin üstünde, merkeze dönük başlar; izler silinir
function yeniEl(m) {
  m.elNo++; m.elBasladi = Date.now(); m.grid = new Map(); m.elBitiyor = false;
  const n = m.oyuncular.length;
  m.durumlar = Object.fromEntries(m.oyuncular.map((o, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * .4, r = n > 1 ? 32 : 0;
    const x = A / 2 + Math.cos(a) * r, y = A / 2 + Math.sin(a) * r;
    return [o.id, { x, y, aci: n > 1 ? a + Math.PI : Math.random() * 6.28, don: (m.durumlar && m.durumlar[o.id]) ? m.durumlar[o.id].don : 0, canli: true, iz: [[x, y]], bosluk: 0, sonrakiBosluk: Date.now() + ara(), no: 0 }];
  }));
}
const ara = () => BOSLUK_ARA[0] + Math.random() * (BOSLUK_ARA[1] - BOSLUK_ARA[0]);
const hucre = (x, y) => `${Math.floor(x / 2)},${Math.floor(y / 2)}`;

function tik(m) {
  if (m.bitti) return;
  const simdi = Date.now(), dt = Math.min(.08, (simdi - m.sonTik) / 1000); m.sonTik = simdi;
  const g = simdi - m.basla, olaylar = [];
  if (!m.elBitiyor) {
    const canlilar = m.oyuncular.filter((o) => m.durumlar[o.id].canli);
    for (const o of canlilar) {
      const d = m.durumlar[o.id];
      d.aci += d.don * DONUS * dt; d.x += Math.cos(d.aci) * HIZ * dt; d.y += Math.sin(d.aci) * HIZ * dt; d.no++;
      // boşluk: ara sıra kısa bir süre iz bırakılmaz
      if (!d.bosluk && simdi > d.sonrakiBosluk) d.bosluk = simdi + BOSLUK_SURE;
      if (d.bosluk && simdi > d.bosluk) { d.bosluk = 0; d.sonrakiBosluk = simdi + ara(); }
      // çarpışma: duvar ya da herhangi bir iz (kendi izinin son birkaç noktası hariç)
      let carpti = d.x < 0 || d.y < 0 || d.x > A || d.y > A;
      if (!carpti) for (let cx = -1; cx <= 1 && !carpti; cx++) for (let cy = -1; cy <= 1 && !carpti; cy++) {
        for (const p of m.grid.get(`${Math.floor(d.x / 2) + cx},${Math.floor(d.y / 2) + cy}`) || []) {
          if (p.id === o.id && d.no - p.no < 8) continue;
          if (Math.hypot(p.x - d.x, p.y - d.y) < CARPMA) { carpti = true; break; }
        }
      }
      if (carpti) {
        d.canli = false; olaylar.push({ elendi: o.id, x: d.x, y: d.y });
        for (const k of m.oyuncular) if (m.durumlar[k.id].canli && k.id !== o.id) m.puan[k.id]++;
        continue;
      }
      if (d.bosluk) d.iz.push(null); // çizgide kopukluk
      else { d.iz.push([d.x, d.y]); const h = hucre(d.x, d.y); if (!m.grid.has(h)) m.grid.set(h, []); m.grid.get(h).push({ x: d.x, y: d.y, id: o.id, no: d.no }); }
      m.yasam[o.id] += dt;
    }
    const kalan = m.oyuncular.filter((o) => m.durumlar[o.id].canli).length;
    if ((m.oyuncular.length > 1 && kalan <= 1) || kalan === 0) {
      m.elBitiyor = true;
      if (g < SURE - 3000) m.zamanlayici(() => { if (!m.bitti) { yeniEl(m); m.herkese({ t: 'mini', yeniEl: m.elNo }); m.yay(); } }, 1800);
    }
  }
  m.herkese({ t: 'mini', tik: { g, el: m.elNo, olay: olaylar, p: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return [o.id, Math.round(d.x * 10) / 10, Math.round(d.y * 10) / 10, d.canli ? 1 : 0, d.bosluk ? 1 : 0, m.puan[o.id]]; }) } });
  m.zamanlayici(() => tik(m), TIK);
}

function bitir(m) {
  if (m.bitti) return; m.bitti = true;
  const s = m.oyuncular.map((o) => ({ id: o.id, puan: m.puan[o.id], yasam: m.yasam[o.id] })).sort((a, b) => b.puan - a.puan || b.yasam - a.yasam);
  m.bitir(s.map((x) => x.id));
}
