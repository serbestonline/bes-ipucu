// Dondur jokeri testi: kullanıldığı anda başlar, 15 sn sürer, hedefe kimin dondurduğu gider, o sürede tahmin geçmez
const assert = require('assert'); const S = require('./server.js'); const P = +(process.env.TEST_PORT || 3592);
const son = {}, msj = { Ali: [], Bal: [] }, ws = {}, bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + P); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad })); w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } else msj[ad].push(m); }; });
const yolla = (ad, m) => ws[ad].send(JSON.stringify(m));
S.sunucu.listen(P, async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(150);
  yolla('Ali', { t: 'ayar', kelime: 10, miniSayi: 0, miniler: [] }); yolla('Ali', { t: 'basla' }); await bekle(150);
  yolla('Ali', { t: 'hazir' }); yolla('Bal', { t: 'hazir' }); await bekle(300);
  assert.equal(son.Ali.faz, 'tur');
  const ali = [...S.oda.oyuncular.values()].find((o) => o.ad === 'Ali'), bal = [...S.oda.oyuncular.values()].find((o) => o.ad === 'Bal');
  ali.jokerler.push('dondur');
  yolla('Ali', { t: 'joker', tur: 'dondur', hedef: bal.id }); await bekle(150);
  const g = msj.Bal.find((m) => m.t === 'donduruldun'); assert(g && g.kim === 'Ali' && g.ms === 15000, 'Bal donduruldu, 15 sn, Ali tarafından');
  assert(son.Bal.ben.donma && son.Bal.ben.donma.kim === 'Ali' && son.Bal.ben.donma.kalanMs > 14000, 'durumda kalan süre');
  assert(son.Ali.oyuncular.find((o) => o.ad === 'Bal').donmus, 'herkes Bal\'ı donmuş görür');
  assert.equal(son.Ali.ben.jokerler.length, 0, 'joker harcandı');
  yolla('Bal', { t: 'tahmin', metin: 'herhangi' }); await bekle(100);
  assert(msj.Bal.some((m) => m.t === 'uyari' && /Dondurulmuşsun/.test(m.m)), 'donukken tahmin geçmez');
  // süre dolunca çözülür (testi kısaltmak için bitişi öne çekiyoruz)
  bal.donma.bitis = Date.now() + 100; await bekle(200);
  yolla('Bal', { t: 'tahmin', metin: 'yanlisss' }); await bekle(100);
  assert(msj.Bal.some((m) => m.t === 'yanlis'), 'çözülünce tahmin geçer');
  console.log('DONDUR TESTİ GEÇTİ'); process.exit(0);
});
setTimeout(() => { console.error('KALDI: zaman aşımı'); process.exit(1); }, 15000);
process.on('uncaughtException', (e) => { console.error('KALDI', e.message); process.exit(1); });
