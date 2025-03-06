const APP_CONFIG = {
    authRedirect: 'signin.html',
    maxInitAttempts: 2
};

let isInitialized = false;
let initializationAttempts = 0;
const cleanupCallbacks = new Set();

window.addEventListener('error', ({ error }) => {
    console.error('Runtime Error:', error);
    updateStatus('Application instability detected', 'error');
});

window.addEventListener('unhandledrejection', ({ reason }) => {
    console.error('Async Error:', reason);
    updateStatus('Unexpected system error', 'error');
});

async function initializeApp() {
    if (isInitialized || initializationAttempts >= APP_CONFIG.maxInitAttempts) return;
    initializationAttempts++;

    try {
        toggleLoading(true);
        
        // Setup event listeners for mode buttons
        document.querySelectorAll('.mode-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const mode = event.target.getAttribute('data-mode');
                await initializeMode(mode);
            });
        });

        // Automatically initialize based on the last chosen mode or default to 'voice'
        const lastMode = localStorage.getItem('lastMode') || 'voice';
        await initializeMode(lastMode);

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

async function initializeMode(mode) {
    try {
        toggleLoading(true);

        // Cleanup previous mode
        cleanupCallbacks.forEach(callback => callback());
        cleanupCallbacks.clear();

        switch (mode) {
            case 'voice':
                cleanupCallbacks.add(await initializeAudioModule());
                cleanupCallbacks.add(initializeRecordingControls());
                break;
            case 'text':
                cleanupCallbacks.add(initializeTTS());
                break;
            case 'upload':
                cleanupCallbacks.add(initializeQRUploadHandlers());
                break;
            case 'scan':
                cleanupCallbacks.add(initializeScanner());
                break;
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
        localStorage.setItem('lastMode', mode); // Save the chosen mode
        updateStatus(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode initialized`, 'success');
    } catch (error) {
        handleCriticalFailure(error);
    } finally {
        toggleLoading(false);
    }
}

function setupUIEventHandlers() {
    const downloadHandlers = [
        { selector: '#downloadQRCodeBtn', handler: handleSecureQRDownload },
        { selector: '#downloadBtn', handler: handleContentExport }
    ];

    const authHandler = createSecureAuthHandler();
    
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

async function handleSignIn() {
    try {
        // Perform sign-in logic here and get the token
        const authToken = await signInUser(); // Modify this line based on your actual sign-in logic

        // Store the token in local storage
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('loggedInUser', 'true'); // Ensure login state

        // Redirect to the dashboard
        window.location.href = 'dashboard.html'; // Ensure this is the correct path to your dashboard
    } catch (error) {
        updateStatus('Sign-in failed. Please try again.', 'error');
    }
}

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
    localStorage.removeItem('loggedInUser'); // Only remove login status
    localStorage.removeItem('authToken');    // Only remove auth token
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

// FIXED AUTHENTICATION CHECK:
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('loggedInUser')) {  // Now checking 'loggedInUser' instead of 'authToken'
        window.location.replace(APP_CONFIG.authRedirect);
        return;
    }

    document.getElementById('logoutBtn').hidden = false;
    initializeApp().catch(handleCriticalFailure);
});
