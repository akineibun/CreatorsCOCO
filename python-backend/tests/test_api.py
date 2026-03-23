import base64
import io
import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
from model_manager import model_manager


def create_image_base64() -> str:
    image = Image.new("RGB", (256, 256), (30, 30, 30))
    draw = ImageDraw.Draw(image)
    draw.ellipse((70, 70, 190, 210), fill=(242, 198, 170))
    draw.rectangle((96, 112, 164, 188), fill=(255, 224, 202))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


class BackendApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.image_base64 = create_image_base64()

    def test_status_endpoint(self) -> None:
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("sam3_loaded", payload)
        self.assertIn("nudenet_loaded", payload)
        self.assertIn("packaged_runtime", payload)
        self.assertIn("python_version", payload)
        self.assertIn("sam3_backend", payload)
        self.assertIn("nudenet_backend", payload)
        self.assertIn("sam3_native_available", payload)
        self.assertIn("nudenet_native_available", payload)
        self.assertIn("sam3_recommendation", payload)
        self.assertIn("nudenet_recommendation", payload)
        self.assertIn("sam3_native_reason", payload)
        self.assertIn("nudenet_native_reason", payload)
        self.assertIn("sam3_checkpoint_path", payload)
        self.assertIn("sam3_config_path", payload)
        self.assertIn("sam3_checkpoint_ready", payload)

    def test_manual_segment_endpoint(self) -> None:
        response = self.client.post(
            "/api/sam3/segment",
            json={
                "image_base64": self.image_base64,
                "points": [{"x": 128, "y": 144, "label": 1}],
                "model_size": "base",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertGreater(payload["bbox"]["width"], 0)
        self.assertTrue(payload["mask_base64"])

    def test_nsfw_detection_endpoint(self) -> None:
        response = self.client.post(
            "/api/nsfw/detect",
            json={"image_base64": self.image_base64, "threshold": 0.2},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIsInstance(payload["detections"], list)

    def test_auto_mosaic_endpoint(self) -> None:
        response = self.client.post(
            "/api/sam3/auto-mosaic",
            json={
                "image_base64": self.image_base64,
                "detections": [],
                "mosaic_type": "pixelate",
                "mosaic_strength": "medium",
                "model_size": "base",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("result_image_base64", payload)
        self.assertIsInstance(payload["masks"], list)

    def test_invalid_segment_payload_returns_422(self) -> None:
        response = self.client.post(
            "/api/sam3/segment",
            json={"image_base64": self.image_base64, "points": [], "model_size": "base"},
        )
        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "invalid_request")

    def test_runtime_config_roundtrip(self) -> None:
        get_response = self.client.get("/api/model/runtime-config")
        self.assertEqual(get_response.status_code, 200)
        initial_payload = get_response.json()
        self.assertIn("sam3_backend_preference", initial_payload)
        self.assertIn("sam3_effective_backend", initial_payload)
        self.assertIn("sam3_recommendation", initial_payload)
        self.assertIn("sam3_native_reason", initial_payload)
        self.assertIn("sam3_checkpoint_path", initial_payload)
        self.assertIn("sam3_config_path", initial_payload)
        self.assertIn("sam3_checkpoint_ready", initial_payload)

        update_response = self.client.post(
            "/api/model/runtime-config",
            json={
                "sam3_backend_preference": "heuristic",
                "nudenet_backend_preference": "native",
                "sam3_checkpoint_path": "D:/models/sam3.pt",
                "sam3_config_path": "D:/models/sam3.yaml",
            },
        )
        self.assertEqual(update_response.status_code, 200)
        updated_payload = update_response.json()
        self.assertEqual(updated_payload["sam3_backend_preference"], "heuristic")
        self.assertEqual(updated_payload["nudenet_backend_preference"], "native")
        self.assertEqual(updated_payload["sam3_checkpoint_path"], "D:/models/sam3.pt")
        self.assertEqual(updated_payload["sam3_config_path"], "D:/models/sam3.yaml")
        self.assertFalse(updated_payload["sam3_checkpoint_ready"])
        self.assertIn("nudenet_recommendation", updated_payload)
        self.assertIn("nudenet_native_reason", updated_payload)

    def test_packaged_windows_status_recommends_heuristic_for_sam3(self) -> None:
        with (
            patch.object(model_manager, "_is_packaged_runtime", return_value=True),
            patch.object(model_manager, "_is_windows_runtime", return_value=True),
            patch.object(model_manager, "_get_python_version", return_value="3.12.11"),
            patch.object(
                model_manager,
                "_get_native_reason",
                side_effect=lambda model_name: (
                    "TorchScript requires source access in order to carry out compilation"
                    if model_name == "sam3"
                    else None
                ),
            ),
            patch.object(
                model_manager,
                "_detect_native_available",
                side_effect=lambda model_name: False if model_name == "sam3" else True,
            ),
        ):
            payload = self.client.get("/api/status").json()

        self.assertIn("SAM3 native is not a reliable packaged Windows path right now.", payload["sam3_recommendation"])


if __name__ == "__main__":
    unittest.main()
