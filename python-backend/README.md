# CreatorsCOCO FastAPI Backend

This backend serves the Electron app on `http://127.0.0.1:8765` and keeps the UI contract stable while allowing a native model implementation later.

## Structure

- `main.py`: thin runtime entrypoint used by `uvicorn main:app`
- `entrypoint.py`: PyInstaller-friendly executable entrypoint
- `app_factory.py`: FastAPI construction and exception handler wiring
- `routers/`: HTTP endpoints
- `services/`: segmentation, detection, and mosaic application logic
- `model_manager.py`: lazy model state, download progress, and readiness lifecycle

## Run locally

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8765
```

## Package for Electron

```powershell
cd python-backend
pip install -r requirements.txt
./build-backend.ps1
```

The packaged executable is expected at `python-backend/dist/CreatorsCOCOBackend.exe`, which matches Electron's lookup order.

## Notes

- Native SAM3 / NudeNet loading can be swapped into `model_manager.py` and the service classes without changing the frontend API.
- The current implementation keeps a heuristic fallback so the desktop app can still function when heavyweight model dependencies are not bundled yet.
