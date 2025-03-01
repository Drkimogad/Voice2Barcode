const MAX_RECORD_SECONDS = 10;
const SUPPORTED_AUDIO_TYPES = ['audio/ogg', 'audio/mp3', 'audio/wav'];
const ENCRYPTION_KEY = 'user-secure-key-123'; // Replace with dynamic key in production
let currentMode = 'voice';
let mediaRecorder;
let audioChunks = [];
let audioData = null;
let scanner;

// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        document.querySelectorAll('#voiceInput, #textInput, #uploadSection').forEach(el => {
            el.style.display = 'none';
        });
        
        if (currentMode === 'voice') document.getElementById('voiceInput').style.display = 'block';
        if (currentMode === 'text') document.getElementById('textInput').style.display = 'block';
        if (currentMode === 'upload') document.getElementById('uploadSection').style.display = 'block';
    });
});

// Voice Recording
document.getElementById('recordBtn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            audioData = new Blob(audioChunks, { type: 'audio/webm' });
            const compressedAudio = await compressAudio(audioData);
            const encryptedData = SecurityHandler.encrypt(`audio:${compressedAudio}`);
            generateQRFromData(encryptedData);
            updateStatus('Recording stopped. QR generated!', 'success');
            audioChunks = []; // Reset chunks for next recording
        };

        mediaRecorder.start();
        document.getElementById('recordBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        updateStatus('Recording...', 'success');

        // Auto-stop after 10 seconds
        setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                updateStatus(`Auto-stopped after ${MAX_RECORD_SECONDS} seconds`, 'success');
            }
        }, MAX_RECORD_SECONDS * 1000);
    } catch (err) {
        updateStatus('Microphone access denied!', 'error');
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        document.getElementById('recordBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
    }
});

// QR Code Generation
function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    new QRCode(qrcodeDiv, {
        text: data,
        width: 200,
        height: 200
    });
    document.getElementById('downloadBtn').disabled = false;
}

// Download QR Code
document.getElementById('downloadBtn').addEventListener('click', () => {
    const qrcodeCanvas = document.querySelector('#qrcode canvas');
    if (qrcodeCanvas) {
        const link = document.createElement('a');
        link.href = qrcodeCanvas.toDataURL('image/png');
        link.download = 'qrcode.png';
        link.click();
        updateStatus('QR Code downloaded!', 'success');
    } else {
        updateStatus('No QR Code to download!', 'error');
    }
});

// QR Scanning
document.getElementById('scanBtn').addEventListener('click', async () => {
    try {
        const cameras = await Instascan.Camera.getCameras();
        if (cameras.length > 0) {
            scanner = new Instascan.Scanner({ video: document.getElementById('cameraPreview') });
            scanner.addListener('scan', (content) => {
                handleScannedQR(content);
            });
            scanner.start(cameras[0]);
            updateStatus('Scanning QR Code...', 'success');
        } else {
            updateStatus('No cameras found!', 'error');
        }
    } catch (err) {
        updateStatus('Camera access denied!', 'error');
    }
});

// Handle Scanned QR
function handleScannedQR(content) {
    try {
        const decrypted = SecurityHandler.decrypt(content);
        if (decrypted.startsWith('text:')) {
            const text = decrypted.slice(5);
            document.getElementById('scannedMessage').textContent = `Message: ${text}`;
            synthesizeSpeech(text);
        } else if (decrypted.startsWith('audio:')) {
            const audio = new Audio(`data:audio/ogg;base64,${decrypted.slice(6)}`);
            audio.controls = true;
            document.getElementById('scannedAudio').innerHTML = '';
            document.getElementById('scannedAudio').appendChild(audio);
            document.getElementById('scannedMessage').textContent = 'Audio decoded successfully!';
        } else {
            throw new Error('Unsupported QR data format');
        }
        updateStatus('Content decoded successfully!', 'success');
    } catch (err) {
        updateStatus('Decoding failed: ' + err.message, 'error');
    }
}

// Utility Functions
async function compressAudio(audioBlob) {
    const encoder = new OpusEncoder();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const compressed = await encoder.encode(arrayBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}

// Security Handler
class SecurityHandler {
    static encrypt(data) {
        return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    }

    static decrypt(ciphertext) {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}

// TTS Functionality
function synthesizeSpeech(text) {
    if ('speechSynthesis' in window) {
        const maleVoiceSelect = document.getElementById('maleVoiceSelect');
        const femaleVoiceSelect = document.getElementById('femaleVoiceSelect');
        const selectedVoiceName = maleVoiceSelect.value || femaleVoiceSelect.value;

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();
        utterance.voice = voices.find(voice => voice.name === selectedVoiceName);

        speechSynthesis.speak(utterance);
    } else {
        updateStatus('Text-to-speech not supported in this browser', 'error');
    }
}
