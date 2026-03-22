const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const BACKEND_PORT = 8765
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`

let pythonProcess = null

const getSourceBackendDir = () => path.join(__dirname, '..', 'python-backend')
const getResourcesBackendDir = () =>
  process.resourcesPath ? path.join(process.resourcesPath, 'python-backend') : null
const getBackendSearchRoots = () => [getSourceBackendDir(), getResourcesBackendDir()].filter(Boolean)
const getBackendEntry = () =>
  getBackendSearchRoots()
    .map((backendDir) => path.join(backendDir, 'main.py'))
    .find((candidate) => fs.existsSync(candidate)) ?? path.join(getSourceBackendDir(), 'main.py')
const getBackendDir = () => path.dirname(getBackendEntry())
const getPackagedBackendEntry = () => {
  const candidates = getBackendSearchRoots().flatMap((backendDir) => [
    path.join(backendDir, 'dist', 'CreatorsCOCOBackend.exe'),
    path.join(backendDir, 'dist', 'creatorscoco-backend.exe'),
    path.join(backendDir, 'dist', 'CreatorsCOCOBackend', 'CreatorsCOCOBackend.exe'),
  ])

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

const getLocalVenvPython = () => {
  const candidates = getBackendSearchRoots().flatMap((backendDir) =>
    process.platform === 'win32'
      ? [
          path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
          path.join(backendDir, 'venv', 'Scripts', 'python.exe'),
        ]
      : [
          path.join(backendDir, '.venv', 'bin', 'python'),
          path.join(backendDir, 'venv', 'bin', 'python'),
        ],
  )

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

const resolvePythonExecutable = () =>
  process.env.CREATORS_COCO_PYTHON ?? getLocalVenvPython() ?? 'python'

const startPythonServer = () => {
  if (pythonProcess) {
    return BACKEND_URL
  }

  const backendEntry = getBackendEntry()
  const packagedBackendEntry = getPackagedBackendEntry()
  if (!packagedBackendEntry && !fs.existsSync(backendEntry)) {
    return BACKEND_URL
  }

  if (packagedBackendEntry) {
    pythonProcess = spawn(packagedBackendEntry, [], {
      cwd: path.dirname(packagedBackendEntry),
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        CREATORS_COCO_BACKEND_PORT: String(BACKEND_PORT),
      },
    })
  } else {
    const backendDir = path.dirname(backendEntry)
    const pythonExecutable = resolvePythonExecutable()

    pythonProcess = spawn(
      pythonExecutable,
      ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
      {
        cwd: backendDir,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          CREATORS_COCO_BACKEND_PORT: String(BACKEND_PORT),
        },
      },
    )
  }

  pythonProcess.on('exit', () => {
    pythonProcess = null
  })

  return BACKEND_URL
}

const stopPythonServer = () => {
  if (!pythonProcess) {
    return
  }

  pythonProcess.kill()
  pythonProcess = null
}

module.exports = {
  BACKEND_URL,
  startPythonServer,
  stopPythonServer,
}
