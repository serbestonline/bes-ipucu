// Beş İpucu telefon arayüzü
const $ = (s) => document.querySelector(s);
const ekran = $('#ekran');
const JOKER_AD = { kalkan: '🛡️ Kalkan', cift: '✖️2 Çift', harf: '🔤 İlk harf', dondur: '🥶 Dondur' };
const JOKER_ACIK = { kalkan: 'yanlış tahmin hasar vermez', cift: 'puanın iki katı', harf: 'cevabın ilk harfi görünür', donmus: '15 saniye yazamazsın' };
let ipucuDur = null; // çalan ipucu sesini durdurur
let miniSabit = null; // mini oyunun bir kez gelen değişmez verisi
let ws, benimId = localStorage.getItem('bes-id'), d = null, cizilenFaz = null, alinanZaman = 0, sesAcik = false;
const ses = new Audio(); ses.preload = 'auto';
const efekt = (ad) => efektCal(ad, .6);
const arkaMuzik = new Audio('efekt/muzik.mp3'); arkaMuzik.loop = true; arkaMuzik.volume = 0.3;
let muzikIzni = localStorage.getItem('bes-muzik') !== '0';
function muzik(ac) { if (ac && muzikIzni && sesAcik) arkaMuzik.play().catch(() => {}); else arkaMuzik.pause(); }
const titret = (ms) => navigator.vibrate && navigator.vibrate(ms);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const gonder = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

function bildir(m) {
  const k = document.createElement('div'); k.textContent = m; $('#bildirim').appendChild(k);
  setTimeout(() => k.remove(), 2600);
}

function baglan() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.pathname.replace(/[^/]*$/, '')); // /oyun/ gibi bir yol altında da çalışır
  ws.onopen = () => { const ad = localStorage.getItem('bes-ad'); if (ad) gonder({ t: 'katil', id: benimId, ad }); };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'kimlik') { benimId = m.id; localStorage.setItem('bes-id', m.id); }
    else if (m.t === 'durum') {
      d = m.d; alinanZaman = performance.now();
      if (d.mini) { if (d.mini.sabit) miniSabit = { ad: d.mini.ad, ...d.mini.sabit }; if (miniSabit && miniSabit.ad === d.mini.ad) d.mini = { ...miniSabit, ...d.mini }; }
      ciz();
    }
    else if (m.t === 'onyukle') {
      const yollar = m.dosyalar.map((f) => 'ses/' + f);
      // yükleme ekranı: ilk iki turun sesleri çözülüp hazır olunca sunucuya "hazır" denir
      if (m.hazirla) { yukleme = { n: 0, toplam: yollar.length }; sesHazirla(yollar, (n) => { yukleme.n = n; yuklemeCubuk(); }).then(() => gonder({ t: 'hazir' })); }
      else yollar.forEach(sesOnyukle);
    }
    else if (m.t === 'onbellek') sesOnbellek(m.dosyalar.map((f) => 'ses/' + f));
    // ipucu sunucunun sinyaliyle, önceden yüklenmiş tampondan çalar: herkes aynı anda duyar
    else if (m.t === 'ses') { if (sesAcik) { ipucuDur && ipucuDur(); ipucuDur = sesCal('ses/' + m.dosya); } }
    else if (m.t === 'dogru') { efekt('sira'); titret(80); bildir(`Bildin! +${m.puan}`); }
    else if (m.t === 'yanlis') { efekt('sure-bitti'); titret([40, 40, 40]); const k = $('#kutu'); if (k) { k.classList.remove('titre'); void k.offsetWidth; k.classList.add('titre'); } hasar(!!m.kalkan); }
    else if (m.t === 'donduruldun') { efekt('kutuphane/arayuz/error_006'); titret([200, 80, 200]); }
    else if (m.t === 'uyari' || m.t === 'olay') bildir(m.m);
    else if (m.t === 'mini' && aktifMini && MINI[aktifMini]?.mesaj) MINI[aktifMini].mesaj(m);
    else if (m.t === 'salon') salonMod?.mesaj(m);
  };
  ws.onclose = () => setTimeout(baglan, 1000);
}

// ilk dokunuş sesi açar (telefonlar dokunuşsuz ses çalmaz)
function sesiAc() {
  efektKilidiAc();
  if (sesAcik) return; sesAcik = true;
  ses.src = 'efekt/tik.mp3'; ses.volume = 0.01; ses.play().catch(() => {}).finally(() => { ses.volume = 1; });
}

const DALGA = (n = 7) => `<span class="dalga">${'<i></i>'.repeat(n)}</span>`;
const BASLIK = `<div class="logo-kap">${DALGA(9)}<h1 class="logo yazi">BEŞ<br><span>İPUCU</span></h1></div>`;
function girisCiz() {
  cizilenFaz = 'giris';
  ekran.innerHTML = `${BASLIK}
    <p class="soluk">Gizli kelimeyi beş ipucuyla, zordan kolaya duyacaksın. Ne kadar erken bilirsen o kadar çok puan.</p>
    <input id="adGir" placeholder="Adın" maxlength="14" value="${esc(localStorage.getItem('bes-ad') || '')}">
    <button class="ana" id="katil">Katıl</button>`;
  $('#katil').onclick = () => {
    const ad = $('#adGir').value.trim(); if (!ad) return $('#adGir').focus();
    sesiAc(); localStorage.setItem('bes-ad', ad); gonder({ t: 'katil', id: benimId, ad });
  };
}

let gorulen = new Set();
const cipler = () => d.oyuncular.map((o) => `<div class="cip ${d.faz === 'lobi' && !gorulen.has(o.id) ? 'yeni' : ''} ${o.bildi != null ? 'bildi' : ''} ${o.bagli ? '' : 'kopuk'}"><i style="background:${o.renk}">${esc(o.ad[0].toLocaleUpperCase('tr'))}</i>${esc(o.ad)}${o.donmus ? ' 🥶' : ''}${o.bildi != null ? ' ✓' : ''} <b>${o.puan}</b></div>`).join('');

// lobide renk seçimi: her oyuncunun rengi oyun boyunca karakterini izler; başkasının aldığı renk kapalı
function renkSecici() {
  const ben = d.oyuncular.find((o) => o.id === benimId);
  return `<div class="kart"><h2>Rengin</h2><div class="renk-sec">${(d.renkler || []).map((r) => {
    const sahip = d.oyuncular.find((o) => o.renk === r), benim = ben && ben.renk === r;
    return `<button data-renk="${r}" style="--r:${r}" class="${benim ? 'secili' : ''}" ${sahip && !benim ? 'disabled' : ''}>${sahip && !benim ? esc(sahip.ad[0].toLocaleUpperCase('tr')) : ''}</button>`;
  }).join('')}</div></div>`;
}

function lobiCiz() {
  const yeniler = d.oyuncular.filter((o) => !gorulen.has(o.id));
  if (gorulen.size && yeniler.length) efekt('kutuphane/arayuz/confirmation_001');
  setTimeout(() => d.oyuncular.forEach((o) => gorulen.add(o.id)), 0);
  const host = d.host === benimId, a = d.ayar, maks = a.kelime / 5;
  ekran.innerHTML = `${BASLIK}
    <div class="kart"><h2>Oyuncular</h2><div class="oyuncular">${cipler()}</div></div>
    ${renkSecici()}
    ${host ? `<div class="kart"><h2>Kaç kelime?</h2><div class="secim" id="kelime">${[10, 20, 50, 100].map((k) => `<button data-k="${k}" class="${a.kelime === k ? 'secili' : ''}">${k}</button>`).join('')}</div></div>
    <div class="kart"><h2>Mini oyunlar</h2>
      ${d.minilerVar.length ? `<p class="soluk">Tikliler oyunda çıkar. Test et, oyunu üç botla hemen açar.</p>
      <div class="mini-liste" id="miniler">${d.minilerVar.map((m) => { const s = a.miniler.includes(m.ad), b = MINI_TANITIM[m.ad] || {};
        return `<div class="mini-satir ${s ? 'secili' : ''}"><button class="tik" data-m="${m.ad}" aria-pressed="${s}">${s ? '✓' : ''}</button>
          <div class="mini-isim" data-m="${m.ad}" role="button"><span class="mini-ikon">${b.ikon || '🎮'}</span><span class="mini-baslik">${m.baslik}</span></div><button class="test-et" data-dene="${m.ad}">▶ Test et</button></div>`; }).join('')}</div>
      <p class="soluk">Kaç mini oyun? (en fazla ${maks})</p>
      <div class="satir"><button id="eksi">−</button><div style="flex:1;text-align:center;font-size:24px;font-weight:800">${a.miniSayi}</div><button id="arti">+</button></div>
`
      : '<p class="soluk">Henüz mini oyun yok.</p>'}
    </div>
    <button class="ana" id="basla">Başlat</button>
    <p class="soluk">Sette ${d.kalanKelime} oynanmamış kelime var.</p>`
    : `<div class="kart"><p>${a.kelime} kelime, ${a.miniSayi} mini oyun.</p><p class="soluk">Oyunu ${esc(d.oyuncular.find((o) => o.id === d.host)?.ad || 'kurucu')} başlatacak.</p><button id="kurucuOl" style="width:100%;margin-top:6px">👑 Kurucu ben olayım</button></div>`}`;
  ekran.querySelectorAll('[data-renk]').forEach((b) => (b.onclick = () => { if (!b.disabled) { gonder({ t: 'renk', renk: b.dataset.renk }); efekt('kutuphane/arayuz/select_002'); } }));
  if (!host) { const k = $('#kurucuOl'); if (k) k.onclick = () => gonder({ t: 'kurucuOl' }); return; }
  const ayarla = (y) => gonder({ t: 'ayar', ...a, ...y });
  ekran.querySelectorAll('#kelime button').forEach((b) => (b.onclick = () => ayarla({ kelime: +b.dataset.k, miniSayi: Math.min(a.miniSayi, +b.dataset.k / 5) })));
  ekran.querySelectorAll('#miniler [data-m]').forEach((b) => (b.onclick = () => {
    const m = b.dataset.m, liste = a.miniler.includes(m) ? a.miniler.filter((x) => x !== m) : [...a.miniler, m];
    ayarla({ miniler: liste, miniSayi: liste.length ? Math.max(a.miniSayi, 1) : 0 });
  }));
  ekran.querySelectorAll('[data-dene]').forEach((b) => (b.onclick = () => { sesiAc(); b.disabled = true; b.textContent = '🤖 Botlar geliyor…'; gonder({ t: 'miniDene', ad: b.dataset.dene, bot: true }); }));
  if ($('#eksi')) $('#eksi').onclick = () => ayarla({ miniSayi: Math.max(a.miniler.length ? 1 : 0, a.miniSayi - 1) });
  if ($('#arti')) $('#arti').onclick = () => a.miniler.length && ayarla({ miniSayi: Math.min(maks, a.miniSayi + 1) });
  $('#basla').onclick = () => { sesiAc(); gonder({ t: 'basla' }); };
}

// tur ekranı: her şey üstte sıkışık bir blokta durur, klavye açılınca da harfler ve puan görünür
let yanlislar = [], sonTahmin = '';
const JOKER_SIMGE = { kalkan: '🛡️', cift: '<b class="yazi">×2</b>', harf: '🔤', dondur: '🥶' };
const JOKER_ISIM = { kalkan: 'Kalkan', cift: 'Çift puan', harf: 'İlk harf', dondur: 'Dondur' };
function turIskelet() {
  yanlislar = [];
  ekran.innerHTML = `<div class="tur">
    <div class="tur-ust"><div class="yazi tur-no" id="turNo"></div><div class="kisiler" id="oyuncular"></div></div>
    <div class="cubuk"><div id="cubuk"></div></div>
    <div class="tur-ana"><div class="sayac yazi" id="tavan"></div><div class="harfler" id="harfler"></div></div>
    <div class="ipucu-balon" id="ipuclari"></div>
    <div class="jokerler" id="jokerler"></div>
    <div class="kutu" id="kutu"><input id="tahmin" placeholder="Tahminin" enterkeyhint="send" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button class="ana" id="gonder">↵</button></div>
    <div class="yanlislar" id="yanlislar"></div>
    <div class="buz" id="buz"><div class="buz-ikon">🥶</div><div class="yazi buz-yazi"><span id="buzKim"></span><br>SENİ DONDURDU</div><div class="yazi buz-sayac" id="buzSayac"></div></div></div>`;
  const yolla = () => { const v = $('#tahmin').value.trim(); if (v) { sonTahmin = v; gonder({ t: 'tahmin', metin: v }); } $('#tahmin').value = ''; $('#tahmin').focus(); };
  $('#gonder').onclick = yolla;
  $('#tahmin').onkeydown = (e) => { if (e.key === 'Enter') yolla(); };
}

// yanlış tahmin: puan sayacı kırmızı yanıp sarsılır, üstünden −10 uçar (kalkan varsa mavi, hasar yok)
function hasar(kalkan) {
  yanlislar.push({ metin: sonTahmin, kalkan });
  const s = $('#tavan'); if (!s) return;
  s.classList.remove('hasar', 'kalkanli'); void s.offsetWidth; s.classList.add(kalkan ? 'kalkanli' : 'hasar');
  const u = document.createElement('div'); u.className = 'hasar-sayi yazi' + (kalkan ? ' mavi' : ''); u.textContent = kalkan ? '🛡️ 0' : '−10';
  s.appendChild(u); setTimeout(() => u.remove(), 900);
  $('#yanlislar').innerHTML = yanlislar.map((y) => `<span><s>${esc(y.metin)}</s><em>${y.kalkan ? '🛡️ −0' : '−10'}</em></span>`).join('');
}

// yalnız değiştiyse yaz: canlandırmalar her güncellemede baştan başlamasın
const yaz = (s, h) => { const e = $(s); if (e && e._h !== h) { e._h = h; e.innerHTML = h; } };
function turGuncelle() {
  const t = d.tur, e = d.ben.etki;
  $('#turNo').innerHTML = `${d.turNo}<small> / ${d.toplam}</small>`;
  // ipuçları yalnız sesle gelir: tek balon, kaçıncısının çaldığı ve beş nokta
  const no = Math.max(1, t.ipucuNo), calan = d.faz === 'tur' && t.ipucuNo > 0;
  $('#ipuclari').className = 'ipucu-balon' + (calan ? ' caliyor' : '');
  yaz('#ipuclari', `<div class="yazi n">${no}<small>/5</small></div>${DALGA(14)}<div class="noktalar">${[1, 2, 3, 4, 5].map((n) => `<u class="${n <= t.ipucuNo ? 'c' : ''}"></u>`).join('')}</div>`);
  const n = t.uzunluk, boy = n > 11 ? 14 : n > 8 ? 17 : 22;
  $('#harfler').style.fontSize = boy + 'px';
  if (d.faz === 'tur') $('#harfler').innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i === 0 && t.ilkHarf ? 'acik' : ''}">${i === 0 && t.ilkHarf ? t.ilkHarf : '?'}</span>`).join('');
  // oyuncular üstte yuvarlak: bilen yeşil tikli, donan buzlu, kopan soluk
  yaz('#oyuncular', d.oyuncular.map((o) => `<div class="kisi ${o.bildi != null ? 'bildi' : ''} ${o.id === benimId ? 'ben' : ''} ${o.bagli ? '' : 'kopuk'}"><i style="background:${o.renk}">${esc(o.ad[0].toLocaleUpperCase('tr'))}${o.donmus ? '<em>🥶</em>' : ''}</i><b>${o.puan}</b></div>`).join(''));
  // eldeki jokerler: türüne göre gruplanmış, adı üstünde yazan çıkartmalar
  const say = {}; d.ben.jokerler.forEach((j) => (say[j] = (say[j] || 0) + 1));
  if ($('#jokerler').dataset.secim) return; // dondurulacak kişi seçiliyorsa dokunma
  yaz('#jokerler', Object.entries(say).map(([j, k], i) => `<button class="joker-cik" data-j="${j}" style="--r:${i % 2 ? 2 : -2}deg"><span class="simge">${JOKER_SIMGE[j]}</span>${JOKER_ISIM[j]}${k > 1 ? `<span class="x">${k}</span>` : ''}</button>`).join(''));
  ekran.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => jokerKullan(b.dataset.j)));
  const bildin = !!t.bildin, kapali = bildin || d.faz !== 'tur';
  $('#tahmin').disabled = kapali; $('#gonder').disabled = kapali;
  $('#tahmin').placeholder = bildin ? `Bildin: +${t.bildin.puan}` : 'Tahminin';
  if (d.faz === 'turSonu' && !$('#harfler').dataset.cevap) {
    $('#harfler').dataset.cevap = 1;
    const c = [...t.cevap.toLocaleUpperCase('tr')];
    $('#harfler').style.fontSize = (c.length > 11 ? 14 : c.length > 8 ? 17 : 22) + 'px';
    $('#harfler').innerHTML = c.map((h, i) => `<span class="acik don" style="animation-delay:${i * 90}ms">${esc(h)}</span>`).join('');
    $('#tavan').classList.add('soluk-tavan');
  }
}

function jokerKullan(j) {
  if (j !== 'dondur') return gonder({ t: 'joker', tur: j });
  const rakipler = d.oyuncular.filter((o) => o.id !== benimId);
  if (!rakipler.length) return bildir('Dondurulacak rakip yok');
  const kutu = $('#jokerler');
  kutu._h = null; kutu.dataset.secim = 1;
  kutu.innerHTML = rakipler.map((o) => `<button class="joker-cik" data-h="${o.id}" style="box-shadow:0 4px 0 #0008, inset 0 0 0 3px ${o.renk}"><span class="simge">🥶</span>${esc(o.ad)}</button>`).join('') + '<button class="joker-cik" id="vazgec">✕</button>';
  kutu.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => { delete kutu.dataset.secim; gonder({ t: 'joker', tur: 'dondur', hedef: b.dataset.h }); }));
  $('#vazgec').onclick = () => { delete kutu.dataset.secim; turGuncelle(); };
}

// tavan ve süre her karede yerelde hesaplanır
function kare() {
  requestAnimationFrame(kare);
  if (!d || !d.tur || (d.faz !== 'tur' && d.faz !== 'turSonu') || !$('#tavan')) return;
  const t = d.tur, gecen = d.faz === 'tur' ? t.gecenMs + performance.now() - alinanZaman : t.turMs;
  const oran = Math.min(1, gecen / t.turMs);
  $('#cubuk').style.transform = `scaleX(${1 - oran})`;
  // dondurulduysan ekran buz tutar: ortada kimin dondurduğu ve geri sayım, kutu kapalı
  const dz = d.ben.donma, kalanBuz = dz && d.faz === 'tur' ? dz.kalanMs - (performance.now() - alinanZaman) : 0, buz = kalanBuz > 0, k = $('#kutu');
  if (k.classList.contains('donmus') !== buz) {
    k.classList.toggle('donmus', buz); $('#buz').classList.toggle('acik', buz);
    $('#tahmin').disabled = buz || !!t.bildin || d.faz !== 'tur';
    if (buz) { $('#tahmin').blur(); $('#buzKim').textContent = dz.kim.toLocaleUpperCase('tr'); } else if (d.faz === 'tur' && !t.bildin) $('#tahmin').focus();
  }
  if (buz) $('#buzSayac').textContent = Math.ceil(kalanBuz / 1000);
  const carpan = { 1: 1, 2: 1.25, 3: 1.5 }[t.zorluk] * (d.ben.etki.cift > 0 ? 2 : 1);
  const tavan = t.bildin ? t.bildin.puan : Math.max(0, Math.round((100 - oran * 100 - t.ceza) * carpan));
  // sayaç: puan, altında çarpan; köşede etkin jokerler. Uçan hasar yazısı silinmesin diye yalnız sayı değişir
  const sv = $('#tavan');
  if (!sv.firstChild) sv.innerHTML = '<span class="deger"></span><small></small><span class="rozetler"></span>';
  sv.querySelector('.deger').textContent = tavan;
  sv.querySelector('small').textContent = t.bildin ? 'ALDIN' : carpan > 1 ? `PUAN ×${carpan}` : 'PUAN';
  const rz = ['kalkan', 'cift', 'harf'].filter((j) => d.ben.etki[j] > 0).map((j) => `<i>${JOKER_SIMGE[j]}</i>`).join('');
  if (sv.querySelector('.rozetler').innerHTML !== rz) sv.querySelector('.rozetler').innerHTML = rz;
}
requestAnimationFrame(kare);

function miniSonuCiz() {
  const s = d.son, isim = (id) => s.sira.find((x) => x.id === id)?.ad;
  ekran.innerHTML = `<h2>${esc(s.mini)} bitti</h2>
    <div class="kart liste">${s.sira.map((o, i) => `<div><span>${i + 1}. <i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${o.renk}"></i> ${esc(o.ad)}</span><span>${(s.verilen[o.id] || []).map((j) => JOKER_AD[j]).join(' ')}</span></div>`).join('')}</div>
    <p class="soluk">Birinci iki, ikinci bir joker kazandı.</p>`;
  if (s.sira[0]?.id === benimId) { efekt('kazan'); titret(200); konfeti(); }
}

// kapanış: 3D salon (salon.js); WebGL açılmazsa eski 2D kürsü töreni
let salonMod = null;
function bitisCiz() {
  import('./salon.js').then((m) => {
    if (d.faz !== 'bitis') return;
    salonMod = m;
    m.kur(ekran, { son: d.son, salon: d.salon, bitisGecen: d.bitisGecen, kim: benimId, host: d.host === benimId, yolla: gonder, lobiye: () => gonder({ t: 'lobiye' }), tekrar: () => gonder({ t: 'basla' }) });
  }).catch((h) => { console.error(h); salonMod?.kapat(); salonMod = null; bitis2D(); });
}
// 2D kürsü töreni: karanlık, trampetle 3., sonra 2. platform yükselir; en uzun trampetten sonra zil ve birinci
let torenZaman = [];
const toren = (f, ms) => torenZaman.push(setTimeout(f, ms));
function bitis2D() {
  torenZaman.forEach(clearTimeout); torenZaman = [];
  const s = d.son.sira, [b1, b2, b3] = s, host = d.host === benimId;
  const basamak = (o, yuk, sira) => o ? `<div class="basamak" id="b${sira}"><div class="kim"><div class="kisi" style="background:${o.renk}">${sira === 1 ? '<span class="tac">👑</span>' : ''}${esc(o.ad[0].toLocaleUpperCase('tr'))}</div>
      <div class="kisi-isim">${esc(o.ad)}</div></div><div class="blok" style="height:${yuk}px;background:linear-gradient(${o.renk}, ${o.renk}aa)">${sira}<small>${o.puan}</small></div></div>` : '<div class="basamak"></div>';
  ekran.innerHTML = `<div class="toren"><div class="spot"></div><div class="buyuk gizli" id="baslik">Sonuçlar…</div>
    <div class="kursu">${basamak(b2, 120, 2)}${basamak(b1, 170, 1)}${basamak(b3, 85, 3)}</div>
    <div id="alt" class="gizli">${s.length > 3 ? `<div class="kart liste">${s.slice(3).map((o, i) => `<div><span>${i + 4}. ${esc(o.ad)}</span><b>${o.puan}</b></div>`).join('')}</div>` : ''}
    ${host ? '<button class="ana" id="tekrar">Yeniden oyna</button><button id="lobi">Ayarlara dön</button>' : ''}</div></div>`;
  if (host) { $('#tekrar').onclick = () => gonder({ t: 'basla' }); $('#lobi').onclick = () => gonder({ t: 'lobiye' }); }
  muzik(false);
  const yuksel = (n) => { const b = $('#b' + n); if (b) b.classList.add('yuksel'); };
  const goster = (n) => { const b = $('#b' + n); if (b) { b.classList.add('belli'); efekt('kutuphane/jingle/jingles_hit0' + (n === 3 ? 2 : 5)); titret(60); } };
  toren(() => $('#baslik').classList.remove('gizli'), 300);
  let t = 900;
  if (b3) { toren(() => { efekt('toren/trampet-kisa'); yuksel(3); }, t); toren(() => goster(3), t + 1650); t += 2600; }
  if (b2) { toren(() => { efekt('toren/trampet-kisa'); yuksel(2); }, t); toren(() => goster(2), t + 1650); t += 2600; }
  toren(() => { $('#baslik').textContent = 'Ve birinci…'; efekt('toren/trampet-zil'); yuksel(1); $('.toren').classList.add('gerilim'); }, t);
  toren(() => {
    goster(1); $('.toren').classList.remove('gerilim'); $('.toren').classList.add('patla');
    $('#baslik').textContent = `${b1.ad} Kazandı!`; $('#baslik').classList.add('kazandi');
    efekt('kazan'); konfeti();
    if (b1.id === benimId) { titret([200, 100, 200]); bildir('Kazandın!'); }
  }, t + 3650);
  toren(() => $('#alt').classList.remove('gizli'), t + 5200);
}

let aktifMini = null, miniHazir = null, tanitimBitis = 0;
// mini oyun tanıtımı: başlık, canlandırma, nasıl oynanır, hazır olanlar ve Hazırım düğmesi
let tanitimAlinan = 0;
function tanitimCiz() {
  const t = d.tanitim, bilgi = MINI_TANITIM[t.ad] || { ikon: '🎮', baslik: t.ad, satir: [] }, benHazir = t.hazir.includes(benimId);
  tanitimAlinan = performance.now();
  if (cizilenFaz !== 'miniTanitim' || ekran.dataset.tanitim !== t.ad) {
    cizilenFaz = 'miniTanitim'; ekran.dataset.tanitim = t.ad;
    ekran.innerHTML = `<div class="tanitim-sayfa">
      <div class="tanitim-ust">Sıradaki mini oyun</div>
      <div class="tanitim-bas"><span class="tanitim-ikon">${bilgi.ikon}</span><h1 class="yazi tanitim-baslik">${bilgi.baslik}</h1></div>
      ${MINI_DEMO && MINI_DEMO[t.ad] ? MINI_DEMO[t.ad] : ''}
      <div class="tanitim-satirlar">${bilgi.satir.map((x, i) => `<div class="tanitim-balon" style="animation-delay:${0.15 + i * 0.25}s"><b>${i + 1}</b>${x}</div>`).join('')}</div>
      <div class="tanitim-hazirlar" id="hazirlar"></div>
      <button class="ana tanitim-dugme" id="hazirim">Hazırım!</button>
      <div class="tanitim-sure" id="tsure"></div></div>`;
    $('#hazirim').onclick = () => { gonder({ t: 'hazir' }); efekt('kutuphane/arayuz/confirmation_001'); titret(30); };
    efekt('kutuphane/jingle/jingles_nes0' + (Math.random() * 4 | 0));
  }
  $('#hazirlar').innerHTML = d.oyuncular.filter((o) => o.bagli).map((o) => `<div class="cip ${t.hazir.includes(o.id) ? 'hazir' : ''}"><i style="background:${o.renk}">${esc(o.ad[0].toLocaleUpperCase('tr'))}</i>${esc(o.ad)} ${t.hazir.includes(o.id) ? '✓' : '…'}</div>`).join('');
  $('#hazirim').disabled = benHazir; $('#hazirim').textContent = benHazir ? 'Diğerleri bekleniyor…' : 'Hazırım!';
}
// oyun başında yükleme ekranı: ilerleme çubuğu, hazır olanlar ve en geç ne zaman başlayacağı
let yukleme = { n: 0, toplam: 1 }, yuklemeAlinan = 0;
const yuklemeCubuk = () => { const c = $('#ycubuk'); if (c) c.style.transform = `scaleX(${Math.min(1, yukleme.n / (yukleme.toplam || 1))})`; };
function yuklemeCiz() {
  const y = d.yukleme; yuklemeAlinan = performance.now();
  if (cizilenFaz !== 'yukleme') {
    cizilenFaz = 'yukleme';
    ekran.innerHTML = `<div class="tanitim-sayfa yukleme-sayfa">
      <div class="tanitim-ust">Oyun hazırlanıyor</div>
      <div class="tanitim-bas"><span class="tanitim-ikon">🎧</span><h1 class="yazi tanitim-baslik">Sesler iniyor</h1></div>
      <div class="tanitim-balon">İpuçları herkeste aynı anda çalsın diye sesler önceden telefonuna indiriliyor.</div>
      <div class="cubuk yukleme-cubuk"><div id="ycubuk" style="transform:scaleX(0)"></div></div>
      <div class="tanitim-hazirlar" id="yhazir"></div>
      <div class="tanitim-sure" id="ysure"></div></div>`;
  }
  yuklemeCubuk();
  $('#yhazir').innerHTML = d.oyuncular.filter((o) => o.bagli).map((o) => `<div class="cip ${y.hazir.includes(o.id) ? 'hazir' : ''}"><i style="background:${o.renk}">${esc(o.ad[0].toLocaleUpperCase('tr'))}</i>${esc(o.ad)} ${y.hazir.includes(o.id) ? '✓' : '…'}</div>`).join('');
}
setInterval(() => { if (d && d.faz === 'yukleme' && $('#ysure')) $('#ysure').textContent = `En geç ${Math.max(0, Math.ceil((d.yukleme.kalanMs - (performance.now() - yuklemeAlinan)) / 1000))} saniye içinde başlar`; }, 250);
// tanıtımın kalan süresi
setInterval(() => { if (d && d.faz === 'miniTanitim' && $('#tsure')) $('#tsure').textContent = `En geç ${Math.max(0, Math.ceil((d.tanitim.kalanMs - (performance.now() - tanitimAlinan)) / 1000))} saniye içinde başlar`; }, 250);
// tanıtım ekranı: mini oyunun geri sayımının son 3 saniyesine kadar görünür
function tanitimAyarla(ad) {
  const g = d.mini.gecenMs, kalan = -g - 3000;
  if (kalan <= 0 || document.querySelector('.tanitim') || !MINI_TANITIM[ad]) return;
  const t = MINI_TANITIM[ad], el = document.createElement('div');
  tanitimBitis = performance.now() + kalan;
  el.className = 'tanitim';
  el.innerHTML = `<div class="tanitim-ikon">${t.ikon}</div><div class="tanitim-ust">Sıradaki mini oyun</div><h1 class="yazi tanitim-baslik">${t.baslik}</h1>
    <div class="tanitim-satirlar">${t.satir.map((x, i) => `<div class="tanitim-balon" style="animation-delay:${0.5 + i * 0.6}s"><b>${i + 1}</b>${x}</div>`).join('')}</div>
    <div class="tanitim-hazir"><span>Hazırlan…</span><div class="cubuk"><div style="animation-duration:${kalan}ms"></div></div></div>`;
  document.body.appendChild(el);
  efekt('kutuphane/jingle/jingles_nes0' + (Math.random() * 4 | 0));
  setTimeout(() => { el.classList.add('cik'); setTimeout(() => el.remove(), 350); }, kalan);
}
async function miniCiz() {
  const ad = d.mini.ad;
  // dosya inerken gelen güncellemeler aynı yüklemeyi bekler
  if (aktifMini !== ad) {
    aktifMini = ad; ekran.innerHTML = '<div class="mini-alan" id="mini"></div>';
    miniHazir = yukle(ad).then(() => MINI[ad].kur($('#mini'), (v) => gonder({ t: 'mini', ...v }), () => benimId));
  }
  await miniHazir;
  if (aktifMini === ad && d.mini) { MINI[ad].guncelle(d); tanitimAyarla(ad); }
}

function ciz() {
  if (!d.ben) return girisCiz();
  if (d.faz !== 'bitis') { torenZaman.forEach(clearTimeout); torenZaman = []; if (salonMod) { salonMod.kapat(); salonMod = null; } }
  muzik(d.faz === 'lobi');
  $('#muzikDugme').style.display = d.faz === 'lobi' ? '' : 'none';
  if (d.faz !== 'mini' && aktifMini) { MINI[aktifMini]?.kapat?.(); aktifMini = null; document.querySelector('.tanitim')?.remove(); }
  const faz = d.faz;
  if (faz === 'lobi') { cizilenFaz = faz; return lobiCiz(); }
  if (faz === 'tur' || faz === 'turSonu') {
    if (cizilenFaz !== 'tur' || $('#turNo').dataset.no != d.turNo) { turIskelet(); $('#turNo').dataset.no = d.turNo; if (faz === 'tur') setTimeout(() => $('#tahmin')?.focus(), 50); }
    cizilenFaz = 'tur'; return turGuncelle();
  }
  if (faz === 'yukleme') return yuklemeCiz();
  if (faz === 'miniTanitim') return tanitimCiz();
  if (faz === 'mini') { cizilenFaz = faz; return miniCiz(); }
  if (faz === 'miniSonu' && cizilenFaz !== faz) { cizilenFaz = faz; return miniSonuCiz(); }
  if (faz === 'bitis' && cizilenFaz !== faz) { cizilenFaz = faz; return bitisCiz(); }
}

// konfeti
function konfeti() {
  const c = $('#konfeti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const renk = ['#ffcf4a', '#ff5d5d', '#4fb3ff', '#5ee07a', '#c77dff'];
  const p = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height, v: 2 + Math.random() * 3, a: Math.random() * 6, r: renk[Math.random() * 5 | 0] }));
  let n = 0;
  (function ad() {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach((q) => { q.y += q.v; q.a += 0.1; x.fillStyle = q.r; x.save(); x.translate(q.x + Math.sin(q.a) * 10, q.y); x.rotate(q.a); x.fillRect(-4, -2, 8, 4); x.restore(); });
    if (++n < 260) requestAnimationFrame(ad); else x.clearRect(0, 0, c.width, c.height);
  })();
}

document.addEventListener('pointerdown', sesiAc, { once: true });

// müzik düğmesi
const md = $('#muzikDugme');
const mdGuncelle = () => { md.textContent = muzikIzni ? '🎵' : '🔇'; };
md.onclick = () => { muzikIzni = !muzikIzni; localStorage.setItem('bes-muzik', muzikIzni ? '1' : '0'); mdGuncelle(); muzik(d && d.faz === 'lobi'); };
mdGuncelle();

// arka planda süzülen harfler; dokunulan harf patlar
(function arkaPlan() {
  const c = $('#arka'), x = c.getContext('2d'), HARF = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ?';
  const renk = ['#ffcf4a', '#ff5d5d', '#4fb3ff', '#5ee07a', '#c77dff'];
  let harfler = [], parca = [];
  const yeni = (y) => ({ h: HARF[Math.random() * HARF.length | 0], x: Math.random() * innerWidth, y: y ?? innerHeight + 40, v: 0.25 + Math.random() * 0.6, b: 18 + Math.random() * 26, a: Math.random() * 6, r: renk[Math.random() * 5 | 0] });
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const boyut = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0); };
  addEventListener('resize', boyut); boyut();
  for (let i = 0; i < 22; i++) harfler.push(yeni(Math.random() * innerHeight));
  addEventListener('pointerdown', (e) => {
    if (!['giris', 'lobi'].includes(cizilenFaz) || e.target.closest('button, input')) return;
    const h = harfler.find((q) => Math.hypot(q.x - e.clientX, q.y - e.clientY) < q.b);
    if (!h) return;
    for (let i = 0; i < 14; i++) parca.push({ x: h.x, y: h.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .7) * 6, o: 1, r: h.r });
    efekt('kutuphane/arayuz/pluck_00' + (1 + (Math.random() * 2 | 0))); titret(15);
    Object.assign(h, yeni());
  });
  (function kare() {
    requestAnimationFrame(kare);
    if (!['giris', 'lobi'].includes(cizilenFaz)) { x.clearRect(0, 0, innerWidth, innerHeight); return; }
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const h of harfler) {
      h.y -= h.v; h.a += 0.01; if (h.y < -40) Object.assign(h, yeni());
      x.save(); x.translate(h.x + Math.sin(h.a) * 12, h.y); x.rotate(Math.sin(h.a * .7) * .3);
      x.globalAlpha = .22; x.fillStyle = h.r; x.font = `800 ${h.b}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(h.h, 0, 0); x.restore();
    }
    parca = parca.filter((p) => (p.o -= 0.025) > 0);
    for (const p of parca) { p.x += p.vx; p.y += p.vy; p.vy += 0.2; x.globalAlpha = p.o; x.fillStyle = p.r; x.fillRect(p.x, p.y, 5, 5); }
    x.globalAlpha = 1;
  })();
})();
girisCiz();
baglan();
