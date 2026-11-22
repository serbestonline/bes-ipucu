// Zıpla Eğil: sağdan dikenli silindirler gelir; alçaktan geleni zıplayarak, yüksekten geleni eğilerek atlatırsın.
// Herkes aynı platformda, engeller herkese aynı anda ve aynı sırayla gelir; giderek hızlanır ve sıklaşır.
// Çarpışmayı her telefon kendisi ölçer (gecikme kimseyi haksız düşürmez). 3 can; can bitince elenirsin.
// 60 sn sonunda ya da herkes elenince biter: ayakta kalanlar canına göre, elenenler daha geç elenen önde.
const SURE = 60000, CAN = 3; // 60 sn

function engeller() {
  const liste = []; let t = 2200, ayni = 0, onceki = null;
  while (t < SURE - 500) {
    const ilerleme = t / SURE;
    let tip = Math.random() < .5 ? 'alcak' : 'yuksek';
    if (tip === onceki && ++ayni >= 2) { tip = tip === 'alcak' ? 'yuksek' : 'alcak'; ayni = 0; } else if (tip !== onceki) ayni = 0;
    liste.push({ t: Math.round(t), tip, gecis: Math.round(2000 - 1200 * ilerleme) }); // gecis: ekranı kaç ms'de geçtiği (2 sn'den 0,8 sn'ye)
    onceki = tip;
    t += 1800 - 1150 * ilerleme + Math.random() * 200; // aralık 1,8 sn'den 0,65 sn'ye iner
  }
  return liste;
}

function bitir(m) {
  if (m.bitti) return; m.bitti = true;
  const s = m.oyuncular.map((o) => ({ id: o.id, ...m.durumlar[o.id] }))
    .sort((a, b) => (a.elendi != null) - (b.elendi != null) || b.can - a.can || (b.elendi ?? 0) - (a.elendi ?? 0));
  m.bitir(s.map((x) => x.id));
}

module.exports = {
  ad: 'zipla', baslik: 'Zıpla Eğil',
  baslat(m) {
    m.engeller = engeller();
    m.basla = Date.now() + m.GERI_SAYIM;
    m.durumlar = Object.fromEntries(m.oyuncular.map((o) => [o.id, { can: CAN, elendi: null, vurulan: [], son: null }]));
    m.zamanlayici(() => bitir(m), m.GERI_SAYIM + SURE);
  },
  mesaj(m, o, v) {
    const d = m.durumlar[o.id], g = Date.now() - m.basla;
    if (!d || g < 0 || g > SURE || d.elendi != null) return;
    if (v.eylem === 'zipla' || v.eylem === 'egil') { d.son = { eylem: v.eylem, g: Number.isFinite(v.g) ? v.g : g }; return m.yay(); }
    if (Number.isInteger(v.vurul) && m.engeller[v.vurul] && !d.vurulan.includes(v.vurul)) {
      d.vurulan.push(v.vurul); d.can--;
      if (d.can <= 0) { d.can = 0; d.elendi = g; m.herkese({ t: 'olay', m: `${o.ad} elendi!` }); }
      m.yay();
      if (Object.values(m.durumlar).every((x) => x.elendi != null)) bitir(m);
    }
  },
  durum(m) {
    return {
      gecenMs: Date.now() - m.basla, sureMs: SURE, engeller: m.engeller, can: CAN,
      oyuncular: m.oyuncular.map((o) => { const d = m.durumlar[o.id]; return { id: o.id, ad: o.ad, renk: o.renk, can: d.can, elendi: d.elendi, son: d.son }; }),
    };
  },
};
