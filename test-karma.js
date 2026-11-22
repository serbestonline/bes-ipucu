// Karışık Harfler testi: iki oyuncu, biri doğru biri yanlış cevap verir; sıralama ve joker dağıtımı kontrol edilir
const assert = require('assert'), LISTE = require('./kelimeler/karma.json');
const son = {}, ws = {}, msj = { Ali: [], Bal: [] };
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3497)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } if (m.t === 'mini') msj[ad].push(m); }; });
const hazir = async () => { await bekle(200); ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); await bekle(100); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const coz = (harf) => LISTE.find((k) => [...k.toLocaleUpperCase('tr')].sort().join('') === [...harf].sort().join(''));
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'karma' })); await hazir(); await bekle(300);
  assert.equal(son.Ali.faz, 'mini'); assert(son.Ali.mini.gecenMs < 0, 'geri sayım');
  ws.Ali.send(JSON.stringify({ t: 'mini', cevap: coz(son.Ali.mini.harfler) })); await bekle(200);
  assert.equal(son.Ali.mini.skor, 0, 'geri sayımda cevap sayılmaz');
  await bekle(3000);
  for (let i = 0; i < 5; i++) { ws.Ali.send(JSON.stringify({ t: 'mini', cevap: coz(son.Ali.mini.harfler) })); await bekle(150); }
  ws.Bal.send(JSON.stringify({ t: 'mini', cevap: 'yanlis' })); ws.Bal.send(JSON.stringify({ t: 'mini', gec: true })); await bekle(200);
  assert.equal(son.Bal.mini.skor, -1, 'geçmek 1 puan götürür');
  assert.equal(son.Ali.mini.skor, 5); assert(msj.Bal.some((m) => m.yanlis));
  assert.equal(son.Ali.mini.tablo[0].ad, 'Ali');
  for (let i = 0; i < 220 && son.Ali.faz !== 'miniSonu'; i++) await bekle(500);
  assert.equal(son.Ali.faz, 'miniSonu'); assert.equal(son.Ali.son.sira[0].ad, 'Ali');
  assert.equal(son.Ali.ben.jokerler.length, 2, 'birinciye 2 joker'); assert.equal(son.Bal.ben.jokerler.length, 1, 'ikinciye 1 joker');
  await bekle(6500); assert.equal(son.Ali.faz, 'lobi', 'denemeden sonra lobiye döner');
  console.log('KARIŞIK HARFLER TESTİ GEÇTİ, jokerler:', son.Ali.ben.jokerler, son.Bal.ben.jokerler); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
