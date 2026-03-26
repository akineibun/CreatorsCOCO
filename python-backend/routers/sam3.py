from fastapi import APIRouter

from schemas import AutoMosaicRequest, AutoMosaicResponse, SegmentRequest, SegmentResponse
from services.sam3_service import sam3_service


router = APIRouter(tags=["sam3"])


@router.post("/api/sam3/segment", response_model=SegmentResponse)
def segment(request: SegmentRequest) -> SegmentResponse:
    return sam3_service.segment(request)


@router.post("/api/sam3/auto-mosaic", response_model=AutoMosaicResponse)
def auto_mosaic(request: AutoMosaicRequest) -> AutoMosaicResponse:
    return sam3_service.auto_mosaic(request)
