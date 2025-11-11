// ========================================
// DASHBOARD MODULE
// ========================================

const DASHBOARD_CONFIG = {
    MAX_TEXT_LENGTH: 200,
    QR_SIZE: 300,
    QR_ERROR_CORRECTION: 'H'
    URL_REGEX: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/   // for links
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
        case 'links':  // ADD THIS CASE
            initLinksMode();
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
// LINKS MODE - Website Links QR Code
// ========================================

function initLinksMode() {
    const urlInput = document.getElementById('urlInput');
    const generateBtn = document.getElementById('generateLinkQRBtn');
    const urlPreview = document.getElementById('urlPreview');
    
    // Generate QR when button clicked
    generateBtn.onclick = handleLinkConversion;
    
    // Generate QR when Enter key pressed
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLinkConversion();
        }
    });
    
    // Live URL validation and preview
    urlInput.addEventListener('input', function() {
        const url = this.value.trim();
        
        if (isValidUrl(url)) {
            // Show preview
            const previewLink = document.getElementById('previewLink');
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            previewLink.href = fullUrl;
            previewLink.textContent = fullUrl;
            urlPreview.style.display = 'block';
            
            // Visual feedback
            this.classList.remove('invalid');
            this.classList.add('valid');
        } else {
            // Hide preview
            urlPreview.style.display = 'none';
            this.classList.remove('valid');
            if (url.length > 0) {
                this.classList.add('invalid');
            } else {
                this.classList.remove('invalid');
            }
        }
    });
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
    if (!url) return false;
    
    // Add https:// if missing
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    try {
        const urlObj = new URL(fullUrl);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Handle URL to QR conversion
 */
async function handleLinkConversion() {
    try {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            updateStatus('Please enter a website URL', 'error');
            urlInput.focus();
            return;
        }
        
        if (!isValidUrl(url)) {
            updateStatus('Please enter a valid website URL', 'error');
            urlInput.focus();
            return;
        }
        
        // Generate QR code
        await generateQRFromUrl(url);
        
    } catch (error) {
        handleError('URL conversion failed', error);
    }
}

/**
 * Generate QR code from URL
 * @param {string} url - Website URL
 */
async function generateQRFromUrl(url) {
    try {
        toggleLoading(true, 'Generating QR code...');
        
        // Ensure URL has protocol
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        
        // Create QR data - use direct URL for scanning, not JSON
        // This makes QR codes open directly in browser when scanned
        const qrContent = fullUrl;
        
        // Store for download and display
        lastQRData = {
            type: 'url',
            data: fullUrl,
            timestamp: getTimestamp(),
            displayText: `Website: ${fullUrl}`
        };
        
        // Generate QR code with direct URL (not JSON)
        const canvas = document.getElementById('qrcode');
        await QRCode.toCanvas(canvas, qrContent, {
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
// TEXT MODE
// ========================================

function initTextMode() {
    const convertBtn = document.getElementById('textConvertBtn');
    convertBtn.onclick = handleTextConversion;
}

async function handleTextConversion() {
    try {
        const text = document.getElementById('textToConvert').value.trim();      
        if (!text) {
            updateStatus('Please enter some text', 'error');
            return;
        }
        
        if (text.length > DASHBOARD_CONFIG.MAX_TEXT_LENGTH) {
            updateStatus(`Text too long (max ${DASHBOARD_CONFIG.MAX_TEXT_LENGTH} characters)`, 'error');
            return;
        }
        
        // Generate QR code
        await generateQRFromText(text);
        
    } catch (error) {
        handleError('Text conversion failed', error);
    }
}

async function generateQRFromText(text) {
    try {
        toggleLoading(true, 'Generating QR code...');
        
        // Create QR data
        const qrData = {
            type: 'text',
            data: text,
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
        // Check if it's a direct URL (not JSON)
        if (qrContent.startsWith('http')) {
            // It's a direct URL QR code
            displayUrlContent(qrContent);
            return;
        }
        
        // Parse QR data (for JSON content)
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
            
        } else if (data.type === 'url') {
            // Display URL content
            displayUrlContent(data.data);
        }
        
        // Store for download
        lastQRData = data;
        
        // Enable download button
        document.getElementById('downloadContentBtn').disabled = false;
        
        updateStatus('Content decoded successfully!', 'success');
        
    } catch (error) {
        // If JSON parsing fails, check if it's a direct URL
        if (qrContent.startsWith('http')) {
            displayUrlContent(qrContent);
        } else {
            handleError('Content display failed', error);
            updateStatus('Invalid QR code format', 'error');
        }
    }
}

/**
 * Display URL content in results section
 * @param {string} url - Website URL
 */
function displayUrlContent(url) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');
    
    scannedContent.style.display = 'block';
    scannedAudio.innerHTML = '';
    
    // Create clickable link
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = url;
    link.className = 'url-link';
    
    messageText.innerHTML = '';
    messageText.appendChild(document.createTextNode('Website: '));
    messageText.appendChild(link);
    
    // Store for download
    lastQRData = {
        type: 'url',
        data: url,
        timestamp: getTimestamp(),
        displayText: `Website: ${url}`
    };
    
    // Enable download button
    document.getElementById('downloadContentBtn').disabled = false;
    
    updateStatus('Website link decoded successfully!', 'success');
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
