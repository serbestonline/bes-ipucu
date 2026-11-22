// Ritim Dizisi: notalar müzikle senkron sağdan sola akar; nota vuruş halkasına gelince doğru tuşa basılır.
// İsabeti her telefon kendisi ölçer (tünel gecikmesi kimseyi etkilemez); sunucu sonucu doğrular ve herkese dağıtır.
const VURUS = 500, SURE = 40000, MUKEMMEL = 120, IYI = 250;

// nota şeması: başta seyrek, sonra giderek sıklaşır; aynı tuş üç kez art arda gelmez
function sema() {
  const notalar = [];
  for (let s = 0; s < SURE / (VURUS / 2) - 2; s++) {
    const t = s * VURUS / 2, sekizlik = s % 2 === 1;
    // ilk 12 sn saniyede bir nota, sonra her vuruşa bir nota, son 12 sn ara sıra sekizlik
    const vurusNo = s / 2;
    const olasilik = t < 12000 ? (!sekizlik && vurusNo % 2 === 0 ? 1 : 0) : t < 28000 ? (sekizlik ? 0 : 0.95) : (sekizlik ? 0.25 : 1);
    if (Math.random() > olasilik) continue;
    let tus;
    do tus = Math.random() * 4 | 0; while (notalar.length >= 2 && notalar.at(-1).tus === tus && notalar.at(-2).tus === tus);
    notalar.push({ t: t + 1000, tus }); // ilk nota 1 sn sonra: göz alışsın
  }
  return notalar;
}

module.exports = {
  ad: 'ritim', baslik: 'Ritim Dizisi',
  baslat(m) {
    m.notalar = sema();
    m.basla = Date.now() + m.GERI_SAYIM;
    m.durumlar = Object.fromEntries(m.oyuncular.map((o) => [o.id, { skor: 0, mukemmel: 0, vurulan: [], son: null }]));
    m.zamanlayici(() => {
      const s = m.oyuncular.map((o) => ({ id: o.id, ...m.durumlar[o.id] })).sort((a, b) => b.skor - a.skor || b.mukemmel - a.mukemmel);
      m.bitir(s.map((x) => x.id));
    }, m.GERI_SAYIM + SURE + 1500);
  },
  mesaj(m, o, v) {
    const d = m.durumlar[o.id], g = Date.now() - m.basla;
    if (!d || g < -500 || g > SURE + 1000) return;
    if (Number.isInteger(v.vur)) {
      const n = m.notalar[v.vur], fark = Math.abs(+v.fark);
      // telefonun bildirdiği an sunucunun saatiyle kabaca uyuşmalı (gecikme payı 1,5 sn)
      if (!n || d.vurulan.includes(v.vur) || !(fark <= IYI) || Math.abs(g - n.t) > 1500) return;
      const sonuc = fark <= MUKEMMEL ? 'mukemmel' : 'iyi';
      d.skor += sonuc === 'mukemmel' ? 50 : 25; if (sonuc === 'mukemmel') d.mukemmel++;
      d.vurulan.push(v.vur); d.son = { tus: n.tus, sonuc, g };
      return m.yay();
    }
    if (v.kacir && Number.isInteger(v.tus)) { d.son = { tus: v.tus, sonuc: 'kacti', g }; m.yay(); }
  },
  sabit(m) { return { sureMs: SURE, geriSayimMs: 3000 /* müziğin 3 sn'lik girişi */, vurusMs: VURUS, mukemmelMs: MUKEMMEL, iyiMs: IYI, notalar: m.notalar }; },
  durum(m) {
    return {
      gecenMs: Date.now() - m.basla,
      oyuncular: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return { id: o.id, ad: o.ad, renk: o.renk, skor: d.skor, vurulan: d.vurulan, son: d.son }; }),
    };
  },
};
