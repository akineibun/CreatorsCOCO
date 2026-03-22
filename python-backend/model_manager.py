import threading
import time
from dataclasses import dataclass
from typing import Any

from schemas import ModelName, ModelProgressResponse, StatusResponse


@dataclass
class ModelState:
    name: ModelName
    status: str = "idle"
    progress: int = 0
    loaded: bool = False
    requested_at: float | None = None
    updated_at: float | None = None
    backend: str = "heuristic"
    error_message: str | None = None


class ModelManager:
    def __init__(self) -> None:
        self._state: dict[ModelName, ModelState] = {
            "sam3": ModelState(name="sam3"),
            "nudenet": ModelState(name="nudenet"),
        }
        self._lock = threading.Lock()
        self._workers: dict[ModelName, threading.Thread | None] = {"sam3": None, "nudenet": None}

    def _detect_gpu_available(self) -> bool:
        try:
            import torch  # type: ignore

            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def _resolve_backend(self, model_name: ModelName) -> str:
        if model_name == "sam3":
            try:
                import torch  # type: ignore

                return "native" if hasattr(torch, "__version__") else "heuristic"
            except Exception:
                return "heuristic"

        try:
            import nudenet  # type: ignore

            return "native" if hasattr(nudenet, "__package__") else "heuristic"
        except Exception:
            return "heuristic"

    def _update_state(self, model_name: ModelName, *, status: str, progress: int, loaded: bool | None = None) -> None:
        with self._lock:
            state = self._state[model_name]
            state.status = status
            state.progress = progress
            state.updated_at = time.time()
            state.backend = self._resolve_backend(model_name)
            if loaded is not None:
                state.loaded = loaded

    def _load_model(self, model_name: ModelName) -> None:
        try:
            self._update_state(model_name, status="queued", progress=0, loaded=False)
            for progress, status in ((10, "preparing"), (35, "loading-runtime"), (65, "warming-up"), (100, "ready")):
                time.sleep(0.2)
                self._update_state(model_name, status=status, progress=progress, loaded=progress >= 100)
        except Exception as exc:  # pragma: no cover - defensive
            with self._lock:
                state = self._state[model_name]
                state.status = "failed"
                state.progress = 0
                state.loaded = False
                state.error_message = str(exc)
                state.updated_at = time.time()
        finally:
            with self._lock:
                self._workers[model_name] = None

    def request_download(self, model_name: ModelName) -> ModelState:
        with self._lock:
            state = self._state[model_name]
            state.requested_at = time.time()
            state.backend = self._resolve_backend(model_name)
            worker = self._workers[model_name]
            if worker is None or not worker.is_alive():
                thread = threading.Thread(target=self._load_model, args=(model_name,), daemon=True)
                self._workers[model_name] = thread
                thread.start()
            return ModelState(**state.__dict__)

    def ensure_ready(self, model_name: ModelName) -> None:
        with self._lock:
            state = self._state[model_name]
            if state.loaded and state.progress >= 100:
                return
            state.status = "ready"
            state.progress = 100
            state.loaded = True
            state.backend = self._resolve_backend(model_name)
            state.updated_at = time.time()

    def get_progress(self, model_name: ModelName) -> ModelProgressResponse:
        with self._lock:
            state = self._state[model_name]
            return ModelProgressResponse(model_name=model_name, status=state.status, progress=state.progress)

    def get_status(self) -> StatusResponse:
        with self._lock:
            sam3 = self._state["sam3"]
            nudenet = self._state["nudenet"]
            return StatusResponse(
                sam3_loaded=sam3.loaded,
                nudenet_loaded=nudenet.loaded,
                gpu_available=self._detect_gpu_available(),
                sam3_status=sam3.status,
                sam3_progress=sam3.progress,
                nudenet_status=nudenet.status,
                nudenet_progress=nudenet.progress,
            )

    def get_stream_payload(self, model_name: ModelName) -> dict[str, Any]:
        progress = self.get_progress(model_name)
        return progress.model_dump()


model_manager = ModelManager()
