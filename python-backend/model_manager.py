import os
import threading
import time
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import Any

from schemas import BackendPreference, ModelName, ModelProgressResponse, RuntimeConfigResponse, StatusResponse


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
        self._preferences: dict[ModelName, BackendPreference] = {
            "sam3": self._read_backend_preference("CREATORS_COCO_SAM3_BACKEND"),
            "nudenet": self._read_backend_preference("CREATORS_COCO_NUDENET_BACKEND"),
        }
        self._lock = threading.Lock()
        self._workers: dict[ModelName, threading.Thread | None] = {"sam3": None, "nudenet": None}
        self._sam3_checkpoint_path = self._resolve_sam3_checkpoint_path()
        self._sam3_config_path = self._resolve_sam3_config_path()
        from native_backends import sam3_native_adapter

        sam3_native_adapter.configure(self._sam3_checkpoint_path, self._sam3_config_path)

    def _normalize_optional_path(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    def _get_backend_root(self) -> Path:
        return Path(__file__).resolve().parent

    def _find_first_existing_file(self, patterns: tuple[str, ...]) -> str | None:
        backend_root = self._get_backend_root()
        for pattern in patterns:
            for candidate in backend_root.glob(pattern):
                if candidate.is_file():
                    return str(candidate.resolve())
        return None

    def _resolve_sam3_checkpoint_path(self) -> str | None:
        configured_path = self._normalize_optional_path(os.environ.get("CREATORS_COCO_SAM3_CHECKPOINT"))
        if configured_path:
            return configured_path
        return self._find_first_existing_file(
            (
                "models/sam3/*.pt",
                "models/sam3/*.pth",
                "models/sam3/*.ckpt",
            )
        )

    def _resolve_sam3_config_path(self) -> str | None:
        configured_path = self._normalize_optional_path(os.environ.get("CREATORS_COCO_SAM3_CONFIG"))
        if configured_path:
            return configured_path
        return self._find_first_existing_file(
            (
                "models/sam3/*.yaml",
                "models/sam3/*.yml",
                "models/**/*.yaml",
                "models/**/*.yml",
            )
        )

    def _read_backend_preference(self, env_name: str) -> BackendPreference:
        raw_value = str(os.environ.get(env_name, "auto")).strip().lower()
        if raw_value in {"native", "heuristic"}:
            return raw_value  # type: ignore[return-value]
        return "auto"

    def _is_sam3_checkpoint_ready(self) -> bool:
        if not self._sam3_checkpoint_path or not os.path.exists(self._sam3_checkpoint_path):
            return False
        if self._sam3_config_path and not os.path.exists(self._sam3_config_path):
            return False
        return True

    def _detect_gpu_available(self) -> bool:
        try:
            import torch  # type: ignore

            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def _detect_native_backend(self, model_name: ModelName) -> bool:
        if model_name == "sam3":
            from native_backends import sam3_native_adapter

            return sam3_native_adapter.check_availability().available

        from native_backends import nudenet_native_adapter

        return nudenet_native_adapter.check_availability().available

    def _resolve_backend(self, model_name: ModelName) -> str:
        preference = self._preferences[model_name]
        native_available = self._detect_native_backend(model_name)

        if preference == "native":
            return "native" if native_available else "heuristic"
        if preference == "heuristic":
            return "heuristic"
        return "native" if native_available else "heuristic"

    def _detect_native_available(self, model_name: ModelName) -> bool:
        return self._detect_native_backend(model_name)

    def _get_native_reason(self, model_name: ModelName) -> str | None:
        if model_name == "sam3":
            from native_backends import sam3_native_adapter

            return sam3_native_adapter.check_availability().reason

        from native_backends import nudenet_native_adapter

        return nudenet_native_adapter.check_availability().reason

    def _is_packaged_runtime(self) -> bool:
        return bool(getattr(sys, "frozen", False))

    def _get_python_version(self) -> str:
        return sys.version.split(" ", maxsplit=1)[0]

    def _is_windows_runtime(self) -> bool:
        return sys.platform.startswith("win")

    def _is_sam3_windows_packaged_fallback_reason(self, reason: str | None) -> bool:
        if not reason:
            return False
        normalized_reason = reason.lower()
        return "torchscript requires source access" in normalized_reason or "no module named 'triton'" in normalized_reason

    def _get_backend_recommendation(self, model_name: ModelName) -> str:
        preference = self._preferences[model_name]
        native_available = self._detect_native_available(model_name)
        python_version = self._get_python_version()
        error_message = self._state[model_name].error_message
        native_reason = self._get_native_reason(model_name)

        if native_available:
            if preference == "heuristic":
                return "Native is available, but heuristic is currently forced. Switch to auto or native when you want deeper review."
            return "Native backend is available for this model."

        if model_name == "sam3":
            if self._is_packaged_runtime() and self._is_windows_runtime() and self._is_sam3_windows_packaged_fallback_reason(native_reason):
                return "SAM3 native is not a reliable packaged Windows path right now. Keep heuristic for portable builds and use a dedicated development runtime only if you want to experiment with native SAM3."
            if not self._sam3_checkpoint_path:
                if native_reason and "triton" in native_reason.lower():
                    return "SAM3 native import reached Triton and stopped. On Windows this usually means the official runtime still expects a Linux-focused Triton path, so keep heuristic SAM3 unless you have a supported stack."
                return "SAM3 is running on heuristic fallback. Configure a checkpoint path from Help or CREATORS_COCO_SAM3_CHECKPOINT to enable native loading."
            if self._sam3_checkpoint_path and not os.path.exists(self._sam3_checkpoint_path):
                return f"SAM3 checkpoint path is invalid. Update it from Help or fix the file path: {self._sam3_checkpoint_path}"
            if self._sam3_config_path and not os.path.exists(self._sam3_config_path):
                return f"SAM3 config path is invalid. Update it from Help or fix the file path: {self._sam3_config_path}"
            if python_version.startswith("3.14"):
                return "SAM3 native is unavailable here. Use Python 3.12 plus the optional native install script for the best chance of loading checkpoints."
            if error_message:
                return f"SAM3 native fell back to heuristic. Last error: {error_message}"
            if native_reason:
                return f"SAM3 is running on heuristic fallback. Native detail: {native_reason}"
            return "SAM3 is running on heuristic fallback. Install optional native dependencies and checkpoints to promote it."

        if error_message:
            return f"NudeNet native fell back to heuristic. Last error: {error_message}"
        if native_reason:
            return f"NudeNet is running on heuristic fallback. Native detail: {native_reason}"
        return "NudeNet is running on heuristic fallback. Install optional native dependencies if you want native review."

    def update_runtime_config(
        self,
        *,
        sam3_backend_preference: BackendPreference,
        nudenet_backend_preference: BackendPreference,
        sam3_checkpoint_path: str | None = None,
        sam3_config_path: str | None = None,
    ) -> RuntimeConfigResponse:
        with self._lock:
            self._preferences["sam3"] = sam3_backend_preference
            self._preferences["nudenet"] = nudenet_backend_preference
            self._sam3_checkpoint_path = self._normalize_optional_path(sam3_checkpoint_path)
            self._sam3_config_path = self._normalize_optional_path(sam3_config_path)
            from native_backends import sam3_native_adapter

            sam3_native_adapter.configure(self._sam3_checkpoint_path, self._sam3_config_path)
            self._state["sam3"].backend = self._resolve_backend("sam3")
            self._state["nudenet"].backend = self._resolve_backend("nudenet")
        return self.get_runtime_config()

    def get_runtime_config(self) -> RuntimeConfigResponse:
        with self._lock:
            return RuntimeConfigResponse(
                sam3_backend_preference=self._preferences["sam3"],
                nudenet_backend_preference=self._preferences["nudenet"],
                sam3_native_available=self._detect_native_available("sam3"),
                nudenet_native_available=self._detect_native_available("nudenet"),
                sam3_checkpoint_path=self._sam3_checkpoint_path,
                sam3_config_path=self._sam3_config_path,
                sam3_checkpoint_ready=self._is_sam3_checkpoint_ready(),
                sam3_native_reason=self._get_native_reason("sam3"),
                nudenet_native_reason=self._get_native_reason("nudenet"),
                sam3_effective_backend=self._resolve_backend("sam3"),
                nudenet_effective_backend=self._resolve_backend("nudenet"),
                sam3_recommendation=self._get_backend_recommendation("sam3"),
                nudenet_recommendation=self._get_backend_recommendation("nudenet"),
            )

    def get_effective_backend(self, model_name: ModelName) -> str:
        with self._lock:
            return self._resolve_backend(model_name)

    def set_active_backend(self, model_name: ModelName, backend: str, error_message: str | None = None) -> None:
        with self._lock:
            state = self._state[model_name]
            state.backend = backend
            state.error_message = error_message
            state.updated_at = time.time()

    def _update_state(self, model_name: ModelName, *, status: str, progress: int, loaded: bool | None = None) -> None:
        with self._lock:
            state = self._state[model_name]
            state.status = status
            state.progress = progress
            state.updated_at = time.time()
            state.backend = self._resolve_backend(model_name)
            state.error_message = None
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
                packaged_runtime=self._is_packaged_runtime(),
                python_version=self._get_python_version(),
                sam3_backend=sam3.backend or self._resolve_backend("sam3"),
                nudenet_backend=nudenet.backend or self._resolve_backend("nudenet"),
                sam3_native_available=self._detect_native_available("sam3"),
                nudenet_native_available=self._detect_native_available("nudenet"),
                sam3_checkpoint_path=self._sam3_checkpoint_path,
                sam3_config_path=self._sam3_config_path,
                sam3_checkpoint_ready=self._is_sam3_checkpoint_ready(),
                sam3_native_reason=self._get_native_reason("sam3"),
                nudenet_native_reason=self._get_native_reason("nudenet"),
                sam3_backend_preference=self._preferences["sam3"],
                nudenet_backend_preference=self._preferences["nudenet"],
                sam3_recommendation=self._get_backend_recommendation("sam3"),
                nudenet_recommendation=self._get_backend_recommendation("nudenet"),
                sam3_error_message=sam3.error_message,
                nudenet_error_message=nudenet.error_message,
            )

    def get_stream_payload(self, model_name: ModelName) -> dict[str, Any]:
        progress = self.get_progress(model_name)
        return progress.model_dump()


model_manager = ModelManager()
