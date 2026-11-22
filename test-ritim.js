// Ritim Dizisi testi: Ali notaları tam zamanında vurur, Bal yanlış tuş ve sahte nota yollar
const assert = require('assert'); const son = {}, ws = {}, sabit = {};
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3497)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { if (m.d.mini?.sabit) sabit[ad] = m.d.mini.sabit; if (m.d.mini && sabit[ad]) m.d.mini = { ...sabit[ad], ...m.d.mini }; son[ad] = m.d; t(); } }; });
const hazir = async () => { await bekle(200); ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); await bekle(100); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const yolla = (ad, v) => ws[ad].send(JSON.stringify({ t: 'mini', ...v }));
const ali = () => son.Ali.mini.oyuncular.find((o) => o.ad === 'Ali'), bal = () => son.Ali.mini.oyuncular.find((o) => o.ad === 'Bal');
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'ritim' })); await hazir(); const t0 = Date.now() + 3000; await bekle(300);
  const n = son.Ali.mini.notalar; assert(n.length > 50 && n.length < 110, 'nota sayısı ' + n.length);
  await bekle(t0 + n[0].t - Date.now());
  yolla('Ali', { vur: 0, fark: 10 }); yolla('Bal', { vur: 0, fark: 200 }); await bekle(150);
  assert.equal(ali().skor, 50, 'mükemmel 50'); assert.equal(bal().skor, 25, 'iyi 25');
  yolla('Ali', { vur: 0, fark: 0 }); yolla('Bal', { vur: 1, fark: 300 }); yolla('Bal', { kacir: true, tus: 2 }); await bekle(150);
  assert.equal(ali().skor, 50, 'aynı nota iki kez sayılmaz'); assert.equal(bal().skor, 25, 'pencere dışı sayılmaz'); assert.equal(bal().son.sonuc, 'kacti');
  yolla('Ali', { vur: n.length - 1, fark: 0 }); await bekle(150); assert.equal(ali().skor, 50, 'zamanı gelmemiş nota sayılmaz');
  for (let i = 0; i < 100 && son.Ali.faz !== 'miniSonu'; i++) await bekle(500);
  assert.equal(son.Ali.son.sira[0].ad, 'Ali');
  console.log('RİTİM DİZİSİ TESTİ GEÇTİ, nota sayısı', n.length); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
