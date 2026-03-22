import base64
import io
import os
import sys
import unittest

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app


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


if __name__ == "__main__":
    unittest.main()
