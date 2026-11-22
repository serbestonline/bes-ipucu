// Kule testi: Ali tepeye ulaşır, Bal yarıda kalır; 8 saniyelik ek süre ve sıralama kontrol edilir
const assert = require('assert'); const son = {}, ws = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3497)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } }; });
const hazir = async () => { await bekle(200); ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); await bekle(100); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const yolla = (ad, v) => ws[ad].send(JSON.stringify({ t: 'mini', ...v }));
const izgara = (n) => Array.from({ length: n }, () => '1110000000');
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'kule' })); await hazir(); await bekle(3300);
  const bul = (ad) => son.Ali.mini.oyuncular.find((o) => o.ad === ad);
  yolla('Bal', { izgara: izgara(5) }); yolla('Ali', { izgara: ['abc'] }); await bekle(200);
  assert.equal(bul('Bal').yukseklik, 5); assert.equal(bul('Ali').yukseklik, 0, 'bozuk ızgara reddedilir');
  yolla('Ali', { izgara: izgara(18) }); await bekle(200);
  assert(bul('Ali').tepe != null, 'Ali tepede'); assert(son.Ali.mini.bitisMs < 15000, 'kalanlara 8 sn: ' + son.Ali.mini.bitisMs);
  yolla('Bal', { izgara: izgara(9) }); yolla('Bal', { devrildi: true }); await bekle(200);
  assert.equal(bul('Bal').yukseklik, 9); assert.equal(bul('Bal').devrilen, 1);
  for (let i = 0; i < 40 && son.Ali.faz !== 'miniSonu'; i++) await bekle(500);
  assert.equal(son.Ali.faz, 'miniSonu'); assert.deepEqual(son.Ali.son.sira.map((o) => o.ad), ['Ali', 'Bal']);
  console.log('KULE TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
