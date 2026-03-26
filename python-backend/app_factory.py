from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError

from errors import BackendError, handle_backend_error, handle_http_error, handle_validation_error
from routers.model import router as model_router
from routers.nsfw import router as nsfw_router
from routers.sam3 import router as sam3_router
from routers.status import router as status_router


def create_app() -> FastAPI:
    app = FastAPI(title="CreatorsCOCO Python Backend", version="0.3.0")
    app.add_exception_handler(BackendError, handle_backend_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(HTTPException, handle_http_error)
    app.include_router(status_router)
    app.include_router(model_router)
    app.include_router(sam3_router)
    app.include_router(nsfw_router)
    return app
