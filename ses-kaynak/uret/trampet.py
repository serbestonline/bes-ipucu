# Trampet gerilimi ve zil sesini sıfırdan üretir (hiçbir kayda dayanmaz, lisans sorunu yok).
# Kullanım: python3 ses-kaynak/uret/trampet.py  -> public/efekt/tören/*.wav, sonra mp3'e çevrilir
import numpy as np, wave, os
SR = 44100; rng = np.random.default_rng(7)
def vurus(guc=1.0):
    t = np.arange(int(SR * 0.12)) / SR
    gurultu = rng.standard_normal(len(t)); gurultu = np.diff(gurultu, prepend=0)  # tiz tel sesi
    govde = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.018)                      # derinin tok sesi
    return guc * (0.55 * gurultu * np.exp(-t / 0.035) + 0.6 * govde)
def rulo(sure, ilk=0.085, son=0.032, bas=0.25, bit=1.0, vurusla_bitir=True):
    x = np.zeros(int(SR * (sure + 0.6))); t = 0.0
    while t < sure:
        oran = t / sure; ara = ilk + (son - ilk) * oran ** 0.7
        v = vurus((bas + (bit - bas) * oran ** 1.5) * (0.85 + 0.3 * rng.random()))
        i = int(t * SR); x[i:i + len(v)] += v[:len(x) - i]; t += ara
    if vurusla_bitir:
        v = vurus(1.6); i = int(sure * SR); x[i:i + len(v)] += v[:len(x) - i]
    return x
def zil(sure=2.2):
    t = np.arange(int(SR * sure)) / SR
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    return 0.9 * n * (np.exp(-t / 0.7) * 0.8 + np.exp(-t / 0.08) * 0.6)
def yaz(ad, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    os.makedirs('public/efekt/toren', exist_ok=True)
    with wave.open(f'public/efekt/toren/{ad}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
yaz('trampet-kisa', rulo(1.6, bas=0.3, bit=0.8))
yaz('trampet-uzun', rulo(3.6, bas=0.2, bit=1.0, vurusla_bitir=False))
yaz('zil', zil())
x = rulo(3.6, bas=0.2, bit=1.0, vurusla_bitir=False); z = zil(); y = np.zeros(len(x) + len(z)); y[:len(x)] += x; y[int(3.6 * SR):int(3.6 * SR) + len(z)] += z * 1.3
yaz('trampet-zil', y)
print('tamam')
