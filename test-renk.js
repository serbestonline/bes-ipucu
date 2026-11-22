// Renk seçimi testi: alınmış renk seçilemez, boş renk seçilir, mini oyunda da aynı renk kullanılır
const assert = require('assert'); const son = {}, ws = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3596)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad })); w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } }; });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const renk = (ad) => son.Ali.oyuncular.find((o) => o.ad === ad).renk;
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  const r = son.Ali.renkler; assert.equal(r.length, 8);
  ws.Bal.send(JSON.stringify({ t: 'renk', renk: renk('Ali') })); await bekle(150);
  assert.notEqual(renk('Bal'), renk('Ali'), 'alınmış renk seçilemez');
  ws.Bal.send(JSON.stringify({ t: 'renk', renk: r[6] })); ws.Ali.send(JSON.stringify({ t: 'renk', renk: '#000000' })); await bekle(150);
  assert.equal(renk('Bal'), r[6], 'boş renk seçilir'); assert.notEqual(renk('Ali'), '#000000', 'paletin dışı reddedilir');
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'isik' })); await bekle(500);
  ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); // tanıtımı ikisi de geçer
  for (let i = 0; i < 50 && son.Ali.faz !== 'mini'; i++) await bekle(100);
  assert.equal(son.Ali.mini.oyuncular.find((o) => o.ad === 'Bal').renk, r[6], 'mini oyunda aynı renk');
  ws.Bal.send(JSON.stringify({ t: 'renk', renk: r[7] })); await bekle(150);
  assert.equal(renk('Bal'), r[6], 'oyun sırasında renk değişmez');
  console.log('RENK SEÇİMİ TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
