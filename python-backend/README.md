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

## Optional native backends

For a local native backend experiment, you can install the optional dependencies with:

```powershell
cd python-backend
./install-native-backends.ps1
```

For the dedicated Python 3.12 SAM3-native path used in this workspace:

```powershell
npm run backend:setup-sam3-native
```

This installs:

- PyTorch runtime packages
- `nudenet`
- the official `sam3` package from GitHub

If SAM3 still cannot run natively after install, the backend will stay on heuristic fallback until checkpoints and any required authentication are in place.
On Python 3.14.3 in this workspace, the SAM3 pip install currently fails during a transitive NumPy build step unless a local compiler toolchain is available, so the practical result today is usually:

- NudeNet: native available
- SAM3: heuristic fallback

On the Python 3.12.11 native venv, the official `sam3` package can be installed successfully, but Windows still stops at the Triton import path before checkpoint loading. That means the current Windows-native outcome is still usually:

- NudeNet: native available
- SAM3: package installed, but heuristic fallback until the Triton/runtime side is supported

To let SAM3 native initialization try a real checkpoint, provide:

- `CREATORS_COCO_SAM3_CHECKPOINT=D:\models\sam3.pt`
- `CREATORS_COCO_SAM3_CONFIG=D:\models\sam3.yaml` (optional if your installed `sam3` build needs it)

The Electron UI can also push these values at runtime through `Help -> Backend strategy`, and `/api/status` plus `/api/model/runtime-config` will report:

- `sam3_checkpoint_path`
- `sam3_config_path`
- `sam3_checkpoint_ready`
- `sam3_native_reason`
- `sam3_recommendation`

The renderer can export/import a lightweight runtime profile JSON for these settings, so testers can share backend strategy plus checkpoint paths without hand-editing environment variables.

## Notes

- Native SAM3 / NudeNet loading can be swapped into `model_manager.py` and the service classes without changing the frontend API.
- The current implementation keeps a heuristic fallback so the desktop app can still function when heavyweight model dependencies are not bundled yet.
- `/api/status` now reports runtime and capability details as well, including Python version, packaged-vs-dev runtime, and whether each model is currently running in `native` or `heuristic` mode.
- `/api/model/runtime-config` can read or update the preferred backend strategy for both SAM3 and NudeNet at runtime (`auto`, `native`, `heuristic`).

## Runtime strategy

The backend now separates:

- preferred strategy: what the UI or environment requested
- effective backend: what the runtime actually uses after checking optional native dependencies

If native dependencies are missing, the backend falls back to the heuristic implementation while keeping the API shape stable for the Electron app.

Environment overrides:

- `CREATORS_COCO_SAM3_BACKEND=auto|native|heuristic`
- `CREATORS_COCO_NUDENET_BACKEND=auto|native|heuristic`
- `CREATORS_COCO_SAM3_CHECKPOINT=<absolute path to checkpoint>`
- `CREATORS_COCO_SAM3_CONFIG=<absolute path to config yaml>`
