"""Build an unsigned widget. Signing requires the owner's Samsung certificate."""
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
ET.parse(root / 'app/config.xml')
output = root / 'artifacts/Orbita-TV-0.4.0-unsigned.wgt'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted((root/'app').rglob('*')):
        if p.is_file(): z.write(p,p.relative_to(root/'app'))
    z.write(root/'LICENSE-HorizonX','licenses/HorizonX-MIT.txt')
with zipfile.ZipFile(output) as z: assert z.testzip() is None
print(f'{output}: {output.stat().st_size:,} bytes (UNSIGNED)')
