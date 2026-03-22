from image_utils import (
    apply_masked_effect,
    build_prompt_mask,
    clamp,
    decode_image,
    decode_mask_base64,
    detection_mask_from_bbox,
    encode_png_base64,
    mask_candidate,
)
from model_manager import model_manager
from schemas import AutoMosaicRequest, AutoMosaicResponse, MaskCandidate, SegmentRequest, SegmentResponse
from services.nsfw_service import nsfw_service


class Sam3Service:
    def segment(self, request: SegmentRequest) -> SegmentResponse:
        model_manager.ensure_ready("sam3")
        image = decode_image(request.image_base64)
        mask = build_prompt_mask(image, request.points, request.model_size)
        candidate = mask_candidate(
            mask,
            label="manual-segment",
            source=f"sam3-{request.model_size}-heuristic",
            confidence=0.86,
        )
        return SegmentResponse(
            mask_base64=candidate.mask_base64,
            status="ok",
            bbox=candidate,
            points_used=len(request.points),
        )

    def auto_mosaic(self, request: AutoMosaicRequest) -> AutoMosaicResponse:
        model_manager.ensure_ready("sam3")
        image = decode_image(request.image_base64)
        masks: list[MaskCandidate] = []

        if request.detections:
            for index, detection in enumerate(request.detections):
                left = int(float(detection.get("left", detection.get("x", 0))))
                top = int(float(detection.get("top", detection.get("y", 0))))
                width = int(float(detection.get("width", detection.get("w", 180))))
                height = int(float(detection.get("height", detection.get("h", 120))))
                bbox = (
                    int(clamp(left, 0, image.width - 1)),
                    int(clamp(top, 0, image.height - 1)),
                    int(clamp(left + width, 1, image.width)),
                    int(clamp(top + height, 1, image.height)),
                )
                mask = detection_mask_from_bbox(image.size, bbox)
                masks.append(
                    mask_candidate(
                        mask,
                        label=f"auto-mosaic-{index + 1}",
                        source=f"sam3-{request.model_size}-from-detections",
                        confidence=0.82,
                    )
                )
        else:
            detections = nsfw_service.detect_candidate_regions(image, 0.25)
            for detection in detections[:4]:
                mask = decode_mask_base64(detection.mask_base64 or "")
                masks.append(
                    mask_candidate(
                        mask,
                        label=detection.label,
                        source=f"sam3-{request.model_size}-auto",
                        confidence=max(0.72, detection.confidence),
                    )
                )

        result_image = apply_masked_effect(image, masks, request.mosaic_type, request.mosaic_strength)
        return AutoMosaicResponse(result_image_base64=encode_png_base64(result_image), masks=masks, status="ok")


sam3_service = Sam3Service()
