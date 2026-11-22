// Karışık Harfler, telefon tarafı: harflere dokunarak ya da yazarak kelimeyi kur.
(() => {
  let alan, gonder, benId, d, alinan, rafId, sonHarf = '';
  const $ = (s) => alan.querySelector(s);
  const ses = (ad) => efektCal(ad, .6); // önceden yüklenmiş Web Audio

  function kur(a, g, kim) {
    alan = a; gonder = g; benId = kim; d = null; sonHarf = '';
    alan.innerHTML = `<div class="ust"><h2>🔀 Karışık Harfler</h2><span class="soluk" id="ks"></span></div>
      <div class="cubuk"><div id="kc"></div></div>
      <div class="geri" id="kg"></div>
      <div class="karma-skor" id="kskor"></div>
      <div class="karma-harf" id="kh"></div>
      <div class="kutu" id="kkutu"><input id="ki" placeholder="Kelimeyi yaz ya da harflere dokun" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button class="ana" id="kgonder">↵</button></div>
      <div class="satir"><button id="ksil" style="flex:1">⌫ Sil</button><button id="kgec" style="flex:1">Geç −1 ⏭</button></div>
      <div class="kart liste" id="ktablo"></div>`;
    const yolla = () => { const v = $('#ki').value.trim(); if (v) gonder({ cevap: v }); };
    $('#kgonder').onclick = yolla;
    $('#ki').onkeydown = (e) => { if (e.key === 'Enter') yolla(); };
    $('#ksil').onclick = () => { $('#ki').value = [...$('#ki').value].slice(0, -1).join(''); harfleriIsaretle(); };
    $('#kgec').onclick = () => { $('#ki').value = ''; gonder({ gec: true }); };
    $('#ki').oninput = harfleriIsaretle;
    kare();
  }

  // yazılan harfler taslarda sönük görünür
  function harfleriIsaretle() {
    const kalan = [...$('#ki').value.toLocaleUpperCase('tr')];
    alan.querySelectorAll('.tas').forEach((t) => {
      const i = kalan.indexOf(t.dataset.h);
      t.classList.toggle('kullanildi', i >= 0); if (i >= 0) kalan.splice(i, 1);
    });
  }

  function guncelle(yeni) {
    d = yeni.mini; alinan = performance.now();
    const anahtar = d.harfler.join('');
    if (anahtar !== sonHarf) {
      sonHarf = anahtar; $('#ki').value = '';
      $('#kh').innerHTML = d.harfler.map((h, i) => `<button class="tas" data-h="${h}" style="animation-delay:${i * 40}ms">${h}</button>`).join('');
      alan.querySelectorAll('.tas').forEach((t) => (t.onclick = () => {
        if (t.classList.contains('kullanildi')) return;
        $('#ki').value += t.dataset.h.toLocaleLowerCase('tr'); harfleriIsaretle(); ses('kutuphane/arayuz/click_002');
        if ([...$('#ki').value].length === d.harfler.length) gonder({ cevap: $('#ki').value });
      }));
    }
    $('#kskor').textContent = d.skor;
    $('#ktablo').innerHTML = d.tablo.map((o, i) => `<div><span>${i + 1}. <i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${o.renk}"></i> ${o.ad}${o.id === benId() ? ' (sen)' : ''}</span><b>${o.skor}</b></div>`).join('');
  }

  function kare() {
    rafId = requestAnimationFrame(kare);
    if (!d) return;
    const g = d.gecenMs + performance.now() - alinan;
    const geri = $('#kg'), oynanir = g >= 0 && g < d.sureMs;
    geri.textContent = g < 0 ? Math.ceil(-g / 1000) : '';
    geri.style.display = g < 0 ? 'block' : 'none';
    $('#kc').style.transform = `scaleX(${g < 0 ? 1 : Math.max(0, 1 - g / d.sureMs)})`;
    $('#ks').textContent = oynanir ? Math.ceil((d.sureMs - g) / 1000) + ' sn' : g >= d.sureMs ? 'bitti' : '';
    $('#ki').disabled = !oynanir; $('#kgec').disabled = !oynanir;
  }

  function mesaj(m) {
    if (m.dogru) { ses('kutuphane/arayuz/confirmation_002'); navigator.vibrate && navigator.vibrate(40); $('#kskor').classList.remove('zip'); void $('#kskor').offsetWidth; $('#kskor').classList.add('zip'); }
    if (m.gecti) { ses('kutuphane/arayuz/drop_002'); const k = $('#kskor'); k.classList.remove('titre'); void k.offsetWidth; k.classList.add('titre'); }
    if (m.yanlis) { ses('kutuphane/arayuz/error_002'); const k = $('#kkutu'); k.classList.remove('titre'); void k.offsetWidth; k.classList.add('titre'); }
  }

  MINI.karma = { kur, guncelle, mesaj, kapat: () => cancelAnimationFrame(rafId) };
})();
