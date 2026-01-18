const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Holesail = require('holesail'); 
const instances = {};

function createWindow() {
  const win = new BrowserWindow({
    width: 900, height: 750, backgroundColor: '#1e1e1e',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true
  });
  win.loadFile('index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('start-holesail', async (event, { tabId, mode, config }) => {
  try {
    if (instances[tabId]) throw new Error('Instance running');
    let hsOpts = { host: config.host || '0.0.0.0', log: false };
    
    if (mode === 'server') {
        hsOpts.server = true;
        hsOpts.port = parseInt(config.port);
        hsOpts.secure = config.secure;
        // Handle custom key logic
        if (config.customKey && config.customKey.trim() !== '') {
           hsOpts.key = config.customKey.trim();
        }
    } else {
        hsOpts.client = true;
        hsOpts.key = config.connectionString;
        hsOpts.port = parseInt(config.port);
    }
    
    console.log('Starting Holesail...', hsOpts);
    const hs = new Holesail(hsOpts);
    instances[tabId] = hs;
    
    await hs.ready();
    
    // Ensure we send back the correct connection URL
    return { success: true, info: hs.info };
  } catch (error) {
    console.error(error);
    if(instances[tabId]) delete instances[tabId];
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-holesail', async (event, tabId) => {
  if (instances[tabId]) {
      // Attempt close methods based on API availability
      try {
        if(instances[tabId].close) await instances[tabId].close();
        else if(instances[tabId].destroy) await instances[tabId].destroy();
        else if(instances[tabId]._close) await instances[tabId]._close();
      } catch(e) { console.error('Error closing:', e); }
      
      delete instances[tabId];
      return { success: true };
  }
  return { success: false };
});
