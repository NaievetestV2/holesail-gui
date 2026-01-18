let tabCounter = 0;
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
createTab();