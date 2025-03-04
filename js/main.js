// main.js - Final Version

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    updateStatus(`Critical error: ${event.message}`, 'error');
    return true;
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
    updateStatus(`Async error: ${event.reason.message}`, 'error');
});

// Application state management
let isInitialized = false;
const cleanupCallbacks = [];

async function initializeApp() {
    if (isInitialized) return;
    
    try {
        showLoading(true);
        updateStatus('Initializing application...', 'info');
        
        // Ordered initialization
        await initializeCoreComponents();
        initializeUIHandlers();
        
        // Set initial state
        document.dispatchEvent(new CustomEvent('app-ready'));
        updateStatus('Application ready', 'success');
        isInitialized = true;
    } catch (error) {
        console.error('Boot failed:', error);
        updateStatus('Failed to initialize. Please refresh.', 'error');
        showLoading(false);
        throw error;
    } finally {
        showLoading(false);
    }
}

async function initializeCoreComponents() {
    const initQueue = [
        { fn: window.initializeModeSwitching, name: 'Mode Switching' },
        { fn: window.initializeAudioModule, name: 'Audio Module' },
        { fn: window.initializeRecordingControls, name: 'Recording Controls' },
        { fn: window.initializeTTS, name: 'Text-to-Speech' },
        { fn: window.initializeQRScanner, name: 'QR Scanner' },
        { fn: window.initializeQRUploadHandlers, name: 'File Uploads' }
    ];

    for (const { fn, name } of initQueue) {
        if (typeof fn !== 'function') {
            console.error(`${name} init failed: Not a function`);
            updateStatus(`${name} initialization failed`, 'warning');
            continue;
        }
        
        try {
            console.log(`Initializing: ${name}`);
            const cleanup = await fn();
            if (typeof cleanup === 'function') {
                cleanupCallbacks.push(cleanup);
            }
            updateStatus(`Initialized: ${name}`, 'info');
        } catch (error) {
            console.error(`${name} init failed:`, error);
            updateStatus(`${name} initialization failed`, 'warning');
        }
    }
}

function initializeUIHandlers() {
    // Download handlers
    const downloadCleanup = [
        setupDownloadHandler('#downloadQRCodeBtn', handleQRDownload),
        setupDownloadHandler('#downloadBtn', handleContentDownload)
    ];
    
    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutHandler = () => {
        performCleanup();
        window.location.href = 'signin.html';
    };
    
    logoutBtn.addEventListener('click', logoutHandler);
    cleanupCallbacks.push(() => {
        logoutBtn.removeEventListener('click', logoutHandler);
    });

    cleanupCallbacks.push(...downloadCleanup);
}

function setupDownloadHandler(selector, handler) {
    const btn = document.querySelector(selector);
    const clickHandler = () => {
        try {
            handler();
        } catch (error) {
            updateStatus(`Download failed: ${error.message}`, 'error');
        }
    };
    
    btn.addEventListener('click', clickHandler);
    return () => btn.removeEventListener('click', clickHandler);
}

function handleQRDownload() {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) throw new Error('No QR code available');
    
    const url = canvas.toDataURL();
    const link = document.createElement('a');
    link.download = `v2b-${Date.now()}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus('QR code downloaded', 'success');
}

function handleContentDownload() {
    const content = document.getElementById('messageText')?.textContent || 
                    document.getElementById('scannedAudio')?.innerHTML;
    
    if (!content) {
        throw new Error('No content available to download');
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `v2b-content-${Date.now()}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus('Content downloaded', 'success');
}

function performCleanup() {
    cleanupCallbacks.forEach(fn => fn());
    localStorage.clear();
}

function showLoading(visible) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = visible ? 'flex' : 'none';
    }
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('loggedInUser')) {
        return window.location.replace('signin.html');
    }
    
    document.getElementById('logoutBtn').hidden = false;
    initializeApp().catch(() => {
        updateStatus('Application failed to start', 'error');
    });
});
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initializeTTS === 'function') {
        window.initializeTTS();
    } else {
        console.error('Text-to-Speech initialization failed: Not a function');
        updateStatus('Text-to-Speech initialization failed', 'warning');
    }
});
