// ========================================
// DASHBOARD MODULE
// ========================================

const DASHBOARD_CONFIG = {
    MAX_TEXT_LENGTH: 200,
    QR_SIZE: 300,
    QR_ERROR_CORRECTION: 'H'
};

// Global state
let currentMode = 'voice';
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = 0;
let voices = [];
let html5QrCode = null;
let lastQRData = null;
let isProcessing = false;

/**
 * Initialize dashboard
 */
function initDashboard() {
    console.log('📊 Initializing dashboard...');
    
    // Setup mode switching
    setupModeSwitching();
    
    // Initialize voice mode by default
    switchToMode('voice');
    
    // Setup global handlers
    setupGlobalHandlers();
    
    console.log('✅ Dashboard initialized');
}

/**
 * Setup mode switching buttons
 */
function setupModeSwitching() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchToMode(mode);
            
            // Update active button
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Switch to a specific mode
 * @param {string} mode - Mode to switch to
 */
function switchToMode(mode) {
    console.log(`🔄 Switching to ${mode} mode`);
    currentMode = mode;
    
    // Hide all sections
    document.querySelectorAll('.mode-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const activeSection = document.querySelector(`[data-section="${mode}"]`);
    if (activeSection) {
        activeSection.style.display = 'block';
    }
    
    // Cleanup previous mode
    cleanupMode();
    
    // Initialize new mode
    switch(mode) {
        case 'voice':
            initVoiceMode();
            break;
        case 'text':
            initTextMode();
            break;
        case 'upload':
            initUploadMode();
            break;
        case 'scan':
            initScanMode();
            break;
    }
    
    // Clear results
    document.getElementById('scannedContent').style.display = 'none';
    updateStatus('', 'info');
}

/**
 * Cleanup mode resources
 */
function cleanupMode() {
    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Stop timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Stop scanner
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error('Scanner stop error:', err));
    }
}


// ========================================
// TEXT MODE
// ========================================

function initTextMode() {
    // Load voices
    loadVoices();
    
    const convertBtn = document.getElementById('textConvertBtn');
    convertBtn.onclick = handleTextConversion;
    
    // Listen for voices loaded
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function loadVoices() {
    if (!window.speechSynthesis) {
        updateStatus('Text-to-speech not supported in this browser', 'error');
        return;
    }
    
    voices = window.speechSynthesis.getVoices();
    
    const maleSelect = document.getElementById('maleVoiceSelect');
    const femaleSelect = document.getElementById('femaleVoiceSelect');
    
    // Clear existing options
    maleSelect.innerHTML = '<option value="">Select Male Voice</option>';
    femaleSelect.innerHTML = '<option value="">Select Female Voice</option>';
    
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        
        // Categorize by name (simple heuristic)
        const nameLower = voice.name.toLowerCase();
        if (nameLower.includes('male') && !nameLower.includes('female')) {
            maleSelect.appendChild(option.cloneNode(true));
        } else if (nameLower.includes('female')) {
            femaleSelect.appendChild(option.cloneNode(true));
        } else {
            // Add to both if unclear
            maleSelect.appendChild(option.cloneNode(true));
            femaleSelect.appendChild(option.cloneNode(true));
        }
    });
}

async function handleTextConversion() {
    try {
        const text = document.getElementById('textToConvert').value.trim();
        const maleVoice = document.getElementById('maleVoiceSelect').value;
        const femaleVoice = document.getElementById('femaleVoiceSelect').value;
        const selectedVoice = maleVoice || femaleVoice;
        
        if (!text) {
            updateStatus('Please enter some text', 'error');
            return;
        }
        
        if (text.length > DASHBOARD_CONFIG.MAX_TEXT_LENGTH) {
            updateStatus(`Text too long (max ${DASHBOARD_CONFIG.MAX_TEXT_LENGTH} characters)`, 'error');
            return;
        }
        
        if (!selectedVoice) {
            updateStatus('Please select a voice', 'error');
            return;
        }
        
        // Speak the text
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
        
        window.speechSynthesis.speak(utterance);
        updateStatus('Speaking...', 'info');
        
        // Generate QR code
        await generateQRFromText(text, selectedVoice);
        
    } catch (error) {
        handleError('Text conversion failed', error);
    }
}

async function generateQRFromText(text, voiceName) {
    try {
        toggleLoading(true, 'Generating QR code...');
        
        // Create QR data
        const qrData = {
            type: 'text',
            data: text,
            voice: voiceName,
            timestamp: getTimestamp()
        };
        
        // Store for download
        lastQRData = qrData;
        
        // Generate QR code
        const canvas = document.getElementById('qrcode');
        await QRCode.toCanvas(canvas, JSON.stringify(qrData), {
            width: DASHBOARD_CONFIG.QR_SIZE,
            errorCorrectionLevel: DASHBOARD_CONFIG.QR_ERROR_CORRECTION
        });
        
        // Enable download button
        document.getElementById('downloadQRCodeBtn').disabled = false;
        
        updateStatus('QR code generated successfully!', 'success');
        
    } catch (error) {
        handleError('QR generation failed', error);
    } finally {
        toggleLoading(false);
    }
}

// ========================================
// UPLOAD MODE
// ========================================

function initUploadMode() {
    const uploadInput = document.getElementById('uploadInput');
    uploadInput.onchange = handleFileUpload;
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        toggleLoading(true, 'Decoding QR code...');
        
        // Update filename display
        document.getElementById('uploadFileName').textContent = `File: ${file.name}`;
        
        // Create image element
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);
        
        img.onload = async () => {
            try {
                // Create canvas to read image data
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Use html5-qrcode library to decode
                const html5QrCodeScanner = new Html5Qrcode('qrReader');
                const qrCodeMessage = await html5QrCodeScanner.scanFile(file, true);
                
                // Parse and display content
                displayDecodedContent(qrCodeMessage);
                
                URL.revokeObjectURL(imageUrl);
                
            } catch (error) {
                handleError('QR code decoding failed', error);
                updateStatus('Could not read QR code from image', 'error');
            } finally {
                toggleLoading(false);
            }
        };
        
        img.onerror = () => {
            toggleLoading(false);
            updateStatus('Could not load image file', 'error');
            URL.revokeObjectURL(imageUrl);
        };
        
        img.src = imageUrl;
        
    } catch (error) {
        toggleLoading(false);
        handleError('File upload failed', error);
    }
}

// ========================================
// SCAN MODE
// ========================================

function initScanMode() {
    startQRScanner();
}

async function startQRScanner() {
    try {
        const qrReader = document.getElementById('qrReader');
        
        if (!qrReader) {
            updateStatus('Scanner element not found', 'error');
            return;
        }
        
        // Create scanner instance
        html5QrCode = new Html5Qrcode('qrReader');
        
        // Start scanning
        await html5QrCode.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                // Success callback
                displayDecodedContent(decodedText);
                stopQRScanner();
            },
            (errorMessage) => {
                // Error callback (called frequently, so don't show)
                // console.log(errorMessage);
            }
        );
        
        updateStatus('Scanning... Point camera at QR code', 'info');
        document.getElementById('stopScanBtn').style.display = 'block';
        document.getElementById('stopScanBtn').onclick = stopQRScanner;
        
    } catch (error) {
        handleError('Scanner initialization failed', error);
        updateStatus('Camera access denied or not available', 'error');
    }
}

function stopQRScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            console.log('Scanner stopped');
            document.getElementById('stopScanBtn').style.display = 'none';
        }).catch(err => {
            console.error('Scanner stop error:', err);
        });
    }
}

// ========================================
// CONTENT DISPLAY & DOWNLOAD
// ========================================

function displayDecodedContent(qrContent) {
    try {
        // Parse QR data
        const data = JSON.parse(qrContent);
        
        const scannedContent = document.getElementById('scannedContent');
        const messageText = document.getElementById('messageText');
        const scannedAudio = document.getElementById('scannedAudio');
        
        scannedContent.style.display = 'block';
        scannedAudio.innerHTML = '';
        messageText.textContent = '';
        
        if (data.type === 'text') {
            // Display text
            messageText.textContent = data.data;
            
            // Add replay button for text-to-speech
            if (data.voice && window.speechSynthesis) {
                const replayBtn = document.createElement('button');
                replayBtn.className = 'btn';
                replayBtn.textContent = '🔊 Replay';
                replayBtn.onclick = () => {
                    const utterance = new SpeechSynthesisUtterance(data.data);
                    const voice = voices.find(v => v.name === data.voice);
                    if (voice) utterance.voice = voice;
                    window.speechSynthesis.speak(utterance);
                };
                scannedAudio.appendChild(replayBtn);
            }
            
        } else if (data.type === 'audio') {
            // Display audio player
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:${data.mimeType};base64,${data.data}`;
            scannedAudio.appendChild(audio);
            
            messageText.textContent = `Audio Recording (${data.duration || '?'}s)`;
        }
        
        // Store for download
        lastQRData = data;
        
        // Enable download button
        document.getElementById('downloadContentBtn').disabled = false;
        
        updateStatus('Content decoded successfully!', 'success');
        
    } catch (error) {
        handleError('Content display failed', error);
        updateStatus('Invalid QR code format', 'error');
    }
}

// ========================================
// GLOBAL HANDLERS
// ========================================

function setupGlobalHandlers() {
    // Download QR code
    const downloadQRBtn = document.getElementById('downloadQRCodeBtn');
    if (downloadQRBtn) {
        downloadQRBtn.onclick = downloadQRCode;
    }
    
    // Download content
    const downloadContentBtn = document.getElementById('downloadContentBtn');
    if (downloadContentBtn) {
        downloadContentBtn.onclick = downloadContent;
    }
}

function downloadQRCode() {
    try {
        const canvas = document.getElementById('qrcode');
        const dataUrl = canvas.toDataURL('image/png');
        const timestamp = new Date().getTime();
        triggerDownload(dataUrl, `voice2barcode-qr-${timestamp}.png`);
        updateStatus('QR code downloaded!', 'success');
    } catch (error) {
        handleError('QR download failed', error);
    }
}

function downloadContent() {
    try {
        if (!lastQRData) {
            updateStatus('No content to download', 'error');
            return;
        }
        
        const timestamp = new Date().getTime();
        
        if (lastQRData.type === 'text') {
            // Download as text file
            const blob = new Blob([lastQRData.data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `voice2barcode-text-${timestamp}.txt`);
            
        } else if (lastQRData.type === 'audio') {
            // Download as audio file
            const byteCharacters = atob(lastQRData.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: lastQRData.mimeType });
            const url = URL.createObjectURL(blob);
            
            const extension = lastQRData.mimeType.includes('webm') ? 'webm' : 'ogg';
            triggerDownload(url, `voice2barcode-audio-${timestamp}.${extension}`);
        }
        
        updateStatus('Content downloaded!', 'success');
        
    } catch (error) {
        handleError('Content download failed', error);
    }
}

console.log('✅ Dashboard.js loaded successfully');
