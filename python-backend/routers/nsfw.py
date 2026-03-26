from fastapi import APIRouter

from schemas import DetectRequest, DetectionResponse
from services.nsfw_service import nsfw_service


router = APIRouter(tags=["nsfw"])


@router.post("/api/nsfw/detect", response_model=DetectionResponse)
def detect(request: DetectRequest) -> DetectionResponse:
    return nsfw_service.detect(request)
