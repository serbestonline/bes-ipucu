// Kule: parça şeridinin üstünde kayar, doğru anda bırakılır; yarısından azı dayanan parça devrilir.
// Tepedeki çizgiye ilk ulaşan kazanır; ilk ulaşandan sonra diğerlerine 8 saniye daha kalır. Süre 60 saniye.
// Parçalar herkese aynı sırayla gelir. Yığını her telefon kendisi kurar; sunucu ızgarayı alıp yüksekliği kendisi hesaplar.
const GEN = 10, HEDEF = 18, SURE = 60000, EK = 8000;

// parçalar: hücreler (x, y), y yukarı doğru; dönüş yok, yönü sıradan gelir
const SEKILLER = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]],
];

const yukseklik = (izgara) => { for (let y = izgara.length - 1; y >= 0; y--) if (/[1-9]/.test(izgara[y])) return y + 1; return 0; };

module.exports = {
  ad: 'kule', baslik: 'Kule', GEN, HEDEF, SEKILLER,
  baslat(m) {
    m.parcalar = Array.from({ length: 120 }, () => { const s = Math.random() * SEKILLER.length | 0; return { s, renk: 1 + (Math.random() * 6 | 0) }; });
    m.basla = Date.now() + m.GERI_SAYIM;
    m.bitis = m.basla + SURE;
    m.durumlar = Object.fromEntries(m.oyuncular.map((o) => [o.id, { izgara: [], yukseklik: 0, adet: 0, tepe: null, devrilen: 0 }]));
    m.zamanlayici(() => bitir(m), m.GERI_SAYIM + SURE);
  },
  mesaj(m, o, v) {
    const d = m.durumlar[o.id], simdi = Date.now();
    if (!d || simdi < m.basla || simdi > m.bitis || d.tepe != null) return;
    if (v.devrildi) { d.devrilen++; d.adet++; return m.yay(); }
    if (!Array.isArray(v.izgara) || v.izgara.length > HEDEF + 6 || !v.izgara.every((s) => typeof s === 'string' && s.length === GEN && /^[0-9]+$/.test(s))) return;
    d.izgara = v.izgara; d.yukseklik = Math.min(yukseklik(v.izgara), HEDEF); d.adet++;
    if (d.yukseklik >= HEDEF) {
      d.tepe = simdi - m.basla;
      // ilk ulaşan çıkınca kalanlara 8 saniye
      if (Object.values(m.durumlar).filter((x) => x.tepe != null).length === 1) {
        m.bitis = Math.min(m.bitis, simdi + EK);
        m.zamanlayici(() => bitir(m), m.bitis - simdi);
        m.herkese({ t: 'olay', m: `${o.ad} tepeye ulaştı! Kalanlara ${EK / 1000} saniye` });
      }
      if (Object.values(m.durumlar).every((x) => x.tepe != null)) bitir(m);
    }
    m.yay();
  },
  sabit(m) { return { geriSayimMs: m.GERI_SAYIM, gen: GEN, hedef: HEDEF, sekiller: SEKILLER, parcalar: m.parcalar }; },
  durum(m) {
    return {
      gecenMs: Date.now() - m.basla, bitisMs: m.bitis - m.basla,
      oyuncular: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return { id: o.id, ad: o.ad, renk: o.renk, izgara: d.izgara, yukseklik: d.yukseklik, tepe: d.tepe, devrilen: d.devrilen }; }),
    };
  },
};

function bitir(m) {
  if (m.bitti) return; m.bitti = true;
  // tepeye ulaşanlar varış sırasıyla, kalanlar yüksekliğe göre
  const s = m.oyuncular.map((o) => ({ id: o.id, ...m.durumlar[o.id] }))
    .sort((a, b) => (a.tepe == null) - (b.tepe == null) || (a.tepe ?? 0) - (b.tepe ?? 0) || b.yukseklik - a.yukseklik || a.devrilen - b.devrilen);
  m.bitir(s.map((x) => x.id));
}
module.exports.yukseklik = yukseklik;
