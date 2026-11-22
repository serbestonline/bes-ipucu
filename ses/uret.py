# Oyun setindeki bütün ipuçlarını Ahmet sesiyle üretir. Kullanım: pip install edge-tts && python3 ses/uret.py (ffmpeg de gerekir)
# Dosya adı metnin parmak izidir: metni değişen ipucu yeniden üretilir, değişmeyene dokunulmaz.
# Kalıplar (kaliplar.json) oyuna girmediği için burada seslendirilmez.
import json, hashlib, asyncio, subprocess, pathlib, edge_tts

SES = "tr-TR-AhmetNeural"
kok = pathlib.Path(__file__).resolve().parent
hedef = kok / "ahmet"; hedef.mkdir(exist_ok=True)
set_ = json.load(open(kok.parent / "kelimeler" / "set.json"))

ad = lambda metin: hashlib.sha1(f"{SES}|{metin}".encode()).hexdigest()[:16] + ".mp3"
sure = lambda p: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))

async def bir(metin, kilit):
    p = hedef / ad(metin)
    if p.exists() and p.stat().st_size > 0: return
    async with kilit:
        for deneme in range(4):
            try:
                await edge_tts.Communicate(metin, SES).save(str(p)); return
            except Exception as h:
                if deneme == 3: print("HATA", metin, h); p.unlink(missing_ok=True)
                await asyncio.sleep(2 * (deneme + 1))

async def main():
    kilit = asyncio.Semaphore(6)
    metinler = [c for w in set_ for c in w["ipuclari"]]
    await asyncio.gather(*(bir(m, kilit) for m in metinler))
    dizin, uzun = {}, []
    for w in set_:
        dizin[w["kelime"]] = [ad(c) for c in w["ipuclari"]]
        for i, c in enumerate(w["ipuclari"], 1):
            p = hedef / ad(c)
            if p.exists() and (s := sure(p)) > 6: uzun.append(f"{w['kelime']} #{i}: {s:.1f} sn | {c}")
    json.dump(dizin, open(hedef / "dizin.json", "w"), ensure_ascii=False, indent=1)
    # artık kullanılmayan eski dosyaları sil (yalnız bu klasördeki, kendi ürettiğimiz mp3'ler)
    kullanilan = {f for v in dizin.values() for f in v}
    eski = [p for p in hedef.glob("*.mp3") if p.name not in kullanilan]
    for p in eski: p.unlink()
    print(f"{len(metinler)} ipucu, {len(kullanilan)} dosya, {len(eski)} eski dosya silindi")
    print(f"altı saniyeyi aşan: {len(uzun)}"); print("\n".join(uzun))

asyncio.run(main())
