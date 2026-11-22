// Kapanış salonu testi: istatistikler sayılır, konum dağıtılır, yumruk yalnız öndeki yakın oyuncuya değer
const assert = require('assert'); const son = {}, ws = {}, salon = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3596)); ws[ad] = w; salon[ad] = [];
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad })); w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } if (m.t === 'salon') salon[ad].push(m); }; });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const yolla = (ad, m) => ws[ad].send(JSON.stringify(m));
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await oyuncu('Can'); await bekle(200);
  yolla('Ali', { t: 'ayar', kelime: 10, miniSayi: 0, miniler: [] }); await bekle(100);
  yolla('Ali', { t: 'basla' }); await bekle(200); for (const a of ['Ali', 'Bal', 'Can']) yolla(a, { t: 'hazir' }); // yükleme ekranını geç
  for (let i = 0; i < 600 && son.Ali.faz !== 'bitis'; i++) {
    const tur = son.Ali.tur;
    if (son.Ali.faz === 'tur' && tur && !tur.bildin && tur.cevap) {
      yolla('Ali', { t: 'tahmin', metin: 'yanlisss' }); yolla('Ali', { t: 'tahmin', metin: tur.cevap });
      if (son.Bal.tur && !son.Bal.tur.bildin) yolla('Bal', { t: 'tahmin', metin: tur.cevap });
      if (son.Can.tur && !son.Can.tur.bildin) yolla('Can', { t: 'tahmin', metin: tur.cevap });
    }
    await bekle(60);
  }
  assert.equal(son.Ali.faz, 'bitis');
  const ali = son.Ali.son.sira.find((o) => o.ad === 'Ali');
  assert.equal(ali.ist.bildi, 10, 'on kelime bildi'); assert.equal(ali.ist.yanlis, 10, 'on yanlış');
  const id = (ad) => son.Ali.oyuncular.find((o) => o.ad === ad).id;
  // Ali (0,0) +z'ye bakıyor; Bal önünde 1 birim, Can arkasında 1 birim
  yolla('Ali', { t: 'salon', k: [0, 0, 0, 0] }); yolla('Bal', { t: 'salon', k: [0, 0, 1, 0] }); yolla('Can', { t: 'salon', k: [0, 0, -1, 0] }); await bekle(150);
  assert.ok(salon.Can.some((m) => m.k && m.k[0] === id('Bal') && m.k[3] === 1), 'konum herkese gider');
  yolla('Ali', { t: 'salon', vur: true }); await bekle(150);
  const v = salon.Bal.find((m) => m.vur);
  assert.ok(v, 'yumruk dağıtıldı'); assert.deepEqual(v.hedef.map((h) => h[0]), [id('Bal')], 'yalnız öndeki vurulur');
  assert.ok(v.hedef[0][2] > 0, 'vurulan ileri savrulur');
  yolla('Ali', { t: 'salon', vur: true }); await bekle(100);
  assert.equal(salon.Bal.filter((m) => m.vur).length, 1, 'bekleme süresi');
  yolla('Ali', { t: 'salon', k: [1e9, 0, 0, 0] }); await bekle(100);
  assert.ok(salon.Bal.at(-1).k[1] <= 14, 'salon dışına çıkılmaz');
  console.log('SALON TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
