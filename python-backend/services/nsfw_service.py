from PIL import Image, ImageFilter

from image_utils import decode_image, detection_mask_from_bbox, mask_candidate
from model_manager import model_manager
from schemas import DetectRequest, DetectionCandidate, DetectionResponse


class NsfwService:
    def detect(self, request: DetectRequest) -> DetectionResponse:
        model_manager.ensure_ready("nudenet")
        image = decode_image(request.image_base64)
        detections = self.detect_candidate_regions(image, request.threshold)
        return DetectionResponse(detections=detections, status="ok")

    def skin_mask(self, image: Image.Image) -> Image.Image:
        scaled = image.copy()
        scaled.thumbnail((320, 320))
        mask = Image.new("L", scaled.size, 0)
        pixels = scaled.load()
        mask_pixels = mask.load()
        for y in range(scaled.height):
            for x in range(scaled.width):
                r, g, b = pixels[x, y]
                if max(r, g, b) - min(r, g, b) < 18:
                    continue
                cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
                cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
                is_skin = r > 40 and g > 20 and b > 20 and 135 <= cr <= 180 and 85 <= cb <= 135
                if is_skin:
                    mask_pixels[x, y] = 255
        return mask.filter(ImageFilter.MedianFilter(size=5)).filter(ImageFilter.GaussianBlur(radius=2))

    def connected_components(self, mask: Image.Image, min_pixels: int = 80) -> list[tuple[int, int, int, int, int]]:
        width, height = mask.size
        pixels = mask.load()
        visited = [[False for _ in range(width)] for _ in range(height)]
        components: list[tuple[int, int, int, int, int]] = []

        for y in range(height):
            for x in range(width):
                if visited[y][x] or pixels[x, y] < 80:
                    continue

                stack = [(x, y)]
                visited[y][x] = True
                left = right = x
                top = bottom = y
                size = 0

                while stack:
                    current_x, current_y = stack.pop()
                    size += 1
                    left = min(left, current_x)
                    right = max(right, current_x)
                    top = min(top, current_y)
                    bottom = max(bottom, current_y)

                    for next_x, next_y in (
                        (current_x - 1, current_y),
                        (current_x + 1, current_y),
                        (current_x, current_y - 1),
                        (current_x, current_y + 1),
                    ):
                        if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                            continue
                        if visited[next_y][next_x] or pixels[next_x, next_y] < 80:
                            continue
                        visited[next_y][next_x] = True
                        stack.append((next_x, next_y))

                if size >= min_pixels:
                    components.append((left, top, right + 1, bottom + 1, size))

        return components

    def detect_candidate_regions(self, image: Image.Image, threshold: float) -> list[DetectionCandidate]:
        mask = self.skin_mask(image)
        components = self.connected_components(mask)
        scale_x = image.width / mask.width
        scale_y = image.height / mask.height
        detections: list[DetectionCandidate] = []

        sorted_components = sorted(components, key=lambda item: item[4], reverse=True)[:6]
        for index, (left, top, right, bottom, size) in enumerate(sorted_components):
            scaled_bbox = (
                int(left * scale_x),
                int(top * scale_y),
                int(right * scale_x),
                int(bottom * scale_y),
            )
            bbox_mask = detection_mask_from_bbox(image.size, scaled_bbox)
            candidate = mask_candidate(
                bbox_mask,
                label="nsfw-region",
                source="heuristic-skin-detector",
                confidence=min(0.98, 0.45 + size / max(1, mask.width * mask.height) * 6.5),
            )
            if candidate.confidence < threshold:
                continue
            detections.append(
                DetectionCandidate(
                    label=f"nsfw-region-{index + 1}",
                    confidence=candidate.confidence,
                    x=candidate.x,
                    y=candidate.y,
                    width=candidate.width,
                    height=candidate.height,
                    left=candidate.left,
                    top=candidate.top,
                    right=candidate.right,
                    bottom=candidate.bottom,
                    area_ratio=candidate.area_ratio,
                    source=candidate.source,
                    mask_base64=candidate.mask_base64,
                )
            )

        return detections


nsfw_service = NsfwService()
