const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const packageJson = require('../package.json')
const { BACKEND_URL, startPythonServer, stopPythonServer } = require('./python-manager.cjs')

// ── Simple JSON file store (electron-store@10 is ESM-only, incompatible with CJS) ──
const getStoreFile = () => path.join(app.getPath('userData'), 'creatorscoco-store.json')

const readStore = () => {
  try { return JSON.parse(fs.readFileSync(getStoreFile(), 'utf8')) } catch { return {} }
}

const writeStore = (data) => {
  try {
    const f = getStoreFile()
    if (!fs.existsSync(path.dirname(f))) fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, JSON.stringify(data), 'utf8')
  } catch (err) { console.error('store write error', err) }
}

ipcMain.handle('project:save', (_, data) => { writeStore({ ...readStore(), project: data }) })
ipcMain.handle('project:load', () => readStore().project ?? null)
ipcMain.handle('recent-projects:save', (_, data) => { writeStore({ ...readStore(), recentProjects: data }) })
ipcMain.handle('recent-projects:load', () => readStore().recentProjects ?? [])

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#14110f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: [
        `--creators-coco-backend-url=${BACKEND_URL}`,
        `--creators-coco-app-version=${packageJson.version}`,
      ],
    },
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  if (rendererUrl) {
    window.loadURL(rendererUrl)
    window.webContents.openDevTools({ mode: 'detach' })
    return
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}


app.whenReady().then(() => {
  startPythonServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopPythonServer()
    app.quit()
  }
})
