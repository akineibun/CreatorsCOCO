const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('creatorsCoco', {
  platform: process.platform,
})
