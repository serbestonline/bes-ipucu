// Deneme botları: lobide bir mini oyun "Test et" ile açılınca odaya üç sahte oyuncu katılır ve oyunu kabaca oynar.
// Botlar sunucuya gerçek bir oyuncu gibi WebSocket ile bağlanır; deneme bitip lobiye dönülünce kendiliğinden çıkar.
const WebSocket = require('ws');
const KARMA = require('./kelimeler/karma.json');
const harfDiz = (s) => [...s.toLocaleUpperCase('tr')].sort().join('');
const KARMA_DIZIN = new Map(KARMA.map((k) => [harfDiz(k), k]));
const ADLAR = ['Robo', 'Çip', 'Dıgıt']; // kısa ve baş harfleri farklı: küçük yuvarlaklarda ve dar şeritlerde karışmasın

function bot(url, ad, rnd) {
  const w = new WebSocket(url);
  let d = null, sabit = null, basla = null, benId = null, n = 0, poz = null, dogum = 0, miniGordu = false;
  const yapilan = new Set();
  const yolla = (v) => w.readyState === 1 && w.send(JSON.stringify(v));
  w.on('open', () => yolla({ t: 'katil', ad }));
  w.on('error', () => {});
  w.on('message', (b) => {
    const v = JSON.parse(b);
    if (v.t === 'kimlik') benId = v.id;
    // Çatlak Zemin: lava düşünce yeni yerinden devam eder
    if (v.t === 'mini' && v.yandi && v.yandi === benId) { poz = { x: v.poz[0], y: v.poz[1], a: rnd * 6 }; dogum = v.n; }
    if (v.t !== 'durum') return;
    d = v.d;
    if (d.mini?.sabit) sabit = d.mini.sabit;
    if (d.mini && sabit) d.mini = { ...sabit, ...d.mini };
    if (d.faz === 'miniTanitim' && d.tanitim && !d.tanitim.hazir.includes(benId)) setTimeout(() => yolla({ t: 'hazir' }), 400 + rnd * 800);
    if (d.faz === 'mini') { miniGordu = true; if (basla == null) basla = Date.now() - d.mini.gecenMs; }
    if (miniGordu && d.faz === 'lobi') kapat(); // deneme bitti
  });
  const zaman = setInterval(() => {
    if (!d || d.faz !== 'mini' || basla == null) return;
    const t = Date.now() - basla, m = d.mini;
    if (t < 0) return;
    if (m.ad === 'karma' && t > (n + 1) * (2600 + rnd * 1500)) { n++; const c = m.harfler && KARMA_DIZIN.get([...m.harfler].sort().join('')); if (c) yolla({ t: 'mini', cevap: c }); }
    if (m.ad === 'ritim' && m.notalar) m.notalar.forEach((q, i) => {
      if (yapilan.has(i) || Math.abs(t - q.t) > 40) return; yapilan.add(i);
      if (Math.random() < .55 + rnd * .4) yolla({ t: 'mini', vur: i, fark: Math.round((Math.random() - .5) * 160) }); else yolla({ t: 'mini', kacir: true, tus: (q.tus + 1) % 4 });
    });
    if (m.ad === 'kule' && t > (n + 1) * (1500 + rnd * 1000)) {
      n++; const satir = ['3301100220', '0044400110', '1102200330', '0550550440', '2200660011'];
      if (Math.random() < .12) yolla({ t: 'mini', devrildi: true });
      else yolla({ t: 'mini', izgara: Array.from({ length: Math.min(18, n) }, (_, i) => satir[(i + Math.round(rnd * 3)) % 5]) });
    }
    if (m.ad === 'zipla' && t > (n + 1) * (700 + rnd * 500)) { n++; yolla({ t: 'mini', eylem: Math.random() < .55 ? 'zipla' : 'egil', g: Math.round(t) }); if (Math.random() < .08) yolla({ t: 'mini', vurul: n }); }
    if (m.ad === 'catlak') {
      const ben = m.oyuncular?.find((o) => o.id === benId);
      if (ben && !poz) poz = { x: ben.x, y: ben.y, a: rnd * 6 };
      if (poz) {
        poz.a += (Math.random() - .5) * .9;
        let nx = poz.x + Math.cos(poz.a) * .2, ny = poz.y + Math.sin(poz.a) * .2;
        if (nx < .7 || nx > 9.3) { poz.a = Math.PI - poz.a; nx = poz.x; }
        if (ny < .7 || ny > 9.3) { poz.a = -poz.a; ny = poz.y; }
        poz.x = nx; poz.y = ny; yolla({ t: 'mini', poz: [+nx.toFixed(3), +ny.toFixed(3)], n: dogum });
      }
    }
    if (m.ad === 'isik' && t > (n + 1) * (450 + rnd * 300)) { n++; yolla({ t: 'mini', don: [-1, 0, 1][Math.random() * 3 | 0] }); }
  }, 66);
  const kapat = () => { clearInterval(zaman); try { w.close(); } catch {} };
  setTimeout(kapat, 5 * 60 * 1000); // bir şey ters giderse en geç beş dakikada çıkar
  return kapat;
}

// sayi kadar bot açar; dönen fonksiyon hepsini kapatır
module.exports = (url, sayi) => { const k = ADLAR.slice(0, sayi).map((ad, i) => bot(url, ad, [.9, .5, .2][i])); return () => k.forEach((f) => f()); };
