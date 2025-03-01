const MAX_RECORD_SECONDS = 10;
const SUPPORTED_AUDIO_TYPES = ['audio/ogg', 'audio/mp3', 'audio/wav'];
const ENCRYPTION_KEY = 'user-secure-key-123'; // Replace with dynamic key in production
let currentMode = 'voice';
let mediaRecorder;
let audioChunks = [];
let audioData = null;

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
    mediaRecorder.stop();
    document.getElementById('recordBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
});

// Text to QR
document.getElementById('textConvertBtn').addEventListener('click', () => {
    const text = document.getElementById('textToConvert').value.slice(0, 200);
    if (text.length < 1) return updateStatus('Enter some text first!', 'error');
    
    const encryptedData = SecurityHandler.encrypt(`text:${text}`);
    generateQRFromData(encryptedData);
    updateStatus('Text QR generated!', 'success');
});

// Upload Handling
document.getElementById('audioUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return updateStatus('No file selected!', 'error');

    try {
        if (file.type.startsWith('audio/')) {
            if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) return updateStatus('Unsupported audio type!', 'error');
            if (file.size > 10 * 1024 * 1024) return updateStatus('File too large! Max 10MB', 'error');

            const audioBuffer = await validateAndProcessAudio(file);
            const compressedAudio = await compressAudio(audioBuffer);
            const encryptedData = SecurityHandler.encrypt(`audio:${compressedAudio}`);
            generateQRFromData(encryptedData);
            updateStatus('Audio processed and QR generated!', 'success');
        } else if (file.type === 'image/png' || file.type === 'image/jpeg') {
            const qrData = await decodeQRFromImage(file);
            handleScannedQR(qrData);
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (err) {
        updateStatus(err.message, 'error');
    }
});

// QR Code Generation
function generateQRFromData(data) {
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: data,
        width: 200,
        height: 200
    });
    document.getElementById('downloadBtn').disabled = false;
}

// QR Scanning
const scanner = new Instascan.Scanner({ video: document.createElement('video') });
scanner.addListener('scan', (content) => {
    handleScannedQR(content);
});

document.getElementById('scanBtn').addEventListener('click', () => {
    Instascan.Camera.getCameras().then(cameras => {
        if (cameras.length > 0) {
            scanner.start(cameras[0]);
            updateStatus('Scanning QR Code...', 'success');
        } else {
            updateStatus('No cameras found!', 'error');
        }
    });
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
async function validateAndProcessAudio(file) {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    if (audioBuffer.duration > MAX_RECORD_SECONDS) {
        throw new Error(`Audio too long! Max ${MAX_RECORD_SECONDS} seconds`);
    }
    
    return audioBuffer;
}

async function compressAudio(audioBlob) {
    const encoder = new OpusEncoder();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const compressed = await encoder.encode(arrayBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

async function decodeQRFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                resolve(code.data);
            } else {
                reject(new Error('No QR code found in image'));
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
    });
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

// Populate Voice List
window.speechSynthesis.onvoiceschanged = populateVoiceList;
function populateVoiceList() {
    const voices = speechSynthesis.getVoices();
    const maleVoiceSelect = document.getElementById('maleVoiceSelect');
    const femaleVoiceSelect = document.getElementById('femaleVoiceSelect');

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;

        if (voice.name.includes('Male')) {
            maleVoiceSelect.appendChild(option);
        } else if (voice.name.includes('Female')) {
            femaleVoiceSelect.appendChild(option);
        }
    });
}
