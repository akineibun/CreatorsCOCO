const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const BACKEND_PORT = 8765
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`

let pythonProcess = null

const getBackendEntry = () => path.join(__dirname, '..', 'python-backend', 'main.py')

const startPythonServer = () => {
  if (pythonProcess) {
    return BACKEND_URL
  }

  const backendEntry = getBackendEntry()
  if (!fs.existsSync(backendEntry)) {
    return BACKEND_URL
  }

  const backendDir = path.dirname(backendEntry)
  const pythonExecutable = process.env.CREATORS_COCO_PYTHON ?? 'python'

  pythonProcess = spawn(
    pythonExecutable,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd: backendDir,
      stdio: 'ignore',
      windowsHide: true,
    },
  )

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
