// script.js
let mediaRecorder;
let audioChunks = [];
let audioData = null;

// Elements
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const scanBtn = document.getElementById('scanBtn');
const statusDiv = document.getElementById('status');

// Audio Recording
recordBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            audioData = new Blob(audioChunks, { type: 'audio/webm' });
            generateQRCode();
        };

        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Recording...', 'success');
    } catch (err) {
        updateStatus('Microphone access denied!', 'error');
    }
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
});

// QR Code Generation
function generateQRCode() {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById('qrcode'), {
            text: base64Data,
            width: 200,
            height: 200
        });
        downloadBtn.disabled = false;
        updateStatus('QR Code Generated!', 'success');
    };
    reader.readAsDataURL(audioData);
}

// QR Scanning
scanBtn.addEventListener('click', () => {
    const scanner = new Instascan.Scanner({ video: document.createElement('video') });
    
    scanner.addListener('scan', (content) => {
        try {
            const audio = new Audio(`data:audio/webm;base64,${content}`);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
            updateStatus('Audio decoded successfully!', 'success');
        } catch (err) {
            updateStatus('Invalid QR Code', 'error');
        }
    });

    Instascan.Camera.getCameras().then(cameras => {
        if (cameras.length > 0) {
            scanner.start(cameras[0]);
            updateStatus('Scanning QR Code...', 'success');
        } else {
            updateStatus('No cameras found!', 'error');
        }
    });
});

// Utility Functions
function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
}
