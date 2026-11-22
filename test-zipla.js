// Zıpla Eğil testi: Bal üç kez vurulup elenir, Ali bir kez vurulur; aynı engel iki kez sayılmaz, sıralama kontrol edilir
const assert = require('assert'); const son = {}, ws = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3594)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } }; });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const yolla = (ad, v) => ws[ad].send(JSON.stringify({ t: 'mini', ...v }));
const hazir = async () => { await bekle(200); ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); await bekle(100); };
const bul = (ad) => son.Ali.mini.oyuncular.find((o) => o.ad === ad);
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'zipla' })); await hazir(); await bekle(3300);
  const e = son.Ali.mini.engeller; assert(e.length > 25 && e.length < 60, 'engel sayısı ' + e.length);
  assert(e.at(-1).gecis < e[0].gecis, 'giderek hızlanır');
  yolla('Ali', { eylem: 'zipla', g: 300 }); yolla('Ali', { vurul: 0 }); yolla('Ali', { vurul: 0 }); await bekle(200);
  assert.equal(bul('Ali').can, 2, 'aynı engel bir kez sayılır'); assert.equal(bul('Ali').son.eylem, 'zipla');
  for (const i of [0, 1, 2]) yolla('Bal', { vurul: i }); await bekle(300);
  assert.equal(bul('Bal').can, 0); assert(bul('Bal').elendi != null, 'Bal elendi');
  yolla('Bal', { vurul: 3 }); await bekle(150); assert.equal(bul('Bal').can, 0, 'elenen vurulmaz');
  for (let i = 0; i < 160 && son.Ali.faz !== 'miniSonu'; i++) await bekle(500);
  assert.deepEqual(son.Ali.son.sira.map((o) => o.ad), ['Ali', 'Bal']);
  console.log('ZIPLA EĞİL TESTİ GEÇTİ, engel sayısı', e.length); process.exit(0);
})().catch((x) => { console.error('KALDI', x.message); process.exit(1); });
