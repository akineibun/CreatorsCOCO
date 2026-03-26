from fastapi import APIRouter

from model_manager import model_manager
from schemas import StatusResponse


router = APIRouter(tags=["status"])


@router.get("/api/status", response_model=StatusResponse)
def get_status() -> StatusResponse:
    return model_manager.get_status()
