# modeller/KAYNAK.md ve doku/KAYNAK.md tablolarından oyundaki "Emeği Geçenler" listesini (js/emek-veri.js) üretir.
# CC-BY modellerde yapımcı adının oyunda görünmesi lisans gereği. Model / doku ekleyince çalıştır: python araclar/emek-uret.py
import json, pathlib, re
kok = pathlib.Path(__file__).resolve().parent.parent
satir = []
for md, varsayilan in [(kok / 'modeller' / 'KAYNAK.md', 'Quaternius · CC0'), (kok / 'doku' / 'KAYNAK.md', 'Poly Haven · CC0')]:
    baslik = ''
    for l in md.read_text(encoding='utf-8').splitlines():
        if l.startswith('## '): baslik = l[3:].strip()
        if not l.startswith('|') or set(l) <= set('|- ') or 'Dosya |' in l or 'Anahtar |' in l: continue
        c = [x.strip() for x in l.strip('|').split('|')]
        url = next((x for x in c if x.startswith('http')), '')
        if len(c) >= 5: satir.append({'g': baslik, 'oyun': c[1], 'model': c[2].replace('"', ''), 'lisans': c[3], 'url': url})
        elif len(c) == 3: satir.append({'g': baslik or 'Modeller', 'oyun': c[1], 'model': varsayilan, 'lisans': '', 'url': url})
(kok / 'js' / 'emek-veri.js').write_text("'use strict';\n// OTOMATİK ÜRETİLDİ: araclar/emek-uret.py (modeller/KAYNAK.md, doku/KAYNAK.md)\nconst EMEK = " + json.dumps(satir, ensure_ascii=False) + ";\n", encoding='utf-8')
print(len(satir), 'satır')
