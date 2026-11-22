# Credits / Kaynaklar

## Sounds / Sesler
Every sound in `public/efekt` is either CC0 (public domain) or was synthesized from scratch for this project.
`public/efekt` içindeki her ses ya CC0 (kamu malı) ya da bu proje için sıfırdan üretildi.

| Files / Dosyalar | Source / Kaynak | License |
|---|---|---|
| `kutuphane/arayuz/` | Kenney, Interface Sounds, https://opengameart.org/content/interface-sounds | CC0 |
| `kutuphane/arayuz-b/` | Kenney, UI Audio, https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks | CC0 |
| `kutuphane/dijital/` | Kenney, Digital Audio, https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc | CC0 |
| `kutuphane/jingle/`, `kazan.mp3`, `sira.mp3`, `tik.mp3`, `sure-bitti.mp3` | Kenney, Music Jingles and Interface Sounds, https://opengameart.org/node/22000 | CC0 |
| `muzik.mp3` | "Vintage Menu" by iamoneabe, https://opengameart.org/content/vintage-menu | CC0 |
| `toren/*`, `muzik/ritim.mp3` | Synthesized for this project / bu proje için sentezlendi (`ses-kaynak/uret/`) | MIT (this repo) |

Details in Turkish: `public/efekt/SESLER.txt`.

## Clue voice / İpucu sesi
Clue audio is not stored in the repo. `ses/uret.py` generates it locally with the Microsoft Edge text-to-speech voice `tr-TR-AhmetNeural` through the [edge-tts](https://github.com/rany2/edge-tts) package.
İpucu sesleri repoda yok; `ses/uret.py` bunları kendi bilgisayarında Microsoft Edge'in `tr-TR-AhmetNeural` sesiyle, [edge-tts](https://github.com/rany2/edge-tts) paketi üzerinden üretir.

## Dictionary / Sözlük
`kelimeler/sozluk.json` is derived from the Turkish dictionary of [Zemberek-NLP](https://github.com/ahmetaa/zemberek-nlp) (Ahmet A. Akın, Mehmet D. Akın), Apache 2.0. See `kelimeler/sozluk/`.

## 3D
[three.js](https://threejs.org), MIT (`public/vendor/THREE-LICENSE.txt`).

## Words and clues / Kelimeler ve ipuçları
The 502 words and 2510 clues in `kelimeler/set.json` were written for this game with the help of AI models and fact-checked; MIT like the rest of the repo.
