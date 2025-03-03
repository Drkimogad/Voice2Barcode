// audioRecordingCompressionQR.js
const MAX_RECORD_SECONDS = 10;
let mediaRecorder, audioChunks = [], audioStream;

export function initializeRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');

    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);

    return () => {
        recordBtn.removeEventListener('click', startRecording);
        stopBtn.removeEventListener('click', stopRecording);
        stopRecording(); // Ensure cleanup
    };
}

async function startRecording() {
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream, { 
            mimeType: 'audio/webm; codecs=opus',
            audioBitsPerSecond: 24000
        });

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = handleRecordingStop;

        mediaRecorder.start();
        updateUIState(true);
        setTimeout(() => mediaRecorder?.state === 'recording' && mediaRecorder.stop(), MAX_RECORD_SECONDS * 1000);
    } catch (error) {
        updateStatus(`Recording failed: ${error.message}`, 'error');
    }
}

function stopRecording() {
    if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
    }
}

function handleRecordingStop() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    generateQRFromData(audioBlob);
    cleanupAfterRecording();
}

function cleanupAfterRecording() {
    audioStream?.getTracks().forEach(track => track.stop());
    audioChunks = [];
    updateUIState(false);
}

function updateUIState(recording) {
    document.getElementById('recordBtn').disabled = recording;
    document.getElementById('stopBtn').disabled = !recording;
    document.getElementById('recordingIndicator').style.display = recording ? 'block' : 'none';
}

export function generateQRFromData(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    new QRCode(qrcodeDiv, {
        text: JSON.stringify({ type: 'audio', data: URL.createObjectURL(data) }),
        width: 256,
        height: 256
    });
    document.getElementById('downloadQRCodeBtn').disabled = false;
}
