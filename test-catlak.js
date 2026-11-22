// Çatlak Zemin testi: çarpışma ikisini de sersemletir, kıpırdamayan üç kez yanıp elenir, ayakta kalan kazanır
const assert = require('assert'); const son = {}, ws = {}, msj = { Ali: [], Bal: [] };
const oyuncu = (ad) => new Promise((t) => { const w = new WebSocket('ws://localhost:' + (process.env.TEST_PORT || 3496)); ws[ad] = w;
  w.onopen = () => w.send(JSON.stringify({ t: 'katil', ad }));
  w.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'durum') { son[ad] = m.d; t(); } if (m.t === 'mini') msj[ad].push(m); }; });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const yolla = (ad, x, y) => ws[ad].send(JSON.stringify({ t: 'mini', poz: [x, y] }));
const konum = {};
// hedefe 0,2 karelik adımlarla yürü (sunucu uçuk sıçramaları reddeder)
async function yuru(ad, x, y) { let [cx, cy] = konum[ad]; while (Math.hypot(x - cx, y - cy) > .01) { const u = Math.hypot(x - cx, y - cy), s = Math.min(.2, u); cx += (x - cx) / u * s; cy += (y - cy) / u * s; yolla(ad, cx, cy); await bekle(20); } konum[ad] = [x, y]; }
// sağlam taşlar üstünden rastgele hedeflere yürür; yandıysa yeni yerinden devam eder
function gezin(ad) {
  let [x, y] = konum[ad], n = 0, hedef = null;
  return setInterval(() => {
    const yan = msj[ad].filter((m) => m.yandi && m.ad === ad).at(-1); if (yan && yan.n !== n) { n = yan.n; [x, y] = yan.poz; hedef = null; }
    const tas = msj[ad].filter((m) => m.tik).at(-1).tik.tas, saglam = (px, py) => px >= 0 && py >= 0 && px < 10 && py < 10 && tas[Math.floor(py) * 10 + Math.floor(px)] === '0';
    if (!hedef || Math.hypot(hedef[0] - x, hedef[1] - y) < .1) {
      hedef = null;
      for (let k = 0; k < 40 && !hedef; k++) { const h = [Math.floor(Math.random() * 10) + .5, Math.floor(Math.random() * 10) + .5], u = Math.hypot(h[0] - x, h[1] - y);
        if (u > 1.5 && u < 4 && [...Array(21).keys()].every((i) => saglam(x + (h[0] - x) * i / 20, y + (h[1] - y) * i / 20))) hedef = h; }
      if (!hedef) return;
    }
    const u = Math.hypot(hedef[0] - x, hedef[1] - y), s = Math.min(.2, u); x += (hedef[0] - x) / u * s; y += (hedef[1] - y) / u * s;
    ws[ad].send(JSON.stringify({ t: 'mini', poz: [x, y], n }));
  }, 66);
}
(async () => {
  await oyuncu('Ali'); await oyuncu('Bal'); await bekle(200);
  ws.Ali.send(JSON.stringify({ t: 'miniDene', ad: 'catlak' })); await bekle(300);
  ws.Ali.send(JSON.stringify({ t: 'hazir' })); ws.Bal.send(JSON.stringify({ t: 'hazir' })); // herkes hazır: tanıtım geçilir
  for (let i = 0; i < 60 && son.Ali.faz !== 'mini'; i++) await bekle(50);
  await bekle(3050); // 3 sn geri sayım
  const p = son.Ali.mini.oyuncular; assert.equal(p.length, 2); assert(Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) > 3, 'başlangıçta uzak');
  // ikisi aynı yere gelir: çarpışma
  for (const o of p) konum[o.ad] = [o.x, o.y];
  await Promise.all([yuru('Ali', 5, 5), yuru('Bal', 5.5, 5)]); await yuru('Bal', 5.3, 5); await bekle(200);
  const c = msj.Ali.find((m) => m.carpisma); assert(c, 'çarpışma geldi'); assert(c.carpisma[0][1] < 0 && c.carpisma[1][1] > 0, 'ters yönlere savrulur');
  assert(msj.Ali.filter((m) => m.tik).at(-1).tik.p.every((q) => q[3] === 1), 'ikisi de sersem');
  yolla('Ali', 50, 50); await bekle(150); // uçuk konum yok sayılır
  // Bal merkezin çevresinde döner, Ali kıpırdamaz: Ali'nin taşı çatlar, Ali iki kez yeniden doğar, üçüncüde elenir
  const dolas = gezin('Bal');
  for (let i = 0; i < 120 && !msj.Ali.some((m) => m.dustu); i++) await bekle(100);
  const yan = msj.Ali.filter((m) => m.yandi && m.ad === 'Ali');  assert.deepEqual(yan.map((m) => m.can), [2, 1], 'iki kez yandı, canı azaldı');
  assert(yan.every((m) => m.poz[0] > 0 && m.poz[0] < 10), 'sağlam bir taşta yeniden doğdu');
  const dus = msj.Ali.find((m) => m.dustu); assert(dus && dus.ad === 'Ali', 'üçüncü düşüşte Ali elendi');
  for (let i = 0; i < 30 && son.Ali.faz !== 'miniSonu'; i++) await bekle(200);
  clearInterval(dolas);
  assert.equal(son.Ali.faz, 'miniSonu', 'tek kişi kalınca biter'); assert.deepEqual(son.Ali.son.sira.map((o) => o.ad), ['Bal', 'Ali']);
  console.log('ÇATLAK ZEMİN TESTİ GEÇTİ'); process.exit(0);
})().catch((e) => { console.error('KALDI', e.message); process.exit(1); });
