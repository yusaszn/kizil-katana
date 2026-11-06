#!/usr/bin/env python3
"""Poly Haven (CC0) dokularını indirir, 512 piksele küçültür, tonunu Mardin taşına uydurur ve js/doku-veri.js içine
base64 olarak gömer (.exe sürümü oyunu file:// ile açar: resim dosyası WebGL'e yüklenemez, data: adresi yüklenir).
Kullanım: python3 araclar/dokulari-paketle.py  (indirilenler doku/ham/ altında önbelleğe alınır, depoya girmez)"""
import base64, io, json, os, sys, urllib.request
from PIL import Image, ImageEnhance

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAM = os.path.join(KOK, 'doku', 'ham')
# anahtar: (Poly Haven kimliği, boyut, parlaklık, doygunluk, sıcaklık (kırmızı/mavi kayması), normal haritası da)
SECIM = {
    'tas':    ('sandstone_blocks_05', 512, 1.0, 1.0, .10, True),     # yontma kesme taş duvar (cephe, kemer, kubbe)
    'ic':     ('medieval_blocks_02', 512, .5, .45, 0, True),       # sarnıç ve abbara içi: kaba moloz taş
    'sokak':  ('monastery_stone_floor', 512, 1.45, .45, .03, True),   # sokak: düzensiz taş plakalar
    'plaka':  ('large_floor_tiles_02', 512, 1.15, .9, .12, True),    # han avlusu: büyük kare plakalar
    'kaldirim': ('cobblestone_floor_01', 512, 1.0, .9, .08, True),   # arnavut kaldırımı
    'islak':  ('stone_tiles_02', 512, .45, .7, .02, True),           # sarnıç tabanı
}

def indir(pid, tur):
    os.makedirs(HAM, exist_ok=True)
    yol = os.path.join(HAM, f'{pid}_{tur}_1k.jpg')
    if not os.path.exists(yol):
        url = f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{pid}/{pid}_{tur}_1k.jpg'
        print('indiriliyor', url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r, open(yol, 'wb') as f: f.write(r.read())
    return Image.open(yol).convert('RGB')

def ton(im, parlak, doygun, sicak):
    im = ImageEnhance.Brightness(im).enhance(parlak)
    im = ImageEnhance.Color(im).enhance(doygun)
    if sicak:
        r, g, b = im.split()
        r = r.point(lambda v: min(255, int(v * (1 + sicak))))
        b = b.point(lambda v: int(v * (1 - sicak)))
        im = Image.merge('RGB', (r, g, b))
    return im

def b64(im, q):
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

veri, toplam = {}, 0
for k, (pid, n, parlak, doygun, sicak, nor) in SECIM.items():
    renk = ton(indir(pid, 'diff').resize((n, n), Image.LANCZOS), parlak, doygun, sicak)
    veri[k] = b64(renk, 82)
    if nor: veri[k + '_n'] = b64(indir(pid, 'nor_gl').resize((n, n), Image.LANCZOS), 88)
for v in veri.values(): toplam += len(v)
with open(os.path.join(KOK, 'js', 'doku-veri.js'), 'w') as f:
    f.write("'use strict';\n/* Poly Haven (CC0) dokuları, araclar/dokulari-paketle.py üretir. Kaynaklar: doku/KAYNAK.md */\nconst DOKU_VERI = ")
    json.dump(veri, f, separators=(',', ':'))
    f.write(';\n')
print('yazıldı', len(veri), 'doku', round(toplam / 1024), 'KB', file=sys.stderr)
