// Bir HTML animasyonunu görünmez Chrome'da kare kare çeker: node docs/kaydet.js sayfa.html çıktıKlasörü saniye fps genişlik yükseklik
// Animasyon zamanı elle ilerletilir; böylece kareler eşit aralıklı olur ve döngü dikişsiz kapanır.
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), WebSocket = require('ws');
const [sayfa, cikti, sn, fps, W, H] = [path.resolve(process.argv[2]), process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +process.argv[7]];
fs.mkdirSync(cikti, { recursive: true });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9333', `--window-size=${W},${H}`, '--hide-scrollbars', '--user-data-dir=/tmp/kapak-chrome', 'about:blank']);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let hedef; for (let i = 0; i < 40 && !hedef; i++) { await bekle(250); try { hedef = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((x) => x.type === 'page'); } catch {} }
  const ws = new WebSocket(hedef.webSocketDebuggerUrl); await new Promise((r) => ws.on('open', r));
  let no = 0; const bekleyen = {};
  ws.on('message', (m) => { const v = JSON.parse(m); if (v.id && bekleyen[v.id]) { bekleyen[v.id](v.result); delete bekleyen[v.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++no; bekleyen[id] = r; ws.send(JSON.stringify({ id, method, params })); });
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'file://' + sayfa }); await bekle(1500);
  const adet = Math.round(sn * fps);
  for (let f = 0; f < adet; f++) {
    const t = f * 1000 / fps;
    await cdp('Runtime.evaluate', { expression: `document.getAnimations().forEach(a => { a.pause(); a.currentTime = ${t}; }); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    fs.writeFileSync(path.join(cikti, String(f).padStart(4, '0') + '.png'), Buffer.from(data, 'base64'));
  }
  console.log(adet, 'kare çekildi'); ws.close(); chrome.kill(); process.exit(0);
})().catch((h) => { console.error(h); chrome.kill(); process.exit(1); });
