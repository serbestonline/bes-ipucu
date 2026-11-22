// Işık İzi testi: Ali sürekli döner (kendi izine çarpar), Bal düz gider; elenme, puan ve yeni el kontrol edilir
const assert = require('assert'); const son = {}, ws = {}, tik = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3595)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } if (m.t === 'mini' && m.tik) tik[ad] = m.tik; }; });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'isik' })); await bekle(300);
  ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); // tanıtım aşamasını geç
  for (let i = 0; i < 50 && son.Ali.faz !== 'mini'; i++) await bekle(100);
  assert.equal(son.Ali.mini.elNo, 1); assert.equal(son.Ali.mini.oyuncular.length, 2);
  ws.Ali.send(JSON.stringify({ t: 'mini', don: 1 })); ws.Bal.send(JSON.stringify({ t: 'mini', don: 0 }));
  await bekle(3000); // geri sayım
  let ilk = null;
  for (let i = 0; i < 100 && !ilk; i++) { await bekle(100); const p = tik.Ali && tik.Ali.p; if (p && p.some((q) => !q[3])) ilk = p; }
  assert(ilk, 'biri elendi');
  const elenen = ilk.find((q) => !q[3]), kalan = ilk.find((q) => q[3]);
  assert.equal(elenen[5], 0, 'elenen puan almaz'); assert.equal(kalan[5], 1, 'ayakta kalan +1');
  for (let i = 0; i < 40 && (son.Ali.mini?.elNo || 1) < 2; i++) await bekle(100);
  assert.equal(son.Ali.mini.elNo, 2, 'yeni el başladı'); assert(son.Ali.mini.oyuncular.every((o) => o.canli && o.iz.length === 1), 'izler silindi, herkes canlı');
  console.log('IŞIK İZİ TESTİ GEÇTİ: elenen', son.Ali.mini.oyuncular.find((o) => o.id === elenen[0]).ad); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
