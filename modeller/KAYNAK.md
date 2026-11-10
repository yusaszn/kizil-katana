# 3D model kaynakları

Hepsi **Quaternius** imzalı, **CC0 (kamu malı)** lisanslı: ücretsiz, ticari kullanım dahil serbest, atıf zorunlu değil.
Poly Pizza üzerinden indirildi; `araclar/modelleri-kucult.mjs` kullanılmayan animasyonları atıp küçültür,
`araclar/modelleri-paketle.py` hepsini `js/modeller-veri.js` içine gömer.

| Dosya | Oyunda | Kaynak |
|---|---|---|
| goblin.glb | Er (grunt) | https://poly.pizza/m/OdCOFSmEhl |
| imp.glb | İblis (imp), kırmızıya boyanır | https://poly.pizza/m/S7jYW6Amye |
| ogre.glb | Kaba (brute) | https://poly.pizza/m/IkB63XOPvr |
| iskelet.glb | Koşucu (runner) | https://poly.pizza/m/wODZYCgX5Z |
| sovalye.glb | Kalkanlı (shielder) | https://poly.pizza/m/DM4QScSmbS |
| sisko.glb | Kamikaze (bomber) | https://poly.pizza/m/22K0aSZkHV |
| yarasa.glb | Uçan (flyer) | https://poly.pizza/m/hNO9XvjlKa |
| kilicli.glb | Cellat | https://poly.pizza/m/yq5ATpujSt |
| cadi.glb | Cadı | https://poly.pizza/m/QBEOV9ZUT8 |
| ork.glb | Kasap (boss), koyu kırmızıya boyanır | https://poly.pizza/m/5vO2YJsPEf |
| seytan.glb | Ateş Lordu | https://poly.pizza/m/LnfIziKv4o |

## El modeli

`el/sag.glb`: WebXR Input Profiles "generic-hand" (MIT Lisansı, © 2019 Amazon). Lisans metni ve ayrıntılar: [el/LISANS.md](el/LISANS.md).

## Oyuncu karakteri

`karakter.glb`: Quaternius "Adventurer" (CC0 1.0, kamu malı), `@netforge/asset-library-files` npm paketindeki
`library/lowpoly/adventurer.glb` kopyasından. `araclar/karakteri-hazirla.mjs` sıkıştırmayı açar, sırt çantasını ve
kullanılmayan animasyonları atar. Gömlek takım rengine boyanır, kollar ters kinematikle silahları tutar (js/karakter.js).

## Kostümler

Oyuncu karakteriyle aynı 62 kemikli iskeleti kullanan Quaternius (CC0 1.0) karakterleri, `@netforge/asset-library-files`
npm paketinden (`library/lowpoly/hooded_adventurer.glb`, `library/lowpoly/monarch.glb`). `araclar/kostumleri-hazirla.mjs`
animasyonları (oyunda karakter.glb'ninkiler kullanılır) ve modele gömülü kılıcı atar. `araclar/modelleri-paketle.py`
kostümleri ayrı `js/kostum-<ad>.js` dosyalarına yazar: açılışta değil, biri o kostümü giyince yüklenir.

| Dosya | Kostüm |
|---|---|
| kostum_kukuleta.glb | Kukuletalı Suikastçı, Çöl Kurdu (renk sürümü) |
| kostum_kral.glb | Kral, Kara Kral (renk sürümü) |


## Canavarlar (Sketchfab)

Sketchfab'dan indirilen, animasyonlu canavarlar. **CC Attribution (CC-BY 4.0)**: kullanım serbest, yapımcının adının
belirtilmesi şart (aşağıdaki tablo bu atıftır). `araclar/canavar-hazirla.mjs` istenen animasyonları kısa adlarla tutar,
dokuları 512 piksel JPEG'e indirir; `araclar/canavarlar.sh` hepsini yeniden üretir. `araclar/modelleri-paketle.py` her
canavarı ayrı `js/canavar-<ad>.js` dosyasına yazar; oyun bunları açılıştan birkaç saniye sonra arka planda yükler.

| Dosya | Oyunda | Model — yapımcı | Lisans | Kaynak |
|---|---|---|---|---|
| canavar_gulyabani.glb | Er (gulyabani) | "Goblin Ghoul" — rodrigobento | CC Attribution | https://sketchfab.com/3d-models/goblin-ghoul-a6c6fffee3d34823b6d87a7054782577 |
| canavar_zombi.glb | Er (zombi) | "Zombie" — pxltiger | CC Attribution | https://sketchfab.com/3d-models/zombie-73ef58af341e46afba1da53366ed79cf |
| canavar_yokai.glb | İblis (ateş topu atan) | "Imp Yokai" — tranb95 | CC Attribution | https://sketchfab.com/3d-models/imp-yokai-21a0bf7fd8064c97ac9798194eab2ebb |
| canavar_tazi.glb | Koşucu (cehennem tazısı) | "Hellhound" — kolbaca | CC Attribution | https://sketchfab.com/3d-models/hellhound-2b661389de024343b17cab26e75c108f |
| canavar_kabus.glb | Koşucu (kâbus) | "Nightmare Creature 1#" — Rodolfoisreal1423 | CC Attribution | https://sketchfab.com/3d-models/nightmare-creature-1-9fb509d207d744babeb5d87a486f7de1 |
| canavar_golem.glb | Kaba (lav golem) | "Drugdör The Golem Animated" — Phons | CC Attribution | https://sketchfab.com/3d-models/drugdor-the-golem-animated-19c1855bdb2c4cdc89da2cfb64da48cf |
| canavar_kurt.glb | Kurtadam (ara boss) | "Werewolf Final" — ZionE | CC Attribution | https://sketchfab.com/3d-models/werewolf-final-2b89eb50883d4f5287b732f697d2d0ca |
| canavar_ejderha.glb | Kemik Ejderi (büyük boss) | "Skeleton Dragon" — LivindorCreation | CC Attribution | https://sketchfab.com/3d-models/skeleton-dragon-0ae92a30d2c242069acd61ed432f6c32 |
| canavar_trol.glb | Dağ Trolü (ara boss) | "Troll" — sjunior3d | CC Attribution | https://sketchfab.com/3d-models/troll-bceb1cb47186457c8571a23e6aff1b8e |
| canavar_ork.glb | Kasap (büyük boss) | "Low-poly orc" — Riltariki | CC Attribution | https://sketchfab.com/3d-models/low-poly-orc-62f1637181cb4f6aa38897f5b7ab5edf |

## Silahlar (Sketchfab)

`araclar/silah-hazirla.mjs` sergileme parçalarını (zemin, stand, kın) atar, yüzeyi sadeleştirir, dokuları küçültür;
`js/silahglb.js` modeli o silahın çizim modelinin yerine oturtur (eller ve namlu alevi kalır). Ayrı `js/silah-<ad>.js`
dosyalarında gelir, ilk gerektiğinde yüklenir.

| Dosya | Oyunda | Model — yapımcı | Lisans | Kaynak |
|---|---|---|---|---|
| silah_katana.glb | Katana | "Dragon katana Oni koroshi" — Sky_Hunter | CC Attribution | https://sketchfab.com/3d-models/dragon-katana-oni-koroshi-778d3dfe4cc549dd93c9bdc5ad78a420 |
| silah_makarov.glb | USP-S (susturuculu tabanca) | "Makarov PM" — TinoD2 | CC Attribution | https://sketchfab.com/3d-models/makarov-pm-dbf03ce95c834cb7b07edba799dcd46a |
| silah_dokuzmm.glb | Tabanca | "9 mm" — reijin | Sketchfab Free Standard (oyunda kullanım serbest, tek başına dağıtılamaz) | https://sketchfab.com/3d-models/9-mm-5124e7fe60fb4d3ab62460609d23f365 |
| silah_ak12.glb | AK-47 (AK-12 görünümü) | "AK-12" — rwroclav | CC Attribution | https://sketchfab.com/3d-models/ak-12-f78ad7ae10ad4335b3ad81be3ec15bb0 |
| silah_karambit.glb | Karambit | "Karambit" — Diamonddogkz | CC Attribution | https://sketchfab.com/3d-models/karambit-dfd7606f189a413681305a39b8841ce8 |
| silah_bicak.glb | Bıçak (kollar atıldı) | "knife Animated" — bumstrum | CC Attribution | https://sketchfab.com/3d-models/knife-animated-f3140db917cc43389c14b5b2536c1dc8 |
| silah_deagle.glb | Desert Eagle | "Desert Eagle" — ELIZION | CC Attribution | https://sketchfab.com/3d-models/desert-eagle-cabde59f5cf24effaf80536e35d04e95 |
| silah_vector.glb | FENEK (Vector) | "KRSV VECTOR" — h1ggs | CC Attribution | https://sketchfab.com/3d-models/krsv-vector-609166faf8e5416f957c88e0af657e09 |
| silah_m4.glb | M4 | "M4A1 Carbine" — MrM0lten | CC Attribution | https://sketchfab.com/3d-models/m4a1-carbine-9bb8f18ad94d4b468e447a2d43bd08b9 |
| silah_uzi.glb | UZİ | "Uzi" — frankestudios71 | CC Attribution | https://sketchfab.com/3d-models/uzi-a6bdc3eced8c4fb990545d5b9b53abab |
| silah_r870.glb | Pompalı (Remington 870) | "Remington 870 Shotgun" — milinam2002 | CC Attribution | https://sketchfab.com/3d-models/remington-870-shotgun-6db0ad4764d14eee8f063eea3600071b |
| silah_pgm.glb | AWP (PGM Ultima Ratio) | "PGM Ultima Ratio · Game-Ready Sniper Rifle" — flip.3d | CC Attribution | https://sketchfab.com/3d-models/pgm-ultima-ratio-game-ready-sniper-rifle-34611493b4104bdba2ce6beabfeb4465 |


## Sketchfab karakterleri (kostüm)

Kendi iskeletleri olan (Mixamo) karakterler. Oyunda görünmez bir kukla (standart iskelet) animasyonu ve silah
tutuşunu yapar; `js/karakter.js` (extSetup / extPose) her karede kostümün kemiklerini kuklanınkilerle aynı yöne çevirir.

| Dosya | Kostüm | Model — yapımcı | Lisans | Kaynak |
|---|---|---|---|---|
| kostum_ksk.glb | KSK Operatörü | "German KSK operator - rigged" — 42manako | CC Attribution | https://sketchfab.com/3d-models/german-ksk-operator-rigged-110daf3d1884412989e41dc95866c579 |
| kostum_asker.glb | Piyade | "Army soldier Character" — joneborden123 | CC Attribution | https://sketchfab.com/3d-models/army-soldier-character-cc995450452744ec8f852d8bf5f335d6 |
| kostum_futurist.glb | Öncü (Gelecek) | "Futuristic Soldier" — unlimitedstudio | CC Attribution | https://sketchfab.com/3d-models/futuristic-soldier-fa8424c793274645ad577ddca6fa0de7 |
| kostum_karasovalye.glb | Kara Şövalye | "Low Poly Dark Knight (Mixamo Rigged)" — giorgi.abashidze95 | CC Attribution | https://sketchfab.com/3d-models/low-poly-dark-knight-mixamo-rigged-7f59a7b0e952457c9102cd65fe485f09 |
| kostum_valeria.glb | Valeria (Kılıç Ustası) | "Valeria Stormblade - Low-Poly Female Warrior" — limitlessstudiosservice | CC Attribution | https://sketchfab.com/3d-models/valeria-stormblade-low-poly-female-warrior-55c2a18bc2b94ba69a1bb8e6fdbbed46 |
| kostum_spartali.glb | Spartalı | "Low poly - Spartan Soldier" — MariosTzavis | CC Attribution | https://sketchfab.com/3d-models/low-poly-spartan-soldier-2c2f5c6e24254636ad75f88d5a0282d9 |
| kostum_hayalet.glb | Hayalet Zırh | "Phantom Armor" — Guicos | CC Attribution | https://sketchfab.com/3d-models/phantom-armor-52b6bade1bc04f56ae27222bf1548705 |
