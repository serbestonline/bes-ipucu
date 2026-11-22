// Beş İpucu sunucusu: oda, turlar, puan, jokerler, mini oyunlar. Kurallar TASARIM.md'de.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const miniSirasi = require('./plan.js');

const KOK = __dirname, PORT = +process.env.PORT || 3480;
const oku = f => JSON.parse(fs.readFileSync(path.join(KOK, f)));
const SET = oku('kelimeler/set.json');
// ipucu sesleri repoda yok, bir kez üretilir: python3 ses/uret.py (README'de anlatılıyor)
if (!fs.existsSync(path.join(KOK, 'ses/ahmet/dizin.json'))) { console.error('İpucu sesleri bulunamadı. Önce üret: pip install edge-tts && python3 ses/uret.py\nClue audio not found. Generate it first: pip install edge-tts && python3 ses/uret.py'); process.exit(1); }
const SES = oku('ses/ahmet/dizin.json');
const TUR_MS = +process.env.TUR_MS || 30000, IPUCU_MS = TUR_MS / 5, HASAR = 10, ARA_MS = +process.env.ARA_MS || 5000;
const CARPAN = { 1: 1, 2: 1.25, 3: 1.5 };
const JOKERLER = ['kalkan', 'cift', 'harf', 'dondur'];
const RENKLER = ['#ff5d5d', '#4fb3ff', '#ffd23f', '#5ee07a', '#c77dff', '#ff9f43', '#2ee6d6', '#ff6bb5'];

// mini oyunlar: mini/<ad>.js, her biri { ad, baslik, baslat(m), mesaj(m, o, v), durum(m, id), bitir? }
const MINILER = {};
for (const f of fs.existsSync(path.join(KOK, 'mini')) ? fs.readdirSync(path.join(KOK, 'mini')) : [])
  if (f.endsWith('.js')) { const m = require(path.join(KOK, 'mini', f)); MINILER[m.ad] = m; }

// Türkçe karşılaştırma: küçük harf, şapkasız, yalnız harfler
const norm = s => s.toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' })[c]).replace(/[^a-z]/g, '');
function uzaklik(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// telefonda tek harflik yazım hatası affedilir (5 harften uzun kelimelerde)
const dogruMu = (tahmin, kelime) => kelime.kabul.concat(kelime.kelime).some(k => {
  const a = norm(tahmin), b = norm(k);
  return a === b || (b.length >= 5 && uzaklik(a, b) <= 1);
});

const kullanilan = new Set(); // sunucu açık kaldıkça oynanmış kelimeler
const karistir = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

const oda = { salon: {}, faz: 'lobi', oyuncular: new Map(), host: null, ayar: { kelime: 10, miniSayi: 0, miniler: [] }, kelimeler: [], turNo: 0, tur: null, plan: {}, mini: null, son: null, zaman: [] };

function oyuncuGorunum(o) {
  return { id: o.id, ad: o.ad, renk: o.renk, puan: o.puan, bagli: !!o.ws, jokerSayi: o.jokerler.length,
    bildi: oda.tur && oda.tur.bilenler[o.id] ? oda.tur.bilenler[o.id].puan : null, donmus: donmusMu(o) };
}
function durum(id) {
  const o = oda.oyuncular.get(id), t = oda.tur, simdi = Date.now();
  const d = { faz: oda.faz, host: oda.host, ayar: oda.ayar, renkler: RENKLER, minilerVar: Object.values(MINILER).map(m => ({ ad: m.ad, baslik: m.baslik })),
    oyuncular: [...oda.oyuncular.values()].map(oyuncuGorunum), turNo: oda.turNo, toplam: oda.kelimeler.length,
    kalanKelime: SET.length - kullanilan.size,
    ben: o && { id: o.id, jokerler: o.jokerler, etki: o.etki, donma: donmusMu(o) ? { kalanMs: o.donma.bitis - simdi, kim: o.donma.kim } : null } };
  if (t && (oda.faz === 'tur' || oda.faz === 'turSonu')) {
    d.tur = { ipucuNo: t.ipucuNo, // cümleler gönderilmez: ipuçları yalnız sesle gelir
      gecenMs: simdi - t.basla, turMs: TUR_MS, zorluk: t.kelime.zorluk,
      ceza: t.ceza[id] || 0, bildin: t.bilenler[id] || null, uzunluk: [...t.kelime.kelime].length };
    if (o && o.etki.harf > 0) d.tur.ilkHarf = t.kelime.kelime[0].toLocaleUpperCase('tr');
    if (oda.faz === 'turSonu' || process.env.TEST) d.tur.cevap = t.kelime.kelime; // TEST yalnız otomatik deneme içindir
  }
  if (oda.faz === 'mini' && oda.mini) {
    d.mini = { ad: oda.mini.ad, ...MINILER[oda.mini.ad].durum(oda.mini, id) };
    // değişmeyen veri (nota listesi, parça listesi gibi) her oyuncuya yalnız bir kez gider
    const M = MINILER[oda.mini.ad];
    if (typeof M.sabit === 'function' && !(oda.mini.sabitGiden ||= new Set()).has(id)) { d.mini.sabit = M.sabit(oda.mini); oda.mini.sabitGiden.add(id); }
  }
  if (oda.faz === 'yukleme' && oda.yukleme) d.yukleme = { kalanMs: oda.yukleme.bitis - simdi, hazir: oda.yukleme.hazir };
  if (oda.faz === 'miniTanitim' && oda.tanitim) d.tanitim = { ad: oda.tanitim.ad, kalanMs: oda.tanitim.bitis - simdi, hazir: oda.tanitim.hazir };
  if (oda.son) d.son = oda.son;
  if (oda.faz === 'bitis') { d.salon = oda.salon; d.bitisGecen = simdi - oda.son.t; } // geç gelen töreni atlayıp salona girer
  return d;
}
// aynı anda tetiklenen güncellemeler tek gönderimde birleşir (telefon saniyede onlarca kez çözmek zorunda kalmaz)
let yayBekliyor = null;
function yay() { if (!yayBekliyor) yayBekliyor = setImmediate(() => { yayBekliyor = null; for (const o of oda.oyuncular.values()) if (o.ws) gonder(o.ws, { t: "durum", d: durum(o.id) }); }); }
function herkese(m) { for (const o of oda.oyuncular.values()) if (o.ws) gonder(o.ws, m); }
function gonder(ws, m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
const zamanlayici = (f, ms) => { const z = setTimeout(f, ms); oda.zaman.push(z); return z; };
const temizle = () => { oda.zaman.forEach(clearTimeout); oda.zaman = []; };

// ---- oyun akışı ----
function oyunBaslat() {
  const n = oda.ayar.kelime;
  let havuz = SET.filter(k => !kullanilan.has(k.kelime));
  if (havuz.length < n) { kullanilan.clear(); havuz = SET.slice(); } // set bittiyse baştan
  oda.kelimeler = karistir(havuz).slice(0, n);
  oda.kelimeler.forEach(k => kullanilan.add(k.kelime));
  for (const o of oda.oyuncular.values()) { o.puan = 0; o.jokerler = []; o.etki = bosEtki(); o.ist = bosIst(); o.donma = null; o.donmaBekliyor = null; }
  oda.salon = {};
  // mini oyunlar eşit aralıklarla; sıra plan.js'te: dengeli dağılır, aynı oyun art arda gelmez
  oda.plan = {};
  const m = oda.ayar.miniler.length ? Math.min(oda.ayar.miniSayi, n / 5 | 0) : 0;
  miniSirasi(oda.ayar.miniler, m).forEach((ad, i) => { oda.plan[Math.round((i + 1) * n / (m + 1))] = ad; });
  oda.turNo = 0; oda.son = null;
  // yükleme ekranı: telefonlar ilk iki turun seslerini hazırlayıp "hazır" der, oyun herkes hazır olunca
  // ya da en geç YUKLEME_MS sonra başlar. Kalan turların sesleri arka planda iner (yalnız dosya, çözülmeden).
  temizle();
  oda.faz = 'yukleme'; oda.yukleme = { bitis: Date.now() + YUKLEME_MS, hazir: [] };
  for (const o of oda.oyuncular.values()) if (o.ws) yuklemeGonder(o.ws);
  zamanlayici(yuklemeBitti, YUKLEME_MS);
  yay();
}
const YUKLEME_MS = +process.env.YUKLEME_MS || 15000;
function yuklemeGonder(ws) {
  gonder(ws, { t: 'onyukle', hazirla: true, dosyalar: oda.kelimeler.slice(0, 2).flatMap((k) => SES[k.kelime]) });
  gonder(ws, { t: 'onbellek', dosyalar: oda.kelimeler.slice(2).flatMap((k) => SES[k.kelime]) });
}
// yükleme sırasında biri çıkarsa kalanların hepsi hazırsa beklemeden başlanır
const yuklemeKontrol = () => { if (oda.faz === 'yukleme' && [...oda.oyuncular.values()].filter((x) => x.ws).every((x) => oda.yukleme.hazir.includes(x.id))) yuklemeBitti(); };
function yuklemeBitti() {
  if (oda.faz !== 'yukleme') return;
  oda.yukleme = null; turBaslat();
}
const bosEtki = () => ({ kalkan: 0, cift: 0, harf: 0 });
const DONMA_MS = 15000;
const donmusMu = (o) => !!o.donma && Date.now() < o.donma.bitis;
function dondur(h, kim, ms = DONMA_MS) {
  h.donma = { bitis: Date.now() + ms, kim }; h.donmaBekliyor = null;
  if (h.ws) gonder(h.ws, { t: 'donduruldun', kim, ms });
  setTimeout(yay, ms + 50); // buz çözülünce herkesin ekranı güncellensin
}
// kapanış töreni ve salon için oyuncu başına sayaçlar
const bosIst = () => ({ bildi: 0, ms: 0, yanlis: 0, mini: 0, joker: 0, donduruldu: 0 });

const onyukle = (...siralar) => herkese({ t: 'onyukle', dosyalar: siralar.map((i) => oda.kelimeler[i]).filter(Boolean).flatMap((k) => SES[k.kelime]) });
function turBaslat() {
  temizle();
  oda.turNo++;
  const kelime = oda.kelimeler[oda.turNo - 1];
  oda.faz = 'tur';
  oda.tur = { kelime, basla: Date.now(), ipucuNo: 0, bilenler: {}, ceza: {} };
  for (const o of oda.oyuncular.values()) if (o.donmaBekliyor) dondur(o, o.donmaBekliyor.kim, o.donmaBekliyor.ms); // tur arasında kalan buz yeni turda sürer
  onyukle(oda.turNo - 1, oda.turNo); // bu tur ve bir sonraki (telefonlar ses dosyalarını önceden indirir)
  for (let i = 0; i < 5; i++) zamanlayici(() => {
    oda.tur.ipucuNo = i + 1;
    herkese({ t: 'ses', dosya: SES[kelime.kelime][i] });
    yay();
  }, i * IPUCU_MS);
  zamanlayici(turBitir, TUR_MS);
  yay();
}

function tahmin(o, metin) {
  const t = oda.tur, simdi = Date.now() - (t ? t.basla : 0);
  if (oda.faz !== 'tur' || !t || t.bilenler[o.id] || !metin) return;
  if (donmusMu(o)) return gonder(o.ws, { t: 'uyari', m: 'Dondurulmuşsun, ' + Math.ceil((o.donma.bitis - Date.now()) / 1000) + ' sn' });
  if (dogruMu(metin, t.kelime)) {
    const tavan = Math.max(0, 100 - simdi / TUR_MS * 100 - (t.ceza[o.id] || 0));
    const puan = Math.round(tavan * CARPAN[t.kelime.zorluk] * (o.etki.cift > 0 ? 2 : 1));
    t.bilenler[o.id] = { puan, ms: simdi };
    o.puan += puan; o.ist.bildi++; o.ist.ms += simdi;
    gonder(o.ws, { t: 'dogru', puan });
    const bagli = [...oda.oyuncular.values()].filter(x => x.ws);
    if (bagli.every(x => t.bilenler[x.id])) turBitir();
    else yay();
  } else {
    if (!(o.etki.kalkan > 0)) t.ceza[o.id] = (t.ceza[o.id] || 0) + HASAR;
    o.ist.yanlis++;
    gonder(o.ws, { t: 'yanlis', kalkan: o.etki.kalkan > 0 });
    yay();
  }
}

function turBitir() {
  if (oda.faz !== 'tur') return;
  temizle();
  const t = oda.tur;
  oda.faz = 'turSonu';
  // tur biterken donmuş olanın kalan süresi tur arasında erimez, bir sonraki tura aktarılır
  for (const o of oda.oyuncular.values()) if (donmusMu(o)) { o.donmaBekliyor = { kim: o.donma.kim, ms: o.donma.bitis - Date.now() }; o.donma = null; }
  // her kelimenin kaç saniyede bilindiği, zorluk etiketlerini sonra veriye göre düzeltmek için
  fs.appendFile(path.join(KOK, 'istatistik.jsonl'), JSON.stringify({ kelime: t.kelime.kelime, zorluk: t.kelime.zorluk,
    oyuncu: oda.oyuncular.size, bilen: Object.values(t.bilenler).map(b => Math.round(b.ms / 100) / 10), tarih: new Date().toISOString() }) + '\n', () => {});
  for (const o of oda.oyuncular.values()) for (const k in o.etki) if (o.etki[k] > 0) o.etki[k]--;
  yay();
  zamanlayici(sonraki, ARA_MS);
}

function sonraki() {
  if (oda.plan[oda.turNo] && !oda.plan[oda.turNo + '_oynandi']) { oda.plan[oda.turNo + '_oynandi'] = 1; return miniBaslat(oda.plan[oda.turNo]); }
  if (oda.turNo < oda.kelimeler.length) return turBaslat();
  bitis();
}

function bitis() {
  temizle();
  oda.faz = 'bitis'; oda.tur = null;
  oda.son = { sira: [...oda.oyuncular.values()].sort((a, b) => b.puan - a.puan).map(o => ({ id: o.id, ad: o.ad, renk: o.renk, puan: o.puan, ist: o.ist })), t: Date.now() };
  // salondaki başlangıç yerleri (salon.js ile aynı): kimse hareket etmeden de vurulabilir ve vurabilir
  oda.salon = {};
  oda.son.sira.forEach((o, i) => { oda.salon[o.id] = i === 0 ? { x: 0, y: .6, z: -5.9, r: 0 } : { x: (i % 2 ? -1 : 1) * 2.2, y: 0, z: -3 + Math.floor((i - 1) / 2) * 2, r: 0 }; });
  yay();
}

// lobiye dönerken bağlantısı kopmuş oyuncular odadan silinir: test ya da çıkan biri lobide hayalet kalmasın
function lobiyeDon() {
  oda.faz = 'lobi';
  for (const [id, o] of oda.oyuncular) if (!o.ws) oda.oyuncular.delete(id);
  if (!oda.oyuncular.get(oda.host)?.ws) oda.host = [...oda.oyuncular.values()].find(x => x.ws)?.id || null;
  yay();
}

// ---- mini oyunlar ----
// mini oyundan önce tanıtım: herkes "Hazırım" deyince ya da en fazla 20 sn sonra başlar
const TANITIM_MS = +process.env.TANITIM_MS || 20000;
function miniBaslat(ad, deneme) {
  temizle();
  oda.faz = 'miniTanitim';
  oda.tanitim = { ad, deneme, bitis: Date.now() + TANITIM_MS, hazir: [] };
  zamanlayici(() => miniOyna(ad, deneme), TANITIM_MS);
  yay();
}
function hazirim(o) {
  if (oda.faz === 'yukleme') {
    const y = oda.yukleme; if (y.hazir.includes(o.id)) return;
    y.hazir.push(o.id); yay(); yuklemeKontrol();
    return;
  }
  const t = oda.tanitim;
  if (oda.faz !== 'miniTanitim' || !t || t.hazir.includes(o.id)) return;
  t.hazir.push(o.id);
  if ([...oda.oyuncular.values()].filter((x) => x.ws).every((x) => t.hazir.includes(x.id))) miniOyna(t.ad, t.deneme);
  else yay();
}
function miniOyna(ad, deneme) {
  if (oda.faz !== 'miniTanitim') return;
  temizle();
  const M = MINILER[ad];
  oda.faz = 'mini'; oda.tanitim = null;
  oda.mini = { ad, deneme, oyuncular: [...oda.oyuncular.values()].filter(o => o.ws).map(o => ({ id: o.id, ad: o.ad, renk: o.renk })),
    yay, herkese, zamanlayici, bitir: sira => miniBitti(sira),
    gonder: (id, msg) => { const o = oda.oyuncular.get(id); if (o && o.ws) gonder(o.ws, { t: 'mini', ...msg }); },
    GERI_SAYIM: 3000 };
  M.baslat(oda.mini);
  yay();
}
function miniBitti(sira) {
  if (oda.faz !== 'mini') return;
  temizle();
  const m = oda.mini;
  // 1.'ye 2, 2.'ye 1 rastgele joker; elde en fazla 3, fazlası gelirse en eskisi düşer
  const verilen = {};
  if (!m.deneme && oda.oyuncular.get(sira[0])) oda.oyuncular.get(sira[0]).ist.mini++;
  [[sira[0], 2], [sira[1], 1]].forEach(([id, n]) => {
    const o = id && oda.oyuncular.get(id); if (!o) return;
    verilen[id] = [];
    for (let i = 0; i < n; i++) { const j = JOKERLER[Math.random() * 4 | 0]; o.jokerler.push(j); verilen[id].push(j); }
    while (o.jokerler.length > 3) o.jokerler.shift();
  });
  oda.faz = 'miniSonu';
  oda.son = { mini: MINILER[m.ad].baslik, sira: sira.map(id => { const o = oda.oyuncular.get(id); return o && { id, ad: o.ad, renk: o.renk }; }).filter(Boolean), verilen };
  oda.mini = null;
  yay();
  zamanlayici(() => { oda.son = null; if (m.deneme) { lobiyeDon(); } else sonraki(); }, 6000);
}

function joker(o, tur, hedefId) {
  const i = o.jokerler.indexOf(tur);
  if (i < 0 || !['tur', 'turSonu', 'lobi'].includes(oda.faz)) return;
  if (tur === 'dondur') {
    const h = oda.oyuncular.get(hedefId);
    if (!h || h === o) return;
    // dondurma kullanıldığı anda başlar ve 15 sn sürer; turlar arasında kullanılırsa bir sonraki turun başında başlar
    h.ist.donduruldu++;
    if (oda.faz === 'tur') dondur(h, o.ad); else h.donmaBekliyor = { kim: o.ad, ms: DONMA_MS };
    herkese({ t: 'olay', m: `${o.ad}, ${h.ad} adlı oyuncuyu dondurdu` });
  } else {
    o.etki[tur] = 3;
    herkese({ t: 'olay', m: `${o.ad} bir joker kullandı` });
  }
  o.jokerler.splice(i, 1); o.ist.joker++;
  yay();
}

// ---- bağlantı ----
function mesaj(ws, v) {
  if (v.t === 'katil') {
    let o = v.id && oda.oyuncular.get(v.id);
    if (!o) {
      if (oda.oyuncular.size >= 8) return gonder(ws, { t: 'uyari', m: 'Oda dolu (8 kişi)' });
      const id = crypto.randomUUID().slice(0, 8);
      const renk = RENKLER.find(r => ![...oda.oyuncular.values()].some(x => x.renk === r)) || RENKLER[0];
      o = { id, ad: String(v.ad || 'Oyuncu').slice(0, 14), renk, puan: 0, jokerler: [], etki: bosEtki(), ist: bosIst() };
      oda.oyuncular.set(id, o);
    }
    if (o.ws && o.ws !== ws) o.ws.close();
    o.ws = ws; ws.oyuncu = o.id;
    oda.mini?.sabitGiden?.delete(o.id); // yeniden bağlanan sabit veriyi tekrar alsın
    if (!oda.host || !oda.oyuncular.get(oda.host)?.ws) oda.host = o.id;
    gonder(ws, { t: 'kimlik', id: o.id });
    if (oda.faz === 'yukleme') yuklemeGonder(ws); // yükleme sırasında yeniden bağlanan da sesleri alsın
    return yay();
  }
  const o = oda.oyuncular.get(ws.oyuncu); if (!o) return;
  const host = o.id === oda.host;
  // lobide herkes kendi rengini seçer; başkasının aldığı renk seçilemez, renk oyun boyunca karakterini izler
  if (v.t === 'renk' && oda.faz === 'lobi' && RENKLER.includes(v.renk) && ![...oda.oyuncular.values()].some(x => x !== o && x.renk === v.renk)) { o.renk = v.renk; return yay(); }
  if (v.t === 'ayar' && host && oda.faz === 'lobi') {
    const k = [10, 20, 50, 100].includes(v.kelime) ? v.kelime : oda.ayar.kelime;
    const miniler = (v.miniler || []).filter(a => MINILER[a]);
    oda.ayar = { kelime: k, miniler, miniSayi: Math.max(0, Math.min(k / 5, v.miniSayi | 0)) };
    yay();
  } else if (v.t === 'basla' && host && (oda.faz === 'lobi' || oda.faz === 'bitis')) oyunBaslat();
  else if (v.t === 'lobiye' && host && oda.faz === 'bitis') { oda.son = null; lobiyeDon(); }
  // lobide herkes kurucu olabilir: kurucu çıkarsa ya da unutulmuş bir sekme kurucu kalırsa oyun takılmaz
  else if (v.t === 'kurucuOl' && oda.faz === 'lobi' && !host) { oda.host = o.id; yay(); }
  else if (v.t === 'miniDene' && host && oda.faz === 'lobi' && MINILER[v.ad] && !oda.botBekliyor) {
    // "Test et": odaya üç deneme botu katılır (oda 8 kişiyi geçmez), katılınca deneme başlar
    const sayi = v.bot ? Math.min(3, 8 - oda.oyuncular.size) : 0;
    if (!sayi) return miniBaslat(v.ad, true);
    oda.botBekliyor = true; require('./botlar.js')(`ws://127.0.0.1:${PORT}`, sayi);
    setTimeout(() => { oda.botBekliyor = false; if (oda.faz === 'lobi') miniBaslat(v.ad, true); }, 800);
  }
  else if (v.t === 'tahmin') tahmin(o, String(v.metin || '').slice(0, 40));
  else if (v.t === 'joker') joker(o, v.tur, v.hedef);
  else if (v.t === 'mini' && oda.faz === 'mini' && oda.mini) MINILER[oda.mini.ad].mesaj(oda.mini, o, v);
  else if (v.t === 'hazir') hazirim(o);
  else if (v.t === 'salon' && oda.faz === 'bitis') salon(o, v);
}

// ---- kapanış salonu ----
// hareket telefonda hesaplanır, sunucu yalnız konumu saklar ve dağıtır; yumruğun kime değdiğine sunucu karar verir
const VURUS_MENZIL = 1.7, VURUS_ARA = 450, SAVRULMA = 13;
function salon(o, v) {
  const k = oda.salon;
  if (Array.isArray(v.k) && v.k.length === 4 && v.k.every(Number.isFinite)) {
    const [x, y, z, r] = v.k;
    k[o.id] = { ...k[o.id], x: Math.max(-14, Math.min(14, x)), y: Math.max(0, Math.min(6, y)), z: Math.max(-11, Math.min(11, z)), r };
    return herkese({ t: 'salon', k: [o.id, k[o.id].x, k[o.id].y, k[o.id].z, r] });
  }
  if (v.vur) {
    const ben = k[o.id], simdi = Date.now();
    if (!ben || simdi - (ben.vurdu || 0) < VURUS_ARA) return;
    ben.vurdu = simdi;
    const ileriX = Math.sin(ben.r), ileriZ = Math.cos(ben.r), hedef = [];
    for (const [id, h] of Object.entries(k)) {
      if (id === o.id || !oda.oyuncular.get(id)?.ws) continue;
      const dx = h.x - ben.x, dz = h.z - ben.z, u = Math.hypot(dx, dz);
      if (u > VURUS_MENZIL || Math.abs(h.y - ben.y) > 1.2) continue;
      if (u > .3 && (dx * ileriX + dz * ileriZ) / u < .35) continue; // önündekine değer
      const nx = u > .3 ? dx / u : ileriX, nz = u > .3 ? dz / u : ileriZ;
      hedef.push([id, nx * SAVRULMA, nz * SAVRULMA]);
    }
    herkese({ t: 'salon', vur: o.id, hedef });
  }
}

const TIPLER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };
const sunucu = http.createServer((q, r) => {
  const yol = decodeURIComponent(q.url.split('?')[0]);
  let dosya;
  if (yol.startsWith('/ses/')) dosya = path.join(KOK, 'ses/ahmet', path.basename(yol));
  else dosya = path.join(KOK, 'public', path.normalize(yol === '/' ? '/index.html' : yol));
  if (!dosya.startsWith(KOK)) { r.writeHead(403); return r.end(); }
  fs.readFile(dosya, (h, veri) => {
    if (h) { r.writeHead(404); return r.end('yok'); }
    r.writeHead(200, { 'Content-Type': TIPLER[path.extname(dosya)] || 'application/octet-stream', 'Cache-Control': yol.startsWith('/ses/') ? 'max-age=86400' : 'no-cache' });
    r.end(veri);
  });
});
new WebSocketServer({ server: sunucu }).on('connection', ws => {
  ws.on('message', m => { try { mesaj(ws, JSON.parse(m)); } catch (h) { console.error(h); } });
  ws.on('close', () => {
    const o = oda.oyuncular.get(ws.oyuncu);
    if (o && o.ws === ws) { o.ws = null;
      if (oda.host === o.id) oda.host = [...oda.oyuncular.values()].find(x => x.ws)?.id || null;
      if (oda.faz === 'lobi') oda.oyuncular.delete(o.id);
      yay(); yuklemeKontrol(); }
  });
});
if (require.main === module) sunucu.listen(PORT, process.env.HOST || undefined, () => console.log(`Beş İpucu ${PORT} portunda; mini oyunlar: ${Object.keys(MINILER).join(', ') || 'yok'}`));
module.exports = { norm, dogruMu, salon, oda, sunucu }; // sunucu: testler aynı süreçte açıp odaya bakabilsin
