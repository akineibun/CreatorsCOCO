import os

import uvicorn

from app_factory import create_app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("CREATORS_COCO_BACKEND_PORT", "8765")))
