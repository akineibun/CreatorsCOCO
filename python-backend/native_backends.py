import importlib
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


@dataclass
class NativeBackendAvailability:
    available: bool
    reason: str | None = None


class Sam3NativeAdapter:
    def __init__(self) -> None:
        self._processor: Any | None = None
        self._availability: NativeBackendAvailability | None = None
        self._checkpoint_path: str | None = None
        self._config_path: str | None = None

    def configure(self, checkpoint_path: str | None, config_path: str | None) -> None:
        normalized_checkpoint = str(checkpoint_path).strip() if checkpoint_path else None
        normalized_config = str(config_path).strip() if config_path else None
        if normalized_checkpoint == "":
            normalized_checkpoint = None
        if normalized_config == "":
            normalized_config = None

        if normalized_checkpoint == self._checkpoint_path and normalized_config == self._config_path:
            return

        self._checkpoint_path = normalized_checkpoint
        self._config_path = normalized_config
        self._processor = None
        self._availability = None

    def check_availability(self) -> NativeBackendAvailability:
        if self._availability is not None:
            return self._availability

        try:
            importlib.import_module("sam3")
            importlib.import_module("torch")
        except Exception as exc:
            self._availability = NativeBackendAvailability(available=False, reason=str(exc))
            return self._availability

        if not self._checkpoint_path:
            self._availability = NativeBackendAvailability(
                available=False,
                reason="SAM3 checkpoint path is not configured",
            )
            return self._availability

        if not Path(self._checkpoint_path).exists():
            self._availability = NativeBackendAvailability(
                available=False,
                reason=f"SAM3 checkpoint not found: {self._checkpoint_path}",
            )
            return self._availability

        if self._config_path and not Path(self._config_path).exists():
            self._availability = NativeBackendAvailability(
                available=False,
                reason=f"SAM3 config not found: {self._config_path}",
            )
            return self._availability

        self._availability = NativeBackendAvailability(available=True)
        return self._availability

    def _load_processor(self) -> Any:
        if self._processor is not None:
            return self._processor

        from sam3.model_builder import build_sam3_image_model  # type: ignore
        from sam3.model.sam3_image_processor import Sam3Processor  # type: ignore

        candidate_calls = []
        if self._checkpoint_path and self._config_path:
            candidate_calls.extend(
                [
                    lambda: build_sam3_image_model(
                        checkpoint_path=self._checkpoint_path,
                        config_path=self._config_path,
                    ),
                    lambda: build_sam3_image_model(
                        model_path=self._checkpoint_path,
                        config_path=self._config_path,
                    ),
                    lambda: build_sam3_image_model(self._config_path, self._checkpoint_path),
                ]
            )
        if self._checkpoint_path:
            candidate_calls.extend(
                [
                    lambda: build_sam3_image_model(checkpoint=self._checkpoint_path),
                    lambda: build_sam3_image_model(checkpoint_path=self._checkpoint_path),
                    lambda: build_sam3_image_model(model_path=self._checkpoint_path),
                ]
            )
        candidate_calls.append(lambda: build_sam3_image_model())

        model: Any | None = None
        last_error: Exception | None = None
        for call in candidate_calls:
            try:
                model = call()
                if model is not None:
                    break
            except Exception as exc:
                last_error = exc
                continue

        if model is None:
            if last_error is not None:
                raise last_error
            raise RuntimeError("Unable to initialize SAM3 model")

        self._processor = Sam3Processor(model)
        return self._processor

    def segment_mask(
        self,
        image: Image.Image,
        points: list[dict[str, float | int]],
    ) -> Image.Image | None:
        availability = self.check_availability()
        if not availability.available:
            return None

        processor = self._load_processor()
        state = processor.set_image(image)

        point_payload = [[float(point["x"]), float(point["y"])] for point in points]
        label_payload = [int(point["label"]) for point in points]

        candidate_calls = [
            lambda: processor.set_point_prompt(state=state, points=point_payload, labels=label_payload),
            lambda: processor.add_new_points(state=state, points=point_payload, labels=label_payload),
            lambda: processor.predict(state=state, point_coords=point_payload, point_labels=label_payload),
        ]

        output: Any = None
        for call in candidate_calls:
            try:
                output = call()
                if output is not None:
                    break
            except Exception:
                continue

        if output is None:
            return None

        masks = output.get("masks") if isinstance(output, dict) else None
        if not masks:
            return None

        mask_like = masks[0]
        if hasattr(mask_like, "detach"):
            mask_like = mask_like.detach().cpu().numpy()
        elif hasattr(mask_like, "cpu"):
            mask_like = mask_like.cpu().numpy()

        if getattr(mask_like, "ndim", 0) >= 3:
            mask_like = mask_like[0]

        width, height = image.size
        native_mask = Image.new("L", (width, height), 0)
        draw = ImageDraw.Draw(native_mask)

        for y in range(min(height, len(mask_like))):
            row = mask_like[y]
            start_x: int | None = None
            for x in range(min(width, len(row))):
                active = float(row[x]) > 0
                if active and start_x is None:
                    start_x = x
                if not active and start_x is not None:
                    draw.line((start_x, y, x - 1, y), fill=255)
                    start_x = None
            if start_x is not None:
                draw.line((start_x, y, width - 1, y), fill=255)

        return native_mask


class NudeNetNativeAdapter:
    def __init__(self) -> None:
        self._detector: Any | None = None
        self._availability: NativeBackendAvailability | None = None

    def check_availability(self) -> NativeBackendAvailability:
        if self._availability is not None:
            return self._availability

        try:
            module = importlib.import_module("nudenet")
            if not hasattr(module, "NudeDetector"):
                raise AttributeError("NudeDetector not found")
            self._availability = NativeBackendAvailability(available=True)
        except Exception as exc:
            self._availability = NativeBackendAvailability(available=False, reason=str(exc))
        return self._availability

    def _load_detector(self) -> Any:
        if self._detector is not None:
            return self._detector

        module = importlib.import_module("nudenet")
        detector_class = getattr(module, "NudeDetector")
        self._detector = detector_class()
        return self._detector

    def detect(self, image: Image.Image) -> list[dict[str, Any]] | None:
        availability = self.check_availability()
        if not availability.available:
            return None

        detector = self._load_detector()

        with tempfile.TemporaryDirectory(prefix="creators-coco-nudenet-") as temp_dir:
            image_path = Path(temp_dir) / "frame.png"
            image.save(image_path, format="PNG")
            output = detector.detect(str(image_path))

        return output if isinstance(output, list) else None


sam3_native_adapter = Sam3NativeAdapter()
nudenet_native_adapter = NudeNetNativeAdapter()
