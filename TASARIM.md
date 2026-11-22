# Beş İpucu · tasarım kararları (22 Kasım 2026)

## Oda
- Host Mac'te sunucu, Cloudflare geçici tüneliyle dışarı açılır; oyuncular telefondan girer.
- Oda kurulurken: kelime sayısı (10 / 20 / 50 / 100), mini oyun sayısı (en fazla kelime sayısının beşte biri: 2 / 4 / 10 / 20) ve hangi mini oyunların olacağı seçilir.
- Mini oyunlar eşit tur aralıklarıyla gelir.
- Hangi mini oyunun geleceği seçilenler arasından rastgele belirlenir; sayı seçilen oyun sayısını aşarsa tekrar eder ama aynı oyun art arda gelmez.
- Tünel (sunucu) açık kaldıkça aynı kelime bir daha gelmez.

## Tur
- 30 saniye; 5 ipucu zordan kolaya, 6 saniyede bir, Ahmet sesiyle (ses/ahmet, önceden üretilmiş).
- Her oyuncunun tavanı 100'den başlar, 30. saniyede sıfıra iner (saniyede ~3,33).
- Yanlış tahmin: o oyuncunun tavanından 10 puan.
- Bilen o anki tavanını alır, tahmin hakkı kapanır; tur herkes bilince ya da süre dolunca biter.
- Zorluk çarpanı önerisi: kolay ×1, orta ×1,25, zor ×1,5 (onay bekliyor). Her kelimenin bilinme saniyesi kaydedilir, etiketler sonra veriye göre düzeltilir.

## Jokerler
- Kalkan (yanlışa hasar yok), Çift (puan ×2), İlk harf, Dondur (seçilen rakip kullanıldığı andan itibaren 15 saniye tahmin yazamaz, ekranı buz tutar).
- Kullanılınca 3 tur etkili.
- Her mini oyundan sonra 1.'ye 2, 2.'ye 1 rastgele joker; diğerlerine yok. Elde en fazla 3 joker, fazlası gelirse en eskisi düşer.

## Mini oyunlar
1. Karışık Harfler: 30 saniye, kelimeler arka arkaya gelir, en çok düzelten kazanır. Liste: kelimeler/karma.json (oyun setinden ayrı 500 kelime).
2. Zıpla Eğil: yandan görünüm, alçak engelden zıpla, yüksekten eğil; ekranın üst yarısı zıpla, alt yarısı eğil. Hızlanır. Herkes aynı platformda canlı görünür. En son düşen kazanır, 40 saniye sınırı.
3. Çatlak Zemin: kuşbakışı taş zemin, altı lav. Basılan taş çatlayıp düşer. Serbest hareket; itme yok, çarpışınca ikisi de geri savrulur ve 1 saniye sersemler. 1 dakika. Düşmeyen son kişi kazanır.
4. Işık İzi: kuşbakışı, herkes ilerler ve iz bırakır; sol yarı basılı tut sola, sağ yarı sağa. İze ya da duvara çarpan elenir, ayakta kalanlar puan alır, arena dolunca yeni el. 60 saniye.
5. Ritim Dizisi: sırayla tuşlar belirir, diziyi doğru ve hızlı giren puan alır; telefonda dört büyük tuş.
6. Kule: herkesin kendi şeridi, yukarıdan tetris benzeri parçalar düşer; sağ, sol, döndür, bırak tuşları. Satır silinmez, kareli düzen, fizik yok. 60 saniye, en yüksek kule kazanır; rakiplerin kuleleri yan şeritlerde canlı görünür.
- Liste kapandı.
- Sonraki sürüme: Kanyon Uçuşu (2D, halka toplama), kuşbakışı atışlı arena.

## Kapanış ekranı
- Basamaklı kürsü: ortada 1., solunda 2., sağında 3.; diğerleri önde zeminde. Taç, konfeti, "X Kazandı!", zafer müziği, kazananın telefonu titrer.
- Herkes sahnede dolaşıp birbirine yumruk atabilir (sanal kol + yumruk düğmesi); sıralama değişmez.
- "Yeniden oyna": oynanmış kelimeler yine gelmez.

## Teknik
- Canlı mini oyunlar ve kapanış için WebSocket; tünelden geçmezse saniyede 5 sorgulama.
- Çarpışma ve süre her telefonda yerel ölçülür; ortak durum (zemin, izler) sunucuda.
