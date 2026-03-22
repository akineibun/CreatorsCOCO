from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


ModelName = Literal["sam3", "nudenet"]


class StatusResponse(BaseModel):
    sam3_loaded: bool
    nudenet_loaded: bool
    gpu_available: bool
    sam3_status: str
    sam3_progress: int
    nudenet_status: str
    nudenet_progress: int


class SegmentPoint(BaseModel):
    x: float
    y: float
    label: Literal[0, 1]


class SegmentRequest(BaseModel):
    image_base64: str
    points: list[SegmentPoint]
    model_size: Literal["base", "large"] = "base"

    @field_validator("points")
    @classmethod
    def validate_points(cls, value: list[SegmentPoint]) -> list[SegmentPoint]:
        if not value:
            raise ValueError("At least one point is required.")
        if not any(point.label == 1 for point in value):
            raise ValueError("At least one positive point is required.")
        return value


class DetectRequest(BaseModel):
    image_base64: str
    threshold: float = Field(default=0.7, ge=0.1, le=0.99)


class AutoMosaicRequest(BaseModel):
    image_base64: str
    detections: list[dict[str, Any]] = Field(default_factory=list)
    mosaic_type: Literal["pixelate", "blur", "noise"] = "pixelate"
    mosaic_strength: Literal["light", "medium", "strong"] = "medium"
    model_size: Literal["base", "large"] = "base"


class DownloadRequest(BaseModel):
    model_name: ModelName


class ModelProgressResponse(BaseModel):
    model_name: ModelName
    status: str
    progress: int


class MaskCandidate(BaseModel):
    x: float
    y: float
    width: float
    height: float
    left: float
    top: float
    right: float
    bottom: float
    confidence: float
    area_ratio: float
    mask_base64: str
    label: str
    source: str


class SegmentResponse(BaseModel):
    mask_base64: str
    status: str
    bbox: MaskCandidate
    points_used: int


class DetectionCandidate(BaseModel):
    label: str
    confidence: float
    x: float
    y: float
    width: float
    height: float
    left: float
    top: float
    right: float
    bottom: float
    area_ratio: float
    source: str
    mask_base64: str | None = None


class DetectionResponse(BaseModel):
    detections: list[DetectionCandidate]
    status: str


class AutoMosaicResponse(BaseModel):
    result_image_base64: str
    masks: list[MaskCandidate]
    status: str
