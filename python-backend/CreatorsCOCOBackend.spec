# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

hiddenimports = [
    'fastapi',
    'uvicorn',
    'pydantic',
    'PIL',
    'nudenet',
    'einops',
    'timm',
    'huggingface_hub',
    *collect_submodules('nudenet'),
    *collect_submodules('sam3'),
]

datas = []
for package_name in ('sam3', 'nudenet'):
    try:
        datas += collect_data_files(package_name, includes=['**/*.py', '**/*.json', '**/*.yaml', '**/*.yml'])
    except Exception:
        pass


a = Analysis(
    ['entrypoint.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=True,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    [],
    name='CreatorsCOCOBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    exclude_binaries=True,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    name='CreatorsCOCOBackend',
)
