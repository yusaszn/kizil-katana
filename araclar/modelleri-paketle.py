# modeller/*.glb dosyalarını js/modeller-veri.js içine base64 olarak gömer.
# .exe sürümü oyunu file:// ile açtığı için tarayıcı .glb dosyasını fetch ile okuyamaz; script olarak gömülü veri her yerde çalışır.
# Kostümler (kostum_*.glb) ve Sketchfab canavarları (canavar_*.glb) açılışı ağırlaştırmasın diye ayrı js/<önek>-<ad>.js
# dosyalarına yazılır; oyun gerektiğinde (kostüm giyilince, menüde boşta) script olarak yükler (MODEL_EK çağrısı).
# Model ekleyip çıkardıktan sonra çalıştır:  python araclar/modelleri-paketle.py
import base64, pathlib

kok = pathlib.Path(__file__).resolve().parent.parent
satirlar = ["'use strict';", '// OTOMATİK ÜRETİLDİ: araclar/modelleri-paketle.py — elle düzenleme', 'const MODEL_DATA = {']
for f in sorted((kok / 'modeller').glob('*.glb')):
    b64 = base64.b64encode(f.read_bytes()).decode()
    if f.stem.startswith(('kostum_', 'canavar_')):
        on, ad = f.stem.split('_', 1)
        k = kok / 'js' / f'{on}-{ad}.js'
        k.write_text(f"'use strict';\n// OTOMATİK ÜRETİLDİ: araclar/modelleri-paketle.py\nMODEL_EK('{f.stem}', '{b64}');\n", encoding='utf-8')
        print(f'{k.name}: {k.stat().st_size // 1024} KB')
        continue
    satirlar.append(f"  {f.stem}: '{b64}',")
satirlar.append('};')
hedef = kok / 'js' / 'modeller-veri.js'
hedef.write_text('\n'.join(satirlar) + '\n', encoding='utf-8')
print(f'{hedef.name}: {hedef.stat().st_size // 1024} KB')
