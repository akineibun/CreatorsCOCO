# SAM3 Checkpoints

Put native SAM3 files here when using the Python 3.12 native environment.

Recommended filenames:

- `sam3.pt` or `sam3.pth` for the checkpoint
- `sam3.yaml` for the optional config

CreatorsCOCO now auto-discovers these files from `python-backend/models/sam3/` if
`CREATORS_COCO_SAM3_CHECKPOINT` and `CREATORS_COCO_SAM3_CONFIG` are not set.
