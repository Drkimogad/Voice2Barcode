// QRCodeUploadHandling.js

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_QR_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const VALID_CONTENT_TYPES = ['audio', 'text'];
let activeObjectURLs = new Set();

function initializeQRUploadHandlers() {
    const audioUpload = document.getElementById('audioUpload');
    const qrUpload = document.getElementById('qrUpload');

    const handlers = {
        audio: handleAudioUpload,
        qr: handleQRUpload
    };

    audioUpload.addEventListener('change', handlers.audio);
    qrUpload.addEventListener('change', handlers.qr);

    return () => {
        audioUpload.removeEventListener('change', handlers.audio);
        qrUpload.removeEventListener('change', handlers.qr);
        cleanupObjectURLs();
    };
}

function cleanupObjectURLs() {
    activeObjectURLs.forEach(url => URL.revokeObjectURL(url));
    activeObjectURLs.clear();
}

async function handleAudioUpload(event) {
    clearStatus();
    const file = event.target.files[0];
    
    try {
        if (!file) throw new Error('No file selected');
        if (!file.type.startsWith('audio/')) throw new Error('Invalid audio format');
        if (file.size > MAX_AUDIO_SIZE) throw new Error(`File too large (max ${MAX_AUDIO_SIZE/1024/1024}MB)`);

        const dataUrl = await readFileAsDataURL(file);
        generateQRFromData({
            type: 'audio',
            data: dataUrl,
            mimeType: file.type,
            size: file.size
        });
        updateStatus('Audio encoded in QR successfully', 'success');
    } catch (error) {
        updateStatus(error.message, 'error');
    }
}

async function handleQRUpload(event) {
    clearStatus();
    const file = event.target.files[0];
    
    try {
        if (!file) throw new Error('No file selected');
        if (!file.type.startsWith('image/')) throw new Error('Invalid image format');
        if (file.size > MAX_QR_IMAGE_SIZE) throw new Error(`Image too large (max ${MAX_QR_IMAGE_SIZE/1024/1024}MB)`);

        const content = await decodeQRFromImage(file);
        const data = validateQRContent(content);
        displayScannedContent(data);
    } catch (error) {
        updateStatus(error.message, 'error');
    }
}

function validateQRContent(content) {
    try {
        const data = JSON.parse(content);
        if (!VALID_CONTENT_TYPES.includes(data?.type)) throw new Error('Invalid content type');
        if (!data?.data) throw new Error('Missing content data');
        return data;
    } catch (error) {
        throw new Error(`Invalid QR content: ${error.message}`);
    }
}

async function decodeQRFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        activeObjectURLs.add(url);

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (!code) reject(new Error('No QR code found'));
                resolve(code.data);
            } finally {
                URL.revokeObjectURL(url);
                activeObjectURLs.delete(url);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            activeObjectURLs.delete(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

function generateQRFromData(data) {
    try {
        const qrCodeCanvas = document.getElementById('qrcode');
        qrCodeCanvas.innerHTML = '';
        
        QRCode.toCanvas(qrCodeCanvas, JSON.stringify(data), (error) => {
            if (error) throw error;
            document.getElementById('downloadQRCodeBtn').disabled = false;
        });
    } catch (error) {
        throw new Error(`QR generation failed: ${error.message}`);
    }
}

function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    scannedContent.hidden = false;
    scannedAudio.innerHTML = '';
    messageText.textContent = '';

    if (data.type === 'audio') {
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.appendChild(audio);
        messageText.textContent = `Audio (${(data.size/1024).toFixed(1)}KB)`;
    } else if (data.type === 'text') {
        messageText.textContent = data.data;
    }

    updateStatus('Content decoded successfully', 'success');
}

// Utility Functions
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    if (type === 'success') setTimeout(() => statusElement.textContent = '', 5000);
}

function clearStatus() {
    document.getElementById('status').textContent = '';
}

// Export functions
window.initializeQRUploadHandlers = initializeQRUploadHandlers;
