// main.js - Production-Ready Implementation
const APP_CONFIG = {
    authRedirect: 'signin.html',
    initSequence: [
        { name: 'Mode Switching', init: window.initializeModeSwitching },
        { name: 'Audio Module', init: window.initializeAudioModule },
        { name: 'Recording Controls', init: window.initializeRecordingControls },
        { name: 'Text-to-Speech', init: window.initializeTTS },
        { name: 'QR Scanner', init: window.initializeScanner },
        { name: 'File Uploads', init: window.initializeQRUploadHandlers }
    ],
    maxInitAttempts: 2
};


// Temporary performance logger
const initTimestamps = {
  start: Date.now(),
  stages: {},
  log(stage) {
    this.stages[stage] = Date.now() - this.start;
    console.log(`${stage}: +${this.stages[stage]}ms`);
  }
};

async function initializeApp() {
  initTimestamps.log('start');
  
  // Load critical first
  initTimestamps.log('pre-core');
  await initializeModeSwitching();
  initTimestamps.log('post-mode');
  
  // Defer heavy modules
  setTimeout(() => {
    initializeAudioModule();
    initializeScanner();
  }, 3000); // 3s delay
  
  // Rest of your code
}


let isInitialized = false;
let initializationAttempts = 0;
const cleanupCallbacks = new Set();
// Enhanced Error Handling
window.addEventListener('error', ({ error }) => {
    console.error('Runtime Error:', error);
    updateStatus('Application instability detected', 'error');
});

window.addEventListener('unhandledrejection', ({ reason }) => {
    console.error('Async Error:', reason);
    updateStatus('Unexpected system error', 'error');
});

// Core Application Lifecycle
async function initializeApp() {
    if (isInitialized || initializationAttempts >= APP_CONFIG.maxInitAttempts) return;
    initializationAttempts++;

    try {
        toggleLoading(true);
        await initializeCoreSystems();
        setupUIEventHandlers();
        
        document.dispatchEvent(new CustomEvent('app-ready'));
        updateStatus('System operational', 'success');
        isInitialized = true;
    } catch (criticalError) {
        handleCriticalFailure(criticalError);
    } finally {
        toggleLoading(false);
    }
}

async function initializeCoreSystems() {
    const initializationResults = [];
    
    for (const { name, init } of APP_CONFIG.initSequence) {
        try {
            if (typeof init !== 'function') throw new Error('Invalid module');
            
            const cleanup = await init();
            if (typeof cleanup === 'function') {
                cleanupCallbacks.add(cleanup);
            }
            
            initializationResults.push({ name, status: 'success' });
        } catch (error) {
            initializationResults.push({ name, status: 'failed', error });
            updateStatus(`${name} initialization failed`, 'warning');
        }
    }

    if (initializationResults.some(r => r.status === 'failed')) {
        throw new Error('Partial initialization failure');
    }
}

function setupUIEventHandlers() {
    const downloadHandlers = [
        { selector: '#downloadQRCodeBtn', handler: handleSecureQRDownload },
        { selector: '#downloadBtn', handler: handleContentExport }
    ];

    const authHandler = createSecureAuthHandler();
    
    // Setup event listeners
    downloadHandlers.forEach(({ selector, handler }) => {
        const element = document.querySelector(selector);
        if (element) {
            const wrapper = () => {
                try {
                    handler();
                } catch (error) {
                    updateStatus(`Download error: ${error.message}`, 'error');
                }
            };
            element.addEventListener('click', wrapper);
            cleanupCallbacks.add(() => element.removeEventListener('click', wrapper));
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', authHandler);
}

function createSecureAuthHandler() {
    return async () => {
        try {
            await performSecureCleanup();
            window.location.href = APP_CONFIG.authRedirect;
        } catch (error) {
            updateStatus('Logout failed. Please clear cookies.', 'error');
        }
    };
}

// Secure Download Handlers
function handleSecureQRDownload() {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) throw new Error('No QR code available');
    
    const dataURL = canvas.toDataURL('image/png');
    const filename = `SecureV2B-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    
    triggerSecureDownload(dataURL, filename);
    updateStatus('QR code securely downloaded', 'success');
}

function handleContentExport() {
    const content = getValidatedContent();
    const blob = new Blob([content.data], { type: content.mimeType });
    const filename = `V2B-Export-${Date.now()}.${content.fileExt}`;
    
    triggerSecureDownload(URL.createObjectURL(blob), filename);
    updateStatus('Content export completed', 'success');
}

// Utility Functions
function getValidatedContent() {
    const textContent = document.getElementById('messageText')?.textContent;
    const audioElement = document.getElementById('scannedAudio')?.querySelector('audio');
    
    if (audioElement) {
        return {
            data: audioElement.src,
            mimeType: 'audio/webm',
            fileExt: 'webm'
        };
    }
    
    if (textContent) {
        return {
            data: textContent,
            mimeType: 'text/plain',
            fileExt: 'txt'
        };
    }
    
    throw new Error('No exportable content found');
}

function triggerSecureDownload(url, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 1000);
}

async function performSecureCleanup() {
    cleanupCallbacks.forEach(cleanup => {
        try {
            cleanup();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });
    cleanupCallbacks.clear();
    localStorage.clear();
    sessionStorage.clear();
}

function toggleLoading(visible) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = visible ? 'flex' : 'none';
        loader.setAttribute('aria-busy', visible.toString());
    }
}

function handleCriticalFailure(error) {
    console.error('Boot Failure:', error);
    updateStatus('System initialization failed. Please refresh.', 'error');
    performSecureCleanup();
}

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('authToken')) {
        window.location.replace(APP_CONFIG.authRedirect);
        return;
    }

    document.getElementById('logoutBtn').hidden = false;
    initializeApp().catch(handleCriticalFailure);
});

const perfMetrics = {
  start: Date.now(),
  stages: {},
  mark(stage) {
    this.stages[stage] = Date.now() - this.start;
  },
  report() {
    console.table(this.stages);
  }
};

// Usage
perfMetrics.mark('dom_loaded');
await initializeCoreComponents(); // After each stage
perfMetrics.mark('components_loaded');


// Load critical modules first
async function criticalModules() {
  await initializeModeSwitching();
  await initializeQRUploadHandlers();
}

// Defer non-essential
function secondaryModules() {
  initializeTTS();
  initializeScanner();
}
