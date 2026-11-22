// Kapanış salonu: oyun bitince herkes 3D bir salonda kendi renginde dolaşır, yumruklaşır, zıplar; birinci tahtın önünde taçla başlar.
// Hareket telefonda hesaplanır ve sunucuya gönderilir; yumruğun kime değdiğine sunucu karar verir (server.js salon()).
import * as THREE from './vendor/three.module.min.js';

const SINIR_X = 9, SINIR_Z = 7, HIZ = 5, ZIPLA = 7.5, YERCEKIMI = 22;
const KURSU = { x: 2.6, z1: -7.6, z2: -5.4, h: .6 }; // tahtın durduğu basamak
const SUTUNLAR = [[-7.5, -5], [7.5, -5], [-7.5, 0], [7.5, 0], [-7.5, 5], [7.5, 5]];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ses = (ad, v = .55) => window.efektCal(ad, v);

let kok, renderer, sahne, kamera, rafId, saat, gonder, benId, kisiler, ben, tus, kol, sonGonder, parca, mesaleler, boyutGozcu, patlar = [], sarsinti = 0;
const VURUS_MENZIL = 1.7; // server.js ile aynı

// zemin yüksekliği: tahtın basamağı yükseltidir, gerisi düz
const zemin = (x, z) => (Math.abs(x) < KURSU.x && z > KURSU.z1 && z < KURSU.z2 ? KURSU.h : 0);
// sütunlar ve tahtın oturağı içinden geçilmez
function engel(x, z, y) {
  for (const [sx, sz] of SUTUNLAR) if (Math.hypot(x - sx, z - sz) < .95) return true;
  if (Math.abs(x) < 1.1 && z < -6.3 && z > -7.6 && y < 2) return true;
  return y < zemin(x, z) - .25; // basamağa yandan yürüyerek çıkılmaz, zıplamak gerekir
}

function damaDoku() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#3a2b52' : '#efe2c6'; x.fillRect(i * 64, j * 64, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(SINIR_X / 2 + 1, SINIR_Z / 2 + 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function yaziDoku(metin, renk, en = 512, boy = 128, font = 64) {
  const c = document.createElement('canvas'); c.width = en; c.height = boy; const x = c.getContext('2d');
  x.font = `italic 900 ${font}px "Arial Black", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineWidth = font / 4; x.strokeStyle = '#14111c'; x.strokeText(metin, en / 2, boy / 2);
  x.fillStyle = renk; x.fillText(metin, en / 2, boy / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const mat = (renk, o = {}) => new THREE.MeshStandardMaterial({ color: renk, roughness: .55, ...o });
const golgeli = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

function salonKur() {
  sahne.background = new THREE.Color('#14111c');
  sahne.fog = new THREE.Fog('#14111c', 22, 40);
  sahne.add(new THREE.HemisphereLight('#c9b8ff', '#2a1f3d', .9));
  const gunes = new THREE.DirectionalLight('#fff1d6', 1.6); gunes.position.set(6, 14, 8); gunes.castShadow = true;
  gunes.shadow.mapSize.set(1024, 1024); Object.assign(gunes.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  sahne.add(gunes);

  const zeminM = new THREE.Mesh(new THREE.PlaneGeometry(SINIR_X * 2 + 4, SINIR_Z * 2 + 4), mat('#fff', { map: damaDoku(), roughness: .35 }));
  zeminM.rotation.x = -Math.PI / 2; zeminM.receiveShadow = true; sahne.add(zeminM);
  // kırmızı halı: girişten tahta, altın kenarlı
  const hali = new THREE.Mesh(new THREE.BoxGeometry(2.4, .03, 12.4), mat('#b3243a', { roughness: .9 })); hali.position.set(0, .015, 1); hali.receiveShadow = true; sahne.add(hali);
  for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, 12.4), mat('#ffcf4a', { metalness: .6, roughness: .3 })); k.position.set(s * 1.2, .02, 1); sahne.add(k); }
  // duvarlar
  const duvarM = mat('#2a2040', { roughness: .9 });
  const arka = new THREE.Mesh(new THREE.BoxGeometry(SINIR_X * 2 + 4, 7, .6), duvarM); arka.position.set(0, 3.5, -SINIR_Z - 1.6); arka.receiveShadow = true; sahne.add(arka);
  for (const s of [-1, 1]) { const y = new THREE.Mesh(new THREE.BoxGeometry(.6, 4, SINIR_Z * 2 + 4), duvarM); y.position.set(s * (SINIR_X + 1.6), 2, 0); y.receiveShadow = true; sahne.add(y); }
  // sütunlar
  const sutunM = mat('#e9dcc4', { roughness: .4 }), altinM = mat('#ffcf4a', { metalness: .7, roughness: .25, emissive: '#3a2a00' });
  for (const [x, z] of SUTUNLAR) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(golgeli(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 5, 16), sutunM))).position.y = 2.5;
    const alt = golgeli(new THREE.Mesh(new THREE.BoxGeometry(1.4, .4, 1.4), sutunM)); alt.position.y = .2; g.add(alt);
    const ust = golgeli(new THREE.Mesh(new THREE.BoxGeometry(1.4, .3, 1.4), altinM)); ust.position.y = 5.1; g.add(ust);
    sahne.add(g);
  }
  // taht: basamak, oturak, yüksek arkalık, altın parıltı
  const basamak = golgeli(new THREE.Mesh(new THREE.BoxGeometry(KURSU.x * 2, KURSU.h, KURSU.z2 - KURSU.z1), mat('#5b2a7a', { roughness: .7 })));
  basamak.position.set(0, KURSU.h / 2, (KURSU.z1 + KURSU.z2) / 2); sahne.add(basamak);
  const taht = new THREE.Group(); taht.position.set(0, KURSU.h, -7);
  const oturak = golgeli(new THREE.Mesh(new THREE.BoxGeometry(2, .7, 1.2), altinM)); oturak.position.y = .35; taht.add(oturak);
  const minder = golgeli(new THREE.Mesh(new THREE.BoxGeometry(1.7, .2, 1), mat('#b3243a'))); minder.position.y = .8; taht.add(minder);
  const arkalik = golgeli(new THREE.Mesh(new THREE.BoxGeometry(2, 3, .3), altinM)); arkalik.position.set(0, 1.9, -.5); taht.add(arkalik);
  const ic = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, .05), mat('#b3243a')); ic.position.set(0, 1.9, -.33); taht.add(ic);
  for (const s of [-1, 1]) { const top = golgeli(new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), altinM)); top.position.set(s * 1, 3.55, -.5); taht.add(top); }
  sahne.add(taht);
  const parilti = new THREE.PointLight('#ffcf4a', 14, 9, 1.6); parilti.position.set(0, 3.2, -5.6); sahne.add(parilti);
  // tahtın çevresinde yükselen altın parçacıklar
  const n = 70, konum = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { konum[i * 3] = (Math.random() - .5) * 5; konum[i * 3 + 1] = Math.random() * 5; konum[i * 3 + 2] = -7 + (Math.random() - .5) * 3; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(konum, 3));
  parca = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffe27a', size: .12, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  sahne.add(parca);
  // arka duvarda meşaleler, titreyen ışık
  mesaleler = [];
  for (const x of [-5.5, 5.5]) {
    const g = new THREE.Group(); g.position.set(x, 2.6, -SINIR_Z - 1.2);
    const sap = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, .9, 8), mat('#5a3a1c')); g.add(sap);
    const alev = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 10), new THREE.MeshBasicMaterial({ color: '#ffb340' })); alev.position.y = .7; g.add(alev);
    const isik = new THREE.PointLight('#ff9a3c', 6, 8, 1.8); isik.position.y = .9; g.add(isik);
    sahne.add(g); mesaleler.push({ alev, isik, faz: Math.random() * 6 });
  }
  // arka duvarda oyuncu renklerinde sancaklar
}

function sancaklar(sira) {
  sira.slice(0, 6).forEach((o, i) => {
    const x = (i - (Math.min(6, sira.length) - 1) / 2) * 2.6; if (Math.abs(x) < 2.2) return; // tahtın arkası boş kalsın
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.4), mat(o.renk, { side: THREE.DoubleSide, roughness: .9 }));
    s.position.set(x, 4.2, -SINIR_Z - 1.28); sahne.add(s);
  });
}

// yuvarlak hatlı karakter: gövde, gözler, eller, ayaklar, ad etiketi; birinciye taç
function karakter(o, birinci) {
  const g = new THREE.Group(), govdeM = mat(o.renk, { roughness: .45 });
  const govde = golgeli(new THREE.Mesh(new THREE.CapsuleGeometry(.48, .55, 6, 16), govdeM)); govde.position.y = .95; g.add(govde);
  const goz = (s) => {
    const ak = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), mat('#fff', { roughness: .2 })); ak.position.set(s * .17, 1.22, .4); ak.scale.z = .6;
    const bebek = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), mat('#14111c')); bebek.position.set(0, 0, .1); ak.add(bebek); return ak;
  };
  g.add(goz(-1), goz(1));
  const el = (s) => { const e = golgeli(new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), govdeM)); e.position.set(s * .58, .85, .1); g.add(e); return e; };
  const ayak = (s) => { const a = golgeli(new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), mat(new THREE.Color(o.renk).multiplyScalar(.6)))); a.scale.set(1, .6, 1.4); a.position.set(s * .22, .1, 0); g.add(a); return a; };
  const k = { o, g, govde, elS: el(-1), elG: el(1), ayakS: ayak(-1), ayakG: ayak(1), x: 0, y: 0, z: 0, r: 0, hx: 0, hy: 0, hz: 0, hr: 0, vx: 0, vy: 0, vz: 0, yumruk: 0, sersem: 0, adim: 0, yurur: 0 };
  if (birinci) {
    const tac = new THREE.Group(), altin = mat('#ffcf4a', { metalness: .8, roughness: .2, emissive: '#5a4000' });
    tac.add(golgeli(new THREE.Mesh(new THREE.CylinderGeometry(.3, .26, .18, 16, 1, true), altin)));
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 6), altin); const a = i / 5 * Math.PI * 2; c.position.set(Math.cos(a) * .27, .17, Math.sin(a) * .27); tac.add(c); }
    tac.position.y = 1.62; g.add(tac); k.tac = tac;
  }
  const etiket = new THREE.Sprite(new THREE.SpriteMaterial({ map: yaziDoku(o.id === benId ? 'Sen' : o.ad, o.id === benId ? '#ffcf4a' : '#fff'), depthTest: false }));
  etiket.scale.set(2, .5, 1); etiket.position.y = birinci ? 2.15 : 1.95; etiket.renderOrder = 2; g.add(etiket);
  // sersemleyince başının üstünde dönen yıldızlar
  const yildiz = new THREE.Group(); yildiz.position.y = 1.7; yildiz.visible = false;
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: yaziDoku('★', '#ffe27a', 128, 128, 100), depthTest: false })); s.scale.set(.35, .35, 1); yildiz.add(s); }
  g.add(yildiz); k.yildiz = yildiz;
  sahne.add(g);
  return k;
}

function animasyon(k, dt, t) {
  k.g.position.set(k.x, k.y, k.z);
  // en kısa yoldan dön
  let fark = k.r - k.g.rotation.y; fark = Math.atan2(Math.sin(fark), Math.cos(fark)); k.g.rotation.y += fark * Math.min(1, dt * 14);
  k.yurur += ((k.hareket ? 1 : 0) - k.yurur) * Math.min(1, dt * 10);
  if (k.hareket) k.adim += dt * 13;
  const sal = Math.sin(k.adim) * k.yurur, havada = k.y > zemin(k.x, k.z) + .05;
  k.govde.position.y = .95 + Math.abs(Math.cos(k.adim)) * .08 * k.yurur;
  k.govde.rotation.z = sal * .08; k.govde.rotation.x = k.sersem > 0 ? Math.sin(t * 20) * .15 : 0;
  k.ayakS.position.z = sal * .22; k.ayakG.position.z = -sal * .22;
  k.ayakS.position.y = k.ayakG.position.y = havada ? .2 : .1;
  k.elS.position.z = .1 - sal * .15;
  // yumruk: sağ el öne fırlar ve geri gelir
  if (k.yumruk > 0) k.yumruk = Math.max(0, k.yumruk - dt);
  const u = k.yumruk > 0 ? Math.sin((1 - k.yumruk / .25) * Math.PI) : 0;
  k.elG.position.set(.58 - u * .4, .85 + u * .15, .1 + sal * .15 + u * .75);
  k.elG.scale.setScalar(1 + u * .5);
  k.yildiz.visible = k.sersem > 0;
  if (k.sersem > 0) k.yildiz.children.forEach((s, i) => { const a = t * 6 + i * 2.09; s.position.set(Math.cos(a) * .4, Math.sin(t * 8 + i) * .05, Math.sin(a) * .4); });
  if (k.tac) k.tac.rotation.y = Math.sin(t * 2) * .1;
}

// kendi karakterim: kol ve tuşlarla, fizik telefonda
function benimFizik(dt) {
  let ix = kol.x + (tus.has('d') || tus.has('arrowright') ? 1 : 0) - (tus.has('a') || tus.has('arrowleft') ? 1 : 0);
  let iz = kol.y + (tus.has('s') || tus.has('arrowdown') ? 1 : 0) - (tus.has('w') || tus.has('arrowup') ? 1 : 0);
  const b = Math.hypot(ix, iz); if (b > 1) { ix /= b; iz /= b; }
  if (ben.sersem > 0) { ben.sersem -= dt; ix = iz = 0; }
  ben.hareket = Math.hypot(ix, iz) > .15;
  if (ben.hareket) ben.r = Math.atan2(ix, iz);
  // savrulma hızı sürtünmeyle söner
  const dx = (ix * HIZ + ben.vx) * dt, dz = (iz * HIZ + ben.vz) * dt;
  const sur = Math.exp(-dt * 5); ben.vx *= sur; ben.vz *= sur;
  const nx = Math.max(-SINIR_X, Math.min(SINIR_X, ben.x + dx)), nz = Math.max(-SINIR_Z, Math.min(SINIR_Z, ben.z + dz));
  if (!engel(nx, ben.z, ben.y)) ben.x = nx; else ben.vx *= -.4;
  if (!engel(ben.x, nz, ben.y)) ben.z = nz; else ben.vz *= -.4;
  ben.vy -= YERCEKIMI * dt; ben.y += ben.vy * dt;
  const zz = zemin(ben.x, ben.z); if (ben.y <= zz) { ben.y = zz; ben.vy = 0; }
}
function zipla() { if (ben.y <= zemin(ben.x, ben.z) + .02 && ben.sersem <= 0) { ben.vy = ZIPLA; ses('kutuphane/dijital/phasejump1', .3); } }
// yumruk: isabet sunucuda kesinleşir ama vuran beklemesin diye etkisi burada hemen gösterilir
function vur() {
  if (ben.yumruk > 0 || ben.sersem > 0) return;
  ben.yumruk = .25; gonder({ t: 'salon', vur: true });
  const ix = Math.sin(ben.r), iz = Math.cos(ben.r); let degdi = false;
  for (const k of Object.values(kisiler)) {
    if (k === ben) continue;
    const dx = k.x - ben.x, dz = k.z - ben.z, u = Math.hypot(dx, dz);
    if (u > VURUS_MENZIL || Math.abs(k.y - ben.y) > 1.2 || (u > .3 && (dx * ix + dz * iz) / u < .35)) continue;
    k.sersem = 1.1; pat(k); degdi = true;
  }
  ses(degdi ? 'kutuphane/arayuz/drop_003' : 'kutuphane/arayuz-b/switch7', degdi ? .8 : .4);
  if (degdi) sarsinti = .12;
}
// isabet yerinde büyüyüp sönen "POW!" yazısı
function pat(k) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: yaziDoku(['POW!', 'BAM!', 'PAT!'][Math.random() * 3 | 0], '#ffcf4a', 256, 128, 72), depthTest: false, transparent: true }));
  s.position.set(k.x, k.y + 1.4, k.z); s.renderOrder = 3; sahne.add(s); patlar.push({ s, z: 0 });
}

function kare() {
  rafId = requestAnimationFrame(kare);
  const dt = Math.min(.05, saat.getDelta()), t = saat.elapsedTime;
  benimFizik(dt);
  const simdi = performance.now();
  if (simdi - sonGonder > 66) { // saniyede ~15 konum
    const imza = [ben.x, ben.y, ben.z, ben.r].map((v) => Math.round(v * 100)).join();
    if (imza !== ben.imza || simdi - sonGonder > 1000) { ben.imza = imza; sonGonder = simdi; gonder({ t: 'salon', k: [ben.x, ben.y, ben.z, ben.r] }); }
  }
  for (const k of Object.values(kisiler)) {
    if (k !== ben) { // diğerleri son gelen konuma yumuşakça kayar
      const a = Math.min(1, dt * 12), ox = k.x, oz = k.z;
      k.x += (k.hx - k.x) * a; k.y += (k.hy - k.y) * a; k.z += (k.hz - k.z) * a; k.r = k.hr;
      k.hareket = Math.hypot(k.x - ox, k.z - oz) > dt * .8;
      if (k.sersem > 0) k.sersem -= dt;
    }
    animasyon(k, dt, t);
  }
  patlar = patlar.filter((p) => { p.z += dt; const b = Math.min(1, p.z * 8); p.s.scale.set(2.2 * b, 1.1 * b, 1); p.s.position.y += dt * .8; p.s.material.opacity = 1 - Math.max(0, p.z - .35) / .3; if (p.z > .65) { sahne.remove(p.s); p.s.material.map.dispose(); p.s.material.dispose(); return false; } return true; });
  // kamera: kendi karakterimi yukarıdan çapraz izler, salonun dışına taşmaz
  const hedef = new THREE.Vector3(Math.max(-5, Math.min(5, ben.x)), 0, Math.max(-4.5, Math.min(5, ben.z)));
  const uzak = kamera.aspect < 1 ? 1.4 : 1;
  kamera.position.lerp(new THREE.Vector3(hedef.x, 10.5 * uzak, hedef.z + 9.5 * uzak), Math.min(1, dt * 3));
  kamera.lookAt(kamera.position.x, 0, kamera.position.z - 9.5 * uzak - .5);
  if (sarsinti > 0) { sarsinti = Math.max(0, sarsinti - dt); kamera.position.x += (Math.random() - .5) * sarsinti * 3; kamera.position.y += (Math.random() - .5) * sarsinti * 3; }
  // parçacıklar ve meşaleler
  const p = parca.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (.4 + (i % 5) * .12); if (y > 5) y = 0; p.setY(i, y); }
  p.needsUpdate = true;
  for (const m of mesaleler) { const f = Math.sin(t * 13 + m.faz) * .5 + Math.sin(t * 7.3 + m.faz * 2) * .5; m.isik.intensity = 5 + f * 1.5; m.alev.scale.set(1 + f * .1, 1 + f * .2, 1 + f * .1); }
  renderer.render(sahne, kamera);
}

function boyutla() {
  const w = kok.clientWidth, h = kok.clientHeight;
  renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.fov = w < h ? 58 : 45; kamera.updateProjectionMatrix();
}

// kol: sol altta sürüklenen sanal joystick
function kolKur(el) {
  const top = el.querySelector('i'); let id = null, cx = 0, cy = 0;
  const birak = () => { id = null; kol.x = kol.y = 0; top.style.transform = ''; };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; hareket(e); });
  const hareket = (e) => {
    if (e.pointerId !== id) return; const R = 46; let dx = e.clientX - cx, dy = e.clientY - cy; const u = Math.hypot(dx, dy);
    if (u > R) { dx *= R / u; dy *= R / u; } kol.x = dx / R; kol.y = dy / R; top.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  el.addEventListener('pointermove', hareket); el.addEventListener('pointerup', birak); el.addEventListener('pointercancel', birak);
}

function istatistikTablosu(sira) {
  const sn = (o) => (o.ist?.bildi ? (o.ist.ms / o.ist.bildi / 1000).toFixed(1) : '–');
  return `<table><tr><th></th><th>Puan</th><th>Bildi</th><th>Ort. sn</th><th>Yanlış</th><th>Mini 1.</th><th>Joker</th><th>🧊</th></tr>
    ${sira.map((o, i) => `<tr><td><i style="background:${o.renk}"></i>${i + 1}. ${esc(o.ad)}</td><td><b>${o.puan}</b></td><td>${o.ist?.bildi ?? 0}</td><td>${sn(o)}</td><td>${o.ist?.yanlis ?? 0}</td><td>${o.ist?.mini ?? 0}</td><td>${o.ist?.joker ?? 0}</td><td>${o.ist?.donduruldu ?? 0}</td></tr>`).join('')}</table>`;
}

// ---- ödül töreni: karanlık yuvarlak sahne, heykel gibi duran oyuncular, ödüller tek tek, en sonda birinci altına döner ----
const GRI = new THREE.Color('#6f6a7c');
const ODULLER = [
  { ikon: '⚡', ad: 'Şimşek', acik: 'En hızlı bilen', deger: (i) => (i.bildi ? -i.ms / i.bildi : null), yaz: (i) => `ortalama ${(i.ms / i.bildi / 1000).toFixed(1)} sn` },
  { ikon: '🎯', ad: 'Keskin Nişancı', acik: 'En çok kelime bilen', deger: (i) => i.bildi || null, yaz: (i) => `${i.bildi} kelime` },
  { ikon: '🎮', ad: 'Mini Oyun Ustası', acik: 'En çok mini oyun kazanan', deger: (i) => i.mini || null, yaz: (i) => `${i.mini} birincilik` },
  { ikon: '🃏', ad: 'Jokerci', acik: 'En çok joker kullanan', deger: (i) => i.joker || null, yaz: (i) => `${i.joker} joker` },
  { ikon: '🤦', ad: 'Sakar Parmak', acik: 'En çok yanlış yazan', deger: (i) => i.yanlis || null, yaz: (i) => `${i.yanlis} yanlış` },
  { ikon: '🧊', ad: 'Buz Kalıbı', acik: 'En çok dondurulan', deger: (i) => i.donduruldu || null, yaz: (i) => `${i.donduruldu} kez donduruldu` },
];
let secenek, torenZaman = [], torenK, spot, isin, kivilcim, kivilcimHiz, spotHedef, tarama = false;
const sonra = (f, ms) => torenZaman.push(setTimeout(f, ms));

// heykel: bütün parçalar griye döner; geri açınca kendi rengi gelir; altın: birinci için
function boya(k, hal) {
  k.g.traverse((m) => {
    if (!m.isMesh || !m.material.color) return;
    const mt = m.material, u = mt.userData; // gövde ile eller aynı malzemeyi paylaşır: asıl renk malzemede saklanır
    u.renk ??= mt.color.clone(); u.metal ??= [mt.metalness, mt.roughness];
    if (hal === 'gri') { mt.color.copy(GRI); mt.metalness = 0; mt.roughness = .95; }
    else if (hal === 'altin') { mt.color.set('#ffcf4a'); mt.metalness = .85; mt.roughness = .22; mt.emissive?.set('#4a3300'); }
    else { mt.color.copy(u.renk); [mt.metalness, mt.roughness] = u.metal; }
  });
}

function torenSahnesi(sira) {
  sahne = new THREE.Scene(); sahne.background = new THREE.Color('#07050c'); sahne.fog = new THREE.Fog('#07050c', 16, 36);
  sahne.add(new THREE.HemisphereLight('#8a78c0', '#1a1428', .9));
  const on = new THREE.DirectionalLight('#b9a8ff', .35); on.position.set(0, 5, 10); sahne.add(on);
  const altin = mat('#ffcf4a', { metalness: .7, roughness: .25, emissive: '#3a2a00' });
  const yuvarlak = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.9, .6, 56), mat('#2a1f3d', { roughness: .5 })); yuvarlak.position.y = -.3; yuvarlak.receiveShadow = true; sahne.add(yuvarlak);
  const halka = new THREE.Mesh(new THREE.TorusGeometry(6.55, .07, 8, 80), altin); halka.rotation.x = Math.PI / 2; sahne.add(halka);
  // arkada basamaklarda oturan heykel seyirciler
  const seyirciM = mat('#3a3548', { roughness: .95 });
  for (let sira2 = 0; sira2 < 3; sira2++) {
    const basamak = new THREE.Mesh(new THREE.BoxGeometry(22, .7, 1.4), mat('#151020')); basamak.position.set(0, sira2 * .7 - .35, -6 - sira2 * 1.4); sahne.add(basamak);
    for (let x = -10; x <= 10; x += 1.25) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(.36, .4, 4, 10), seyirciM);
      s.position.set(x + (sira2 % 2) * .6 + (Math.random() - .5) * .2, sira2 * .7 + .65, -6 - sira2 * 1.4); s.rotation.z = (Math.random() - .5) * .15; sahne.add(s);
    }
  }
  // oyuncular sahnede hafif bir yay çizerek durur; sıra puana göre değil, kimse dizilişten birinciyi anlamasın
  const dizi = sira.slice().sort((a, b) => (a.id < b.id ? -1 : 1)), n = dizi.length;
  torenK = dizi.map((o, i) => {
    const k = karakter(o, o.id === sira[0].id); if (k.tac) k.tac.visible = false;
    k.x = (i - (n - 1) / 2) * 1.35; k.z = -Math.abs(k.x) * .3; k.y = 0; k.r = Math.atan2(-k.x * .3, 10 - k.z); k.g.rotation.y = k.r;
    boya(k, 'gri'); return k;
  });
  // tek bir takip ışığı ve görünen ışık hüzmesi
  spot = new THREE.SpotLight('#fff3d0', 0, 30, .26, .45, 1); spot.position.set(0, 11, 3); spot.castShadow = true; spot.shadow.mapSize.set(512, 512);
  spotHedef = new THREE.Vector3(0, 0, 0); spot.target.position.copy(spotHedef); sahne.add(spot, spot.target);
  const hg = new THREE.ConeGeometry(1.15, 1, 32, 1, true); hg.translate(0, -.5, 0);
  isin = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  isin.position.copy(spot.position); sahne.add(isin);
  // birinci açıklanınca saçılan altın kıvılcımlar
  const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  kivilcim = new THREE.Points(kg, new THREE.PointsMaterial({ color: '#ffe27a', size: .14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); kivilcim.visible = false; sahne.add(kivilcim);
  kivilcimHiz = new Float32Array(120 * 3);
}

function torenKare() {
  rafId = requestAnimationFrame(torenKare);
  const dt = Math.min(.05, saat.getDelta()), t = saat.elapsedTime;
  // herkes sığsın: dar ekranda kamera geri çekilir
  const yarim = (torenK.length - 1) * .675 + 1, uzak = Math.max(8, yarim / (Math.tan(kamera.fov * Math.PI / 360) * kamera.aspect));
  kamera.position.set(Math.sin(t * .15) * .8, 2.4 + uzak * .12, uzak); kamera.lookAt(0, 1.1, 0);
  if (tarama) spotHedef.set(Math.sin(t * 3.1) * torenK.length * .7, 0, Math.cos(t * 2.3) * .6);
  spot.target.position.lerp(spotHedef, Math.min(1, dt * (tarama ? 20 : 6)));
  const yon = spot.target.position.clone().sub(spot.position), boy = yon.length();
  isin.scale.set(1, boy, 1); isin.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), yon.normalize());
  isin.material.opacity += ((spot.intensity > 0 ? .13 : 0) - isin.material.opacity) * Math.min(1, dt * 6);
  for (const k of torenK) {
    k.vy -= YERCEKIMI * dt; k.y = Math.max(0, k.y + k.vy * dt); if (k.y === 0) k.vy = 0;
    animasyon(k, dt, t);
  }
  if (kivilcim.visible) {
    const p = kivilcim.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { kivilcimHiz[i * 3 + 1] -= 9 * dt; p.setXYZ(i, p.getX(i) + kivilcimHiz[i * 3] * dt, p.getY(i) + kivilcimHiz[i * 3 + 1] * dt, p.getZ(i) + kivilcimHiz[i * 3 + 2] * dt); }
    p.needsUpdate = true;
  }
  renderer.render(sahne, kamera);
}

function toren() {
  const sira = secenek.son.sira, katman = kok.querySelector('.sl-katman');
  katman.innerHTML = `<h1 class="yazi tr-baslik" id="trBaslik">ÖDÜL<br><span>TÖRENİ</span></h1><div class="tr-kart gizli" id="trKart"></div><button class="tr-gec" id="trGec">Geç ⏭</button>`;
  const q = (x) => kok.querySelector(x), baslik = (h) => { const b = q('#trBaslik'); b.innerHTML = h; b.classList.remove('vur'); void b.offsetWidth; b.classList.add('vur'); };
  q('#trGec').onclick = salonAc;
  torenSahnesi(sira);
  const kim = (id) => torenK.find((k) => k.o.id === id);
  // ödüller: her birini en iyi değere sahip ilk oyuncu alır, kimse hak etmediyse o ödül atlanır
  const oduller = ODULLER.map((o) => {
    let en = null, ev = null;
    for (const x of sira) { const v = x.ist && o.deger(x.ist); if (v != null && (ev == null || v > ev)) { en = x; ev = v; } }
    return en && { ...o, x: en };
  }).filter(Boolean);
  ses('kutuphane/jingle/jingles_nes03', .5);
  let t = 2200;
  oduller.forEach((o, i) => {
    sonra(() => {
      const k = kim(o.x.id); spotHedef.set(k.x, 0, k.z); spot.intensity = 45;
      boya(k, 'renk'); k.vy = 6;
      const kart = q('#trKart'); kart.innerHTML = `<span>${o.ikon}</span><div><small>${o.acik}</small><b>${o.ad}</b><em style="--c:${o.x.renk}">${esc(o.x.ad)} · ${o.yaz(o.x.ist)}</em></div>`;
      kart.classList.remove('gizli', 'gel'); void kart.offsetWidth; kart.classList.add('gel');
      baslik(`${i + 1}. ödül`); ses('kutuphane/jingle/jingles_hit0' + (i % 8), .55);
    }, t);
    sonra(() => q('#trKart').classList.add('gizli'), t + 2700);
    t += 3000;
  });
  // ve birinci: herkes yeniden heykel olur, ışık trampetle dolaşır, sonra birinciye kilitlenir
  sonra(() => {
    torenK.forEach((k) => boya(k, 'gri')); spot.intensity = 45; tarama = true;
    baslik('Ve birinci…'); ses('toren/trampet-zil', .7);
  }, t);
  sonra(() => {
    tarama = false; const k = kim(sira[0].id); spotHedef.set(k.x, 0, k.z);
    boya(k, 'altin'); if (k.tac) k.tac.visible = true; k.vy = 8;
    baslik(`${esc(sira[0].ad)}<br><span>KAZANDI!</span>`); ses('kazan', .7); navigator.vibrate && sira[0].id === benId && navigator.vibrate([200, 100, 200]);
    const p = kivilcim.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { p.setXYZ(i, k.x, 1.2, k.z); const a = Math.random() * 6.28, h = 2 + Math.random() * 4; kivilcimHiz.set([Math.cos(a) * h, 4 + Math.random() * 6, Math.sin(a) * h * .6], i * 3); }
    kivilcim.visible = true;
    for (let j = 1; j <= 3; j++) sonra(() => { k.vy = 7; }, j * 900);
  }, t + 3650);
  sonra(salonAc, t + 8500);
  tarama = false; cancelAnimationFrame(rafId); torenKare();
}

export function kur(alan, opts) {
  kapat();
  secenek = opts; gonder = opts.yolla; benId = opts.kim;
  kok = document.createElement('div'); kok.className = 'salon';
  kok.innerHTML = '<canvas></canvas><div class="sl-katman"></div>';
  document.body.appendChild(kok);
  // yüksek çözünürlüklü ekranda kenar yumuşatma gereksiz, eski telefonlar için DPR 1.5'te kesilir
  renderer = new THREE.WebGLRenderer({ canvas: kok.querySelector('canvas'), antialias: (devicePixelRatio || 1) <= 1 });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  kamera = new THREE.PerspectiveCamera(50, 1, .1, 80); saat = new THREE.Clock();
  boyutla(); boyutGozcu = new ResizeObserver(boyutla); boyutGozcu.observe(kok);
  // tören yalnız oyunun bittiği anda olanlara gösterilir; sayfayı sonradan açan doğrudan salona girer
  if ((opts.bitisGecen ?? 0) < 2500) toren(); else salonAc(true);
}

function salonAc(dogrudan) {
  if (!kok || kisiler) return;
  torenZaman.forEach(clearTimeout); torenZaman = []; cancelAnimationFrame(rafId);
  const { son, salon: konumlar = {}, host, lobiye, tekrar } = secenek;
  kisiler = {}; tus = new Set(); kol = { x: 0, y: 0 }; sonGonder = 0;
  const sira = son.sira, b1 = sira[0];
  kok.querySelector('.sl-katman').innerHTML = `
    <div class="salon-kazandi ${dogrudan === true ? '' : 'kucul'}"><h1 class="yazi">${esc(b1?.ad || '')}<br><span>KAZANDI!</span></h1></div>
    <div class="salon-ust"><button id="slIst">📊 İstatistikler</button>${host ? '<button class="ana" id="slTekrar">Yeniden oyna</button><button id="slLobi">Ayarlar</button>' : ''}</div>
    <div class="salon-ist gizli" id="slTablo"><div class="kart">${istatistikTablosu(sira)}<button id="slKapat">Kapat</button></div></div>
    <div class="salon-kol"><i></i></div>
    <div class="salon-tuslar"><button id="slZipla">🦘</button><button id="slVur">👊</button></div>`;
  const q = (s) => kok.querySelector(s);
  sahne = new THREE.Scene();
  salonKur(); sancaklar(sira);
  // birinci tahtın önünde, diğerleri halının iki yanında sıralanır
  sira.forEach((o, i) => {
    const k = karakter(o, i === 0); kisiler[o.id] = k;
    const yer = i === 0 ? [0, KURSU.h, -5.9] : [(i % 2 ? -1 : 1) * 2.2, 0, -3 + Math.floor((i - 1) / 2) * 2];
    [k.x, k.y, k.z] = yer; [k.hx, k.hy, k.hz] = yer;
    const c = konumlar[o.id]; if (c) { [k.x, k.y, k.z, k.r] = [c.x, c.y, c.z, c.r]; [k.hx, k.hy, k.hz, k.hr] = [c.x, c.y, c.z, c.r]; }
  });
  ben = kisiler[benId] || karakter({ id: benId, ad: 'Sen', renk: '#ffffff' }, false);
  kisiler[benId] = ben;
  kamera.position.set(ben.x, 12, ben.z + 11);

  kolKur(q('.salon-kol'));
  const basili = (b, f) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); f(); });
  basili(q('#slVur'), vur); basili(q('#slZipla'), zipla);
  kok._bas = (e) => { const k = e.key.toLowerCase(); tus.add(k); if (k === ' ') zipla(); if (k === 'j' || k === 'f') vur(); };
  kok._birak = (e) => tus.delete(e.key.toLowerCase());
  addEventListener('keydown', kok._bas); addEventListener('keyup', kok._birak);
  q('#slIst').onclick = () => q('#slTablo').classList.remove('gizli');
  q('#slKapat').onclick = () => q('#slTablo').classList.add('gizli');
  if (host) { q('#slTekrar').onclick = tekrar; q('#slLobi').onclick = lobiye; }
  if (dogrudan === true) { setTimeout(() => kok?.querySelector('.salon-kazandi')?.classList.add('kucul'), 3200); ses('kazan', .6); }
  kare();
}

export function mesaj(m) {
  if (!kisiler) return;
  if (m.k) {
    const [id, x, y, z, r] = m.k, k = kisiler[id]; if (!k || k === ben) return;
    k.hx = x; k.hy = y; k.hz = z; k.hr = r;
  }
  if (m.vur) {
    const v = kisiler[m.vur], benVurdum = v === ben; if (v && !benVurdum) v.yumruk = .25;
    for (const [id, vx, vz] of m.hedef) {
      const k = kisiler[id]; if (!k) continue;
      if (!benVurdum) { k.sersem = 1.1; pat(k); }
      if (k === ben) { ben.vx = vx; ben.vz = vz; ben.vy = 5; sarsinti = .25; navigator.vibrate && navigator.vibrate(150); }
    }
    if (m.hedef.length && !benVurdum) ses('kutuphane/arayuz/drop_003', .8);
  }
}

export function kapat() {
  torenZaman.forEach(clearTimeout); torenZaman = []; patlar = [];
  if (!kok) return;
  cancelAnimationFrame(rafId); boyutGozcu?.disconnect();
  removeEventListener('keydown', kok._bas); removeEventListener('keyup', kok._birak);
  renderer?.dispose(); renderer = null; kok.remove(); kok = null; kisiler = null;
}
