# Portable Smoke Test

Use this when validating `release/CreatorsCOCO 1.0.0.exe` on another folder or another PC.

1. Copy the portable exe into a clean writable folder.
2. Launch it and wait for the first unpack/run cycle to finish.
3. Open the backend panel and confirm it no longer shows the unavailable state.
4. Load the sample image.
5. Run `SAM3 auto mosaic` once.
6. Run `NSFW detection` once.
7. Save the project once and reopen the app.
8. Confirm the recent project entry and the restored page still appear.

Expected result:

- the backend starts without extra setup
- sample editing works
- backend review actions respond
- save and restore still work after a relaunch
