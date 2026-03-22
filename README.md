# CreatorsCOCO

Desktop editor for CG/dialog compositing with React + Electron and a local FastAPI backend for SAM3/NSFW-assisted review.

## Current MVP status

The project is close to MVP. The core editor, export flow, project persistence, backend review UI, SAM3 manual segment, NSFW detection review, and batch SAM3 application are already wired together.

The main remaining work is operational polish:

- packaging the Electron app and bundled backend as a distributable build
- replacing heuristic backend services with heavier native model loading where needed
- tightening performance thresholds for long, high-resolution sessions

## Local setup

### Frontend

```powershell
npm install
npm test
```

### Python backend

```powershell
python -m venv python-backend/.venv
python-backend/.venv\Scripts\Activate.ps1
python -m pip install -r python-backend/requirements.txt
python -m unittest discover -s python-backend/tests -p "test_*.py"
```

`electron/python-manager.cjs` now auto-detects `python-backend/.venv`, so once the virtual environment is created the desktop app can start the backend without extra environment variables.

## Run the app

```powershell
npm run dev
```

If you want to force a specific Python runtime, set `CREATORS_COCO_PYTHON` before launch.

## Backend packaging

```powershell
npm run backend:build
```

That produces the PyInstaller backend executable expected by Electron under `python-backend/dist/`.

## Windows desktop packaging

```powershell
npm install
npm run dist:win
```

This flow builds the Vite frontend, packages the Python backend executable, and then creates a portable Windows executable under `release/`.

If you only want to inspect the unpacked Electron app layout first, use:

```powershell
npm run dist:dir
```

If you specifically want an NSIS installer build, use:

```powershell
npm run dist:nsis
```

At the moment, `dist:nsis` is still environment-sensitive on this Windows setup. The current cut-down result is:

- portable build is verified and should be treated as the default MVP distribution path
- NSIS currently trips inside `electron-builder`'s uninstaller generation path on Windows, where it falls through an `execWine(...)` path during installer assembly
- a custom NSIS script workaround was also tested, but that exposed a separate template compatibility error in `installSection.nsh`

So the actionable recommendation for now is to ship the portable build first and revisit NSIS once the upstream builder path is swapped or pinned to a known-good version.
