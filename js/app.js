// main.js 
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


// SecurityHandler.js 
// SecurityHandler.js - v2.1 (Hardened Implementation)
class SecurityHandler {
    static #CONFIG = {
        keySize: 256/32,
        iterations: 310000, // OWASP 2023 recommendation
        hasher: CryptoJS.algo.SHA512,
        saltSize: 128/8,
        maxDataAge: 1000 * 60 * 60 * 24 * 2, // 2 days
        minPasswordLength: 12,
        passwordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
    };

    static generateKey(password, salt) {
        this.#validatePasswordComplexity(password);
        return CryptoJS.PBKDF2(
            password,
            salt,
            this.#CONFIG
        );
    }

    static encrypt(data, key) {
        try {
            this.#validateKey(key);
            const iv = CryptoJS.lib.WordArray.random(128/8);
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify({
                    ...data,
                    timestamp: new Date().toISOString(),
                    version: '2.1'
                }),
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.GCM,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            return this.#serializeEncryptedData(encrypted, iv);
        } catch (error) {
            this.#handleSecurityError('Encryption failure', error);
        }
    }

    static decrypt(encryptedData, password) {
        try {
            const { ciphertext, iv, tag, salt } = this.#parseEncryptedData(encryptedData);
            const key = this.generateKey(password, salt);
            
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext, iv, tag },
                key,
                { mode: CryptoJS.mode.GCM }
            );

            return this.#validateDecryptedPayload(
                decrypted.toString(CryptoJS.enc.Utf8)
            );
        } catch (error) {
            this.#handleSecurityError('Decryption failure', error);
        }
    }

    // Private methods
    static #validatePasswordComplexity(password) {
        if (password.length < this.#CONFIG.minPasswordLength) {
            throw new Error('Insufficient password length');
        }
        if (!this.#CONFIG.passwordRegex.test(password)) {
            throw new Error('Password complexity requirements not met');
        }
    }

    static #validateKey(key) {
        if (!(key instanceof CryptoJS.lib.WordArray)) {
            throw new Error('Invalid cryptographic material');
        }
    }

    static #serializeEncryptedData(encrypted, iv) {
        return {
            ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
            iv: iv.toString(CryptoJS.enc.Base64),
            tg: encrypted.tag.toString(CryptoJS.enc.Base64),
            s: CryptoJS.lib.WordArray.random(this.#CONFIG.saltSize)
                        .toString(CryptoJS.enc.Base64),
            v: '2.1'
        };
    }

    static #parseEncryptedData(data) {
        const requiredFields = ['ct', 'iv', 'tg', 's', 'v'];
        if (!requiredFields.every(f => data[f])) {
            throw new Error('Invalid security envelope');
        }
        if (data.v !== '2.1') {
            throw new Error('Unsupported security version');
        }

        return {
            ciphertext: CryptoJS.enc.Base64.parse(data.ct),
            iv: CryptoJS.enc.Base64.parse(data.iv),
            tag: CryptoJS.enc.Base64.parse(data.tg),
            salt: CryptoJS.enc.Base64.parse(data.s)
        };
    }

    static #validateDecryptedPayload(payload) {
        const data = JSON.parse(payload);
        const age = Date.now() - new Date(data.timestamp).getTime();
        
        if (age > this.#CONFIG.maxDataAge) {
            throw new Error('Expired security token');
        }
        if (!['text', 'audio'].includes(data.type)) {
            throw new Error('Invalid payload type');
        }
        if (typeof data.data !== 'string') {
            throw new Error('Invalid payload format');
        }
        
        return data;
    }

    static #handleSecurityError(context, error) {
        console.error(`Security Exception: ${context} - ${error.message}`);
        throw new Error('Security processing failed');
    }
}


// ModeSwitching.js 
function initializeModeSwitching() {
    let cachedSections = null;
    let isSwitching = false;
    let currentMode = null;

    // Auto-discover modes from HTML structure
    const modes = Array.from(document.querySelectorAll('.mode-btn')).reduce((acc, btn) => {
        const mode = btn.dataset.mode;
        acc[mode] = {
            button: `[data-mode="${mode}"]`,
            section: `[data-section="${mode}"]`
        };
        return acc;
    }, {});

    const modeButtons = document.querySelectorAll('.mode-btn');

    // Accessibility and performance optimizations
    const setAriaStates = (activeButton) => {
        modeButtons.forEach(btn => {
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        });
        activeButton.setAttribute('aria-selected', 'true');
        activeButton.setAttribute('tabindex', '0');
    };

    const toggleSections = (targetMode) => {
        if (!cachedSections) {
            cachedSections = document.querySelectorAll('[data-section]');
        }

        cachedSections.forEach(section => {
            const isTarget = section.dataset.section === targetMode;
            section.classList.toggle('active', isTarget);
            section.hidden = !isTarget;
            
            if (isTarget) {
                section.focus();
                setTimeout(() => {
                    const firstFocusable = section.querySelector('button, [tabindex]');
                    firstFocusable?.focus();
                }, 100);
            }
        });
    };

    const switchMode = (event) => {
        if (isSwitching) return;
        isSwitching = true;

        const targetButton = event.currentTarget;
        const targetMode = targetButton.dataset.mode;

        try {
            if (currentMode === targetMode) return;
            if (!modes[targetMode]) throw new Error(`Undefined mode: ${targetMode}`);

            // Visual transition base
            document.documentElement.style.setProperty(
                '--transition-duration', 
                targetMode === 'voice' ? '0.4s' : '0.2s'
            );

            modeButtons.forEach(btn => btn.classList.remove('active'));
            targetButton.classList.add('active');
            
            setAriaStates(targetButton);
            toggleSections(targetMode);
            currentMode = targetMode;

            // Persist mode
            localStorage.setItem('lastMode', targetMode);

            // Screen reader announcement
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.textContent = `${targetMode} mode activated`;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 1000);

            // System-wide notification
            document.dispatchEvent(new CustomEvent('modeChanged', {
                detail: { 
                    mode: targetMode,
                    previousMode: currentMode
                }
            }));

        } catch (error) {
            updateStatus(`Mode error: ${error.message}`, 'error');
            console.error('Mode switching failed:', error);
        } finally {
            setTimeout(() => isSwitching = false, 300);
        }
    };

    // Initialize with saved preference or default
    const setInitialMode = () => {
        const savedMode = localStorage.getItem('lastMode');
        const defaultMode = Object.keys(modes)[0];
        const initialMode = modes[savedMode] ? savedMode : defaultMode;
        
        document.querySelector(modes[initialMode].button)?.click();
        
        if (!modes[savedMode]) {
            localStorage.removeItem('lastMode');
        }
    };

    // Event listeners with debouncing
    const handleModeInteraction = (e) => {
        if (['Enter', 'Space'].includes(e.code)) e.preventDefault();
        if (e.type === 'click' || e.code === 'Enter' || e.code === 'Space') {
            switchMode(e);
        }
    };

    modeButtons.forEach(btn => {
        btn.addEventListener('click', handleModeInteraction);
        btn.addEventListener('keydown', handleModeInteraction);
    });

    // Initial setup
    setInitialMode();
}

window.initializeModeSwitching = initializeModeSwitching;

 
// utils.js - Enhanced Version
let statusTimeout = null;
let statusQueue = [];
let isStatusVisible = false;

const STATUS_CONFIG = {
    types: {
        info: { timeout: 5000, class: 'status-info' },
        success: { timeout: 4000, class: 'status-success' },
        warning: { timeout: 6000, class: 'status-warning' },
        error: { timeout: 8000, class: 'status-error' }
    },
    animationDuration: 300,
    maxMessages: 5,
    cooldown: 100
};

function createStatusElement() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    statusDiv.className = 'status-message';
    statusDiv.setAttribute('aria-live', 'polite');
    statusDiv.setAttribute('role', 'status');
    document.body.prepend(statusDiv);
    return statusDiv;
}

function processQueue() {
    if (statusQueue.length === 0 || isStatusVisible) return;
    
    const { message, options } = statusQueue.shift();
    showStatus(message, options);
}

function showStatus(message, options = {}) {
    const statusDiv = document.getElementById('status') || createStatusElement();
    const { type = 'info', timeout, persistent = false } = options;
    
    // Clear previous state
    statusDiv.classList.remove(...Object.values(STATUS_CONFIG.types).map(t => t.class));
    statusDiv.style.animation = '';
    
    // Apply new state
    statusDiv.textContent = message;
    statusDiv.classList.add(STATUS_CONFIG.types[type].class);
    statusDiv.style.animation = `slideIn ${STATUS_CONFIG.animationDuration}ms ease-out`;
    
    // Set visibility state
    isStatusVisible = true;
    
    // Handle auto-dismiss
    if (!persistent) {
        const dismissTime = timeout || STATUS_CONFIG.types[type].timeout;
        statusTimeout = setTimeout(() => {
            statusDiv.style.animation = `slideOut ${STATUS_CONFIG.animationDuration}ms ease-in`;
            setTimeout(() => {
                statusDiv.textContent = '';
                isStatusVisible = false;
                processQueue();
            }, STATUS_CONFIG.animationDuration);
        }, dismissTime);
    }
}

function updateStatus(message, options = {}) {
    // Queue management
    if (statusQueue.length >= STATUS_CONFIG.maxMessages) {
        statusQueue.shift();
    }
    
    statusQueue.push({
        message,
        options: {
            type: 'info',
            ...options
        }
    });
    
    // Cooldown mechanism
    if (!isStatusVisible) {
        setTimeout(processQueue, STATUS_CONFIG.cooldown);
    }
}

// Export function
window.updateStatus = updateStatus;

//audioRecordingCompressionQR.js 
const RECORDING_DURATION = 10000; // 10 seconds
const MAX_QR_DATA_LENGTH = 2953; // Max data for QR v40-L (low error correction)

let recorder;
let recordedChunks = [];
let qrCodeUrl;
let cleanupAudioModule = () => {};

async function initializeAudioModule() {
  try {
    // Do not initialize the microphone here
    console.log('Audio module initialized (microphone not accessed yet)');
    return () => {
      // Return cleanup function
      cleanupAudioModule();
    };
  } catch (error) {
    updateStatus(`Microphone access denied: ${error}`, 'error');
    throw error;
  }
}

function initializeRecordingControls() {
  try {
    const startButton = document.getElementById('startRecordingBtn');
    const stopButton = document.getElementById('stopRecordingBtn');

    startButton.disabled = false;
    stopButton.disabled = true;

    startButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);

    console.log('Recording controls initialized');
    return () => {
      // Return cleanup function
      startButton.removeEventListener('click', startRecording);
      stopButton.removeEventListener('click', stopRecording);
    };
  } catch (error) {
    updateStatus(`Control setup failed: ${error}`, 'error');
    throw error;
  }
}

async function startRecording() {
  if (recorder && recorder.state === 'recording') return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recorder = new Recorder({
      encoderPath: './libs/opus-recorder/src/encoderWorker.min.js',
      decoderPath: './libs/opus-recorder/src/decoderWorker.min.js',
      numberOfChannels: 1,
      encoderSampleRate: 48000,
      encoderBitRate: 64000,
    });

    recorder.ondataavailable = (blob) => {
      recordedChunks.push(blob);
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'audio/ogg; codecs=opus' });
      await compressAndConvertToQRCode(blob);
      recordedChunks = [];
      document.getElementById('stopRecordingBtn').disabled = true;
      document.getElementById('startRecordingBtn').disabled = false;
    };

    cleanupAudioModule = () => {
      stream.getTracks().forEach(track => track.stop());
      console.log('Audio module cleaned up');
    };

    recordedChunks = [];
    recorder.start();
    document.getElementById('startRecordingBtn').disabled = true;
    document.getElementById('stopRecordingBtn').disabled = false;
    updateStatus('Recording started...', 'info');

    setTimeout(() => {
      if (recorder.state === 'recording') {
        stopRecording();
        updateStatus('Recording stopped automatically', 'warning');
      }
    }, RECORDING_DURATION);
  } catch (error) {
    updateStatus(`Failed to start recording: ${error}`, 'error');
  }
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    updateStatus('Recording stopped', 'success');
  }
}

async function compressAndConvertToQRCode(blob) {
  try {
    updateStatus('Compressing audio...', 'info');
    
    // Convert Opus audio blob to base64
    const base64Data = await blobToBase64(blob);
    const compressedData = base64Data.slice(0, MAX_QR_DATA_LENGTH);

    // Create structured data for the QR code
    const qrData = {
      type: 'audio',
      data: compressedData, // base64 audio data
      mimeType: 'audio/ogg', // specify mime type
      timestamp: new Date().toISOString()
    };

    updateStatus('Generating QR code...', 'info');
    const qrCodeCanvas = document.getElementById('qrcode');
    
    await new Promise((resolve, reject) => {
      QRCode.toCanvas(qrCodeCanvas, JSON.stringify(qrData), error => {
        if (error) reject(error);
        else resolve();
      });
    });

    qrCodeUrl = qrCodeCanvas.toDataURL();
    updateStatus('QR code ready!', 'success');
  } catch (error) {
    updateStatus(`QR generation failed: ${error.message}`, 'error');
  }
}

function handleQRDownload() {
  if (!qrCodeUrl) {
    updateStatus('No QR code available', 'error');
    return;
  }

  const link = document.createElement('a');
  link.download = `audioqr-${Date.now()}.png`;
  link.href = qrCodeUrl;
  link.click();
  updateStatus('QR code downloaded', 'success');
}

function updateStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = `status-${type}`;
  
  // Auto-clear success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = '';
    }, 5000);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Cleanup when closing/page unload
window.addEventListener('beforeunload', () => {
  if (cleanupAudioModule) cleanupAudioModule();
});

// Expose public functions
window.initializeAudioModule = initializeAudioModule;
window.initializeRecordingControls = initializeRecordingControls;
window.handleQRDownload = handleQRDownload;


// tts.js 
let synth = window.speechSynthesis;
let voices = [];

function initializeTTS() {
    const textConvertBtn = document.getElementById('textConvertBtn');
    
    synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        populateVoiceSelects();
    };

    textConvertBtn.addEventListener('click', handleTextConversion);

    return () => {
        textConvertBtn.removeEventListener('click', handleTextConversion);
    };
}

function populateVoiceSelects() {
    const maleSelect = document.getElementById('maleVoiceSelect');
    const femaleSelect = document.getElementById('femaleVoiceSelect');

    maleSelect.innerHTML = '<option value="">Select Male Voice</option>';
    femaleSelect.innerHTML = '<option value="">Select Female Voice</option>';

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        
        // Improved voice gender detection
        const voiceGender = voice.voiceURI.toLowerCase().includes('male') ? 'male' : 
                          voice.voiceURI.toLowerCase().includes('female') ? 'female' : 
                          'unknown';

        if (voiceGender === 'male') {
            maleSelect.appendChild(option);
        } else if (voiceGender === 'female') {
            femaleSelect.appendChild(option);
        }
    });
}

function handleTextConversion() {
    const text = document.getElementById('textToConvert').value;
    const maleVoice = document.getElementById('maleVoiceSelect').value;
    const femaleVoice = document.getElementById('femaleVoiceSelect').value;
    const selectedVoice = maleVoice || femaleVoice;

    if (!text || !selectedVoice) {
        updateStatus('Please enter text and select a voice', 'error');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(v => v.name === selectedVoice);
    
    utterance.onend = () => {
        generateQRFromText(text, selectedVoice);
    };

    utterance.onerror = (error) => {
        updateStatus(`TTS Error: ${error.error}`, 'error');
    };

    synth.speak(utterance);
    updateStatus('Converting text to speech...', 'info');
}

function generateQRFromText(text, voiceName) {
    try {
        const qrData = {
            type: 'text',
            data: text,
            voice: voiceName,
            timestamp: new Date().toISOString()
        };

        const qrCodeCanvas = document.getElementById('qrcode');
        QRCode.toCanvas(qrCodeCanvas, JSON.stringify(qrData), (error) => {
            if (error) throw error;
            document.getElementById('downloadQRCodeBtn').disabled = false;
            updateStatus('QR code generated!', 'success');
        });
    } catch (error) {
        updateStatus(`QR generation failed: ${error.message}`, 'error');
    }
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    
    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, 5000);
    }
}

window.initializeTTS = initializeTTS;


//QRCodeUploadHandling.js 
let scanner = null;

function initializeUploadScanner() {
    const scanBtn = document.getElementById('scanBtn');
    const uploadInput = document.getElementById('uploadInput');
    
    scanBtn.addEventListener('click', startUploadScanner);
    uploadInput.addEventListener('change', handleFileUpload);

    return () => {
        stopScanner();
        scanBtn.removeEventListener('click', startUploadScanner);
        uploadInput.removeEventListener('change', handleFileUpload);
    };
}

async function startUploadScanner() {
    try {
        scanner = new Html5QrcodeScanner('cameraFeed', {
            fps: 10,
            qrbox: 250
        });

        scanner.render(handleScan, (error) => {
            updateStatus(`Scanner error: ${error}`, 'error');
        });

        document.getElementById('cameraPreview').hidden = false;
        updateStatus('Scanning started', 'success');
    } catch (error) {
        updateStatus(`Scanner error: ${error.message}`, 'error');
    }
}

function stopScanner() {
    if (scanner) {
        scanner.clear();
        scanner = null;
    }
    document.getElementById('cameraPreview').hidden = true;
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        handleScan(content);
    };
    reader.readAsDataURL(file);
}

function handleScan(content) {
    try {
        const data = JSON.parse(content);
        displayScannedContent(data);
        document.getElementById('downloadBtn').disabled = false;
        window.lastScannedData = data; // Store for download
    } catch (error) {
        updateStatus('Invalid QR code content', 'error');
    }
}

// Updated to match HTML structure
function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    scannedContent.hidden = false;
    scannedAudio.innerHTML = '';
    messageText.textContent = '';

    if (data.type === 'text') {
        messageText.textContent = data.data;
    } else if (data.type === 'audio') {
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.appendChild(audio);
        messageText.textContent = `Audio content (${data.mimeType})`;
    } else {
        updateStatus('Unsupported content type', 'error');
    }
}

function downloadDecodedContent() {
    const data = window.lastScannedData;
    if (!data) return;

    try {
        let blob, filename;
        if (data.type === 'text') {
            blob = new Blob([data.data], { type: 'text/plain' });
            filename = 'decoded_text.txt';
        } else if (data.type === 'audio') {
            const byteString = atob(data.data.split(',')[1]);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uintArray = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
                uintArray[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([arrayBuffer], { type: data.mimeType });
            filename = `audio_${Date.now()}.${data.mimeType.split('/')[1]}`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        updateStatus(`Download failed: ${error.message}`, 'error');
    }
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    if (type === 'success') setTimeout(() => statusElement.textContent = '', 5000);
}

window.initializeUploadScanner = initializeUploadScanner;
window.downloadDecodedContent = downloadDecodedContent;

//QRScanning.js 
function initializeScanner() {
    console.log("QR Scanner Initialized");

    const scanButton = document.getElementById('scanBtn');
    const videoElement = document.getElementById('cameraFeed');
    const cameraPreview = document.getElementById('cameraPreview');
    const switchCameraBtn = document.getElementById('switchCameraBtn');

    if (!scanButton || !videoElement) {
        console.error("Scanner UI elements missing!");
        return;
    }

    scanButton.addEventListener('click', async () => {
        try {
            cameraPreview.hidden = false;
            switchCameraBtn.hidden = false;
            
            const qrScanner = new Html5Qrcode("cameraFeed");
            await qrScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                (decodedText) => {
                    console.log("QR Code scanned:", decodedText);
                    handleScan(decodedText);
                    qrScanner.stop();
                    cameraPreview.hidden = true;
                    switchCameraBtn.hidden = true;
                },
                (error) => {
                    console.warn("Scanning error:", error);
                }
            );
        } catch (error) {
            console.error("Failed to start scanner:", error);
        }
    });
}

function handleScan(content) {
    try {
        // Attempt to parse the scanned content as JSON
        const data = JSON.parse(content);

        // Display the scanned data content on the page
        displayScannedContent(data);

        // Enable the download button if content is valid
        document.getElementById('downloadBtn').disabled = false;

        // Store the scanned data globally for future use (e.g., for downloading)
        window.lastScannedData = data;

    } catch (error) {
        // If content is not valid JSON, show an error message
        updateStatus('Invalid QR code content', 'error');
    }
}

// Updated to handle text, voice, audio, and timestamp content
function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    // Show the scanned content section
    scannedContent.hidden = false;

    // Clear previous content in case of re-scan
    scannedAudio.innerHTML = '';
    messageText.textContent = '';

    // Handle different content types
    if (data.type === 'text') {
        // Display the text content
        messageText.textContent = data.data;
        
        // Optionally add voice details if available
        if (data.voice) {
            messageText.textContent += ` (Voice: ${data.voice})`;  // Display voice used for TTS
        }
        
        // Optionally display timestamp if available
        if (data.timestamp) {
            const timestamp = new Date(data.timestamp).toLocaleString(); // Format timestamp
            messageText.textContent += ` (Timestamp: ${timestamp})`;  // Display timestamp
        }

    } else if (data.type === 'audio') {
        // Handle audio content (e.g., play the audio)
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.appendChild(audio);
        
        // Display content type details
        messageText.textContent = `Audio content (${data.mimeType})`;

    } else {
        // Show an error for unsupported content types
        updateStatus('Unsupported content type', 'error');
    }
}

// Update the status message on the page (error or success)
function updateStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;

    // Add styling based on message type
    if (type === 'error') {
        statusElement.style.color = 'red';
    } else {
        statusElement.style.color = 'green';
    }
}

