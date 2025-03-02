// audioRecordingCompressionQR.js (Updated)
const MAX_RECORD_SECONDS = 10;
let mediaRecorder, audioChunks = [], audioStream, opusEncoder;

// Encryption setup (Move this to SecurityHandler.js)
const SecurityHandler = (() => {
    const ENCRYPTION_KEY = CryptoJS.lib.WordArray.random(128/8);
    const IV = CryptoJS.lib.WordArray.random(128/8);

    return {
        encrypt: (data) => CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, { iv: IV }).toString(),
        decrypt: (ciphertext) => {
            const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY, { iv: IV });
            return bytes.toString(CryptoJS.enc.Utf8);
        }
    };
})();

// Initialize encoder with error handling
async function initializeEncoder() {
    try {
        const { OpusEncoder } = await import('https://cdn.jsdelivr.net/npm/@opus-encoder/encoder@6.1.0/+esm');
        opusEncoder = new OpusEncoder({ forceBrowserEncoder: true });
    } catch (error) {
        updateStatus('Failed to initialize audio encoder', 'error');
        console.error('Encoder initialization error:', error);
    }
}

// Enhanced recording controls with cleanup
export function initializeRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');

    const handleRecord = startRecording;
    const handleStop = stopRecording;

    recordBtn.addEventListener('click', handleRecord);
    stopBtn.addEventListener('click', handleStop);

    // Return cleanup function
    return () => {
        recordBtn.removeEventListener('click', handleRecord);
        stopBtn.removeEventListener('click', handleStop);
        
        // Cleanup any active recording
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
        }
        
        // Release media resources
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        audioChunks = [];
        updateUIState(false);
    };
}

async function startRecording() {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                sampleRate: 48000,
                channelCount: 1,
                echoCancellation: true 
            } 
        });
        
        mediaRecorder = new MediaRecorder(audioStream, { 
            mimeType: 'audio/webm; codecs=opus',
            audioBitsPerSecond: 24000
        });

        setupMediaRecorderHandlers();
        mediaRecorder.start();
        
        updateUIState(true);
        startAutoStopTimer();

    } catch (error) {
        updateStatus(`Recording failed: ${error.message}`, 'error');
    }
}

function setupMediaRecorderHandlers() {
    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    
    mediaRecorder.onstop = async () => {
        try {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const compressed = await compressAudio(audioBlob);
            const encrypted = SecurityHandler.encrypt(compressed);
            
            generateQRFromData(encrypted);
        } catch (error) {
            updateStatus(`Processing failed: ${error.message}`, 'error');
        } finally {
            cleanupAfterRecording();
        }
    };
}

async function compressAudio(audioBlob) {
    if (!opusEncoder) throw new Error('Audio encoder not initialized');
    
    try {
        const buffer = await audioBlob.arrayBuffer();
        const compressed = await opusEncoder.encode(buffer);
        return CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(compressed));
    } catch (error) {
        throw new Error(`Compression failed: ${error.message}`);
    }
}

function stopRecording() {
    if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
    }
}

function cleanupAfterRecording() {
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
    }
    audioChunks = [];
    updateUIState(false);
}

function updateUIState(recording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const indicator = document.getElementById('recordingIndicator');

    recordBtn.disabled = recording;
    stopBtn.disabled = !recording;
    indicator.style.display = recording ? 'block' : 'none';
}

function startAutoStopTimer() {
    const timer = setTimeout(() => {
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
            updateStatus('Automatically stopped after maximum duration', 'warning');
        }
    }, MAX_RECORD_SECONDS * 1000);

    mediaRecorder.onstop = () => clearTimeout(timer);
}

// Initialize module (called from main.js)
export function initializeAudioModule() {
    initializeEncoder();
    document.getElementById('downloadQRCodeBtn').disabled = true;
}
