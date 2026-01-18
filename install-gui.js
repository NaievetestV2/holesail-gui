const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, 'holesail-gui');

// Create directory if it doesn't exist
if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir);
    console.log(`Created directory: ${rootDir}`);
}

const files = {
    'package.json': JSON.stringify({
        "name": "holesail-gui",
        "version": "1.0.0",
        "description": "Holesail GUI",
        "main": "main.js",
        "scripts": {
            "start": "electron .",
            "build": "electron-builder"
        },
        "dependencies": {
            "holesail": "latest" 
        },
        "devDependencies": {
            "electron": "^28.0.0",
            "electron-builder": "^24.9.1"
        },
        "build": {
            "appId": "com.holesail.gui",
            "productName": "Holesail",
            "win": { "target": "nsis" },
            "linux": { "target": "AppImage", "category": "Network" }
        }
    }, null, 2),

    'main.js': `const { app, BrowserWindow, ipcMain, shell } = require('electron');
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
});`,

    'preload.js': `const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  start: (data) => ipcRenderer.invoke('start-holesail', data),
  stop: (tabId) => ipcRenderer.invoke('stop-holesail', tabId),
  clipboard: (text) => navigator.clipboard.writeText(text)
});`,

    'styles.css': `
:root { --bg-dark: #1e1e1e; --accent: #007acc; --text: #d4d4d4; --success: #4ec9b0; }
body { font-family: 'Segoe UI', sans-serif; background: var(--bg-dark); color: var(--text); margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden;}
#tabs-container { display: flex; background: #2d2d2d; height: 40px; align-items: center; padding-left:10px; -webkit-app-region: drag; border-bottom: 1px solid #333;}
.tab { padding: 8px 15px; background: #2d2d2d; cursor: pointer; border-right: 1px solid #3e3e42; font-size: 0.9em; -webkit-app-region: no-drag; display:flex; align-items:center; gap:8px;}
.tab:hover { background: #333; }
.tab.active { background: var(--bg-dark); border-top: 2px solid var(--accent); }
.tab .close { font-weight:bold; padding:0 5px; border-radius:50%; }
.tab .close:hover { background: #555; }
#add-tab { padding: 5px 12px; cursor: pointer; -webkit-app-region: no-drag; font-size: 1.2em; font-weight:bold; }
#add-tab:hover { color: white; }
#content-container { flex: 1; padding: 20px; overflow-y: auto; }
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
.control-group { background: #252526; padding: 25px; border-radius: 8px; border: 1px solid #3e3e42; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
label { display:block; margin-top:15px; color:#aaa; font-size:0.9em; margin-bottom:5px; }
input[type="text"], input[type="number"] { width: 100%; padding: 10px; background: #3c3c3c; border: 1px solid #3e3e42; color: white; border-radius:4px; box-sizing: border-box; }
input:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
.mode-switch { display: flex; margin-bottom: 25px; background:#333; padding:4px; border-radius:6px; width:fit-content;}
.mode-btn { padding: 8px 25px; cursor: pointer; border-radius: 4px; transition:0.2s; }
.mode-btn.active { background: var(--accent); color: white; font-weight:bold; }
.hidden { display: none; }
.actions { margin-top: 25px; display:flex; gap:10px; }
button.action-btn { padding: 10px 25px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size:1em; transition:0.2s;}
.btn-start { background: #388e3c; color: white; } .btn-start:hover { background: #2e7d32; }
.btn-stop { background: #d32f2f; color: white; } .btn-stop:hover { background: #b71c1c; }
.btn-stop:disabled { background: #444; color:#888; cursor:not-allowed; }
.status-box { margin-top: 20px; background: #111; padding: 15px; border-radius: 4px; font-family: 'Consolas', monospace; border: 1px solid #333; }
.url-display { color: var(--success); word-break: break-all; user-select:text; }
.copy-btn { background: transparent; border: 1px solid #555; color: #aaa; cursor: pointer; padding: 2px 8px; border-radius: 4px; margin-left: 10px; font-size: 0.8em; }
.copy-btn:hover { border-color: var(--accent); color: var(--accent); }
`,

    'index.html': `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Holesail</title><link rel="stylesheet" href="styles.css"></head>
<body>
    <div id="tabs-container"><div id="add-tab">+</div></div>
    <div id="content-container"></div>
    
    <template id="tab-template">
        <div class="control-group">
            <div class="mode-switch">
                <div class="mode-btn active" data-mode="server">Server Mode</div>
                <div class="mode-btn" data-mode="client">Client Mode</div>
            </div>
            
            <div class="server-inputs">
                <label>Port to Share (Local Application)</label>
                <input type="number" class="inp-port" placeholder="e.g. 3000">
                
                <label>Host (Optional)</label>
                <input type="text" class="inp-host" value="0.0.0.0">
                
                <label>Custom Key (Optional)</label>
                <input type="text" class="inp-key" placeholder="Leave empty to generate new">
                
                <label style="display:flex; align-items:center; gap:10px; margin-top:15px; cursor:pointer;">
                    <input type="checkbox" class="inp-secure"> Secure Mode (Encrypted)
                </label>
            </div>
            
            <div class="client-inputs hidden">
                <label>Holesail Connection Key/URL</label>
                <input type="text" class="inp-conn-string" placeholder="hs://...">
                
                <label>Bind to Local Port</label>
                <input type="number" class="inp-bind-port" placeholder="e.g. 8080">
                
                <label>Host (Optional)</label>
                <input type="text" class="inp-client-host" value="0.0.0.0">
            </div>
            
            <div class="actions">
                <button class="action-btn btn-start">Start Holesail</button>
                <button class="action-btn btn-stop" disabled>Stop</button>
            </div>
        </div>
        
        <div class="status-box hidden">
            <div style="margin-bottom:5px">Status: <span style="color:#4ec9b0">● Live</span></div>
            <div class="url-row hidden" style="display:flex; align-items:center; justify-content:space-between; margin-top:10px; border-top:1px solid #333; padding-top:10px;">
                <span class="url-display"></span> 
                <button class="copy-btn">Copy URL</button>
            </div>
        </div>
    </template>
    
    <script src="renderer.js"></script>
</body>
</html>`,

    'renderer.js': `let tabCounter = 0;
document.getElementById('add-tab').addEventListener('click', createTab);

function createTab() {
    tabCounter++; 
    const tabId = 'tab-' + tabCounter;
    
    // Create Tab Header
    const tabHeader = document.createElement('div'); 
    tabHeader.className = 'tab active';
    tabHeader.innerHTML = 'Connection ' + tabCounter + ' <span class="close">×</span>';
    tabHeader.dataset.target = tabId;
    
    // Create Content
    const content = document.getElementById('tab-template').content.cloneNode(true);
    const contentDiv = document.createElement('div'); 
    contentDiv.className = 'tab-content active'; 
    contentDiv.id = tabId;
    contentDiv.appendChild(content);

    // Append to DOM
    document.getElementById('tabs-container').insertBefore(tabHeader, document.getElementById('add-tab'));
    document.getElementById('content-container').appendChild(contentDiv);
    
    selectTab(tabId);
    
    // Header Events
    tabHeader.addEventListener('click', (e) => { 
        if(e.target.className !== 'close') selectTab(tabId); 
    });
    
    tabHeader.querySelector('.close').addEventListener('click', async () => { 
        await window.api.stop(tabId); 
        tabHeader.remove(); 
        contentDiv.remove();
        // Select last available tab
        const tabs = document.querySelectorAll('.tab');
        if(tabs.length > 0) selectTab(tabs[tabs.length-1].dataset.target);
    });
    
    attachLogic(contentDiv, tabId);
}

function selectTab(id) {
    document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
    const header = document.querySelector('.tab[data-target="'+id+'"]');
    const content = document.getElementById(id);
    if(header) header.classList.add('active');
    if(content) content.classList.add('active');
}

function attachLogic(el, id) {
    let mode = 'server';
    const sInp = el.querySelector('.server-inputs');
    const cInp = el.querySelector('.client-inputs');
    const statusBox = el.querySelector('.status-box');
    const urlRow = el.querySelector('.url-row');
    const btnStart = el.querySelector('.btn-start');
    const btnStop = el.querySelector('.btn-stop');

    // Mode Switching
    el.querySelector('[data-mode="server"]').onclick = (e) => { 
        mode='server'; 
        sInp.classList.remove('hidden'); 
        cInp.classList.add('hidden'); 
        e.target.classList.add('active'); 
        el.querySelector('[data-mode="client"]').classList.remove('active'); 
    };
    
    el.querySelector('[data-mode="client"]').onclick = (e) => { 
        mode='client'; 
        cInp.classList.remove('hidden'); 
        sInp.classList.add('hidden'); 
        e.target.classList.add('active'); 
        el.querySelector('[data-mode="server"]').classList.remove('active'); 
    };
    
    // Start Action
    btnStart.onclick = async () => {
        const config = { 
            port: mode==='server' ? el.querySelector('.inp-port').value : el.querySelector('.inp-bind-port').value,
            host: mode==='server' ? el.querySelector('.inp-host').value : el.querySelector('.inp-client-host').value,
            customKey: el.querySelector('.inp-key').value, 
            secure: el.querySelector('.inp-secure').checked,
            connectionString: el.querySelector('.inp-conn-string').value
        };

        // Basic Validation
        if(!config.port) return alert('Port is required');
        if(mode === 'client' && !config.connectionString) return alert('Connection string is required');

        // UI Loading State
        btnStart.disabled = true; 
        btnStart.innerText = 'Starting...';
        
        // Call Main Process
        const res = await window.api.start({ tabId: id, mode, config });
        
        if(res.success) {
            btnStop.disabled = false; 
            statusBox.classList.remove('hidden'); 
            btnStart.innerText = 'Running';
            
            if(mode === 'server' && res.info.url) {
                urlRow.classList.remove('hidden');
                el.querySelector('.url-display').innerText = res.info.url;
            } else {
                urlRow.classList.add('hidden');
            }
        } else { 
            alert('Error: ' + res.error); 
            btnStart.disabled = false; 
            btnStart.innerText = 'Start Holesail'; 
        }
    };
    
    // Stop Action
    btnStop.onclick = async () => { 
        await window.api.stop(id); 
        btnStop.disabled = true; 
        btnStart.disabled = false; 
        btnStart.innerText = 'Start Holesail';
        statusBox.classList.add('hidden'); 
    };
    
    // Copy Action
    el.querySelector('.copy-btn').onclick = function() {
        window.api.clipboard(el.querySelector('.url-display').innerText);
        const original = this.innerText;
        this.innerText = 'Copied!';
        setTimeout(() => this.innerText = original, 1000);
    };
}

// Initialize with one tab
createTab();`
};

for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(rootDir, name), content);
    console.log(`Created file: ${name}`);
}

console.log('\n✅ Project files generated successfully in /holesail-gui');
console.log('Installing dependencies (holesail @latest)...');

try {
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n🎉 Done! To start the app, run:');
    console.log(`cd holesail-gui`);
    console.log(`npm start`);
} catch (e) {
    console.error('Error installing dependencies. Please run "npm install" inside the holesail-gui folder manually.');
}
