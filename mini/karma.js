// Karışık Harfler: 90 saniye boyunca harfleri karıştırılmış kelimeler arka arkaya gelir, en çok düzelten kazanır.
// Kelimeler oyun setinden ayrı listeden (kelimeler/karma.json) gelir; herkes aynı sırayı görür.
const path = require('path');
const LISTE = require(path.join(__dirname, '../kelimeler/karma.json'));
const SURE = 90000; // 90 sn
// Türkçe karakterler esnek: ş yerine s yazmak da sayılır
const katla = (s) => s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c]).replace(/[^a-z]/g, '');
const harfDizisi = (s) => [...katla(s)].sort().join('');
// aynı harflerle kurulan her gerçek kelime kabul edilir (Zemberek sözlüğü + kendi listemiz)
const SOZLUK = new Set([...require(path.join(__dirname, '../kelimeler/sozluk.json')), ...LISTE].map(katla));
const gecerli = (cevap, hedef) => harfDizisi(cevap) === harfDizisi(hedef) && (katla(cevap) === katla(hedef) || SOZLUK.has(katla(cevap)));

function karistir(k) {
  const h = [...k.toLocaleUpperCase('tr')];
  for (let deneme = 0; deneme < 20; deneme++) {
    for (let i = h.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [h[i], h[j]] = [h[j], h[i]]; }
    if (h.join('') !== k.toLocaleUpperCase('tr')) break;
  }
  return h;
}

module.exports = {
  ad: 'karma', baslik: 'Karışık Harfler',
  baslat(m) {
    const sira = [...LISTE].sort(() => Math.random() - 0.5).slice(0, 160); // 90 sn için yeterli kelime
    m.kelimeler = sira.map((k) => ({ k, harf: karistir(k) }));
    m.basla = Date.now() + m.GERI_SAYIM;
    m.durumlar = Object.fromEntries(m.oyuncular.map((o) => [o.id, { no: 0, skor: 0, son: 0 }]));
    m.zamanlayici(() => m.yay(), m.GERI_SAYIM);
    m.zamanlayici(() => {
      // sıralama: çok düzelten önde; eşitse son doğruyu daha erken yapan
      const s = m.oyuncular.map((o) => ({ id: o.id, ...m.durumlar[o.id] })).sort((a, b) => b.skor - a.skor || a.son - b.son);
      m.bitir(s.map((x) => x.id));
    }, m.GERI_SAYIM + SURE);
  },
  mesaj(m, o, v) {
    const d = m.durumlar[o.id], simdi = Date.now();
    if (!d || simdi < m.basla || simdi > m.basla + SURE) return;
    const k = m.kelimeler[d.no];
    if (v.gec) { d.no++; d.skor--; m.gonder(o.id, { gecti: true }); return m.yay(); } // geçmenin bedeli 1 puan
    if (gecerli(v.cevap || '', k.k)) {
      d.skor++; d.no++; d.son = simdi - m.basla;
      m.gonder(o.id, { dogru: v.cevap });
      m.yay();
    } else m.gonder(o.id, { yanlis: true });
  },
  durum(m, id) {
    const d = m.durumlar[id];
    return {
      gecenMs: Date.now() - m.basla, sureMs: SURE,
      harfler: d ? m.kelimeler[d.no].harf : [], skor: d ? d.skor : 0,
      tablo: m.oyuncular.map((o) => ({ id: o.id, ad: o.ad, renk: o.renk, skor: m.durumlar[o.id].skor })).sort((a, b) => b.skor - a.skor),
    };
  },
};
module.exports.gecerli = gecerli; // test için
