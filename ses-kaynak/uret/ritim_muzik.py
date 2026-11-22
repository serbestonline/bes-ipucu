# Ritim Dizisi'nin dans müziğini sıfırdan üretir (hiçbir kayda dayanmaz). 120 BPM, 4/4.
# Yapı: 3 sn giriş (6 vuruş, geri sayım), 40 sn ana bölüm (20 ölçü), 2 sn bitiş zili.
import numpy as np, wave, os
SR = 44100; BPM = 120; VURUS = 60 / BPM; rng = np.random.default_rng(3)
GIRIS, ANA, BITIS = 3.0, 40.0, 2.5
x = np.zeros(int(SR * (GIRIS + ANA + BITIS)))
def ekle(s, t, g=1.0):
    i = int(t * SR); n = min(len(s), len(x) - i)
    if n > 0: x[i:i + n] += g * s[:n]
def kick():
    t = np.arange(int(SR * .28)) / SR; f = 50 + 110 * np.exp(-t / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12)
def snare():
    t = np.arange(int(SR * .18)) / SR
    return .7 * np.diff(rng.standard_normal(len(t)), prepend=0) * np.exp(-t / .05) + .5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / .03)
def hihat(acik=False):
    t = np.arange(int(SR * (.18 if acik else .05))) / SR
    n = np.diff(np.diff(rng.standard_normal(len(t)), prepend=0), prepend=0)
    return .25 * n * np.exp(-t / (.07 if acik else .015))
def nota(frek, sure, tip='bas'):
    t = np.arange(int(SR * sure)) / SR
    if tip == 'bas':
        d = 2 * (t * frek % 1) - 1                      # testere dalgası
        d = np.convolve(d, np.ones(18) / 18, 'same')    # yumuşatma
        return .55 * d * np.minimum(1, t / .01) * np.exp(-t / .35)
    d = sum(np.sin(2 * np.pi * frek * k * t) / k for k in (1, 2, 3))
    return .18 * d * np.minimum(1, t / .005) * np.exp(-t / .12)
hz = lambda n: 440 * 2 ** ((n - 69) / 12)
# giriş: 6 vuruş hihat + son 2'de kick (geri sayım)
for b in range(6):
    ekle(hihat(), b * VURUS, 1.4)
    if b >= 4: ekle(kick(), b * VURUS, .8)
# ana bölüm: Am F C G
akor = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [64, 67, 72]), (55, [67, 71, 74])]
olcu = int(ANA / (4 * VURUS))
for o in range(olcu):
    t0 = GIRIS + o * 4 * VURUS; kok, ust = akor[o % 4]
    yogun = o >= 4
    for b in range(4):
        t = t0 + b * VURUS
        ekle(kick(), t, 1.0)
        if b in (1, 3): ekle(snare(), t, .9 if yogun else .6)
        ekle(hihat(), t + VURUS / 2, 1.0); ekle(hihat(), t, .6)
        if yogun and b == 3: ekle(hihat(True), t + VURUS * .75, .8)
        # bas: sekizlik, kök ve oktav
        for y in range(2): ekle(nota(hz(kok - 12 + (12 if (b * 2 + y) % 4 == 3 else 0)), VURUS / 2, 'bas'), t + y * VURUS / 2, .9)
        # akor vuruşları: arka zamanlarda
        if o >= 2:
            for n in ust: ekle(nota(hz(n), .2, 'akor'), t + VURUS / 2, .8)
# bitiş: kick + açık hihat + çınlayan akor
tb = GIRIS + olcu * 4 * VURUS
ekle(kick(), tb, 1.2); ekle(hihat(True), tb, 2)
for n in (57, 64, 69, 72): ekle(nota(hz(n), 2.0, 'akor') * 2.5, tb)
x = np.tanh(x * 1.3); x = x / np.abs(x).max() * .9
os.makedirs('public/efekt/muzik', exist_ok=True)
with wave.open('public/efekt/muzik/ritim.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print('ölçü', olcu, 'süre', len(x) / SR)
