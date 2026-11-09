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
