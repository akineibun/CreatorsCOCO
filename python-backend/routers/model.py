import asyncio
import json
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from model_manager import model_manager
from schemas import (
    DownloadRequest,
    ModelName,
    ModelProgressResponse,
    RuntimeConfigResponse,
    RuntimeConfigUpdateRequest,
)


router = APIRouter(tags=["model"])


@router.post("/api/model/download", response_model=ModelProgressResponse)
def download_model(request: DownloadRequest) -> ModelProgressResponse:
    state = model_manager.request_download(request.model_name)
    return ModelProgressResponse(model_name=request.model_name, status=state.status, progress=state.progress)


@router.get("/api/model/progress/{model_name}", response_model=ModelProgressResponse)
def get_model_progress(model_name: ModelName) -> ModelProgressResponse:
    return model_manager.get_progress(model_name)


@router.get("/api/model/runtime-config", response_model=RuntimeConfigResponse)
def get_runtime_config() -> RuntimeConfigResponse:
    return model_manager.get_runtime_config()


@router.post("/api/model/runtime-config", response_model=RuntimeConfigResponse)
def update_runtime_config(request: RuntimeConfigUpdateRequest) -> RuntimeConfigResponse:
    return model_manager.update_runtime_config(
        sam3_backend_preference=request.sam3_backend_preference,
        nudenet_backend_preference=request.nudenet_backend_preference,
        sam3_checkpoint_path=request.sam3_checkpoint_path,
        sam3_config_path=request.sam3_config_path,
    )


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
