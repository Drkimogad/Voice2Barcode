// Dependencies loaded via CDN in HTML (make sure to include them in your HTML)
// Required: qrcode.js, opus-encoder, crypto-js

const MAX_RECORD_SECONDS = 10;
const ENCRYPTION_KEY = CryptoJS.enc.Utf8.parse('user-secure-key-123'); // 128-bit key

let mediaRecorder;
let audioChunks = [];
let audioStream;
let opusEncoder;

// HTML Elements
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const recordingIndicator = document.getElementById('recordingIndicator');

// Initialize Opus Encoder
async function initializeEncoder() {
    const { OpusEncoder } = await import('https://cdn.jsdelivr.net/npm/@opus-encoder/encoder@6.1.0/+esm');
    opusEncoder = new OpusEncoder({ forceBrowserEncoder: false });
}

// Encryption handler using AES
const SecurityHandler = {
    encrypt: (data) => {
        return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        }).toString();
    }
};

// Recording Controls
recordBtn.addEventListener('click', async () => {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream, { 
            mimeType: 'audio/webm; codecs=opus' 
        });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const compressed = await compressAudio(audioBlob);
            const encrypted = SecurityHandler.encrypt(compressed);
            
            generateQRFromData(encrypted);
            cleanupAfterRecording();
        };

        mediaRecorder.start();
        toggleControls(true);
        recordingIndicator.classList.add('recording');
        
        // Auto-stop timer
        setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }, MAX_RECORD_SECONDS * 1000);

    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
    }
});

// Audio Processing
async function compressAudio(audioBlob) {
    try {
        const buffer = await audioBlob.arrayBuffer();
        const compressed = opusEncoder.encode(buffer);
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create(compressed)
        );
    } catch (error) {
        throw new Error('Compression failed: ' + error.message);
    }
}

// QR Generation
function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    
    new QRCode(qrcodeDiv, {
        text: data,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('downloadQRCodeBtn').disabled = false;
}

// Utilities
function cleanupAfterRecording() {
    audioStream.getTracks().forEach(track => track.stop());
    audioChunks = [];
    toggleControls(false);
    recordingIndicator.classList.remove('recording');
    updateStatus('Ready to scan QR code', 'success');
}

function toggleControls(recording) {
    recordBtn.disabled = recording;
    stopBtn.disabled = !recording;
}

function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
}

// Initialize when ready
window.addEventListener('DOMContentLoaded', () => {
    initializeEncoder();
    stopBtn.disabled = true;
    document.getElementById('downloadQRCodeBtn').disabled = true;
});
