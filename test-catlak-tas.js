// Çatlak Zemin taş testi (ağsız): bastığın için düşen taş 4 sn sonra geri gelir; kenar çöküşü kalıcıdır
const assert = require('assert'), M = require('./mini/catlak.js');
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const zaman = [], m = { oyuncular: [{ id: 'a', ad: 'Ali' }, { id: 'b', ad: 'Bal' }], GERI_SAYIM: 0,
  zamanlayici: (f, ms) => { const z = setTimeout(f, ms); zaman.push(z); return z; }, herkese: () => {}, yay: () => {}, bitir: () => {} };
(async () => {
  M.baslat(m); m.bitir = () => {}; m.bitisPlan = true; // erken bitişi kapat, yalnız taşları izliyoruz
  m.durumlar.a.x = 5.5; m.durumlar.a.y = 5.5; m.durumlar.b.x = 1.5; m.durumlar.b.y = 1.5;
  const i = 5 * 10 + 5;
  await bekle(300); assert.equal(m.tas[i], 1, 'üstünde durulan taş çatlar');
  m.durumlar.a.x = 7.5; // Ali taştan kaçtı
  await bekle(800); assert.equal(m.tas[i], 2, '0,9 sn sonra düşer');
  await bekle(3000); assert.equal(m.tas[i], 2, '4 sn dolmadan geri gelmez');
  await bekle(1200); assert.equal(m.tas[i], 0, '4 sn sonra geri gelir');
  // kenar çöküşü: 35. saniyeyi geçmiş gibi yap
  m.basla = Date.now() - 36000; await bekle(200);
  assert.equal(m.tas[0], 1, 'kenar taşı çatlar'); await bekle(1000); assert.equal(m.tas[0], 3, 'kenar taşı kalıcı çöker');
  await bekle(4300); assert.equal(m.tas[0], 3, 'kenar taşı geri gelmez');
  zaman.forEach(clearTimeout); m.bitti = true;
  console.log('ÇATLAK ZEMİN TAŞ TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
