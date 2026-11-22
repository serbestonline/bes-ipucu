// Mini oyun sırası: seçilenler karılıp tur tur dağıtılır. Hepsi oynanmadan hiçbiri tekrar etmez
// (5 oyun seçili, 10 mini oyun varsa her biri tam 2 kez gelir) ve aynı oyun art arda gelmez.
const karistir = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
module.exports = (miniler, adet) => {
  const sira = [];
  let torba = [];
  while (miniler.length && sira.length < adet) {
    if (!torba.length) { torba = karistir([...miniler]); if (torba.length > 1 && torba[0] === sira.at(-1)) torba.push(torba.shift()); }
    sira.push(torba.shift());
  }
  return sira;
};
