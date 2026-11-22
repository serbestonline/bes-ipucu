# Carbon raporundaki önerileri ilgili parçaya uygular. Kullanım: python3 uygula.py parca-01.json [--yaz]
# --yaz olmadan yalnız ne yapacağını gösterir. elle.json'daki {kelime: {no: cümle}} el düzeltmeleri önceliklidir;
# elle.json'da cümle yerine "" yazılırsa o öneri reddedilir.
import json, sys, os

tr = str.maketrans("İIıÇĞÖŞÜçğöşüÂâ", "iiicgosucgosuaa")
norm = lambda s: s.translate(tr).lower()

parca = sys.argv[1]; yaz = "--yaz" in sys.argv
rapor = f"carbon-{parca[:-5]}.txt"
elle = json.load(open("elle.json")) if os.path.exists("elle.json") else {}
d = json.load(open(parca))
dizin = {norm(e[0]): e for e in d["kelimeler"]}

def gecerli(kelime, c):
    return c and len(c.split()) <= 12 and not any(ch.isdigit() for ch in c) and norm(kelime)[:4] not in norm(c)

uygulanan, atlanan = 0, []
for satir in open(rapor):
    p = [x.strip() for x in satir.split("|")]
    if len(p) != 4 or not p[1].strip("# .").isdigit(): continue
    kelime, no, sorun, oneri = p[0], int(p[1].strip("# .")), p[2], p[3].strip('"')
    e = dizin.get(norm(kelime))
    if not e or not 1 <= no <= 5: atlanan.append(f"bulunamadı: {kelime} #{no}"); continue
    el = elle.get(e[0], {}).get(str(no))
    if el is not None:
        if el == "": continue
        oneri = el
    elif no <= 4 and ("aynı derecede" in sorun or "uyuyor" in sorun or " uyar" in sorun):
        continue  # erken ipucunun başka cevaba da uyması sorun değil, sonraki ipuçları daraltır
    if not gecerli(e[0], oneri): atlanan.append(f"geçersiz öneri: {e[0]} #{no}: {oneri}"); continue
    print(f"{e[0]} #{no}: {e[2][no-1]}  →  {oneri}")
    e[2][no-1] = oneri; uygulanan += 1

print(f"\n{uygulanan} değişiklik", "yazıldı" if yaz else "(deneme, yazılmadı)")
print("\n".join(atlanan))
if yaz:
    with open(parca, "w") as f:
        f.write('{"kategori":' + json.dumps(d["kategori"], ensure_ascii=False) + ',"kelimeler":[\n')
        f.write(",\n".join(json.dumps(e, ensure_ascii=False) for e in d["kelimeler"]) + "\n]}\n")
