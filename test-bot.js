// Deneme botları testi: "Test et" her mini oyunu üç botla açar, botlar oynar, deneme bitince botlar odadan çıkar.
// node test-bot.js [oyun...]  (sunucu TEST_PORT'ta açık olmalı; bot verilmezse altısı da denenir)
const assert = require('assert'); const P = +(process.env.TEST_PORT || 3592), bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const OYUNLAR = process.argv.slice(2).length ? process.argv.slice(2) : ['karma', 'ritim', 'kule', 'zipla', 'catlak', 'isik'];
let d = null, sonMini = null; const w = new WebSocket('ws://localhost:' + P);
w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad: 'Ali' }));
w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') d = m.d; if (m.t === 'mini') sonMini = m; };
const iz = () => JSON.stringify(d.mini, (k, v) => (['gecenMs', 'sabit', 'notalar', 'sekiller', 'parcalar', 'engeller', 'tas'].includes(k) ? undefined : v)) + JSON.stringify(sonMini?.tik?.p ?? null); // Çatlak Zemin konumları anlık mesajla gelir
(async () => {
  await bekle(400);
  for (const ad of OYUNLAR) {
    w.send(JSON.stringify({ t: 'miniDene', ad, bot: true }));
    for (let i = 0; i < 40 && d.faz !== 'miniTanitim'; i++) await bekle(100);
    assert.equal(d.faz, 'miniTanitim', ad + ': tanıtım açıldı'); assert.equal(d.oyuncular.length, 4, ad + ': üç bot katıldı');
    w.send(JSON.stringify({ t: 'hazir' }));
    for (let i = 0; i < 60 && d.faz !== 'mini'; i++) await bekle(100);
    assert.equal(d.faz, 'mini', ad + ': botlar hazır deyince oyun başladı');
    await bekle(5000); const once = iz(); await bekle(3000);
    if (d.faz === 'mini') assert.notEqual(iz(), once, ad + ': botlar oynuyor');
    for (let i = 0; i < 1100 && d.faz !== 'lobi'; i++) await bekle(100);
    assert.equal(d.faz, 'lobi', ad + ': deneme bitti'); await bekle(500);
    assert.equal(d.oyuncular.length, 1, ad + ': botlar çıktı');
    console.log(ad, 'tamam');
  }
  console.log('BOT TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message, d && d.faz); process.exit(1); });
