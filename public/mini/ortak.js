// Mini oyunların istemci tarafı buraya kaydolur: MINI[ad] = { kur(alan, gonder), guncelle(d), kapat() }
window.MINI = {};
window.yukle = (ad) => new Promise((tamam) => {
  if (MINI[ad]) return tamam();
  const s = document.createElement('script'); s.src = `mini/${ad}.js`; s.onload = tamam; s.onerror = tamam; document.head.appendChild(s);
});

// her mini oyundan önce 5 saniyelik tanıtım: başlık, simge, nasıl oynanır
window.MINI_TANITIM = {
  karma: { ikon: '🔀', baslik: 'Karışık Harfler', satir: ['Harfleri karışmış kelimeler gelecek.', 'Harflere dokun ya da yaz.', 'Doğru kelime +1, geçersen −1.', '90 saniyede en çok puanı toplayan kazanır!'] },
  ritim: { ikon: '🕺', baslik: 'Ritim Dizisi', satir: ['Notalar sağdan sola akacak.', 'Nota halkaya gelince aynı yön tuşuna bas.', 'Tam zamanında +50, biraz kaçırırsan +25.', 'Notalar giderek hızlanır!'] },
  zipla: { ikon: '🦘', baslik: 'Zıpla Eğil', satir: ['Dikenli silindirler sağdan gelecek.', 'Alçaktan gelene ⬆ ZIPLA, yüksekten gelene ⬇ EĞİL.', 'Silindirler giderek hızlanır.', '3 canın var, en son ayakta kalan kazanır!'] },
  kule: { ikon: '🧱', baslik: 'Kule', satir: ['Kasa vincin ucunda sağa sola kayacak.', 'Doğru anda Bırak\'a bas.', 'Yarısı boşta kalan kasa devrilir.', 'Tepeye ilk ulaşan kazanır!'] },
  catlak: { ikon: '🌋', baslik: 'Çatlak Zemin', satir: ['Lavın üstündeki taşlarda yürüyeceksin.', 'Bastığın taş çatlar ve az sonra düşer, durma!', 'Düşen taş 4 saniye sonra geri gelir.', 'Birine çarparsan ikiniz de savrulur, bir an sersemlersiniz.', '3 canın var: lava düşersen sağlam bir taşta yeniden doğarsın.', 'Canı biten elenir, ayakta kalan son kişi kazanır!'] },
  isik: { ikon: '⚡', baslik: 'Işık İzi', satir: ['Hep ileri gidersin, arkanda ışıktan iz kalır.', 'Sol tuşu basılı tut: sola, sağı tut: sağa dön.', 'İze ya da duvara çarpan elenir, kalanlar +1 alır.', 'İzdeki boşluklardan geçebilirsin!'] },
};

// Efekt sesleri: her dokunuşta yeni Audio yaratmak telefonda takılma yapar. Sesler bir kez indirilip
// çözülür, sonra Web Audio ile gecikmesiz çalınır. Kullanım: efektCal('kutuphane/arayuz/click_001', 0.5)
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null; const tampon = new Map(), ham = new Map();
  // ham: indirilmiş ama çözülmemiş dosyalar. Çözülmüş ses belleği çok tutar (ipucu başına ~0,5 MB),
  // bu yüzden oyunun bütün sesleri yalnız indirilip saklanır, çalınmadan bir tur önce çözülür.
  const indir = (yol) => { if (!ham.has(yol)) ham.set(yol, fetch(yol).then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null)); return ham.get(yol); };
  const baglam = () => (ctx ||= AC ? new AC() : null);
  // yol: 'efekt/sira.mp3' ya da 'ses/abc.mp3'; aynı dosya bir kez indirilip çözülür
  const yolYukle = (yol) => {
    if (!tampon.has(yol)) tampon.set(yol, indir(yol).then((b) => { ham.delete(yol); return b && new Promise((ok, red) => baglam().decodeAudioData(b, ok, red)); }).catch(() => null));
    return tampon.get(yol);
  };
  const yukle = (ad) => yolYukle(`efekt/${ad}.mp3`);
  // çözülmüş ipucu sesleri en fazla 20 tane tutulur (bu tur, sonraki ve bir önceki); eskisi bellekten atılır
  const ipucuSira = [];
  const ipucuTut = (yol) => { if (ipucuSira.includes(yol)) return; ipucuSira.push(yol); while (ipucuSira.length > 20) tampon.delete(ipucuSira.shift()); };
  window.sesOnyukle = (yol) => { if (baglam()) { yolYukle(yol); ipucuTut(yol); } };
  // yükleme ekranı: bu sesler çözülüp çalmaya hazır olunca biter; her biri bitince ilerle(kaç tane bitti) çağrılır
  window.sesHazirla = (yollar, ilerle) => { if (!baglam()) return Promise.resolve(); let n = 0; return Promise.all(yollar.map((y) => (ipucuTut(y), yolYukle(y)).then(() => ilerle && ilerle(++n)))); };
  // oyunun geri kalan sesleri arka planda, aynı anda en fazla üçü inecek şekilde sırayla indirilir
  const kuyruk = []; let inen = 0;
  const sirada = () => { while (inen < 3 && kuyruk.length) { const y = kuyruk.shift(); if (tampon.has(y) || ham.has(y)) continue; inen++; indir(y).finally(() => { inen--; sirada(); }); } };
  window.sesOnbellek = (yollar) => { kuyruk.push(...yollar); sirada(); };
  // ipucu sesi: önceden yüklendiyse anında, değilse iner inmez çalar; dönen fonksiyon sesi durdurur
  window.sesCal = (yol, ses = 1) => {
    const c = baglam(); let s = null, iptal = false;
    if (!c) { const a = new Audio(yol); a.volume = ses; a.play().catch(() => {}); return () => a.pause(); }
    yolYukle(yol).then((b) => { if (!b || iptal) return; const g = c.createGain(); g.gain.value = ses; s = c.createBufferSource(); s.buffer = b; s.connect(g).connect(c.destination); s.start(); });
    return () => { iptal = true; try { s && s.stop(); } catch {} };
  };
  window.efektYukle = (liste) => { if (baglam()) liste.forEach(yukle); };
  // ilk dokunuşta çağrılır: iPhone sesi ancak bir dokunuştan sonra açar
  window.efektKilidiAc = () => { const c = baglam(); if (c && c.state !== 'running') c.resume(); };
  window.efektCal = (ad, ses = 0.6) => {
    const c = baglam();
    if (!c) { const a = new Audio(`efekt/${ad}.mp3`); a.volume = ses; a.play().catch(() => {}); return; }
    yukle(ad).then((b) => { if (!b) return; const s = c.createBufferSource(), g = c.createGain(); g.gain.value = ses; s.buffer = b; s.connect(g).connect(c.destination); s.start(); });
  };
  // sık kullanılanlar baştan hazır olsun
  window.addEventListener('load', () => efektYukle(['sira', 'sure-bitti', 'tik', 'kazan', 'kutuphane/arayuz/click_001', 'kutuphane/arayuz/click_002', 'kutuphane/arayuz/click_003',
    'kutuphane/arayuz/click_004', 'kutuphane/arayuz/confirmation_001', 'kutuphane/arayuz/confirmation_002', 'kutuphane/arayuz/error_002', 'kutuphane/arayuz/error_004',
    'kutuphane/arayuz/error_006', 'kutuphane/arayuz/drop_001', 'kutuphane/arayuz/drop_002', 'kutuphane/arayuz/drop_003', 'kutuphane/arayuz/pluck_001', 'kutuphane/arayuz/pluck_002']));
})();
