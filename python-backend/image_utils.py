import base64
import io

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from errors import BackendError
from schemas import MaskCandidate, SegmentPoint


def strip_data_prefix(value: str) -> str:
    return value.split(",", 1)[1] if value.startswith("data:") and "," in value else value


def decode_image(image_base64: str) -> Image.Image:
    try:
        raw = base64.b64decode(strip_data_prefix(image_base64))
        image = Image.open(io.BytesIO(raw))
        return image.convert("RGB")
    except Exception as exc:  # pragma: no cover - defensive
        raise BackendError("invalid_image", "Image payload could not be decoded.", 400, {"reason": str(exc)}) from exc


def encode_png_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def decode_mask_base64(mask_base64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(mask_base64))).convert("L")


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def mask_bbox(mask: Image.Image) -> tuple[int, int, int, int] | None:
    return mask.getbbox()


def mask_candidate(mask: Image.Image, label: str, source: str, confidence: float) -> MaskCandidate:
    bbox = mask_bbox(mask)
    if bbox is None:
        raise BackendError("empty_mask", "Mask generation produced an empty result.", 422)

    left, top, right, bottom = bbox
    width = max(1, right - left)
    height = max(1, bottom - top)
    total_pixels = mask.width * mask.height
    non_zero = sum(1 for value in mask.getdata() if value > 0)
    return MaskCandidate(
        x=left + width / 2,
        y=top + height / 2,
        width=width,
        height=height,
        left=left,
        top=top,
        right=right,
        bottom=bottom,
        confidence=round(clamp(confidence, 0.01, 0.99), 3),
        area_ratio=round(non_zero / max(1, total_pixels), 5),
        mask_base64=encode_png_base64(mask),
        label=label,
        source=source,
    )


def build_prompt_mask(image: Image.Image, points: list[SegmentPoint], model_size: str) -> Image.Image:
    base_mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(base_mask)
    min_dim = min(image.size)
    base_radius = max(28, int(min_dim * (0.06 if model_size == "base" else 0.085)))

    for point in points:
        radius = base_radius if point.label == 1 else max(18, int(base_radius * 0.65))
        box = (
            int(point.x - radius),
            int(point.y - radius),
            int(point.x + radius),
            int(point.y + radius),
        )
        if point.label == 1:
            draw.ellipse(box, fill=220)
        else:
            draw.ellipse(box, fill=0)

    mask = base_mask.filter(ImageFilter.GaussianBlur(radius=max(8, base_radius // 3)))

    positive_mask = Image.new("L", image.size, 0)
    positive_draw = ImageDraw.Draw(positive_mask)
    negative_mask = Image.new("L", image.size, 0)
    negative_draw = ImageDraw.Draw(negative_mask)
    for point in points:
        radius = base_radius if point.label == 1 else max(18, int(base_radius * 0.85))
        box = (
            int(point.x - radius),
            int(point.y - radius),
            int(point.x + radius),
            int(point.y + radius),
        )
        if point.label == 1:
            positive_draw.ellipse(box, fill=255)
        else:
            negative_draw.ellipse(box, fill=255)

    positive_mask = positive_mask.filter(ImageFilter.GaussianBlur(radius=max(10, base_radius // 2)))
    negative_mask = negative_mask.filter(ImageFilter.GaussianBlur(radius=max(6, base_radius // 4)))
    refined = ImageChops.subtract(ImageChops.screen(mask, positive_mask), negative_mask)
    return refined.point(lambda value: 255 if value >= 32 else 0)


def pixelate_region(image: Image.Image, bbox: tuple[int, int, int, int], strength: str) -> Image.Image:
    scale_map = {"light": 16, "medium": 10, "strong": 6}
    left, top, right, bottom = bbox
    region = image.crop((left, top, right, bottom))
    downsample = scale_map[strength]
    reduced = region.resize(
        (max(1, region.width // downsample), max(1, region.height // downsample)),
        Image.Resampling.BILINEAR,
    )
    return reduced.resize(region.size, Image.Resampling.NEAREST)


def noise_region(image: Image.Image, bbox: tuple[int, int, int, int], strength: str) -> Image.Image:
    step_map = {"light": 12, "medium": 8, "strong": 5}
    left, top, right, bottom = bbox
    region = image.crop((left, top, right, bottom)).copy()
    draw = ImageDraw.Draw(region)
    step = step_map[strength]
    for y in range(0, region.height, step):
        for x in range(0, region.width, step):
            intensity = (x * 17 + y * 29) % 255
            fill = (intensity, 255 - intensity, (intensity * 3) % 255)
            draw.rectangle((x, y, min(region.width, x + step), min(region.height, y + step)), fill=fill)
    return region


def apply_masked_effect(image: Image.Image, masks: list[MaskCandidate], effect: str, strength: str) -> Image.Image:
    output = image.copy()
    for candidate in masks:
        bbox = (int(candidate.left), int(candidate.top), int(candidate.right), int(candidate.bottom))
        if effect == "blur":
            effected = image.crop(bbox).filter(
                ImageFilter.GaussianBlur(radius={"light": 6, "medium": 10, "strong": 16}[strength])
            )
        elif effect == "noise":
            effected = noise_region(image, bbox, strength)
        else:
            effected = pixelate_region(image, bbox, strength)

        mask_image = decode_mask_base64(candidate.mask_base64)
        output.paste(effected, mask=mask_image.crop(bbox))
    return output


def detection_mask_from_bbox(image_size: tuple[int, int], bbox: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", image_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(bbox, radius=max(12, min(image_size) // 32), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(radius=max(4, min(image_size) // 96))).point(
        lambda value: 255 if value >= 24 else 0
    )
