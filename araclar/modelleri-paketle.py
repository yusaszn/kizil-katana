# modeller/*.glb dosyalarını js/modeller-veri.js içine base64 olarak gömer.
# .exe sürümü oyunu file:// ile açtığı için tarayıcı .glb dosyasını fetch ile okuyamaz; script olarak gömülü veri her yerde çalışır.
# Model ekleyip çıkardıktan sonra çalıştır:  python araclar/modelleri-paketle.py
import base64, pathlib

kok = pathlib.Path(__file__).resolve().parent.parent
satirlar = ["'use strict';", '// OTOMATİK ÜRETİLDİ: araclar/modelleri-paketle.py — elle düzenleme', 'const MODEL_DATA = {']
for f in sorted((kok / 'modeller').glob('*.glb')):
    satirlar.append(f"  {f.stem}: '{base64.b64encode(f.read_bytes()).decode()}',")
satirlar.append('};')
hedef = kok / 'js' / 'modeller-veri.js'
hedef.write_text('\n'.join(satirlar) + '\n', encoding='utf-8')
print(f'{hedef.name}: {hedef.stat().st_size // 1024} KB')
