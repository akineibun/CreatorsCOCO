# Project Schema

CreatorsCOCO stores the current workspace snapshot in browser storage under `creators-coco.project`.

## Current schema

- schema version: `1`
- storage key: `creators-coco.project`
- recent projects key: `creators-coco.recent-projects`
- performance metrics key: `creators-coco.performance-metrics`
- performance thresholds key: `creators-coco.performance-thresholds`

## Migration policy

CreatorsCOCO uses forward-only normalization when a stored snapshot is restored.

- `v0 -> v1`
  - add `schemaVersion`
  - normalize `outputSettings.resizeFitMode`
  - normalize `outputSettings.resizeBackgroundMode`
  - normalize `outputSettings.qualityMode`
  - rewrite the migrated snapshot back to storage

If a future version is added, append a new migration step instead of rewriting the old logic in place.

## Compatibility notes

- snapshots without `schemaVersion` are treated as `v0`
- restored projects are normalized to the latest schema before the editor uses them
- portable builds and dev builds share the same schema contract at the renderer storage layer
