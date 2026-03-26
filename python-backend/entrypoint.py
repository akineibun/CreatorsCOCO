import os

import uvicorn

from app_factory import create_app


def main() -> None:
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("CREATORS_COCO_BACKEND_PORT", "8765")))


if __name__ == "__main__":
    main()
