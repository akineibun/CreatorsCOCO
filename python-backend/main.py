import asyncio
import json

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


app = FastAPI(title="CreatorsCOCO Python Backend")
MODEL_PROGRESS: dict[str, dict] = {
    "sam3": {"status": "idle", "progress": 0},
    "nudenet": {"status": "idle", "progress": 0},
}


class StatusResponse(BaseModel):
    sam3_loaded: bool
    nudenet_loaded: bool
    gpu_available: bool
    sam3_status: str
    sam3_progress: int
    nudenet_status: str
    nudenet_progress: int


class SegmentRequest(BaseModel):
    image_base64: str
    points: list[dict]
    model_size: str = "base"


class DetectRequest(BaseModel):
    image_base64: str
    threshold: float = 0.7


class AutoMosaicRequest(BaseModel):
    image_base64: str
    detections: list[dict]
    mosaic_type: str
    mosaic_strength: str
    model_size: str = "base"


class DownloadRequest(BaseModel):
    model_name: str


@app.get("/api/status", response_model=StatusResponse)
def get_status() -> StatusResponse:
    return StatusResponse(
        sam3_loaded=MODEL_PROGRESS["sam3"]["progress"] >= 100,
        nudenet_loaded=MODEL_PROGRESS["nudenet"]["progress"] >= 100,
        gpu_available=False,
        sam3_status=MODEL_PROGRESS["sam3"]["status"],
        sam3_progress=MODEL_PROGRESS["sam3"]["progress"],
        nudenet_status=MODEL_PROGRESS["nudenet"]["status"],
        nudenet_progress=MODEL_PROGRESS["nudenet"]["progress"],
    )


@app.post("/api/sam3/segment")
def segment(_request: SegmentRequest) -> dict:
    return {"mask_base64": "", "status": "stub"}


@app.post("/api/nsfw/detect")
def detect(_request: DetectRequest) -> dict:
    return {"detections": [], "status": "stub"}


@app.post("/api/sam3/auto-mosaic")
def auto_mosaic(_request: AutoMosaicRequest) -> dict:
    return {"result_image_base64": "", "masks": [], "status": "stub"}


@app.post("/api/model/download")
def download_model(request: DownloadRequest) -> dict:
    MODEL_PROGRESS[request.model_name] = {"status": "queued", "progress": 0}
    return {"model_name": request.model_name, "status": "queued", "progress": 0}


@app.get("/api/model/progress/{model_name}")
def get_model_progress(model_name: str) -> dict:
    state = MODEL_PROGRESS.get(model_name, {"status": "idle", "progress": 0})
    if state["progress"] < 100:
        next_progress = min(100, state["progress"] + 25)
        next_status = "completed" if next_progress >= 100 else "downloading"
        state = {"status": next_status, "progress": next_progress}
        MODEL_PROGRESS[model_name] = state

    return {"model_name": model_name, **state}


@app.get("/api/model/progress/stream/{model_name}")
async def stream_model_progress(model_name: str) -> StreamingResponse:
    async def event_generator():
        state = MODEL_PROGRESS.get(model_name, {"status": "idle", "progress": 0})

        if state["status"] == "idle":
            state = {"status": "queued", "progress": 0}
            MODEL_PROGRESS[model_name] = state

        while True:
            yield f"data: {json.dumps({'model_name': model_name, **state})}\n\n"

            if state["progress"] >= 100:
                break

            await asyncio.sleep(0.25)
            next_progress = min(100, state["progress"] + 25)
            next_status = "completed" if next_progress >= 100 else "downloading"
            state = {"status": next_status, "progress": next_progress}
            MODEL_PROGRESS[model_name] = state

    return StreamingResponse(event_generator(), media_type="text/event-stream")
