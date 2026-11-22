# Parçaları birleştirir, denetler ve set.json'u yazar. Kullanım: python3 denetle.py
import json, glob, collections

tr = str.maketrans("İIıÇĞÖŞÜçğöşüÂâ", "iiicgosucgosuaa")
norm = lambda s: s.translate(tr).lower()

kaliplar = {norm(w["kelime"]) for w in json.load(open("kaliplar.json"))}
set_, sorun = [], []
for p in sorted(glob.glob("parca-*.json")):
    d = json.load(open(p))
    for e in d["kelimeler"]:
        kelime, zorluk, ip = e[0], e[1], e[2]
        kabul = e[3] if len(e) > 3 else [kelime]
        set_.append({"kelime": kelime, "kabul": kabul, "kategori": d["kategori"], "zorluk": zorluk, "ipuclari": ip})
        if len(ip) != 5: sorun.append(f"{p} {kelime}: {len(ip)} ipucu")
        if zorluk not in (1, 2, 3): sorun.append(f"{p} {kelime}: zorluk {zorluk}")
        if norm(kelime) in kaliplar: sorun.append(f"{p} {kelime}: kalıp kelimesi")
        kok = norm(kelime)[:4]
        for i, c in enumerate(ip, 1):
            n = len(c.split())
            if n > 12: sorun.append(f"{p} {kelime} #{i}: {n} kelime")
            if kok in norm(c): sorun.append(f"{p} {kelime} #{i}: kök '{kok}' -> {c}")
            if any(ch.isdigit() for ch in c): sorun.append(f"{p} {kelime} #{i}: rakam")

say = collections.Counter(norm(w["kelime"]) for w in set_)
sorun += [f"tekrar: {k} x{n}" for k, n in say.items() if n > 1]
print(len(set_), "kelime |", dict(collections.Counter(w["zorluk"] for w in set_)), "|", dict(collections.Counter(w["kategori"] for w in set_)))
print("\n".join(sorun) or "sorun yok")
json.dump(set_, open("set.json", "w"), ensure_ascii=False, indent=1)
