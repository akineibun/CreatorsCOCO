const { contextBridge } = require('electron')

const backendUrlArgument =
  process.argv.find((argument) => argument.startsWith('--creators-coco-backend-url=')) ?? ''
const backendUrl = backendUrlArgument.replace('--creators-coco-backend-url=', '') || 'http://127.0.0.1:8765'
const appVersionArgument =
  process.argv.find((argument) => argument.startsWith('--creators-coco-app-version=')) ?? ''
const appVersion = appVersionArgument.replace('--creators-coco-app-version=', '') || '1.0.0'

contextBridge.exposeInMainWorld('creatorsCoco', {
  platform: process.platform,
  backendUrl,
  appVersion,
})
