// ----------------------------
// Core Configuration & Security
// ----------------------------
const APP_CONFIG = {
    authRedirect: 'signin.html',
    maxInitAttempts: 3,
    recordingLimit: 10000,
    qrSecurityLevel: 'H',
    minPasswordEntropy: 80
};

class SecurityHandler {
    static #CONFIG = {
        keySize: 256/32,
        iterations: 310000,
        hasher: CryptoJS.algo.SHA512,
        saltSize: 128/8,
        maxDataAge: 1000 * 60 * 60 * 24 * 2,
        minPasswordLength: 12,
        passwordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
    };

    static generateKey(password, salt) {
        this.#validatePasswordComplexity(password);
        return CryptoJS.PBKDF2(password, salt, this.#CONFIG);
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

class AppState {
    static #instance;
    currentMode = 'voice';
    authToken = null;
    secureSession = false;

    constructor() {
        if (AppState.#instance) return AppState.#instance;
        AppState.#instance = this;
        this.loadSession();
    }

    loadSession() {
        this.authToken = localStorage.getItem('authToken');
        const encryptedSession = localStorage.getItem('session');
        if (encryptedSession && this.authToken) {
            try {
                this.secureSession = JSON.parse(
                    CryptoJS.AES.decrypt(
                        encryptedSession,
                        this.authToken
                    ).toString(CryptoJS.enc.Utf8)
                );
            } catch (error) {
                this.clearSession();
            }
        }
    }

    async validateSession() {
        if (!this.secureSession || !this.authToken) {
            this.clearSession();
            return false;
        }
        
        try {
            const response = await fetch('/api/validate-session', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            return response.ok;
        } catch (error) {
            this.clearSession();
            return false;
        }
    }

    clearSession() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('session');
        this.authToken = null;
        this.secureSession = false;
    }
}

// ----------------------
// Utility Functions
// ----------------------
function toggleLoading(visible) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = visible ? 'flex' : 'none';
        loader.setAttribute('aria-busy', visible.toString());
    }
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = '';
        }, 5000);
    }
}

async function performSecureCleanup() {
    cleanupCallbacks.forEach(cleanup => {
        try { cleanup(); } catch (error) { console.error('Cleanup error:', error); }
    });
    cleanupCallbacks.clear();
    localStorage.removeItem('loggedInUser');
    sessionStorage.clear();
}

function handleCriticalFailure(error) {
    console.error('Boot Failure:', error);
    updateStatus('System initialization failed. Please refresh.', 'error');
    performSecureCleanup();
    setTimeout(() => window.location.replace(APP_CONFIG.authRedirect), 5000);
}

function setupGlobalErrorHandling() {
    window.addEventListener('error', ({ error }) => {
        console.error('Runtime Error:', error);
        updateStatus('Application instability detected', 'error');
    });

    window.addEventListener('unhandledrejection', ({ reason }) => {
        console.error('Async Error:', reason);
        updateStatus('Unexpected system error', 'error');
    });
}

// ----------------------
// Application Core Logic
// ----------------------
let isInitialized = false;
let initializationAttempts = 0;
const cleanupCallbacks = new Set();

async function initializeApp() {
    if (isInitialized || initializationAttempts >= APP_CONFIG.maxInitAttempts) return;
    initializationAttempts++;

    try {
        toggleLoading(true);
        const state = new AppState();
        
        if (!(await state.validateSession())) {
            window.location.replace(APP_CONFIG.authRedirect);
            return;
        }

        setupGlobalErrorHandling();
        initializeModeSwitching();
        setupUIEventHandlers();

        const lastMode = localStorage.getItem('lastMode') || 'voice';
        await initializeMode(lastMode);

        document.dispatchEvent(new CustomEvent('app-ready'));
        updateStatus('System operational', 'success');
        isInitialized = true;
    } catch (error) {
        handleCriticalFailure(error);
    } finally {
        toggleLoading(false);
    }
}

// ------------------
// Mode Management
// ------------------
async function initializeMode(mode) {
    try {
        toggleLoading(true);
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
        
        localStorage.setItem('lastMode', mode);
        updateStatus(`${mode} mode initialized`, 'success');
    } catch (error) {
        handleCriticalFailure(error);
    } finally {
        toggleLoading(false);
    }
}

function initializeModeSwitching() {
    const modes = {
        voice: { 
            init: () => initializeAudioModule().then(initializeRecordingControls),
            section: document.querySelector('[data-section="voice"]')
        },
        text: {
            init: initializeTTS,
            section: document.querySelector('[data-section="text"]')
        },
        upload: {
            init: () => initializeQRUploadHandlers(),
            section: document.querySelector('[data-section="upload"]')
        },
        scan: {
            init: initializeScanner,
            section: document.querySelector('[data-section="scan"]')
        }
    };

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', async ({ target }) => {
            const mode = target.dataset.mode;
            if (!modes[mode]) return;

            Object.values(modes).forEach(({ section }) => 
                section.hidden = true
            );
            modes[mode].section.hidden = false;
            
            try {
                await modes[mode].init();
                updateStatus(`${mode} mode activated`, 'success');
            } catch (error) {
                handleCriticalFailure(error);
            }
        });
    });
}

// ------------------
// Audio Module (Voice Mode)
// ------------------
let recorder;
let recordedChunks = [];
let qrCodeUrl;
let cleanupAudioModule = () => {};

async function initializeAudioModule() {
    try {
        console.log('Audio module initialized');
        return () => {
            cleanupAudioModule();
            recordedChunks = [];
        };
    } catch (error) {
        updateStatus(`Microphone error: ${error}`, 'error');
        throw error;
    }
}

function initializeRecordingControls() {
    try {
        const startBtn = document.getElementById('startRecordingBtn');
        const stopBtn = document.getElementById('stopRecordingBtn');

        startBtn.disabled = false;
        stopBtn.disabled = true;

        startBtn.addEventListener('click', startRecording);
        stopBtn.addEventListener('click', stopRecording);

        return () => {
            startBtn.removeEventListener('click', startRecording);
            stopBtn.removeEventListener('click', stopRecording);
        };
    } catch (error) {
        updateStatus(`Control error: ${error}`, 'error');
        throw error;
    }
}

async function startRecording() { 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new Recorder({
            encoderPath: 'https://drkimogad.github.io/Voice2Barcode/libs/opus-recorder/src/encoderWorker.min.js',
            decoderPath: 'https://drkimogad.github.io/Voice2Barcode/libs/opus-recorder/src/decoderWorker.min.js',
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

        cleanupAudioModule = () => stream.getTracks().forEach(track => track.stop());
        recorder.start();
        document.getElementById('startRecordingBtn').disabled = true;
        document.getElementById('stopRecordingBtn').disabled = false;
        updateStatus('Recording started...', 'info');

        setTimeout(() => {
            if (recorder.state === 'recording') {
                stopRecording();
                updateStatus('Recording stopped automatically', 'warning');
            }
        }, APP_CONFIG.recordingLimit);
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


// ------------------
// TTS Module (Text Mode)
// ------------------
let synth = window.speechSynthesis;
let voices = [];

function initializeTTS() {
    const convertBtn = document.getElementById('textConvertBtn');
    synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        populateVoiceSelects();
    };

    convertBtn.addEventListener('click', handleTextConversion);
    return () => convertBtn.removeEventListener('click', handleTextConversion);
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
    try {
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
    } catch (error) {
        updateStatus(`TTS error: ${error}`, 'error');
    }
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

// ------------------
// QR Modules (Upload/Scan)
// ------------------
// QR Modules
function initializeQRUploadHandlers() {
    const uploadInput = document.getElementById('uploadInput');
    const scanBtn = document.getElementById('scanBtn');
    
    const handler = (event) => {
        const file = event.type === 'change' ? event.target.files[0] : null;
        handleScan(file);
    };

    uploadInput.addEventListener('change', handler);
    scanBtn.addEventListener('click', handler);
    
    return () => {
        uploadInput.removeEventListener('change', handler);
        scanBtn.removeEventListener('click', handler);
    };
}

function initializeScanner() {
    const scanner = new Html5QrcodeScanner('cameraFeed', {
        fps: 10,
        qrbox: 250
    });

    scanner.render(handleScan);
    return () => scanner.clear();
}

// ----------------------------
// Event Handlers
// ----------------------------
function setupUIEventHandlers() {
    const secureHandlers = [
        ['#downloadQRCodeBtn', handleSecureQRDownload],
        ['#downloadBtn', handleContentExport],
        ['#logoutBtn', createSecureAuthHandler()]
    ];

    secureHandlers.forEach(([selector, handler]) => {
        const element = document.querySelector(selector);
        if (!element) return;

        const wrapper = async () => {
            try {
                const state = new AppState();
                if (!(await state.validateSession())) {
                    window.location.replace(APP_CONFIG.authRedirect);
                    return;
                }
                handler();
            } catch (error) {
                handleCriticalFailure(error);
            }
        };

        element.addEventListener('click', wrapper);
        cleanupCallbacks.add(() => element.removeEventListener('click', wrapper));
    });
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

// ----------------------------
// Initialization
// ----------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('loggedInUser')) {
        window.location.replace(APP_CONFIG.authRedirect);
        return;
    }

    initializeApp().catch(handleCriticalFailure);
    document.getElementById('logoutBtn').hidden = false;
});

// ----------------------------
// Additional Utilities
// ----------------------------
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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

async function compressAndConvertToQRCode(blob) {
    try {
        updateStatus('Compressing audio...', 'info');
        const base64Data = await blobToBase64(blob);
        const qrData = {
            type: 'audio',
            data: base64Data.slice(0, 2953),
            mimeType: 'audio/ogg',
            timestamp: new Date().toISOString()
        };

        const qrCodeCanvas = document.getElementById('qrcode');
        await new Promise((resolve, reject) => {
            QRCode.toCanvas(qrCodeCanvas, JSON.stringify(qrData), error => {
                if (error) reject(error);
                else resolve();
            });
        });

        qrCodeUrl = qrCodeCanvas.toDataURL('image/png');
        updateStatus('QR code ready!', 'success');
    } catch (error) {
        updateStatus(`QR generation failed: ${error.message}`, 'error');
    }
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

function handleScan(content) {
    try {
        const data = JSON.parse(content);
        displayScannedContent(data);
        document.getElementById('downloadBtn').disabled = false;
        window.lastScannedData = data;
    } catch (error) {
        updateStatus('Invalid QR code content', 'error');
    }
}

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
