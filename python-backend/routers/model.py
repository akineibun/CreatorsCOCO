import asyncio
import json
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from model_manager import model_manager
from schemas import DownloadRequest, ModelName, ModelProgressResponse


router = APIRouter(tags=["model"])


@router.post("/api/model/download", response_model=ModelProgressResponse)
def download_model(request: DownloadRequest) -> ModelProgressResponse:
    state = model_manager.request_download(request.model_name)
    return ModelProgressResponse(model_name=request.model_name, status=state.status, progress=state.progress)


@router.get("/api/model/progress/{model_name}", response_model=ModelProgressResponse)
def get_model_progress(model_name: ModelName) -> ModelProgressResponse:
    return model_manager.get_progress(model_name)


@router.get("/api/model/progress/stream/{model_name}")
async def stream_model_progress(model_name: ModelName) -> StreamingResponse:
    async def event_generator() -> Any:
        while True:
            payload = model_manager.get_stream_payload(model_name)
            is_ready = payload["progress"] >= 100
            yield f"data: {json.dumps(payload)}\n\n"
            if is_ready:
                break
            await asyncio.sleep(0.25)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
