const MAX_RECORD_SECONDS = 10;
let recorder; // Changed from mediaRecorder
let audioStream;

function initializeRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');

    // Initialize Opus-Recorder once
    if (!window.Recorder) {
        console.error('Opus-Recorder not loaded!');
        return;
    }

    // Create Recorder instance
    recorder = new window.Recorder({
        encoderPath: './libs/opus-recorder/dist/encoderWorker.min.js', // Verify path
        streamPages: true,
        encoderSampleRate: 24000,
        encoderApplication: 2048 // 2048 for audio, 2049 for voice
    });

    // Setup event handlers
    recorder.ondataavailable = (typedArray) => {
        // Convert to Blob for QR generation
        const audioBlob = new Blob([typedArray], { type: 'audio/ogg; codecs=opus' });
        generateQRFromData(audioBlob);
    };

    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);

    return () => {
        recordBtn.removeEventListener('click', startRecording);
        stopBtn.removeEventListener('click', stopRecording);
        stopRecording();
    };
}

// Removed mediaRecorder-related logic
async function startRecording() {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Start Opus-Recorder
        recorder.start(audioStream).then(() => {
            updateUIState(true);
            setTimeout(() => {
                if (recorder && recorder.isRecording) {
                    stopRecording();
                }
            }, MAX_RECORD_SECONDS * 1000);
        }).catch(error => {
            updateStatus(`Recording failed: ${error.message}`, 'error');
        });

    } catch (error) {
        updateStatus(`Microphone access denied: ${error.message}`, 'error');
    }
}

function stopRecording() {
    if (recorder && recorder.isRecording) {
        recorder.stop().then(() => {
            cleanupAfterRecording();
        }).catch(error => {
            updateStatus(`Stop failed: ${error.message}`, 'error');
        });
    }
}

// Simplified cleanup
function cleanupAfterRecording() {
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    updateUIState(false);
}

// Rest of the code remains the same...
function updateUIState(recording) {
    document.getElementById('recordBtn').disabled = recording;
    document.getElementById('stopBtn').disabled = !recording;
    document.getElementById('recordingIndicator').style.display = recording ? 'block' : 'none';
}

function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    new QRCode(qrcodeDiv, {
        text: JSON.stringify({ type: 'audio', data: URL.createObjectURL(data) }),
        width: 256,
        height: 256
    });
    document.getElementById('downloadQRCodeBtn').disabled = false;
}

// Expose functions to the global scope
window.initializeRecordingControls = initializeRecordingControls;
window.generateQRFromData = generateQRFromData;
