const MAX_RECORD_SECONDS = 10;
const SUPPORTED_AUDIO_TYPES = ['audio/ogg', 'audio/mp3', 'audio/wav'];
const ENCRYPTION_KEY = 'user-secure-key-123'; // Replace with dynamic key in production

let mediaRecorder;
let audioChunks = [];
let audioData = null;
let audioURL;
let audio;
let recordBtn = document.getElementById('recordBtn');
let stopBtn = document.getElementById('stopBtn');
let audioContainer = document.getElementById('audioContainer');

// Start Recording
recordBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            audioData = new Blob(audioChunks, { type: 'audio/webm' });
            const compressedAudio = await compressAudio(audioData);
            const encryptedData = SecurityHandler.encrypt(`audio:${compressedAudio}`);
            generateQRFromData(encryptedData);  // QR code generation with encrypted compressed audio
            updateStatus('Recording stopped. QR generated!', 'success');
            audioChunks = []; // Reset chunks for next recording
        };

        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Recording...', 'success');

        // Auto-stop after the set duration (MAX_RECORD_SECONDS)
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

// Stop Recording
stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

// Compress Audio (Using Opus Encoder)
async function compressAudio(audioBlob) {
    const encoder = new OpusEncoder();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const compressed = await encoder.encode(arrayBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

// QR Code Generation (with encrypted compressed audio)
function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';  // Clear previous QR code
    new QRCode(qrcodeDiv, {
        text: data,  // The encrypted compressed audio data
        width: 200,
        height: 200
    });
    document.getElementById('downloadBtn').disabled = false; // Enable download button
}

// Update Status
function updateStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
}

// Download Audio
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (audioData) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(audioData);
        link.download = 'audio_recording.webm';
        link.click();
        updateStatus('Audio downloaded successfully!', 'success');
    }
});
