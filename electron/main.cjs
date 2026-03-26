const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const packageJson = require('../package.json')
const { BACKEND_URL, startPythonServer, stopPythonServer } = require('./python-manager.cjs')
const Store = require('electron-store')

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

const store = new Store()

ipcMain.handle('project:save', (_, data) => { store.set('project', data) })
ipcMain.handle('project:load', () => store.get('project') ?? null)
ipcMain.handle('recent-projects:save', (_, data) => { store.set('recentProjects', data) })
ipcMain.handle('recent-projects:load', () => store.get('recentProjects') ?? [])

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
