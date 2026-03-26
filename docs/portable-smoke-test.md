# Portable Smoke Test

Use this when validating `release/CreatorsCOCO 1.0.0.exe` on another folder or another PC.

Quick local helper:

```powershell
npm run smoke:portable
```

That copies the portable exe into a temp smoke directory, launches it, polls `/api/status`, and writes `portable-smoke-report.json`.
You can later import that JSON file from `Help -> Portable Smoke Test` to sync the in-app smoke checklist and release readiness view.

1. Copy the portable exe into a clean writable folder.
2. Launch it and wait for the first unpack/run cycle to finish.
3. Open the backend panel and confirm it no longer shows the unavailable state.
4. Open `Help` and confirm the backend runtime block shows:
   - `Portable packaged`
   - the active Python version
   - `SAM3` and `NudeNet` capability labels such as `native` or `heuristic`
5. Load the sample image.
6. Run `SAM3 auto mosaic` once.
7. Run `NSFW detection` once.
8. Save the project once and reopen the app.
9. Confirm the recent project entry and the restored page still appear.
10. Re-open `Help` and confirm `Recent performance` shows timing entries for recent actions.
11. If the machine is slower than expected, adjust the Help dialog performance thresholds instead of treating every run as a failure.
12. If you have optional native dependencies installed, use `Apply backend strategy` to verify `auto` vs `native` vs `heuristic`.
13. If you used the smoke helper script, import `portable-smoke-report.json` back into Help so the tester machine result is preserved in diagnostics/handoff exports.

Optional native prep before the smoke test:

- install native dependencies with `npm run backend:install-native`
- confirm Help shows `native available` before forcing `native`
- on Python 3.14.3, expect NudeNet to go native first while SAM3 may remain heuristic unless you prepare a dedicated 3.12 toolchain/checkpoint environment

Expected result:

- the backend starts without extra setup
- backend runtime/capability labels match the packaged environment
- sample editing works
- backend review actions respond
- save and restore still work after a relaunch

Smoke helper report fields:

- generated timestamp
- copied exe path
- exe SHA-256 hash
- exe size and file version
- smoke root folder
- startup timeout
- status URL
- whether the exe launch itself was blocked
- whether backend status became available
- last timeout/error message and the returned backend status payload
