// Mini oyun sırası testi (ağsız): dağılım dengeli, aynı oyun art arda gelmez
const assert = require('assert'), miniSirasi = require('./plan.js');
const HEPSI = ['catlak', 'isik', 'karma', 'kule', 'ritim', 'zipla'];
for (let d = 0; d < 2000; d++) {
  const secili = HEPSI.slice(0, 1 + d % 6), adet = d % 21, sira = miniSirasi(secili, adet);
  assert.strictEqual(sira.length, adet);
  const say = secili.map(a => sira.filter(x => x === a).length);
  assert(Math.max(...say) - Math.min(...say) <= 1, `dengesiz: ${sira}`);
  if (secili.length > 1) sira.forEach((a, i) => assert(a !== sira[i - 1], `art arda: ${sira}`));
}
assert.deepStrictEqual(miniSirasi(HEPSI.slice(0, 5), 10).reduce((s, a) => (s[a] = (s[a] || 0) + 1, s), {}), { catlak: 2, isik: 2, karma: 2, kule: 2, ritim: 2 });
assert.deepStrictEqual(miniSirasi([], 4), []);
console.log('plan testi geçti');
