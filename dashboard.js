// ========================================
// DASHBOARD MODULE
// ========================================
const DASHBOARD_CONFIG = {
    MAX_TEXT_LENGTH: 200,
    QR_SIZE: 300,
    QR_ERROR_CORRECTION: 'H'
};

// Global state
let currentMode = 'links';
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
    
    // Initialize text mode by default
    switchToMode('links');
    
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

// ========================================
// FIRESTORE FUNCTIONS
// ========================================

/**
 * Save message to Firestore and return document ID
 * @param {object} messageData - Message data to save
 * @returns {string} Document ID
 */
async function saveMessageToFirestore(messageData) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        
        if (!user) {
            throw new Error('User must be logged in to save messages');
        }
        
        const docRef = await db.collection('messages').add({
            type: messageData.type,
            content: messageData.content,
            theme: messageData.theme,
            title: messageData.title,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0
        });
        
        console.log('✅ Message saved to Firestore with ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('❌ Error saving to Firestore:', error);
        throw error;
    }
}

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
        
        // Detect theme and title
        const themeData = detectThemeAndTitle('text', text);
        
        // Save to Firestore and get document ID
        const messageData = {
            type: 'text',
            content: text,
            theme: themeData.theme,
            title: themeData.title
        };
        
        const documentId = await saveMessageToFirestore(messageData);
        
        // Generate QR code with domain URL
        await generateQRFromDocumentId(documentId);
        
    } catch (error) {
        handleError('Text conversion failed', error);
    }
}

// Replace the old generateQRFromText function
async function generateQRFromDocumentId(documentId) {
    try {
        toggleLoading(true, 'Generating QR code...');
        
        // Create URL for your domain - we'll use memoryinqr.com for now
        const qrContent = `https://memoryinqr.com/view.html?id=${documentId}`;
        
        // Store document ID for download reference
        lastQRData = {
            documentId: documentId,
            type: 'firestore',
            timestamp: getTimestamp()
        };
        
        // Generate QR code with the URL
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
// TEXT MODE - MODIFIED FOR FIRESTORE
// ========================================

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
        
        // Detect theme and title
        const themeData = detectThemeAndTitle('text', text);
        
        // Save to Firestore and get document ID
        const messageData = {
            type: 'text',
            content: text,
            theme: themeData.theme,
            title: themeData.title
        };
        
        const documentId = await saveMessageToFirestore(messageData);
        
        // Generate QR code with domain URL
        await generateQRFromDocumentId(documentId);
        
    } catch (error) {
        handleError('Text conversion failed', error);
    }
}

// Replace the old generateQRFromText function
async function generateQRFromDocumentId(documentId) {
    try {
        toggleLoading(true, 'Generating QR code...');
        
        // Create URL for your domain - we'll use memoryinqr.com for now
     const qrContent = `https://drkimogad.github.io/MemoryinQR/view.html?id=${documentId}`;   // REPLACE LATER FOR FIREBASE DEPLOYMENT 
        
        // Store document ID for download reference
        lastQRData = {
            documentId: documentId,
            type: 'firestore',
            timestamp: getTimestamp()
        };
        
        // Generate QR code with the URL
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

// Helper function to detect theme and title
/**
 * Detect theme and title based on content (full implementation)
 * @param {string} type - Content type ('text' or 'url')
 * @param {string} content - The actual content
 * @returns {object} theme and title
 */
function detectThemeAndTitle(type, content) {
    const contentLower = content.toLowerCase();
    let theme = 'default';
    let title = 'Memory Card';
    
    if (type === 'text') {
        // 🎂 BIRTHDAY & CELEBRATIONS
        if (contentLower.includes('birthday') || contentLower.includes('happy birthday') || 
            contentLower.includes('bday') || contentLower.match(/\b\d{1,2}\s?(year|yr)s? old\b/)) {
            theme = 'birthday';
            title = 'Birthday Wishes';
        }
        // 💍 WEDDING & MARRIAGE
        else if (contentLower.includes('wedding') || contentLower.includes('marriage') || 
                 contentLower.includes('married') || contentLower.includes('honeymoon') ||
                 contentLower.includes('bridal') || contentLower.includes('groom') ||
                 contentLower.includes('bride') || contentLower.includes('matrimony')) {
            theme = 'wedding';
            title = 'Wedding Celebration';
        }
        // 💑 ENGAGEMENT
        else if (contentLower.includes('engagement') || contentLower.includes('engaged') || 
                 contentLower.includes('proposal') || contentLower.includes('ring')) {
            theme = 'engagement';
            title = 'Engagement';
        }
        // 👶 BABY & PREGNANCY
        else if (contentLower.includes('baby') || contentLower.includes('pregnancy') || 
                 contentLower.includes('pregnant') || contentLower.includes('newborn') ||
                 contentLower.includes('shower') || contentLower.includes('gender reveal') ||
                 contentLower.includes('due date') || contentLower.includes('maternity')) {
            theme = 'baby';
            title = 'Baby Celebration';
        }
        // 🎓 GRADUATION & EDUCATION
        else if (contentLower.includes('graduation') || contentLower.includes('graduate') || 
                 contentLower.includes('diploma') || contentLower.includes('degree') ||
                 contentLower.includes('congratulations grad') || contentLower.includes('alumni') ||
                 contentLower.includes('passed') || contentLower.includes('exam')) {
            theme = 'graduation';
            title = 'Graduation';
        }
        // 🏠 NEW HOME & RELOCATION
        else if (contentLower.includes('new home') || contentLower.includes('new house') || 
                 contentLower.includes('relocation') || contentLower.includes('moving') ||
                 contentLower.includes('housewarming') || contentLower.includes('new place') ||
                 contentLower.includes('address change') || contentLower.includes('neighborhood')) {
            theme = 'newhome';
            title = 'New Home';
        }
        // 💼 NEW JOB & CAREER
        else if (contentLower.includes('new job') || contentLower.includes('promotion') || 
                 contentLower.includes('congratulations on the job') || contentLower.includes('career') ||
                 contentLower.includes('hired') || contentLower.includes('interview') ||
                 contentLower.includes('offer letter') || contentLower.includes('first day')) {
            theme = 'newjob';
            title = 'New Job';
        }
        // 💝 ANNIVERSARY
        else if (contentLower.includes('anniversary') || contentLower.includes('years together') || 
                 contentLower.match(/\b\d{1,2}\s?(year|yr)s?\s?(together|anniversary)\b/)) {
            theme = 'anniversary';
            title = 'Anniversary';
        }
        // ❤️ LOVE & ROMANCE
        else if (contentLower.includes('love you') || contentLower.includes('miss you') || 
                 contentLower.includes('thinking of you') || contentLower.includes('my heart') ||
                 contentLower.includes('soulmate') || contentLower.includes('valentine')) {
            theme = 'love';
            title = 'Love Message';
        }
        // 🙏 GRATITUDE & THANKS
        else if (contentLower.includes('thank you') || contentLower.includes('thanks') || 
                 contentLower.includes('grateful') || contentLower.includes('appreciate')) {
            theme = 'gratitude';
            title = 'Thank You';
        }
    } else if (type === 'url') {
        theme = 'website';
        title = 'Website Link';
    }
    
    return { theme, title };
}


// ========================================
// LINKS MODE - MODIFIED FOR FIRESTORE
// ========================================

/**
 * Handle URL to QR conversion (Firestore version)
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
        
        // Ensure URL has protocol
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        
        // Detect theme and title for URL
        const themeData = detectThemeAndTitle('url', fullUrl);
        
        // Save to Firestore and get document ID
        const messageData = {
            type: 'url',
            content: fullUrl,
            theme: themeData.theme,
            title: themeData.title
        };
        
        const documentId = await saveMessageToFirestore(messageData);
        
        // Generate QR code with domain URL
        await generateQRFromDocumentId(documentId);
        
    } catch (error) {
        handleError('URL conversion failed', error);
    }
}

// Remove the old generateQRFromUrl function since we're using generateQRFromDocumentId now


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
        console.log('📁 File selected:', file.name, file.type, file.size);
        
        // Update filename display
        document.getElementById('uploadFileName').textContent = `File: ${file.name}`;
        
        // Use html5-qrcode library to decode
        console.log('🔍 Starting QR decoding...');
        const html5QrCodeScanner = new Html5Qrcode('qrReader');
        
        try {
            const qrCodeMessage = await html5QrCodeScanner.scanFile(file, true);
            console.log('✅ QR decoded successfully:', qrCodeMessage);
            
            // Display the decoded content
            displayDecodedContent(qrCodeMessage);
            
        } catch (decodeError) {
            console.error('❌ QR decoding failed:', decodeError);
            updateStatus('Could not read QR code from image', 'error');
            
            // Try alternative decoding method
            console.log('🔄 Trying alternative decoding...');
            await tryAlternativeDecoding(file);
        }
        
    } catch (error) {
        console.error('❌ File upload failed:', error);
        handleError('File upload failed', error);
        updateStatus('Upload failed', 'error');
    } finally {
        toggleLoading(false);
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
        
        console.log('📷 Starting QR scanner...');
        
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
                console.log('✅ Scanner decoded:', decodedText);
                displayDecodedContent(decodedText);
                stopQRScanner();
            },
            (errorMessage) => {
                // Error callback - don't show every error, just log
                console.log('📹 Scanner error:', errorMessage);
            }
        );
        
        console.log('🎥 Scanner started successfully');
        updateStatus('Scanning... Point camera at QR code', 'info');
        document.getElementById('stopScanBtn').style.display = 'block';
        document.getElementById('stopScanBtn').onclick = stopQRScanner;
        
    } catch (error) {
        console.error('❌ Scanner initialization failed:', error);
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
/**
 * Alternative QR decoding method
 */
async function tryAlternativeDecoding(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);
        
        img.onload = async () => {
            try {
                console.log('🖼️ Image loaded, dimensions:', img.width, 'x', img.height);
                
                // Create canvas for manual processing
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                console.log('🎨 Canvas created, trying direct decoding...');
                
                // Try using the scanner with canvas
                const html5QrCode = new Html5Qrcode('qrReader');
                const qrCodeMessage = await html5QrCode.scanFileV2(file);
                
                console.log('✅ Alternative decoding successful:', qrCodeMessage);
                displayDecodedContent(qrCodeMessage);
                resolve();
                
            } catch (error) {
                console.error('❌ Alternative decoding failed:', error);
                updateStatus('No QR code found in image', 'error');
                resolve();
            } finally {
                URL.revokeObjectURL(imageUrl);
            }
        };
        
        img.onerror = () => {
            console.error('❌ Could not load image');
            URL.revokeObjectURL(imageUrl);
            updateStatus('Invalid image file', 'error');
            resolve();
        };
        
        img.src = imageUrl;
    });
}




function displayDecodedContent(qrContent) {
    console.log('📄 Displaying decoded content:', qrContent);
    
    try {
        // Check if it's a direct URL (not JSON)
        if (qrContent.startsWith('http')) {
            console.log('🔗 Detected direct URL');
            displayUrlCard(qrContent);
            return;
        }
        
        // Try to parse as JSON
        console.log('📋 Trying to parse as JSON...');
        const data = JSON.parse(qrContent);
        console.log('✅ JSON parsed successfully:', data);
        
        if (data.type === 'text') {
            console.log('📝 Displaying text card');
            displayTextCard(data);
        } else if (data.type === 'url') {
            console.log('🌐 Displaying URL card');
            displayUrlCard(data.data);
        } else {
            console.log('❌ Unknown data type:', data.type);
            updateStatus('Unknown QR code format', 'error');
        }
        
        // Store for download
        lastQRData = data;
        
        // Enable download button
        document.getElementById('downloadContentBtn').disabled = false;
        
        updateStatus('Content decoded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Content display failed:', error);
        
        // If JSON parsing fails, check if it's a direct URL
        if (qrContent.startsWith('http')) {
            console.log('🔗 Fallback: Detected as direct URL');
            displayUrlCard(qrContent);
        } else {
            console.log('❌ Not a URL either, showing raw content');
            // Show raw content for debugging
            displayRawContent(qrContent);
        }
    }
}

/**
 * Display raw content when format is unknown
 */
function displayRawContent(rawContent) {
    const scannedContent = document.getElementById('scannedContent');
    const cardDate = document.getElementById('cardDate');
    const cardMessageText = document.getElementById('cardMessageText');
    const urlContainer = document.getElementById('urlContainer');
    
    // Show the card
    scannedContent.style.display = 'block';
    
    // Set card date
    cardDate.textContent = formatCardDate(new Date());
    
    // Show raw content
    cardMessageText.textContent = rawContent;
    cardMessageText.style.display = 'block';
    
    // Hide URL container
    urlContainer.style.display = 'none';
    
    // Generate QR code for the card display
    generateCardQRCode(rawContent);
    
    // Setup print functionality
    setupPrintButton();
    
    updateStatus('Raw content displayed', 'info');
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

// ========================================
// CARD LAYOUT FUNCTIONS
// ========================================

/**
 * Display content in beautiful card layout
 * @param {string} qrContent - The scanned QR code content
 */
function displayDecodedContent(qrContent) {
    try {
        // Check if it's a direct URL (not JSON)
        if (qrContent.startsWith('http')) {
            // It's a direct URL QR code
            displayUrlCard(qrContent);
            return;
        }
        
        // Parse QR data (for JSON content)
        const data = JSON.parse(qrContent);
        
        if (data.type === 'text') {
            displayTextCard(data);
        } else if (data.type === 'url') {
            displayUrlCard(data.data);
        }
        
        // Store for download
        lastQRData = data;
        
        // Enable download button
        document.getElementById('downloadContentBtn').disabled = false;
        
        updateStatus('Content decoded successfully!', 'success');
        
    } catch (error) {
        // If JSON parsing fails, check if it's a direct URL
        if (qrContent.startsWith('http')) {
            displayUrlCard(qrContent);
        } else {
            handleError('Content display failed', error);
            updateStatus('Invalid QR code format', 'error');
        }
    }
}

/**
  DASHBOARD CARD DISPLAY OF SCANNED CONTENT 
 * Display text content in card layout
 * @param {object} data - Text data object
 */
function displayTextCard(data) {
    const scannedContent = document.getElementById('scannedContent');
    const cardDate = document.getElementById('cardDate');
    const cardMessageText = document.getElementById('cardMessageText');
    const urlContainer = document.getElementById('urlContainer');
    
    scannedContent.style.display = 'block';
    
    cardDate.textContent = formatCardDate(data.timestamp ? new Date(data.timestamp) : new Date());
    
    // Set message text DIRECTLY (no "Message:" label)
    cardMessageText.textContent = data.data;
    cardMessageText.style.display = 'block';
    
    // REMOVE the "Message:" label from HTML or hide it
    const messageLabel = document.querySelector('.message-label');
    if (messageLabel) messageLabel.style.display = 'none';
    
    // Hide URL container for text cards
    urlContainer.style.display = 'none';
    
    generateCardQRCode(JSON.stringify(data));
    
    // REMOVE print functionality from dashboard
    // setupPrintButton(); // DELETE THIS LINE
    
    applyCardTheme('text', data.data);
}

/**
 * Display URL content in card layout
 * @param {string} url - Website URL
 */
function displayUrlCard(url) {
    const scannedContent = document.getElementById('scannedContent');
    const cardDate = document.getElementById('cardDate');
    const cardMessageText = document.getElementById('cardMessageText');
    const urlContainer = document.getElementById('urlContainer');
    const cardUrl = document.getElementById('cardUrl');
    
    // Show the card
    scannedContent.style.display = 'block';
    
    // Set card date
    cardDate.textContent = formatCardDate(new Date());
    
    // REMOVE message text entirely for URL cards
    cardMessageText.style.display = 'none';
    
    // Show and set URL DIRECTLY (no "Website:" label)
    urlContainer.style.display = 'block';
    cardUrl.href = url;
    cardUrl.textContent = url;
    
    // REMOVE the "Website:" label from HTML or hide it
    const urlLabel = document.querySelector('.url-label');
    if (urlLabel) urlLabel.style.display = 'none';
    
    // Generate QR code
    generateCardQRCode(url);
    
    // REMOVE print functionality from dashboard
    // setupPrintButton(); // DELETE THIS LINE
    
    // Apply theme
    applyCardTheme('url', url);
    
    // Store for download
    lastQRData = {
        type: 'url',
        data: url,
        timestamp: getTimestamp(),
        displayText: `Website: ${url}`
    };
}

/**
 * Generate QR code specifically for card display
 * @param {string} content - Content to encode in QR
 */
async function generateCardQRCode(content) {
    try {
        const canvas = document.getElementById('cardQrCode');
        await QRCode.toCanvas(canvas, content, {
            width: 200, // Smaller for card display
            errorCorrectionLevel: DASHBOARD_CONFIG.QR_ERROR_CORRECTION,
            margin: 1
        });
    } catch (error) {
        console.error('Card QR generation failed:', error);
    }
}

/**
 * Format date for card display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatCardDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Apply visual theme to card based on content
 * @param {string} type - Content type ('text' or 'url')
 * @param {string} content - The actual content
 */
/**
 * Apply visual theme to card based on content
 * @param {string} type - Content type ('text' or 'url')
 * @param {string} content - The actual content
 */
function applyCardTheme(type, content) {
    const card = document.getElementById('qrCard');
    
    // Reset all theme classes
    card.className = 'qr-card';
    
    // Default theme
    let theme = 'default';
    const contentLower = content.toLowerCase();
    
    if (type === 'text') {
        // 🎂 BIRTHDAY & CELEBRATIONS
        if (contentLower.includes('birthday') || contentLower.includes('happy birthday') || 
            contentLower.includes('bday') || contentLower.match(/\b\d{1,2}\s?(year|yr)s? old\b/)) {
            theme = 'birthday';
        }
        // 💍 WEDDING & MARRIAGE
        else if (contentLower.includes('wedding') || contentLower.includes('marriage') || 
                 contentLower.includes('married') || contentLower.includes('honeymoon') ||
                 contentLower.includes('bridal') || contentLower.includes('groom') ||
                 contentLower.includes('bride') || contentLower.includes('matrimony')) {
            theme = 'wedding';
        }
        // 💑 ENGAGEMENT
        else if (contentLower.includes('engagement') || contentLower.includes('engaged') || 
                 contentLower.includes('proposal') || contentLower.includes('ring')) {
            theme = 'engagement';
        }
        // 👶 BABY & PREGNANCY
        else if (contentLower.includes('baby') || contentLower.includes('pregnancy') || 
                 contentLower.includes('pregnant') || contentLower.includes('newborn') ||
                 contentLower.includes('shower') || contentLower.includes('gender reveal') ||
                 contentLower.includes('due date') || contentLower.includes('maternity')) {
            theme = 'baby';
        }
        // 🎓 GRADUATION & EDUCATION
        else if (contentLower.includes('graduation') || contentLower.includes('graduate') || 
                 contentLower.includes('diploma') || contentLower.includes('degree') ||
                 contentLower.includes('congratulations grad') || contentLower.includes('alumni') ||
                 contentLower.includes('passed') || contentLower.includes('exam')) {
            theme = 'graduation';
        }
        // 🏠 NEW HOME & RELOCATION
        else if (contentLower.includes('new home') || contentLower.includes('new house') || 
                 contentLower.includes('relocation') || contentLower.includes('moving') ||
                 contentLower.includes('housewarming') || contentLower.includes('new place') ||
                 contentLower.includes('address change') || contentLower.includes('neighborhood')) {
            theme = 'newhome';
        }
        // 💼 NEW JOB & CAREER
        else if (contentLower.includes('new job') || contentLower.includes('promotion') || 
                 contentLower.includes('congratulations on the job') || contentLower.includes('career') ||
                 contentLower.includes('hired') || contentLower.includes('interview') ||
                 contentLower.includes('offer letter') || contentLower.includes('first day')) {
            theme = 'newjob';
        }
        // 💝 ANNIVERSARY
        else if (contentLower.includes('anniversary') || contentLower.includes('years together') || 
                 contentLower.match(/\b\d{1,2}\s?(year|yr)s?\s?(together|anniversary)\b/)) {
            theme = 'anniversary';
        }
        // ❤️ LOVE & ROMANCE
        else if (contentLower.includes('love you') || contentLower.includes('miss you') || 
                 contentLower.includes('thinking of you') || contentLower.includes('my heart') ||
                 contentLower.includes('soulmate') || contentLower.includes('valentine')) {
            theme = 'love';
        }
        // 🙏 GRATITUDE & THANKS
        else if (contentLower.includes('thank you') || contentLower.includes('thanks') || 
                 contentLower.includes('grateful') || contentLower.includes('appreciate')) {
            theme = 'gratitude';
        }
    } else if (type === 'url') {
        theme = 'website';
    }
    
    // Apply theme class
    card.classList.add(`card-theme-${theme}`);
    
    // Update card icon and title based on theme
    updateCardHeader(theme);
}

/**
 * Update card icon and title based on theme
 * @param {string} theme - Detected theme
 */
function updateCardHeader(theme) {
    const cardIcon = document.querySelector('.card-icon');
    const cardTitle = document.querySelector('.card-title');
    
    const themeConfig = {
        birthday: { icon: '🎂', title: 'Birthday Wishes' },
        wedding: { icon: '💒', title: 'Wedding Celebration' },
        engagement: { icon: '💍', title: 'Engagement' },
        baby: { icon: '👶', title: 'Baby Celebration' },
        graduation: { icon: '🎓', title: 'Graduation' },
        newhome: { icon: '🏠', title: 'New Home' },
        newjob: { icon: '💼', title: 'New Job' },
        anniversary: { icon: '💝', title: 'Anniversary' },
        love: { icon: '❤️', title: 'Love Message' },
        gratitude: { icon: '🙏', title: 'Thank You' },
        website: { icon: '🌐', title: 'Website Link' },
        default: { icon: '🎁', title: 'Memory Card' }
    };
    
    const config = themeConfig[theme] || themeConfig.default;
    cardIcon.textContent = config.icon;
    cardTitle.textContent = config.title;
}

console.log('✅ Dashboard.js loaded successfully');
