# Fotoğraf dokuları

Hepsi **Poly Haven** (https://polyhaven.com) dokuları, **CC0 (kamu malı)**: ücretsiz, ticari kullanım dahil serbest, atıf zorunlu değil.
`araclar/dokulari-paketle.py` 1k sürümlerini indirir (önbellek: `doku/ham/`, depoya girmez), 512 piksele küçültür, tonunu ayarlar
ve `js/doku-veri.js` içine base64 olarak gömer. Her dokunun renk (diffuse) ve kabartma (OpenGL normal) haritası kullanılır.

| Anahtar | Oyunda | Poly Haven |
|---|---|---|
| tas | Mardin cephe, kemer, kubbe kesme taşı | https://polyhaven.com/a/sandstone_blocks_05 |
| ic | Sarnıç ve abbara içi moloz taş | https://polyhaven.com/a/medieval_blocks_02 |
| sokak | Mardin sokak taş plakaları | https://polyhaven.com/a/monastery_stone_floor |
| plaka | Han avlusu kare plakalar | https://polyhaven.com/a/large_floor_tiles_02 |
| kaldirim | Arnavut kaldırımı | https://polyhaven.com/a/cobblestone_floor_01 |
| islak | Sarnıç tabanı | https://polyhaven.com/a/stone_tiles_02 |
| asfalt | Liman zemini | https://polyhaven.com/a/asphalt_02 |
| beton | Liman duvarları | https://polyhaven.com/a/concrete_wall_004 |
| kum | Çöl Geçidi zemini | https://polyhaven.com/a/coast_sand_01 |
| kumtas | Çöl Geçidi duvarları | https://polyhaven.com/a/sandstone_blocks_08 |
| kaya | Kızıl Arena ve Kemik Avlusu zemini | https://polyhaven.com/a/volcanic_rock_tiles |
| kduvar | Kızıl Arena ve Kemik Avlusu duvarları | https://polyhaven.com/a/castle_wall_slates |
| orman | Orman kampı toprağı | https://polyhaven.com/a/forest_ground_04 |
| tahta | Dağ evi tabanı | https://polyhaven.com/a/old_wood_floor |
| guverte | Çatı katı güvertesi | https://polyhaven.com/a/weathered_planks |

`js/doku-veri.js` açılışı bekletmesin diye `js/doku.js` tarafından arka planda yüklenir; gelene kadar haritalar eski
çizim dokularıyla görünür, gelince o an açık harita da fotoğraf dokularına geçer.
