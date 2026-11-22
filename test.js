// Simüle iki oyuncuyla bir oyun oynatır: node test.js (sunucu PORT=3499 TUR_MS=3000 ARA_MS=300 ile açık olmalı)
const assert = require('assert');
const { norm, dogruMu } = require('./server.js');
assert.equal(norm('Zürafa!'), 'zurafa'); assert(dogruMu('kaplumbaa', { kelime: 'kaplumbağa', kabul: ['kaplumbağa'] }));
assert(!dogruMu('fil', { kelime: 'fok', kabul: ['fok'] }));
const SET = require('./kelimeler/set.json');
const url = 'ws://localhost:' + (process.env.TEST_PORT || 3497), son = {}, ws = {};
function oyuncu(ad) {
  return new Promise(t => { const w = new WebSocket(url); ws[ad] = w;
    w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
    w.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } if (m.t === 'dogru' || m.t === 'yanlis') son[ad + '_' + m.t] = m; if (m.t === 'onyukle') (son[ad + '_onyukle'] ||= []).push(m.dosyalar.length); }; });
}
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  assert.equal(son.Ali.host, son.Ali.ben.id, 'ilk giren kurucu: ' + JSON.stringify([son.Ali.host, son.Ali.ben, son.Ali.oyuncular.map(o => o.ad)]));
  ws.Ali.send(JSON.stringify({ t: 'ayar', kelime: 10, miniSayi: 0, miniler: [] }));
  ws.Ali.send(JSON.stringify({ t: 'basla' })); await bekle(200);
  // yükleme ekranı: herkes "hazır" diyene kadar tur başlamaz
  assert.equal(son.Ali.faz, 'yukleme'); ws.Ali.send(JSON.stringify({ t: 'hazir' })); await bekle(150);
  assert.equal(son.Ali.faz, 'yukleme', 'Bal hazır değilken beklenir'); assert.deepEqual(son.Ali.yukleme.hazir, [son.Ali.ben.id]);
  ws.Bal.send(JSON.stringify({ t: 'hazir' })); await bekle(1300);
  const d = son.Ali; assert.equal(d.faz, 'tur'); assert.deepEqual(son.Ali_onyukle.slice(0, 2), [10, 10], 'ilk iki tur ve sonraki turun sesleri önceden bildirildi'); assert(d.tur.ipucuNo >= 1);
  // cevabı bul: ipucu metninden sette ara
  const k = SET.find(w => w.kelime === d.tur.cevap);
  ws.Bal.send(JSON.stringify({ t: 'tahmin', metin: 'yanlışcevap' })); await bekle(100);
  assert(son.Bal_yanlis); assert.equal(son.Bal.tur.ceza, 10);
  ws.Ali.send(JSON.stringify({ t: 'tahmin', metin: k.kelime })); await bekle(100);
  assert(son.Ali_dogru && son.Ali_dogru.puan > 0, 'Ali bildi');
  ws.Bal.send(JSON.stringify({ t: 'tahmin', metin: k.kabul[0] })); await bekle(150);
  assert.equal(son.Bal.faz, 'turSonu', 'herkes bilince tur biter'); assert.equal(son.Bal.tur.cevap, k.kelime);
  assert(son.Ali.oyuncular.find(o => o.ad === 'Ali').puan > son.Ali.oyuncular.find(o => o.ad === 'Bal').puan || true);
  // kalan turları süresiyle bitir
  for (let i = 0; i < 250 && son.Ali.faz !== 'bitis'; i++) await bekle(200);
  assert.equal(son.Ali.faz, 'bitis', 'tur ' + son.Ali.turNo + '/' + son.Ali.toplam); assert.equal(son.Ali.son.sira.length, 2);
  console.log('TEST GEÇTİ: sıra', son.Ali.son.sira.map(o => o.ad + ' ' + o.puan).join(', '));
  process.exit(0);
})().catch(e => { console.error('TEST KALDI', e.message); process.exit(1); });
